# Kill automation browsers and any process that might spawn them (run in PowerShell from repo root)

$names = @('chrome', 'chromium', 'msedge', 'msedgewebview2', 'node', 'chromedriver')
foreach ($n in $names) {
  $procs = Get-Process -Name $n -ErrorAction SilentlyContinue
  if ($procs) {
    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped: $n ($($procs.Count) process(es))"
  }
}
Write-Host "Done. All browser and Node processes terminated."
Write-Host "Tip: Keep HEADLESS=true in src/config/env/.env.qa so API tests do not open browser windows."
