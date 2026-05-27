# Script to check GitHub Actions workflow run status
# Usage: .\scripts\check-workflow-status.ps1 [-WorkflowName "Regression Tests"] [-Branch "docs/confluence-github-runner-setup"]

param(
    [string]$WorkflowName = "Regression Tests",
    [string]$Branch = "docs/confluence-github-runner-setup",
    [string]$GitHubToken = $env:GITHUB_TOKEN,
    [int]$Limit = 5
)

if (-not $GitHubToken) {
    Write-Host "❌ Error: GitHub token not found" -ForegroundColor Red
    Write-Host "   Set GITHUB_TOKEN environment variable" -ForegroundColor Yellow
    Write-Host "   Example: `$env:GITHUB_TOKEN='your-token'; .\scripts\check-workflow-status.ps1" -ForegroundColor Yellow
    exit 1
}

$owner = "rv-qa-ga"
$repo = "rapid-dev"
$workflowFile = "regression-tests.yml"

Write-Host "🔍 Checking workflow runs for: $WorkflowName" -ForegroundColor Cyan
Write-Host "   Branch: $Branch" -ForegroundColor Gray
Write-Host ""

# Get workflow runs
$url = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflowFile/runs?per_page=$Limit"

$headers = @{
    "Accept" = "application/vnd.github.v3+json"
    "Authorization" = "token $GitHubToken"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    $runs = $response.workflow_runs

    if ($runs.Count -eq 0) {
        Write-Host "⚠️  No workflow runs found" -ForegroundColor Yellow
        exit 0
    }

    Write-Host "📊 Found $($runs.Count) recent run(s):" -ForegroundColor Green
    Write-Host ""

    foreach ($run in $runs) {
        $status = $run.status
        $conclusion = $run.conclusion
        $runNumber = $run.run_number
        $createdAt = $run.created_at
        $headBranch = $run.head_branch
        $htmlUrl = $run.html_url

        # Status color
        $statusColor = "Gray"
        if ($status -eq "completed") {
            if ($conclusion -eq "success") {
                $statusColor = "Green"
                $statusIcon = "✅"
            } elseif ($conclusion -eq "failure") {
                $statusColor = "Red"
                $statusIcon = "❌"
            } else {
                $statusColor = "Yellow"
                $statusIcon = "⚠️"
            }
        } elseif ($status -eq "in_progress") {
            $statusColor = "Yellow"
            $statusIcon = "🔄"
        } else {
            $statusIcon = "⏸️"
        }

        Write-Host "$statusIcon Run #$runNumber" -ForegroundColor $statusColor
        Write-Host "   Status: $status" -ForegroundColor Gray
        if ($conclusion) {
            Write-Host "   Conclusion: $conclusion" -ForegroundColor Gray
        }
        Write-Host "   Branch: $headBranch" -ForegroundColor Gray
        Write-Host "   Started: $createdAt" -ForegroundColor Gray
        Write-Host "   URL: $htmlUrl" -ForegroundColor Cyan
        Write-Host ""
    }

    # Get details of the latest run
    $latestRun = $runs[0]
    Write-Host "📋 Latest Run Details:" -ForegroundColor Cyan
    Write-Host "   Run Number: $($latestRun.run_number)" -ForegroundColor Gray
    Write-Host "   Status: $($latestRun.status)" -ForegroundColor Gray
    Write-Host "   Branch: $($latestRun.head_branch)" -ForegroundColor Gray
    Write-Host "   URL: $($latestRun.html_url)" -ForegroundColor Cyan
    Write-Host ""

    # Get job details
    $jobsUrl = $latestRun.jobs_url
    $jobsResponse = $null
    try {
        $jobsResponse = Invoke-RestMethod -Uri $jobsUrl -Method Get -Headers $headers
    } catch {
        $jobError = $_.Exception.Message
        Write-Host "⚠️  Could not fetch job details: $jobError" -ForegroundColor Yellow
    }

    if ($jobsResponse) {
        $jobs = $jobsResponse.jobs
        Write-Host "🔧 Jobs:" -ForegroundColor Cyan
        foreach ($job in $jobs) {
            $jobStatus = $job.status
            $jobConclusion = $job.conclusion
            $jobName = $job.name

            $jobColor = "Gray"
            if ($jobStatus -eq "completed") {
                if ($jobConclusion -eq "success") {
                    $jobColor = "Green"
                    $jobIcon = "✅"
                } else {
                    $jobColor = "Red"
                    $jobIcon = "❌"
                }
            } elseif ($jobStatus -eq "in_progress") {
                $jobColor = "Yellow"
                $jobIcon = "🔄"
            } else {
                $jobIcon = "⏸️"
            }

            Write-Host "   $jobIcon $jobName" -ForegroundColor $jobColor
            Write-Host "      Status: $jobStatus" -ForegroundColor Gray
            if ($jobConclusion) {
                Write-Host "      Conclusion: $jobConclusion" -ForegroundColor Gray
            }
            Write-Host "      URL: $($job.html_url)" -ForegroundColor Cyan
            Write-Host ""
        }
    }

} catch {
    Write-Host "❌ Error checking workflow status:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}
