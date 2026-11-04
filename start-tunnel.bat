@echo off
title WorkDen Cloudflare Tunnel
echo =======================================================
echo  Starting Cloudflare Tunnel to http://localhost:5000
echo =======================================================
cloudflared tunnel --url http://localhost:5000
pause
