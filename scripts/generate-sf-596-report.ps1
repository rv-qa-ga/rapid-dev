# SF-596 Test Results Analysis and Report Generation Script
# This script analyzes test execution results and generates a comprehensive report for BA

param(
    [string]$JsonReportFile,
    [string]$ConsoleLogFile,
    [string]$OutputReportFile = ""
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SF-596 Test Results Analysis and Report Generation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot | Split-Path -Parent
$reportsDir = Join-Path $projectRoot "reports"

# If no output file specified, generate one with timestamp
if ([string]::IsNullOrEmpty($OutputReportFile)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputReportFile = Join-Path $reportsDir "SF-596-TEST-RESULTS-ANALYSIS-$timestamp.md"
}

# Find the most recent report if not specified
if ([string]::IsNullOrEmpty($JsonReportFile)) {
    $latestReport = Get-ChildItem -Path $reportsDir -Filter "sf-596-ALL-TESTS-*.json" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($latestReport) {
        $JsonReportFile = $latestReport.FullName
        Write-Host "Using latest report: $JsonReportFile" -ForegroundColor Gray
    } else {
        Write-Host "❌ No test report found. Please specify -JsonReportFile parameter." -ForegroundColor Red
        exit 1
    }
}

# Find the most recent console log if not specified
if ([string]::IsNullOrEmpty($ConsoleLogFile)) {
    $latestLog = Get-ChildItem -Path $reportsDir -Filter "sf-596-ALL-TESTS-*-console.log" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($latestLog) {
        $ConsoleLogFile = $latestLog.FullName
        Write-Host "Using latest console log: $ConsoleLogFile" -ForegroundColor Gray
    }
}

if (-not (Test-Path $JsonReportFile)) {
    Write-Host "❌ Report file not found: $JsonReportFile" -ForegroundColor Red
    exit 1
}

Write-Host "Analyzing test results..." -ForegroundColor Yellow
Write-Host ""

# Read and parse JSON report
try {
    $jsonContent = Get-Content $JsonReportFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "❌ Error parsing JSON report: $_" -ForegroundColor Red
    exit 1
}

# Extract test results
$scenarios = @()
$totalScenarios = 0
$passedScenarios = 0
$failedScenarios = 0
$skippedScenarios = 0
$undefinedScenarios = 0

# Process Cucumber JSON format
# JSON can be an array or object with elements property
$elementsToProcess = @()
if ($jsonContent -is [Array]) {
    # If it's an array, get elements from first item
    if ($jsonContent.Count -gt 0 -and $jsonContent[0].PSObject.Properties.Name -contains "elements") {
        $elementsToProcess = $jsonContent[0].elements
    }
} elseif ($jsonContent.PSObject.Properties.Name -contains "elements") {
    $elementsToProcess = $jsonContent.elements
}

if ($elementsToProcess.Count -gt 0) {
    foreach ($element in $elementsToProcess) {
        if ($element.type -eq "scenario") {
            $totalScenarios++
            
            $scenario = @{
                Name = $element.name
                Tags = $element.tags | ForEach-Object { $_.name }
                Status = $element.steps | Where-Object { $_.result.status -ne "skipped" } | 
                    Select-Object -Last 1 -ExpandProperty result -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty status -ErrorAction SilentlyContinue
                Steps = @()
                Duration = 0
            }
            
            $hasFailed = $false
            $hasUndefined = $false
            
            foreach ($step in $element.steps) {
                $stepStatus = $step.result.status
                $scenario.Steps += @{
                    Name = $step.name
                    Status = $stepStatus
                    Duration = if ($step.result.duration) { $step.result.duration / 1000000000 } else { 0 }
                }
                
                if ($stepStatus -eq "failed") { $hasFailed = $true }
                if ($stepStatus -eq "undefined") { $hasUndefined = $true }
                
                if ($step.result.duration) {
                    $scenario.Duration += $step.result.duration / 1000000000
                }
            }
            
            if ($hasUndefined) {
                $scenario.Status = "undefined"
                $undefinedScenarios++
            } elseif ($hasFailed) {
                $scenario.Status = "failed"
                $failedScenarios++
            } else {
                $scenario.Status = "passed"
                $passedScenarios++
            }
            
            $scenarios += $scenario
        }
    }
}

# Categorize scenarios
$eligibleScenarios = $scenarios | Where-Object { $_.Tags -like "*@eligible*" }
$ineligibleScenarios = $scenarios | Where-Object { $_.Tags -like "*@ineligible*" }
$cornerCaseScenarios = $scenarios | Where-Object { $_.Tags -like "*@corner-case*" }
$statusTransitionScenarios = $scenarios | Where-Object { $_.Tags -like "*@status-transition*" }
$negativeScenarios = $scenarios | Where-Object { $_.Tags -like "*@negative*" }

# Generate report
$report = @"
# SF-596 Test Results Analysis

**Work Item:** SF-596 - Publish Account Platform Events from Salesforce  
**Execution Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Report File:** $JsonReportFile  
**Status:** Analysis Complete

## Executive Summary

- **Total Scenarios:** $totalScenarios
- **Passed:** $passedScenarios $(if ($totalScenarios -gt 0) { "($([math]::Round(($passedScenarios / $totalScenarios) * 100, 1))%)" } else { "" })
- **Failed:** $failedScenarios $(if ($totalScenarios -gt 0) { "($([math]::Round(($failedScenarios / $totalScenarios) * 100, 1))%)" } else { "" })
- **Undefined:** $undefinedScenarios $(if ($totalScenarios -gt 0) { "($([math]::Round(($undefinedScenarios / $totalScenarios) * 100, 1))%)" } else { "" })
- **Skipped:** $skippedScenarios

## Test Results by Category

### Eligible Combinations (Create Events)
**Total:** $($eligibleScenarios.Count) scenarios

$(($eligibleScenarios | ForEach-Object { "- **$($_.Name)**: $($_.Status)" }) -join "`n")

### Ineligible Combinations (Negative Tests)
**Total:** $($ineligibleScenarios.Count) scenarios

$(($ineligibleScenarios | ForEach-Object { "- **$($_.Name)**: $($_.Status)" }) -join "`n")

### Status Transition Corner Cases
**Total:** $($cornerCaseScenarios.Count) scenarios

$(($cornerCaseScenarios | ForEach-Object { "- **$($_.Name)**: $($_.Status)" }) -join "`n")

### Negative Test Scenarios
**Total:** $($negativeScenarios.Count) scenarios

$(($negativeScenarios | ForEach-Object { "- **$($_.Name)**: $($_.Status)" }) -join "`n")

## Failed Scenarios Analysis

$(if ($failedScenarios -gt 0) {
    $failed = $scenarios | Where-Object { $_.Status -eq "failed" }
    ($failed | ForEach-Object { 
        "### $($_.Name)`n`n**Tags:** $($_.Tags -join ', ')`n`n**Status:** Failed`n`n---`n" 
    }) -join "`n"
} else {
    "✅ No failed scenarios"
})

## Undefined Scenarios

$(if ($undefinedScenarios -gt 0) {
    $undefined = $scenarios | Where-Object { $_.Status -eq "undefined" }
    ($undefined | ForEach-Object { 
        "### $($_.Name)`n`n**Tags:** $($_.Tags -join ', ')`n`n**Status:** Undefined (Missing Step Definition)`n`n---`n" 
    }) -join "`n"
} else {
    "✅ No undefined scenarios"
})

## Assumptions Validation

### Assumption 1: Status Downgrade (Eligible → Ineligible)
**Expected:** Should publish events for Dynamics sync

**Test Results:**
$(($cornerCaseScenarios | Where-Object { $_.Tags -like "*@status-transition*" -and $_.Name -like "*downgrade*" -or $_.Name -like "*Onboarding to New*" -or $_.Name -like "*Active to*" } | ForEach-Object { "- $($_.Name): $($_.Status)" }) -join "`n")

### Assumption 2: Status Upgrade (Ineligible → Eligible)
**Expected:** Should publish events

**Test Results:**
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*New to*" -or $_.Name -like "*Prospect to*" } | ForEach-Object { "- $($_.Name): $($_.Status)" }) -join "`n")

### Assumption 3: Status Change Within Eligible Range
**Expected:** Should publish events

**Test Results:**
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*Active to Runoff*" -or $_.Name -like "*Onboarding to Active*" } | ForEach-Object { "- $($_.Name): $($_.Status)" }) -join "`n")

### Assumption 4: Status Change Within Ineligible Range
**Expected:** Should NOT publish events

**Test Results:**
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*New to Prospect*" -or $_.Name -like "*Onboarding to Contracted*" } | ForEach-Object { "- $($_.Name): $($_.Status)" }) -join "`n")

## Recommendations

$(if ($failedScenarios -gt 0) {
    "1. **Review Failed Scenarios:** Investigate the $failedScenarios failed scenario(s) to understand root causes.
2. **Check System Behavior:** Compare actual system behavior with assumptions.
3. **Update Assumptions:** Revise assumptions based on actual test results.
4. **Share with BA:** Provide this report to BA for confirmation of actual behavior."
} else {
    "1. ✅ **All Tests Passed:** All assumptions validated successfully.
2. **Share with BA:** Confirm that actual system behavior matches assumptions.
3. **Document Findings:** Update business rules documentation based on test results."
})

## Next Steps

1. Review this analysis report
2. Compare actual behavior with assumptions
3. Share findings with BA for confirmation
4. Update test cases if assumptions need revision
5. Document final business rules

---

**Report Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Analysis Script:** generate-sf-596-report.ps1
"@

# Write report to file
$report | Out-File -FilePath $OutputReportFile -Encoding UTF8

Write-Host "✅ Report generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Report saved to: $OutputReportFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Total Scenarios: $totalScenarios" -ForegroundColor White
Write-Host "  Passed: $passedScenarios" -ForegroundColor Green
Write-Host "  Failed: $failedScenarios" -ForegroundColor $(if ($failedScenarios -gt 0) { "Red" } else { "Green" })
Write-Host "  Undefined: $undefinedScenarios" -ForegroundColor $(if ($undefinedScenarios -gt 0) { "Yellow" } else { "Green" })
