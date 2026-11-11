@echo off
rem Glisser-deposer des photos (ou un dossier) sur ce fichier : elles sont optimisees et ajoutees a l'ANNEAU 3D de la galerie.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outils\optimiser-photos.ps1" -Galerie anneau %*
echo.
pause
