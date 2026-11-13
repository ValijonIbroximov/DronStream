package web

import (
	"net/http"
	"strconv"
	"strings"

	"dronstream/internal/config"
	"dronstream/internal/core"
	"dronstream/internal/tlsutil"
)

// ---- middleware ----

// sensitive wraps an admin action that needs a fresh re-confirmation
// (password, plus TOTP when enabled) within core.ReauthWindow on THIS
// browser session. A stolen session cookie alone is not enough for these.
func (s *Server) sensitive(h http.HandlerFunc) http.HandlerFunc {
	return s.admin(func(w http.ResponseWriter, r *http.Request) {
		if !s.Core.RecentReauth(sess(r)) {
			writeErr(w, &core.Error{Status: 403, Code: "reauth_required", Msg: "Bu amal uchun parolni (va ikkinchi bosqich kodini) qayta tasdiqlang"})
			return
		}
		h(w, r)
	})
}

// mfaGateAllowed lists what an administrator may still do in secure mode
// before enabling TOTP: set it up, sign out, read their own session.
func mfaGateAllowed(path string) bool {
	return strings.HasPrefix(path, "/api/me/") || path == "/api/logout" || path == "/api/session" || path == "/api/events"
}

// mfaSetupRequired: secure mode requires every administrator to use TOTP.
func (s *Server) mfaSetupRequired(se *core.Session) bool {
	return s.Cfg.Secure() && se != nil && se.IsAdmin() && !se.TOTPEnabled
}

// ---- own account: re-auth and TOTP ----

func (s *Server) meReauth(w http.ResponseWriter, r *http.Request) {
	if !s.limLogin.Allow(clientIP(r)) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p urinish. Bir daqiqadan so'ng qayta urining"})
		return
	}
	var in struct{ Password, Otp string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.Reauth(r.Context(), sess(r), in.Password, in.Otp, clientIP(r)); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "validMinutes": int(core.ReauthWindow.Minutes())})
}

func (s *Server) meSecurity(w http.ResponseWriter, r *http.Request) {
	se := sess(r)
	if se.Kind != "user" {
		writeErr(w, core.ErrForbidden)
		return
	}
	writeJSON(w, 200, map[string]any{
		"totpEnabled":      se.TOTPEnabled,
		"recoveryLeft":     s.Core.RecoveryCodesLeft(r.Context(), se.UserID),
		"reauthFresh":      s.Core.RecentReauth(se),
		"mfaSetupRequired": s.mfaSetupRequired(se),
		"secureMode":       s.Cfg.Secure(),
	})
}

// meTOTPSetup needs a fresh re-confirmation unless the account has no
// second factor yet and is being forced to enrol (then the login was just done).
func (s *Server) meTOTPSetup(w http.ResponseWriter, r *http.Request) {
	se := sess(r)
	if se.TOTPEnabled && !s.Core.RecentReauth(se) {
		writeErr(w, &core.Error{Status: 403, Code: "reauth_required", Msg: "Ikkinchi bosqichni almashtirish uchun qayta tasdiqlang"})
		return
	}
	if !se.TOTPEnabled && !s.Core.RecentReauth(se) {
		writeErr(w, &core.Error{Status: 403, Code: "reauth_required", Msg: "Davom etish uchun parolni qayta kiriting"})
		return
	}
	secret, uri, err := s.Core.TOTPSetup(r.Context(), se)
	if err != nil {
		writeErr(w, err)
		return
	}
	size, rows, err := qrRows(uri)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"secret": secret, "uri": uri, "qr": map[string]any{"size": size, "rows": rows}})
}

