@echo off
REM =====================================================================
REM  Claude Desktop  -  Fenster "NORMAL" (dein normales Konto)
REM  Startet die Store-App mit einem EIGENEN Profil-Ordner.
REM  Beim ERSTEN Mal: mit deinem NORMALEN Konto einloggen.
REM  Danach zeigt dieses Fenster immer deine normalen Chats.
REM =====================================================================
setlocal
chcp 65001 >nul
title Claude NORMAL

set "PROFILE=%USERPROFILE%\claude-profil-normal"

echo Suche Claude Desktop...
set "CLAUDE_EXE="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$c = Get-ChildItem 'C:\Program Files\WindowsApps' -Directory -ErrorAction SilentlyContinue ^| Where-Object { $_.Name -like 'Claude_*_x64__*' } ^| Sort-Object { try { [version]((($_.Name -split '_')[1])) } catch { [version]'0.0' } } -Descending; foreach($x in $c){ $e = Join-Path $x.FullName 'app\Claude.exe'; if (Test-Path $e) { Write-Output $e; break } }"`) do set "CLAUDE_EXE=%%P"

if not defined CLAUDE_EXE (
    echo FEHLER: Claude Desktop wurde nicht gefunden.
    pause
    exit /b 1
)

echo Starte NORMAL-Fenster...
echo   App    : %CLAUDE_EXE%
echo   Profil : %PROFILE%
start "" "%CLAUDE_EXE%" --user-data-dir="%PROFILE%"

echo.
echo Fertig. Beim ersten Start bitte mit deinem NORMALEN Konto einloggen.
endlocal
