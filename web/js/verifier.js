// ================= Gegenprüfer =================
// Zerlegt den Wunsch in Elemente, baut einen starken englischen Bild-Prompt und
// prüft per Vision-Modell, ob alle gewünschten Elemente im Bild sind.
// Nutzt providers.runText(cfg, ...) – funktioniert mit jedem Text/Vision-Modell.

import { runText } from "./providers.js";

// Erstes JSON-Objekt/-Array aus einem Text herausziehen.
export function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* weiter */ }
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const STOP = new Set([
  "ein", "eine", "einem", "einen", "einer", "eines",
  "der", "die", "das", "den", "dem", "des",
  "a", "an", "the", "with", "and", "some", "of",
]);

export function parseElements(prompt) {
  return prompt
    .toLowerCase()
    .split(/\s+mit\s+|\s+und\s+|\s+with\s+|\s+and\s+|,|\+|&/)
    .map((part) => part.split(/\s+/).filter((w) => w && !STOP.has(w)).join(" ").trim())
    .filter((s) => s.length > 1)
    .slice(0, 6);
}

function toDataUrl(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 512;
  c.height = img.naturalHeight || 512;
  c.getContext("2d").drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}

/**
 * Wunsch -> { elements, imagePrompt, source: "ai"|"fallback", warning }
 * textCfg = aufgelöstes Text-Modell (protocol/apiKey/...).
 */
export async function analyzePrompt(prompt, textCfg) {
  const instruction =
    'You turn a sticker idea (any language) into JSON for image generation. Idea: "' + prompt + '". ' +
    "Return ONLY this JSON, nothing else: " +
    '{"elements":["short english noun per required visual thing"],' +
    '"imagePrompt":"one english prompt for a cute die-cut sticker that CLEARLY shows every element, ' +
    'bold clean outline, centered, plain white background, flat cartoon vector style"}. ' +
    'Example idea "schmetterling mit einem herz" -> ' +
    '{"elements":["butterfly","heart"],"imagePrompt":"a cute cartoon butterfly holding a big red love heart, ' +
    'both clearly visible, die-cut sticker, bold outline, centered, plain white background"}';
  try {
    const raw = await runText(textCfg, instruction, null);
    const json = extractJson(raw);
    const elements = Array.isArray(json?.elements) ? json.elements.map(String).filter(Boolean) : [];
    const imagePrompt = typeof json?.imagePrompt === "string" ? json.imagePrompt.trim() : "";
    if (elements.length && imagePrompt) return { elements, imagePrompt, source: "ai", warning: "" };
    return fallback(prompt, "Antwort ohne verwertbares JSON");
  } catch (e) {
    return fallback(prompt, e.message);
  }
}

function fallback(prompt, warning) {
  return {
    elements: parseElements(prompt),
    imagePrompt: prompt,
    source: "fallback",
    warning,
  };
}

/**
 * Prüft, ob jedes Element sichtbar ist.
 * @returns {{results: Array<{element,present}>}|{error: string}}
 */
export async function verifyImage(img, elements, textCfg) {
  if (!elements?.length) return { error: "keine Elemente zum Prüfen" };
  let dataUrl;
  try { dataUrl = toDataUrl(img); }
  catch (e) { return { error: `Bild nicht lesbar (${e.name || "Fehler"})` }; }

  const instruction =
    "Look carefully at this sticker image. For EACH element below, decide if it is clearly visible. " +
    "Elements: " + elements.join(", ") + ". " +
    'Return ONLY a JSON array like [{"element":"heart","present":true}].';
  try {
    const raw = await runText(textCfg, instruction, dataUrl);
    const json = extractJson(raw);
    const arr = Array.isArray(json) ? json : json?.results;
    if (!Array.isArray(arr)) return { error: "unerwartete Prüf-Antwort" };
    const results = elements.map((el) => {
      const hit = arr.find((r) => {
        const name = (r.element || r.name || "").toLowerCase();
        return name.includes(el.toLowerCase()) || el.toLowerCase().includes(name);
      });
      return { element: el, present: hit ? !!hit.present : false };
    });
    return { results };
  } catch (e) {
    return { error: e.message };
  }
}
