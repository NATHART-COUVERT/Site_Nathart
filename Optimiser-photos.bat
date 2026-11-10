@echo off
rem Glisser-deposer des photos (ou un dossier) sur ce fichier pour les optimiser et les ajouter a la galerie.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outils\optimiser-photos.ps1" %*
echo.
pause
