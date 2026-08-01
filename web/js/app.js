// ================= App-Steuerung =================
import {
  generatePollinations, generateGemini, removeBackground,
} from "./apis.js";
import { ANIMATIONS, startPreview, renderGif } from "./animator.js";
import { analyzePrompt, verifyImage } from "./verifier.js";
import { IMAGE_MODELS, VISION_MODELS, findImageModel, findVisionModel } from "./models.js";

const $ = (id) => document.getElementById(id);

const state = {
  imageModel: IMAGE_MODELS[0], // gewähltes Bild-Modell (Objekt)
  visionModel: VISION_MODELS[0].id,
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

// ---------- Bild-Modell-Auswahl ----------
const imageSel = $("imageModel");
for (const m of IMAGE_MODELS) {
  const o = document.createElement("option");
  o.value = m.id;
  o.textContent = `${m.label} · ${m.badge}`;
  imageSel.appendChild(o);
}
imageSel.addEventListener("change", () => {
  state.imageModel = findImageModel(imageSel.value);
  updateModelUI();
});

// ---------- Vision-/Prüf-Modell-Auswahl ----------
const verifySel = $("verifyModel");
for (const m of VISION_MODELS) {
  const o = document.createElement("option");
  o.value = m.id;
  o.textContent = `${m.label} · ${m.badge}`;
  verifySel.appendChild(o);
}
verifySel.addEventListener("change", () => {
  state.visionModel = verifySel.value;
  updateModelUI();
});
$("verify").addEventListener("change", updateModelUI);

// Info-Zeilen + Key-Feld je nach Auswahl aktualisieren
function updateModelUI() {
  const im = state.imageModel;
  $("imageModelInfo").innerHTML = `ℹ️ ${im.info}`;
  const vm = findVisionModel(state.visionModel);
  const verifyOn = $("verify").checked;
  $("verifyModelInfo").innerHTML = verifyOn
    ? `ℹ️ ${vm.info}`
    : "Prüfung ist aus – Ergebnis wird nicht automatisch kontrolliert.";
  // Key-Feld zeigen, wenn Bild-Modell einen Key braucht ODER Prüfung an ist
  $("geminiKeyField").hidden = !(im.needsKey || verifyOn);
}
updateModelUI();

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

// verify = { results:[...] } | { error:"..." } | null
function renderVerdict(elements, verify, diag) {
  const box = $("verdict");
  if (!elements.length) { clearVerdict(); return; }
  const diagHtml = diag
    ? `<div class="diag">🔧 Diagnose: ${escapeHtml(diag)}</div>` : "";

  // Prüfung nicht möglich -> echten Grund zeigen
  if (!verify || verify.error) {
    box.hidden = false;
    box.className = "verdict";
    const reason = verify?.error ? escapeHtml(verify.error) : "kein Prüf-Provider";
    box.innerHTML =
      `<div class="head">Automatische Prüfung nicht verfügbar</div>` +
      `<div>Gewünscht: ${elements.map((e) => escapeHtml(e)).join(", ")}.</div>` +
      `<div class="diag">🔧 Grund: ${reason}</div>` +
      `<div style="margin-top:6px">Tipp: gültigen Gemini-Key eintragen – dann prüft die App automatisch und versucht bei fehlenden Details neu.</div>` +
      diagHtml;
    return;
  }

  const results = verify.results;
  const allOk = results.every((v) => v.present);
  box.hidden = false;
  box.className = "verdict " + (allOk ? "allok" : "partial");
  const items = results.map((v) =>
    `<li class="${v.present ? "ok" : "miss"}">${v.present ? "✅" : "❌"} ${escapeHtml(v.element)}` +
    `${v.present ? "" : " — fehlt"}</li>`
  ).join("");
  const head = allOk
    ? "✅ Passt – alle gewünschten Elemente sind drauf"
    : "⚠️ Nicht alles getroffen";
  const tail = allOk ? "" :
    `<div style="margin-top:8px">Nochmal „generieren" klicken für einen neuen Versuch, ` +
    `oder Beschreibung genauer formulieren.</div>`;
  box.innerHTML = `<div class="head">${head}</div><ul>${items}</ul>${tail}${diagHtml}`;
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

    const model = state.imageModel;
    if (model.needsKey && !key) {
      throw new Error(`„${model.label}“ braucht einen Gemini-Key. Bitte oben eintragen oder ein gratis Modell wählen.`);
    }

    // 1) Wunsch in Elemente + starken englischen Bild-Prompt zerlegen
    setStatus("Analysiere deinen Wunsch …");
    const analysis = wantEnhance
      ? await analyzePrompt(prompt, key, state.visionModel)
      : { elements: [], imagePrompt: prompt, source: "off", warning: "" };

    // Diagnose sammeln (wird unten sichtbar gemacht)
    let diag = "";
    if (analysis.source === "fallback" && analysis.warning) {
      diag = `Prompt-Analyse fiel auf einfache Zerlegung zurück (${analysis.warning})`;
    }

    // Nur wenn ein ECHTER englischer KI-Prompt vorliegt, Pollinations nicht
    // umschreiben lassen. Im Fallback (deutscher Rohtext) MUSS enhance=true den
    // Prompt serverseitig übersetzen – sonst geht z.B. „Herz“ verloren.
    const strongPrompt = analysis.source === "ai";

    // 2) Generier-/Prüf-Schleife
    let img = null, verify = null;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      const missing = verify?.results ? verify.results.filter((v) => !v.present).map((v) => v.element) : [];
      let p = analysis.imagePrompt;
      if (missing.length) p += `. IMPORTANT: the ${missing.join(" and ")} MUST be clearly visible`;

      setStatus(maxTries > 1
        ? `Generiere Bild (Versuch ${attempt}/${maxTries}, ${model.label}) …`
        : `Generiere Bild (${model.label}) …`);
      img = model.provider === "gemini"
        ? await generateGemini(p, key, model.model)
        : await generatePollinations(p, { enhance: !strongPrompt, model: model.model });

      // 3) Gegenprüfung
      if (!wantVerify || !analysis.elements.length) break;
      setStatus(`Prüfe Ergebnis (Versuch ${attempt}/${maxTries}) …`);
      verify = await verifyImage(img, analysis.elements, key, state.visionModel);
      if (verify.error) break;                              // Prüfung nicht möglich
      if (verify.results.every((v) => v.present)) break;    // alles da -> fertig
    }

    // 4) Optional: Hintergrund entfernen
    if ($("removeBg").checked) {
      setStatus("Entferne Hintergrund (kann etwas dauern) …");
      img = await removeBackground(img);
    }

    state.baseImage = img;
    refreshPreview();
    renderVerdict(analysis.elements, verify, diag);
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
