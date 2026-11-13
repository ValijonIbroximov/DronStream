# DronStream — arxitektura va qarorlar

## 1. Umumiy ko'rinish

```
 DJI pult (RTMP/RTMPS)        Brauzer (HTTPS + WebRTC)
        |  A-yo'l                    |  B-yo'l
        v                            v
 +----------------- Windows server ---------------------------+
 |  dronstream.exe (Go)                                       |
 |   - HTTPS UI/API (:8443), React build ichiga joylangan     |
 |   - WHEP proxy  /api/whep/*  -> 127.0.0.1:8889 (MediaMTX)  |
 |   - Ichki auth hook 127.0.0.1:9180/internal/mtx-auth/<sir> |
 |   - Reconciler (1 s) + Control API orqali kick             |
 |   - SQLite (data/dronstream.db, WAL)                       |
 |   - Demo manbalar (pion WHIP -> MediaMTX, faqat loopback)  |
 |   - ixtiyoriy TURN (pion/turn, qisqa muddatli hisoblar)    |
 |        | child process, Windows Job Object (kill-on-close) |
 |        v                                                   |
 |  mediamtx.exe v1.21.3                                      |
 |   - RTMP :1935 (VPN IP ga bog'lash tavsiya), RTMPS :1936   |
 |   - WebRTC HTTP 127.0.0.1:8889 (tashqariga yopiq)          |
 |   - WebRTC ICE UDP :8189 (+ ixtiyoriy TCP)                 |
 |   - Control API 127.0.0.1:9997 (tashqariga yopiq)          |
 |   - HLS/RTSP/SRT/MoQ/playback/metrics/pprof: O'CHIRILGAN    |
 +------------------------------------------------------------+
```

Bu **markaziy serverga ishonadigan** arxitektura: server videoni ochiq ko'rinishda qabul qiladi va qayta uzatadi. Bu end-to-end shifrlash EMAS. Server o'chsa yoki ishlamasa translatsiya ham bo'lmaydi.

## 2. Qarorlar (ADR qisqacha)

