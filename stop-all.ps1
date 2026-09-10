# ==============================================================================
# ZeroFraud360 — Unified 5-Service Ecosystem Stopper (PowerShell)
# Gracefully terminates all background services running on ports:
# 3000, 5173, 8000, 8080, 8081.
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         ZeroFraud360 Ecosystem - Stopping All Services          " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

$TargetPorts = @(
    @{ Port = 3000; Name = "Bank Simulator Frontend (Port 3000)" },
    @{ Port = 5173; Name = "ZeroFraud360 Officer Dashboard (Port 5173)" },
    @{ Port = 8000; Name = "ML_Brain AI API (Port 8000)" },
    @{ Port = 8080; Name = "IndianBankSimulation Backend (Port 8080)" },
    @{ Port = 8081; Name = "ZeroFraud360 Core Backend (Port 8081)" }
)

$stoppedCount = 0

foreach ($target in $TargetPorts) {
    $port = $target.Port
    $name = $target.Name
    
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            try {
                $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host " Stopping $name (PID: $procId - $($process.ProcessName))..." -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    $stoppedCount++
                }
            } catch {
                Write-Host " [WARN] Could not stop PID $procId for $name" -ForegroundColor Red
            }
        }
    } else {
        Write-Host " [OK] $name is not running." -ForegroundColor DarkGray
    }
}

Write-Host ""
if ($stoppedCount -gt 0) {
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host " SUCCESS: All active ZeroFraud360 services have been stopped!" -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Green
} else {
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host " All ports are already free. No active services found." -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Green
}
