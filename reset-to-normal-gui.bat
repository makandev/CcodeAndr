@echo off
REM =====================================================================
REM  Claude ZURUECK AUF NORMAL: entfernt den CCR-/Proxy-Teil aus der
REM  settings.json, damit Claude wieder dein normales Konto (deine alten
REM  Chats) nutzt. Ein Backup der settings.json wird vorher angelegt.
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
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0reset-settings.ps1"

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
