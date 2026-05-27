#Requires -Version 5.1
<#
.SYNOPSIS
  Reads a local .env file and sets Azure Key Vault secrets via Azure CLI.
  Matches names expected by scripts/setup/fetch-secrets-from-keyvault.ts

.DESCRIPTION
  Does NOT print secret values. Uses a temp file per secret for az keyvault secret set --file
  so special characters and quotes are handled safely.
  Jira / Atlassian vars are intentionally omitted — keep those in local .env only.

.PARAMETER VaultName
  Key Vault name only (e.g. kv-np-acc-uks-bsg-aut), not the full URI.

.PARAMETER EnvPath
  Path to .env.qa (or any env file with KEY=value lines).

.PARAMETER WhatIf
  If set, only lists which env vars would be uploaded (no az calls).

.PARAMETER ExpiresInDays
  If set, expiration is UTC now plus this many days (overrides the default fixed end date below).
  Use when Azure Policy requires a shorter max validity than 2026-12-31.

.PARAMETER ExpiresOnUtc
  If set, use this absolute UTC expiration (overrides default and ExpiresInDays).

.EXAMPLE
  az login
  .\scripts\setup\upload-env-to-keyvault.ps1 -VaultName "kv-np-acc-uks-bsg-aut" -EnvPath "src\config\env\.env.qa"

.EXAMPLE
  # Shorter validity if policy rejects 2026-12-31
  .\scripts\setup\upload-env-to-keyvault.ps1 -VaultName "kv-np-acc-uks-bsg-aut" -ExpiresInDays 90
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $VaultName,

  [Parameter(Mandatory = $false)]
  [string] $EnvPath = "src\config\env\.env.qa",

  [Parameter(Mandatory = $false)]
  [int] $ExpiresInDays,

  [Parameter(Mandatory = $false)]
  [datetime] $ExpiresOnUtc,

  [switch] $WhatIf
)

$ErrorActionPreference = "Stop"

# Env var name (as in .env) -> Key Vault secret name (hyphens)
$Map = [ordered]@{
  "D365_CLIENT_ID"          = "D365-CLIENT-ID"
  "D365_CLIENT_SECRET"      = "D365-CLIENT-SECRET"
  "D365_TENANT_ID"          = "D365-TENANT-ID"
  "D365_SCOPE"              = "D365-SCOPE"
  "SQLSERVER_CLIENT_ID"     = "SQLSERVER-CLIENT-ID"
  "SQLSERVER_CLIENT_SECRET" = "SQLSERVER-CLIENT-SECRET"
  "SQLSERVER_TENANT_ID"     = "SQLSERVER-TENANT-ID"
  "SQLSERVER_HOST"          = "SQLSERVER-HOST"
  "MULESOFT_CLIENT_ID"      = "MULESOFT-CLIENT-ID"
  "MULESOFT_CLIENT_SECRET"  = "MULESOFT-CLIENT-SECRET"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$fullEnv = if ([System.IO.Path]::IsPathRooted($EnvPath)) { $EnvPath } else { Join-Path $root $EnvPath }

if (-not (Test-Path -LiteralPath $fullEnv)) {
  Write-Error "Env file not found: $fullEnv"
}

$lines = Get-Content -LiteralPath $fullEnv -Encoding UTF8
$vars = @{}
foreach ($line in $lines) {
  $t = $line.Trim()
  if ($t -eq "" -or $t.StartsWith("#")) { continue }
  $idx = $t.IndexOf("=")
  if ($idx -lt 1) { continue }
  $k = $t.Substring(0, $idx).Trim()
  $v = $t.Substring($idx + 1).Trim()
  if ($v.Length -ge 2 -and $v.StartsWith('"') -and $v.EndsWith('"')) {
    $v = $v.Substring(1, $v.Length - 2)
  }
  $vars[$k] = $v
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  Write-Error "Azure CLI (az) not found. Install from https://aka.ms/installazurecliwindows"
}

# Default: end of day 2026-12-31 UTC (12/31/2026). Override with -ExpiresOnUtc or -ExpiresInDays.
$defaultExpiresUtc = [datetime]::Parse("2026-12-31T23:59:59Z", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal)

if ($PSBoundParameters.ContainsKey("ExpiresOnUtc")) {
  $exp = switch ($ExpiresOnUtc.Kind) {
    ([System.DateTimeKind]::Utc) { $ExpiresOnUtc }
    ([System.DateTimeKind]::Local) { $ExpiresOnUtc.ToUniversalTime() }
    Default { [datetime]::SpecifyKind($ExpiresOnUtc, [System.DateTimeKind]::Utc) }
  }
} elseif ($PSBoundParameters.ContainsKey("ExpiresInDays")) {
  $exp = [datetime]::UtcNow.AddDays($ExpiresInDays)
} else {
  $exp = $defaultExpiresUtc
}
$expiresIso = $exp.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
Write-Host "Secret expiration (UTC): $expiresIso"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$uploaded = 0
$skipped = 0

foreach ($entry in $Map.GetEnumerator()) {
  $envKey = $entry.Key
  $kvName = $entry.Value
  if (-not $vars.ContainsKey($envKey) -or [string]::IsNullOrWhiteSpace($vars[$envKey])) {
    Write-Host "SKIP (missing or empty): $envKey -> $kvName"
    $skipped++
    continue
  }

  if ($WhatIf) {
    Write-Host "WOULD UPLOAD: $envKey -> Key Vault name '$kvName' (expires UTC $expiresIso)"
    continue
  }

  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmp, $vars[$envKey], $utf8NoBom)
    & az keyvault secret set --vault-name $VaultName --name $kvName --file $tmp --expires $expiresIso
    if ($LASTEXITCODE -ne 0) {
      Write-Error "az keyvault secret set failed for $kvName (exit $LASTEXITCODE)"
    }
    Write-Host "OK: $kvName"
    $uploaded++
  }
  finally {
    if (Test-Path -LiteralPath $tmp) {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}

if (-not $WhatIf) {
  Write-Host ""
  Write-Host "Done. Uploaded: $uploaded  Skipped (missing in .env): $skipped"
  Write-Host "Expiration (UTC) applied: $expiresIso"
  Write-Host "Verify: az keyvault secret list --vault-name $VaultName -o table"
}
