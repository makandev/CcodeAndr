// ================= App-Steuerung =================
import { removeBackground } from "./apis.js";
import { generateImage } from "./providers.js";
import { ANIMATIONS, startPreview, renderGif } from "./animator.js";
import { analyzePrompt, verifyImage } from "./verifier.js";
import {
  getImageModels, getTextModels, findModel, PRESETS,
  addCustomModel, removeCustomModel, loadCustomModels,
} from "./models.js";

const $ = (id) => document.getElementById(id);

const state = {
  imageModelId: null,
  textModelId: null,
  anim: "bounce",
  baseImage: null,
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

// ---------- Modell-Dropdowns (dynamisch, inkl. Custom) ----------
function fillSelect(sel, models, selectedId) {
  sel.innerHTML = "";
  for (const m of models) {
    const o = document.createElement("option");
    o.value = m.id;
    o.textContent = `${m.label}${m.badge ? " · " + m.badge : m.custom ? " · eigene KI" : ""}`;
    sel.appendChild(o);
  }
  if (selectedId && models.some((m) => m.id === selectedId)) sel.value = selectedId;
}

function refreshModelDropdowns() {
  const imgs = getImageModels();
  const texts = getTextModels();
  if (!imgs.some((m) => m.id === state.imageModelId)) state.imageModelId = imgs[0].id;
  if (!texts.some((m) => m.id === state.textModelId)) state.textModelId = texts[0].id;
  fillSelect($("imageModel"), imgs, state.imageModelId);
  fillSelect($("verifyModel"), texts, state.textModelId);
  updateModelUI();
}

$("imageModel").addEventListener("change", (e) => { state.imageModelId = e.target.value; updateModelUI(); });
$("verifyModel").addEventListener("change", (e) => { state.textModelId = e.target.value; updateModelUI(); });
$("verify").addEventListener("change", updateModelUI);

function updateModelUI() {
  const im = findModel(state.imageModelId, "image");
  const tm = findModel(state.textModelId, "text");
  const verifyOn = $("verify").checked;
  $("imageModelInfo").innerHTML = `ℹ️ ${im.info || ""}`;
  $("verifyModelInfo").innerHTML = verifyOn ? `ℹ️ ${tm.info || ""}`
    : "Prüfung ist aus – Ergebnis wird nicht automatisch kontrolliert.";
  // Gemini-Key-Feld zeigen, wenn ein Gemini-Builtin-Modell aktiv ist (Bild oder Prüfung)
  const geminiActive = (im.keyKind === "gemini") || (verifyOn && tm.keyKind === "gemini");
  $("geminiKeyField").hidden = !geminiActive;
  // Pollinations-Key nur bei Pollinations-Bildmodell
  $("polliKeyField").hidden = im.protocol !== "pollinations-image";
}

// ---------- Keys merken (nur lokal im Browser) ----------
function bindKey(id) {
  const saved = localStorage.getItem(id);
  if (saved) $(id).value = saved;
  $(id).addEventListener("change", (e) => localStorage.setItem(id, e.target.value.trim()));
}
bindKey("geminiKey");
bindKey("polliKey");

// ---------- Modell auflösen (Config + aktuelle Keys) ----------
function resolveModel(id, role) {
  const m = { ...findModel(id, role) };
  if (m.custom) return m; // Custom trägt eigenen apiKey/baseUrl
  if (m.keyKind === "gemini") m.apiKey = $("geminiKey").value.trim();
  if (m.keyKind === "pollinations") m.apiKey = $("polliKey").value.trim(); // optional (Token)
  return m;
}

// ---------- „Neue KI hinzufügen“ ----------
function applyPreset() {
  const p = PRESETS[$("presetSel").value] || PRESETS.custom;
  $("presetInfo").innerHTML = p.info ? `ℹ️ ${p.info}` : "";
  $("mName").value = p.label || "";
  $("mRole").value = p.role;
  $("mProto").value = p.protocol;
  $("mBase").value = p.baseUrl || "";
  $("mModel").value = p.model || "";
  $("mVision").checked = !!p.vision;
}
$("presetSel").addEventListener("change", applyPreset);
applyPreset();

$("addKiBtn").addEventListener("click", () => {
  const label = $("mName").value.trim();
  const model = $("mModel").value.trim();
  const proto = $("mProto").value;
  const base = $("mBase").value.trim();
  const key = $("mKey").value.trim();
  const role = $("mRole").value;
  const needsBase = proto === "openai-chat" || proto === "openai-image";
  const needsKey = proto !== "pollinations-image";
  if (!label || !model) { aioMsg("Name und Modell-ID sind nötig.", true); return; }
  if (needsBase && !base) { aioMsg("Basis-URL fehlt (z.B. https://api.deepseek.com).", true); return; }
  if (needsKey && !key) { aioMsg("API-Key fehlt.", true); return; }

  addCustomModel({
    label, role, protocol: proto, baseUrl: base, model,
    apiKey: key, vision: $("mVision").checked,
    info: `Eigene KI: ${label} (${proto}${$("mVision").checked ? ", Vision" : ""}).`,
  });
  $("mName").value = ""; $("mModel").value = ""; $("mKey").value = "";
  aioMsg(`„${label}“ hinzugefügt und auswählbar.`, false);
  renderCustomList();
  refreshModelDropdowns();
});

function aioMsg(msg, isErr) {
  const el = $("aioMsg");
  el.textContent = msg;
  el.classList.toggle("err", !!isErr);
}

function renderCustomList() {
  const list = loadCustomModels();
  const box = $("customList");
  if (!list.length) { box.innerHTML = `<small class="modelinfo">Noch keine eigene KI. Vorlage wählen und hinzufügen.</small>`; return; }
  box.innerHTML = "";
  for (const m of list) {
    const div = document.createElement("div");
    div.className = "custom-item";
    div.innerHTML = `<span>${escapeHtml(m.label)} · ${escapeHtml(m.role)} · ${escapeHtml(m.model)}</span>`;
    const del = document.createElement("button");
    del.textContent = "🗑️"; del.title = "Entfernen";
    del.onclick = () => { removeCustomModel(m.id); renderCustomList(); refreshModelDropdowns(); };
    div.appendChild(del);
    box.appendChild(div);
  }
}

renderCustomList();
refreshModelDropdowns();

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
    const wantEnhance = $("enhance").checked;
    const wantVerify = $("verify").checked;
    const maxTries = wantVerify ? clampInt($("maxTries").value, 1, 8, 4) : 1;

    const imgCfg = resolveModel(state.imageModelId, "image");
    const textCfg = resolveModel(state.textModelId, "text");
    if (imgCfg.needsKey && !imgCfg.apiKey) {
      throw new Error(`„${imgCfg.label}“ braucht einen API-Key. Bitte eintragen oder ein anderes Modell wählen.`);
    }

    // 1) Wunsch in Elemente + starken englischen Bild-Prompt zerlegen
    setStatus(`Analysiere deinen Wunsch (${textCfg.label}) …`);
    const analysis = wantEnhance
      ? await analyzePrompt(prompt, textCfg)
      : { elements: [], imagePrompt: prompt, source: "off", warning: "" };

    let diag = "";
    if (analysis.source === "fallback" && analysis.warning) {
      diag = `Analyse via ${textCfg.label} fiel auf einfache Zerlegung zurück (${analysis.warning})`;
    }

    // Nur bei echtem englischem KI-Prompt Pollinations NICHT umschreiben lassen.
    const strongPrompt = analysis.source === "ai";
    const polliEnhance = imgCfg.protocol === "pollinations-image" && !strongPrompt;

    // 2) Generier-/Prüf-Schleife
    let img = null, verify = null;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      const missing = verify?.results ? verify.results.filter((v) => !v.present).map((v) => v.element) : [];
      let p = analysis.imagePrompt;
      if (missing.length) p += `. IMPORTANT: the ${missing.join(" and ")} MUST be clearly visible`;

      setStatus(maxTries > 1
        ? `Generiere Bild (Versuch ${attempt}/${maxTries}, ${imgCfg.label}) …`
        : `Generiere Bild (${imgCfg.label}) …`);
      img = await generateImage(imgCfg, p, { enhance: polliEnhance });

      // 3) Gegenprüfung
      if (!wantVerify || !analysis.elements.length) break;
      setStatus(`Prüfe Ergebnis (Versuch ${attempt}/${maxTries}, ${textCfg.label}) …`);
      verify = await verifyImage(img, analysis.elements, textCfg);
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
