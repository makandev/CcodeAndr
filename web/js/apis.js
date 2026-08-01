// ================= Bild-APIs =================
// Beide liefern am Ende ein HTMLImageElement (512x512, für Canvas nutzbar).
import { describeGeminiError } from "./models.js";

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
export async function generatePollinations(prompt, { enhance = false, model = "flux" } = {}) {
  const seed = Math.floor(Math.random() * 1e9);
  const enc = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${enc}` +
    `?width=512&height=512&nologo=true&seed=${seed}&model=${encodeURIComponent(model)}` +
    (enhance ? "&enhance=true" : "");
  return loadImage(url);
}

function shorten(s, n = 200) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/**
 * Gemini (Google AI Studio) Bildmodell, z.B. "gemini-2.5-flash-image" (Nano Banana).
 * Braucht einen kostenlosen API-Key.
 *
 * Wichtig: Bild-Modelle brauchen generationConfig.responseModalities.
 * Wir versuchen es MIT und (als Fallback) OHNE, und geben bei Ablehnung/kein-Bild
 * den echten Grund als Klartext zurück (z.B. Safety-Ablehnung bei geschützten Figuren).
 */
export async function generateGemini(prompt, apiKey, model = "gemini-2.5-flash-image") {
  if (!apiKey) throw new Error("Kein Gemini API-Key hinterlegt");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const bodies = [
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } },
    { contents: [{ parts: [{ text: prompt }] }] }, // Fallback ohne responseModalities
  ];

  let lastErr = "";
  for (const body of bodies) {
    let res;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, 60000);
    } catch (e) {
      lastErr = `Netzwerk/Timeout (${e.name || "Fehler"})`;
      continue;
    }

    if (!res.ok) {
      lastErr = describeGeminiError(res.status, await res.text().catch(() => ""));
      if (res.status === 400) continue;  // evtl. responseModalities nicht unterstützt -> Fallback
      throw new Error(lastErr);           // 401/403/404/429 -> echter Fehler (Key/Modell/Kontingent)
    }

    const data = await res.json();
    const cand = data?.candidates?.[0];
    const parts = cand?.content?.parts || [];
    const inline = parts.map((p) => p.inlineData || p.inline_data).find((d) => d?.data);
    if (inline?.data) {
      const mime = inline.mimeType || inline.mime_type || "image/png";
      return loadImage(`data:${mime};base64,${inline.data}`);
    }
    // Kein Bild -> oft Safety-Ablehnung; Text/Grund mitgeben
    const reason = cand?.finishReason || "";
    const textOut = parts.map((p) => p.text).filter(Boolean).join(" ");
    lastErr = `Gemini lieferte kein Bild${reason ? ` (${reason})` : ""}` +
              (textOut ? `: „${shorten(textOut, 140)}“` : "");
    // ohne responseModalities kommt evtl. nur Text -> nächster Versuch bringt nichts mehr
  }
  throw new Error(lastErr || "Gemini Bildgenerierung fehlgeschlagen");
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
