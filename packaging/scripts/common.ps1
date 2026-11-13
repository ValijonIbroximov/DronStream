# Shared helpers for DronStream scripts. ROOT defaults to the parent of this
# scripts folder (installed layout: <ROOT>\scripts\*.ps1).
$ErrorActionPreference = "Stop"

function Resolve-DsRoot([string]$Root) {
  if ($Root) { return (Resolve-Path $Root).Path }
  return (Split-Path $PSScriptRoot -Parent)
}

function Get-DsActiveVersion([string]$Root) {
  $f = Join-Path $Root "app\active.txt"
  if (-not (Test-Path $f)) { throw "Faol versiya topilmadi: $f (avval install.ps1 ni ishga tushiring)" }
  return (Get-Content $f -Raw).Trim()
}

function Get-DsExe([string]$Root, [string]$Version) {
  if (-not $Version) { $Version = Get-DsActiveVersion $Root }
  $exe = Join-Path $Root "app\$Version\dronstream.exe"
  if (-not (Test-Path $exe)) { throw "Topilmadi: $exe" }
  return $exe
}

function Test-DsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-DsService { Get-Service -Name "DronStream" -ErrorAction SilentlyContinue }

function ConvertFrom-DsSecure([Security.SecureString]$s) {
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Read-DsPassphrase([string]$Prompt, [switch]$Confirm) {
  # Non-interactive automation (scheduled task): passphrase from the environment.
  if ($env:DRONSTREAM_BACKUP_PASSPHRASE) {
    if ($env:DRONSTREAM_BACKUP_PASSPHRASE.Length -lt 12) { throw "Backup paroli kamida 12 belgi bo'lishi kerak" }
    return $env:DRONSTREAM_BACKUP_PASSPHRASE
  }
  $p1 = ConvertFrom-DsSecure (Read-Host -AsSecureString $Prompt)
  if ($Confirm) {
    $p2 = ConvertFrom-DsSecure (Read-Host -AsSecureString "Qayta kiriting")
    if ($p1 -ne $p2) { throw "Parollar mos emas" }
  }
  if ($p1.Length -lt 12) { throw "Backup paroli kamida 12 belgi bo'lishi kerak" }
  return $p1
}

# Runs dronstream.exe and returns its exit code. Output is shown unless -Quiet.
# Windows PowerShell 5.1 turns native stderr into error records, which would be
# fatal under ErrorActionPreference=Stop, so it is relaxed for the call.
function Invoke-DsExe([string]$Exe, [string[]]$DsArgs, [switch]$Quiet) {
  $old = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $Exe @DsArgs 2>&1 | ForEach-Object { if (-not $Quiet) { Write-Host "$_" } }
    return $LASTEXITCODE
  } finally { $ErrorActionPreference = $old }
}

# Runs dronstream.exe with the passphrase in a process-scoped environment
# variable (never on the command line, so it does not appear in process lists).
function Invoke-DsWithPassphrase([string]$Exe, [string[]]$DsArgs, [string]$Pass) {
  $had = $env:DRONSTREAM_BACKUP_PASSPHRASE
  $env:DRONSTREAM_BACKUP_PASSPHRASE = $Pass
  try { return (Invoke-DsExe $Exe $DsArgs) } finally { if ($had) { $env:DRONSTREAM_BACKUP_PASSPHRASE = $had } else { Remove-Item Env:DRONSTREAM_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue } }
}

function Test-DsRunning([string]$Exe, [string]$Root) {
  return ((Invoke-DsExe $Exe @("status", "--root", $Root) -Quiet) -eq 0)
}

function Wait-DsHealthy([string]$Exe, [string]$Root, [int]$Seconds = 30) {
  for ($i = 0; $i -lt $Seconds; $i++) {
    if (Test-DsRunning $Exe $Root) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}
