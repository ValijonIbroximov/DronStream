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

CI yurishlari tarixi halol ko'rinishda: #1–#5 yiqilgan (workflow va sinov skriptlarini sozlash; #5 da yuqoridagi "setup kodi jurnalda" nuqsoni topilgan). **#6 — uchala ish ham o'tdi** (bu jadvaldagi natijalar). #7 da Linux ishi yana to'liq o'tdi (unit 7, integratsiya 4/4, paket 45/45), lekin Windows ishi yiqildi: sinov skripti multipart maydonlarini tasodifiy tartibda yuborgan (PowerShell hashtable), server esa `kind` maydoni fayldan oldin kelishini talab qiladi — shu sababli u #6 da o'tib, #7 da yiqilgan. Bu sinov skriptining xatosi; tartib qat'iy qilib tuzatildi. Keyingi yurishlar holati GitHub'dagi Actions sahifasida ko'rinadi; ushbu hujjat yozilganda Windows → Linux ko'chirishning tasdiqlangan yurishi — #6.

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

---

# v1.3.0 — sinov relizi (2026-11-14)

> **Bu sinov relizi, "to'liq maxfiy production tizim" emas.** Quyidagi uch masala bu relizda hal qilinmagan va hech bir test ularni yopmaydi:
> 1. server videoni ochiq ko'radi (TLS/DTLS serverda tugaydi);
> 2. haqiqiy pultda RTMPS va sertifikat tekshiruvi tasdiqlanmagan — haqiqiy DJI ingest'i sinalmagan;
> 3. pultdan tomoshabingacha shifrlash (E2EE) mahsulotda yo'q.
>
> TOTP, administrator tasdig'i va CI muvaffaqiyati kirish nazoratiga tegishli; ular yuqoridagi uch masalani hal qilmaydi.

## Commitlar

