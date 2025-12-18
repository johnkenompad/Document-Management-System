@echo off
echo ============================================================
echo    DMS SERVER - Quick Start
echo ============================================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing server dependencies...
    call npm install
    echo.
)

echo Starting server...
echo (Using last selected database)
echo.
echo To change database, use: start-with-selection.bat
echo.
node server.js

pause
