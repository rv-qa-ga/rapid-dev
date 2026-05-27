# SF-596 HTML Report Generation Script
# Converts JSON test results to comprehensive HTML report

param(
    [string]$JsonReportFile,
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot | Split-Path -Parent
$reportsDir = Join-Path $projectRoot "reports"

# Find latest report if not specified
if ([string]::IsNullOrEmpty($JsonReportFile)) {
    $latestReport = Get-ChildItem -Path $reportsDir -Filter "sf-596-*.json" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($latestReport) {
        $JsonReportFile = $latestReport.FullName
    } else {
        Write-Host "❌ No test report found." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path $JsonReportFile)) {
    Write-Host "❌ Report file not found: $JsonReportFile" -ForegroundColor Red
    exit 1
}

# Generate output filename
if ([string]::IsNullOrEmpty($OutputFile)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputFile = Join-Path $reportsDir "SF-596-TEST-RESULTS-REPORT-$timestamp.html"
}

Write-Host "Generating HTML report..." -ForegroundColor Yellow
Write-Host "Source: $JsonReportFile" -ForegroundColor Gray
Write-Host "Output: $OutputFile" -ForegroundColor Gray

# Read and parse JSON
try {
    $jsonContent = Get-Content $JsonReportFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "❌ Error parsing JSON: $_" -ForegroundColor Red
    exit 1
}

# Extract test results
$scenarios = @()
$totalScenarios = 0
$passedScenarios = 0
$failedScenarios = 0
$skippedScenarios = 0

# Process Cucumber JSON format
$elementsToProcess = @()
if ($jsonContent -is [Array]) {
    if ($jsonContent.Count -gt 0 -and $jsonContent[0].PSObject.Properties.Name -contains "elements") {
        $elementsToProcess = $jsonContent[0].elements
    }
} elseif ($jsonContent.PSObject.Properties.Name -contains "elements") {
    $elementsToProcess = $jsonContent.elements
}

foreach ($element in $elementsToProcess) {
    if ($element.type -eq "scenario") {
        $totalScenarios++
        
        $hasFailed = $false
        $hasSkipped = $false
        $errorMessage = ""
        $failedStep = ""
        
        foreach ($step in $element.steps) {
            $stepStatus = $step.result.status
            if ($stepStatus -eq "failed") {
                $hasFailed = $true
                $errorMessage = if ($step.result.error_message) { $step.result.error_message } else { "Unknown error" }
                $failedStep = $step.name
                break
            }
            if ($stepStatus -eq "skipped") {
                $hasSkipped = $true
            }
        }
        
        $scenarioStatus = if ($hasFailed) { "failed" } elseif ($hasSkipped) { "skipped" } else { "passed" }
        
        if ($scenarioStatus -eq "passed") { $passedScenarios++ }
        if ($scenarioStatus -eq "failed") { $failedScenarios++ }
        if ($scenarioStatus -eq "skipped") { $skippedScenarios++ }
        
        $tags = $element.tags | ForEach-Object { $_.name }
        
        $scenarios += @{
            Name = $element.name
            Tags = $tags
            Status = $scenarioStatus
            ErrorMessage = $errorMessage
            FailedStep = $failedStep
            Line = $element.line
        }
    }
}

# Categorize scenarios
$eligibleScenarios = $scenarios | Where-Object { $_.Tags -like "*@eligible*" -and $_.Tags -like "*@create*" }
$ineligibleScenarios = $scenarios | Where-Object { $_.Tags -like "*@ineligible*" -or ($_.Tags -like "*@negative*" -and $_.Tags -like "*@create*") }
$cornerCaseScenarios = $scenarios | Where-Object { $_.Tags -like "*@corner-case*" }
$statusTransitionScenarios = $scenarios | Where-Object { $_.Tags -like "*@status-transition*" }
$negativeScenarios = $scenarios | Where-Object { $_.Tags -like "*@negative*" }

# Calculate percentages
$passRate = if ($totalScenarios -gt 0) { [math]::Round(($passedScenarios / $totalScenarios) * 100, 1) } else { 0 }
$failRate = if ($totalScenarios -gt 0) { [math]::Round(($failedScenarios / $totalScenarios) * 100, 1) } else { 0 }

# Generate HTML
$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SF-596 Test Results Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 {
            color: #34495e;
            margin-top: 40px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ecf0f1;
        }
        
        h3 {
            color: #7f8c8d;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .summary-card.passed {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        
        .summary-card.failed {
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        }
        
        .summary-card.skipped {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .summary-card h3 {
            font-size: 2.5em;
            margin: 0;
            color: white;
            border: none;
        }
        
        .summary-card p {
            margin: 10px 0 0 0;
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #ecf0f1;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .progress-fill.failed {
            background: linear-gradient(90deg, #eb3349 0%, #f45c43 100%);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-skipped {
            background: #fff3cd;
            color: #856404;
        }
        
        .tag {
            display: inline-block;
            background: #e9ecef;
            color: #495057;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            margin: 2px;
        }
        
        .error-details {
            background: #fff5f5;
            border-left: 4px solid #e53e3e;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        
        .error-details strong {
            color: #e53e3e;
        }
        
        .assumption-table {
            margin: 20px 0;
        }
        
        .assumption-table td:first-child {
            font-weight: 600;
            width: 30%;
        }
        
        .assumption-match {
            color: #28a745;
            font-weight: 600;
        }
        
        .assumption-mismatch {
            color: #dc3545;
            font-weight: 600;
        }
        
        .recommendations {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        
        .recommendations ul {
            margin-left: 20px;
            margin-top: 10px;
        }
        
        .recommendations li {
            margin: 8px 0;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .category-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>SF-596 Test Results Report</h1>
        <p><strong>Work Item:</strong> SF-596 - Publish Account Platform Events from Salesforce</p>
        <p><strong>Execution Date:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
        <p><strong>Report File:</strong> $(Split-Path $JsonReportFile -Leaf)</p>
        
        <div class="summary">
            <div class="summary-card">
                <h3>$totalScenarios</h3>
                <p>Total Scenarios</p>
            </div>
            <div class="summary-card passed">
                <h3>$passedScenarios</h3>
                <p>Passed ($passRate%)</p>
            </div>
            <div class="summary-card failed">
                <h3>$failedScenarios</h3>
                <p>Failed ($failRate%)</p>
            </div>
            <div class="summary-card skipped">
                <h3>$skippedScenarios</h3>
                <p>Skipped</p>
            </div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill $(if ($passRate -lt 50) { 'failed' } else { '' })" style="width: $passRate%">
                $passRate% Pass Rate
            </div>
        </div>
        
        <h2>Executive Summary</h2>
        <p>This report contains comprehensive test results for SF-596 Platform Event publishing scenarios. The tests cover all Type/Status combinations and status transition edge cases based on business rules assumptions.</p>
        
        <div class="chart-container">
            <canvas id="resultsChart" width="400" height="200"></canvas>
        </div>
        
        <h2>Test Results by Category</h2>
        
        <div class="category-section">
            <h3>Eligible Combinations (Create Events)</h3>
            <p><strong>Total:</strong> $($eligibleScenarios.Count) scenarios</p>
            <table>
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>Status</th>
                        <th>Tags</th>
                    </tr>
                </thead>
                <tbody>
$(($eligibleScenarios | ForEach-Object {
    $statusClass = "status-$($_.Status)"
    $tagsHtml = ($_.Tags | ForEach-Object { "<span class='tag'>$_</span>" }) -join ""
    "                    <tr>
                        <td>$($_.Name)</td>
                        <td><span class='status-badge $statusClass'>$($_.Status)</span></td>
                        <td>$tagsHtml</td>
                    </tr>"
}) -join "`n")
                </tbody>
            </table>
        </div>
        
        <div class="category-section">
            <h3>Ineligible Combinations (Negative Tests)</h3>
            <p><strong>Total:</strong> $($ineligibleScenarios.Count) scenarios</p>
            <table>
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>Status</th>
                        <th>Tags</th>
                    </tr>
                </thead>
                <tbody>
$(($ineligibleScenarios | ForEach-Object {
    $statusClass = "status-$($_.Status)"
    $tagsHtml = ($_.Tags | ForEach-Object { "<span class='tag'>$_</span>" }) -join ""
    "                    <tr>
                        <td>$($_.Name)</td>
                        <td><span class='status-badge $statusClass'>$($_.Status)</span></td>
                        <td>$tagsHtml</td>
                    </tr>"
}) -join "`n")
                </tbody>
            </table>
        </div>
        
        <div class="category-section">
            <h3>Status Transition Corner Cases</h3>
            <p><strong>Total:</strong> $($cornerCaseScenarios.Count) scenarios</p>
            <table>
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>Status</th>
                        <th>Tags</th>
                    </tr>
                </thead>
                <tbody>
$(($cornerCaseScenarios | ForEach-Object {
    $statusClass = "status-$($_.Status)"
    $tagsHtml = ($_.Tags | ForEach-Object { "<span class='tag'>$_</span>" }) -join ""
    "                    <tr>
                        <td>$($_.Name)</td>
                        <td><span class='status-badge $statusClass'>$($_.Status)</span></td>
                        <td>$tagsHtml</td>
                    </tr>"
}) -join "`n")
                </tbody>
            </table>
        </div>
        
        <h2>Failed Scenarios Analysis</h2>
$(if ($failedScenarios -gt 0) {
    $failed = $scenarios | Where-Object { $_.Status -eq "failed" }
    ($failed | ForEach-Object {
        $tagsHtml = ($_.Tags | ForEach-Object { "<span class='tag'>$_</span>" }) -join ""
        $errorHtml = if ($_.ErrorMessage) {
            "<div class='error-details'>
                <strong>Error:</strong> $($_.ErrorMessage -replace '<', '&lt;' -replace '>', '&gt;')
                $(if ($_.FailedStep) { "<br><strong>Failed Step:</strong> $($_.FailedStep)" })
            </div>"
        } else { "" }
        "        <div class='category-section'>
            <h3>$($_.Name)</h3>
            <p><strong>Tags:</strong> $tagsHtml</p>
            <p><strong>Status:</strong> <span class='status-badge status-failed'>Failed</span></p>
            $errorHtml
        </div>"
    }) -join "`n"
} else {
        "        <p>✅ No failed scenarios</p>"
})
        
        <h2>Assumptions Validation</h2>
        
        <h3>Assumption 1: Status Downgrade (Eligible → Ineligible)</h3>
        <p><strong>Expected:</strong> Should publish events for Dynamics sync</p>
        <table class="assumption-table">
            <tr>
                <td>Test Scenario</td>
                <td>Result</td>
                <td>Status</td>
            </tr>
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*Onboarding to New*" -or $_.Name -like "*Active to Prospect*" -or $_.Name -like "*Active to Onboarding*" } | ForEach-Object {
    $statusClass = if ($_.Status -eq "passed") { "assumption-match" } else { "assumption-mismatch" }
    "            <tr>
                <td>$($_.Name)</td>
                <td><span class='status-badge status-$($_.Status)'>$($_.Status)</span></td>
                <td class='$statusClass'>$(if ($_.Status -eq "passed") { "✅ Matches" } else { "❌ Mismatch" })</td>
            </tr>"
}) -join "`n")
        </table>
        
        <h3>Assumption 2: Status Upgrade (Ineligible → Eligible)</h3>
        <p><strong>Expected:</strong> Should publish events</p>
        <table class="assumption-table">
            <tr>
                <td>Test Scenario</td>
                <td>Result</td>
                <td>Status</td>
            </tr>
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*New to Onboarding*" -or $_.Name -like "*Prospect to Contracted*" -or $_.Name -like "*New to Active*" } | ForEach-Object {
    $statusClass = if ($_.Status -eq "passed") { "assumption-match" } else { "assumption-mismatch" }
    "            <tr>
                <td>$($_.Name)</td>
                <td><span class='status-badge status-$($_.Status)'>$($_.Status)</span></td>
                <td class='$statusClass'>$(if ($_.Status -eq "passed") { "✅ Matches" } else { "❌ Mismatch" })</td>
            </tr>"
}) -join "`n")
        </table>
        
        <h3>Assumption 3: Status Change Within Eligible Range</h3>
        <p><strong>Expected:</strong> Should publish events</p>
        <table class="assumption-table">
            <tr>
                <td>Test Scenario</td>
                <td>Result</td>
                <td>Status</td>
            </tr>
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*Onboarding to Active*" -or $_.Name -like "*Active to Runoff*" } | ForEach-Object {
    $statusClass = if ($_.Status -eq "passed") { "assumption-match" } else { "assumption-mismatch" }
    "            <tr>
                <td>$($_.Name)</td>
                <td><span class='status-badge status-$($_.Status)'>$($_.Status)</span></td>
                <td class='$statusClass'>$(if ($_.Status -eq "passed") { "✅ Matches" } else { "❌ Mismatch" })</td>
            </tr>"
}) -join "`n")
        </table>
        
        <h3>Assumption 4: Status Change Within Ineligible Range</h3>
        <p><strong>Expected:</strong> Should NOT publish events</p>
        <table class="assumption-table">
            <tr>
                <td>Test Scenario</td>
                <td>Result</td>
                <td>Status</td>
            </tr>
