# DronStream — test hisoboti

Sana: 2026-11-13. Versiya: 1.0.0 (paket `dist\DronStream-1.0.0-win64.zip`). MediaMTX v1.21.3.
Muhit: bitta ishlab chiquvchi kompyuteri — Windows 11 Pro, 16 mantiqiy yadro, 32 GB RAM. **Barcha manbalar, server va tomoshabinlar bir kompyuterda (loopback)**. Real DJI, tashqi internet va boshqa kompyuter ishtirok etmagan.

Belgilar: ✅ avtomatik test o'tdi · 🖐 qo'lda (brauzerda) tekshirildi · ⛔ sinalmagan

## 1. Avtomatik testlar va qanday ishga tushiriladi
| To'plam | Buyruq | Natija |
|---|---|---|
| Go unit (core, secure, logx, backup, mtx, web) | `cd backend; go test ./internal/...` | ✅ hammasi o'tdi |
| Integratsiya: real `dronstream.exe` + MediaMTX + demo (WHIP) + FFmpeg RTMP + pion WebRTC tomoshabinlar HTTPS WHEP proxy orqali | `go test -tags integration -run TestAcceptance ./integration/` | ✅ 17/17 ssenariy (257 s) |
| Yuklama 4 stream × 5 tomoshabin | `go test -tags integration -run TestLoad ./integration/` | ✅ (5-bo'lim) |
| Ichki TURN, faqat-relay tomoshabin | `go test -tags integration -run TestTURNRelay ./integration/` | ✅ |
| Paketdan toza ROOT ga o'rnatish → backup → boshqa toza ROOT ga tiklash | `tests\install-roundtrip.ps1 -Zip dist\...zip` | ✅ 19/19 |
| Yangilash 1.0.0 → 1.0.1 → rollback | `tests\update-rollback.ps1 -OldZip … -NewZip …` | ✅ 8/8 |
| Frontend tiplar va build | `npm --prefix web run build` (build.ps1 ichida) | ✅ |

Xom natijalar: `build\test-results\*.json` (Git'ga kirmaydi).

## 2. Qabul talablari (11-bo'lim) bo'yicha
| Talab | Qanday tekshirildi | Natija |
|---|---|---|
| Tasdiqlanmagan guest video yoki thumbnail ololmaydi | Pending guest: `/api/streams` bo'sh; har qanday stream uchun chipta 403; soxta chipta bilan WHEP 403; thumbnail endpoint mavjud emas (404); admin API 403 | ✅ |
| A foydalanuvchi B uchun ajratilgan streamni API orqali ham ocholmaydi | A ga B stream chiptasi 403; A ning chiptasi B sessiyasida 403; A chiptasi boshqa stream URL ida 403 | ✅ |
| Publish kaliti playback ruxsati bermaydi | Kalit chipta sifatida proxy orqali → 403; kalit to'g'ridan-to'g'ri MediaMTX WHEP (loopback) → hook rad; oddiy foydalanuvchi kalitni ko'ra olmaydi | ✅ |
| Noto'g'ri kalit / boshqa stream yo'li | FFmpeg RTMP noto'g'ri kalit bilan rad; pult1 kaliti demo-a yo'liga rad | ✅ |
| Parallel publish | Bir xil kalit bilan ikkinchi FFmpeg rad etildi, birinchisi davom etdi | ✅ |
| Bekor qilingan publish kaliti bilan qayta ulanish rad | Kalit almashtirishda joriy publisher 63 ms da uzildi, eski kalit rad; kalit bekor qilinganda publisher uzildi, qayta ulanish rad | ✅ |
| Publish taqiqi ≠ tomosha yopish | Publish taqiqida FFmpeg rad; tomosha yopilganda tomoshabin uzildi, manba efirda qoldi | ✅ |
| Admin ruxsatni olib tashlaganda barcha tegishli media sessiyalar uziladi | 5 marta: oxirgi RTP paket revoke so'rovi boshlanishiga nisbatan −16…+1 ms (maks **1 ms**) | ✅ (maqsad ≤3 s) |
| Eski URL/token bilan qayta ulanish ishlamaydi | Revoke'dan keyin eski chipta 403, yangi chipta `permission_revoked`; chipta ikkinchi marta ishlatilsa rad | ✅ |
| Ruxsat muddati tugaganda ochiq video ham uziladi | Muddat +6 s; video muddatga nisbatan **−35 ms** da to'xtadi; keyin chipta `permission_expired` | ✅ |
| Bloklangan hisobning barcha sessiyalari bekor | 2 qurilma, ikkala video ~1 ms da uzildi, ikkala cookie 401, login 403; boshqa foydalanuvchi ta'sirlanmadi | ✅ |
| Bir IP dagi ikki foydalanuvchidan faqat tanlangani uziladi | 127.0.0.1 dagi alice va bob; bob revoke → faqat bob uzildi, alice davom etdi | ✅ |
| Mehmon oqimi | Tasdiq → faqat tanlangan stream; yakunlash → video uzildi, sessiya 401; boshqa "brauzer" → yangi so'rov, ruxsat meros qolmadi | ✅ |
| Favqulodda to'xtatish | Ikki tomoshabin −28…0 ms; chipta `emergency_stop` | ✅ |
| Revoke ↔ ulanish poyga holati | 25 ta real WebRTC iteratsiya (turli kechikishlar) — sizish **0**; 40 ta unit iteratsiya — 0 | ✅ |
| Auth (baza) ishlamay qolishi | DB eksklyuziv qulflandi → watchdog ochiq videoni **3.6 s** da uzdi; qulf olingach qayta ishladi | ✅ |
| Backend qulashi | `dronstream.exe` majburan o'ldirildi → oxirgi paket −5 ms, MediaMTX OS tomonidan o'ldirildi (Job Object), HTTPS javob bermaydi | ✅ |
| Backend qotib qolishi (lease) | Yangilanmaydigan mijoz: MediaMTX sessiyani lease (20 s) oxirida o'zi yopdi (18.1 s — 2 s ulanish vaqti) | ✅ (qotishni o'zi simulyatsiya qilinmagan; lease mexanizmi alohida sinaldi) |
| Guest xabari XSS bajarmaydi | API JSON da `<script>`; brauzerda admin "So'rovlar" sahifasi: `img[src=x]`=0, `<b>` teg=0, alert yo'q 🖐; CSP `script-src 'self'` | ✅ 🖐 |
| HTTPS | Barcha integratsiya testlari HTTPS (self-signed) orqali; cookie `__Host-`/Secure/HttpOnly/SameSite=Strict, HSTS/CSP sarlavhalari (unit) | ✅ |
| RTMP/VPN trafik yo'li | RTMP faqat konfiguratsiyadagi manzilga bog'lanishi (generatsiya qilingan config tekshirildi); RTMP pull (o'qish) rad; HLS/RTSP/SRT/metrics/pprof/playback portlari yopiq | ✅ qisman · ⛔ real VPN |
| Backup boshqa toza muhitda tiklanadi | Ishlayotgan serverda backup → boshqa toza ROOT: foydalanuvchilar, stream, ruxsat, kalit (DPAPI qayta bog'langan) tiklandi; standby → faollashtirish; noto'g'ri parol rad; backup faylida ochiq kalit/SQLite yo'q | ✅ (bir kompyuterda) · ⛔ haqiqiy boshqa kompyuter |
| Kamida ikki test manba va bir nechta tomoshabin bilan haqiqiy media integratsiyasi | 2 demo (WHIP) + 2 FFmpeg RTMP, 20 pion tomoshabin; brauzerda 2×2 da ikki demo bir vaqtda 🖐 | ✅ 🖐 |
| Bir martalik admin, admin/admin yo'q | admin/admin 401; noto'g'ri kod 403; kod qayta ishlatilsa 403 | ✅ |
| Login rate limit, CSRF, Origin | 15 urinishda 429; CSRF siz/noto'g'ri 403; begona Origin 403; maxsus sarlavhasiz 403 | ✅ |

## 3. Qo'lda (brauzerda) tekshirilganlar 🖐
Chromium asosidagi ichki brauzer, Vite dev server (`/api` → HTTPS backend proxy):
- Setup sahifasi → admin yaratish → bosh sahifa (2/2 efirda).
- Tomosha: WebRTC video 640×360 25 fps, 1 va 2×2 ko'rinish, watermark (ism + vaqt) ko'rindi.
- Oddiy foydalanuvchi: majburiy parol almashtirish; admin revoke → slotda "Ruxsat bekor qilindi — Administrator bu stream uchun ruxsatingizni bekor qildi", ikkinchi stream davom etdi.
- Bloklash → kirish sahifasida "Hisobingiz administrator tomonidan bloklandi."
- Mehmon so'rovidagi XSS matni admin panelda oddiy matn sifatida.
- Lease 25 s bilan 55 s tomosha: video bir soniya ham to'xtamadi, holat overlay chiqmadi; sessiyalar har ~11 s da almashdi (`client_closed`) — uzilishsiz yangilash ishlaydi.
- Mobil (375×812): tomoshabin va admin sahifalari moslashdi.
- Streamlar va Faol tomoshabinlar sahifalari haqiqiy statistika bilan (masalan demo-a 0.60 Mbit/s, H264 640×360).

## 4. Topilgan va tuzatilgan nuqsonlar (test natijasida)
1. Hook ichidan MediaMTX API chaqirig'i deadlock (3 s) → kesh.
2. `expireAt` soniyaga qisqarishi → millisekund aniqlik.
3. Watchdog sekinligi (10 s busy) → 1 s alohida ulanish, mustaqil goroutine.
4. Revoke'dan keyin UI slot siljishi → barqaror slot + sabab.
5. PowerShell 5.1 kodirovka, native stderr, handle merosi muammolari → tuzatildi, testlar bilan qayta tasdiqlandi.

## 5. Yuklama: 4 stream × 5 tomoshabin (60 s, bitta kompyuter)
| Ko'rsatkich | Qiymat |
|---|---|
| Manbalar | demo-a 0.61 Mbit/s, demo-b 0.27 Mbit/s (640×360), load1/load2 2.54/2.56 Mbit/s (1280×720 30 fps, FFmpeg RTMP) |
| Jami kirish / chiqish | 5.99 Mbit/s / 29.9 Mbit/s |
| MediaMTX CPU | 39 % bitta yadrodan (16 mantiqiy yadroning ~2.4 %) |
| DronStream backend CPU | 3.3 % bitta yadrodan |
| RAM (maks) | MediaMTX 136 MB, backend 90 MB |
| To'xtab qolgan tomoshabin | 0 / 20 |
| Tomoshabin RTP paket/s | 42 – 367 (stream bitrate ga mos) |

Izoh: FFmpeg kodlovchilar va 20 pion mijoz ham shu kompyuterda ishladi (ular hisobga kiritilmagan). Tarmoq loopback — haqiqiy kanal, Wi-Fi yoki 4G dagi xatti-harakat **o'lchanmagan**. Chiqish trafigi taxminan "stream bitrate × tomoshabinlar soni" — server internet kanalini shunga qarab rejalang. O'lchanmagan sig'im kafolatlanmaydi.

## 6. SINALMAGAN (aniq ro'yxat) ⛔
1. **Real DJI Mavic 3T / DJI RC / DJI Pilot 2** — RTMP, RTMPS, sertifikat tekshiruvi, URL dagi `?key=` qabul qilinishi, H.264/H.265 tanlovi, audio. Yo'riqnoma: DJI_SETUP_UZ.md 4-bo'lim.
2. **VPN (OpenVPN)** orqali real ulanish, UDP/TCP rejimlari, VPN uzilganda trafik oqishi yo'qligi (router darajasida).
3. **RTMPS** umuman real mijoz bilan (FFmpeg RTMPS ham ishga tushirilmagan); CA sertifikat bilan.
4. **Tashqi internet**: public IP, NAT port yo'naltirish, CGNAT, mobil tarmoq, UDP bloklangan tarmoqlar, `webrtc_tcp_listen`.
5. **TURN** real tarmoqda (faqat loopback'da sinaldi); tashqi coturn bilan moslik (faqat HMAC format unit test bilan).
6. **ACME / Let's Encrypt** (haqiqiy domen kerak); CA sertifikat bilan HTTPS.
7. **Toza yangi Windows kompyuter**ga o'rnatish (faqat shu kompyuterdagi toza papkaga); Windows 10 / Server.
8. **Windows service** rejimi (`service-install.ps1`) va SCM qayta ishga tushirish — tizim sozlamasini o'zgartirgani uchun ishga tushirilmadi.
9. **Firewall skripti** `-Apply` bilan (faqat ko'rsatish rejimi yozilgan; ishga tushirilmadi).
10. **Haqiqiy boshqa kompyuterga ko'chirish** (boshqa DPAPI kaliti bilan).
11. **Brauzerlar matritsasi**: faqat Chromium asosidagi ichki brauzer; Firefox, Safari/iOS, haqiqiy Android telefon sinalmagan. Ovoz chiqishi sinalmagan.
12. **Uzoq muddatli barqarorlik** (soatlab/kunlab ishlash), log rotatsiyasi, audit tozalashning real vaqtda ishlashi (faqat unit test).
13. **Backend qotib qolishi**ning o'zi (faqat lease mexanizmi alohida).
14. Tovushli bildirishnoma (WebAudio) — kod bor, eshitib tekshirilmadi.

## 7. Xulosa
Ruxsat va majburiy uzish integratsiyasi (eng xavfli qism) real MediaMTX va real WebRTC sessiyalari bilan isbotlandi: revoke/blok/favqulodda/muddat holatlarida media 3 s maqsaddan ancha tez (ms darajasida, lokal) to'xtadi, poyga holatlarida sizish topilmadi, backend yoki baza ishdan chiqqanda tizim yopiq holatga o'tdi. Real qurilma, real tarmoq va boshqa kompyuter bilan bog'liq bandlar yuqoridagi ro'yxatda — ular bajarilmaguncha ishlab chiqarishga tayyor deb hisoblanmasin.

---

# v1.1.0 test hisoboti (2026-11-13)
Paket: `dist\DronStream-1.1.0-win64.zip`. Muhit o'sha: bitta Windows 11 kompyuter, loopback. Belgilar yuqoridagidek.

## A. Avtomatik testlar
| To'plam | Natija |
|---|---|
| Go unit (core: havolalar, to'plamlar, migratsiya; mediafiles; backup v2; web: QR decode, base URL, PNG nomi; eski unit testlar) | ✅ |
| Integratsiya `TestAcceptance` (v1.0 ning 17 ssenariysi, sxema v2 da qayta) | ✅ 17/17 |
| Integratsiya `TestLinksAndMedia` | ✅ |
| Integratsiya `TestMigrationFromV1` (real 1.0.0 binary yaratgan baza) | ✅ |
| Integratsiya `TestTURNRelay`, `TestLoad` | ✅ |
| `tests\install-roundtrip.ps1` (1.1.0 paket) | ✅ 19/19 |
| `tests\update-rollback.ps1` 1.0.1 → 1.1.0 → rollback 1.0.1 | ✅ 10/10 |
| `tests\scripts-test.ps1` (BAT/PS1 skriptlar) | ✅ 21/21 |
| Frontend `tsc -b` + `vite build` | ✅ |

## B. Talablar bo'yicha (8-bo'lim)
| Talab | Natija |
|---|---|
| Bir martalik havolaga parallel urinishlar: faqat bittasi sessiya oladi | ✅ HTTP orqali 20 brauzer → 1 g'olib; unit: 30 → 1 |
| Preview GET va QR ko'rish sarflamaydi | ✅ `/link` GET ×3, admin QR/share ×3, inspect ×3 → foydalanish 0; brauzerda landing ochilganda 0, bosilgandan keyin 1 🖐 |
| Faollashtirish qayta yuborilsa ikki marta sarflanmaydi | ✅ bir xil `requestId` → foydalanish 1, oldingi sessiya almashtirildi |
| Refresh, tab va media qayta ulanishi sarflamaydi | ✅ 5× session/library, 2 tab WebRTC, qayta ulanish → 1; brauzerda reload → 1 🖐 |
| Boshqa brauzerda ishlatilgan bir martalik token rad | ✅ `link_used_up` |
| N martalik limit parallel kirishda oshmaydi | ✅ N=3: HTTP 15 parallel → 3; unit 25 → 3 |
| Vaqt boshlanishidan oldin va tugagandan keyin rad | ✅ `link_not_started`, `link_expired` |
| Muddat tugashi yoki revoke ochiq jonli va yuklangan videoni uzadi | ✅ havola revoke: jonli video −10 ms; 20 MB video yuklash 0.33 MB da, revoke'dan 5 ms keyin uzildi; havola muddati: jonli −20 ms, yuklash 1.08 MB da uzildi |
| Media URL, thumbnail va Range orqali aylanib o'tib bo'lmaydi | ✅ ruxsatsiz user 403, anonim 401 (fayl, thumb, Range); yashirin kontent 403; yo'l hiylalari ma'lumot qaytarmadi |
| Ruxsat olib tashlanganda matn/rasm interfeysdan yo'qoladi | ✅ API; 🖐 brauzerda matn va rasm real vaqtda yo'qoldi, video qoldi; havola bekor qilinganda kirish sahifasi + sabab. Olingan nusxani qaytarib bo'lmasligi SECURITY.md 12-bo'limda |
| To'plam o'zgarishi ruxsat siyosatiga muvofiq | ✅ dinamik: yangi element ochiladi, olib tashlangan yopiladi; "hozirgi elementlar": yangi element ochilmaydi |
| QR decode = yaratilgan havola | ✅ Go: matritsa render → gozxing; 🖐 **brauzer canvas'idan olingan haqiqiy PNG** dekodlandi — aynan teng |
| Clipboard image va ulashish fallback | 🖐 ichki brauzerda ikkalasi qo'llanmaydi → tushunarli xabar + "PNG yuklab olish" taklifi chiqdi. Muvaffaqiyatli yo'l (real Chrome/Edge, telefon) ⛔ sinalmagan |
| Eski baza migratsiyasida hisob va ruxsatlar saqlanadi | ✅ real 1.0.0 bazasi: login, muddatli ruxsat (muddati saqlangan), bekor qilingan ruxsat bekorligicha; avtomatik pre-migration nusxa; audit `schema_migrate`; devroot dev bazasi ham migratsiya qilindi 🖐 |
| Backup/restore media, havola hisoblagichlari va bekor qilinganlikni saqlaydi | ✅ video SHA-256 bir xil; uses_count va `revoked` saqlandi |
| Restore'dan keyin eski sessiyalar bekor; ishlatilgan bir martalik havola qayta ochilmaydi | ✅ eski cookie 401; yangi va eski `requestId` bilan faollashtirish rad |
| Rollback: eski binary yangi sxemaga ulanmaydi | ✅ 1.0.0 binary v2 bazani "newer than this program" bilan rad etdi; v1 backup tiklangach ishladi; `rollback.ps1` mos `pre-update-*.dsbak` ni avtomatik tikladi |
| Yuklash tekshiruvi | ✅ H.265 MP4, SVG (onload), HTML, soxta PNG sarlavhasi, exe rad; PNG/JPEG/GIF, H.264 MP4 (faststart va oddiy), VP9 WebM qabul |

## C. Skriptlar (4-bo'lim F)
| Tekshiruv | Natija |
|---|---|
| Bo'sh joy va Unicode (`Yangi papka ўзбek`, `Yangi kompyuter ğ`) papkada | ✅ |
| Tayyor serverni qayta ochish — takroriy jarayon yo'q | ✅ jarayonlar 1 → 1; parallel ikki Start → 1 jarayon |
| Yetishmayotgan fayl → avtomatik tayyorlash va bir martalik qayta urinish | ✅ (paket: `active.txt` yo'q; manba: eskirgan build — Node 22.23.5 checksum bilan yuklandi, Go qayta yuklanmadi) |
| Tayyorlash xatosida cheksiz sikl yo'q | ✅ MediaMTX olib tashlanganda: aynan 1 ta tayyorlash, "Qayta urinilmaydi", kod 4 |
| Band port | ✅ kod 2, port va egasi jarayon nomi bilan ko'rsatildi; begona listener to'xtatilmadi |
| Internet yo'q | ✅ `-Offline`: vositalar bor — qayta yuklamay ishladi; vositalar yo'q — kod 6 va aniq xabar. (Haqiqiy tarmoq uzilishi emas, `-Offline` rejimi bilan simulyatsiya) |
| Pull lokal o'zgarishni saqlaydi | ✅ kod 4, o'zgarish joyida, stash yo'q |
| Push muvaffaqiyatsiz — lokal commit saqlanadi | ✅ remote yetib bo'lmaganda "SAQLANGAN" |
| Remote oldinda / tarixlar ajralgan | ✅ push force'siz to'xtadi; pull reset/merge qilmadi |
| Yangi kompyuterni taqlid qiluvchi toza papkada clone | ✅ faqat `pull.bat` → clone → Tayyorla (Go 1.27.4, Node 22.23.5, MediaMTX yuklandi, checksum, npm ci, build) → `DronStreamStart.bat` manzili ko'rsatildi; band `DronStream` papka ustidan yozilmadi |
| Sir va ma'lumot fayllari push'ga kirmaydi | ✅ PEM kalit — push to'xtadi, qiymat chiqmadi, commit yo'q; `baza.db`, `runtime\` yuborilmadi; yangi clone'da baza/master kalit yo'q |
| Setup kodi logga yozilmaydi | ✅ |
| Topilgan nuqson | PS 5.1 260 belgilik yo'l chegarasi: uzun papkada Go arxivi ochilmay qolardi (jim) → vositalar qisqa `%LOCALAPPDATA%\DronStream\t-<id>` ga, kutilmagan xatolar endi sabab+log bilan |

## D. v1.1 da sinalmagan ⛔
1. Real DJI / VPN / internet / NAT / CGNAT / TURN (o'zgarmagan, v1.0 ro'yxati).
2. **Real yangi Windows kompyuteri** (skriptlar shu kompyuterdagi toza papkalarda sinaldi; Git, PowerShell, .NET bu yerda allaqachon bor edi). Windows 10 da sinalmagan.
3. Clipboard rasm nusxasi va tizim ulashishining **muvaffaqiyatli** yo'li (real Chrome/Edge, Android/iOS).
4. Haqiqiy internet uzilishi (faqat `-Offline` simulyatsiyasi).
5. Windows service va firewall skriptlari (tizim sozlamasi).
6. Backend qotib qolganda jonli video ≤ lease (120 s) davom etishi mumkinligi — cheklov saqlanadi, bartaraf etilmagan; yuklangan media uchun baho SECURITY.md 12-bo'limda; qotishning o'zi sinalmagan.
7. Katta (GB) videolar bilan backup va yuklash (20 MB gacha sinalgan; oqimli dizayn bo'yicha xotira chegaralangan).
8. GitHub'ga birinchi push GitHub hisobi orqali (natija yakuniy javobda).

## E. Yuklama (v1.1 kodida qayta)
4 stream × 5 tomoshabin, 62 s: 20/20 to'xtamadi; MediaMTX 38 % bitta yadro, backend 5.5 %; RAM 135 / 92 MB; chiqish 29.8 Mbit/s.

---

# v1.2.0 test hisoboti (2026-11-13)
Paketlar: `dist\DronStream-1.2.0-win64.zip`, `dist\DronStream-1.2.0-linux-amd64.tar.gz`.

Ikki xil muhit bor va ular aralashtirilmaydi:
- **Lokal**: bitta ishlab chiquvchi kompyuteri, Windows 11 Pro, loopback (avvalgi bo'limlardagi kabi).
- **CI**: GitHub Actions'ning bir martalik virtual mashinalari — Ubuntu 24.04.5 LTS (x86_64, systemd bor) va Windows Server (windows-latest). Bu **haqiqiy Linux runtime**, lekin haqiqiy R570 serveri ham, Ubuntu 26.04 ham emas.

Belgilar yuqoridagidek: ✅ avtomatik test o'tdi · 🖐 qo'lda (brauzerda) tekshirildi · ⛔ sinalmagan.

## A. Avtomatik testlar (lokal, Windows 11)
| To'plam | Natija |
|---|---|
| Go unit: core (shu jumladan `slots_test.go` — player joylari), secure, logx, backup, mtx, mediafiles, web (shu jumladan `help_test.go`) | ✅ 7 paket |
| Integratsiya `TestAcceptance` (17 ssenariy) | ✅ |
| Integratsiya `TestLinksAndMedia` | ✅ |
| Integratsiya `TestPlayerSlots` (yangi) | ✅ |
| Integratsiya `TestMigrationFromV1` (haqiqiy 1.0.0 binary yaratgan baza) | ✅ |
| Integratsiya `TestTURNRelay`, `TestLoad` | ✅ |
| `tests\install-roundtrip.ps1` (1.2.0 paket) | ✅ 19/19 |
| `tests\update-rollback.ps1` 1.1.0 → 1.2.0 → rollback 1.1.0 | ✅ 10/10 |
| `tests\scripts-test.ps1` (BAT/PS1, StrictMode 3.0 ostida) | ✅ 21/21 |
| `tests\ps-lint.ps1` — 23 skript: PS 5.1 sintaksisi, ASCII, qiymat berilmagan o'zgaruvchi, xavfli `.Count`, StrictMode yoqilganligi | ✅ 0 xato, 0 ogohlantirish |
| `node guide/build.mjs --check` — qo'llanma manbasi = hosil qilingan fayllar | ✅ |
| Frontend `tsc -b` + `vite build` | ✅ |
| Cross-compile `GOOS=linux go build ./...` va `go vet` | ✅ (bu runtime sinovi emas — runtime B bo'limda) |

Izoh: to'liq integratsiya to'plamining birinchi yurishida `TestMigrationFromV1` yiqildi (test chiptani demo manba efirga chiqmasdan so'ragan — endi bunday holatda server ataylab `stream_offline` qaytaradi) va qolgan ikki test shu yiqilgan test qoldirgan server tufayli yiqildi. Test tuzatildi (real player kabi kutadi), harness yiqilgan testdan keyin serverni albatta to'xtatadigan qilindi. Yakuniy to'liq yurish: 6 testning hammasi bitta yurishda o'tdi (519 s). Xuddi shunday, `tests\install-roundtrip.ps1` ham birinchi yurishda ikki joyda to'xtadi (StrictMode ostida yo'q property; efirda bo'lmagan stream uchun chipta kutilgani) — test tuzatildi, mahsulot kodi emas.

## B. Linux — CI'da, haqiqiy Ubuntu 24.04 (run #6, commit fd90b53, `.github/workflows/ci.yml`)
| Tekshiruv | Natija |
|---|---|
| `go vet` va unit testlar Linux'da | ✅ 7 paket |
| Integratsiya Linux'da (haqiqiy MediaMTX linux/amd64, WebRTC, FFmpeg RTMP): `TestAcceptance`, `TestLinksAndMedia`, `TestPlayerSlots`, `TestTURNRelay` | ✅ 4/4. Shu jumladan backend `kill` qilinganda MediaMTX o'lishi (`PR_SET_PDEATHSIG`) |
| Linux paketi shu yerda yig'ildi (`packaging/linux/build-package.sh`) va o'rnatildi | ✅ |
| `tests/ci/linux-package-test.sh` — jami | ✅ 45/45 |
| · preflight: to'siq yo'q; to'ldirilmagan `<...>` va tizim papkasi ROOT sifatida rad etiladi | ✅ |
| · `install.sh --enable --start`: systemd `active` va `enabled` | ✅ |
| · xizmat root emas, `dronstream` hisobida; MediaMTX uning child jarayoni | ✅ |
| · huquqlar: `master.key` 600 (format `DSK0`), sozlama 640 root:dronstream, `data` 700; xizmat o'z binary'sini o'zgartira olmaydi | ✅ |
| · birinchi administrator bir martalik kod bilan; **kod journald'ga yozilmagan** | ✅ (birinchi yurishda ❌ edi — nuqson topildi va tuzatildi) |
| · demo manbalar efirda, chipta beriladi; efirda bo'lmagan stream → `stream_offline` | ✅ |
| · fail-closed: backend `kill -9` → MediaMTX 3 s ichida yo'q; systemd xizmatni qayta ishga tushirdi | ✅ |
| · `install.sh` qayta ishga tushirilganda sozlama o'zgarmadi | ✅ |
| · `master.key` huquqi 644 qilinsa xizmat ishga tushmaydi va sababini yozadi; 600 ga qaytarilgach ishlaydi | ✅ |
| · `backup.sh` (ishlab turganda), fayl shifrlangan, vaqtinchalik parol fayli qolmadi; noto'g'ri parol rad; `restore.sh`; tiklangach standby; faollashtirish | ✅ |
| · `update.sh` 9.9.1 → 9.9.2, ma'lumotlar joyida; `rollback.sh` (yangilashdan oldingi backup tiklandi) | ✅ |
| · `uninstall-service.sh`: unit olib tashlandi, ma'lumotlar qoldi, jarayon qolmadi | ✅ |
| **Windows → Linux**: Windows mashinasida server ishga tushirildi (master kalit DPAPI, `DSK1`), ma'lumot yaratildi, shifrlangan backup olindi; Ubuntu'da tiklandi | ✅ 12/12: admin kiradi, server standby'da boshlanadi, pult kaliti o'qiladi, ruxsat va matn ko'chgan, rasm SHA-256 bir xil, master kalit `DSK0` 600 ga qayta bog'langan |

CI'da ishlatilgan versiya raqamlari (9.9.1, 9.9.2) faqat sinov uchun; chiqarilgan paket — 1.2.0 (xuddi shu skript bilan yig'iladi). **Aynan `dist` dagi 1.2.0 tar.gz fayli Linux'da ishga tushirilmagan** — u Windows'da cross-compile qilingan; CI esa xuddi shu manbadan Linux'ning o'zida yig'ilgan paketni sinaydi.

## C. Talablar bo'yicha
| Talab | Natija |
|---|---|
| "Juda ko'p ulanish" sababi | Aniqlandi: (1) efirda bo'lmagan stream joyi har 5 s da chipta + WHEP urinardi, hook `pending` sessiya yozardi, MediaMTX 404 qaytarardi, lekin yozuv 10 s yashardi → uchinchi urinish joy chegarasiga (2) urilardi; (2) ijara yangilanishida 429 kelsa player o'ynayotgan videoni ham to'xtatardi; (3) chegara sessiyalarni sanardi — 9 player bir vaqtda yangilansa vaqtincha 18 bo'lardi |
| Offline joy uzoq vaqt qayta urinadi | ✅ unit; ✅ integratsiya (8 urinish — har biri `stream_offline`, sessiya qolmadi); 🖐 brauzerda 30 s dan keyin ham "Manba efirda emas… Kutilmoqda" |
| Hook qabul qilgan, MediaMTX rad etgan urinish sessiya qoldirmaydi | ✅ integratsiya (manba chipta bilan ulanish orasida uzildi: 3 urinish, 0 sessiya) |
| Chegaradagi ijara yangilanishi | ✅ unit (chegara 3: uch joy bir vaqtda yangilandi); ✅ integratsiya (chegara 2) |
| Chegara haqiqatan tugasa: son va maslahat | ✅ integratsiya (429, `scope=subject`, 2/2); 🖐 brauzerda "…chegaraga yetdi (3/3). Boshqa oyna yoki qurilmadagi videolarni yoping…" + "Qayta urinish" |
| Sahifa qayta yuklanishi / eski sessiyalar | ✅ integratsiya (3 marta ketma-ket: yangisi ulandi, eskisi uzildi, boshqa joy tegilmadi); 🖐 yangilanganda eski sessiya `client_closed`, tab yopilganda ~1 daqiqada `disconnected` |
| Mobil player: sarlavha, statistika, watermark | 🖐 375 px da o'lchandi: uch qatlam bir-birini kesmaydi; shriftlar 12.8 / 11.2 / 10.9 px. (Video ichidagi "DEMO" yozuvi va vaqt kodi — tasvirning o'zi, overlay emas) |
| "?" tugmasi | 🖐 tartib Parol → Chiqish → ?; `title` va `aria-label` "Yordam va qo'llanma"; haqiqiy `button`, fokus oladi; 36×36 px (teginish ekranida CSS bo'yicha 44×44); `Esc` yopadi, fokus tugmaga qaytadi; "Yangi tabda ochish" havolasi |
| Yordam endpointi faqat adminga | ✅ `help_test.go`: anonim 401; oddiy foydalanuvchi va mehmon 403 (sahifa va ikkala fayl); qat'iy CSP; boshqa fayllar berilmaydi; boshqa javoblar `X-Frame-Options: DENY` |
| Yordam ochilganda streamlar qayta yuklanmaydi | 🖐 ikki video: yordam ochiq turgan 5.6 s davomida o'sha `<video>` elementlari, `currentTime` 6.78 → 12.38 s, holat `playing`; yangi chipta faqat efirda bo'lmagan joyning davriy urinishi |
| `info.html` offline / `file://` | ✅ headless Chrome, `file://`, DNS to'liq bloklangan: sahifa ochildi, skript ishladi (34 kod paneli, 17 placeholder belgisi, 54 bo'lim); sahifaning o'zi hech qanday tarmoq so'rovi yubormadi (brauzer jurnalidagi 6 ta so'rov — Chrome'ning o'z fon xizmatlari). ✅ `help_test.go`: tashqi resurs, tarmoq chaqiruvi, inline handler yo'q |
| Qidiruv, mundarija | 🖐 "havola" → 10 bo'lim, belgilangan parchalar; topilmasa "Hech narsa topilmadi"; mundarijadan sakrash sarlavhani panel ostiga qo'yadi |
| XSS | ✅ generator hamma matnni escape qiladi, testda placeholderlar `&lt;…&gt;`; 🖐 qidiruvga `<img onerror>` kiritilganda element yaratilmadi; skriptda `innerHTML`/`eval` yo'q (test) |
| Nusxalash fallback'i | 🖐 "Belgilash" kodni belgiladi; "Nusxalash" clipboard ishlamagan muhitda "Avtomatik nusxalab bo'lmadi. Kod belgilandi — Ctrl+C" ko'rsatdi. Clipboard'ning **muvaffaqiyatli** yo'li ⛔ (sinov brauzerida foydalanuvchi harakatisiz ruxsat berilmaydi) |
| Chop etish | ✅ headless Chrome PDF: 41 bet; 🖐 print uslublari ekranda qo'llanganda: panel, mundarija, sahna va tugmalar yashirin, oq fon, 6 bosqich ro'yxat ko'rinishida, kod qatorlari o'raladi. PDF sahifalari ko'z bilan ko'rilmadi (bu kompyuterda PDF ko'rsatuvchi vosita yo'q) |
| Avto namoyish | 🖐 sukut bo'yicha o'chiq; tugma bilan boshlanadi (≈110 px/s, 2× da ≈210 px/s); g'ildirak, klaviatura, kod belgilash va tab yashirilishi to'xtatadi; oddiy rejimda tugma o'chiq |
| `prefers-reduced-motion` | ✅ headless Chrome `--force-prefers-reduced-motion`: animatsiya sinfi yo'q, "Animatsiya: o'chirilgan", avto namoyish o'chiq |
| Qo'llanma mobil ko'rinishi | 🖐 375 px: sahna markazda, to'rt obyekt ham ko'rinadi, gorizontal aylantirish yo'q, asboblar bir qatorda |
| Bir manba — ikki ko'rinish | ✅ test: `info.html` va admin yordam asosiy qismi bayt-ma-bayt bir xil; `--check` push va CI'da |
| StrictMode | ✅ `Set-StrictMode -Version 3.0` barcha skriptlarda; lint; skript testlari shu rejimda |

## D. Skriptlar (StrictMode 3.0 ostida qayta)
| Tekshiruv | Natija |
|---|---|
| tayyorla: paket rejimi, bo'sh joy+Unicode papka, kompilyatorsiz | ✅ |
| tayyorla: qayta ishga tushirish mavjud konfiguratsiyani buzmaydi | ✅ |
| start: yetishmagan fayl -> avtomatik tayyorlash -> ishga tushdi | ✅ |
| start: birinchi ishga tushirishda setup kodi konsolda | ✅ |
| start: setup kodi logga yozilmagan | ✅ |
| start: ikkinchi bosishda takroriy jarayon yaratilmaydi | ✅ |
| start: parallel ishga tushirishda bittasi kutadi/rad etadi | ✅ |
| start: band port aniq tashxis, begona jarayon to'xtatilmaydi (kod 2) | ✅ |
| start: tayyorlash xatosida bitta urinish, cheksiz sikl yo'q | ✅ |
| pull: lokal o'zgarish bor -> to'xtaydi, o'zgarish saqlanadi (stash yo'q) | ✅ |
| push: sir topildi -> to'xtadi, qiymat chiqmadi, commit yo'q | ✅ |
| push: o'zgarish commit+push, SHA mos, baza/runtime yuborilmadi | ✅ |
| push: remote oldinda -> force'siz to'xtaydi, lokal commitlar saqlanadi | ✅ |
| pull: tarixlar ajralgan -> reset/force yo'q, aniq xabar | ✅ |
| push: remote'ga ulanib bo'lmasa lokal commit saqlanadi va aytiladi | ✅ |
| pull: toza papkada fast-forward, olingan commit ko'rsatiladi | ✅ |
| pull (yangi kompyuter): band papka ustidan yozilmaydi | ✅ |
| pull (yangi kompyuter): clone + DronStreamTayyorla (Go/Node/MediaMTX .tools ga, build) | ✅ |
| yangi clone'da sir/baza yo'q (runtime faqat shablondan) | ✅ |
| tayyorla -Offline: mavjud lokal vositalar bilan ishlaydi, qayta yuklamaydi | ✅ |
| tayyorla -Offline, vositalar yo'q: tushunarli xabar (kod 6) | ✅ |

Jami: 21/21. Shu jumladan bo'sh joy va Unicode belgili papka, band port, bitta urinish (cheksiz sikl yo'q), `-Offline` rejimi, toza papkaga clone va vositalarni checksum bilan yuklash. "Internet yo'q" holati haqiqiy uzilish emas, `-Offline` rejimi bilan taqlid qilingan.

## E. Yuklama (v1.2 kodida, lokal)
4 stream × 5 tomoshabin (20 ta), 65.8 s, to'liq integratsiya yurishi ichida: 20/20 to'xtamadi; MediaMTX bitta yadroning 55 %, backend 7 %; RAM 135 / 91 MB; chiqish 29.5 Mbit/s. Shu paytda kompyuterda boshqa testlar ham ishlab turgan (toza clone yig'ish), shuning uchun protsessor raqamlari v1.1 dagidan (38 % / 5.5 %) yuqori; ular taxminiy.

## F. v1.2 da sinalmagan ⛔
1. **Haqiqiy Dell PowerEdge R570** — har qanday OS bilan. Serverga kirish yo'q edi.
2. **Windows Server 2022/2025** va **Ubuntu Server 26.04 LTS**. (Sinalgan: Windows 11; Ubuntu 24.04 — faqat CI virtual mashinasi.)
3. `dist` dagi aynan 1.2.0 Linux arxivi (cross-compile) Linux'da ishga tushirilmagan; CI shu manbadan Linux'da yig'ilganini sinagan.
4. Tashqi internetdan kirish, NAT/CGNAT, router yo'naltirishi, haqiqiy tarmoqda TURN.
5. Haqiqiy DJI pulti; RTMPS va pultning sertifikat tekshiruvi.
6. Server qayta yuklangandan keyin avtomatik ishga tushish (faqat `enabled` holati va qulaganda qayta ishga tushish tekshirilgan).
7. ufw va Windows Firewall qoidalarini amalda qo'llash (buyruqlar hujjatlarga mos, bajarilmagan).
8. Haqiqiy telefon/planshetda yangi interfeys. Foydalanuvchining Pixel 6 Pro (Android 17, Chrome 156) sinovi **1.1.0** da o'tkazilgan; 1.2.0 tuzatishlari faqat brauzer panelidagi 375 px emulyatsiyada ko'rilgan.
9. Clipboard orqali muvaffaqiyatli nusxalash; PDF sahifalarining ko'rinishi; Firefox va Safari.
10. Foydalanuvchining ishlab turgan serveri (`runtime\`) 1.2.0 ga o'tkazilmagan — u hali 1.1.0 jarayonida.
