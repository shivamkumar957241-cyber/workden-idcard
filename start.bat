@echo off
title WorkDen ID Card Server
echo =======================================================
echo  Starting WorkDen ID Card Server on http://localhost:5000
echo =======================================================
if not exist "node_modules\dotenv" (
  echo [Notice] Installing required server dependencies...
  call npm install --omit=dev
)
if not exist "node_modules\sharp" (
  echo [Notice] Installing image rendering dependency...
  call npm install --omit=dev
)
node server/server.js
pause
