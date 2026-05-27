@echo off
setlocal EnableDelayedExpansion
title Feature File Generator - QA Tool

:: Change to repo root (parent of tools folder)
cd /d "%~dp0"
cd ..

echo.
echo  ============================================================
echo    FEATURE FILE GENERATOR (Jira -^> UI/API .feature files)
echo  ============================================================
echo.
echo  This tool generates Gherkin feature files from Jira work items.
echo  Default: Mode 4 (Risk-Based Testing) - UI scenarios + minimal API.
echo.

:: Prompt for work item(s)
set "WORKITEMS="
set /p "WORKITEMS=Enter Jira work item(s), space-separated (e.g. SF-451 or SF-645 SF-646 SF-647): "
if "!WORKITEMS!"=="" (
  echo You did not enter any work items. Will process ALL items in QA queue.
  echo.
) else (
  echo Work item(s): !WORKITEMS!
  echo.
)

:: Prompt for mode
echo Generation modes:
echo   1 = User Scenarios Only
echo   2 = User Scenarios + Augmentation
echo   3 = Generator Only
echo   4 = Risk-Based Testing (RBT) - recommended for QA
echo.
set /p "MODE=Enter mode (1-4, default 4): "
if "!MODE!"=="" set "MODE=4"
if "!MODE!"=="1" set "MODE=1"
if "!MODE!"=="2" set "MODE=2"
if "!MODE!"=="3" set "MODE=3"
if "!MODE!"=="4" set "MODE=4"
echo Using mode: !MODE!
echo.

:: Prompt for overwrite
set /p "OVERWRITE=Overwrite existing feature files? (Y/N, default N): "
if /i "!OVERWRITE!"=="Y" (
  set "OVERWRITE_FLAG=--overwrite"
  echo Overwrite: Yes
) else (
  set "OVERWRITE_FLAG="
  echo Overwrite: No
)
echo.

:: Build and run npm command
echo  ------------------------------------------------------------
echo  Running generator...
echo  ------------------------------------------------------------
echo.

if "!WORKITEMS!"=="" (
  if "!OVERWRITE_FLAG!"=="" (
    npm run process:new-qa-items -- --mode !MODE!
  ) else (
    npm run process:new-qa-items -- --mode !MODE! !OVERWRITE_FLAG!
  )
) else (
  if "!OVERWRITE_FLAG!"=="" (
    npm run process:new-qa-items -- --mode !MODE! !WORKITEMS!
  ) else (
    npm run process:new-qa-items -- --mode !MODE! !OVERWRITE_FLAG! !WORKITEMS!
  )
)

set "EXITCODE=!ERRORLEVEL!"
echo.
echo  ------------------------------------------------------------
if !EXITCODE! equ 0 (
  echo  Done. Check src/features/ui and src/features/api for .feature files.
) else (
  echo  Generator finished with errors. Check output above.
)
echo  ------------------------------------------------------------
echo.
pause
exit /b !EXITCODE!
