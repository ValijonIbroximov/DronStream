package core

import (
	"database/sql"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

func itoa(v int64) string { return strconv.FormatInt(v, 10) }

func atoiDefault(s string, d int) int {
	v, err := strconv.Atoi(s)
	if err != nil {
		return d
	}
	return v
}

func nullable(v sql.NullInt64) *int64 {
	if !v.Valid {
		return nil
	}
	x := v.Int64
	return &x
}

func minPositive(vals ...int64) int64 {
	var m int64
	for _, v := range vals {
		if v > 0 && (m == 0 || v < m) {
			m = v
		}
	}
	return m
}

// cleanText trims, strips control characters (keeps newlines) and limits
// length. Output is still treated as untrusted text by the frontend (React
// escapes it); we never render it as HTML.
func cleanText(s string, max int, multiline bool) string {
	s = strings.TrimSpace(s)
	var b strings.Builder
	n := 0
	for _, r := range s {
		if r == utf8.RuneError {
			continue
		}
		if r == '\n' && multiline {
			b.WriteRune(r)
			n++
		} else if unicode.IsControl(r) || r == '‮' || r == '‭' || r == '⁦' || r == '⁧' || r == '⁨' || r == '⁩' {
			continue
		} else {
			b.WriteRune(r)
			n++
		}
		if n >= max {
			break
		}
	}
	return strings.TrimSpace(b.String())
}

func validSlug(s string) bool {
	if len(s) < 2 || len(s) > 40 {
		return false
	}
	for i, r := range s {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || ((r == '-' || r == '_') && i > 0)
		if !ok {
			return false
		}
	}
	return true
}

func validUsername(s string) bool {
	if len(s) < 3 || len(s) > 40 {
		return false
	}
	for _, r := range s {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-') {
			return false
		}
	}
	return true
}
