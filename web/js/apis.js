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

/**
 * Optionale Prompt-Verbesserung über ein Gemini-Textmodell (kostenlos).
 */
export async function enhancePrompt(prompt, apiKey) {
  if (!apiKey) return prompt; // ohne Key einfach Original nehmen
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const instruction =
    "Verwandle die folgende kurze Idee in einen guten englischen Bild-Prompt für einen " +
    "Sticker: farbenfroh, klare Konturen, zentriertes Motiv, einfacher/weißer Hintergrund, " +
    "Cartoon-/Sticker-Stil. Antworte NUR mit dem Prompt, ohne Erklärung.\n\nIdee: " + prompt;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }] }),
    });
    if (!res.ok) return prompt;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return (text || prompt).trim();
  } catch {
    return prompt; // bei Fehler still auf Original zurückfallen
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