func (s *Server) meTOTPEnable(w http.ResponseWriter, r *http.Request) {
	var in struct{ Code string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	codes, err := s.Core.TOTPEnable(r.Context(), sess(r), in.Code)
	if err != nil {
		writeErr(w, err)
		return
	}
	s.Hub.ToAdmins("users", nil)
	writeJSON(w, 200, map[string]any{"recoveryCodes": codes})
}

func (s *Server) meTOTPDisable(w http.ResponseWriter, r *http.Request) {
	se := sess(r)
	if s.Cfg.Secure() && se.IsAdmin() {
		writeErr(w, &core.Error{Status: 409, Code: "totp_required", Msg: "Secure rejimda administrator ikkinchi bosqichsiz ishlay olmaydi. Uni o'chirish o'rniga yangi kalit yarating"})
		return
	}
	if !s.Core.RecentReauth(se) {
		writeErr(w, &core.Error{Status: 403, Code: "reauth_required", Msg: "Bu amal uchun qayta tasdiqlang"})
		return
	}
	if err := s.Core.TOTPDisable(r.Context(), se.Actor(clientIP(r)), se.UserID); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// ---- approvals of login-free sessions (special links) ----

func (s *Server) adminApprovals(w http.ResponseWriter, r *http.Request) {
	list, err := s.Core.PendingLinkRequests(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) adminApproveSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeErr(w, core.ErrBadRequest)
		return
	}
	var in struct{ VerifyCode string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.ApproveLinkSession(r.Context(), actor(r), id, in.VerifyCode); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) adminRejectSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeErr(w, core.ErrBadRequest)
		return
	}
	if err := s.Core.RejectLinkSession(r.Context(), actor(r), id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// ---- security status: what is enforced, what is not verified ----

// SecurityItem is one row of the security status. Status:
//
//	ok              enforced by the program and checked now
//	warn            works, but weaker than the production policy
//	fail            violates the production policy
//	unverified      depends on things the program cannot check (devices, network)
//	not_implemented the protection does not exist in this version
type SecurityItem struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
	Detail string `json:"detail"`
}

func (s *Server) securityItems(r *http.Request) []SecurityItem {
	cfg := s.Cfg
	var out []SecurityItem
	add := func(id, title, status, detail string) {
		out = append(out, SecurityItem{ID: id, Title: title, Status: status, Detail: detail})
	}
	if cfg.Secure() {
		add("mode", "Xavfsizlik rejimi", "ok", "security.mode = secure: ochiq interfeysda shifrlanmagan RTMP va ikkinchi bosqichsiz administrator taqiqlangan")
	} else {
		add("mode", "Xavfsizlik rejimi", "warn", "security.mode = standard. Production uchun config faylida security.mode: secure qiling")
	}
	add("links", "Havola faqat taklif", "ok", "Havola yoki QR video huquqini bermaydi: administrator aniq brauzer sessiyasini tekshirish kodi bilan tasdiqlaydi")
	if n := s.Core.AdminsWithoutTOTP(r.Context()); n == 0 {
		add("admin_mfa", "Administratorlar uchun ikkinchi bosqich (TOTP)", "ok", "Barcha faol administratorlarda TOTP yoqilgan")
	} else if cfg.Secure() {
		add("admin_mfa", "Administratorlar uchun ikkinchi bosqich (TOTP)", "warn", strconv.Itoa(n)+" ta administratorda TOTP yo'q: ular yoqmaguncha admin amallari bloklanadi")
	} else {
		add("admin_mfa", "Administratorlar uchun ikkinchi bosqich (TOTP)", "fail", strconv.Itoa(n)+" ta administratorda TOTP yo'q")
	}
	add("reauth", "Muhim amallarda qayta tasdiqlash", "ok", "Kalitni ko'rish/almashtirish, hisoblar, server holati: oxirgi "+strconv.Itoa(int(core.ReauthWindow.Minutes()))+" daqiqada parol (+TOTP) talab qilinadi")
	tlsMode := ""
	if s.Hooks.SystemInfo != nil {
		if ti, ok := s.Hooks.SystemInfo()["tls"].(tlsutil.Info); ok {
			tlsMode = ti.Mode
		}
	}
	switch tlsMode {
	case "self-signed":
		add("tls", "HTTPS sertifikati", "warn", "O'z-o'zidan imzolangan sertifikat: foydalanuvchi ogohlantirishni o'tkazib yuborsa, MITM'ni aniqlab bo'lmaydi. Ishonchli (CA yoki ACME) sertifikat o'rnating")
	case "acme", "file":
		add("tls", "HTTPS sertifikati", "unverified", "Sertifikat fayli/ACME ishlatilmoqda ("+tlsMode+"). Zanjir va nom mosligini boshqa qurilma brauzerida tekshiring")
	default:
		add("tls", "HTTPS sertifikati", "unverified", "Holat aniqlanmadi")
	}
	if p := config.PlainRTMPProblem(cfg.Media.RTMPListen); p != "" {
		add("ingest_plain", "Pult → server (oddiy RTMP)", "fail", p)
	} else if cfg.Media.RTMPListen == "" {
		add("ingest_plain", "Pult → server (oddiy RTMP)", "ok", "Shifrlanmagan RTMP o'chirilgan")
	} else {
		add("ingest_plain", "Pult → server (oddiy RTMP)", "unverified", "RTMP faqat "+cfg.Media.RTMPListen+" da (VPN/lokal). Bu interfeysga faqat ishonchli tarmoq yetishini tekshiring: RTMP o'zi shifrlanmaydi")
	}
	if cfg.Media.RTMPSListen != "" {
		add("ingest_rtmps", "Pult → server (RTMPS)", "unverified", "Server RTMPS'ni qabul qiladi. DJI Pilot 2 RTMPS'ni qo'llashi va sertifikatni tekshirishi real qurilmada tasdiqlanmagan")
	} else {
		add("ingest_rtmps", "Pult → server (RTMPS)", "not_implemented", "RTMPS yoqilmagan (media.rtmps_listen bo'sh)")
	}
	add("internal_ports", "Ichki API'lar", "ok", "MediaMTX API, WebRTC signalizatsiya va ichki hook faqat 127.0.0.1 da (ishga tushishda tekshiriladi)")
	add("server_sees_video", "Server videoni ochiq ko'radi", "unverified", "Joriy arxitektura: TLS/DTLS serverda tugaydi, MediaMTX videoni ochiq qabul qilib qayta paketlaydi. Server root'i va operatori videoni ko'ra oladi")
	add("e2ee", "Pultdan tomoshabingacha E2EE", "not_implemented", "Amalga oshirilmagan. DJI Pilot 2 manba tomonida E2EE qila olmaydi (SECURITY_MODEL.md)")
	add("stored_media", "Yuklangan media", "unverified", "Diskda ochiq saqlanadi (fayl huquqlari bilan himoyalangan); har bir so'rovda ruxsat tekshiriladi. Serverdan yashirilmagan")
	add("backup", "Backup", "ok", "Parol bilan shifrlanadi (Argon2id + AES-GCM)")
	add("telemetry", "Tashqi telemetriya", "ok", "Dastur tashqi analytics/telemetriya yubormaydi; STUN sukut bo'yicha bo'sh")
	return out
}

func (s *Server) adminSecurityStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"mode": s.Cfg.Security.Mode, "items": s.securityItems(r)})
}
