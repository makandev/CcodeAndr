# Proxy-Setup – Notizen zum Wiederherstellen (für später)

Kurzstand, damit wir den Proxy nicht neu erraten müssen.

## Wichtig: zwei verschiedene Dinge nicht verwechseln

- **Claude-Desktop-App** (Store): Die „fremden Chats" kamen NUR vom **falschen
  Konto/Login** – nicht vom Proxy. Gelöst über getrennte Profile
  (`Claude-Normal.bat` / `Claude-Proxy.bat`).
- **Claude Code (CLI)**: DAS ist das, was über den Proxy (CCR) lief.

## Was der Proxy war (Claude Code / CCR)

- CCR = „claude-code-router", installiert unter:
  - `C:\Users\makan\AppData\Roaming\npm\ccr` (und `ccr.cmd`)
  - Konfig-Ordner: `C:\Users\makan\.claude-code-router`
- Eingebunden war er über `C:\Users\makan\.claude\settings.json` mit:
  - `apiKeyHelper` →
    `C:\Users\makan\AppData\Roaming\claude-code-router\bin\ccr-claude-code-api-key-default-claude-code.cmd`
  - `env`:
    - `ANTHROPIC_BASE_URL`      = `http://127.0.0.1:3456`
    - `ANTHROPIC_API_BASE_URL`  = `http://127.0.0.1:3456`
    - `CLAUDE_AGENT_API_BASE_URL` = `http://127.0.0.1:3456`
    - `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` = `1`

## Proxy später WIEDER aktivieren – einfachster Weg

Beim Bereinigen wurde ein Backup der alten (Proxy-)settings.json angelegt, z. B.:

    C:\Users\makan\.claude\settings.json.20260801-131609.bak

Zum Wiederherstellen:
1. Claude Code komplett schließen.
2. Die `.bak`-Datei nach `C:\Users\makan\.claude\settings.json` kopieren
   (also die aktuelle `settings.json` damit überschreiben).
3. In der Eingabeaufforderung `ccr start` ausführen.
4. Claude Code starten – läuft dann wieder über den Proxy (127.0.0.1:3456).

(Falls das Backup fehlt: die vier Werte oben von Hand in den `env`-Block
der `settings.json` eintragen und `apiKeyHelper` wieder setzen.)

## Aktueller Zustand (Stand 2026-08-01)

- settings.json ist aktuell OHNE Proxy (normal).
- Desktop-App: normales Konto im Normal-Profil eingeloggt.
- Wenn du den Proxy wieder willst → Schritte oben.
