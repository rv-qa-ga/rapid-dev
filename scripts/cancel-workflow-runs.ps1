# Script to cancel running GitHub Actions workflow runs
# Usage: .\scripts\cancel-workflow-runs.ps1 [-WorkflowName "Regression Tests"] [-All]

param(
    [string]$WorkflowName = "Regression Tests",
    [switch]$All = $false,
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

Write-Host "🛑 Cancelling workflow runs..." -ForegroundColor Yellow
Write-Host ""

try {
    # Get workflow runs
    $url = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflowFile/runs?per_page=10&status=in_progress"
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    $runs = $response.workflow_runs

    if ($runs.Count -eq 0) {
        Write-Host "✅ No running workflows found" -ForegroundColor Green
        exit 0
    }

    Write-Host "📊 Found $($runs.Count) running workflow(s):" -ForegroundColor Cyan
    foreach ($run in $runs) {
        Write-Host "   Run #$($run.run_number) - Status: $($run.status) - Branch: $($run.head_branch)" -ForegroundColor Gray
    }
    Write-Host ""

    if (-not $All) {
        $confirm = Read-Host "Cancel all $($runs.Count) running workflow(s)? (y/N)"
        if ($confirm -ne 'y' -and $confirm -ne 'Y') {
            Write-Host "Cancelled by user" -ForegroundColor Yellow
            exit 0
        }
    }

    # Cancel each run
    $cancelled = 0
    foreach ($run in $runs) {
        try {
            $cancelUrl = "https://api.github.com/repos/$owner/$repo/actions/runs/$($run.id)/cancel"
            Invoke-RestMethod -Uri $cancelUrl -Method Post -Headers $headers | Out-Null
            Write-Host "✅ Cancelled Run #$($run.run_number)" -ForegroundColor Green
            $cancelled++
        } catch {
            Write-Host "❌ Failed to cancel Run #$($run.run_number): $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "✅ Cancelled $cancelled of $($runs.Count) workflow run(s)" -ForegroundColor Green

} catch {
    Write-Host "❌ Error cancelling workflows:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
