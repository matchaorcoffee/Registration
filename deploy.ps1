# deploy.ps1 — Run this every time you want to deploy to GitHub Pages
# Usage: .\deploy.ps1
#
# Set your GitHub token in .env.deploy (never commit that file):
#   GH_TOKEN=ghp_...your_token_here...

$envFile = Join-Path $PSScriptRoot '.env.deploy'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*GH_TOKEN\s*=\s*(.+)$') {
      $env:GH_TOKEN = $Matches[1].Trim()
    }
  }
}

if (-not $env:GH_TOKEN) {
  Write-Host "ERROR: GH_TOKEN not set. Create a .env.deploy file with GH_TOKEN=<your token>." -ForegroundColor Red
  exit 1
}

$REPO = "https://matchaorcoffee:$($env:GH_TOKEN)@github.com/matchaorcoffee/Registration.git"

Write-Host "Step 1: Building for production..." -ForegroundColor Cyan
& node_modules\.bin\ng.cmd build --configuration production --base-href "/Registration/"
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

Write-Host "Step 2: Deploying to gh-pages..." -ForegroundColor Cyan
Set-Location dist\evently\browser

git init
git checkout -b gh-pages 2>$null
if ($LASTEXITCODE -ne 0) { git checkout gh-pages 2>$null }

git add -A
git commit -m "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push --force $REPO HEAD:gh-pages

Set-Location ..\..\..
Write-Host "Done! Site will be live at https://matchaorcoffee.github.io/Registration/ in ~2 minutes." -ForegroundColor Green
