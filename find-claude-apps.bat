@echo off
REM =====================================================================
REM  FINDER: Spuert alle Claude-Apps (.exe) und Verknuepfungen (.lnk) auf.
REM  Aendert NICHTS. Zeigt nur Pfade an, damit wir die beiden Instanzen
REM  (original + geklont/Proxy) finden. Ausgabe bitte kopieren/schicken.
REM  Hinweis: Kann 10-30 Sekunden dauern.
REM =====================================================================
setlocal
chcp 65001 >nul
title Finder: Claude-Apps und Verknuepfungen

echo Suche laeuft... (bitte kurz warten)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '=== 1) Laufende Claude-Prozesse ==='; Get-Process | Where-Object { $_.Name -like '*claude*' } | ForEach-Object { $pp=''; try { $pp=$_.Path } catch {}; Write-Host ('  PID ' + $_.Id + '  ' + $_.Name + '   ' + $pp) }; Write-Host ''; Write-Host '=== 2) Gefundene claude*.exe Dateien ==='; $roots=@($env:LOCALAPPDATA, $env:APPDATA, ($env:USERPROFILE + '\Desktop'), ($env:USERPROFILE + '\Documents'), ($env:USERPROFILE + '\Downloads'), $env:ProgramFiles, ${env:ProgramFiles(x86)}); foreach ($r in $roots) { if ($r -and (Test-Path $r)) { Get-ChildItem -Path $r -Recurse -Depth 4 -Filter 'claude*.exe' -Force -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ('  ' + $_.FullName) } } }; Write-Host ''; Write-Host '=== 3) Verknuepfungen (.lnk), die auf Claude zeigen ==='; $sh=New-Object -ComObject WScript.Shell; $lr=@(($env:USERPROFILE + '\Desktop'), ($env:APPDATA + '\Microsoft\Windows\Start Menu'), ($env:ProgramData + '\Microsoft\Windows\Start Menu'), ($env:APPDATA + '\Microsoft\Internet Explorer\Quick Launch')); foreach ($d in $lr) { if (Test-Path $d) { Get-ChildItem -Path $d -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object { $t=$sh.CreateShortcut($_.FullName); if (($t.TargetPath -like '*claude*') -or ($_.Name -like '*claude*')) { Write-Host ('  LNK    : ' + $_.FullName); Write-Host ('    Ziel   : ' + $t.TargetPath); Write-Host ('    Args   : ' + $t.Arguments); Write-Host ('    StartIn: ' + $t.WorkingDirectory) } } } }; Write-Host ''; Write-Host '=== 4) Claude-App Konfig-Ordner ==='; foreach ($c in @(($env:APPDATA + '\Claude'), ($env:LOCALAPPDATA + '\AnthropicClaude'), ($env:LOCALAPPDATA + '\Programs\claude'), ($env:LOCALAPPDATA + '\Programs\Claude'))) { if (Test-Path $c) { Write-Host ('  vorhanden: ' + $c) } }"

echo.
echo ==============================================================
echo  Fertig. Bitte die komplette Ausgabe kopieren/abfotografieren.
echo ==============================================================
pause
endlocal
