# Script to remove hardcoded credentials from git history
# WARNING: This rewrites git history and requires force push
# 
# IMPORTANT: 
# 1. Rotate the exposed credentials immediately (password, security token)
# 2. Coordinate with team - they'll need to re-clone after this
# 3. Backup your repository before running this
#
# Usage: .\scripts\utilities\remove-credentials-from-history.ps1

Write-Host "=== Removing Credentials from Git History ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "WARNING: This will rewrite git history!" -ForegroundColor Red
Write-Host "All team members will need to re-clone the repository after this." -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Are you sure you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Creating backup branch..." -ForegroundColor Cyan
git branch backup-before-credential-removal-$(Get-Date -Format "yyyyMMdd-HHmmss")

Write-Host ""
Write-Host "Step 2: Removing credentials from all commits..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Gray

# Use git filter-branch to replace credentials in the file
# Replace username
git filter-branch --force --index-filter `
    "git rm --cached --ignore-unmatch recorded-account-creation.js 2>$null || true && 
     if git checkout HEAD -- recorded-account-creation.js 2>$null; then
         sed -i 's/ravi\.vazhenkhat@accelins\.com\.qa/\${SF_USERNAME}/g' recorded-account-creation.js 2>$null || 
         (Get-Content recorded-account-creation.js) -replace 'ravi\.vazhenkhat@accelins\.com\.qa', '\${SF_USERNAME}' | Set-Content recorded-account-creation.js
         git add recorded-account-creation.js 2>$null || true
     fi" `
    --prune-empty --tag-name-filter cat -- --all

# Alternative: Use BFG Repo-Cleaner (more efficient, but requires Java)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
# java -jar bfg.jar --replace-text credentials.txt

Write-Host ""
Write-Host "Step 3: Cleaning up refs..." -ForegroundColor Cyan
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Review the changes: git log --all" -ForegroundColor White
Write-Host "2. Verify credentials are removed: git show HEAD:recorded-account-creation.js" -ForegroundColor White
Write-Host "3. Force push to remote: git push --force --all" -ForegroundColor Yellow
Write-Host "4. Notify team members to re-clone the repository" -ForegroundColor Yellow
Write-Host "5. ROTATE THE EXPOSED CREDENTIALS IMMEDIATELY" -ForegroundColor Red
Write-Host ""

