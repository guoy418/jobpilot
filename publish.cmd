@echo off
setlocal

powershell.exe -ExecutionPolicy Bypass -File "%~dp0tools\publish.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Publish failed with exit code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
