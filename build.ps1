<#
.SYNOPSIS
  DronStream Windows tarqatish paketini yig'adi.
.DESCRIPTION
  1) frontendni yig'adi (npm ci + vite build)
  2) Go unit testlarini ishga tushiradi
  3) dronstream.exe ni versiya bilan yig'adi (frontend ichiga joylanadi)
  4) MediaMTX (mahkamlangan versiya, SHA256 tekshirilgan) ni qo'shadi
  5) dist\DronStream-<versiya>-win64\ va .zip + .sha256 yaratadi
  6) -Linux bilan: dist\DronStream-<versiya>-linux-amd64.tar.gz (cross-compile, Git Bash orqali)
  Qo'llanma (info.html va admin yordam) guide\src dan qayta hosil qilinadi.
  Mavjud paket ustidan yozilmaydi (chiqarilgan versiyalar o'zgarmasin); qayta yig'ish uchun -Force.
  Faqat ishlab chiquvchi kompyuterida kerak. Yakuniy foydalanuvchiga Go/Node kerak emas.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File build.ps1 -Version 1.2.0 -Linux
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [switch]$SkipTests,
  [switch]$SkipFrontend,
  [switch]$Linux,
  [switch]$Force
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version 3.0
$Root = $PSScriptRoot
$Tools = Join-Path $Root ".tools"
$MediaMTXVersion = "v1.21.3"
$MediaMTXSha256 = "b2f5246b07cb72961df03b8d5e8cad43dc657bcf3f49a87bb031bdf22721af74" # mediamtx_v1.21.3_windows_amd64.zip

function Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }

