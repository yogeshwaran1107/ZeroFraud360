@echo off
title Stop ZeroFraud360 Ecosystem
powershell -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1"
echo.
pause
