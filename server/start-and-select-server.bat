@echo off
echo ============================================================
echo    DMS SERVER - Database Selection
echo ============================================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing server dependencies...
    call npm install
    echo.
)

echo Starting server with database selection...
echo.
node server.js --select

pause
