@echo off
title Update WorkDen Portal to Latest Version
echo =======================================================
echo   UPDATING WORKDEN PORTAL TO LATEST VERSION
echo =======================================================
echo.

echo [1/3] Closing running server processes...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] Fetching latest files from GitHub...
git fetch origin main
git checkout -B main origin/main
git reset --hard origin/main

echo [3/3] Checking current version:
git log -1 --oneline

echo.
echo =======================================================
echo   Update Completed Successfully!
echo   Now double click start.bat to start the updated portal.
echo =======================================================
pause