| Nima | Commit |
|---|---|
| **Paketlar yig'ilgan manba commit** (`BUILD_INFO.txt` ichida) | `cdf1441e11a31338e19ebb04a50f43c933cd5275` |
| To'liq integratsiya to'plami bitta yurishda o'tkazilgan commit | `4c92930cdd7614f109d384176a0de8282cd6a5ca` |
| Shu ikki commit orasidagi farq | faqat `tests/package-secure-check.ps1` (yangi sinov skripti) va `build.ps1` (manifest sanasi, Git Bash'ni topish). Backend, frontend, qo'llanma va paket tarkibiga kiradigan boshqa fayllar bir xil |
| Brauzer sinovlari o'tkazilgan kod | `183d648` ga aylangan ishchi daraxt (sinov paytida topilgan nuqsonlar tuzatilib, shu commitga kirgan) |
| Bu hisobot | alohida, keyingi commitda (manba commit emas) |
| `tests/package-secure-check.ps1` ning yakuniy varianti | shu hisobot commitida: paket yig'ilgandan keyin skriptning o'zidagi ikki xato tuzatildi (PowerShell 5.1 xato javobini o'qish; uzun xato satrining bo'linishi). Mahsulot kodi o'zgarmagan |

Paket ichidagi `docs/TEST_REPORT.md` — manba commit holatidagi nusxa: unda shu v1.3 bo'limi **yo'q** (paket sinovlari paket yig'ilgandan keyin o'tkaziladi). To'liq hisobot — repozitoriydagi shu fayl.

## Muhit

- **Lokal**: bitta ishlab chiquvchi kompyuteri, Windows 11 Pro, 16 mantiqiy yadro, Intel Iris Xe (integratsiyalashgan GPU), Go 1.27.4, Node 22.7, PowerShell 5.1. Hamma narsa loopback'da, alohida vaqtinchalik papka, baza va portlarda. Foydalanuvchining 8443 dagi serveri, bazasi va sozlamasiga tegilmagan (sinovlar boshlanganda u portda hech narsa tinglamayotgan edi).
- **CI**: GitHub Actions — Ubuntu 24.04.5 LTS (x86_64, systemd) va Windows (windows-latest) virtual mashinalari. Bu haqiqiy Linux runtime, lekin haqiqiy R570 ham, Ubuntu 26.04 ham emas.
- **Brauzer (qo'lda)**: ilova ichidagi Chromium 156 asosidagi brauzer; Vite proxy orqali lokal sinov serveriga; har bir "tomoshabin" alohida cookie omborida (`*.localhost` nomlari).
- **Brauzer (headless)**: Google Chrome 157, DevTools protokoli orqali; sahifa `file://` dan, DNS butunlay o'chirilgan.

Belgilar: ✅ avtomatik test o'tdi · 🖐 qo'lda (brauzerda) tekshirildi · ⛔ sinalmagan.

## A. Avtomatik testlar (lokal, Windows 11)

| To'plam | Commit | Natija |
|---|---|---|
| Go unit: backup, core, logx, mediafiles, mtx, secure, web | `4c92930` | ✅ 7 paket |
| Integratsiya, **bitta yurishda**, kompyuter bo'sh holatda (432,8 s): `TestAcceptance` (226 s), `TestLinksAndMedia`, `TestLoad`, `TestMigrationFromV1` (haqiqiy 1.0.0 bazasi), `TestMigrationFromV2` (haqiqiy 1.1.0 bazasi), `TestPlayerSlots`, `TestTURNRelay` | `4c92930` | ✅ 7/7 |
| `tests\ps-lint.ps1` — 24 skript (StrictMode 3.0, ASCII, PS 5.1 sintaksisi) | `cdf1441` | ✅ 0 xato, 0 ogohlantirish |
| `node guide/build.mjs --check` | `cdf1441` | ✅ |
| Paket yig'ish ichidagi `go test ./internal/...`, `tsc`, `vite build` | `cdf1441` | ✅ |

**Yiqilgan yurish haqida (yashirilmagan).** Shu kuni avvalroq, `2b23bbd` ustidagi ishchi daraxtda to'liq to'plam 6/7 bilan tugadi: `TestLoad` "5 viewers stalled" bilan yiqildi. O'sha paytda shu kompyuterda headless Chrome dasturiy (SwiftShader) render bilan qo'llanma screenshotlarini olayotgan edi va barcha yadrolarni band qilgan. `TestLoad` yolg'iz qayta ishga tushirilganda o'tdi (116 s), keyin esa `4c92930` da butun to'plam bitta yurishda, boshqa og'ir jarayonsiz 7/7 o'tdi. Assertion o'zgartirilmagan. Xulosa: bu test bitta kompyuterda manba, server va 20 tomoshabin birga ishlaganda protsessor yetishmasligiga sezgir; bu haqiqiy server sig'imi o'lchovi emas.

Bu relizda qo'shilgan yoki o'zgargan testlar: `TestSecureModeRefusesPlainRTMPOnAnyNetwork`, `TestSecurityStatusIsHonestAboutIngestAndE2EE`, `TestApprovalOfSessionCountedBeforeUpgrade`, mehmon kodi (`core_test.go`, `TestAcceptance: guest_wrong_code_refused`), kodlar admin API'da yo'qligi, `TestMigrationFromV2` (bir martalik havola, ikki marta sanalmaslik).

## B. CI (GitHub Actions)

| Commit | Yurish | Natija |
|---|---|---|
| `2b23bbd` | [43499375348](https://github.com/ValijonIbroximov/DronStream/actions/runs/43499375348) | ✅ Linux paket sinovi **64/64** (secure rejim, haqiqiy TOTP, `:1935` / `10.8.0.1` / `192.168.1.10` / `localhost` bilan ishga tushmasligi, `127.0.0.1` bilan faqat loopback'da tinglashi, tinglovchi soketlar inventarizatsiyasi); unit 7 paket; integratsiya 4 test; Windows backup → Linux restore **12/12**; pcap: 46 048 WebRTC UDP paketida ochiq H.264 belgisi 0, oddiy RTMP'da pult kaliti ochiq o'qildi |
| `4c92930` | [43505602434](https://github.com/ValijonIbroximov/DronStream/actions/runs/43505602434) | bekor qilingan (keyingi push yangi yurishni boshlagani uchun to'xtatilgan) — natija yo'q |
| `cdf1441` (paketlar manbasi) | [43507219574](https://github.com/ValijonIbroximov/DronStream/actions/runs/43507219574) | ✅ Linux paket sinovi **64/64**; unit 7 paket; integratsiya 4 test; Windows backup → Linux restore **12/12**; pcap: 46 446 WebRTC UDP paketida ochiq H.264 belgisi 0, oddiy RTMP'da pult kaliti ochiq o'qildi |

CI Linux paketini **o'zi manbadan Linux'da yig'ib** sinaydi; `dist` dagi cross-compile qilingan aynan shu Linux arxivi Linux'da ishga tushirilmagan (F bo'lim).

## C. Paketlar va paketning o'zidagi sinovlar

| Fayl | SHA-256 |
|---|---|
| `dist/DronStream-1.3.0-win64.zip` (38 421 690 bayt) | `d061221f1c4898c48764681f57b2df0f61d780b609faf9cb327d5e0b5f57e7ab` |
| `dist/DronStream-1.3.0-linux-amd64.tar.gz` (38 015 200 bayt) | `1057c24f07b66d250cf95a892ecda9c89cfee5d1f918c8616c2b01dfddae583f` |

Har birining yonida `.sha256` fayli, ichida `SHA256SUMS.txt` (har bir fayl uchun) va `BUILD_INFO.txt` (manba commit, daraxt toza, reliz turi: sinov relizi, E2EE yo'q, DJI ingest tasdiqlanmagan). Oldingi 1.0.0–1.2.0 paketlariga tegilmagan. `dist/` Git'ga yuborilmaydi.

| Sinov (Windows paketi, toza vaqtinchalik papka, sinov portlari) | Natija |
|---|---|
| `tests\package-secure-check.ps1` — tarkib: barcha fayllar `SHA256SUMS.txt` ga mos; `BUILD_INFO` dagi commit kutilgan; `info.html` shu versiya, ichida three.js, tashqi resurs yo'q; xavfsizlik hujjatlari bor; sozlama namunasi secure, RTMP va RTMPS o'chiq; baza, backup, log, kalit, credential, media, PoC fayli **yo'q** | ✅ 8/8 |
| shu skript — paketdagi sukut sozlama bilan (faqat portlar almashtirilgan): ishga tushadi; birinchi administrator TOTP yoqishi shart; TOTP'siz admin API yopiq; TOTP yoqiladi, 10 tiklash kodi; parolning o'zi rad; parol + TOTP bilan kirish; holat paneli: rejim/RTMP/havola/MFA "tekshirilgan", server videoni ko'rishi va E2EE "mavjud emas", 4 xulosa bor | ✅ 9/9 |
| shu skript — paketdagi binary `rtmp_listen` = `:1935`, `192.168.1.10:1935`, `10.8.0.1:1935`, `localhost:1935` bilan **ishga tushmaydi** va sababini yozadi; `127.0.0.1:27935` bilan ishga tushadi va faqat 127.0.0.1 da tinglaydi; to'xtatilgach jarayon qolmaydi | ✅ 7/7 |
| `tests\install-roundtrip.ps1` — toza papkaga o'rnatish, start/status/stop, ishlab turganda shifrlangan backup, noto'g'ri parol rad, toza ildizga restore, STANDBY, kalit qayta bog'lanishi, faollashtirish | ✅ 19/19 |
| `tests\update-rollback.ps1` — 1.2.0 → 1.3.0 (sxema v2 → v3, yangilashdan oldingi backup) → rollback 1.2.0, ma'lumot joyida | ✅ 10/10 |
| `tests\scripts-test.ps1` — BAT/PS1 skriptlari, bo'sh joyli papka, band port, parallel start, push/pull himoyalari, toza clone + tayyorlash, `-Offline` | ✅ 21/21 |
| Ikkala paketdagi binary ichida yangi frontend va qo'llanma (yangi interfeys satrlari bo'yicha qidiruv); `dronstream.exe version` = 1.3.0 | ✅ |
| Linux arxivi: tarkib, Unix huquqlari (755/644), `SHA256SUMS.txt` 29/29, taqiqlangan fayl yo'q, sozlama namunasi secure | ✅ (faqat tarkib; runtime — B bo'lim) |

`install-roundtrip` va `update-rollback` ataylab `standard` (laboratoriya) rejimida ishlaydi, chunki ular admin API'ni TOTP'siz chaqiradi; secure rejim alohida — yuqoridagi `package-secure-check` va CI'da.

## D. Brauzerda qo'lda o'tkazilgan xavfsizlik sinovlari 🖐 (2026-11-14, 00:27–00:48)

Hammasi kutilgandek ishladi; yo'lda topilgan nuqsonlar E bo'limda.

| Sinov | Natija |
|---|---|
| Migratsiya: chiqarilgan 1.2.0 binary'da havola ochilgan (video ko'ringan) → shu papkada yangi versiya → o'sha brauzer "tasdiq kutilmoqda" + kod, kutubxona bo'sh | 🖐 |
| Havola kutish sahifasi va tekshirish kodi; noto'g'ri kod → "Tekshirish kodi mos emas", tomoshabin kutishda qoladi | 🖐 |
| To'g'ri kod → tomoshabin sahifasi **o'zi** tomoshaga o'tdi, video 640×360 | 🖐 |
| Havola nusxasi ikkinchi cookie omborida: yangi so'rov, boshqa kod, kutubxona bo'sh, chipta 403; birinchi sessiya kodi ikkinchisiga yaramadi | 🖐 |
| Rad etish → sahifa "So'rovingiz rad etildi" (qayta yuklamasdan) | 🖐 |
| Mehmon: kutish sahifasida kod; admin kartasida kod **ko'rinmaydi**; noto'g'ri kod rad; to'g'ri kod bilan sahifa o'zi ochildi | 🖐 |
| Muddat: 200 soniyalik havola tasdiqlangan → muddat tugagach sessiya yo'q, kutubxona 401; havola "muddati tugadi" | 🖐 |
| Revoke: havola bekor qilindi → video to'xtadi, sessiya yopildi (aniq kechikish brauzerda o'lchanmagan; integratsiya testida o'lchangan) | 🖐 |
| Chiqish → 401, "orqaga" tugmasi tiklamaydi. Bloklash → "Hisobingiz administrator tomonidan bloklandi", qayta kirish 403 | 🖐 |
| Qayta tasdiqlash: 10 daqiqadan keyin muhim amalda oyna; noto'g'ri parol rad; to'g'ri parol bilan amal davom etdi | 🖐 |
| Secure rejimga o'tkazilganda ochiq admin sahifasi o'zi TOTP yoqish ekraniga o'tdi; QR, kalit, 10 tiklash kodi | 🖐 |
| Parol → ikkinchi bosqich so'raladi; kod bilan kirildi; **shu kod ikkinchi marta rad etildi**; tiklash kodi bir marta ishladi, ikkinchi marta rad | 🖐 |
| Laboratoriya rejimi ogohlantirishi (standard) va holat panelining 4 xulosasi (secure) | 🖐 |

Cheklovlar: bitta kompyuter, bitta brauzer dvigateli; haqiqiy telefon yoki boshqa jismoniy brauzer emas; brauzerning o'z `confirm`/`prompt` oynalari ichki brauzerda avtomatik yopilgani uchun ular skript bilan javoblantirilgan.

## E. Topilgan va tuzatilgan nuqsonlar

1. Migratsiya qilingan havola sessiyasi tasdiqlanganda foydalanish ikkinchi marta sanalardi; bir martalik havolaning o'z sessiyasi "limit tugagan" deb rad etilardi.
2. Havolalar sahifasi va ulashish oynasida eski siyosat matni ("kim olsa, o'sha foydalana oladi") qolgan edi.
3. "Faol sessiyalar" kutayotgan va rad etilgan sessiyalarni ham sanardi.
4. Server boshqa rejimda qayta ishga tushganda ochiq admin sahifasi eski rejimni ko'rsatardi.
5. Tekshirish kodlari admin API orqali o'qilishi mumkin edi (endi yuborilmaydi); mehmon kodi admin kartasida ko'rsatilardi.
6. Qo'llanma: telefon asboblar qatori o'ngda kesilgan; namuna kod satrga bo'lingan; panel ichidagi uzun bosqichda davomi borligi bilinmagan; legend model ustiga tushgan; chop etishda och rangli matn; havola sahnasi eski tartibni ("ikkala ekranda bir xil kod") tasvirlagan.
7. `build.ps1`: qo'llanma `npm ci` dan oldin yig'ilardi; Git Bash'dan ishga tushirilganda Linux bosqichi bash'ni topolmasdi; manifest sanasi alohida qatorga tushardi.
8. Qo'llanma tekshiruv skripti qat'iy kutish vaqtiga tayangan (sekin renderda yolg'on xato) — endi sahna tinchiguncha kutadi.

## F. 3D qo'llanma (`info.html`, 807 KB)

| Tekshiruv | Natija |
|---|---|
| `guide/tools/preview.mjs --checks` — 18 tekshiruv: 3D yoqiladi; bo'sh turganda kadr chizilmaydi; **oldinga-orqaga aylantirilganda holat aynan tiklanadi**; mundarijadan bo'limga sakrash va "Batafsil"; qidiruv; avto namoyish va uning g'ildirak/nusxalash/ochishda to'xtashi; **clipboard ishlamaganda kod belgilanib, qo'lda nusxalash xabari**; oddiy rejim va qaytish; `prefers-reduced-motion`; chop etish (PDF 54 bet); `pagehide` | ✅ 18/18 |
| `--nowebgl` — WebGL o'chirilganda avtomatik oddiy (2D) qo'llanma | ✅ |
| Offline / `file://`: DNS o'chirilgan holda `file:` dan boshqa so'rov | ✅ 0 ta |
| 30 ta screenshot (`docs/guide-preview/`: 21 desktop 1440×900, 9 mobil 390×844) — **barchasi ko'zdan kechirildi**; topilgan kamchiliklar (E-6) tuzatilib qayta olindi | 🖐 |
| Ekran yozuvi: `docs/guide-preview/guide-scroll-demo.mp4` (1280×720, 45 s, H.264, 4,5 MB) — skriptli aylantirish kadrlari DevTools orqali olinib ffmpeg bilan yig'ilgan; real vaqt yozuvi emas, harakat tezligi unumdorlik ko'rsatkichi emas | ✅ |
| E2EE faqat "Reja — amalga oshirilmagan" sifatida (punktir chiziq, alohida tugma); joriy pult → server yo'lida "himoyalangan" tunnel tasviri yo'q | 🖐 |

**Kadr vaqti** (20 soniyalik skriptli aylantirish, `--perf-only`):

| Sharoit | Render | rAF oralig'i: mediana / p95 / max | Sahna chizish (CPU): mediana / p95 |
|---|---|---|---|
| Desktop 1440×900, sifat "high" | Intel Iris Xe (D3D11), headless Chrome 157 | 16,7 / 16,8 / 283 ms | 2,3 / 3,9 ms |
| Desktop 1440×900, sifat "light" | xuddi shu | 16,7 / 16,8 / 267 ms | 1,8 / 3,2 ms |
| Mobil o'lcham 390×844 (yengil profil) | xuddi shu | 16,7 / 16,8 / 50 ms | 1,5 / 2,9 ms |
| Desktop "high", **GPU'siz** (SwiftShader dasturiy render) | CPU | 267 / 450 / 467 ms | 3,1 / 7,6 ms |
| Mobil o'lcham, GPU'siz | CPU | 33 / 67 / 350 ms | 2,5 / 4,6 ms |

Cheklovlar: o'lchov bitta noutbukda; DPR 1; ekran yangilanishi 60 Hz bilan cheklangan (16,7 ms — shu chegara); "max" — birinchi kadrdagi shader kompilyatsiyasi. **Mobil qator — desktop GPU'da telefon o'lchamini emulyatsiya qilish, haqiqiy telefon emas.** GPU'siz kompyuterda 3D sekin (≈4 kadr/s); buning uchun "Oddiy rejim" va WebGL'siz avtomatik 2D bor. Boshqa qurilma uchun kadr tezligi va'da qilinmaydi.

## G. Yuklama (`TestLoad`, `4c92930`, to'liq yurish ichida)

4 stream × 5 tomoshabin (20 ta), 66,0 s, hammasi bitta kompyuterda loopback orqali: 20/20 to'xtamadi; MediaMTX bitta yadroning 36 %, backend 4 %; RAM 135 / 92 MB; kirish 5,9 Mbit/s, chiqish 29,6 Mbit/s. Manbalar (ffmpeg) va tomoshabinlar ham shu kompyuterda — bu haqiqiy tarmoq yoki server sig'imi o'lchovi emas (A bo'limdagi yiqilgan yurishga qarang).

## H. v1.3.0 da sinalmagan ⛔

1. **Haqiqiy DJI pulti**: RTMP ham, RTMPS ham, sertifikat tekshiruvi ham (tartib: `DJI_SETUP_UZ.md` 5-bo'lim). Secure rejimda pultni ulashning tasdiqlangan yo'li yo'q.
2. **Tunnel + serverdagi gateway** sxemasi (hujjatdagi namuna buyruqlar bajarilmagan).
3. **Haqiqiy Dell PowerEdge R570**, Windows Server, Ubuntu 26.04; server qayta yuklanishi.
4. `dist` dagi aynan shu Linux arxivi Linux'da ishga tushirilmagan (CI o'zi yig'ganini sinaydi).
5. Tashqi internet, NAT/CGNAT, haqiqiy tarmoqda TURN; faol MITM sinovi; serverda chiquvchi ulanishlar inventarizatsiyasi.
6. Haqiqiy telefon/planshet (interfeys ham, qo'llanma ham); Firefox va Safari; qo'llanmaning haqiqiy telefondagi kadr vaqti.
7. Clipboard orqali **muvaffaqiyatli** nusxalash (headless'da faqat zaxira yo'li tekshirilgan).
8. Passkey va qurilma kalitiga bog'lash — amalga oshirilmagan.
9. E2EE — mahsulotda yo'q; alohida tajriba `experiment/e2ee-poc` branch'ida, u bu paketga kirmaydi.
10. **Mustaqil xavfsizlik auditi.** Kod va testlarni AI yozgan; testlarning o'tishi audit emas.
