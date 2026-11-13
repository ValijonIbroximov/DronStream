# Dev environment (source me): toolchains live in .tools/
R=/c/Loyihalar/DronStream
export GOROOT=$R/.tools/go GOPATH=$R/.tools/gopath GOCACHE=$R/.tools/gocache GOTELEMETRY=off GOTOOLCHAIN=local CGO_ENABLED=0
export PATH=$R/.tools/go/bin:$R/.tools/ffmpeg-master-latest-win64-gpl/bin:$R/.tools/mediamtx:$PATH
