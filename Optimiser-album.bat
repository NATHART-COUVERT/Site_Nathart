@echo off
rem Glisser-deposer des photos (ou un dossier) sur ce fichier : elles sont optimisees (filigrane inclus) pour l'ALBUM (livre a pages tournantes).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outils\optimiser-photos.ps1" -Galerie album %*
echo.
pause
