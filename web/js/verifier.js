// ================= Gegenprüfer =================
// Zerlegt den Wunsch in Elemente, baut einen starken Bild-Prompt und prüft
// per Vision-Modell, ob alle gewünschten Elemente wirklich im Bild sind.
//
// Provider: mit Gemini-Key -> Gemini (zuverlässig); sonst -> Pollinations (gratis).

// -------- kleine Helfer --------

async function fetchJSON(url, opts, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Erstes JSON-Objekt/-Array aus einem Text herausziehen (Modelle plaudern gern).
export function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* weiter */ }
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// Notfall-Zerlegung ohne KI: an Verbindungswörtern trennen.
export function parseElements(prompt) {
  return prompt
    .toLowerCase()
    .split(/\s+mit\s+|\s+und\s+|\s+with\s+|\s+and\s+|,|\+|&/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .slice(0, 6);
}

// Bild -> DataURL (PNG) für Vision-Eingaben.
function toDataUrl(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 512;
  c.height = img.naturalHeight || 512;
  c.getContext("2d").drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}

// -------- Provider-Aufrufe (Text + Vision in einem) --------

async function askGemini(textPrompt, imageDataUrl, key) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const parts = [{ text: textPrompt }];
  if (imageDataUrl) {
    parts.push({ inline_data: { mime_type: "image/png", data: imageDataUrl.split(",")[1] } });
  }
  const data = await fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function askPollinations(textPrompt, imageDataUrl) {
  const content = [{ type: "text", text: textPrompt }];
  if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  const data = await fetchJSON("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai", messages: [{ role: "user", content }] }),
  });
  return data?.choices?.[0]?.message?.content || "";
}

async function ask(textPrompt, imageDataUrl, key) {
  return key ? askGemini(textPrompt, imageDataUrl, key)
             : askPollinations(textPrompt, imageDataUrl);
}

// -------- öffentliche Funktionen --------

/**
 * Wunsch -> { elements: [...], imagePrompt: "..." }
 * Übersetzt und schmückt aus, behält aber JEDES Element. Fällt bei Fehler auf
 * eine simple lokale Zerlegung zurück.
 */
export async function analyzePrompt(prompt, key) {
  const instruction =
    "The user wants a sticker (idea may be in any language): \"" + prompt + "\". " +
    "1) List every distinct visual element that MUST appear, in English, as short lowercase nouns. " +
    "2) Write ONE concise English image prompt for a cute die-cut sticker that clearly includes ALL of them, " +
    "bold clean outline, centered, plain white background, flat cartoon vector style. " +
    'Return ONLY JSON: {"elements":["..."],"imagePrompt":"..."}';
  try {
    const raw = await ask(instruction, null, key);
    const json = extractJson(raw);
    const elements = Array.isArray(json?.elements) ? json.elements.filter(Boolean) : [];
    const imagePrompt = typeof json?.imagePrompt === "string" ? json.imagePrompt : "";
    if (elements.length && imagePrompt) return { elements, imagePrompt };
  } catch { /* Fallback unten */ }
  return {
    elements: parseElements(prompt),
    imagePrompt: `${prompt}, cute die-cut sticker, bold outline, centered, white background`,
  };
}

/**
 * Prüft, ob jedes Element sichtbar ist.
 * @returns {Array<{element,present}>|null}  null = Prüfung nicht möglich
 */
export async function verifyImage(img, elements, key) {
  if (!elements?.length) return null;
  const dataUrl = toDataUrl(img);
  const instruction =
    "Look carefully at this sticker image. For EACH element below, decide if it is clearly visible. " +
    "Elements: " + elements.join(", ") + ". " +
    'Return ONLY a JSON array like [{"element":"heart","present":true}].';
  try {
    const raw = await ask(instruction, dataUrl, key);
    const json = extractJson(raw);
    const arr = Array.isArray(json) ? json : json?.results;
    if (!Array.isArray(arr)) return null;
    return elements.map((el) => {
      const hit = arr.find((r) => (r.element || "").toLowerCase().includes(el.toLowerCase())
        || el.toLowerCase().includes((r.element || "").toLowerCase()));
      return { element: el, present: hit ? !!hit.present : false };
    });
  } catch {
    return null; // z.B. kein Key + Dienst nicht erreichbar
  }
}
