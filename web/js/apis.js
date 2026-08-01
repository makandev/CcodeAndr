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
 * Doku: https://pollinations.ai
 */
export async function generatePollinations(prompt) {
  const seed = Math.floor(Math.random() * 1e9);
  const enc = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${enc}` +
    `?width=512&height=512&nologo=true&seed=${seed}&model=flux`;
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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

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
 * Prompt-Verbesserung (übersetzt + Sticker-Stil).
 * Mit Gemini-Key -> Gemini; sonst kostenlos über die Text-API von Pollinations.
 */
export async function enhancePrompt(prompt, apiKey) {
  return apiKey
    ? enhanceViaGemini(prompt, apiKey)
    : enhanceViaPollinations(prompt);
}

async function enhanceViaGemini(prompt, apiKey) {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: ENHANCE_INSTRUCTION + prompt }] }] }),
    });
    if (!res.ok) return enhanceViaPollinations(prompt);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return (text || prompt).trim();
  } catch {
    return enhanceViaPollinations(prompt);
  }
}

// Kostenlose Text-API von Pollinations – kein Key nötig.
async function enhanceViaPollinations(prompt) {
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(ENHANCE_INSTRUCTION + prompt)}`;
    const res = await fetch(url);
    if (!res.ok) return prompt;
    const text = (await res.text()).trim();
    // Sicherheitsnetz: unbrauchbare/leere Antwort -> Original + Sticker-Zusatz
    if (!text || text.length > 400) return `${prompt}, cute sticker, bold outline, white background`;
    return text;
  } catch {
    return `${prompt}, cute sticker, bold outline, white background`;
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
