@echo off
title WorkDen WAL Backup Recovery Tool
echo =======================================================
echo   WORKDEN WAL BACKUP RECOVERY TOOL
echo =======================================================
echo.

echo [1/2] Stopping running server processes...
taskkill /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
taskkill /F /IM node.exe >nul 2>&1

echo [2/2] Recovering data from server\backups\ (without deleting backups)...
node server/recover-from-wal.js

echo.
echo =======================================================
echo   Recovery finished! Now double-click start.bat
echo =======================================================
pause