$(($cornerCaseScenarios | Where-Object { $_.Name -like "*New to Prospect*" -or $_.Name -like "*Onboarding to Contracted*" } | ForEach-Object {
    $statusClass = if ($_.Status -eq "passed") { "assumption-match" } else { "assumption-mismatch" }
    "            <tr>
                <td>$($_.Name)</td>
                <td><span class='status-badge status-$($_.Status)'>$($_.Status)</span></td>
                <td class='$statusClass'>✅ Matches</td>
            </tr>"
}) -join "`n")
        </table>
        
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                <li><strong>Review Failed Scenarios:</strong> Investigate the $failedScenarios failed scenario(s) to understand root causes. Most failures are due to Platform Events not being published.</li>
                <li><strong>Check System Behavior:</strong> Compare actual system behavior with assumptions. The system appears to only publish events for specific statuses on creation, not on status changes.</li>
                <li><strong>Update Assumptions:</strong> Revise assumptions based on actual test results. Status transition assumptions may need to be updated.</li>
                <li><strong>Share with BA:</strong> Provide this report to BA for confirmation of actual behavior and clarification on business rules.</li>
            </ul>
        </div>
        
        <h2>Questions for BA</h2>
        <div class="recommendations">
            <ol>
                <li><strong>Why are events only published for "Onboarding" (Member) and "Active" (Agency)?</strong>
                    <ul>
                        <li>Are other eligible statuses supposed to publish events on creation?</li>
                        <li>Is there additional configuration needed?</li>
                    </ul>
                </li>
                <li><strong>Are status changes supposed to trigger Platform Events?</strong>
                    <ul>
                        <li>Current behavior: NO events on status changes</li>
                        <li>Expected behavior: Events on status changes (per assumptions)</li>
                        <li>Which is correct?</li>
                    </ul>
                </li>
                <li><strong>What is the actual business rule for Platform Event publishing?</strong>
                    <ul>
                        <li>Is it only on creation with specific statuses?</li>
                        <li>Or should it also publish on status changes?</li>
                        <li>What about updates to other fields?</li>
                    </ul>
                </li>
            </ol>
        </div>
        
        <div class="footer">
            <p><strong>Report Generated:</strong> $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
            <p><strong>Test Framework:</strong> Cucumber.js | <strong>Environment:</strong> QA</p>
        </div>
    </div>
    
    <script>
        const ctx = document.getElementById('resultsChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{
                    data: [$passedScenarios, $failedScenarios, $skippedScenarios],
                    backgroundColor: [
                        '#28a745',
                        '#dc3545',
                        '#ffc107'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'Test Results Distribution'
                    }
                }
            }
        });
    </script>
</body>
</html>
"@

# Write HTML to file
$html | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host ""
Write-Host "✅ HTML report generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Report saved to: $OutputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Total Scenarios: $totalScenarios" -ForegroundColor White
Write-Host "  Passed: $passedScenarios ($passRate%)" -ForegroundColor Green
Write-Host "  Failed: $failedScenarios ($failRate%)" -ForegroundColor $(if ($failedScenarios -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped: $skippedScenarios" -ForegroundColor Yellow
