@echo off
REM =====================================================================
REM  Claude Code OHNE Proxy / ohne CCR (Claude Code Router) starten
REM ---------------------------------------------------------------------
REM  Diese Datei startet das "normale" Claude Code (deine echten Chats,
REM  dein claude.ai-Login) und umgeht dabei den CCR-Proxy.
REM
REM  Doppelklick genuegt. Alle Aenderungen gelten NUR fuer dieses Fenster
REM  und veraendern deine dauerhaften Windows-Einstellungen NICHT.
REM =====================================================================

setlocal
chcp 65001 >nul
title Claude Code (ohne Proxy)

echo ============================================
echo   Claude Code OHNE Proxy starten
echo ============================================
echo.

REM --- 1) Falls der Router laeuft: stoppen (Fehler ignorieren) ---
echo [1/3] Stoppe Claude Code Router (ccr)...
call ccr stop >nul 2>&1

REM --- 2) Proxy-/Router-Variablen NUR fuer dieses Fenster leeren ---
echo [2/3] Entferne Proxy-Umgebungsvariablen fuer diese Sitzung...
set "ANTHROPIC_BASE_URL="
set "ANTHROPIC_AUTH_TOKEN="
set "ANTHROPIC_API_KEY="
set "ANTHROPIC_MODEL="
set "ANTHROPIC_SMALL_FAST_MODEL="
set "ANTHROPIC_DEFAULT_HAIKU_MODEL="
set "ANTHROPIC_DEFAULT_SONNET_MODEL="
set "ANTHROPIC_DEFAULT_OPUS_MODEL="
set "API_TIMEOUT_MS="
set "HTTP_PROXY="
set "HTTPS_PROXY="
set "http_proxy="
set "https_proxy="

REM --- 3) Normales Claude Code starten ---
echo [3/3] Starte normales Claude Code...
echo.
call claude %*

echo.
echo (Claude wurde beendet. Fenster kann geschlossen werden.)
endlocal
pause
