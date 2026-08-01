// ================= Gegenprüfer =================
// Zerlegt den Wunsch in Elemente, baut einen starken englischen Bild-Prompt und
// prüft per Vision-Modell, ob alle gewünschten Elemente wirklich im Bild sind.
//
// Provider: mit Gemini-Key -> Gemini (zuverlässig); sonst -> Pollinations (gratis).
// WICHTIG: Fehler werden NICHT verschluckt, sondern als Klartext zurückgegeben,
// damit man die echte Ursache sieht (z.B. "Gemini 400: API key not valid").

// Für Text/Vision der Reihe nach probierte Modelle (falls eines nicht verfügbar ist).
const TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

// -------- kleine Helfer --------

function shorten(s, n = 160) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function fetchWithTimeout(url, options = {}, ms = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
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

// Artikel/Füllwörter, die kein Bildelement sind.
const STOP = new Set([
  "ein", "eine", "einem", "einen", "einer", "eines",
  "der", "die", "das", "den", "dem", "des",
  "a", "an", "the", "with", "and", "some", "of",
]);

// Notfall-Zerlegung ohne KI: an Verbindungswörtern trennen, Artikel entfernen.
export function parseElements(prompt) {
  return prompt
    .toLowerCase()
    .split(/\s+mit\s+|\s+und\s+|\s+with\s+|\s+and\s+|,|\+|&/)
    .map((part) => part.split(/\s+/).filter((w) => w && !STOP.has(w)).join(" ").trim())
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

// -------- Provider-Aufrufe (Text + Vision) --------
// Werfen bei Fehler eine Error mit KLARTEXT-Ursache.

async function askGemini(textPrompt, imageDataUrl, key) {
  const parts = [{ text: textPrompt }];
  if (imageDataUrl) {
    parts.push({ inline_data: { mime_type: "image/png", data: imageDataUrl.split(",")[1] } });
  }
  let lastErr = "";
  for (const model of TEXT_MODELS) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    let res;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
      });
    } catch (e) {
      lastErr = `Netzwerk/Timeout (${e.name || "Fehler"})`;
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    }
    const body = await res.text().catch(() => "");
    lastErr = `Gemini ${res.status}: ${shorten(body)}`;
    if (res.status === 404) continue;          // Modell nicht da -> nächstes probieren
    throw new Error(lastErr);                    // 400/401/403 -> echter Fehler (meist Key)
  }
  throw new Error(lastErr || "Gemini nicht erreichbar");
}

async function askPollinations(textPrompt, imageDataUrl) {
  const content = [{ type: "text", text: textPrompt }];
  if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  let res;
  try {
    res = await fetchWithTimeout("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai", messages: [{ role: "user", content }] }),
    });
  } catch (e) {
    throw new Error(`Pollinations Netzwerk/Timeout (${e.name || "Fehler"})`);
  }
  if (!res.ok) throw new Error(`Pollinations ${res.status}: ${shorten(await res.text().catch(() => ""))}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function ask(textPrompt, imageDataUrl, key) {
  return key ? askGemini(textPrompt, imageDataUrl, key)
             : askPollinations(textPrompt, imageDataUrl);
}

// -------- öffentliche Funktionen --------

/**
 * Wunsch -> { elements, imagePrompt, source: "ai"|"fallback", warning }
 * "ai"       = starker englischer Prompt vom Modell (jedes Element erzwungen)
 * "fallback" = Modell nicht verfügbar -> Originaltext (Aufrufer sollte übersetzen lassen)
 */
export async function analyzePrompt(prompt, key) {
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
    const raw = await ask(instruction, null, key);
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
    imagePrompt: prompt, // roh -> Aufrufer nutzt Pollinations enhance=true zum Übersetzen
    source: "fallback",
    warning,
  };
}

/**
 * Prüft, ob jedes Element sichtbar ist.
 * @returns {{results: Array<{element,present}>}|{error: string}}
 */
export async function verifyImage(img, elements, key) {
  if (!elements?.length) return { error: "keine Elemente zum Prüfen" };
  let dataUrl;
  try { dataUrl = toDataUrl(img); }
  catch (e) { return { error: `Bild nicht lesbar (${e.name || "Fehler"})` }; }

  const instruction =
    "Look carefully at this sticker image. For EACH element below, decide if it is clearly visible. " +
    "Elements: " + elements.join(", ") + ". " +
    'Return ONLY a JSON array like [{"element":"heart","present":true}].';
  try {
    const raw = await ask(instruction, dataUrl, key);
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
