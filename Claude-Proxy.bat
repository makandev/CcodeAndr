@echo off
REM =====================================================================
REM  Claude Desktop  -  Fenster "PROXY" (das andere Konto)
REM  Startet die Store-App mit einem EIGENEN Profil-Ordner.
REM  Beim ERSTEN Mal: mit deinem Proxy-/anderen Konto einloggen.
REM  Darf gleichzeitig mit dem NORMAL-Fenster offen sein.
REM =====================================================================
setlocal
chcp 65001 >nul
title Claude PROXY

set "PROFILE=%USERPROFILE%\claude-profil-proxy"

echo Suche Claude Desktop...
set "CLAUDE_EXE="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$c = Get-ChildItem 'C:\Program Files\WindowsApps' -Directory -ErrorAction SilentlyContinue ^| Where-Object { $_.Name -like 'Claude_*_x64__*' } ^| Sort-Object { try { [version]((($_.Name -split '_')[1])) } catch { [version]'0.0' } } -Descending; foreach($x in $c){ $e = Join-Path $x.FullName 'app\Claude.exe'; if (Test-Path $e) { Write-Output $e; break } }"`) do set "CLAUDE_EXE=%%P"

if not defined CLAUDE_EXE (
    echo FEHLER: Claude Desktop wurde nicht gefunden.
    pause
    exit /b 1
)

echo Starte PROXY-Fenster...
echo   App    : %CLAUDE_EXE%
echo   Profil : %PROFILE%
start "" "%CLAUDE_EXE%" --user-data-dir="%PROFILE%"

echo.
echo Fertig. Beim ersten Start bitte mit deinem Proxy-/anderen Konto einloggen.
endlocal
