$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Open("C:\Automation\E2EAutomation\data\excel\AccountMigrationMappingDocument_unprotected.xlsx")
$sheet = $wb.Sheets.Item("I accounts -> party")
$sheet.SaveAs("C:\Automation\E2EAutomation\sf-to-party-mapping.csv", 6)

$wb.Close($false)
$excel.Quit()

Write-Host "Exported to sf-to-party-mapping.csv"

