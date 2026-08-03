param(
    [string] $ApiBase = 'http://127.0.0.1:8000/api'
)

$ErrorActionPreference = 'Stop'

function Get-Session([string] $Email, [string] $Password, [string] $ExpectedRole) {
    $payload = @{ email = $Email; password = $Password } | ConvertTo-Json
    $response = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/token/" -ContentType 'application/json' -Body $payload
    if ($response.user.role -ne $ExpectedRole) {
        throw "Role mismatch for $Email. Expected $ExpectedRole, received $($response.user.role)."
    }
    return @{ Authorization = "Bearer $($response.access)" }
}

function Test-Get([hashtable] $Headers, [string] $Path) {
    $null = Invoke-RestMethod -Method Get -Uri "$ApiBase/$Path" -Headers $Headers
    Write-Host "PASS  GET /api/$Path" -ForegroundColor Green
}

$health = Invoke-RestMethod -Method Get -Uri "$ApiBase/health/"
if ($health.status -ne 'ok') { throw 'Backend health check failed.' }
Write-Host 'PASS  API health' -ForegroundColor Green
$stats = Invoke-RestMethod -Method Get -Uri "$ApiBase/public-stats/"
if ($null -eq $stats.active_jobs -or $null -eq $stats.verified_companies) { throw 'Public platform statistics are incomplete.' }
Write-Host 'PASS  Public database statistics' -ForegroundColor Green

$roles = @(
    @{ Name = 'seeker'; Email = 'seeker@kaamverse.local'; Password = 'Seeker@12345'; Role = 'seeker'; Paths = @('auth/me/', 'dashboard/', 'jobs/', 'recommendations/', 'applications/', 'saved-jobs/', 'notifications/', 'conversations/', 'services/', 'bookings/') },
    @{ Name = 'company employer'; Email = 'employer@kaamverse.local'; Password = 'Employer@12345'; Role = 'employer'; Paths = @('auth/me/', 'dashboard/', 'jobs/mine/', 'applications/', 'talent/', 'notifications/', 'conversations/', 'services/', 'bookings/') },
    @{ Name = 'individual employer'; Email = 'individual@kaamverse.local'; Password = 'Individual@12345'; Role = 'employer-individual'; Paths = @('auth/me/', 'dashboard/', 'jobs/mine/', 'applications/', 'talent/', 'notifications/', 'conversations/', 'services/', 'bookings/') },
    @{ Name = 'administrator'; Email = 'admin@kaamverse.local'; Password = 'Admin@12345'; Role = 'admin'; Paths = @('auth/me/', 'dashboard/', 'auth/users/', 'jobs/moderation_queue/', 'fraud-reports/', 'auth/verifications/', 'notification-broadcasts/', 'audit-logs/', 'platform-settings/') }
)

foreach ($role in $roles) {
    $headers = Get-Session $role.Email $role.Password $role.Role
    Write-Host "Authenticated $($role.Name)" -ForegroundColor Cyan
    foreach ($path in $role.Paths) { Test-Get $headers $path }
    $body = @{ label = 'Automated integration smoke test'; detail = "Verified $($role.Name) API session"; page = 'smoke-test.ps1' } | ConvertTo-Json
    $null = Invoke-RestMethod -Method Post -Uri "$ApiBase/user-actions/" -Headers $headers -ContentType 'application/json' -Body $body
    Write-Host 'PASS  POST /api/user-actions/' -ForegroundColor Green
}

Write-Host 'All role-based HTTP smoke tests passed.' -ForegroundColor Green
