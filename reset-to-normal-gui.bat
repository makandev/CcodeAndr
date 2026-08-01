@echo off
REM =====================================================================
REM  Claude ZURUECK AUF NORMAL (alles in EINER Datei, keine .ps1 noetig)
REM  Entfernt den CCR-/Proxy-Teil (apiKeyHelper + env) aus der
REM  settings.json, damit Claude wieder dein normales Konto / deine alten
REM  Chats nutzt. Vorher wird ein Backup der settings.json angelegt.
REM
REM  WICHTIG: Claude Code VORHER komplett schliessen, sonst schreibt es
REM  beim Beenden die alten Einstellungen wieder zurueck!
REM =====================================================================
setlocal
chcp 65001 >nul
title Zurueck zur normalen Claude-Oberflaeche

echo ============================================
echo   Claude zurueck auf NORMAL (Proxy entfernen)
echo ============================================
echo.

echo [1/2] Stoppe Claude Code Router (ccr)...
call ccr stop >nul 2>&1

echo [2/2] Bereinige settings.json...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Join-Path $env:USERPROFILE '.claude\settings.json'; if (!(Test-Path $p)) { Write-Host 'FEHLER: settings.json nicht gefunden unter' $p; exit 1 }; $b = $p + '.' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.bak'; Copy-Item $p $b -Force; $j = Get-Content $p -Raw | ConvertFrom-Json; $r = @(); if ($j.PSObject.Properties.Name -contains 'apiKeyHelper') { $j.PSObject.Properties.Remove('apiKeyHelper'); $r += 'apiKeyHelper' }; if ($j.PSObject.Properties.Name -contains 'env') { $j.PSObject.Properties.Remove('env'); $r += 'env (ANTHROPIC_BASE_URL usw.)' }; $o = $j | ConvertTo-Json -Depth 40; [System.IO.File]::WriteAllText($p, $o, (New-Object System.Text.UTF8Encoding($false))); Write-Host ('Backup angelegt: ' + $b); if ($r.Count -gt 0) { Write-Host ('Entfernt: ' + ($r -join ', ')) } else { Write-Host 'Kein Proxy-Eintrag gefunden (nichts zu tun).' }; $c = Get-Content $p -Raw | ConvertFrom-Json; if (($c.PSObject.Properties.Name -contains 'env') -or ($c.PSObject.Properties.Name -contains 'apiKeyHelper')) { Write-Host 'ACHTUNG: Proxy-Eintrag ist NOCH vorhanden!' } else { Write-Host 'OK: settings.json enthaelt keinen Proxy-Eintrag mehr.' }"

echo.
echo ------------------------------------------------------------
echo  FERTIG.
echo.
echo  Naechste Schritte:
echo   1) Claude Code komplett schliessen und neu starten.
echo   2) Falls du nicht eingeloggt bist: im Claude  /login  eingeben
echo      und dich mit deinem NORMALEN Konto anmelden.
echo.
echo  Danach solltest du wieder deine gewohnten Chats sehen.
echo ------------------------------------------------------------
endlocal
pause
