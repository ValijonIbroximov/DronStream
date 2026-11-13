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

## v1.2.0 (2026-11-13) — YAKUNLANDI
Topshiriq: R570 serveriga tayyorlash, admin "?" yordam, mustaqil `info.html`, Linux yo'li, skriptlarni yakunlash.
Keyingi ish shu bo'lim + `git log` + `TEST_REPORT.md` (v1.2 bo'limi) dan boshlanadi.

### Bajarildi
1. **"Juda ko'p ulanish" nuqsoni** (v1.1.0 da bor edi). Sabablar: efirda bo'lmagan joy har 5 s da 10 s yashaydigan `pending` sessiya qoldirardi; ijara yangilanishidagi 429 o'ynayotgan videoni to'xtatardi; chegara sessiyalarni sanardi. Tuzatish: chegara **player joylari** bo'yicha (`core/media.go` activeCounts), offline stream uchun chipta berilmaydi, MediaMTX rad etgan urinish darhol yopiladi (`DropPendingMedia`), shu joyning eski ulanishi yangi so'rovda uziladi (`Manager.SupersedeSlot`), `Player.tsx` qayta yozildi (epoch, pagehide, server soati bo'yicha ijara). Testlar: `core/slots_test.go`, `integration/slots_test.go`.
2. **Mobil player**: sarlavha, statistika va watermark alohida joylarda (container query).
3. **StrictMode 3.0** barcha PowerShell skriptlarida qayta yoqildi; sabablar tuzatildi; `tests/ps-lint.ps1`.
4. **Linux**: SIGTERM, `PR_SET_PDEATHSIG`, platformaga xos fayllar, `master.key` 0600 tekshiruvi; `packaging/linux/` (preflight, install, systemd unit, backup, restore, update, rollback, uninstall-service, build-package); tanlangan distributiv Ubuntu Server 26.04 / 24.04 LTS.
5. **CI** (`.github/workflows/ci.yml`, `tests/ci/`): Ubuntu 24.04 da unit + integratsiya + paket sinovi (systemd), Windows runner'da olingan shifrlangan backupni Linux'da tiklash.
6. **Qo'llanma**: yagona manba `guide/src/guide.md` → `node guide/build.mjs` → `info.html` + `backend/internal/webui/help/`; `/api/admin/help/` faqat adminga; "?" tugmasi (`web/src/components/Help.tsx`).
7. **Hujjatlar**: `SERVER_INSTALL_UZ.md` (yangi), README, SECURITY (13), ARCHITECTURE (9, D35–D43), REQUIREMENTS (R14), ADMIN_GUIDE (13), INSTALL (10), TEST_REPORT (v1.2), `guide/SOURCES.md`.
8. **Paketlar**: `dist/DronStream-1.2.0-win64.zip`, `dist/DronStream-1.2.0-linux-amd64.tar.gz`. `build.ps1`: `-Linux`, `-Force`, qo'llanmani hosil qiladi, mavjud paket ustidan yozmaydi, `build\dronstream.exe` ga tegmaydi.

### Ish davomida topilgan va tuzatilgan boshqa nuqsonlar
- systemd ostida bir martalik o'rnatish kodi journald'ga yozilardi (CI topdi) → faqat interaktiv terminalda chop etiladi.
- `restore`: yozib bo'lmagan nusxa haqida "yozildi" deb xabar berardi → endi haqiqiy holat.
- Integratsiya testi yiqilganda serverini qoldirardi va keyingi testlarni yiqitardi → `t.Cleanup`.
- `build.ps1` paket yig'ishda `build\dronstream.exe` ni almashtirardi (server shu fayldan ishlab turgan edi) → alohida `build\release\`.

### Muhim qarorlar
- Chegara birligi — player joyi; joyda eng ko'pi 2 sessiya (ARCHITECTURE D35).
- Linux'da kalit himoyasi: fayl 0600 + alohida hisob; ko'chirish faqat parolli `.dsbak` orqali (D38, SECURITY 13).
- Qo'llanma bitta manbadan; admin sahifasi inline'siz, qat'iy CSP ostida (D40).
- Linux runtime sinovi faqat CI'da: bu kompyuterda WSL ham, Docker ham yo'q (D42).

