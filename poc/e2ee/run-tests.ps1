# Runs both test suites of the E2EE proof of concept:
#   Go   - RFC 9605 / RFC 9180 vectors, end-to-end chain, interop, real processes
#   Node - RFC 9605 / RFC 9180 vectors, interop with Go, receive rules
# Starts no long-lived process and listens only on OS-assigned loopback ports.
#
#   powershell -ExecutionPolicy Bypass -File run-tests.ps1

$ErrorActionPreference = 'Continue'   # native tools write progress to stderr; exit codes are checked instead
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'scripts\toolchain.ps1')
Use-PocToolchain -PocDir $here

function Invoke-Step([string]$Title, [scriptblock]$Command) {
    Write-Host "== $Title =="
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Title failed (exit code $LASTEXITCODE)" }
}

Push-Location $here
try {
    Invoke-Step 'Go: vet' { go vet ./... }
    Invoke-Step 'Go: tests' { go test -count=1 ./... }
    if (-not (Test-Path 'node_modules\@hpke\core') -or -not (Test-Path 'node_modules\esbuild')) {
        Invoke-Step 'Node: dependencies (pinned in package-lock.json)' { npm.cmd ci --no-audit --no-fund }
    }
    Invoke-Step 'Node: bundle the viewer' { npm.cmd run --silent build }
    Invoke-Step 'Node: tests' { npm.cmd test --silent }
    Write-Host '== ALL TESTS PASSED =='
}
finally {
    Pop-Location
}
