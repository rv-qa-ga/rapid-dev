# Get Salesforce Access Token
# This script uses the existing JWT authentication to get an access token for Postman/API testing

param(
    [string]$Environment = "qa"
)

Write-Host "`nGetting Salesforce Access Token..." -ForegroundColor Cyan
Write-Host "===============================================================`n" -ForegroundColor Cyan

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js to use this script" -ForegroundColor Yellow
    exit 1
}

# Create a temporary TypeScript file to get the token
$tempScript = @"
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';

async function getToken() {
  try {
    const authResult = await SalesforceJWTAuth.authenticate();
    console.log(JSON.stringify({
      accessToken: authResult.accessToken,
      instanceUrl: authResult.instanceUrl,
      tokenType: authResult.tokenType
    }, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getToken();
"@

$tempFile = Join-Path $env:TEMP "get-token-$(Get-Date -Format 'yyyyMMddHHmmss').ts"
$tempScript | Out-File -FilePath $tempFile -Encoding UTF8

try {
    Write-Host "Authenticating with Salesforce using JWT..." -ForegroundColor Yellow
    
    # Set environment variable if provided
    if ($Environment) {
        $env:ENV = $Environment
    }
    
    # Run the script using ts-node
    $result = node -r ts-node/register $tempFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $tokenData = $result | ConvertFrom-Json
        
        Write-Host "`n[SUCCESS] Authentication successful!" -ForegroundColor Green
        Write-Host "===============================================================" -ForegroundColor Gray
        Write-Host "Access Token:" -ForegroundColor Cyan
        Write-Host $tokenData.accessToken -ForegroundColor White
        Write-Host "`nInstance URL:" -ForegroundColor Cyan
        Write-Host $tokenData.instanceUrl -ForegroundColor White
        Write-Host "`nToken Type:" -ForegroundColor Cyan
        Write-Host $tokenData.tokenType -ForegroundColor White
        Write-Host "===============================================================" -ForegroundColor Gray
        
        Write-Host "`nCopy the Access Token above for use in Postman or API calls" -ForegroundColor Yellow
    } else {
        Write-Host "`n[ERROR] Authentication failed" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERROR] Failed to get access token: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}

