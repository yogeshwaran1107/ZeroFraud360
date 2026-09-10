# ==============================================================================
# ZeroFraud360 — Unified 5-Service Ecosystem Launcher (PowerShell)
# Launches all 3 Backend services and 2 Frontend applications in new terminal windows.
# Configured for Local, Mobile (Wi-Fi), and Remote / Internet access.
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         ZeroFraud360 Ecosystem - Full Orchestrator Launcher     " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Detect LAN / Wi-Fi IP address for mobile connectivity
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
if (-not $lanIp) { $lanIp = "127.0.0.1" }

# 1. Check MySQL
Write-Host "`n[1/6] Checking MySQL Service..." -ForegroundColor Cyan
$mysql = Get-Service -Name *mysql*,*mariadb* -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }
if ($mysql) {
    Write-Host "   MySQL is running: $($mysql.DisplayName)" -ForegroundColor Green
} else {
    Write-Host "   [WARN] No running MySQL service detected. Ensure MySQL is accessible on localhost:3306." -ForegroundColor Yellow
}

# 2. Launch ML_Brain (Port 8000, 0.0.0.0)
Write-Host "`n[2/6] Starting ML_Brain AI Engine on 0.0.0.0:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot/ML_BRAIN'; python app.py"

# 3. Launch IndianBankSimulation (Port 8080)
Write-Host "`n[3/6] Starting IndianBankSimulation Backend on Port 8080 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot/Backend/IndianBankSimulation'; ./mvnw.cmd spring-boot:run"

# 4. Launch ZeroFraud360 (Port 8081)
Write-Host "`n[4/6] Starting ZeroFraud360 Core Backend on Port 8081 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot/Backend/ZeroFraud360'; ./mvnw.cmd spring-boot:run"

# 5. Launch Bank Simulation Frontend (Port 3000, Host 0.0.0.0)
Write-Host "`n[5/6] Starting Bank Simulation Frontend UI on Port 3000 (0.0.0.0) ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot/Frontend/banking-simulator'; npm run dev -- --host 0.0.0.0"

# 6. Launch ZeroFraud360 Dashboard Frontend (Port 5173, Host 0.0.0.0)
Write-Host "`n[6/6] Starting ZeroFraud360 Officer Dashboard on Port 5173 (0.0.0.0) ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot/Frontend'; npm run dev -- --host 0.0.0.0"

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " ALL 5 APPLICATIONS LAUNCHED - MOBILE & REMOTE READY!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host " [LAPTOP LOCAL ACCESS]:" -ForegroundColor Yellow
Write-Host "   - Bank Simulator UI:          http://localhost:3000" -ForegroundColor White
Write-Host "   - ZeroFraud360 Officer UI:    http://localhost:5173" -ForegroundColor White
Write-Host "   - ML_Brain AI API:            http://localhost:8000/docs" -ForegroundColor White
Write-Host "   - IndianBankSimulation API:   http://localhost:8080" -ForegroundColor White
Write-Host "   - ZeroFraud360 Core API:      http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host " [MOBILE DEVICE ACCESS] (Connect mobile to same Wi-Fi as laptop):" -ForegroundColor Yellow
Write-Host "   - Bank Simulator on Mobile:   http://$($lanIp):3000" -ForegroundColor Cyan
Write-Host "   - Officer Dashboard on Mobile:http://$($lanIp):5173" -ForegroundColor Cyan
Write-Host ""
Write-Host " [INTERNET ACCESS OUTSIDE WI-FI / CELLULAR 4G/5G]:" -ForegroundColor Yellow
Write-Host "   Run .\start-tunnel.bat to create an instant public HTTPS internet link!" -ForegroundColor Magenta
Write-Host "`nTo run the end-to-end automated verification script at any time:" -ForegroundColor Yellow
Write-Host "   python scripts/verify_e2e_pipeline.py" -ForegroundColor Cyan
Write-Host "=================================================================`n" -ForegroundColor Green
