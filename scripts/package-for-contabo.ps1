# Creates al-wisam-dental-contabo.zip for VPS upload (excludes dev artifacts)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "deploy\contabo"
$ZipPath = Join-Path $OutDir "al-wisam-dental-contabo.zip"

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$ExcludeDirs = @(
  "node_modules", ".next", ".git", "uploads", ".vercel", "coverage"
)
$ExcludeFiles = @(
  "*.sql", "*.backup", ".env", ".env.local", "*.tsbuildinfo", "*.zip",
  "al-wisam-dental-contabo.zip"
)

$Temp = Join-Path $env:TEMP ("alwisam-pack-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Path $Temp | Out-Null

Write-Host "Copying project to temp folder..."
robocopy $Root $Temp /E /XD $ExcludeDirs /XF $ExcludeFiles /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Write-Host "Creating zip: $ZipPath"
Compress-Archive -Path (Join-Path $Temp "*") -DestinationPath $ZipPath -CompressionLevel Optimal

Remove-Item $Temp -Recurse -Force

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "Done: $ZipPath ($sizeMb MB)"
Write-Host "Upload to Contabo: scp `"$ZipPath`" root@YOUR_IP:/opt/"
