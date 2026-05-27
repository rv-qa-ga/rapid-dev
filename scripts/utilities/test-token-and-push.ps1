# Test Token and Push Script
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "`n=== Testing Token and Repository Access ===" -ForegroundColor Cyan

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "PowerShell-Script"
}

# Test 1: Check token validity
Write-Host "`n[1/4] Testing token validity..." -ForegroundColor Yellow
try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    Write-Host "✓ Token is valid! Authenticated as: $($user.login)" -ForegroundColor Green
} catch {
    Write-Host "✗ Token is invalid or expired!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    return
}

# Test 2: Check repository access
Write-Host "`n[2/4] Testing repository access..." -ForegroundColor Yellow
try {
    $repo = Invoke-RestMethod -Uri "https://api.github.com/repos/rv-qa-ga/rapid-dev" -Headers $headers -Method Get
    Write-Host "✓ Repository access confirmed!" -ForegroundColor Green
    Write-Host "  Repository: $($repo.full_name)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Cannot access repository!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "`n  Possible causes:" -ForegroundColor Yellow
        Write-Host "  - Token not SSO authorized for 'rv-qa-ga' organization" -ForegroundColor Gray
        Write-Host "  - Token missing 'repo' scope" -ForegroundColor Gray
        Write-Host "  - Organization-level restrictions" -ForegroundColor Gray
    }
    return
}

# Test 3: Check permissions
Write-Host "`n[3/4] Checking your permissions..." -ForegroundColor Yellow
try {
    $repo = Invoke-RestMethod -Uri "https://api.github.com/repos/rv-qa-ga/rapid-dev" -Headers $headers -Method Get
    $permissions = $repo.permissions
    
    Write-Host "  Admin:  $($permissions.admin)" -ForegroundColor $(if ($permissions.admin) { "Green" } else { "Gray" })
    Write-Host "  Push:   $($permissions.push)" -ForegroundColor $(if ($permissions.push) { "Green" } else { "Red" })
    Write-Host "  Pull:   $($permissions.pull)" -ForegroundColor $(if ($permissions.pull) { "Green" } else { "Gray" })
    
    if (-not $permissions.push) {
        Write-Host "`n✗ You do NOT have push permissions!" -ForegroundColor Red
        Write-Host "  Contact repository admin to grant write access." -ForegroundColor Yellow
        return
    }
} catch {
    Write-Host "⚠ Could not check permissions" -ForegroundColor Yellow
}

# Test 4: Try setting remote with token
Write-Host "`n[4/4] Setting up remote with token..." -ForegroundColor Yellow
$remoteUrl = "https://$Token@github.com/rv-qa-ga/rapid-dev.git"
Write-Host "  Remote URL configured (token embedded)" -ForegroundColor Gray

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "Run these commands:" -ForegroundColor White
Write-Host "  git remote set-url origin `"$remoteUrl`"" -ForegroundColor Cyan
Write-Host "  git push -u origin main" -ForegroundColor Cyan
Write-Host "`nAfter successful push, remove token from URL:" -ForegroundColor Yellow
Write-Host "  git remote set-url origin https://github.com/rv-qa-ga/rapid-dev.git" -ForegroundColor Cyan

