// ================= App-Steuerung =================
import {
  generatePollinations, generateGemini, enhancePrompt, removeBackground,
} from "./apis.js";
import { ANIMATIONS, startPreview, renderGif } from "./animator.js";

const $ = (id) => document.getElementById(id);

const state = {
  api: "pollinations",
  anim: "bounce",
  baseImage: null,   // aktuelles KI-Bild (HTMLImageElement)
  gifBlob: null,
  stopPreview: null,
};

// ---------- Animations-Buttons aufbauen ----------
const animGrid = $("animGrid");
for (const [key, def] of Object.entries(ANIMATIONS)) {
  const b = document.createElement("button");
  b.className = "anim-btn" + (key === state.anim ? " active" : "");
  b.dataset.anim = key;
  b.innerHTML = `<span class="ico">${def.icon}</span>${def.label}`;
  b.onclick = () => {
    state.anim = key;
    [...animGrid.children].forEach((c) => c.classList.toggle("active", c === b));
    if (state.baseImage) refreshPreview();
  };
  animGrid.appendChild(b);
}

// ---------- API-Umschalter ----------
$("apiSelect").addEventListener("click", (e) => {
  const btn = e.target.closest(".seg");
  if (!btn) return;
  state.api = btn.dataset.api;
  [...$("apiSelect").children].forEach((c) => c.classList.toggle("active", c === btn));
  $("geminiKeyField").hidden = state.api !== "gemini";
});

// ---------- Gemini-Key merken ----------
const savedKey = localStorage.getItem("geminiKey");
if (savedKey) $("geminiKey").value = savedKey;
$("geminiKey").addEventListener("change", (e) =>
  localStorage.setItem("geminiKey", e.target.value.trim()));

// ---------- Status-Helfer ----------
function setStatus(msg, isErr = false) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("err", isErr);
}

// ---------- Vorschau aktualisieren ----------
function refreshPreview() {
  if (state.stopPreview) state.stopPreview();
  const delay = clampInt($("delay").value, 30, 200, 70);
  state.stopPreview = startPreview($("stage"), state.baseImage, state.anim, delay);
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// ---------- Generieren ----------
$("generateBtn").addEventListener("click", async () => {
  const prompt = $("prompt").value.trim();
  if (!prompt) { setStatus("Bitte erst eine Beschreibung eingeben.", true); return; }

  const btn = $("generateBtn");
  btn.disabled = true;
  $("downloadGif").disabled = true;
  $("downloadWebp").disabled = true;
  state.gifBlob = null;

  try {
    const key = $("geminiKey").value.trim();

    // 1) Optional: Prompt verbessern
    let finalPrompt = prompt;
    if ($("enhance").checked) {
      setStatus("Verbessere Prompt mit Gemini …");
      finalPrompt = await enhancePrompt(prompt, key);
    }

    // 2) Bild generieren
    setStatus(`Generiere Bild via ${state.api} …`);
    let img = state.api === "gemini"
      ? await generateGemini(finalPrompt, key)
      : await generatePollinations(finalPrompt);

    // 3) Optional: Hintergrund entfernen
    if ($("removeBg").checked) {
      setStatus("Entferne Hintergrund (kann etwas dauern) …");
      img = await removeBackground(img);
    }

    state.baseImage = img;
    refreshPreview();
    setStatus("Fertig! Vorschau läuft. Du kannst jetzt exportieren.");
    $("downloadWebp").disabled = false;

    // 4) GIF im Hintergrund rendern
    await buildGif();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unbekannter Fehler", true);
  } finally {
    btn.disabled = false;
  }
});

// ---------- GIF bauen ----------
async function buildGif() {
  if (!state.baseImage) return;
  const frames = clampInt($("frames").value, 6, 40, 18);
  const delay = clampInt($("delay").value, 30, 200, 70);
  setStatus("Erstelle GIF …");
  state.gifBlob = await renderGif(
    state.baseImage, state.anim, frames, delay,
    (p) => setStatus(`Erstelle GIF … ${Math.round(p * 100)}%`)
  );
  setStatus("GIF fertig – bereit zum Speichern. 🎉");
  $("downloadGif").disabled = false;
}

// ---------- Downloads ----------
$("downloadGif").addEventListener("click", () => {
  if (!state.gifBlob) return;
  downloadBlob(state.gifBlob, "sticker.gif");
});

$("downloadWebp").addEventListener("click", () => {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  const box = 460, iw = state.baseImage.naturalWidth, ih = state.baseImage.naturalHeight;
  const s = Math.min(box / iw, box / ih);
  ctx.drawImage(state.baseImage, (512 - iw * s) / 2, (512 - ih * s) / 2, iw * s, ih * s);
  c.toBlob((b) => downloadBlob(b, "sticker.webp"), "image/webp", 0.9);
});

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
