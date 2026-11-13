# DronStream — ish jurnali

## Bajarildi (2026-11-13)
1. **Muhit**: Windows 11 Pro, 16 mantiqiy yadro, 32 GB RAM. Node 22.7, Git 2.56 bor edi. Go 1.27.4, MediaMTX v1.21.3, FFmpeg (faqat dev) `.tools/` ga yuklandi, SHA256 tekshirildi.
2. **MediaMTX v1.21.3** hujjati va `api/openapi.yaml` rasmiy tegdan o'qildi; tajriba (spike) bilan tasdiqlandi: hook `id` = WebRTC sessiya ID, `query` va `token` keladi, `expireAt` sessiyani yopadi, `kick` darhol RTP ni to'xtatadi.
3. **Topilgan va hal qilingan muammolar**:
   - Hook ichidan MediaMTX API ni sinxron chaqirish deadlock beradi (3 s timeout) → band yo'l tekshiruvi reconciler keshiga o'tkazildi; qat'iy kafolat `overridePublisher: false`.
   - `expireAt` soniyagacha qisqartirilgani muddatdan ~1 s oldin uzardi → RFC3339Nano.
   - DB watchdog 10 s busy-timeout tufayli sekin edi → alohida 1 s timeout ulanishi va mustaqil goroutine.
   - Frontend: revoke'dan keyin slot boshqa streamga o'tib ketardi → slotlar barqaror, sabab ko'rsatiladi.
   - PowerShell 5.1: BOM'siz UTF-8 "—" belgisi skriptni buzardi → skriptlar ASCII; native stderr `Stop` bilan to'xtatardi → `Invoke-DsExe`; `Start-Process -Redirect*` handle meros qilib chaqiruvchini osiltirardi → yo'naltirish olib tashlandi.
4. **Backend (Go)**: auth (Argon2id, sessiyalar, CSRF, rate limit), mehmonlar, streamlar va kalitlar (SHA-256 + AES-GCM, DPAPI master kalit), ruxsatlar, bir martalik chiptalar, MediaMTX hook, WHEP proxy, reconciler + kick, watchdog, Job Object, demo manbalar (WHIP), TURN (ixtiyoriy), TLS (fayl / self-signed / ACME), SSE, audit va saqlash muddati, backup/restore/migrate-out/standby, Windows service rejimi, CLI.
5. **Frontend (React+TS)**: login/mehmon/setup, kutish, tomoshabin (1/2×2/3×3, to'liq ekran, watermark, holatlar, lease yangilash), admin (7 bo'lim), qorong'i, mobil.
6. **Tarqatish**: `build.ps1`, versiyalangan zip + SHA256, install/start/stop/status, service install/uninstall, firewall, backup/restore, update/rollback.
7. **Testlar**: unit (core, secure, logx, backup, mtx, web), integratsiya (17 ssenariy, real MediaMTX/WebRTC/RTMP), o'rnatish-ko'chirish (19 tekshiruv), yangilash-rollback (8), yuklama 4×5, brauzerda qo'lda tekshiruvlar. Natijalar: TEST_REPORT.md.
8. **Hujjatlar**: README_UZ, INSTALL_UZ, ADMIN_GUIDE_UZ, DJI_SETUP_UZ, SECURITY, BACKUP_RESTORE_UZ, TEST_REPORT, ARCHITECTURE, REQUIREMENTS.

## Keyingi ishlar (real muhit kerak)
- Real DJI Mavic 3T / DJI Pilot 2 bilan DJI_SETUP_UZ.md 4-bo'limdagi sinov protokoli (RTMP+VPN, RTMPS, `?key=` qo'llanishi).
- Haqiqiy server manzili/domeni: CA sertifikat yoki ACME, firewall, router port yo'naltirish.
- Tashqi internet / NAT / CGNAT / mobil tarmoqdan tomosha; TURN real tarmoqda.
- Toza yangi Windows kompyuterda o'rnatish va Windows service rejimi.
- Haqiqiy ikki kompyuter orasida ko'chirish (boshqa DPAPI kaliti).
- Haqiqiy tarmoqda (LAN/Wi-Fi/4G) yuklama o'lchovi.

## Ishlab chiquvchi uchun eslatma
- Dev muhit: `source scripts/devenv.sh` (Git Bash) — Go `.tools/go` dan.
- Dev server: `build/dronstream.exe run --root devroot`; UI: `npm --prefix web run dev` (5173, `/api` → 8443 proxy).
- Kontekst qisqarsa: REQUIREMENTS.md → ARCHITECTURE.md → shu fayl → TEST_REPORT.md.

