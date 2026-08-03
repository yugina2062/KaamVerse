$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $workspace 'Kaamverse-backend'
$frontend = Join-Path $workspace 'Kaamverse-forntend'
$python = Join-Path $backend '.venv\Scripts\python.exe'
$logDirectory = Join-Path $workspace '.dev-logs'
$backendOutLog = Join-Path $logDirectory 'backend.out.log'
$backendErrorLog = Join-Path $logDirectory 'backend.error.log'
$frontendOutLog = Join-Path $logDirectory 'frontend.out.log'
$frontendErrorLog = Join-Path $logDirectory 'frontend.error.log'

function Test-Endpoint([string] $Uri) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    }
    catch {
        return $false
    }
}

function Test-CompatibleBackend {
    try {
        Invoke-WebRequest -UseBasicParsing -Method Options -Uri 'http://127.0.0.1:8000/api/conversations/' -TimeoutSec 2 | Out-Null
        return $true
    }
    catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(401, 403, 405)) { return $true }
        return $false
    }
}

function Wait-ForEndpoint([string] $Name, [string] $Uri, $Process, [string] $ErrorLog) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Test-Endpoint $Uri) { return }
        if ($Process -and $Process.HasExited) {
            $details = if (Test-Path $ErrorLog) { (Get-Content -LiteralPath $ErrorLog -Tail 30) -join [Environment]::NewLine } else { 'No error log was produced.' }
            throw "$Name stopped during startup.`n$details"
        }
        Start-Sleep -Seconds 1
        if ($Process) { $Process.Refresh() }
    }
    throw "$Name did not become ready within 30 seconds. Check $ErrorLog"
}

if (-not (Test-Path $python)) {
    throw 'Backend virtual environment is missing. Create it and install requirements first.'
}

if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
    throw 'XAMPP MySQL is not running. Start MySQL in the XAMPP Control Panel first.'
}

Write-Host 'Applying database migrations...'
& $python (Join-Path $backend 'manage.py') migrate --noinput

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$backendProcess = $null
$frontendProcess = $null

if (Test-Endpoint 'http://127.0.0.1:8000/api/health/') {
    if (-not (Test-CompatibleBackend)) {
        throw 'Port 8000 is running an outdated KaamVerse backend. Stop that old terminal/process, then run .\start-dev.ps1 again.'
    }
    Write-Host 'Reusing the compatible backend already running on port 8000.' -ForegroundColor Yellow
}
else {
    $backendProcess = Start-Process -FilePath $python `
        -ArgumentList 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload' `
        -WorkingDirectory $backend `
        -WindowStyle Hidden `
        -RedirectStandardOutput $backendOutLog `
        -RedirectStandardError $backendErrorLog `
        -PassThru
    Wait-ForEndpoint 'The backend server' 'http://127.0.0.1:8000/api/health/' $backendProcess $backendErrorLog
}

if (Test-Endpoint 'http://127.0.0.1:8443') {
    Write-Host 'Reusing the frontend already running on port 8443.' -ForegroundColor Yellow
}
else {
    $frontendProcess = Start-Process -FilePath 'npx.cmd' `
        -ArgumentList '--yes', 'node@22.12.0', 'node_modules/vite/bin/vite.js', '--host', '0.0.0.0' `
        -WorkingDirectory $frontend `
        -WindowStyle Hidden `
        -RedirectStandardOutput $frontendOutLog `
        -RedirectStandardError $frontendErrorLog `
        -PassThru
    Wait-ForEndpoint 'The frontend server' 'http://127.0.0.1:8443' $frontendProcess $frontendErrorLog
}

Write-Host ''
Write-Host 'KaamVerse is running:' -ForegroundColor Green
Write-Host '  Frontend: http://localhost:8443'
Write-Host '  API:      http://127.0.0.1:8000/api/health/'
Write-Host '  Admin:    http://127.0.0.1:8000/admin/'
Write-Host ''
Write-Host 'Press Ctrl+C to stop both development servers.'

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($backendProcess) {
            $backendProcess.Refresh()
            if ($backendProcess.HasExited) {
                $details = if (Test-Path $backendErrorLog) { (Get-Content -LiteralPath $backendErrorLog -Tail 30) -join [Environment]::NewLine } else { 'No error log was produced.' }
                throw "The backend server stopped unexpectedly.`n$details"
            }
        }
        if ($frontendProcess) {
            $frontendProcess.Refresh()
            if ($frontendProcess.HasExited -and -not (Test-Endpoint 'http://127.0.0.1:8443')) {
                $details = if (Test-Path $frontendErrorLog) { (Get-Content -LiteralPath $frontendErrorLog -Tail 30) -join [Environment]::NewLine } else { 'No error log was produced.' }
                throw "The frontend server stopped unexpectedly.`n$details"
            }
        }
    }
}
finally {
    foreach ($process in @($backendProcess, $frontendProcess)) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
        }
    }
}
