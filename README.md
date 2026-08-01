# CcodeAndr

Zwei Claude-Desktop-Fenster (normales Konto + Proxy-/anderes Konto)
**gleichzeitig** öffnen und dazwischen wechseln.

## Das eigentliche Problem (wichtig!)

Es ging nie um Proxy-Variablen. Bei der **Claude-Desktop-App** gilt:

1. **Welche Chats du siehst, hängt am eingeloggten Konto/Profil** – nicht an
   `HTTP_PROXY` / `ANTHROPIC_BASE_URL`. Diese Variablen zu löschen ändert an den
   angezeigten Chats **nichts**.
2. Die App hat eine **„nur-eine-Instanz"-Sperre**: Ist sie schon offen, holt
   jeder neue Start nur das **bestehende** Fenster nach vorne (gleiches Konto).

→ Lösung: Jedes Fenster bekommt ein **eigenes Profil** (`--user-data-dir`).
Getrennte Profile = getrennte Logins = beide Fenster dürfen gleichzeitig laufen.

## So richtest du es ein (einmalig)

1. **Alle Claude-Fenster schließen** (Task-Manager prüfen: kein `Claude.exe` mehr).
2. `Claude-Normal.bat` doppelklicken → im neuen Fenster mit deinem **normalen
   Konto** einloggen. Das ist ab jetzt dein Normal-Fenster.
3. `Claude-Proxy.bat` doppelklicken → mit deinem **Proxy-/anderen Konto**
   einloggen. Das ist ab jetzt dein Proxy-Fenster.

Ab dann: einfach die passende `.bat` doppelklicken. Für Desktop-Icons die
`.bat` rechtsklicken → „Senden an → Desktop (Verknüpfung erstellen)".

## Dateien für die zwei Fenster

- **`Claude-Normal.bat`** – Fenster mit deinem normalen Konto (Profil
  `%USERPROFILE%\claude-profil-normal`).
- **`Claude-Proxy.bat`** – Fenster mit dem Proxy-/anderen Konto (Profil
  `%USERPROFILE%\claude-profil-proxy`).
- **`Claude-Beide-oeffnen.bat`** – öffnet beide Fenster auf einmal; wechseln
  mit `Alt+Tab`.

## Falls sich das zweite Fenster NICHT öffnet

Manche App-Versionen erlauben trotz getrennter Profile nur eine Instanz. Dann:
zuerst **alle** Claude-Fenster schließen, dann die gewünschte `.bat` starten –
so hast du immer das richtige Konto vorne. Für echten Parallelbetrieb kann man
alternativ die eigenständige (Nicht-Store-)Claude-Desktop-App aus
`Claude Setup.exe` installieren, die `--user-data-dir` zuverlässiger annimmt.

---

## Diagnose-/Hilfsdateien (aus der Fehlersuche)

- `diagnose-proxy.bat` – zeigt an, wo überall Proxy-/CCR-Einstellungen stecken.
- `find-claude-apps.bat` – findet alle Claude-`.exe` und Verknüpfungen.
- `show-normal-schalter.bat` – zeigt den Inhalt des Ordners „Claude Normal Schalter".
- `reset-to-normal-gui.bat` – entfernt den CCR-Proxy aus der **Claude-Code**-
  `settings.json` (betrifft nur Claude Code / CLI, nicht die Desktop-App).
- `start-claude-noproxy.bat`, `remove-proxy-env-permanent.bat`,
  `reset-settings.ps1` – ältere Helfer rund um Claude Code ohne Proxy.
