@echo off
title Update WorkDen Portal
echo =======================================================
echo   Pulling Latest WorkDen Portal Updates from GitHub...
echo =======================================================
git pull origin main
echo.
echo =======================================================
echo   Update Completed!
echo   Please close and restart start.bat to run the latest version.
echo =======================================================
pause
