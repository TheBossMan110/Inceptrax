# ══════════════════════════════════════════════════════════════════
#  Inceptrax — start everything
#
#  Usage (from this folder):
#      .\start.ps1              backend in Docker + frontend with npm
#      .\start.ps1 -All         both in Docker
#      .\start.ps1 -Stop        stop everything
#
#  If PowerShell refuses to run this, once per machine:
#      Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# ══════════════════════════════════════════════════════════════════

param(
    [switch]$All,
    [switch]$Stop
)

$root = $PSScriptRoot
Set-Location $root

function Wait-ForDocker {
    docker info 2>&1 | Out-Null
    if ($?) { return $true }

    Write-Host "Docker Desktop is not running. Starting it..." -ForegroundColor Yellow
    $exe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $exe) { Start-Process $exe } else {
        Write-Host "Could not find Docker Desktop. Open it manually, then re-run." -ForegroundColor Red
        return $false
    }

    Write-Host "Waiting for Docker to be ready (this takes 30-60s on a cold start)..."
    for ($i = 1; $i -le 60; $i++) {
        Start-Sleep -Seconds 5
        docker info 2>&1 | Out-Null
        if ($?) { Write-Host "Docker is ready." -ForegroundColor Green; return $true }
        Write-Host "  ...still starting ($($i * 5)s)"
    }
    Write-Host "Docker did not start in time. Open Docker Desktop and try again." -ForegroundColor Red
    return $false
}

# ── Stop ──────────────────────────────────────────────────────────
if ($Stop) {
    if (Wait-ForDocker) {
        docker compose down
        Write-Host "Stopped." -ForegroundColor Green
    }
    return
}

if (-not (Wait-ForDocker)) { return }

# ── Backend ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "Starting backend..." -ForegroundColor Cyan
if ($All) { docker compose up -d --build } else { docker compose up -d backend }

# The container reports healthy only once MongoDB has connected.
Write-Host "Waiting for the backend to answer..."
$ok = $false
for ($i = 1; $i -le 24; $i++) {
    Start-Sleep -Seconds 5
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -TimeoutSec 10 -UseBasicParsing
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { }
    Write-Host "  ...waiting ($($i * 5)s)"
}

if ($ok) {
    Write-Host "Backend is up:  http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "Backend did not respond. Check logs with:" -ForegroundColor Red
    Write-Host "    docker compose logs -f backend"
    return
}

# ── Frontend ──────────────────────────────────────────────────────
Write-Host ""
if ($All) {
    Write-Host "Frontend is running in Docker:  http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "Starting frontend (npm run dev)..." -ForegroundColor Cyan
    Write-Host "Leave this window open. Press Ctrl+C to stop the frontend." -ForegroundColor DarkGray
    Write-Host ""
    Set-Location (Join-Path $root "frontend")
    npm run dev
}
