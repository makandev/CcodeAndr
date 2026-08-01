// ================= App-Steuerung =================
import {
  generatePollinations, generateGemini, removeBackground,
} from "./apis.js";
import { ANIMATIONS, startPreview, renderGif } from "./animator.js";
import { analyzePrompt, verifyImage } from "./verifier.js";

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

// ---------- Prüf-Ergebnis anzeigen ----------
function clearVerdict() {
  const box = $("verdict");
  box.hidden = true;
  box.className = "verdict";
  box.innerHTML = "";
}

function renderVerdict(elements, verdict) {
  const box = $("verdict");
  if (!elements.length) { clearVerdict(); return; }

  if (!verdict) {
    // Elemente bekannt, aber Prüfung war nicht möglich (z.B. kein Key + Dienst offline)
    box.hidden = false;
    box.className = "verdict";
    box.innerHTML =
      `<div class="head">Automatische Prüfung nicht verfügbar</div>` +
      `<div>Gewünscht: ${elements.map((e) => escapeHtml(e)).join(", ")}.<br>` +
      `Tipp: Gemini-Key eintragen, dann prüft die App automatisch.</div>`;
    return;
  }

  const allOk = verdict.every((v) => v.present);
  box.hidden = false;
  box.className = "verdict " + (allOk ? "allok" : "partial");
  const items = verdict.map((v) =>
    `<li class="${v.present ? "ok" : "miss"}">${v.present ? "✅" : "❌"} ${escapeHtml(v.element)}` +
    `${v.present ? "" : " — fehlt"}</li>`
  ).join("");
  const head = allOk
    ? "✅ Passt – alle gewünschten Elemente sind drauf"
    : "⚠️ Nicht alles getroffen";
  const tail = allOk ? "" :
    `<div style="margin-top:8px">Nochmal „generieren" klicken für einen neuen Versuch, ` +
    `oder Beschreibung genauer formulieren.</div>`;
  box.innerHTML = `<div class="head">${head}</div><ul>${items}</ul>${tail}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

  clearVerdict();

  try {
    const key = $("geminiKey").value.trim();
    const wantEnhance = $("enhance").checked;
    const wantVerify = $("verify").checked;
    const maxTries = wantVerify ? clampInt($("maxTries").value, 1, 5, 3) : 1;

    // 1) Wunsch in Elemente + starken Bild-Prompt zerlegen
    setStatus("Analysiere deinen Wunsch …");
    const analysis = wantEnhance
      ? await analyzePrompt(prompt, key)
      : { elements: [], imagePrompt: prompt };

    // 2) Generier-/Prüf-Schleife
    let img = null, verdict = null;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      // Fehlende Elemente aus dem letzten Versuch nochmal betonen
      const missing = verdict ? verdict.filter((v) => !v.present).map((v) => v.element) : [];
      let p = analysis.imagePrompt;
      if (missing.length) p += `. IMPORTANT: the ${missing.join(" and ")} MUST be clearly visible`;

      setStatus(maxTries > 1
        ? `Generiere Bild (Versuch ${attempt}/${maxTries}) …`
        : `Generiere Bild via ${state.api} …`);
      // Wir haben bereits einen expliziten, starken Prompt gebaut ->
      // Pollinations NICHT zusätzlich umschreiben lassen (enhance: false).
      const fallbackEnhance = wantEnhance && analysis.elements.length === 0;
      img = state.api === "gemini"
        ? await generateGemini(p, key)
        : await generatePollinations(p, { enhance: fallbackEnhance });

      // 3) Gegenprüfung
      if (!wantVerify || !analysis.elements.length) break;
      setStatus(`Prüfe Ergebnis (Versuch ${attempt}/${maxTries}) …`);
      verdict = await verifyImage(img, analysis.elements, key);
      if (!verdict) break;                        // Prüfung nicht möglich -> akzeptieren
      if (verdict.every((v) => v.present)) break; // alles da -> fertig
    }

    // 4) Optional: Hintergrund entfernen
    if ($("removeBg").checked) {
      setStatus("Entferne Hintergrund (kann etwas dauern) …");
      img = await removeBackground(img);
    }

    state.baseImage = img;
    refreshPreview();
    renderVerdict(analysis.elements, verdict);
    $("downloadWebp").disabled = false;

    // 5) GIF im Hintergrund rendern
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