| # | Qaror | Sabab |
|---|---|---|
| D1 | MediaMTX **v1.21.3** (2026-10-25), SHA256 `b2f5246b...af74` tekshirilgan, versiya mahkamlangan | Rasmiy hujjat va `api/openapi.yaml` shu tegdan o'qildi |
| D2 | `authMethod: http` — har bir publish/read so'rovi backend hook'iga boradi | Har bir ulanishni bazadagi joriy holat bilan tekshirish; JWT esa backend o'chganda ham ishlab qolardi |
| D3 | `authHTTPExclude: [api]`, API faqat `127.0.0.1:9997` | Backend ishlamay qolganda ham ichki nazorat API'dan foydalana olishi kerak. Server kompyuterining lokal foydalanuvchilari ishonchli zona deb qabul qilinadi (SECURITY.md) |
| D4 | Playback: bir martalik **ticket** (32 bayt tasodifiy, 30 s, hash bazada), web-sessiya + stream + nonce'ga bog'langan | Doimiy URL yo'q, takroriy ishlatish rad |
| D5 | Brauzer MediaMTX'ga to'g'ridan-to'g'ri emas, backend WHEP proxy orqali boradi; backend `?ds=<nonce>` qo'shadi | Cookie + CSRF + ticket egasi tekshiriladi; ichki yo'l nomi va kalit brauzerga chiqmaydi |
| D6 | Hook'dagi `id` = MediaMTX WebRTC sessiya ID (tajribada tasdiqlandi) va `query` ham keladi | Media sessiyani ishonchli bog'lash (IP ga emas) |
| D7 | Revoke: tranzaksiya (BEGIN IMMEDIATE) → commit → Control API `kick` → reconciler (1 s) zaxira | "Avval bazaga, so'ng uzish"; poyga holatida ham ruxsatsiz sessiya ≤1–2 s ichida uziladi |
| D8 | Hook ham ruxsatni BEGIN IMMEDIATE ichida tekshiradi va media sessiyani yozadi | SQLite yozuvlari ketma-ket: hook revoke'dan oldin bo'lsa — revoke uni ko'radi va uzadi; keyin bo'lsa — hook rad etadi |
| D9 | Ijara (lease): hook `expireAt = min(now+lease, ruxsat tugashi, sessiya tugashi)`; default lease 120 s; frontend tugashidan oldin yangi ticket bilan "make-before-break" qayta ulanadi | Backend qotib qolsa ham MediaMTX o'zi sessiyani lease oxirida yopadi |
| D10 | MediaMTX backend'ning child jarayoni, **Job Object KILL_ON_JOB_CLOSE** | Backend jarayoni o'lsa OS MediaMTX'ni ham o'ldiradi → barcha media darhol to'xtaydi (fail-closed) |
| D11 | Ichki watchdog: baza sog'lig'i 3 marta ketma-ket buzilsa barcha o'quvchilar kick qilinadi va yangi ticketlar rad etiladi | Auth qismi ishlamasa ham ochiq sessiyalar qolmasin |
| D12 | `overridePublisher: false` + hook yo'l band bo'lsa rad etadi | Bir kalit bilan parallel publish: **birinchisi ushlab turadi, ikkinchisi rad**; yashirin manba almashtirish yo'q. Admin "Manbani uzish" bilan bo'shatadi |
| D13 | Publish kaliti: 24 bayt tasodifiy; bazada SHA-256 hash (tekshirish) + AES-256-GCM shifrlangan nusxa (adminga qayta ko'rsatish uchun); master kalit Windows DPAPI (LocalMachine) bilan himoyalangan | Kalit adminga qayta ko'rsatilishi kerak; qurilmaga bog'langan sir — restore paytida qayta bog'lanadi |
| D14 | Pult URL: `rtmp://HOST:1935/live/<slug>?key=<KALIT>` (query rejim). Muqobil: `rtmp://HOST:1935/live/<slug>/<KALIT>` (path rejim) — agar pult `?` ni qabul qilmasa | DJI ilovasi query'ni qabul qilishi real qurilmada tekshirilmagan |
| D15 | Demo manba: oldindan kodlangan H.264 baseline test tasviri (go:embed), pion WHIP orqali loopback'dan publish | Yakuniy foydalanuvchiga FFmpeg kerak emas; test tasvirda "DEMO — haqiqiy pult emas" yozuvi |
| D16 | SQLite: `modernc.org/sqlite` (CGO'siz), WAL, `busy_timeout` | Windows'da C kompilyatorsiz build |
| D17 | Backup: `VACUUM INTO` snapshot + config + master kalit → zip → Argon2id(passphrase) + AES-256-GCM | Izchil backup; sirlar shifrlangan |
| D18 | Restore yangi serverni **standby** rejimida ishga tushiradi; `backup --migrate-out` eski serverni "ko'chirilgan" holatga o'tkazadi | Ikki server bir vaqtda xizmat qilish xavfi |
| D19 | Real vaqt: SSE (`/api/events`) | Oddiy, HTTP/1.1 orqali ishlaydi |
| D20 | TLS: `config/secrets/tls.crt|key` bo'lsa ishlatiladi; bo'lmasa o'z-o'zidan imzolangan sertifikat avtomatik yaratiladi; ixtiyoriy ACME (Let's Encrypt) domen bo'lsa | Lokal ishlashdan boshlab haqiqiy domengacha |
| D21 | TURN: tashqi coturn (`use-auth-secret`) yoki ichki pion/turn — ikkalasida HMAC asosidagi qisqa muddatli hisob (default 10 daqiqa) | O'zimiz boshqaradigan relay; yashirin tashqi relay yo'q, STUN default bo'sh |
| D22 | Frontend: React + TS + Vite, tashqi UI kutubxonasiz, o'z hash-router | Kam bog'liqlik, CSP `script-src 'self'` |

## 3. Ma'lumotlar modeli (SQLite)
`users`, `guests`, `web_sessions`, `streams`, `permissions` (subject_type user|guest × stream, `expires_at`, `revoked_at`), `playback_tickets`, `media_sessions` (mtx_id, nonce, web_session_id, subject, stream, status pending|active|ended, end_reason), `audit_log`, `settings` (emergency_stop, instance_state, guest sozlamalari, audit muddati), `schema_version`.

## 4. Ruxsat tekshiruvi (bitta funksiya — `authorizeView`)
Ko'rish mumkin, agar hammasi to'g'ri bo'lsa: instance `active`; favqulodda to'xtatish o'chiq; stream mavjud va `viewing_enabled`; web-sessiya bekor qilinmagan va muddati o'tmagan; subject faol (user bloklanmagan / guest `approved` va tugamagan); admin bo'lmasa — faol `permissions` yozuvi (`revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now)`). Bu funksiya ticket berishda, hook'da va reconciler'da bir xil ishlatiladi.

## 5. Uzish yo'llari va kafolatlar
| Hodisa | Mexanizm | Kutilgan vaqt |
|---|---|---|
| Admin revoke/blok/sessiya yakunlash/stream yopish/favqulodda | DB commit → kick → SSE | o'lchanadi (maqsad ≤3 s) |
| Ruxsat muddati tugashi | MediaMTX `expireAt` + reconciler | ≤1–2 s |
| Kick so'rovi muvaffaqiyatsiz bo'lsa | reconciler har 1 s | ≤~2 s |
| Backend jarayoni o'ldi | Job Object → MediaMTX o'ladi | darhol (o'lchanadi) |
| Baza ishlamaydi | watchdog → hammasini kick | ~3–5 s |
| Backend qotib qoldi (jarayon tirik) | lease (`expireAt`) | ≤ lease (120 s default) |
| Brauzer allaqachon olgan kadrlar | qaytarib bo'lmaydi | — |

## 6. Joylashuv (Windows)
```
<ROOT>\app\<versiya>\dronstream.exe, mediamtx\mediamtx.exe
<ROOT>\app\active.txt                 – faol versiya
<ROOT>\config\dronstream.yaml         – sirsiz sozlama
<ROOT>\config\secrets\                – master.key (DPAPI), tls.*, turn
<ROOT>\data\dronstream.db, backups\, runtime\
<ROOT>\logs\dronstream.log, mediamtx.log
```

## 7. Tarmoq portlari
| Port | Kim uchun | Tashqariga |
|---|---|---|
| 8443/tcp HTTPS | brauzerlar | ha |
| 8189/udp (+tcp ixtiyoriy) WebRTC ICE | brauzerlar | ha |
| 1935/tcp RTMP (shifrlanmagan) | pult yoki serverdagi gateway | secure: faqat `127.0.0.1` yoki o'chiq; boshqa manzil — faqat laboratoriya rejimida |
| 1936/tcp RTMPS | pultlar | ha (agar RTMPS ishlasa) |
| 3478/udp+tcp TURN (ixtiyoriy) | brauzerlar | ha |
| 8889, 9997, 9180 | ichki | **yo'q** (127.0.0.1) |

## 8. v1.1 qo'shimchalari (sxema v2)
| # | Qaror | Sabab |
|---|---|---|
| D23 | `contents` jadvali: stream/matn/rasm/video yagona kutubxona; har stream uchun bitta `stream` kontent (sarlavha alohida, `streams.slug` texnik yo'l o'zgarmaydi) | Bitta ruxsat modeli barcha turlar uchun |
| D24 | `grants`: (user\|guest\|link) × (content\|collection); collection uchun `include_future` — dinamik yoki grant paytida content grantlarga yoyiladi ("hozirgi elementlar") | Yashirin qo'shimcha huquq yo'q; siyosat aniq |
| D25 | Yagona `authorizeContent` (+ stream uchun `authorizeView` o'rami): chipta, hook, reconciler, fayl/thumbnail/Range, kutubxona | Bir joyda, serverda |
| D26 | Maxsus havola: `access_links` (token SHA-256 + AES-GCM nusxa master kalit bilan, master kalit DPAPI — bazadan tashqarida), `link_activations(link_id, request_id)` idempotentlik; faollashtirish BEGIN IMMEDIATE ichida | Atomar sarflash; parallel urinishda bitta g'olib; qayta yuborilgan POST qayta sarflamaydi (10 daqiqa oyna) |
| D27 | Havola URL'i `https://<public-base>/link#<token>`: token **fragmentda** | Brauzer fragmentni serverga yubormaydi: GET/preview/skaner sarflamaydi, log va Referer'ga tushmaydi; sahifa tokenni `replaceState` bilan olib tashlaydi |
| D28 | Havola sessiyasi = oddiy server sessiyasi (`web_sessions.kind='link'`), muddati min(sessiya, havola tugashi) | Refresh/tab/qayta ulanish sarflamaydi |
| D29 | Media fayllar `data\media\<32 hex>` (mijoz yo'l bermaydi), haqiqiy format: magic bytes + `image.DecodeConfig`, MP4 `stsd` kodek, WebM CodecID; SVG/HTML rad; transkodlash yo'q | FFmpeg runtime'da kerak emas |
| D30 | Fayl yetkazish: har so'rovda ruxsat; `ctxReadSeeker` + `Transfer` reyestri; reconciler/revoke kontekstni bekor qiladi → javob o'rtada uziladi | "Faqat keyingi so'rovni bloklash" bilan cheklanmaslik |
| D31 | Backup v2: oqimli STREAM-AES-GCM (1 MiB bo'laklar, nonce prefiks‖hisoblagich‖oxirgi bayroq), ZIP ichida media; v1 o'qiladi | Katta media uchun xotira chegaralangan; kesish/almashtirish aniqlanadi |
| D32 | Sxema migratsiyasi versiyaga qarab; migratsiyadan oldin avtomatik `VACUUM INTO` nusxa; eski binary yangi sxemani rad etadi; rollback mos backup orqali | Eski binary yangi sxemaga ulanmaydi |
| D33 | QR: serverda go-qrcode matritsasi, brauzer canvas'ida chiziladi (sarlavha + Toshkent vaqti) | Tokenli havola tashqi servisga yuborilmaydi |
| D34 | `dronstream check` (faqat o'qish): config, papkalar, MediaMTX, portlar, TLS, baza sxemasi, setup holati | Start/Tayyorla skriptlari aniq tashxis beradi |

## 9. v1.2 qo'shimchalari
| # | Qaror | Sabab |
|---|---|---|
| D35 | Chegara birligi — **player joyi** (web-sessiya, stream, tab); joyda eng ko'pi 2 media sessiya (jonli + yangilanish); chipta faqat efirdagi stream uchun; MediaMTX rad etgan urinishning `pending` yozuvi darhol yopiladi; shu joyning ortiqcha eski ulanishi yangi so'rovda uziladi | "Juda ko'p ulanish" nuqsoni: offline joy har 5 s da 10 s yashaydigan `pending` qoldirardi; 9 player bir vaqtda yangilanganda chegara oshardi |
| D36 | Ijara uzunligi server soatiga nisbatan (`serverNow`) hisoblanadi; `pagehide` da WHEP DELETE (keepalive); tab identifikatori BroadcastChannel orqali takrorlanishdan saqlanadi | Qurilma soati noto'g'ri bo'lsa yangilanish siljimasin; sahifa yangilanganda sessiya qolmasin; "Duplicate tab" joylarni bo'lishmasin |
| D37 | PowerShell: `Set-StrictMode -Version 3.0` hamma joyda; statik tekshiruv `tests/ps-lint.ps1` | StrictMode'ni o'chirib xatoni yashirish o'rniga sabablar tuzatildi (skalyarda `.Count`, bo'sh natijada property) |
| D38 | Platformaga xos kod build teglari bilan ajratilgan: `job_windows.go` (Job Object), `job_linux.go` (`Pdeathsig`), `dpapi_windows.go` / `dpapi_other.go`, `perm_unix.go` / `perm_windows.go`, `service_windows.go` / `service_other.go` | Bitta kod bazasi, CGO'siz, ikki platforma |
| D39 | Linux joylashuvi Windows bilan bir xil: `<ROOT>/app/<ver>/`, `config/`, `data/`, `logs/` (+ `app/current` symlink — systemd `ExecStart` uchun); sukut bo'yicha `/opt/dronstream`; xizmat hisobi `dronstream` | Backup/update/rollback mantig'i ikki platformada bir xil |
| D40 | Qo'llanmaning yagona manbasi `guide/src/guide.md` (yengil markdown + `:::cmd`, `:::note`, `:::story`); `guide/build.mjs` undan `info.html` (hammasi ichida, o'z CSP'si bilan) va `backend/internal/webui/help/*` (tashqi CSS/JS, `go:embed`) ni hosil qiladi; `--check` sinxronlikni tekshiradi | Bir matn ikki joyda qo'lda yuritilmaydi; admin sahifasi qat'iy CSP ostida ishlaydi |
| D41 | Admin yordam ustki oynada (`iframe` + `inert`), sahifa almashtirilmaydi | O'ynayotgan videolar qayta ulanmasin |
| D42 | Linux runtime sinovi GitHub Actions'da (Ubuntu 24.04, haqiqiy systemd); Windows → Linux backup ko'chirish ikki runner orasida artefakt orqali | Ishlab chiquvchi kompyuterida WSL/Docker yo'q; cross-compile runtime sinovi emas |
| D43 | O'rnatish kodi faqat interaktiv terminalga chop etiladi (`os.ModeCharDevice`) | systemd ostida stdout journald'ga yoziladi |

### Linux'dagi farqlar (qisqacha)
| Mavzu | Windows | Linux |
|---|---|---|
| Master kalit | DPAPI LocalMachine (`DSK1`) | Fayl 0600 + alohida hisob (`DSK0`), har startda tekshiriladi |
| MediaMTX fail-closed | Job Object KILL_ON_JOB_CLOSE | `PR_SET_PDEATHSIG` + systemd `KillMode=control-group` |
| Xizmat | Windows service (`service-install.ps1`) | systemd unit (`install.sh`), cheklovlar bilan |
| To'xtatish | `dronstream stop` / service stop | SIGTERM (`systemctl stop`) yoki `dronstream stop` |
| Paket | `.zip`, PowerShell skriptlari, BAT | `.tar.gz`, bash skriptlari |
| Firewall | `firewall-rules.ps1` (ko'rsatadi / `-Apply` / `-Remove`) | ufw buyruqlari qo'llanmada (skript o'zi ochmaydi) |

## 10. v1.3 qo'shimchalari (sxema v3)
| # | Qaror | Sabab |
|---|---|---|
| D44 | Havola faollashtirish = `web_sessions.approval='pending'` + `verify_code`; admin `ApproveLinkSession(session, code)` BEGIN IMMEDIATE ichida limitlarni tekshiradi va `uses_count` ni oshiradi | Havola egasi bo'lish = kirish huquqi emas; begona so'rov limitni yemasin; parallel tasdiqda ham limit oshmasin |
| D45 | `sessionSubject` (yagona ruxsat funksiyasining kirish qismi) link sessiyasi uchun `approval='approved'` talab qiladi | Chipta, hook, reconciler, fayl, kutubxona — hammasi bir joydan rad etadi |
| D46 | TOTP stdlib bilan (HMAC-SHA1, 30 s, 6 raqam), `totp_last_step` bilan replay himoyasi; sir master kalit bilan AES-GCM | Tashqi bog'liqliksiz standart algoritm; bazaning o'zi sirni ochmaydi |
| D47 | `reauth_at` sessiyada; `sensitive` middleware 10 daqiqa | O'g'irlangan cookie bilan eng xavfli amallar bajarilmasin |
| D48 | `security.mode`; secure'da `rtmp_listen` faqat **loopback** yoki bo'sh (`config.ClassifyPlainRTMP`), aks holda `Validate` xato (fail-closed). Xususiy IP, CGNAT, link-local va host nomi ham rad. "Bu interfeys VPN" degan bayroq yo'q; TOTP gate admin middleware'da | Xususiy IP shifrlash emas va dastur tunnel interfeysini ishonchli aniqlay olmaydi; tekshirib bo'lmaydigan va'da berilmaydi. Loopback istisnosining ishonch chegarasi: SECURITY_MODEL.md 4.2 |
| D49 | Migratsiya v2→v3 avtomatik `VACUUM INTO pre-migration-schema-v2-*.db` dan keyin; eski havola sessiyalari `pending` + yangi kod | Qat'iyroq siyosat mavjud sessiyalarga ham qo'llanadi |
| D50 | E2EE amalga oshirilmagan: joriy DJI Pilot 2 → MediaMTX oqimida E2EE yo'q; mos publisher/SDK imkoniyati hujjatlarda bor, qurilmada tekshirilmagan; MediaMTX kadrlarni ochiq qayta paketlaydi; brauzer JS'i serverdan keladi | SECURITY_MODEL.md 6-bo'lim (A/B/C variantlar) — maket yoki animatsiya bilan almashtirilmaydi |
| D51 | CI'da paket ushlash (`tests/ci/pcap-check.py`): WebRTC UDP'da demo SPS/SEI yo'q, oddiy RTMP'da kalit ochiq | Shifrlash borligi va oddiy RTMP xavfi uchun qo'shimcha dalil (yagona isbot emas) |
| D52 | Mehmon tasdig'i ham kod bilan: `ApproveGuestObjects(…, verifyCode, …)` tranzaksiya ichida solishtiradi; `GuestInfo.VerifyCode` va `PendingApproval.VerifyCode` JSON'ga chiqmaydi | Kodni administrator ko'rsa, uni so'ramasdan tasdiqlashi mumkin; kod faqat tomoshabin ekranida |
| D53 | `standard` = laboratoriya rejimi: `sessionOut.securityMode/plainIngest` (faqat adminlarga) va har sahifadagi ogohlantirish; holat panelining boshida o'zgarmas 4 xulosa (`securitySummary`) | Rejim TOTP qulfi ortida ham ko'rinsin; "video maxfiyligi tayyor" degan taassurot sozlamadan kelib chiqmasin |
| D54 | 1.3 gacha ochilgan havola sessiyasi (`link_activations.approved=1`, sessiya `pending`) tasdiqlanganda `uses_count` oshirilmaydi va `used_up` uni rad etmaydi | Foydalanish eski versiyada sanalgan; bir martalik havola egasi yangilanishdan keyin qayta tasdiqlana olishi kerak |
| D55 | (ish jarayonida, hali repozitoriyda yo'q) `poc/e2ee/` — mahsulotdan alohida Go moduli: SFrame (RFC 9605) + HPKE (RFC 9180), manba simulyatori → kalitsiz relay → qabul qiluvchi/brauzer. Mahsulot kodi uni import qilmaydi | E2EE imkoniyatini standartlar asosida tekshirish; DJI'da ishlaydi degan da'vo yo'q |
