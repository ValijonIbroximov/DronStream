# Starts the E2EE proof-of-concept demo on the loopback interface:
#   relay (keyless)  ->  http://127.0.0.1:59320
#   viewerhost       ->  http://127.0.0.1:59321/viewer.html   (separate origin: delivers the viewer page)
#   source           ->  publisher simulator, operator control on http://127.0.0.1:59322
#
#   powershell -ExecutionPolicy Bypass -File run-demo.ps1                 # source in this window (type operator commands here)
#   powershell -ExecutionPolicy Bypass -File run-demo.ps1 -Background     # everything detached; stop with -Stop
#   powershell -ExecutionPolicy Bypass -File run-demo.ps1 -Stop
#   powershell -ExecutionPolicy Bypass -File run-demo.ps1 -Check          # self-check with the headless Go receiver, then stop
#
# The script stops only processes it started itself (matched by process id,
# executable path and start time). It never touches other processes or ports.

param(
    [int]$RelayPort = 59320,
    [int]$ViewerPort = 59321,
    [int]$ControlPort = 59322,
    [string]$Stream = 'demo',
    [switch]$AttackHooks,   # relay also exposes the malicious-relay simulation (operator.exe attack ...)
    [switch]$Synthetic,     # do not use ffmpeg: synthetic frames, counters only, no picture
    [switch]$Background,
    [switch]$Stop,
    [switch]$Check
)

$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$run = Join-Path $here '.run'
$bin = Join-Path $run 'bin'
$pidFile = Join-Path $run 'pids.json'
$script:started = @()

function Stop-PocProcesses($List) {
    foreach ($entry in $List) {
        $p = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
        if ($null -eq $p) { continue }
        $same = $false
        try { $same = ($p.Path -eq $entry.path) -and ($p.StartTime.ToFileTimeUtc() -eq $entry.start) } catch { $same = $false }
        if ($same) {
            Stop-Process -Id $entry.pid -Force -Confirm:$false
            Write-Host "stopped $($entry.name) (pid $($entry.pid))"
        }
        else {
            Write-Host "pid $($entry.pid) is not the $($entry.name) started by this script: left alone"
        }
    }
}

if ($Stop) {
    if (-not (Test-Path $pidFile)) { Write-Host 'nothing to stop (no .run\pids.json)'; return }
    Stop-PocProcesses (Get-Content $pidFile -Raw | ConvertFrom-Json)
    Remove-Item $pidFile -Confirm:$false
    return
}

# Ports of the DronStream server itself: this demo must never use them.
$reserved = 8443, 1935, 9180, 9997, 8889, 8189
foreach ($port in $RelayPort, $ViewerPort, $ControlPort) {
    if ($reserved -contains $port) { throw "port $port belongs to the DronStream server; choose another port" }
}
if ($Stream -notmatch '^[A-Za-z0-9_-]{1,64}$') { throw 'stream id: letters, digits, _ and - only' }
if (Test-Path $pidFile) { throw 'a background demo seems to be running; stop it first with: run-demo.ps1 -Stop' }

. (Join-Path $here 'scripts\toolchain.ps1')
Use-PocToolchain -PocDir $here

function Start-PocProcess([string]$Name, [string[]]$Arguments) {
    $exe = Join-Path $bin "$Name.exe"
    $quoted = $Arguments | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }
    $p = Start-Process -FilePath $exe -ArgumentList $quoted -WorkingDirectory $here -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $run "$Name.out.log") -RedirectStandardError (Join-Path $run "$Name.err.log")
    $script:started += [pscustomobject]@{ name = $Name; pid = $p.Id; path = $exe; start = $p.StartTime.ToFileTimeUtc() }
    return $p
}

# Waits until $Test returns $true; fails if the process exits first.
function Wait-Ready($Process, [string]$Name, [scriptblock]$Test) {
    for ($i = 0; $i -lt 100; $i++) {
        if ($Process.HasExited) { break }
        $ready = $false
        try { $ready = & $Test } catch { $ready = $false }
        if ($ready) {
            Start-Sleep -Milliseconds 300   # make sure it is our process that answers, not a foreign one on the same port
            if (-not $Process.HasExited) { return }
            break
        }
        Start-Sleep -Milliseconds 200
    }
    $err = Get-Content (Join-Path $run "$Name.err.log") -Raw -ErrorAction SilentlyContinue
    throw "$Name did not start (is its port already in use?). Its messages:`n$err"
}

