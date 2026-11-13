# Shared by run-tests.ps1 and run-demo.ps1: make Go and Node available for
# this PowerShell process only. Nothing outside the process is changed.

function Use-PocToolchain([string]$PocDir) {
    $repo = (Resolve-Path (Join-Path $PocDir '..\..')).Path
    $tools = Join-Path $repo '.tools'
    if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
        $goBin = Join-Path $tools 'go\bin'
        if (Test-Path (Join-Path $goBin 'go.exe')) {
            # Same settings as scripts/devenv.sh of the repository.
            $env:GOROOT = Join-Path $tools 'go'
            $env:GOPATH = Join-Path $tools 'gopath'
            $env:GOCACHE = Join-Path $tools 'gocache'
            $env:GOTELEMETRY = 'off'
            $env:GOTOOLCHAIN = 'local'
            $env:CGO_ENABLED = '0'
            $env:PATH = $goBin + ';' + $env:PATH
        }
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $nodeDir = Join-Path $tools 'node'
        if (Test-Path (Join-Path $nodeDir 'node.exe')) { $env:PATH = $nodeDir + ';' + $env:PATH }
    }
    if (-not (Get-Command go -ErrorAction SilentlyContinue)) { throw 'go not found (install Go or use the repository .tools directory)' }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node (>= 22) not found' }
}
