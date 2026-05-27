# Git Branch Cleanup Script for Solo Developer
# This script helps clean up stale branches and PRs

param(
    [switch]$DryRun = $false,
    [switch]$ListOnly = $false
)

Write-Host "=== Git Branch Cleanup Utility ===" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "Error: Not in a git repository" -ForegroundColor Red
    exit 1
}

# Get current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow
Write-Host ""

# Fetch latest from remote
Write-Host "Fetching latest from remote..." -ForegroundColor Cyan
git fetch origin --prune

Write-Host ""
Write-Host "=== Branch Status ===" -ForegroundColor Cyan
Write-Host ""

# List all branches
$allBranches = git branch -a | ForEach-Object { $_.Trim() -replace '^\*\s*', '' -replace '^remotes/origin/', '' } | Where-Object { $_ -ne 'HEAD' } | Sort-Object -Unique

# Get branches that are merged into main
Write-Host "Branches merged into main:" -ForegroundColor Green
$mergedBranches = git branch --merged main | ForEach-Object { $_.Trim() -replace '^\*\s*', '' } | Where-Object { $_ -ne 'main' }
if ($mergedBranches) {
    $mergedBranches | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Gray }
} else {
    Write-Host "  (none)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Branches NOT merged into main:" -ForegroundColor Yellow
$unmergedBranches = git branch --no-merged main | ForEach-Object { $_.Trim() -replace '^\*\s*', '' } | Where-Object { $_ -ne 'main' }
if ($unmergedBranches) {
    $unmergedBranches | ForEach-Object { 
        $branch = $_
        $lastCommit = git log -1 --format="%ar" $branch 2>$null
        $ahead = (git rev-list --count main..$branch 2>$null)
        $behind = (git rev-list --count $branch..main 2>$null)
        Write-Host "  ⚠ $_" -ForegroundColor Yellow
        Write-Host "     Last commit: $lastCommit | Ahead: $ahead | Behind: $behind" -ForegroundColor Gray
    }
} else {
    Write-Host "  (none)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Remote branches:" -ForegroundColor Cyan
$remoteBranches = git branch -r | ForEach-Object { $_.Trim() -replace '^remotes/origin/', '' } | Where-Object { $_ -ne 'HEAD' -and $_ -ne 'main' }
if ($remoteBranches) {
    $remoteBranches | ForEach-Object { Write-Host "  → $_" -ForegroundColor Gray }
} else {
    Write-Host "  (none)" -ForegroundColor Gray
}

if ($ListOnly) {
    Write-Host ""
    Write-Host "=== List Only Mode - No actions taken ===" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "=== Cleanup Recommendations ===" -ForegroundColor Cyan
Write-Host ""

# Check for stale branches (older than 30 days)
$staleBranches = @()
foreach ($branch in $unmergedBranches) {
    $lastCommitDate = git log -1 --format="%ai" $branch 2>$null
    if ($lastCommitDate) {
        $commitDate = [DateTime]::Parse($lastCommitDate)
        $daysOld = (Get-Date) - $commitDate
        if ($daysOld.Days -gt 30) {
            $staleBranches += $branch
            Write-Host "⚠ Stale branch: $branch (last commit: $($daysOld.Days) days ago)" -ForegroundColor Yellow
        }
    }
}

if ($staleBranches.Count -eq 0) {
    Write-Host "No stale branches found (older than 30 days)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Suggested Actions ===" -ForegroundColor Cyan
Write-Host ""

# Suggest deleting merged branches
if ($mergedBranches) {
    Write-Host "1. Delete merged branches (safe to delete):" -ForegroundColor Green
    foreach ($branch in $mergedBranches) {
        if ($branch -ne $currentBranch) {
            if ($DryRun) {
                Write-Host "   [DRY RUN] Would delete: $branch" -ForegroundColor Gray
            } else {
                Write-Host "   Delete: $branch" -ForegroundColor Yellow
                $response = Read-Host "   Delete local branch '$branch'? (y/N)"
                if ($response -eq 'y' -or $response -eq 'Y') {
                    git branch -d $branch
                    Write-Host "   ✓ Deleted local branch: $branch" -ForegroundColor Green
                    
                    # Check if remote branch exists
                    $remoteExists = git ls-remote --heads origin $branch
                    if ($remoteExists) {
                        $response2 = Read-Host "   Delete remote branch 'origin/$branch'? (y/N)"
                        if ($response2 -eq 'y' -or $response2 -eq 'Y') {
                            git push origin --delete $branch
                            Write-Host "   ✓ Deleted remote branch: $branch" -ForegroundColor Green
                        }
                    }
                }
            }
        }
    }
}

Write-Host ""
Write-Host "2. Review unmerged branches:" -ForegroundColor Yellow
Write-Host "   Consider merging, archiving, or deleting these branches"
Write-Host "   Use: git checkout <branch> to review"
Write-Host "   Use: git log main..<branch> to see commits"

Write-Host ""
Write-Host "3. Update main branch:" -ForegroundColor Cyan
Write-Host "   git checkout main"
Write-Host "   git pull origin main"

if ($DryRun) {
    Write-Host ""
    Write-Host "=== DRY RUN MODE - No changes made ===" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
}

Write-Host ""
Write-Host "For more information, see: docs/GIT_WORKFLOW_PROCESS.md" -ForegroundColor Cyan
