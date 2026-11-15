# Run once on the production PC, in PowerShell, from this folder (reelmotion\deploy):
#   powershell -ExecutionPolicy Bypass -File .\smtp-from-outreach.ps1
#
# Copies the mail account that outreach uses for its own service mail - the Gmail connected to the
# outreach admin account - into this folder's .env as SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS,
# so ReelMotion's outage alerts are sent from the same account. The values go straight from the
# outreach app container into the file; the app password is never printed.
# ASCII only: Windows PowerShell 5 reads BOM-less files as ANSI.
param(
  [string]$OutreachDeploy = $(if ($env:OUTREACH_DIR) { Join-Path $env:OUTREACH_DIR 'deploy' } else { Join-Path $env:USERPROFILE 'outreach\deploy' }),
  [string]$EnvFile = (Join-Path $PSScriptRoot '.env')
)
$ErrorActionPreference = 'Stop'

$compose = Join-Path $OutreachDeploy 'docker-compose.prod.yml'
if (-not (Test-Path $compose)) { throw "outreach is not at $OutreachDeploy (pass -OutreachDeploy <its deploy folder>)" }
$helper = Join-Path $PSScriptRoot 'smtp_from_outreach.py'
if (-not (Test-Path $helper)) { throw "smtp_from_outreach.py is missing next to this script" }
$inside = '/tmp/reelmotion_smtp_from_outreach.py'

docker compose -f $compose cp $helper ("app:" + $inside)
if ($LASTEXITCODE -ne 0) { throw 'could not copy the helper into the outreach app container (is outreach running?)' }
try {
  $answer = docker compose -f $compose exec -T app python $inside
  if ($LASTEXITCODE -ne 0) { throw 'outreach has no sending mail account, or it could not be read (see the message above). Nothing was written.' }
} finally {
  docker compose -f $compose exec -T app rm -f $inside | Out-Null
}

$names = '^(SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS)='
$got = @($answer | Where-Object { $_ -match $names })
if ($got.Count -ne 4) { throw 'unexpected answer from outreach. Nothing was written.' }

# Keep every other line of .env, replace the four SMTP lines. UTF-8 without BOM (what docker compose reads).
$utf8 = New-Object System.Text.UTF8Encoding($false)
$kept = @()
if (Test-Path $EnvFile) { $kept = @([System.IO.File]::ReadAllLines($EnvFile, $utf8) | Where-Object { $_ -notmatch $names }) }
[System.IO.File]::WriteAllLines($EnvFile, [string[]]($kept + $got), $utf8)

Write-Host "Wrote SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to $EnvFile (values are not shown)."
Write-Host 'Next:  docker compose up -d'
Write-Host '       docker compose exec app node main.js admin test-alert'
