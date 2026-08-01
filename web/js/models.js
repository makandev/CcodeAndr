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
    info: "Beste Prompt-Treue – auch bei Kombis, Konzepten und Text. Kostenloses AI-Studio-Kontingent. " +
          "Empfohlen für Motive wie „Dagobert kauft Bitcoin“. Hinweis: geschützte Figuren (Disney & Co.) " +
          "kann Gemini aus rechtlichen Gründen ablehnen – dann eigene Fantasiefigur beschreiben.",
  },
];

// ---- Text-/Vision-Modelle (Prompt-Analyse & Gegenprüfung) ----
export const VISION_MODELS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    badge: "Key",
    info: "Zuverlässige Bildprüfung & Übersetzung. Braucht Gemini-Key. Empfohlen.",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    badge: "Key · schneller",
    info: "Etwas schneller/günstiger, minimal geringere Genauigkeit.",
  },
];

export function findImageModel(id) {
  return IMAGE_MODELS.find((m) => m.id === id) || IMAGE_MODELS[0];
}
export function findVisionModel(id) {
  return VISION_MODELS.find((m) => m.id === id) || VISION_MODELS[0];
}