### Hozirgi holat va to'siqlar
- Foydalanuvchining serveri (`runtime\`, 8443) hali **1.1.0 jarayonida** ishlab turibdi; `build\dronstream.exe` fayli esa 1.2.0 (yig'ish paytida almashgan, eski tasvir `dronstream.exe~`). Server qayta ishga tushirilganda 1.2.0 bo'ladi; sxema o'zgarmagan (v2).
- Haqiqiy R570 ga kirish yo'q: OS noma'lum, o'rnatish bajarilmagan.
- GitHub API autentifikatsiyasiz soatiga 60 so'rov: CI natijasini tez-tez so'ramang yoki run sahifasini brauzerda oching.

### Keyingi aniq qadamlar (real muhit kerak)
1. R570 da `SERVER_INSTALL_UZ.md` 1-bo'limidagi faqat o'qiydigan buyruqlar bilan OS'ni aniqlash; Linux bo'lsa `scripts/preflight.sh`.
2. Tanlangan yo'l bo'yicha o'rnatish; health-check; demo video boshqa qurilmadan; birinchi backup; rejali qayta yuklash sinovi.
3. Tashqi internet: public IP/domen, sertifikat, firewall, `webrtc_additional_hosts`; boshqa internetdan qabul testi.
4. Haqiqiy DJI pulti: RTMP + VPN; RTMPS'ni alohida sinash (`DJI_SETUP_UZ.md`).
5. Telefon(lar)da 1.2.0 interfeysini tekshirish (player joylari, "?" oynasi, `info.html`).

## v1.3.0 — ISH JARAYONIDA (boshlandi 2026-11-13 kech)
Topshiriq (ustuvorlik bo'yicha): 1) video maxfiyligi — xavfsizlik modeli, havola = faqat taklif (admin aniq sessiyani tasdiqlaydi), admin TOTP/recovery/qayta tasdiqlash, secure rejimda shifrlanmagan ingest cheklovi, pult→server→brauzer auditi, E2EE imkoniyati va blockerlari; 2) haqiqiy 3D interaktiv `info.html` (Three.js offline, 12 sahna, scroll timeline).
Avvalgi xavfsizlik va info.html dizayniga oid zid talablar shu topshiriq bilan almashtirildi.

### Boshlanish holati
- `main` = `9b1e652` (remote bilan bir xil), ish daraxti toza. Foydalanuvchi serveri `runtime\` da 1.1.0 jarayonida ishlab turibdi — tegilmaydi.
- Referens: `Downloads\index (1).html` (Three.js r170 CDN'dan, Google Fonts) — faqat mexanikasi olinadi, CDN/font ko'chirilmaydi. Rasmlar topshiriqqa biriktirilmagan.

### Ish taqsimoti
- 3D qo'llanma: alohida worktree'da ishchi agent (guide/, info.html, webui/help, web/package.json — three). guide.md prosasiga tegmaydi; sahna xaritasi `guide/src/scenes.json`.
- Asosiy oqim (shu sessiya): backend xavfsizlik, hujjatlar, testlar, guide.md matni, paket.

### Holat (yangilangan)
- [x] A. Audit + SECURITY_MODEL.md, SECURITY_ACCEPTANCE.md.
- [x] B. Havola = so'rov; admin kod bilan aniq sessiyani tasdiqlaydi; sxema v3; eski havola sessiyalari pending (TestMigrationFromV2, 1.1.0 binary bilan).
- [x] C. TOTP + tiklash kodlari + 10 daqiqalik qayta tasdiqlash (unit, web, CI).
- [x] D. security.mode secure (paket sukuti): ochiq oddiy RTMP bilan ishga tushmaydi; TOTP gate; xavfsizlik holati paneli.
- [x] CI run 43469801243 (commit 4449afa): Ubuntu paket sinovi 55/55 (secure, TOTP, RTMP rad), Windows->Linux 12/12, pcap: 45444 WebRTC UDP paketida ochiq H.264 0, oddiy RTMP'da kalit ochiq.
- [x] Frontend: kutish sahifasida kod, so'rovlarni kod bilan tasdiqlash, TOTP yoqish, ReauthHost, xavfsizlik holati (brauzerda tekshirildi).
- [ ] E. 3D qo'llanma — agent worktree'da; birlashtirilgach scenes.json ga yangi bo'limlar (kim-koradi, admin-mfa, secure-rejim) qo'shiladi.
- [ ] F. Vizual qabul, 1.3.0 paket, TEST_REPORT v1.3, push.

### Reja
- [ ] A. Audit + `SECURITY_MODEL.md` (kim videoni ochiq ko'radi, TLS qayerda tugaydi, E2EE blockerlari).
- [ ] B. Havola = taklif: link sessiyasi admin tasdiqlamaguncha media/kontent olmaydi; tasdiqlash kodi; eski havolalar migratsiyasi (sxema v3).
- [ ] C. Admin TOTP (RFC 6238) + recovery kodlar + muhim amallarda qayta tasdiqlash.
- [ ] D. `security.mode: secure`: ochiq interfeysdagi oddiy RTMP rad; RTMPS fallback yo'q; `check` hisobotida tasdiqlangan/tasdiqlanmagan himoyalar.
- [ ] E. 3D qo'llanma birlashtirish (agent natijasi) + guide.md matni yangi siyosatga.
- [ ] F. `SECURITY_ACCEPTANCE.md`, testlar, vizual qabul, 1.3.0 paket, push.
