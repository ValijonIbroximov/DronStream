# Dev environment (source me from Git Bash): toolchains live in .tools/
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export GOROOT=$R/.tools/go GOPATH=$R/.tools/gopath GOCACHE=$R/.tools/gocache GOTELEMETRY=off GOTOOLCHAIN=local CGO_ENABLED=0
export PATH=$R/.tools/go/bin:$R/.tools/node:$R/.tools/ffmpeg-master-latest-win64-gpl/bin:$R/.tools/mediamtx:$PATH
