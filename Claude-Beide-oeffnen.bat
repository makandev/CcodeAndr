@echo off
REM =====================================================================
REM  Oeffnet BEIDE Claude-Fenster gleichzeitig (Normal + Proxy).
REM  Danach mit Alt+Tab zwischen ihnen wechseln.
REM =====================================================================
setlocal
chcp 65001 >nul
title Claude - beide Fenster

echo Suche Claude Desktop...
set "CLAUDE_EXE="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$c = Get-ChildItem 'C:\Program Files\WindowsApps' -Directory -ErrorAction SilentlyContinue ^| Where-Object { $_.Name -like 'Claude_*_x64__*' } ^| Sort-Object { try { [version]((($_.Name -split '_')[1])) } catch { [version]'0.0' } } -Descending; foreach($x in $c){ $e = Join-Path $x.FullName 'app\Claude.exe'; if (Test-Path $e) { Write-Output $e; break } }"`) do set "CLAUDE_EXE=%%P"

if not defined CLAUDE_EXE (
    echo FEHLER: Claude Desktop wurde nicht gefunden.
    pause
    exit /b 1
)

echo Starte NORMAL-Fenster...
start "" "%CLAUDE_EXE%" --user-data-dir="%USERPROFILE%\claude-profil-normal"

echo Warte kurz...
timeout /t 3 /nobreak >nul

echo Starte PROXY-Fenster...
start "" "%CLAUDE_EXE%" --user-data-dir="%USERPROFILE%\claude-profil-proxy"

echo.
echo Beide Fenster gestartet. Mit Alt+Tab wechseln.
endlocal