## v1.1.0 (2026-11-13)
### Bajarildi
- Sxema v2 migratsiyasi (kontent, to'plam, grant, maxsus havola, link sessiyalar); migratsiyadan oldin avtomatik izchil nusxa; real 1.0.0 bazasidan migratsiya sinalgan.
- Maxsus havolalar (bir/N martalik, vaqtinchalik, parallel chegara, sessiya davomiyligi), fragment-token, idempotent atomar faollashtirish, bekor qilish/yangilash, QR (o'z serverimizda) va ulashish.
- Kontent: matn/rasm/video yuklash (haqiqiy format tekshiruvi, H.265/SVG/HTML rad), to'plamlar (dinamik/hozirgi), ommaviy sarlavha, yashirish, tartib; fayl/thumbnail/Range har so'rovda ruxsat; revoke'da yuklash uziladi.
- Admin: yangi menyu, 3 bosqichli wizard, havola kartalari, sessiyalar, "Nimani ko'radi?", sozlamalar (public base URL), Toshkent vaqti.
- Backup v2 (oqimli shifrlash, media bilan); rollback skripti sxema o'zgarishida mos backupni tiklaydi.
- `DronStreamStart.bat`, `DronStreamTayyorla.bat`, `push.bat`, `pull.bat` + `scripts\ds-*.ps1`, `dronstream check`.
- Topilgan/tuzatilgan: Tashkent vaqt regexi (`\d` yo'qolgan), test binary'da SPA yo'qligi, link rate limit NAT uchun konfiguratsiyaga chiqarildi, PS 5.1 da 260 belgilik yo'l chegarasi (vositalar uchun qisqa zaxira papka), eski binary `check` ni bilmasligi.

### Keyingi (real muhit kerak)
- Real DJI, VPN, internet/NAT/TURN, toza yangi Windows kompyuter, Windows service, haqiqiy ikki kompyuter orasida ko'chirish.
- Clipboard rasm va tizim ulashishining muvaffaqiyatli yo'li real Chrome/Edge va telefonda (ichki sinov brauzerida faqat fallback sinaldi).

## v1.2.0 — ISH JARAYONIDA (boshlandi 2026-11-13)
Topshiriq: R570 serveriga tayyorlash, admin "?" yordam, mustaqil `info.html`, Linux yo'li, skriptlarni yakunlash.
Kontekst siqilsa shu bo'lim + `git log` + `git status` orqali davom eting. Tayyor ishni qayta yozmang.

### Boshlanish holati (tekshirilgan)
- `main` = `7baf400`, remote bilan bir xil, ish daraxti toza. CLAUDE.md / AGENTS.md yo'q.
- Foydalanuvchi serveri `build\dronstream.exe run --root runtime` (8443/1935/9997/9180/8889) ishlab turibdi — TO'XTATILMAYDI. Dev build boshqa faylga (`build\devbin\`), testlar boshqa portlarda.
- Foydalanuvchi tasdiqlagan: Pixel 6 Pro (Android 17, Chrome 156) USB lokal tarmoq orqali 2 ta demo WebRTC video ko'rdi (Chrome'ga "Yaqin-atrofdagi qurilmalar" ruxsati kerak bo'ldi). Bu faqat lokal + demo.

### Topilgan nuqsonlar (v1.1.0 da bor, tuzatilishi kerak)
1. **"Juda ko'p ulanish" (asosiy sabab)**: efirda bo'lmagan stream sloti har 5 s da chipta + WHEP urinadi; hook chiptani sarflab `media_sessions` ga `pending` yozadi, MediaMTX 404 qaytaradi, lekin `pending` yozuv reconciler'da 10 s yashaydi (`manager.go` pass, `age < 10_000`). 3-urinishda slot chegarasi (`tabStream >= 2`, `core/media.go` IssueTicket) → 429 → Player `deny()` (avtomatik qayta urinmaydi).
2. Lease yangilanishida 429 kelsa `Player.tsx` o'ynayotgan videoni ham `deny()` qiladi (403 uchun `renewal && cur.current` tekshiruvi bor, 429 uchun yo'q).
3. Subyekt chegarasi (12) sessiyalarni sanaydi: 3×3 da 9 player bir vaqtda yangilansa vaqtincha 18 → yangilanishlar rad.
4. Sahifa yangilanganda/yopilganda React unmount ishlamaydi → WHEP DELETE yuborilmaydi; eski sessiya MediaMTX ICE timeout'igacha (~30 s) qoladi.
5. `Player.tsx`: muvaffaqiyatsiz renewal ulanishi yopilmaydi (`onDrop` da `cur.current !== dropped` → return); WHEP 201 dan keyingi xatoda resurs DELETE qilinmaydi; `alive` ref effekt qayta ishlaganda eski `connect` ni to'xtatmaydi.
6. Mobil: `.player-top` (sarlavha + statistika) va `.watermark` (pos2/pos3 `top:14%`) kichik playerda ustma-ust tushadi.

### Reja (tartib bilan) va holat — yangilangan 2026-11-13 kechqurun
- [x] A. Sessiya limiti/Player tuzatishlari + testlar (commit c024c46). Brauzerda tasdiqlangan: offline joy 30 s dan keyin ham "kutilmoqda"; chegara xabari "3/3"; 375 px da overlaylar ustma-ust emas.
- [x] B. StrictMode 3.0 qayta yoqildi (`ds-common.ps1`, `packaging/scripts/common.ps1`, testlar, `build.ps1`); `tests/ps-lint.ps1` (commit 2721eb4).
- [x] C. Linux kodi va paketlash: SIGTERM, Pdeathsig, mediamtx nomi, master.key 0600 tekshiruvi, `packaging/linux/*` (preflight/install/backup/restore/update/rollback/uninstall-service, systemd unit), `build-package.sh`.
- [~] C2. CI (`.github/workflows/ci.yml`, `tests/ci/*`): Ubuntu 24.04 runner'da unit (7 paket) va integratsiya (4 test) O'TDI; paket sinovi 44/45 (topilgan nuqson: setup kodi journald'ga tushardi — tuzatildi, commit a13ba0e, CI qayta tekshirishi kerak). Windows→Linux backup ko'chirish (windows-backup + migrate ishlari) HALI O'TMAGAN: `make-windows-backup.ps1` da 400 xato, sababi aniqlanmoqda (annotatsiyaga server javobi qo'shildi).
- [x] D. Qo'llanma: `guide/src/{guide.md,template.html,guide.css,guide.js,meta.json}` → `node guide/build.mjs` → `info.html` + `backend/internal/webui/help/*`; `/api/admin/help/` (faqat admin, alohida CSP, `help_test.go`); admin panel va tomosha sahifasida "?" (`web/src/components/Help.tsx`). Brauzerda tekshirilgan: qidiruv, mundarija, kod belgilash, Esc, fokus, video uzilmasligi.
- [ ] D2. `info.html` ni haqiqiy file:// da (headless Edge) tarmoq so'rovisiz ochilishini tekshirish; chop etish; avto namoyish va reduced-motion.
- [ ] E. `SERVER_INSTALL_UZ.md`, README/SECURITY/TEST_REPORT/ARCHITECTURE/REQUIREMENTS yangilash.
- [ ] F. `build.ps1`: guide build + info.html + SERVER_INSTALL_UZ + Linux paket, mavjud versiya ustidan yozmaslik (`-Force`). Testlar: go unit, integratsiya (hammasi), install-roundtrip, update-rollback 1.1.0→1.2.0, scripts-test. Paketlar: `dist/DronStream-1.2.0-win64.zip` va `-linux-amd64.tar.gz`. Push (`push.bat`).

### Sinov muhiti eslatmasi
- Brauzer sinovi uchun vaqtinchalik server: scratchpad ichidagi `uiroot` (portlar 58443/59180/59997/58889/58189/51935), binary `build/devbin/dronstream-dev.exe`, Vite: launch config `web-dev-test` (5174, `DS_DEV_API`). Ish tugagach to'xtatiladi.
- CI holatini ko'rish (ochiq repo, autentifikatsiyasiz): GitHub API `actions/runs` va `check-runs/<job id>/annotations` (skriptlar `::error` / `::notice` chiqaradi).
- Foydalanuvchining o'z serveri (`runtime/`, 8443) butun ish davomida ishlab turibdi va eski 1.1.0 binary'da — unga tegilmagan.

### Qarorlar (v1.2)
- Versiya 1.2.0 (sxema o'zgarmasa v2 qoladi; 1.1.0 paketi ustidan yozilmaydi).
- Linux'da master kalit: `DSK0` (ochiq 32 bayt) + fayl 0600, papka 0700, alohida xizmat foydalanuvchisi; DPAPI Linux'da ochilmaydi → ko'chirish faqat parolli `.dsbak` orqali (backup ichida xom kalit bor, restore qayta bog'laydi).
- Qo'llanma kontenti bitta manbada; `info.html` va admin ko'rinishi build paytida hosil qilinadi; push oldidan sinxronlik tekshiriladi.

### To'siqlar
- Haqiqiy R570 ga kirish yo'q: OS noma'lum → o'rnatish bajarilmaydi, faqat preflight + qo'llanma + paket.
- Bu kompyuterda WSL ham, Docker ham yo'q: Linux runtime sinovi faqat GitHub Actions (Ubuntu 24.04 runner) orqali. Haqiqiy R570 va Ubuntu 26.04 sinalmagan.
