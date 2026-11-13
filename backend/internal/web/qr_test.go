package web

import (
	"image"
	"image/color"
	"strings"
	"testing"

	"github.com/makiuchi-d/gozxing"
	"github.com/makiuchi-d/gozxing/qrcode"
)

// renderRows draws the module matrix exactly like the browser canvas does
// (black modules on white, integer scale).
func renderRows(rows []string, scale int) image.Image {
	n := len(rows)
	m := image.NewGray(image.Rect(0, 0, n*scale, n*scale))
	for y, r := range rows {
		for x, c := range r {
			col := color.Gray{255}
			if c == '1' {
				col = color.Gray{0}
			}
			for dy := 0; dy < scale; dy++ {
				for dx := 0; dx < scale; dx++ {
					m.SetGray(x*scale+dx, y*scale+dy, col)
				}
			}
		}
	}
	return m
}

func DecodeQR(img image.Image) (string, error) {
	bmp, err := gozxing.NewBinaryBitmapFromImage(img)
	if err != nil {
		return "", err
	}
	res, err := qrcode.NewQRCodeReader().Decode(bmp, nil)
	if err != nil {
		return "", err
	}
	return res.GetText(), nil
}

func TestQRDecodesToExactLink(t *testing.T) {
	url := "https://stream.example.uz:8443/link#AbCdEfGh_IjKlMnOp-QrStUvWxYz0123"
	n, rows, err := qrRows(url)
	if err != nil || n != len(rows) {
		t.Fatal(err)
	}
	got, err := DecodeQR(renderRows(rows, 6))
	if err != nil || got != url {
		t.Fatalf("decoded %q err %v", got, err)
	}
}

func TestBaseURLRules(t *testing.T) {
	bad := []string{"", "http://stream.example.uz", "https://localhost:8443", "https://127.0.0.1", "https://[::1]:8443", "https://x.uz/path", "https://x.uz/?a=1", "https://app.localhost"}
	for _, b := range bad {
		if BaseURLProblem(b) == "" {
			t.Errorf("%q accepted", b)
		}
	}
	for _, g := range []string{"https://stream.example.uz", "https://203.0.113.10:8443", "https://192.168.1.50:8443/"} {
		if p := BaseURLProblem(strings.TrimRight(g, "/")); p != "" {
			t.Errorf("%q rejected: %s", g, p)
		}
	}
}

func TestPNGNameHasNoToken(t *testing.T) {
	n := safeFileName("Hamkor: Ali / test", 42)
	if n != "dronstream-hamkor-ali--test-42.png" && !strings.HasPrefix(n, "dronstream-hamkor") {
		t.Fatal(n)
	}
	if strings.ContainsAny(n, "#/:") {
		t.Fatal(n)
	}
}
