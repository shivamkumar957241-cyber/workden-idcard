@echo off
title WorkDen Git Setup
echo =======================================================
echo   Setting up Git Repository for WorkDen Portal...
echo =======================================================
git init
git remote remove origin 2>nul
git remote add origin https://github.com/shivamkumar957241-cyber/workden-idcard.git
git fetch origin main
git checkout -f main
echo.
echo =======================================================
echo   Done! Git connected successfully.
echo   From now on, just double click update.bat anytime.
echo =======================================================
pause
