# Script to get GitHub Actions workflow run logs
# Usage: .\scripts\get-workflow-logs.ps1 [-RunNumber 3] [-Step "Run regression tests"]

param(
    [int]$RunNumber = 0,  # 0 = latest run
    [string]$Step = "",
    [string]$GitHubToken = $env:GITHUB_TOKEN
)

if (-not $GitHubToken) {
    Write-Host "❌ Error: GitHub token not found" -ForegroundColor Red
    Write-Host "   Set GITHUB_TOKEN environment variable" -ForegroundColor Yellow
    exit 1
}

$owner = "rv-qa-ga"
$repo = "rapid-dev"
$workflowFile = "regression-tests.yml"

$headers = @{
    "Accept" = "application/vnd.github.v3+json"
    "Authorization" = "token $GitHubToken"
}

Write-Host "🔍 Fetching workflow logs..." -ForegroundColor Cyan
Write-Host ""

try {
    # Get workflow runs
    $runsUrl = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflowFile/runs?per_page=5"
    $runsResponse = Invoke-RestMethod -Uri $runsUrl -Method Get -Headers $headers
    $runs = $runsResponse.workflow_runs

    if ($runs.Count -eq 0) {
        Write-Host "⚠️  No workflow runs found" -ForegroundColor Yellow
        exit 0
    }

    # Get the run
    $run = $null
    if ($RunNumber -eq 0) {
        $run = $runs[0]
        Write-Host "📋 Latest Run: #$($run.run_number)" -ForegroundColor Green
    } else {
        $run = $runs | Where-Object { $_.run_number -eq $RunNumber }
        if (-not $run) {
            Write-Host "❌ Run #$RunNumber not found" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "   Status: $($run.status)" -ForegroundColor Gray
    Write-Host "   Conclusion: $($run.conclusion)" -ForegroundColor Gray
    Write-Host "   Branch: $($run.head_branch)" -ForegroundColor Gray
    Write-Host "   URL: $($run.html_url)" -ForegroundColor Cyan
    Write-Host ""

    # Get jobs for this run
    $jobsUrl = $run.jobs_url
    $jobsResponse = Invoke-RestMethod -Uri $jobsUrl -Method Get -Headers $headers
    $jobs = $jobsResponse.jobs

    if ($jobs.Count -eq 0) {
        Write-Host "⚠️  No jobs found for this run" -ForegroundColor Yellow
        exit 0
    }

    $job = $jobs[0]  # Usually there's one job: "regression"
    Write-Host "🔧 Job: $($job.name)" -ForegroundColor Cyan
    Write-Host "   Status: $($job.status)" -ForegroundColor Gray
    Write-Host "   Conclusion: $($job.conclusion)" -ForegroundColor Gray
    Write-Host ""

    # Get steps
    Write-Host "📝 Steps:" -ForegroundColor Cyan
    foreach ($step in $job.steps) {
        $stepStatus = $step.conclusion
        $stepName = $step.name
        
        $statusIcon = "⏸️"
        $statusColor = "Gray"
        if ($stepStatus -eq "success") {
            $statusIcon = "✅"
            $statusColor = "Green"
        } elseif ($stepStatus -eq "failure") {
            $statusIcon = "❌"
            $statusColor = "Red"
        } elseif ($step.status -eq "in_progress") {
            $statusIcon = "🔄"
            $statusColor = "Yellow"
        }

        Write-Host "   $statusIcon $stepName" -ForegroundColor $statusColor
        if ($stepStatus) {
            Write-Host "      Conclusion: $stepStatus" -ForegroundColor Gray
        }
    }
    Write-Host ""

    # Get logs for specific step or all steps
    if ($Step) {
        Write-Host "📄 Logs for step: '$Step'" -ForegroundColor Cyan
        Write-Host "─" * 80 -ForegroundColor Gray
        Write-Host ""
        
        $targetStep = $job.steps | Where-Object { $_.name -like "*$Step*" }
        if ($targetStep) {
            if ($targetStep.log_url) {
                try {
                    $logResponse = Invoke-WebRequest -Uri $targetStep.log_url -Headers $headers
                    $logContent = $logResponse.Content
                    Write-Host $logContent
                } catch {
                    Write-Host "⚠️  Could not fetch logs: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "⚠️  No log URL available for this step" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  Step '$Step' not found" -ForegroundColor Yellow
            Write-Host "   Available steps:" -ForegroundColor Gray
            $job.steps | ForEach-Object { Write-Host "   - $($_.name)" -ForegroundColor Gray }
        }
    } else {
        # Show key steps
        Write-Host "📄 Key Steps Analysis:" -ForegroundColor Cyan
        Write-Host "─" * 80 -ForegroundColor Gray
        Write-Host ""

        $keySteps = @("Run regression tests", "Upload test artifacts", "Publish test summary")
        foreach ($keyStepName in $keySteps) {
            $keyStep = $job.steps | Where-Object { $_.name -like "*$keyStepName*" }
            if ($keyStep) {
                Write-Host "🔍 $($keyStep.name):" -ForegroundColor Yellow
                Write-Host "   Status: $($keyStep.status)" -ForegroundColor Gray
                Write-Host "   Conclusion: $($keyStep.conclusion)" -ForegroundColor Gray
                
                if ($keyStep.log_url) {
                    Write-Host "   Log URL: $($keyStep.log_url)" -ForegroundColor Cyan
                    Write-Host ""
                    Write-Host "   Last 50 lines of log:" -ForegroundColor Gray
                    Write-Host "   " + ("─" * 76) -ForegroundColor DarkGray
                    try {
                        $logResponse = Invoke-WebRequest -Uri $keyStep.log_url -Headers $headers
                        $logLines = $logResponse.Content -split "`n"
                        $lastLines = $logLines[-50..-1]
                        foreach ($line in $lastLines) {
                            Write-Host "   $line" -ForegroundColor White
                        }
                    } catch {
                        Write-Host "   ⚠️  Could not fetch logs: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                    Write-Host "   " + ("─" * 76) -ForegroundColor DarkGray
                }
                Write-Host ""
            }
        }
    }

    Write-Host ""
    Write-Host "💡 To view full logs, visit:" -ForegroundColor Cyan
    Write-Host "   $($run.html_url)" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error fetching workflow logs:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}
