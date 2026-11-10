# Apercu local du site Nathart (aucune installation requise).
# Lance un mini serveur web sur http://localhost:8123/ et ouvre le navigateur.
# Fermer la fenetre pour arreter.
$root = $PSScriptRoot
$port = 8123
$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch { Write-Host "Port $port deja utilise : un apercu est probablement deja ouvert sur http://localhost:$port/"; Start-Process "http://localhost:$port/"; exit }
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.jpg'='image/jpeg'; '.png'='image/png'; '.xml'='application/xml'; '.txt'='text/plain; charset=utf-8'; '.woff2'='font/woff2'; '.json'='application/json' }
Write-Host "Apercu : http://localhost:$port/   (fermer cette fenetre pour arreter)"
Start-Process "http://localhost:$port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
  $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
  if (Test-Path $file -PathType Container) { $file = Join-Path $file 'index.html' }
  $code = 200
  if (-not (Test-Path $file -PathType Leaf) -or -not ((Resolve-Path $file).Path.StartsWith($root))) { $file = Join-Path $root '404.html'; $code = 404 }
  $bytes = [IO.File]::ReadAllBytes($file)
  $ext = [IO.Path]::GetExtension($file).ToLower()
  $ctx.Response.StatusCode = $code
  $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}
