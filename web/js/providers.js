// ================= Provider-Adapter (AIO) =================
// Ein zentrales Modul für ALLE KI-Aufrufe. Neue Anbieter = neues Protokoll hier
// (oder einfach per UI als "openai-chat" hinzufügen – deckt DeepSeek/OpenRouter/Groq/OpenAI ab).
//
// Zwei Rollen:
//   - Bild-Generierung:  generateImage(cfg, prompt, {enhance})  -> HTMLImageElement
//   - Text/Vision:       runText(cfg, textPrompt, imageDataUrl) -> string
//
// cfg = aufgelöstes Modell-Objekt inkl. apiKey/baseUrl/model/protocol/vision.

function shorten(s, n = 180) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function fetchWithTimeout(url, options = {}, ms = 60000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden (evtl. Limit/CORS)"));
    img.src = src;
  });
}

// ---- Fehler-Klartext ----
export function describeError(providerLabel, status, body) {
  const short = shorten(body, 160);
  if (status === 429) {
    const m = String(body).match(/"retryDelay":\s*"(\d+)s"/);
    const wait = m ? ` – neuer Versuch in ~${m[1]}s` : "";
    return `${providerLabel}: Kontingent/Rate-Limit erreicht (429${wait}). Kurz warten oder anderes Modell wählen.`;
  }
  if (status === 401) return `${providerLabel}: Key ungültig (401). API-Key prüfen.`;
  if (status === 402) return `${providerLabel}: Zahlung nötig (402). Anbieter verlangt Guthaben/Abo.`;
  if (status === 403) return `${providerLabel}: Zugriff verweigert (403). Key/Recht/Region prüfen.`;
  if (status === 404) return `${providerLabel}: Modell/Endpoint nicht gefunden (404). Modell-ID oder Basis-URL prüfen.`;
  return `${providerLabel}: Fehler ${status}: ${short}`;
}

// =================== BILD-GENERIERUNG ===================

export async function generateImage(cfg, prompt, { enhance = false } = {}) {
  switch (cfg.protocol) {
    case "pollinations-image": return pollinationsImage(cfg, prompt, enhance);
    case "gemini-image":       return geminiImage(cfg, prompt);
    case "openai-image":       return openaiImage(cfg, prompt);
    default: throw new Error(`Unbekanntes Bild-Protokoll: ${cfg.protocol}`);
  }
}

async function pollinationsImage(cfg, prompt, enhance) {
  const seed = Math.floor(Math.random() * 1e9);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=512&height=512&nologo=true&seed=${seed}&model=${encodeURIComponent(cfg.model || "flux")}` +
    (enhance ? "&enhance=true" : "") +
    (cfg.apiKey ? `&token=${encodeURIComponent(cfg.apiKey)}` : "");
  return loadImageEl(url);
}

async function geminiImage(cfg, prompt) {
  const key = cfg.apiKey;
  if (!key) throw new Error(`${cfg.label}: Gemini-Key nötig.`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${key}`;
  const bodies = [
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } },
    { contents: [{ parts: [{ text: prompt }] }] },
  ];
  let lastErr = "";
  for (const body of bodies) {
    let res;
    try { res = await fetchWithTimeout(url, jsonPost(body)); }
    catch (e) { lastErr = `${cfg.label}: Netzwerk/Timeout (${e.name || "Fehler"})`; continue; }
    if (!res.ok) {
      lastErr = describeError(cfg.label, res.status, await res.text().catch(() => ""));
      if (res.status === 400) continue;
      throw new Error(lastErr);
    }
    const cand = (await res.json())?.candidates?.[0];
    const parts = cand?.content?.parts || [];
    const inline = parts.map((p) => p.inlineData || p.inline_data).find((d) => d?.data);
    if (inline?.data) return loadImageEl(`data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`);
    const txt = parts.map((p) => p.text).filter(Boolean).join(" ");
    lastErr = `${cfg.label}: kein Bild${cand?.finishReason ? ` (${cand.finishReason})` : ""}` + (txt ? `: „${shorten(txt, 120)}“` : "");
  }
  throw new Error(lastErr || `${cfg.label}: Bildgenerierung fehlgeschlagen`);
}

// OpenAI-kompatible Bildgenerierung (z.B. DALL·E: POST /images/generations)
async function openaiImage(cfg, prompt) {
  if (!cfg.apiKey) throw new Error(`${cfg.label}: API-Key nötig.`);
  const url = cfg.baseUrl.replace(/\/$/, "") + "/images/generations";
  const res = await fetchWithTimeout(url, jsonPost(
    { model: cfg.model, prompt, size: "1024x1024", response_format: "b64_json", n: 1 },
    cfg.apiKey,
  ));
  if (!res.ok) throw new Error(describeError(cfg.label, res.status, await res.text().catch(() => "")));
  const d = await res.json();
  const b64 = d?.data?.[0]?.b64_json;
  const u = d?.data?.[0]?.url;
  if (b64) return loadImageEl(`data:image/png;base64,${b64}`);
  if (u) return loadImageEl(u);
  throw new Error(`${cfg.label}: kein Bild in Antwort`);
}

// =================== TEXT / VISION ===================

export async function runText(cfg, textPrompt, imageDataUrl = null) {
  if (imageDataUrl && cfg.vision === false) {
    throw new Error(`${cfg.label} kann keine Bilder sehen – für die Prüfung ein Vision-Modell (z. B. Gemini) wählen.`);
  }
  switch (cfg.protocol) {
    case "gemini-text": return geminiText(cfg, textPrompt, imageDataUrl);
    case "openai-chat": return openaiChat(cfg, textPrompt, imageDataUrl);
    default: throw new Error(`Unbekanntes Text-Protokoll: ${cfg.protocol}`);
  }
}

async function geminiText(cfg, textPrompt, imageDataUrl) {
  if (!cfg.apiKey) throw new Error(`${cfg.label}: Gemini-Key nötig.`);
  const parts = [{ text: textPrompt }];
  if (imageDataUrl) parts.push({ inline_data: { mime_type: "image/png", data: imageDataUrl.split(",")[1] } });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
  const res = await fetchWithTimeout(url, jsonPost({ contents: [{ parts }] }), 30000);
  if (!res.ok) throw new Error(describeError(cfg.label, res.status, await res.text().catch(() => "")));
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

// OpenAI-kompatibles Chat-Protokoll: DeepSeek, OpenRouter, Groq, OpenAI, lokal …
async function openaiChat(cfg, textPrompt, imageDataUrl) {
  if (!cfg.apiKey) throw new Error(`${cfg.label}: API-Key nötig.`);
  const content = imageDataUrl
    ? [{ type: "text", text: textPrompt }, { type: "image_url", image_url: { url: imageDataUrl } }]
    : textPrompt;
  const url = cfg.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const res = await fetchWithTimeout(url, jsonPost(
    { model: cfg.model, messages: [{ role: "user", content }] },
    cfg.apiKey,
  ), 30000);
  if (!res.ok) throw new Error(describeError(cfg.label, res.status, await res.text().catch(() => "")));
  const d = await res.json();
  return d?.choices?.[0]?.message?.content || "";
}

// ---- helper ----
function jsonPost(body, bearer) {
  const headers = { "Content-Type": "application/json" };
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  return { method: "POST", headers, body: JSON.stringify(body) };
}
