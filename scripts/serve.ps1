param(
  [int]$Port = 8000
)

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
}

try {
  $listener.Start()
  Write-Host "Breath Garden: http://127.0.0.1:$Port/"
  Write-Host 'Press Ctrl+C to stop.'

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relativePath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }

    $candidate = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relativePath))
    if (-not $candidate.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $context.Response.Close()
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($candidate)
    $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
    $contentType = $mimeTypes[$extension]
    if (-not $contentType) { $contentType = 'application/octet-stream' }

    $context.Response.StatusCode = 200
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.Headers.Add('Cache-Control', 'no-store')
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.OutputStream.Close()
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
