@echo off
title Edit WorkDen Environment Settings (.env)
if not exist ".env" (
  copy /Y ".env.example" ".env" >nul 2>&1
)
start notepad.exe ".env"