function Test-Http([string]$Url) {
    return ((Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200)
}

function Test-Port([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', $Port); return $true } catch { return $false } finally { $client.Close() }
}

$relayUrl = "http://127.0.0.1:$RelayPort"
$viewerUrl = "http://127.0.0.1:$ViewerPort"
$controlUrl = "http://127.0.0.1:$ControlPort"
$operator = Join-Path $bin 'operator.exe'

Push-Location $here
try {
    New-Item -ItemType Directory -Force $bin | Out-Null
    Write-Host '== building the PoC programs =='
    go build -o "$bin/" ./cmd/relay ./cmd/viewerhost ./cmd/source ./cmd/receiver ./cmd/operator
    if ($LASTEXITCODE -ne 0) { throw 'go build failed' }
    if (-not (Test-Path 'viewer\viewer.bundle.js')) {
        Write-Host '== bundling the viewer =='
        if (-not (Test-Path 'node_modules\esbuild')) { npm.cmd ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' } }
        npm.cmd run --silent build
        if ($LASTEXITCODE -ne 0) { throw 'bundling failed' }
    }

    $relayArgs = @('-port', "$RelayPort", '-viewer-origins', "http://127.0.0.1:$ViewerPort,http://localhost:$ViewerPort")
    if ($AttackHooks) { $relayArgs += '-attack-hooks' }
    $relay = Start-PocProcess 'relay' $relayArgs
    Wait-Ready $relay 'relay' { Test-Http "$relayUrl/healthz" }

    if (-not $Check) {
        $viewerhost = Start-PocProcess 'viewerhost' @('-port', "$ViewerPort", '-dir', (Join-Path $here 'viewer'),
            '-relay-origins', "$relayUrl,http://localhost:$RelayPort")
        Wait-Ready $viewerhost 'viewerhost' { Test-Http "$viewerUrl/viewer.html" }
    }

    $sourceArgs = @('-relay', $relayUrl, '-stream', $Stream, '-control-port', "$ControlPort")
    if ($Synthetic) { $sourceArgs += '-synthetic' }

    $info = @"

Relay (keyless, sees only ciphertext):  $relayUrl
Viewer page (separate origin):          $viewerUrl/viewer.html?relay=$relayUrl&stream=$Stream
Stream id:                              $Stream

Operator commands (from any terminal):
  "$operator" -control $controlUrl list
  "$operator" -control $controlUrl approve <fingerprint shown by the viewer, all 16 groups>
  "$operator" -control $controlUrl revoke <fingerprint>
  "$operator" -control $controlUrl status
Headless check without a browser (prints its fingerprint, then approve it):
  "$(Join-Path $bin 'receiver.exe')" -relay $relayUrl -stream $Stream
"@
    if ($AttackHooks) {
        $info += @"


Malicious-relay simulation (relay was started with -attack-hooks):
  "$operator" -relay $relayUrl attack tamper 5        (viewer: authentication failures go up)
  "$operator" -relay $relayUrl attack replay 5        (viewer: replays rejected go up)
  "$operator" -relay $relayUrl attack substitute-on   (source list shows a fingerprint the viewer does not have)
  "$operator" -relay $relayUrl attack substitute-off
"@
    }

    if ($Check) {
        $source = Start-PocProcess 'source' $sourceArgs
        Wait-Ready $source 'source' { Test-Port $ControlPort }
        $receiverLog = Join-Path $run 'receiver.out.log'
        $receiver = Start-PocProcess 'receiver' @('-relay', $relayUrl, '-stream', $Stream, '-label', 'self-check', '-frames', '60', '-timeout', '60s')
        $fingerprint = $null
        for ($i = 0; $i -lt 50 -and -not $fingerprint; $i++) {
            Start-Sleep -Milliseconds 200
            $line = Get-Content $receiverLog -ErrorAction SilentlyContinue | Where-Object { $_ -like 'FINGERPRINT *' } | Select-Object -First 1
            if ($line) { $fingerprint = $line.Substring('FINGERPRINT '.Length) }
        }
        if (-not $fingerprint) { throw 'the receiver did not print its fingerprint' }
        Write-Host "receiver fingerprint: $fingerprint"
        & $operator -control $controlUrl approve $fingerprint
        if ($LASTEXITCODE -ne 0) { throw 'approve failed' }
        if (-not $receiver.WaitForExit(70000)) { throw 'the receiver did not finish in time' }
        $result = Get-Content $receiverLog | Where-Object { $_ -like 'RESULT *' } | Select-Object -Last 1
        Write-Host $result
        if ($result -notlike 'RESULT ok *') { throw 'SELF-CHECK FAILED' }
        Write-Host 'SELF-CHECK PASSED: relay, source and the Go receiver ran as separate processes; frames were decrypted.'
    }
    elseif ($Background) {
        $source = Start-PocProcess 'source' $sourceArgs
        Wait-Ready $source 'source' { Test-Port $ControlPort }
        $script:started | ConvertTo-Json | Set-Content -Encoding utf8 $pidFile
        $script:started = @()   # keep them running; -Stop reads the pid file
        Write-Host $info
        Write-Host "`nRunning in the background. Logs: $run\*.log. Stop with:  run-demo.ps1 -Stop"
    }
    else {
        Write-Host $info
        Write-Host "`nThe source runs in this window. Type: list, approve <fingerprint>, revoke <fingerprint>, status, quit`n"
        & (Join-Path $bin 'source.exe') @sourceArgs
    }
}
finally {
    Stop-PocProcesses $script:started
    Pop-Location
}
