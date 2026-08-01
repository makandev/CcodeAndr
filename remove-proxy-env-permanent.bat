@echo off
REM =====================================================================
REM  Proxy-/CCR-Umgebungsvariablen DAUERHAFT aus Windows entfernen
REM ---------------------------------------------------------------------
REM  Nutze diese Datei, wenn du willst, dass AUCH ein normal gestartetes
REM  "claude" (ohne die andere .bat) nie mehr ueber den Proxy laeuft.
REM
REM  Das loescht die dauerhaften Benutzer-Variablen, die CCR gesetzt hat.
REM  Danach muss CCR bei Bedarf einmal neu konfiguriert werden, falls du
REM  ihn spaeter wieder verwenden willst.
REM
REM  WICHTIG: Nach dem Ausfuehren einmal ab- und wieder anmelden ODER den
REM  PC neu starten, damit Windows die Aenderung ueberall uebernimmt.
REM =====================================================================

setlocal
chcp 65001 >nul
title Proxy-Variablen dauerhaft entfernen

echo ============================================
echo   CCR/Proxy-Variablen DAUERHAFT entfernen
echo ============================================
echo.
echo Aktuell gesetzte Benutzer-Variablen (vorher):
echo.
for %%V in (ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY ANTHROPIC_MODEL ANTHROPIC_SMALL_FAST_MODEL API_TIMEOUT_MS) do (
    reg query "HKCU\Environment" /v %%V >nul 2>&1 && echo   %%V ist gesetzt
)
echo.

choice /C JN /M "Wirklich dauerhaft entfernen"
if errorlevel 2 goto :abbruch

echo.
echo Entferne Variablen...
for %%V in (ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY ANTHROPIC_MODEL ANTHROPIC_SMALL_FAST_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL ANTHROPIC_DEFAULT_SONNET_MODEL ANTHROPIC_DEFAULT_OPUS_MODEL API_TIMEOUT_MS) do (
    reg delete "HKCU\Environment" /v %%V /f >nul 2>&1
)

echo.
echo Fertig. Bitte jetzt EINMAL abmelden/anmelden oder den PC neu starten.
echo Danach startet auch ein normales "claude" ohne Proxy.
goto :ende

:abbruch
echo.
echo Abgebrochen - nichts wurde geaendert.

:ende
echo.
endlocal
pause
