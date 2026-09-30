# Development Script with Auto-Reconnect
# This runs Metro bundler and keeps ADB connection alive
# Usage: powershell -ExecutionPolicy Bypass -File scripts/dev-with-reconnect.ps1

Write-Host "Starting React Native Development with Auto-Reconnect" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if ADB is available
if (!(Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: ADB not found in PATH" -ForegroundColor Red
    exit 1
}

# Check for connected devices
$devices = adb devices | Select-String -Pattern "device$" | Where-Object { $_ -notmatch "List of devices" }
if (!$devices) {
    Write-Host "WARNING: No devices connected" -ForegroundColor Yellow
    Write-Host "Please connect your device via USB or WiFi" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For WiFi debugging:" -ForegroundColor Cyan
    Write-Host "  1. Connect phone and computer to same WiFi" -ForegroundColor Gray
    Write-Host "  2. Get phone IP from Settings > About > Status" -ForegroundColor Gray
    Write-Host "  3. Run: adb connect <phone-ip>:5555" -ForegroundColor Gray
    exit 1
}

Write-Host "Device connected:" -ForegroundColor Green
adb devices
Write-Host ""

# Start Metro bundler in background
Write-Host "Starting Metro bundler..." -ForegroundColor Cyan
$metroJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm start
}

Start-Sleep -Seconds 3

# Start ADB keep-alive monitor
Write-Host "Starting ADB keep-alive monitor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Development environment ready!" -ForegroundColor Green
Write-Host "Metro bundler running in background" -ForegroundColor Gray
Write-Host "ADB connection monitor active" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Monitor loop
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if Metro is still running
        if ($metroJob.State -ne "Running") {
            Write-Host "Metro bundler stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        # Check ADB connection
        $devices = adb devices | Select-String -Pattern "device$" | Where-Object { $_ -notmatch "List of devices" }
        if (!$devices) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Device disconnected! Reconnecting..." -ForegroundColor Yellow
            
            # Try to reconnect
            $history = adb devices -l | Select-String -Pattern "\d+\.\d+\.\d+\.\d+"
            if ($history) {
                $ipAddress = ($history[0] -split ':')[0].Trim()
                adb connect "$ipAddress:5555" | Out-Null
                Start-Sleep -Seconds 2
            }
        }
        
        # Keep connection alive
        adb shell "echo 1" | Out-Null
    }
}
finally {
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    Stop-Job -Job $metroJob -ErrorAction SilentlyContinue
    Remove-Job -Job $metroJob -ErrorAction SilentlyContinue
    Write-Host "Development environment stopped" -ForegroundColor Gray
}
