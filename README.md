# CcodeAndr

Hilfsdateien, um Claude Code **ohne** den CCR-Proxy (Claude Code Router) zu starten.

## Warum startet Claude immer „mit Proxy"?

Beim Einrichten setzt `ccr` dauerhafte Windows-Umgebungsvariablen
(`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, …), die auf den lokalen Proxy
(`127.0.0.1:3456`) zeigen. Weil diese **dauerhaft** gespeichert sind, benutzt
sogar ein normal gestartetes `claude` weiter den Proxy – deshalb siehst du dort
„ganz andere Chats". Ein `ccr stop` allein reicht nicht, weil die Variablen
gesetzt bleiben.

## Dateien

### 1. `start-claude-noproxy.bat`  (empfohlen)
Doppelklick → startet das normale Claude Code ohne Proxy.
- stoppt `ccr`, falls es läuft
- leert die Proxy-Variablen **nur für dieses Fenster** (deine dauerhaften
  Windows-Einstellungen bleiben unverändert)
- startet `claude`

So kannst du bei Bedarf später trotzdem noch `ccr` benutzen.

### 2. `remove-proxy-env-permanent.bat`  (optional, endgültig)
Nur nutzen, wenn **auch** ein normal gestartetes `claude` nie mehr über den
Proxy laufen soll. Entfernt die dauerhaften CCR-Variablen aus Windows.
- fragt vorher nach (J/N)
- danach **einmal ab-/anmelden oder PC neu starten**
- CCR müsste bei späterer Nutzung einmal neu konfiguriert werden

## Falls es danach immer noch über den Proxy geht

Dann steckt die Proxy-Einstellung zusätzlich in der Claude-Konfiguration.
Prüfe die Datei `%USERPROFILE%\.claude\settings.json` und entferne dort einen
`env`-Block mit `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`, falls vorhanden.

## Autostart abschalten (falls `ccr` beim Hochfahren startet)

`Win + R` → `shell:startup` → dort einen evtl. vorhandenen CCR-Starteintrag
löschen. Zusätzlich im Task-Manager unter „Autostart" prüfen.
