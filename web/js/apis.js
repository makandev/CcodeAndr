// ================= Bild-APIs =================
// Beide liefern am Ende ein HTMLImageElement (512x512, für Canvas nutzbar).

/**
 * Lädt eine URL/DataURL in ein <img> mit CORS-Freigabe (damit Canvas nicht "tainted" wird).
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = src;
  });
}

/**
 * Pollinations: komplett kostenlos, kein API-Key.
 * enhance=true lässt Pollinations den Prompt SERVERSEITIG verbessern/übersetzen –
 * kein zusätzlicher (potenziell hängender) Client-Aufruf nötig.
 * Doku: https://pollinations.ai
 */
export async function generatePollinations(prompt, { enhance = false } = {}) {
  const seed = Math.floor(Math.random() * 1e9);
  const enc = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${enc}` +
    `?width=512&height=512&nologo=true&seed=${seed}&model=flux` +
    (enhance ? "&enhance=true" : "");
  return loadImage(url);
}

/**
 * Gemini (Google AI Studio) – "Nano Banana" Bildmodell.
 * Braucht einen kostenlosen API-Key.
 */
export async function generateGemini(prompt, apiKey) {
  if (!apiKey) throw new Error("Kein Gemini API-Key hinterlegt");
  const model = "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  }, 45000);

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini-Fehler ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  if (!imgPart) throw new Error("Gemini hat kein Bild zurückgegeben");

  const mime = imgPart.inlineData.mimeType || "image/png";
  return loadImage(`data:${mime};base64,${imgPart.inlineData.data}`);
}

// Anweisung für den "Prompt-Verbesserer": übersetzen + als Sticker ausschmücken,
// WICHTIG: wirklich JEDES genannte Element übernehmen (z.B. das "Herz").
const ENHANCE_INSTRUCTION =
  "You turn a short idea into ONE English image prompt for a cute die-cut sticker. " +
  "Rules: keep EVERY element the user mentions (e.g. if they say 'with a heart', a heart MUST be visible). " +
  "Style: colorful cartoon sticker, bold clean outline, centered single subject, plain white background, " +
  "flat vector look. Answer with ONLY the prompt, no quotes, no explanation.\n\nIdea: ";

/**
 * fetch mit hartem Timeout – verhindert, dass ein hängender Aufruf die App blockiert.
 */
async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Prompt-Verbesserung über Gemini (übersetzt + Sticker-Stil).
 * Nur mit Key; ohne Key wird stattdessen Pollinations' serverseitiges enhance=true genutzt.
 * Fällt bei jedem Fehler/Timeout still auf den Originaltext zurück.
 */
export async function enhancePrompt(prompt, apiKey) {
  if (!apiKey) return prompt;
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: ENHANCE_INSTRUCTION + prompt }] }] }),
    });
    if (!res.ok) return prompt;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return (text || prompt).trim();
  } catch {
    return prompt;
  }
}

/**
 * Hintergrund entfernen (optional) über @imgly/background-removal – läuft im Browser (WASM),
 * kostenlos, ohne Server. Wird erst bei Bedarf nachgeladen.
 */
let _bgRemovalMod = null;
export async function removeBackground(img) {
  if (!_bgRemovalMod) {
    _bgRemovalMod = await import(
      "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm"
    );
  }
  const { removeBackground: rb } = _bgRemovalMod;

  // img -> Canvas -> Blob als Eingabe
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 512;
  c.height = img.naturalHeight || 512;
  c.getContext("2d").drawImage(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));

  const outBlob = await rb(blob);
  const urlObj = URL.createObjectURL(outBlob);
  const out = await loadImage(urlObj);
  URL.revokeObjectURL(urlObj);
  return out;
}
