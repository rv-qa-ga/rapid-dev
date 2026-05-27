@echo off
:: Launcher from repo root - runs the QA Feature File Generator tool
cd /d "%~dp0"
call tools\Generate-Feature-Files.bat