if ($Version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') { throw "Versiya X.Y.Z ko'rinishida bo'lishi kerak: $Version" }
$zipTarget = Join-Path $Root "dist\DronStream-$Version-win64.zip"
if ((Test-Path $zipTarget) -and -not $Force) { throw "$zipTarget allaqachon mavjud. Chiqarilgan paket ustidan yozilmaydi: yangi versiya raqami bering yoki -Force." }

# --- toolchain ---
$go = Join-Path $Tools "go\bin\go.exe"
if (-not (Test-Path $go)) { $go = (Get-Command go -ErrorAction SilentlyContinue).Source }
if (-not $go) { throw "Go topilmadi (.tools\go yoki PATH)" }
$env:GOTOOLCHAIN = "local"; $env:CGO_ENABLED = "0"; $env:GOTELEMETRY = "off"
if (Test-Path (Join-Path $Tools "go")) {
  $env:GOROOT = Join-Path $Tools "go"; $env:GOPATH = Join-Path $Tools "gopath"; $env:GOCACHE = Join-Path $Tools "gocache"
}

# --- MediaMTX (download once, verify checksum) ---
$mtxDir = Join-Path $Tools "mediamtx"
$mtxExe = Join-Path $mtxDir "mediamtx.exe"
if (-not (Test-Path $mtxExe)) {
  Step "MediaMTX $MediaMTXVersion yuklab olinmoqda"
  New-Item -ItemType Directory -Force (Join-Path $Tools "dl") | Out-Null
  $zip = Join-Path $Tools "dl\mediamtx.zip"
  Invoke-WebRequest -UseBasicParsing "https://github.com/bluenviron/mediamtx/releases/download/$MediaMTXVersion/mediamtx_${MediaMTXVersion}_windows_amd64.zip" -OutFile $zip
  $h = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if ($h -ne $MediaMTXSha256) { throw "MediaMTX SHA256 mos emas: $h" }
  Expand-Archive $zip -DestinationPath $mtxDir -Force
}
$ver = & $mtxExe --version 2>&1 | Select-Object -First 1
if ("$ver".Trim() -ne $MediaMTXVersion) { throw "MediaMTX versiyasi $ver, kutilgan $MediaMTXVersion" }

# --- guide: info.html + admin help are generated from the single source guide\src ---
$node = Join-Path $Tools "node\node.exe"
if (-not (Test-Path $node)) { $nodeCmd = Get-Command node -ErrorAction SilentlyContinue; if ($nodeCmd) { $node = $nodeCmd.Source } else { throw "Node topilmadi (.tools\node yoki PATH)" } }
if (Test-Path (Join-Path $Tools "node")) { $env:PATH = (Join-Path $Tools "node") + ";" + $env:PATH }
Step "Qo'llanma hosil qilinmoqda (guide\src -> info.html, admin yordam)"
& $node (Join-Path $Root "guide\build.mjs")
if ($LASTEXITCODE -ne 0) { throw "guide build xato" }
$guideMeta = Get-Content (Join-Path $Root "guide\src\meta.json") -Raw | ConvertFrom-Json
if ($guideMeta.version -ne $Version) { throw "guide\src\meta.json dagi versiya ($($guideMeta.version)) paket versiyasiga ($Version) mos emas" }

# --- frontend ---
$webui = Join-Path $Root "backend\internal\webui\dist"
if (-not $SkipFrontend) {
  Step "Frontend yig'ilmoqda"
  Push-Location (Join-Path $Root "web")
  try {
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm ci xato" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "frontend build xato" }
  } finally { Pop-Location }
  Get-ChildItem $webui -Exclude ".keep" | Remove-Item -Recurse -Force
  Copy-Item (Join-Path $Root "web\dist\*") $webui -Recurse -Force
}
if (-not (Test-Path (Join-Path $webui "index.html"))) { throw "Frontend build yo'q (backend\internal\webui\dist\index.html)" }

# --- tests + binary ---
Push-Location (Join-Path $Root "backend")
try {
  if (-not $SkipTests) {
    Step "Go unit testlari"
    & $go test ./internal/...
    if ($LASTEXITCODE -ne 0) { throw "unit testlar muvaffaqiyatsiz" }
  }
  Step "dronstream.exe yig'ilmoqda ($Version)"
  $out = Join-Path $Root "build\dronstream.exe"
  & $go build -trimpath -ldflags "-s -w -X main.version=$Version" -o $out ./cmd/dronstream
  if ($LASTEXITCODE -ne 0) { throw "go build xato" }
} finally { Pop-Location }

# --- package ---
Step "Paket yig'ilmoqda"
$name = "DronStream-$Version-win64"
$pkg = Join-Path $Root "dist\$name"
if (Test-Path $pkg) { Remove-Item $pkg -Recurse -Force }
$appDir = Join-Path $pkg "app\$Version"
New-Item -ItemType Directory -Force (Join-Path $appDir "mediamtx"), (Join-Path $pkg "scripts"), (Join-Path $pkg "config"), (Join-Path $pkg "docs") | Out-Null
Copy-Item (Join-Path $Root "build\dronstream.exe") $appDir
Copy-Item $mtxExe (Join-Path $appDir "mediamtx")
Copy-Item (Join-Path $mtxDir "LICENSE") (Join-Path $appDir "mediamtx\LICENSE-mediamtx.txt")
Copy-Item (Join-Path $Root "packaging\scripts\*") (Join-Path $pkg "scripts")
foreach ($s in "ds-common.ps1", "ds-start.ps1", "ds-prepare.ps1") { Copy-Item (Join-Path $Root "scripts\$s") (Join-Path $pkg "scripts") }
foreach ($s in "DronStreamStart.bat", "DronStreamTayyorla.bat", "info.html") { Copy-Item (Join-Path $Root $s) $pkg }
Copy-Item (Join-Path $Root "config\dronstream.example.yaml") (Join-Path $pkg "config")
foreach ($d in "README_UZ.md","SERVER_INSTALL_UZ.md","REQUIREMENTS.md","PROGRESS.md","ADMIN_GUIDE_UZ.md","DJI_SETUP_UZ.md","SECURITY.md","BACKUP_RESTORE_UZ.md","INSTALL_UZ.md","TEST_REPORT.md","ARCHITECTURE.md") {
  $p = Join-Path $Root $d
  if (Test-Path $p) { Copy-Item $p (Join-Path $pkg "docs") }
}
Set-Content -Path (Join-Path $pkg "VERSION") -Value $Version -Encoding ascii
# checksums of every file in the package
$sums = Get-ChildItem $pkg -Recurse -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | ForEach-Object {
  $rel = $_.FullName.Substring($pkg.Length + 1)
  "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), $rel
}
Set-Content -Path (Join-Path $pkg "SHA256SUMS.txt") -Value $sums -Encoding ascii
$zipOut = Join-Path $Root "dist\$name.zip"
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Compress-Archive -Path $pkg -DestinationPath $zipOut
$zh = (Get-FileHash $zipOut -Algorithm SHA256).Hash.ToLower()
Set-Content -Path "$zipOut.sha256" -Value "$zh  $name.zip" -Encoding ascii
Step "Tayyor: $zipOut"
Write-Host "SHA256: $zh"

# --- Linux package (cross-compiled; the same script runs natively in CI) ---
if ($Linux) {
  $gitCmd = Get-Command git -ErrorAction SilentlyContinue
  if (-not $gitCmd) { throw "Linux paketi uchun Git Bash kerak (git topilmadi)" }
  $bash = Join-Path (Split-Path (Split-Path $gitCmd.Source -Parent) -Parent) "bin\bash.exe"
  if (-not (Test-Path $bash)) { throw "Git Bash topilmadi: $bash" }
  Step "Linux paketi (linux/amd64)"
  $bashArgs = @((Join-Path $Root "packaging\linux\build-package.sh"), $Version)
  if ($Force) { $bashArgs += "--force" }
  & $bash @bashArgs
  if ($LASTEXITCODE -ne 0) { throw "Linux paketi yig'ilmadi" }
}
