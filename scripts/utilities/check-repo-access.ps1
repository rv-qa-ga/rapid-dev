# Check Repository Access and Permissions
param(
    [Parameter(Mandatory=$false)]
    [string]$Token,
    [Parameter(Mandatory=$false)]
    [string]$RepoOwner = "rv-qa-ga",
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "rapid-dev"
)

Write-Host "`n=== Checking Repository Access ===" -ForegroundColor Cyan

# If token not provided, try to get from git config or prompt
if (-not $Token) {
    Write-Host "`nToken not provided. Checking if we can use git credential helper..." -ForegroundColor Yellow
    Write-Host "For best results, provide token: .\check-repo-access.ps1 -Token 'YOUR_TOKEN'" -ForegroundColor Gray
    Write-Host "`nOr we can check via web interface..." -ForegroundColor Yellow
    Write-Host "`n=== Manual Check Steps ===" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/$RepoOwner/$RepoName" -ForegroundColor Yellow
    Write-Host "2. Try to create a new file or edit an existing file" -ForegroundColor Yellow
    Write-Host "3. If you can commit changes, you have write access" -ForegroundColor Green
    Write-Host "`n4. Check your role:" -ForegroundColor Yellow
    Write-Host "   https://github.com/$RepoOwner/$RepoName/settings/access" -ForegroundColor Yellow
    return
}

# Test with API
$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "PowerShell-Script"
}

try {
    Write-Host "`n[1/3] Testing authentication..." -ForegroundColor Yellow
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    Write-Host "✓ Authenticated as: $($user.login)" -ForegroundColor Green
    
    Write-Host "`n[2/3] Checking repository access..." -ForegroundColor Yellow
    $repo = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName" -Headers $headers -Method Get
    Write-Host "✓ Repository found: $($repo.full_name)" -ForegroundColor Green
    Write-Host "   Visibility: $($repo.visibility)" -ForegroundColor Gray
    
    Write-Host "`n[3/3] Checking your permissions..." -ForegroundColor Yellow
    $permissions = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName" -Headers $headers -Method Get | Select-Object -ExpandProperty permissions
    
    Write-Host "`n=== Your Permissions ===" -ForegroundColor Cyan
    Write-Host "Admin:  $($permissions.admin)" -ForegroundColor $(if ($permissions.admin) { "Green" } else { "Red" })
    Write-Host "Push:   $($permissions.push)" -ForegroundColor $(if ($permissions.push) { "Green" } else { "Red" })
    Write-Host "Pull:   $($permissions.pull)" -ForegroundColor $(if ($permissions.pull) { "Green" } else { "Red" })
    Write-Host "Maintain: $($permissions.maintain)" -ForegroundColor $(if ($permissions.maintain) { "Green" } else { "Red" })
    Write-Host "Triage: $($permissions.triage)" -ForegroundColor $(if ($permissions.triage) { "Green" } else { "Red" })
    
    if ($permissions.push -or $permissions.admin) {
        Write-Host "`n✓ You have WRITE access!" -ForegroundColor Green
        Write-Host "   You should be able to push to this repository." -ForegroundColor Green
    } else {
        Write-Host "`n✗ You do NOT have write access!" -ForegroundColor Red
        Write-Host "   You only have read (pull) access." -ForegroundColor Yellow
        Write-Host "   Contact repository admin to grant write access." -ForegroundColor Yellow
    }
    
    # Check if you're a collaborator
    Write-Host "`n[Bonus] Checking collaborator status..." -ForegroundColor Yellow
    try {
        $collaborators = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/collaborators/$($user.login)" -Headers $headers -Method Get
        Write-Host "✓ You are a collaborator on this repository" -ForegroundColor Green
        Write-Host "   Permission: $($collaborators.permissions | ConvertTo-Json -Compress)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠ Could not verify collaborator status (may need admin token)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 404) {
            Write-Host "   Repository not found or you don't have access to view it." -ForegroundColor Yellow
        } elseif ($statusCode -eq 403) {
            Write-Host "   Access forbidden. Possible issues:" -ForegroundColor Yellow
            Write-Host "   - Token needs SSO authorization for organization" -ForegroundColor Gray
            Write-Host "   - Token doesn't have 'repo' scope" -ForegroundColor Gray
            Write-Host "   - Rate limit exceeded" -ForegroundColor Gray
        } elseif ($statusCode -eq 401) {
            Write-Host "   Authentication failed. Token may be invalid or expired." -ForegroundColor Yellow
        }
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $errorJson = $responseBody | ConvertFrom-Json
            if ($errorJson.message) {
                Write-Host "   Message: $($errorJson.message)" -ForegroundColor Yellow
            }
        } catch {
            # Ignore JSON parsing errors
        }
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
if ($permissions.push -or $permissions.admin) {
    Write-Host "If you still get 403 when pushing:" -ForegroundColor White
    Write-Host "1. Verify token has SSO authorization (if org uses SSO)" -ForegroundColor Yellow
    Write-Host "2. Try: git push -u origin main" -ForegroundColor Yellow
} else {
    Write-Host "To get write access:" -ForegroundColor White
    Write-Host "1. Contact repository admin or organization owner" -ForegroundColor Yellow
    Write-Host "2. Request 'Write' or 'Admin' role on the repository" -ForegroundColor Yellow
    Write-Host "3. Repository settings: https://github.com/$RepoOwner/$RepoName/settings/access" -ForegroundColor Yellow
}

