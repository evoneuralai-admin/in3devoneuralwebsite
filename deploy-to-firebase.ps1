# Comprehensive Firebase Deployment Script
# Deploys Functions and Hosting to Production

Write-Host "`n=== Firebase Production Deployment ===" -ForegroundColor Cyan
Write-Host "This will deploy:" -ForegroundColor White
Write-Host "  1. Firebase Functions (API)" -ForegroundColor Gray
Write-Host "  2. Client build and hosting" -ForegroundColor Gray
Write-Host "  3. All fixes for styles, 3D assets, skybox, and Razorpay" -ForegroundColor Gray
Write-Host "`n⚠️  This deploys to PRODUCTION!" -ForegroundColor Yellow

Write-Host "`nPress any key to continue or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 1: Deploy Functions
Write-Host "`n[1/4] Deploying Firebase Functions..." -ForegroundColor Green
firebase deploy --only functions

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Functions deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Functions deployed successfully" -ForegroundColor Green

# Step 2: Build Client
Write-Host "`n[2/4] Building client application..." -ForegroundColor Green
Set-Location server/client

# Clean previous build
if (Test-Path "dist") {
    Write-Host "Cleaning previous build..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "dist"
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm install
}

# Build for production
Write-Host "Building for production..." -ForegroundColor Gray
npm run build:firebase

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Client build failed!" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host "`n✅ Client built successfully" -ForegroundColor Green
Set-Location ../..

# Step 3: Verify build
Write-Host "`n[3/4] Verifying build..." -ForegroundColor Green
if (-not (Test-Path "server/client/dist/index.html")) {
    Write-Host "`n❌ Build verification failed - index.html not found!" -ForegroundColor Red
    exit 1
}

$buildSize = (Get-ChildItem "server/client/dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Gray
Write-Host "✅ Build verified" -ForegroundColor Green

# Step 4: Deploy Hosting
Write-Host "`n[4/4] Deploying to Firebase Hosting (Production)..." -ForegroundColor Green
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Hosting deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Hosting deployed successfully" -ForegroundColor Green

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "`nProduction URL: https://in3devoneuralai.web.app" -ForegroundColor Yellow
Write-Host "Functions URL: https://us-central1-in3devoneuralai.cloudfunctions.net/api" -ForegroundColor Yellow
Write-Host "`nWhat was deployed:" -ForegroundColor White
Write-Host "  ✅ Fixed 3D asset loading with CORS handling" -ForegroundColor Gray
Write-Host "  ✅ Fixed skybox loading with retry logic" -ForegroundColor Gray
Write-Host "  ✅ Fixed Razorpay integration with proper script loading" -ForegroundColor Gray
Write-Host "  ✅ Fixed styles API with retry and error handling" -ForegroundColor Gray
Write-Host "  ✅ Improved API base URL configuration" -ForegroundColor Gray
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "  1. Test the production site" -ForegroundColor Gray
Write-Host "  2. Verify styles load correctly" -ForegroundColor Gray
Write-Host "  3. Test Razorpay payment flow" -ForegroundColor Gray
Write-Host "  4. Check 3D asset previews" -ForegroundColor Gray
Write-Host ""

