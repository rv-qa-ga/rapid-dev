#!/usr/bin/env pwsh
# Cursor Settings Backup Script
# Backs up Cursor settings, extensions, and configurations before upgrade

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cursor Settings Backup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current date for backup folder name
$backupDate = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $PSScriptRoot "cursor-backup-$backupDate"

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "✅ Created backup directory: $backupDir" -ForegroundColor Green
Write-Host ""

# Cursor AppData paths
$cursorAppData = "$env:APPDATA\Cursor"
$cursorLocalAppData = "$env:LOCALAPPDATA\Programs\cursor"

# Backup items
$backupItems = @()

# 1. User Settings
$userSettings = Join-Path $cursorAppData "User\settings.json"
if (Test-Path $userSettings) {
    $dest = Join-Path $backupDir "settings.json"
    Copy-Item $userSettings $dest -Force
    $backupItems += "User Settings"
    Write-Host "✅ Backed up: User Settings" -ForegroundColor Green
} else {
    Write-Host "⚠️  User Settings not found: $userSettings" -ForegroundColor Yellow
}

# 2. Keybindings
$keybindings = Join-Path $cursorAppData "User\keybindings.json"
if (Test-Path $keybindings) {
    $dest = Join-Path $backupDir "keybindings.json"
    Copy-Item $keybindings $dest -Force
    $backupItems += "Keybindings"
    Write-Host "✅ Backed up: Keybindings" -ForegroundColor Green
} else {
    Write-Host "⚠️  Keybindings not found: $keybindings" -ForegroundColor Yellow
}

# 3. Extensions List
$extensions = Join-Path $cursorAppData "User\extensions.json"
if (Test-Path $extensions) {
    $dest = Join-Path $backupDir "extensions.json"
    Copy-Item $extensions $dest -Force
    $backupItems += "Extensions List"
    Write-Host "✅ Backed up: Extensions List" -ForegroundColor Green
} else {
    Write-Host "⚠️  Extensions list not found: $extensions" -ForegroundColor Yellow
}

# 4. Snippets (if any)
$snippetsDir = Join-Path $cursorAppData "User\snippets"
if (Test-Path $snippetsDir) {
    $dest = Join-Path $backupDir "snippets"
    Copy-Item $snippetsDir $dest -Recurse -Force
    $backupItems += "Snippets"
    Write-Host "✅ Backed up: Snippets" -ForegroundColor Green
}

# 5. Workspace Storage (if needed)
$workspaceStorage = Join-Path $cursorAppData "User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    $dest = Join-Path $backupDir "workspaceStorage"
    Copy-Item $workspaceStorage $dest -Recurse -Force
    $backupItems += "Workspace Storage"
    Write-Host "✅ Backed up: Workspace Storage" -ForegroundColor Green
}

# 6. State (UI state, etc.)
$state = Join-Path $cursorAppData "User\state.vscdb"
if (Test-Path $state) {
    $dest = Join-Path $backupDir "state.vscdb"
    Copy-Item $state $dest -Force
    $backupItems += "State"
    Write-Host "✅ Backed up: State" -ForegroundColor Green
}

# 7. Cursor-specific settings (if any)
$cursorSettings = Join-Path $cursorAppData "User\cursor-settings.json"
if (Test-Path $cursorSettings) {
    $dest = Join-Path $backupDir "cursor-settings.json"
    Copy-Item $cursorSettings $dest -Force
    $backupItems += "Cursor Settings"
    Write-Host "✅ Backed up: Cursor Settings" -ForegroundColor Green
}

# 8. Create a manifest file
$manifest = @{
    BackupDate = $backupDate
    BackupLocation = $backupDir
    ItemsBackedUp = $backupItems
    CursorAppData = $cursorAppData
    CursorLocalAppData = $cursorLocalAppData
} | ConvertTo-Json -Depth 3

$manifestPath = Join-Path $backupDir "backup-manifest.json"
$manifest | Out-File $manifestPath -Encoding UTF8
Write-Host "✅ Created backup manifest" -ForegroundColor Green

# 9. Export installed extensions list (readable format)
if (Test-Path $extensions) {
    try {
        $extData = Get-Content $extensions | ConvertFrom-Json
        $extList = @()
        foreach ($ext in $extData) {
            if ($ext.identifier) {
                $extList += "$($ext.identifier.id) - $($ext.identifier.id)"
            }
        }
        if ($extList.Count -gt 0) {
            $extListPath = Join-Path $backupDir "extensions-list.txt"
            $extList | Out-File $extListPath -Encoding UTF8
            Write-Host "✅ Created extensions list (readable)" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Could not parse extensions list" -ForegroundColor Yellow
    }
}

# 10. Backup workspace settings from current directory
$workspaceSettings = Join-Path $PSScriptRoot "..\.vscode\settings.json"
if (Test-Path $workspaceSettings) {
    $dest = Join-Path $backupDir "workspace-settings.json"
    Copy-Item $workspaceSettings $dest -Force
    $backupItems += "Workspace Settings"
    Write-Host "✅ Backed up: Workspace Settings (.vscode/settings.json)" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup Location: $backupDir" -ForegroundColor Yellow
Write-Host "Items Backed Up: $($backupItems.Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Items:" -ForegroundColor Cyan
foreach ($item in $backupItems) {
    Write-Host "  • $item" -ForegroundColor White
}
Write-Host ""
Write-Host "To restore after upgrade:" -ForegroundColor Cyan
Write-Host "  1. Copy files from $backupDir back to $cursorAppData\User\" -ForegroundColor White
Write-Host "  2. Reinstall extensions from extensions-list.txt" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open backup folder..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process explorer.exe -ArgumentList $backupDir

