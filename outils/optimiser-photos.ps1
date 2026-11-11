# Optimise des photos de toiles pour le web et met a jour la galerie.
#
# Usage : glisser-deposer des photos (ou un dossier) sur "Optimiser-photos.bat".
# Pour chaque photo :
#   - redimensionnement (1800 px maximum sur le grand cote), JPEG qualite 82
#   - nom de fichier propre (sans accents ni espaces)
#   - filigrane "(c) Nathart" en diagonale au centre (desactivable avec -SansFiligrane)
#   - copie dans media/photos/toiles/
#   - titre ajoute a media/photos/toiles/titres.json (modifiable ensuite a la main)
#   - fiche vide ajoutee a media/photos/toiles/details.json (dimensions, matiere, peinture, prix)
# La liste photos.json est regeneree. Il ne reste qu'a envoyer le dossier sur GitHub.
#
# Astuce : "Rose (ouverte).jpg" et "Rose (fermee).jpg" -> meme titre "Rose", vues "ouverte" et "fermee".
# Les photos de meme titre sont toujours affichees l'une apres l'autre dans le carrousel.
#
# Fichier volontairement en ASCII : PowerShell 5.1 lit mal l'UTF-8 sans BOM.

[CmdletBinding(PositionalBinding = $false)]
param(
  [ValidateSet('toiles', 'cube', 'anneau', 'album', 'lectures', 'expositions')][string]$Galerie = 'toiles',
  [switch]$SansFiligrane,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Chemins
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# toiles : carrousel (1800 px, avec fiches d'oeuvre) ; cube et anneau : volumes 3D (1000 px suffisent)
$MaxPx   = $(switch ($Galerie) { 'toiles' { 1800 } 'album' { 1600 } 'lectures' { 1200 } 'expositions' { 1600 } default { 1000 } })
$Qualite = 82
$repo    = Split-Path -Parent $PSScriptRoot
$dest    = Join-Path $repo ('media\photos\' + $Galerie)
$avecFiches = ($Galerie -eq 'toiles')
$utf8    = New-Object Text.UTF8Encoding($false)
$exts    = '.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.gif'
$champs  = 'dimensions', 'matiere', 'peinture', 'prix'

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
# "Rose sur bois (ouverte)" -> titre "Rose sur bois", vue "ouverte"
function Split-Titre([string]$t) {
  $m = [regex]::Match($t, '^(.*?)\s*\(([^)]+)\)\s*$')
  if ($m.Success) { return @($m.Groups[1].Value.Trim(), $m.Groups[2].Value.Trim()) }
  return @($t, '')
}
# Filigrane "(c) Nathart" : en diagonale, au centre, blanc a ~40 % d'opacite avec un fin contour sombre
# (lisible sur fond clair comme sur fond sombre). Reglages : $FiligraneOpacite (0-255), $FiligraneLargeur (part de la diagonale).
$Filigrane = -not $SansFiligrane
$FiligraneOpacite = 105
$FiligraneLargeur = 0.5
function Add-Filigrane($g, [int]$w, [int]$h) {
  $texte = ([string][char]0xA9) + ' Nathart'
  $famille = 'Segoe Script'
  if (-not ([Drawing.FontFamily]::Families | Where-Object { $_.Name -eq $famille })) { $famille = 'Georgia' }
  $style = $(if ($famille -eq 'Georgia') { 2 } else { 0 })
  $ff = New-Object Drawing.FontFamily($famille)
  $diag = [Math]::Sqrt($w * $w + $h * $h)
  $angle = [Math]::Atan2($h, $w) * 180 / [Math]::PI
  $angle = [Math]::Max(15, [Math]::Min(35, $angle))
  $cible = [Math]::Min($FiligraneLargeur * $diag, 0.8 * $w)
  $fmt = New-Object Drawing.StringFormat
  $fmt.Alignment = [Drawing.StringAlignment]::Center; $fmt.LineAlignment = [Drawing.StringAlignment]::Center
  $zone = New-Object Drawing.RectangleF(-5000, -500, 10000, 1000)
  $mesure = New-Object Drawing.Drawing2D.GraphicsPath
  $mesure.AddString($texte, $ff, $style, 100, $zone, $fmt)
  $taille = 100 * $cible / $mesure.GetBounds().Width
  $chemin = New-Object Drawing.Drawing2D.GraphicsPath
  $chemin.AddString($texte, $ff, $style, $taille, $zone, $fmt)
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TranslateTransform($w / 2, $h / 2); $g.RotateTransform(-$angle)
  $stylo = New-Object Drawing.Pen([Drawing.Color]::FromArgb([int]($FiligraneOpacite * 0.7), 0, 0, 0), [Math]::Max(1.0, $taille / 45))
  $pinceau = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb($FiligraneOpacite, 255, 255, 255))
  $g.DrawPath($stylo, $chemin); $g.FillPath($pinceau, $chemin)
  $g.ResetTransform()
  $stylo.Dispose(); $pinceau.Dispose(); $chemin.Dispose(); $mesure.Dispose(); $ff.Dispose()
}
function Esc([string]$s) { $s.Replace('\', '\\').Replace('"', '\"') }
function Read-Json([string]$path) { if (Test-Path $path) { [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8) | ConvertFrom-Json } else { $null } }

# --- titres existants (on ne garde que ceux dont le fichier existe encore)
$titresPath = Join-Path $dest 'titres.json'
$titres = [ordered]@{}
$j = Read-Json $titresPath
if ($j) { foreach ($p in $j.PSObject.Properties) { if (($p.Value -is [string]) -and (Test-Path (Join-Path $dest $p.Name))) { $titres[$p.Name] = $p.Value } } }

# --- liste des fichiers a traiter
$fichiers = @()
$dossierSource = $false
foreach ($c in $Chemins) {
  if (Test-Path -LiteralPath $c -PathType Container) { $dossierSource = $true; $fichiers += Get-ChildItem -LiteralPath $c -File -Recurse }
  elseif (Test-Path -LiteralPath $c -PathType Leaf) { $fichiers += Get-Item -LiteralPath $c }
}
$fichiers = $fichiers | Where-Object { $exts -contains $_.Extension.ToLower() }
if (-not $fichiers) { Write-Host 'Aucune photo (.jpg, .png...) trouvee.'; exit 1 }

$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]$Qualite)

$traites = @()
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
    $g.DrawImage($img, 0, 0, $w, $h)
    if ($Filigrane) { Add-Filigrane $g $w $h }
    $g.Dispose()
    $nom = (Get-Slug ([IO.Path]::GetFileNameWithoutExtension($f.Name))) + '.jpg'
    $bmp.Save((Join-Path $dest $nom), $codec, $ep); $bmp.Dispose()
    $traites += $nom
    if (-not $titres.Contains($nom)) { $titres[$nom] = Get-Titre ([IO.Path]::GetFileNameWithoutExtension($f.Name)) }
    $ko = [int]((Get-Item (Join-Path $dest $nom)).Length / 1KB)
    $alerte = ''; if ([Math]::Max($img.Width, $img.Height) -lt 900) { $alerte = '  <-- image petite : prevoir un fichier plus grand' }
    Write-Host ("{0,-45} -> {1}  ({2}x{3}, {4} Ko, source {5} Ko){6}" -f $f.Name, $nom, $w, $h, $ko, [int]($f.Length / 1KB), $alerte)
  } finally { $img.Dispose() }
}

