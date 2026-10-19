@echo off
cd /d "%~dp0"
call npm run projects:sync
echo.
pause
