# SF-596 Comprehensive Test Execution Script
# This script runs all SF-596 test scenarios organized by category

param(
    [string]$Env = "qa",
    [string]$Category = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "SF-596 Comprehensive Test Execution" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$env:ENV = $Env
$baseDir = $PSScriptRoot
$projectRoot = Split-Path $baseDir -Parent
$featureFile = Join-Path $projectRoot "src\features\api\SF\SF-596.feature"
$reportsDir = Join-Path $projectRoot "reports"

# Create reports directory if it doesn't exist
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$testResults = @()

function Run-TestCategory {
    param(
        [string]$CategoryName,
        [string]$Tags,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "Running: $Description" -ForegroundColor Yellow
    Write-Host "Tags: $Tags" -ForegroundColor Gray
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host ""
    
    $reportFile = Join-Path $reportsDir "sf-596-$CategoryName-$timestamp.json"
    $consoleLog = Join-Path $reportsDir "sf-596-$CategoryName-$timestamp-console.log"
    
    try {
        Push-Location $projectRoot
        
        # Run the test command and capture output
        $process = Start-Process -FilePath "node" -ArgumentList @(
            "scripts/run-tests-with-env.js",
            "`"$featureFile`"",
            "--tags", "`"@SF-596 $Tags`"",
            "--format", "`"json:$reportFile`""
        ) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $consoleLog -RedirectStandardError "$consoleLog.err"
        
        $exitCode = $process.ExitCode
        
        # Check if report file was created (even if exit code is non-zero, tests might have run)
        $reportExists = Test-Path $reportFile
        
        $result = @{
            Category = $CategoryName
            Description = $Description
            Tags = $Tags
            ReportFile = if ($reportExists) { $reportFile } else { $null }
            ConsoleLog = $consoleLog
            ExitCode = $exitCode
            Status = if ($exitCode -eq 0) { "PASSED" } elseif ($reportExists) { "COMPLETED_WITH_FAILURES" } else { "ERROR" }
        }
        
        $script:testResults += $result
        
        if ($exitCode -eq 0) {
            Write-Host "[PASS] $Description - PASSED" -ForegroundColor Green
        } elseif ($reportExists) {
            Write-Host "[WARN] $Description - COMPLETED (Some tests may have failed, check report)" -ForegroundColor Yellow
        } else {
            Write-Host "[FAIL] $Description - ERROR (Exit Code: $exitCode, No report generated)" -ForegroundColor Red
        }
        
        return $result
    }
    catch {
        Write-Host "[ERROR] Error running $Description : $_" -ForegroundColor Red
        $script:testResults += @{
            Category = $CategoryName
            Description = $Description
            Status = "ERROR"
            Error = $_.ToString()
        }
    }
    finally {
        Pop-Location
    }
}

# Main execution
Write-Host "Environment: $Env" -ForegroundColor Cyan
Write-Host "Category Filter: $Category" -ForegroundColor Cyan
Write-Host "Feature File: $featureFile" -ForegroundColor Gray
Write-Host "Reports Directory: $reportsDir" -ForegroundColor Gray
Write-Host ""

if ($Category -eq "all" -or $Category -eq "eligible") {
    Run-TestCategory -CategoryName "eligible-create" `
        -Tags "@eligible @create" `
        -Description "Eligible Combinations - Create Events"
}

if ($Category -eq "all" -or $Category -eq "ineligible") {
    Run-TestCategory -CategoryName "ineligible-create" `
        -Tags "@ineligible @create @negative" `
        -Description "Ineligible Combinations - Create Events (Negative Tests)"
}

if ($Category -eq "all" -or $Category -eq "update") {
    Run-TestCategory -CategoryName "update-eligible" `
        -Tags "@update @eligible" `
        -Description "Update Events - Eligible Combinations"
}

if ($Category -eq "all" -or $Category -eq "corner-cases") {
    Run-TestCategory -CategoryName "corner-cases" `
        -Tags "@corner-case @status-transition" `
        -Description "Status Transition Corner Cases"
}

if ($Category -eq "all" -or $Category -eq "edge-cases") {
    Run-TestCategory -CategoryName "edge-cases" `
        -Tags "@edge-case" `
        -Description "Edge Cases and Status Transitions"
}

if ($Category -eq "all" -or $Category -eq "negative") {
    Run-TestCategory -CategoryName "negative" `
        -Tags "@negative" `
        -Description "Negative Test Scenarios"
}

if ($Category -eq "all" -or $Category -eq "lifecycle") {
    Run-TestCategory -CategoryName "lifecycle" `
        -Tags "@lifecycle" `
        -Description "Lifecycle and Deactivation Scenarios"
}

if ($Category -eq "all" -or $Category -eq "metadata") {
    Run-TestCategory -CategoryName "metadata" `
        -Tags "@metadata @traceability" `
        -Description "Metadata and Traceability Scenarios"
}

if ($Category -eq "all" -or $Category -eq "streaming") {
    Run-TestCategory -CategoryName "streaming" `
        -Tags "@streaming @real-time" `
        -Description "Streaming API Verification Scenarios"
}

# Run all tests together for comprehensive report
if ($Category -eq "all") {
    Write-Host ""
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "Running ALL SF-596 Tests for Comprehensive Report" -ForegroundColor Yellow
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host ""
    
    $allReportFile = Join-Path $reportsDir "sf-596-ALL-TESTS-$timestamp.json"
    $allConsoleLog = Join-Path $reportsDir "sf-596-ALL-TESTS-$timestamp-console.log"
    
    try {
        Push-Location $projectRoot
        
        # Run all tests
        $process = Start-Process -FilePath "node" -ArgumentList @(
            "scripts/run-tests-with-env.js",
            "`"$featureFile`"",
            "--tags", "`"@SF-596`"",
            "--format", "`"json:$allReportFile`""
        ) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $allConsoleLog -RedirectStandardError "$allConsoleLog.err"
        
        $exitCode = $process.ExitCode
        $reportExists = Test-Path $allReportFile
        
        Write-Host ""
        if ($exitCode -eq 0) {
            Write-Host "[PASS] ALL SF-596 Tests - PASSED" -ForegroundColor Green
        } elseif ($reportExists) {
            Write-Host "[WARN] ALL SF-596 Tests - COMPLETED (Some tests may have failed, check report)" -ForegroundColor Yellow
        } else {
            Write-Host "[FAIL] ALL SF-596 Tests - ERROR (Exit Code: $exitCode, No report generated)" -ForegroundColor Red
        }
        
        if ($reportExists) {
            Write-Host "Comprehensive Report: $allReportFile" -ForegroundColor Cyan
        }
        Write-Host "Console Log: $allConsoleLog" -ForegroundColor Cyan
    }
    catch {
        Write-Host "[ERROR] Error running all tests: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Summary
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "Test Execution Summary" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $testResults) {
    $statusColor = if ($result.Status -eq "PASSED") { "Green" } else { "Red" }
    Write-Host "$($result.Category): $($result.Status)" -ForegroundColor $statusColor
    if ($result.ReportFile) {
        Write-Host "  Report: $($result.ReportFile)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "All reports saved to: $reportsDir" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray
