// ================= Modell-Registry =================
// Zentrale Liste aller nutzbaren Modelle inkl. Nutzungsinfo fürs Produkt.
// Hier neue Modelle einfach ergänzen – UI und Logik ziehen sich alles von hier.

// ---- Bild-Modelle (Sticker-Generierung) ----
export const IMAGE_MODELS = [
  {
    id: "pollinations:flux",
    provider: "pollinations",
    model: "flux",
    label: "Pollinations · Flux",
    badge: "gratis",
    needsKey: false,
    info: "Kostenlos, kein Key. Gut für einzelne, einfache Motive. " +
          "Schwächer bei Kombis („X mit Y“), Text/Logos (z. B. Bitcoin) und bekannten Figuren.",
  },
  {
    id: "pollinations:turbo",
    provider: "pollinations",
    model: "turbo",
    label: "Pollinations · Turbo",
    badge: "gratis, schnell",
    needsKey: false,
    info: "Kostenlos und sehr schnell, dafür etwas geringere Bildqualität. Gut für schnelle Entwürfe.",
  },
  {
    id: "gemini:gemini-2.5-flash-image",
    provider: "gemini",
    model: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image – „Nano Banana“",
    badge: "Key · beste Treue",
    needsKey: true,
    info: "Beste Prompt-Treue – auch bei Kombis, Konzepten und Text. ⚠️ Das KOSTENLOSE Bild-Kontingent ist " +
          "sehr klein (schnell „429 Kontingent erschöpft“). Für unbegrenzt gratis: Pollinations + mehr Versuche. " +
          "Hinweis: geschützte Figuren (Disney & Co.) kann Gemini ablehnen – dann eigene Fantasiefigur beschreiben.",
  },
];

// ---- Text-/Vision-Modelle (Prompt-Analyse & Gegenprüfung) ----
export const VISION_MODELS = [
  {
    id: "pollinations",
    label: "Pollinations",
    badge: "gratis · unbegrenzt",
    info: "Kostenlose Prüfung & Übersetzung, kein Key, kein Kontingent. Etwas weniger genau als Gemini – ideal, wenn du das Gemini-Kontingent schonen willst.",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    badge: "Key · genau",
    info: "Sehr genaue Bildprüfung & Übersetzung. Braucht Gemini-Key und verbraucht Gemini-Kontingent.",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    badge: "Key · schneller",
    info: "Etwas schneller/günstiger, minimal geringere Genauigkeit. Verbraucht Gemini-Kontingent.",
  },
];

// Freundliche Klartext-Beschreibung von Gemini-Fehlern (v.a. Kontingent 429).
export function describeGeminiError(status, body) {
  const short = String(body || "").replace(/\s+/g, " ").trim().slice(0, 170);
  if (status === 429) {
    const m = String(body).match(/"retryDelay":\s*"(\d+)s"/);
    const wait = m ? ` – neuer Versuch in ~${m[1]}s` : "";
    return `Gemini-Kontingent erschöpft (429)${wait}. Das kostenlose Bild-Kontingent ist sehr klein. ` +
           `Tipp: Bild-Modell „Pollinations“ nutzen (gratis & unbegrenzt) oder später erneut versuchen.`;
  }
  if (status === 401 || status === 403) {
    return `Gemini-Zugriff verweigert (${status}). Key ungültig oder „Generative Language API“ nicht aktiviert. ${short}`;
  }
  if (status === 404) return `Gemini-Modell nicht gefunden (404). ${short}`;
  return `Gemini-Fehler ${status}: ${short}`;
}

export function findImageModel(id) {
  return IMAGE_MODELS.find((m) => m.id === id) || IMAGE_MODELS[0];
}
export function findVisionModel(id) {
  return VISION_MODELS.find((m) => m.id === id) || VISION_MODELS[0];
}
