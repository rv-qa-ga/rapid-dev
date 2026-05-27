# Test GitHub Authentication
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "`n=== Testing GitHub Authentication ===" -ForegroundColor Cyan

# Test with curl to see detailed error
$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

Write-Host "`nTesting token validity..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    Write-Host "✓ Token is valid!" -ForegroundColor Green
    Write-Host "  Authenticated as: $($response.login)" -ForegroundColor Gray
    
    # Check repository access
    Write-Host "`nTesting repository access..." -ForegroundColor Yellow
    $repoResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/rv-qa-ga/rapid-dev" -Headers $headers -Method Get
    Write-Host "✓ Repository access confirmed!" -ForegroundColor Green
    Write-Host "  Repository: $($repoResponse.full_name)" -ForegroundColor Gray
    Write-Host "  Permissions: $($repoResponse.permissions | ConvertTo-Json -Compress)" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "If token is valid but you still get 403:" -ForegroundColor White
Write-Host "1. Check if organization requires SSO authorization" -ForegroundColor Yellow
Write-Host "   - Go to: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "   - Find your token and click 'Configure SSO'" -ForegroundColor Gray
Write-Host "   - Authorize it for 'accelins' organization" -ForegroundColor Gray
Write-Host "`n2. Verify token has 'repo' scope checked" -ForegroundColor Yellow
Write-Host "`n3. Verify you have write access to the repository" -ForegroundColor Yellow

