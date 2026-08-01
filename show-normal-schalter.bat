@echo off
REM Zeigt an, was du im Ordner "Claude Normal Schalter" schon gebaut hast.
REM Aendert nichts. Ausgabe bitte komplett kopieren/schicken.
chcp 65001 >nul
title Inhalt: Claude Normal Schalter

set "DIR=C:\Users\makan\Documents\Claude Normal Schalter"

echo ============================================================
echo   Ordner: %DIR%
echo ============================================================
echo.
echo --- Datei-Liste ---
dir /b "%DIR%"
echo.

for %%E in (bat cmd ps1 txt json vbs reg) do (
  for %%F in ("%DIR%\*.%%E") do (
    echo.
    echo ============================================================
    echo   INHALT: %%~nxF
    echo ============================================================
    type "%%F"
    echo.
  )
)

echo.
echo ============================================================
echo  Fertig. Bitte alles oben kopieren/abfotografieren.
echo ============================================================
pause
