# Script to trigger Regression Tests workflow manually
# Usage: .\scripts\trigger-regression-workflow.ps1

param(
    [string]$WorkItem = "SF-655",
    [string]$CycleName = "Regression",
    [string]$Environment = "qa",
    [string]$Branch = "docs/confluence-github-runner-setup",
    [string]$GitHubToken = $env:GITHUB_TOKEN
)

if (-not $GitHubToken) {
    Write-Host "❌ Error: GitHub token not found" -ForegroundColor Red
    Write-Host "   Set GITHUB_TOKEN environment variable or pass it as parameter" -ForegroundColor Yellow
    Write-Host "   Example: `$env:GITHUB_TOKEN='your-token'; .\scripts\trigger-regression-workflow.ps1" -ForegroundColor Yellow
    exit 1
}

$owner = "rv-qa-ga"
$repo = "rapid-dev"
$workflowFile = "regression-tests.yml"

$url = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflowFile/dispatches"

$body = @{
    ref = $Branch
    inputs = @{
        work_item = $WorkItem
        cycle_name = $CycleName
        environment = $Environment
    }
} | ConvertTo-Json

$headers = @{
    "Accept" = "application/vnd.github.v3+json"
    "Authorization" = "token $GitHubToken"
    "Content-Type" = "application/json"
}

Write-Host "🚀 Triggering Regression Tests workflow..." -ForegroundColor Cyan
Write-Host "   Branch: $Branch" -ForegroundColor Gray
Write-Host "   Work Item: $WorkItem" -ForegroundColor Gray
Write-Host "   Cycle: $CycleName" -ForegroundColor Gray
Write-Host "   Environment: $Environment" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ Workflow triggered successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 View the run at:" -ForegroundColor Cyan
    Write-Host "   https://github.com/$owner/$repo/actions" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 To check status from feature branch, run:" -ForegroundColor Cyan
    Write-Host "   .\scripts\check-workflow-status.ps1" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "❌ Error triggering workflow:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}