# --- titres.json
$lignes = foreach ($k in $titres.Keys) { '  "' + (Esc $k) + '": "' + (Esc $titres[$k]) + '"' }
[IO.File]::WriteAllText($titresPath, "{`n" + ($lignes -join ",`n") + "`n}`n", $utf8)

# --- details.json : une fiche par oeuvre (cle = titre sans la vue). Valeurs existantes conservees.
$detailsPath = Join-Path $dest 'details.json'
$details = [ordered]@{}
$dj = $null; if ($avecFiches) { $dj = Read-Json $detailsPath }
if ($dj) { foreach ($p in $dj.PSObject.Properties) { $fiche = [ordered]@{}; foreach ($c in $champs) { $v = $p.Value.$c; if ($null -eq $v) { $v = '' }; $fiche[$c] = [string]$v }; $details[$p.Name] = $fiche } }
$titresOeuvres = @($titres.Values | ForEach-Object { (Split-Titre $_)[0] } | Select-Object -Unique)
if ($avecFiches) { foreach ($t in $titresOeuvres) { if (-not $details.Contains($t)) { $fiche = [ordered]@{}; foreach ($c in $champs) { $fiche[$c] = '' }; $details[$t] = $fiche } } }
if ($avecFiches) {
  $blocs = foreach ($k in $details.Keys) {
    $l = foreach ($c in $champs) { '    "' + $c + '": "' + (Esc $details[$k][$c]) + '"' }
    '  "' + (Esc $k) + '": {' + "`n" + ($l -join ",`n") + "`n  }"
  }
  [IO.File]::WriteAllText($detailsPath, "{`n" + ($blocs -join ",`n") + "`n}`n", $utf8)
}

# --- photos.json (meme format que scripts/generate-gallery.mjs, execute par Vercel)
$items = foreach ($p in (Get-ChildItem $dest -File | Where-Object { @('.jpg', '.jpeg', '.png', '.webp') -contains $_.Extension.ToLower() } | Sort-Object Name)) {
  $t = $titres[$p.Name]; if (-not $t) { $t = Get-Titre ([IO.Path]::GetFileNameWithoutExtension($p.Name)) }
  $parts = Split-Titre $t
  # numero de version = empreinte du fichier : l'adresse change quand l'image change (pas d'ancienne version en cache)
  $version = (Get-FileHash -Algorithm MD5 -LiteralPath $p.FullName).Hash.ToLower().Substring(0, 10)
  $champsJson = @(('"src": "/media/photos/' + $Galerie + '/' + $p.Name + '?v=' + $version + '"'), ('"titre": "' + (Esc $parts[0]) + '"'))
  if ($parts[1]) { $champsJson += '"vue": "' + (Esc $parts[1]) + '"' }
  if ($details.Contains($parts[0])) { foreach ($c in $champs) { $v = $details[$parts[0]][$c]; if ($v) { $champsJson += '"' + $c + '": "' + (Esc $v) + '"' } } }
  '    { ' + ($champsJson -join ', ') + ' }'
}
[IO.File]::WriteAllText((Join-Path $dest 'photos.json'), "{`n  `"generated`": `"local`",`n  `"photos`": [`n" + ($items -join ",`n") + "`n  ]`n}`n", $utf8)

Write-Host ''
Write-Host ("Termine : {0} photo(s) traitee(s). Galerie mise a jour ({1} photos au total)." -f @($fichiers).Count, @($items).Count)
if ($dossierSource) {
  $obsoletes = Get-ChildItem $dest -File -Filter *.jpg | Where-Object { $traites -notcontains $_.Name } | ForEach-Object { $_.Name }
  if ($obsoletes) {
    Write-Host ''
    Write-Host 'Photos presentes sur le site mais absentes du dossier source (a supprimer a la main si la toile est retiree) :'
    $obsoletes | ForEach-Object { Write-Host ('  - ' + $_) }
  }
}
Write-Host 'Etape suivante : envoyer le dossier sur GitHub (GitHub Desktop : Commit puis Push).'

