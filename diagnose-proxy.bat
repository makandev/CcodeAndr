@echo off
REM =====================================================================
REM  DIAGNOSE: Zeigt an, WO ueberall Proxy-/CCR-Einstellungen gesetzt sind.
REM  Aendert NICHTS. Bitte Ausgabe abfotografieren / kopieren und schicken.
REM =====================================================================
setlocal enabledelayedexpansion
chcp 65001 >nul
title Diagnose: Proxy / CCR

echo ==============================================================
echo   1) Benutzer-Variablen (HKCU\Environment)
echo ==============================================================
for %%V in (ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY ANTHROPIC_MODEL ANTHROPIC_SMALL_FAST_MODEL API_TIMEOUT_MS) do (
    set "FOUND="
    for /f "tokens=1,2,*" %%A in ('reg query "HKCU\Environment" /v %%V 2^>nul ^| find "%%V"') do set "FOUND=%%C"
    if defined FOUND (echo   [GESETZT] %%V = !FOUND!) else (echo   [ - ]     %%V)
)

echo.
echo ==============================================================
echo   2) System-Variablen (HKLM ... Environment)
echo ==============================================================
for %%V in (ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY ANTHROPIC_MODEL ANTHROPIC_SMALL_FAST_MODEL API_TIMEOUT_MS) do (
    set "FOUND="
    for /f "tokens=1,2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v %%V 2^>nul ^| find "%%V"') do set "FOUND=%%C"
    if defined FOUND (echo   [GESETZT] %%V = !FOUND!) else (echo   [ - ]     %%V)
)

echo.
echo ==============================================================
echo   3) Aktuelle Sitzung (nur dieses Fenster)
echo ==============================================================
if defined ANTHROPIC_BASE_URL   (echo   ANTHROPIC_BASE_URL   = %ANTHROPIC_BASE_URL%)   else (echo   ANTHROPIC_BASE_URL   = ^<leer^>)
if defined ANTHROPIC_AUTH_TOKEN (echo   ANTHROPIC_AUTH_TOKEN = gesetzt) else (echo   ANTHROPIC_AUTH_TOKEN = ^<leer^>)
if defined ANTHROPIC_API_KEY    (echo   ANTHROPIC_API_KEY    = gesetzt) else (echo   ANTHROPIC_API_KEY    = ^<leer^>)

echo.
echo ==============================================================
echo   4) Claude-Konfiguration (settings.json)
echo ==============================================================
set "CFG=%USERPROFILE%\.claude\settings.json"
if exist "%CFG%" (
    echo   Datei: %CFG%
    echo   ---- Inhalt ----
    type "%CFG%"
    echo.
    echo   ----------------
) else (
    echo   Keine settings.json gefunden unter %CFG%
)

echo.
echo ==============================================================
echo   5) Claude Code Router (ccr)
echo ==============================================================
where ccr >nul 2>&1 && (echo   ccr ist installiert:) || (echo   ccr NICHT im PATH gefunden.)
where ccr 2>nul
if exist "%USERPROFILE%\.claude-code-router" (echo   Ordner vorhanden: %USERPROFILE%\.claude-code-router) else (echo   Kein Ordner .claude-code-router)

echo.
echo ==============================================================
echo   Fertig. Bitte diese Ausgabe komplett kopieren/abfotografieren.
echo ==============================================================
endlocal
pause
