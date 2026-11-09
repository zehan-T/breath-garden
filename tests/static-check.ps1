$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$htmlPath = Join-Path $projectRoot 'index.html'
$scriptPath = Join-Path $projectRoot 'app.js'

$html = Get-Content -Raw -Encoding UTF8 $htmlPath
$script = Get-Content -Raw -Encoding UTF8 $scriptPath
$failures = New-Object System.Collections.Generic.List[string]

$ids = [regex]::Matches($html, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$duplicates = $ids | Group-Object | Where-Object Count -gt 1 | Select-Object -ExpandProperty Name
foreach ($duplicate in $duplicates) { $failures.Add("Duplicate HTML id: $duplicate") }

$selectorIds = [regex]::Matches($script, 'querySelector\("#([^"\)]+)"\)') | ForEach-Object { $_.Groups[1].Value }
foreach ($selectorId in $selectorIds) {
  if ($selectorId -notin $ids) { $failures.Add("Missing HTML target for JavaScript selector: #$selectorId") }
}

$localRefs = [regex]::Matches($html, '(?:src|href)="([^"]+)"') |
  ForEach-Object { $_.Groups[1].Value } |
  Where-Object { $_ -notmatch '^(https?:|#)' }

foreach ($reference in $localRefs) {
  $target = Join-Path $projectRoot $reference
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    $failures.Add("Missing local resource: $reference")
  }
}

if ($html -match '<script[^>]+https?://') { $failures.Add('External script reference found.') }
if ($script -match 'MediaRecorder|audioBlob|arrayBuffer') { $failures.Add('Possible raw audio recording or storage code found.') }

if ($failures.Count -gt 0) {
  Write-Host 'Static checks failed:' -ForegroundColor Red
  $failures | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host 'Static checks passed.' -ForegroundColor Green
Write-Host "- $($ids.Count) unique HTML ids"
Write-Host "- $($selectorIds.Count) JavaScript id selectors resolved"
Write-Host "- $($localRefs.Count) local resources resolved"
Write-Host '- no external scripts'
Write-Host '- no raw audio recording/storage markers'
