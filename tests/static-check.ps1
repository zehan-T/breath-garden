$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$htmlPath = Join-Path $projectRoot 'index.html'
$scriptPath = Join-Path $projectRoot 'app.js'
$stylePath = Join-Path $projectRoot 'styles.css'

$html = Get-Content -Raw -Encoding UTF8 $htmlPath
$script = Get-Content -Raw -Encoding UTF8 $scriptPath
$styles = Get-Content -Raw -Encoding UTF8 $stylePath
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
if ($script -notmatch 'FLOWER_TYPES\s*=\s*\["cloud",\s*"moon",\s*"orchid",\s*"peony"\]') {
  $failures.Add('The four approved flower types are not defined.')
}
if ($script -match 'star-petal' -or $styles -match 'star-petal|plant--star') {
  $failures.Add('The removed Star Petal renderer is still present.')
}
if ($script -notmatch 'spec\?\.type\s*===\s*"star"\s*\?\s*"peony"') {
  $failures.Add('Saved Star Petal records do not migrate to Peony Mist.')
}
if ($script -notmatch 'type\s*===\s*"orchid"' -or $styles -notmatch 'garden-flower__orchid-petal') {
  $failures.Add('Orchid Veil is missing its SVG renderer or styles.')
}
if ($script -notmatch 'type\s*===\s*"peony"' -or $styles -notmatch 'garden-flower__peony-petal') {
  $failures.Add('Peony Mist is missing its SVG renderer or styles.')
}
if ($script -notmatch 'duration\s*>=\s*60\)\s*return\s*3' -or $script -notmatch 'duration\s*>=\s*30\)\s*return\s*2') {
  $failures.Add('The approved 15/30/60 second flower-count mapping is missing.')
}
if ($script -notmatch 'flowers:\s*state\.sessionPlan') {
  $failures.Add('Completed sessions do not appear to save their flower plan.')
}
if ($script -notmatch 'y:\s*365\s*\*\s*\(1\s*-\s*scale\)') {
  $failures.Add('Multi-flower layouts do not share the approved ground baseline.')
}
if ($script -notmatch 'modeCeiling\s*=\s*mode\s*===\s*"hum"\s*\?\s*0\.07\s*:\s*0\.17') {
  $failures.Add('Hum does not have its approved lower-level microphone mapping.')
}
if ($script -notmatch 'activationThreshold\s*=\s*state\.mode\s*===\s*"hum"\s*\?\s*0\.025\s*:\s*0\.04') {
  $failures.Add('Hum and Breathe activation thresholds are not mode-specific.')
}

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
Write-Host '- four flower types and duration mapping present'
Write-Host '- removed Star Petal records migrate to Peony Mist'
Write-Host '- Orchid Veil and Peony Mist renderers present'
Write-Host '- completed sessions save their flower plan'
Write-Host '- multi-flower layouts share one ground baseline'
Write-Host '- Hum uses a more sensitive mapping without changing Breathe thresholds'
