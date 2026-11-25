@echo off
setlocal EnableDelayedExpansion
title Update WorkDen Portal to Latest Version

(
echo =======================================================
echo   UPDATING WORKDEN PORTAL TO LATEST VERSION
echo =======================================================
echo.

echo [1/5] Stopping running server processes...
taskkill /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
taskkill /F /IM node.exe >nul 2>&1

echo [2/5] Backing up local database...
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%I"
set "BKDIR=server\backups\pre-update-!TS!"
if exist "server\workden_idcard.db*" (
  mkdir "!BKDIR!" >nul 2>&1
  copy /Y "server\workden_idcard.db*" "!BKDIR!\" >nul 2>&1
  echo Backup saved to !BKDIR!
) else (
  echo No existing database found to back up.
)

echo [3/5] Fetching latest files from GitHub...
git fetch origin main
git checkout -B main origin/main
git reset --hard origin/main

echo [4/5] Installing dependencies and verifying database...
call npm install --omit=dev >nul 2>&1
if not exist "server\workden_idcard.db" (
  if exist "!BKDIR!\workden_idcard.db" (
    copy /Y "!BKDIR!\workden_idcard.db*" "server\" >nul 2>&1
    echo Local database restored from pre-update backup.
  )
)
node server/repair-db.js

echo [5/5] Checking current version:
git log -1 --oneline

echo.
echo =======================================================
echo   Update Completed Successfully!
echo   Now double click start.bat to start the updated portal.
echo =======================================================
pause
exit /b
)
