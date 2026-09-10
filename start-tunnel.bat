@echo off
title ZeroFraud360 Public Internet Tunnel
echo =================================================================
echo     ZeroFraud360 - Public Internet Tunnel for Mobile Access
echo =================================================================
echo.
echo Choose which application to expose over the internet:
echo.
echo   [1] Bank Simulator UI (Port 3000 - includes backend proxy)
echo   [2] ZeroFraud360 Officer Dashboard (Port 5173)
echo.
set /p choice="Enter choice [1 or 2] (Default 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="2" (
    echo.
    echo Exposing ZeroFraud360 Officer Dashboard (Port 5173) to the public internet...
    echo You will see an HTTPS URL below. Open that URL on your mobile phone!
    echo.
    npx localtunnel --port 5173
) else (
    echo.
    echo Exposing Bank Simulator (Port 3000) to the public internet...
    echo All backend APIs are automatically reverse-proxied over this single URL!
    echo You will see an HTTPS URL below. Open that URL on your mobile phone!
    echo.
    npx localtunnel --port 3000
)

pause
