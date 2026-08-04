// ================= Modell-Registry (AIO) =================
// Eingebaute Modelle + benutzerdefinierte Modelle (im Browser gespeichert).
// Jede KI hat ein "protocol", das providers.js versteht.
//
// Rollen:
//   role "image" -> Bild-Generierung
//   role "text"  -> Prompt-Analyse & (bei vision:true) Bild-Prüfung

export const BUILTIN_IMAGE = [
  {
    id: "pollinations:flux", role: "image", protocol: "pollinations-image", model: "flux",
    label: "Pollinations · Flux", badge: "gratis", needsKey: false, keyKind: "pollinations",
    info: "Kostenlos, kein Key. Gut für einzelne Motive. Schwächer bei „X mit Y“, Logos, Figuren. " +
          "Optionaler Pollinations-Key hebt die Limits.",
  },
  {
    id: "pollinations:turbo", role: "image", protocol: "pollinations-image", model: "turbo",
    label: "Pollinations · Turbo", badge: "gratis, schnell", needsKey: false, keyKind: "pollinations",
    info: "Kostenlos, sehr schnell, gröber. Gut für schnelle Entwürfe.",
  },
  {
    id: "gemini:image", role: "image", protocol: "gemini-image", model: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image – „Nano Banana“", badge: "Key · beste Treue", needsKey: true, keyKind: "gemini",
    info: "Beste Prompt-Treue. ⚠️ Kleines kostenloses Bild-Kontingent (schnell „429“). " +
          "Geschützte Figuren kann Gemini ablehnen.",
  },
];

export const BUILTIN_TEXT = [
  {
    id: "gemini:2.5-flash", role: "text", protocol: "gemini-text", model: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash", badge: "Key · Vision", needsKey: true, keyKind: "gemini", vision: true,
    info: "Genaue Analyse & Bild-Prüfung. Nutzt Gemini-TEXT-Kontingent (getrennt vom Bild-Limit). Empfohlen.",
  },
  {
    id: "gemini:2.0-flash", role: "text", protocol: "gemini-text", model: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash", badge: "Key · Vision", needsKey: true, keyKind: "gemini", vision: true,
    info: "Etwas schneller/günstiger, minimal geringere Genauigkeit.",
  },
];

// ---- Presets für „Neue KI hinzufügen“ ----
export const PRESETS = {
  deepseek: {
    label: "DeepSeek", protocol: "openai-chat", baseUrl: "https://api.deepseek.com", model: "deepseek-chat",
    role: "text", vision: false,
    info: "DeepSeek Chat – stark bei Text & Übersetzung. Kann KEINE Bilder sehen (nur Analyse/Übersetzung, nicht Bild-Prüfung).",
  },
  openrouter: {
    label: "OpenRouter", protocol: "openai-chat", baseUrl: "https://openrouter.ai/api/v1", model: "google/gemini-2.0-flash-exp:free",
    role: "text", vision: true,
    info: "OpenRouter – Zugang zu vielen Modellen. Vision je nach gewähltem Modell.",
  },
  groq: {
    label: "Groq", protocol: "openai-chat", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.2-90b-vision-preview",
    role: "text", vision: true,
    info: "Groq – sehr schnell. Vision je nach Modell.",
  },
  openai: {
    label: "OpenAI", protocol: "openai-chat", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini",
    role: "text", vision: true,
    info: "OpenAI GPT-4o mini – Vision-fähig. Für Bilder: Modell „dall-e-3“ + Protokoll openai-image.",
  },
  "openai-image": {
    label: "DALL·E", protocol: "openai-image", baseUrl: "https://api.openai.com/v1", model: "dall-e-3",
    role: "image", vision: false,
    info: "OpenAI Bildgenerierung (DALL·E 3). Braucht OpenAI-Key mit Guthaben.",
  },
  custom: {
    label: "", protocol: "openai-chat", baseUrl: "", model: "", role: "text", vision: false,
    info: "Eigener OpenAI-kompatibler Endpoint.",
  },
};

// ---- Custom-Modelle im localStorage ----
const LS_KEY = "customModels";

export function loadCustomModels() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
export function saveCustomModels(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}
export function addCustomModel(m) {
  const list = loadCustomModels();
  m.id = "custom:" + (m.label || m.model || "ki").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ":" + list.length;
  m.custom = true;
  m.needsKey = m.protocol !== "pollinations-image";
  list.push(m);
  saveCustomModels(list);
  return m;
}
export function removeCustomModel(id) {
  saveCustomModels(loadCustomModels().filter((m) => m.id !== id));
}

// ---- kombinierte Listen ----
export function getImageModels() {
  return [...BUILTIN_IMAGE, ...loadCustomModels().filter((m) => m.role === "image")];
}
export function getTextModels() {
  return [...BUILTIN_TEXT, ...loadCustomModels().filter((m) => m.role === "text")];
}
export function findModel(id, role) {
  const list = role === "image" ? getImageModels() : getTextModels();
  return list.find((m) => m.id === id) || list[0];
}
