$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example. Set the four database passwords, then run this script again."
  exit 1
}

$envLines = New-Object 'System.Collections.Generic.List[string]'
foreach ($line in (Get-Content ".env")) {
  $envLines.Add($line)
}

foreach ($key in @("MYSQL_ROOT_PASSWORD", "CONTACT_DB_PASSWORD", "CAREER_DB_PASSWORD", "DISTRIBUTOR_DB_PASSWORD")) {
  $matches = @($envLines | Where-Object { $_ -match ("^{0}=" -f [regex]::Escape($key)) })
  if ($matches.Count -ne 1 -or [string]::IsNullOrWhiteSpace(($matches[0] -split "=", 2)[1]) -or $matches[0] -match "CHANGE_ME") {
    throw "Set a unique, non-empty $key in .env before configuring Gmail."
  }
}

$securePassword = Read-Host "Enter the 16-character Google App Password for preetikumari3224@gmail.com (input is hidden)" -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $appPassword = $appPassword -replace "\s", ""
  if ($appPassword -notmatch "^[A-Za-z0-9]{16}$") {
    throw "The Google App Password must contain 16 letters or digits. No changes were made."
  }

  $settings = [ordered]@{
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = "587"
    SMTP_AUTH = "true"
    SMTP_USERNAME = "preetikumari3224@gmail.com"
    SMTP_PASSWORD = $appPassword
    SMTP_SSL = "false"
    SMTP_STARTTLS = "true"
    MAIL_FROM = "preetikumari3224@gmail.com"
    CONTACT_NOTIFICATION_EMAIL = "preetikumari3224@gmail.com"
    CAREER_NOTIFICATION_EMAIL = "preetikumari3224@gmail.com"
    DISTRIBUTOR_NOTIFICATION_EMAIL = "preetikumari3224@gmail.com"
  }

  foreach ($key in $settings.Keys) {
    $found = $false
    for ($i = 0; $i -lt $envLines.Count; $i++) {
      if ($envLines[$i] -match ("^{0}=" -f [regex]::Escape($key))) {
        if ($found) {
          throw "Duplicate $key entries in .env. Remove the duplicate and run this script again."
        }
        $envLines[$i] = "$key=$($settings[$key])"
        $found = $true
      }
    }
    if (-not $found) {
      $envLines.Add("$key=$($settings[$key])")
    }
  }

  [System.IO.File]::WriteAllLines(
    (Join-Path (Get-Location) ".env"),
    $envLines,
    [System.Text.UTF8Encoding]::new($false)
  )
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $appPassword = $null
  if ($securePassword) {
    $securePassword.Dispose()
  }
}

docker compose up -d --force-recreate contact-api career-api distributor-api
if ($LASTEXITCODE -ne 0) {
  throw "Could not restart the APIs. Check 'docker compose logs contact-api career-api distributor-api' and try again."
}

$pending = @("contact-api", "career-api", "distributor-api")
for ($attempt = 0; $attempt -lt 60 -and $pending.Count -gt 0; $attempt++) {
  foreach ($service in @($pending)) {
    $containerId = docker compose ps -q $service
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
      continue
    }
    $health = docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerId
    if ($health -eq "healthy") {
      $pending = @($pending | Where-Object { $_ -ne $service })
    } elseif ($health -eq "unhealthy" -or $health -eq "exited") {
      throw "$service is $health. Check 'docker compose logs $service'. The saved applications remain in MySQL."
    }
  }
  if ($pending.Count -gt 0) {
    Start-Sleep -Seconds 2
  }
}

if ($pending.Count -gt 0) {
  throw "Timed out waiting for healthy services: $($pending -join ', '). Check their Docker logs."
}

Write-Host "Gmail SMTP is configured for real-time notifications."
Write-Host "Admin notifications and applicant confirmations are sent from preetikumari3224@gmail.com."
Write-Host "Submit a contact, careers, or distributor form to verify delivery in Gmail."
