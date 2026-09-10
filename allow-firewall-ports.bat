@echo off
title ZeroFraud360 Windows Firewall Port Helper
echo =================================================================
echo   ZeroFraud360 - Opening Inbound Ports for Mobile Device Access
echo =================================================================
echo.
echo Allowing inbound traffic on ports:
echo   - 3000  (Bank Simulator UI)
echo   - 5173  (ZeroFraud360 Officer UI)
echo   - 8000  (ML Brain AI Engine)
echo   - 8080  (IndianBankSimulation API)
echo   - 8081  (ZeroFraud360 Core API)
echo.

netsh advfirewall firewall delete rule name="ZeroFraud360 Ecosystem Ports" >nul 2>&1
netsh advfirewall firewall add rule name="ZeroFraud360 Ecosystem Ports" dir=in action=allow protocol=TCP localport=3000,5173,8000,8080,8081

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Ports 3000, 5173, 8000, 8080, 8081 are now allowed through Windows Firewall!
    echo Your mobile phone can now connect with zero connection blocks.
) else (
    echo [NOTE] If you see access denied, please right click this file and select 'Run as administrator'.
)

echo.
pause
