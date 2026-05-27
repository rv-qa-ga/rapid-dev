# Diagnose Token vs Web Access Discrepancy
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "`n=== Diagnosing Token vs Web Access Issue ===" -ForegroundColor Cyan

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "PowerShell-Script"
}

# Check which account the token is for
Write-Host "`n[1] Token Account Information:" -ForegroundColor Yellow
try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    Write-Host "   Token belongs to: $($user.login)" -ForegroundColor Green
    Write-Host "   User ID: $($user.id)" -ForegroundColor Gray
    Write-Host "   Name: $($user.name)" -ForegroundColor Gray
    Write-Host "`n   ⚠️  Is this the SAME account you're using in the browser?" -ForegroundColor Yellow
} catch {
    Write-Host "   ✗ Could not get user info" -ForegroundColor Red
    return
}

# Check token scopes
Write-Host "`n[2] Checking Token Scopes:" -ForegroundColor Yellow
try {
    # Make a request to see what scopes the token has
    $response = Invoke-WebRequest -Uri "https://api.github.com/user" -Headers $headers -Method Get
    $scopes = $response.Headers['X-OAuth-Scopes']
    $acceptedScopes = $response.Headers['X-Accepted-OAuth-Scopes']
    
    if ($scopes) {
        Write-Host "   Current scopes: $scopes" -ForegroundColor $(if ($scopes -match 'repo') { "Green" } else { "Red" })
        if ($scopes -notmatch 'repo') {
            Write-Host "   ✗ Token is MISSING 'repo' scope!" -ForegroundColor Red
            Write-Host "   This is why you can't push even with SSO authorization." -ForegroundColor Yellow
        } else {
            Write-Host "   ✓ Token has 'repo' scope" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  Could not determine scopes from response headers" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check scopes" -ForegroundColor Yellow
}

# Check repository permissions
Write-Host "`n[3] Repository Permissions for Token Account:" -ForegroundColor Yellow
try {
    $repo = Invoke-RestMethod -Uri "https://api.github.com/repos/rv-qa-ga/rapid-dev" -Headers $headers -Method Get
    $permissions = $repo.permissions
    
    Write-Host "   Admin:  $($permissions.admin)" -ForegroundColor $(if ($permissions.admin) { "Green" } else { "Red" })
    Write-Host "   Push:   $($permissions.push)" -ForegroundColor $(if ($permissions.push) { "Green" } else { "Red" })
    Write-Host "   Pull:   $($permissions.pull)" -ForegroundColor $(if ($permissions.pull) { "Green" } else { "Gray" })
    
    if (-not $permissions.push) {
        Write-Host "`n   ✗ Token account does NOT have push permissions!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Error checking permissions: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary and recommendations
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "`nIf you can edit via web but token shows no push:" -ForegroundColor Yellow
Write-Host "1. Token might be for a DIFFERENT GitHub account" -ForegroundColor White
Write-Host "   → Create a new token with the account you use in browser" -ForegroundColor Gray
Write-Host "`n2. Token might be missing 'repo' scope" -ForegroundColor White
Write-Host "   → Go to: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "   → Edit your token and ensure 'repo' scope is checked" -ForegroundColor Gray
Write-Host "`n3. Organization might restrict API access differently" -ForegroundColor White
Write-Host "   → Contact repository admin to verify your API permissions" -ForegroundColor Gray
Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Verify token account matches your browser account" -ForegroundColor White
Write-Host "2. Check token has 'repo' scope at: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "3. If different account, create new token with correct account" -ForegroundColor White

