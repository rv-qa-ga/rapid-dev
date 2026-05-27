# Verify State_Province__c Field in Salesforce
# This script checks if the State_Province__c field exists and is accessible via API

param(
    [string]$InstanceUrl = "https://arx--qa.sandbox.my.salesforce.com",
    [string]$ApiVersion = "v58.0",
    [string]$AccessToken = ""
)

if (-not $AccessToken) {
    Write-Host "[ERROR] AccessToken is required" -ForegroundColor Red
    Write-Host "Usage: .\verify-state-province-field.ps1 -AccessToken 'YOUR_TOKEN'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nVerifying State_Province__c Field in Salesforce" -ForegroundColor Cyan
Write-Host "===============================================================`n" -ForegroundColor Cyan

# Step 1: Describe Account Object
Write-Host "Step 1: Describing Account object..." -ForegroundColor Yellow
$describeUrl = "$InstanceUrl/services/data/$ApiVersion/sobjects/Account/describe"
$headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Accept" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $describeUrl -Method Get -Headers $headers
    
    # Search for State_Province__c
    $stateField = $response.fields | Where-Object { $_.name -eq "State_Province__c" }
    
    if ($stateField) {
        Write-Host "`n[SUCCESS] Field EXISTS" -ForegroundColor Green
        Write-Host "---------------------------------------------------------------" -ForegroundColor Gray
        Write-Host "Name:        $($stateField.name)" -ForegroundColor White
        Write-Host "Label:        $($stateField.label)" -ForegroundColor White
        Write-Host "Type:         $($stateField.type)" -ForegroundColor White
        Write-Host "Createable:   $($stateField.createable)" -ForegroundColor $(if ($stateField.createable) { "Green" } else { "Red" })
        Write-Host "Updateable:   $($stateField.updateable)" -ForegroundColor $(if ($stateField.updateable) { "Green" } else { "Red" })
        Write-Host "Accessible:   $($stateField.accessible)" -ForegroundColor $(if ($stateField.accessible) { "Green" } else { "Red" })
        Write-Host "Nillable:     $($stateField.nillable)" -ForegroundColor White
        Write-Host "Required:     $(-not $stateField.nillable)" -ForegroundColor White
        
        if ($stateField.picklistValues) {
            Write-Host "`nPicklist Values:" -ForegroundColor Cyan
            $stateField.picklistValues | Where-Object { $_.active } | ForEach-Object {
                Write-Host "  - $($_.value)" -ForegroundColor Gray
            }
        }
        
        # Check if field is accessible
        if (-not $stateField.accessible) {
            Write-Host "`n[WARNING] Field exists but is NOT accessible (Field-Level Security)" -ForegroundColor Yellow
            Write-Host "   Check Field-Level Security settings for this field" -ForegroundColor Yellow
        }
        
        if (-not $stateField.createable) {
            Write-Host "`n[WARNING] Field exists but is NOT createable via API" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "`n[ERROR] Field DOES NOT EXIST" -ForegroundColor Red
        Write-Host "---------------------------------------------------------------" -ForegroundColor Gray
        
        # Search for similar fields
        Write-Host "`nSearching for similar fields..." -ForegroundColor Yellow
        $similarFields = $response.fields | Where-Object { 
            $_.name -like "*State*" -or $_.name -like "*Province*" -or $_.label -like "*State*" -or $_.label -like "*Province*"
        }
        
        if ($similarFields) {
            Write-Host "`nFound similar fields:" -ForegroundColor Cyan
            $similarFields | ForEach-Object {
                $color = if ($_.createable -and $_.accessible) { "Green" } else { "Yellow" }
                Write-Host "  - $($_.name) ($($_.label))" -ForegroundColor $color
                Write-Host "    Type: $($_.type), Createable: $($_.createable), Accessible: $($_.accessible)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  No similar fields found" -ForegroundColor Gray
        }
        
        # Check standard BillingState fields
        Write-Host "`nChecking standard Salesforce State fields..." -ForegroundColor Yellow
        $billingState = $response.fields | Where-Object { $_.name -eq "BillingState" }
        $billingStateCode = $response.fields | Where-Object { $_.name -eq "BillingStateCode" }
        
        if ($billingState) {
            Write-Host "  [OK] BillingState exists (Standard field)" -ForegroundColor Green
        }
        if ($billingStateCode) {
            Write-Host "  [OK] BillingStateCode exists (Standard field)" -ForegroundColor Green
        }
    }
    
    # Step 2: Try to query the field
    Write-Host "`n`nStep 2: Testing SOQL query with State_Province__c..." -ForegroundColor Yellow
    $queryUrl = "$InstanceUrl/services/data/$ApiVersion/query/?q=SELECT Id, Name, State_Province__c, Region__c FROM Account LIMIT 1"
    
    try {
        $queryResponse = Invoke-RestMethod -Uri $queryUrl -Method Get -Headers $headers
        Write-Host "[SUCCESS] Query SUCCESSFUL - Field can be queried" -ForegroundColor Green
        if ($queryResponse.records -and $queryResponse.records.Count -gt 0) {
            $record = $queryResponse.records[0]
            Write-Host "Sample record:" -ForegroundColor Cyan
            Write-Host "  Name: $($record.Name)" -ForegroundColor White
            Write-Host "  Region__c: $($record.Region__c)" -ForegroundColor White
            Write-Host "  State_Province__c: $($record.State_Province__c)" -ForegroundColor White
        }
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorResponse) {
            Write-Host "[ERROR] Query FAILED" -ForegroundColor Red
            Write-Host "  Error Code: $($errorResponse[0].errorCode)" -ForegroundColor Red
            Write-Host "  Message: $($errorResponse[0].message)" -ForegroundColor Red
        } else {
            Write-Host "[ERROR] Query FAILED: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Step 3: Try to create Account with State_Province__c
    Write-Host "`n`nStep 3: Testing Account creation with State_Province__c..." -ForegroundColor Yellow
    $createUrl = "$InstanceUrl/services/data/$ApiVersion/sobjects/Account"
    $createHeaders = @{
        "Authorization" = "Bearer $AccessToken"
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }
    $testAccountName = "Test Account Verify State $(Get-Date -Format 'yyyyMMddHHmmss')"
    $createBody = @{
        Name = $testAccountName
        Region__c = "US"
        Type = "Agency"
        State_Province__c = "New York"
        Account_Status__c = "Prospect"
    } | ConvertTo-Json
    
    try {
        $createResponse = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $createHeaders -Body $createBody
        Write-Host "[SUCCESS] Account creation SUCCESSFUL" -ForegroundColor Green
        Write-Host "  Account ID: $($createResponse.id)" -ForegroundColor White
        
        # Clean up - delete the test account
        Write-Host "`nCleaning up test account..." -ForegroundColor Yellow
        $deleteUrl = "$InstanceUrl/services/data/$ApiVersion/sobjects/Account/$($createResponse.id)"
        try {
            Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $headers | Out-Null
            Write-Host "[OK] Test account deleted" -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Could not delete test account: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorResponse) {
            Write-Host "[ERROR] Account creation FAILED" -ForegroundColor Red
            Write-Host "  Error Code: $($errorResponse[0].errorCode)" -ForegroundColor Red
            Write-Host "  Message: $($errorResponse[0].message)" -ForegroundColor Red
        } else {
            Write-Host "[ERROR] Account creation FAILED: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "`n[ERROR] Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n`n[SUCCESS] Verification Complete" -ForegroundColor Green
Write-Host "===============================================================`n" -ForegroundColor Cyan

