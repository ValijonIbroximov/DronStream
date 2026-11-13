// Package webui embeds the production React build (copied here by build.ps1).
package webui

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var dist embed.FS

// FS returns the build, or nil when the binary was built without a frontend.
func FS() fs.FS {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		return nil
	}
	if _, err := fs.Stat(sub, "index.html"); err != nil {
		return nil
	}
	return sub
}

// The admin help pages are generated from guide/src by "node guide/build.mjs"
// (the same source also produces the standalone info.html).
//
//go:embed help
var help embed.FS

// HelpFS returns the generated admin help (index.html, guide.css, guide.js).
func HelpFS() fs.FS {
	sub, err := fs.Sub(help, "help")
	if err != nil {
		return nil
	}
	return sub
}
