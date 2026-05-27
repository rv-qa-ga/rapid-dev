#Requires -Version 5.1
<#
.SYNOPSIS
    QA Tool: Generate Gherkin feature files from Jira work items.

.DESCRIPTION
    Runs the framework's feature file generator (Mode 4 = Risk-Based Testing by default).
    Prompts for work item ID(s), generation mode, and whether to overwrite existing files.
    Use this script when you want a guided flow; use the .bat for quick double-click.

.EXAMPLE
    .\Generate-Feature-Files.ps1
    Then enter e.g. SF-451 or SF-645 SF-646 when prompted.
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host ""
Write-Host " ============================================================" -ForegroundColor Cyan
Write-Host "   FEATURE FILE GENERATOR (Jira -> UI/API .feature files)" -ForegroundColor Cyan
Write-Host " ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " This tool generates Gherkin feature files from Jira work items." -ForegroundColor Gray
Write-Host " Default: Mode 4 (Risk-Based Testing) - UI scenarios + minimal API." -ForegroundColor Gray
Write-Host ""

# Work item(s)
$workItemsInput = Read-Host "Enter Jira work item(s), space-separated (e.g. SF-451 or SF-645 SF-646 SF-647)"
$workItems = $workItemsInput.Trim()
if ([string]::IsNullOrWhiteSpace($workItems)) {
    Write-Host "No work items entered. Will process ALL items in QA queue." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Work item(s): $workItems" -ForegroundColor Green
    Write-Host ""
}

# Mode
Write-Host "Generation modes:"
Write-Host "  1 = User Scenarios Only"
Write-Host "  2 = User Scenarios + Augmentation"
Write-Host "  3 = Generator Only"
Write-Host "  4 = Risk-Based Testing (RBT) - recommended for QA"
Write-Host ""
$modeInput = Read-Host "Enter mode (1-4, default 4)"
$mode = "4"
if (-not [string]::IsNullOrWhiteSpace($modeInput) -and $modeInput -match "^[1-4]$") { $mode = $modeInput }
Write-Host "Using mode: $mode" -ForegroundColor Green
Write-Host ""

# Overwrite
$overwriteInput = Read-Host "Overwrite existing feature files? (Y/N, default N)"
$overwrite = $overwriteInput.Trim().ToUpper() -eq "Y"
Write-Host "Overwrite: $(if ($overwrite) { 'Yes' } else { 'No' })" -ForegroundColor Green
Write-Host ""

# Build arguments
$npmArgs = @("run", "process:new-qa-items", "--", "--mode", $mode)
if ($overwrite) { $npmArgs += "--overwrite" }
if (-not [string]::IsNullOrWhiteSpace($workItems)) {
    $workItems.Split(" ", [StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $npmArgs += $_ }
}

Write-Host " ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " Running generator..." -ForegroundColor DarkGray
Write-Host " ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

& npm @npmArgs
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host " ------------------------------------------------------------" -ForegroundColor DarkGray
if ($exitCode -eq 0) {
    Write-Host " Done. Check src/features/ui and src/features/api for .feature files." -ForegroundColor Green
} else {
    Write-Host " Generator finished with errors. Check output above." -ForegroundColor Red
}
Write-Host " ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

exit $exitCode
