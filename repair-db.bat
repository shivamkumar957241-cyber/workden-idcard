@echo off
title WorkDen Database Repair Tool
echo =======================================================
echo   WORKDEN DATABASE HEALTH CHECK ^& REPAIR TOOL
echo =======================================================
echo.

echo [1/2] Stopping running server processes...
taskkill /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
taskkill /F /IM node.exe >nul 2>&1

echo [2/2] Checking and repairing database...
node server/repair-db.js

echo.
echo =======================================================
echo   Done! You can now double-click start.bat
echo =======================================================
pause
