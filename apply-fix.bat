@echo off
echo ====================================================================
echo APPLYING TIMETABLE-SPECIFIC CONSTRAINTS FIX
echo ====================================================================
echo.
echo This will update your database to allow multiple timetables to coexist
echo without conflicts between Semester 3, 5, and 7.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Attempting automatic application...
node apply-constraint-fix.js

echo.
echo ====================================================================
echo.
echo If automatic application succeeded, restart your dev server:
echo    Press Ctrl+C in the terminal running "npm run dev"
echo    Then run: npm run dev
echo.
echo If automatic application failed, follow manual instructions:
echo    1. Open Supabase Dashboard
echo    2. Go to SQL Editor
echo    3. Open: database\fix-constraints-timetable-specific.sql
echo    4. Run the entire script
echo.
echo ====================================================================
pause
