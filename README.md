# 🎨 Sticker Studio – KI Sticker & GIF Generator

Eine App, die per KI **bewegte Sticker** und **GIFs** erzeugt – für WhatsApp & Co.
Aktueller Stand: **Web-Prototyp** (Phase 1). Danach folgt die native **Android-App**
mit direkter WhatsApp-Sticker-Einbindung.

## Was der Prototyp kann

- 🖼️ Bild per KI generieren – umschaltbar zwischen:
  - **Pollinations** (komplett kostenlos, kein API-Key)
  - **Gemini** (Google AI Studio, kostenloser Key)
- ✍️ Prompt optional per Gemini automatisch verbessern
- ✂️ Hintergrund entfernen für echten Sticker-Look (läuft im Browser, kostenlos)
- 🎬 Bild animieren: Hüpfen, Wackeln, Pulsieren, Drehen, Schweben, Zittern, Pop, Rainbow
- ⬇️ Export als **animiertes GIF** (überall teilbar) und WebP-Standbild

## Starten

Wegen der Browser-Sicherheit (CORS) nicht per Doppelklick öffnen, sondern
einen kleinen lokalen Server starten:

```bash
cd web
python3 -m http.server 8000
# dann im Browser öffnen:  http://localhost:8000
```

### Gemini nutzen (optional)
1. Kostenlosen Key holen: https://aistudio.google.com/apikey
2. In der App oben rechts „Gemini" wählen und Key einfügen (bleibt lokal im Browser).

## Projektstruktur

```
web/
  index.html          # Oberfläche
  css/style.css       # Styling
  js/
    apis.js           # Pollinations, Gemini, Prompt-Verbesserung, Hintergrund entfernen
    animator.js       # Animations-Presets + GIF-Kodierung
    app.js            # Steuerung / UI-Logik
```

## Modelle (auswählbar in der App)

**Bild-Modelle:**
| Modell | Key | Stärken |
|--------|-----|---------|
| Pollinations · Flux | nein | Gratis, einzelne Motive. Schwach bei „X mit Y", Logos, Figuren. |
| Pollinations · Turbo | nein | Gratis, sehr schnell, geringere Qualität. |
| Gemini 2.5 Flash Image („Nano Banana") | ja | Beste Prompt-Treue – auch Kombis, Konzepte, Text. Empfohlen. |

**Prüf-/Vision-Modelle** (für Gegenprüfung & Übersetzung): Gemini 2.5 Flash, Gemini 2.0 Flash.

Neue Modelle lassen sich zentral in `web/js/models.js` ergänzen – UI und Logik ziehen sich alles von dort.

## Verwendete kostenlose Dienste

| Zweck | Dienst | Key nötig |
|-------|--------|-----------|
| Bild-Generierung | Pollinations.ai | Nein |
| Bild-Generierung / Prompt | Google Gemini (AI Studio) | Ja (gratis) |
| Hintergrund entfernen | @imgly/background-removal (im Browser) | Nein |
| GIF-Kodierung | gif.js | Nein |

## Roadmap

- [x] **Phase 1 – Web-Prototyp:** KI-Bild → Animation → GIF-Export
- [ ] **Phase 2 – Animiertes WebP:** Export im WhatsApp-Format (512×512, transparent, < 500 KB)
- [ ] **Phase 3 – Android-App (Kotlin):** direkte Einbindung als WhatsApp-Sticker-Pack
      über die offizielle Sticker-ContentProvider-API
- [ ] **Phase 4 – KI-Videos:** echte Bewegung über Video-Modelle (z. B. Veo) statt Code-Animation
