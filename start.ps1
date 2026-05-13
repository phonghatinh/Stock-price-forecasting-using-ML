# FiinQuant Platform — Windows Quick Start Script
# Run this from the project root: .\start.ps1

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Install
)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "🚀 FiinQuant AI Platform" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# ── Install Backend ──────────────────────────────────────────────────────────
if ($Install -or (!$FrontendOnly)) {
    Write-Host "`n📦 Setting up Python backend..." -ForegroundColor Yellow
    Set-Location "$Root\backend"

    if (-not (Test-Path "venv")) {
        python -m venv venv
        Write-Host "  ✅ Virtual env created" -ForegroundColor Green
    }

    & ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet
    Write-Host "  ✅ Python packages installed" -ForegroundColor Green
}

# ── Install Frontend ─────────────────────────────────────────────────────────
if ($Install -or (!$BackendOnly)) {
    Write-Host "`n📦 Setting up Node.js frontend..." -ForegroundColor Yellow
    Set-Location "$Root\frontend"
    npm install --silent
    Write-Host "  ✅ Node packages installed" -ForegroundColor Green
}

# ── Start Services ────────────────────────────────────────────────────────────
Write-Host "`n🔥 Starting services..." -ForegroundColor Yellow

if (!$FrontendOnly) {
    Write-Host "  Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$Root\backend'; .\venv\Scripts\activate; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    ) -WindowStyle Normal
    Start-Sleep -Seconds 3
}

if (!$BackendOnly) {
    Write-Host "  Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$Root\frontend'; npm run dev"
    ) -WindowStyle Normal
    Start-Sleep -Seconds 3
}

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  🔌 Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  📚 API Docs:  http://localhost:8000/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open in browser..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "http://localhost:3000"
