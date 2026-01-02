# PowerShell script to create and deploy hint-designer demo to Surge
# Usage: .\deploy-demo.ps1

Write-Host "=== GVE Hint Designer Demo Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build the project
Write-Host "Step 1: Building the project..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Exiting..." -ForegroundColor Red
    exit 1
}
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Create deployment folder
Write-Host "Step 2: Creating deployment folder..." -ForegroundColor Yellow
$demoFolder = "hint-designer-demo"

# Remove existing folder if it exists
if (Test-Path $demoFolder) {
    Write-Host "Removing existing $demoFolder folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $demoFolder
}

# Create new folder
New-Item -ItemType Directory -Path $demoFolder | Out-Null
Write-Host "Deployment folder created!" -ForegroundColor Green
Write-Host ""

# Step 3: Copy files
Write-Host "Step 3: Copying required files..." -ForegroundColor Yellow

# Copy HTML file as index.html
Copy-Item -Path "hint-designer.html" -Destination "$demoFolder\index.html"
Write-Host "  - Copied hint-designer.html -> index.html" -ForegroundColor Gray

# Copy consumer JavaScript
Copy-Item -Path "hint-designer-consumer.js" -Destination "$demoFolder\hint-designer-consumer.js"
Write-Host "  - Copied hint-designer-consumer.js" -ForegroundColor Gray

# Copy dist folder
Copy-Item -Path "dist" -Destination "$demoFolder\dist" -Recurse
Write-Host "  - Copied dist folder" -ForegroundColor Gray

Write-Host "All files copied successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Verify structure
Write-Host "Step 4: Verifying folder structure..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Contents of $demoFolder folder:" -ForegroundColor Cyan
Get-ChildItem -Path $demoFolder -Recurse | Select-Object FullName | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "")
    Write-Host "  $relativePath" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Ask about local testing
Write-Host "Step 5: Local testing (optional)" -ForegroundColor Yellow
$testLocally = Read-Host "Do you want to test locally first? (y/n)"

if ($testLocally -eq 'y' -or $testLocally -eq 'Y') {
    Write-Host "Starting local server..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server when you're done testing" -ForegroundColor Yellow
    Write-Host ""
    Push-Location $demoFolder
    npx lite-server
    Pop-Location
    Write-Host ""
}

# Step 6: Deploy to Surge
Write-Host "Step 6: Deploy to Surge" -ForegroundColor Yellow
$deploy = Read-Host "Do you want to deploy to Surge now? (y/n)"

if ($deploy -eq 'y' -or $deploy -eq 'Y') {
    Write-Host "Deploying to Surge..." -ForegroundColor Cyan
    Write-Host ""

    # Check if surge is installed
    $surgeInstalled = Get-Command surge -ErrorAction SilentlyContinue
    if (-not $surgeInstalled) {
        Write-Host "Surge is not installed. Installing globally..." -ForegroundColor Yellow
        npm install -g surge
    }

    Push-Location $demoFolder
    surge
    Pop-Location

    Write-Host ""
    Write-Host "Deployment completed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Skipping deployment. To deploy later, run:" -ForegroundColor Cyan
    Write-Host "  cd $demoFolder" -ForegroundColor White
    Write-Host "  surge" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your demo folder is ready at: $demoFolder" -ForegroundColor Cyan
