# Optimise des photos de toiles pour le web et met a jour la galerie.
#
# Usage : glisser-deposer des photos (ou un dossier) sur "Optimiser-photos.bat".
# Pour chaque photo :
#   - redimensionnement (1800 px maximum sur le grand cote), JPEG qualite 82
#   - nom de fichier propre (sans accents ni espaces)
#   - copie dans media/photos/toiles/
#   - titre ajoute a media/photos/toiles/titres.json (modifiable ensuite a la main)
# La liste photos.json est regeneree. Il ne reste qu'a envoyer le dossier sur GitHub.
#
# Fichier volontairement en ASCII : PowerShell 5.1 lit mal l'UTF-8 sans BOM.

param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Chemins)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$MaxPx   = 1800
$Qualite = 82
$repo    = Split-Path -Parent $PSScriptRoot
$dest    = Join-Path $repo 'media\photos\toiles'
$utf8    = New-Object Text.UTF8Encoding($false)
$exts    = '.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.gif'

if (-not $Chemins -or $Chemins.Count -eq 0) {
  Write-Host 'Glisser-deposer des photos ou un dossier sur Optimiser-photos.bat'
  exit 1
}
New-Item -ItemType Directory -Force $dest | Out-Null

function Get-Slug([string]$nom) {
  $d = $nom.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach ($c in $d.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne 'NonSpacingMark') { [void]$sb.Append($c) }
  }
  $s = [regex]::Replace($sb.ToString().ToLowerInvariant(), '[^a-z0-9]+', '-').Trim('-')
  if ($s -eq '') { $s = 'photo' }
  $s
}
function Get-Titre([string]$base) {
  $t = [regex]::Replace($base, '^\d+\s*[-_.]\s*', '')
  $t = [regex]::Replace($t, '[-_]+', ' ').Trim()
  if ($t.Length -gt 0) { $t = $t.Substring(0, 1).ToUpper() + $t.Substring(1) }
  $t
}
function Esc([string]$s) { $s.Replace('\', '\\').Replace('"', '\"') }

# --- titres existants
$titresPath = Join-Path $dest 'titres.json'
$titres = [ordered]@{}
if (Test-Path $titresPath) {
  $j = [IO.File]::ReadAllText($titresPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
  foreach ($p in $j.PSObject.Properties) { if ($p.Value -is [string]) { $titres[$p.Name] = $p.Value } }
}

# --- liste des fichiers a traiter
$fichiers = @()
foreach ($c in $Chemins) {
  if (Test-Path -LiteralPath $c -PathType Container) { $fichiers += Get-ChildItem -LiteralPath $c -File -Recurse }
  elseif (Test-Path -LiteralPath $c -PathType Leaf) { $fichiers += Get-Item -LiteralPath $c }
}
$fichiers = $fichiers | Where-Object { $exts -contains $_.Extension.ToLower() }
if (-not $fichiers) { Write-Host 'Aucune photo (.jpg, .png...) trouvee.'; exit 1 }

$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]$Qualite)

foreach ($f in $fichiers) {
  $img = [Drawing.Image]::FromFile($f.FullName)
  try {
    # orientation EXIF (photos prises au telephone)
    try {
      $o = [BitConverter]::ToUInt16($img.GetPropertyItem(274).Value, 0)
      switch ($o) { 3 { $img.RotateFlip('Rotate180FlipNone') } 6 { $img.RotateFlip('Rotate90FlipNone') } 8 { $img.RotateFlip('Rotate270FlipNone') } }
    } catch { }
    $echelle = [Math]::Min(1.0, $MaxPx / [Math]::Max($img.Width, $img.Height))
    $w = [int][Math]::Round($img.Width * $echelle); $h = [int][Math]::Round($img.Height * $echelle)
    $bmp = New-Object Drawing.Bitmap($w, $h, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [Drawing.Graphics]::FromImage($bmp)
    $g.Clear([Drawing.Color]::Black)
    $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
    $g.DrawImage($img, 0, 0, $w, $h); $g.Dispose()
    $nom = (Get-Slug ([IO.Path]::GetFileNameWithoutExtension($f.Name))) + '.jpg'
    $bmp.Save((Join-Path $dest $nom), $codec, $ep); $bmp.Dispose()
    if (-not $titres.Contains($nom)) { $titres[$nom] = Get-Titre ([IO.Path]::GetFileNameWithoutExtension($f.Name)) }
    $ko = [int]((Get-Item (Join-Path $dest $nom)).Length / 1KB)
    Write-Host ("{0,-45} -> {1}  ({2}x{3}, {4} Ko, source {5} Ko)" -f $f.Name, $nom, $w, $h, $ko, [int]($f.Length / 1KB))
  } finally { $img.Dispose() }
}

# --- titres.json
$lignes = foreach ($k in $titres.Keys) { '  "' + (Esc $k) + '": "' + (Esc $titres[$k]) + '"' }
[IO.File]::WriteAllText($titresPath, "{`n" + ($lignes -join ",`n") + "`n}`n", $utf8)

# --- photos.json (meme format que scripts/generate-gallery.mjs, execute par Vercel)
$items = foreach ($p in (Get-ChildItem $dest -File | Where-Object { @('.jpg', '.jpeg', '.png', '.webp') -contains $_.Extension.ToLower() } | Sort-Object Name)) {
  $t = $titres[$p.Name]; if (-not $t) { $t = Get-Titre ([IO.Path]::GetFileNameWithoutExtension($p.Name)) }
  '    { "src": "/media/photos/toiles/' + $p.Name + '", "titre": "' + (Esc $t) + '" }'
}
[IO.File]::WriteAllText((Join-Path $dest 'photos.json'), "{`n  `"generated`": `"local`",`n  `"photos`": [`n" + ($items -join ",`n") + "`n  ]`n}`n", $utf8)
Write-Host ''
Write-Host ("Termine : {0} photo(s) traitee(s). Galerie mise a jour ({1} photos au total)." -f @($fichiers).Count, @($items).Count)
Write-Host 'Etape suivante : envoyer le dossier sur GitHub (GitHub Desktop : Commit puis Push).'
