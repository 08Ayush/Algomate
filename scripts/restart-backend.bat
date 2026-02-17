@echo off
REM Quick restart script for the scheduler API
REM Kills existing processes and starts fresh

echo Killing existing Python/Uvicorn processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM python3.11.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo.
echo Starting scheduler API on port 8001...
cd /d "%~dp0\..\services\optimized"
start "Scheduler API" cmd /k "python -m uvicorn api.routes:app --reload --port 8001"

echo.
echo Backend API started! Check the new window for logs.
echo Look for the 🔄 Splitting messages when you regenerate a timetable.
pause
