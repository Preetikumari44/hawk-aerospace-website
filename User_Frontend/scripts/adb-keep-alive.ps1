# ADB Keep-Alive Script - Prevents wireless ADB disconnections
# Run this in a separate terminal: powershell -ExecutionPolicy Bypass -File scripts/adb-keep-alive.ps1

param(
    [int]$CheckInterval = 10
)

Write-Host "ADB Keep-Alive Monitor Started" -ForegroundColor Green
Write-Host "Checking connection every $CheckInterval seconds..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$lastDeviceId = $null

while ($true) {
    try {
        # Get connected devices
        $devices = adb devices | Select-String -Pattern "device$" | Where-Object { $_ -notmatch "List of devices" }
        
        if ($devices) {
            $currentDevice = ($devices[0] -split '\s+')[0]
            
            if ($lastDeviceId -ne $currentDevice) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Device connected: $currentDevice" -ForegroundColor Green
                $lastDeviceId = $currentDevice
            }
            
            # Keep connection alive with a lightweight command
            adb shell "echo keepalive" | Out-Null
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Connection alive" -ForegroundColor Gray
        }
        else {
            if ($lastDeviceId -ne $null) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Device disconnected! Attempting reconnect..." -ForegroundColor Red
                $lastDeviceId = $null
            }
            
            # Try to reconnect to last known wireless device
            $wifiDevices = adb devices | Select-String -Pattern "\d+\.\d+\.\d+\.\d+"
            if ($wifiDevices) {
                $ipAddress = ($wifiDevices[0] -split ':')[0]
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Reconnecting to $ipAddress..." -ForegroundColor Yellow
                adb connect "$ipAddress:5555" | Out-Null
            }
        }
    }
    catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $CheckInterval
}
