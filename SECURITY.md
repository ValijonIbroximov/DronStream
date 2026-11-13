# DronStream xavfsizlik modeli

## 1. Ishonch chegarasi
- **Server ishonchli.** Video serverda shifrsiz ko'rinishda qayta ishlanadi (MediaMTX qabul qiladi va WebRTC orqali qayta uzatadi). Bu **end-to-end shifrlash emas**: server egasi yoki server kompyuterini egallagan odam videoni ko'ra oladi.
- **Server kompyuterining lokal administratorlari ishonchli.** Ular bazani, master kalitni (DPAPI LocalMachine) va MediaMTX Control API ni (127.0.0.1, autentifikatsiyasiz) boshqara oladi. Server kompyuterida boshqa foydalanuvchilarga ish bermang.
- Brauzer, pult, tarmoq — ishonchsiz.

## 2. Ikki transport yo'li
| Yo'l | Himoya | Izoh |
|---|---|---|
| A. Pult → server | RTMPS (TLS) yoki RTMP + VPN | RTMP ni ochiq internetga chiqarmang. `rtmp_listen` ni VPN IP ga bog'lang / firewall bilan cheklang. Pult URL ida faqat VPN ichki IP — VPN uzilsa trafik internetga chiqmaydi. RTMPS da sertifikat tekshiruvini real pultda sinang (DJI_SETUP_UZ.md, 7-sinov). |
| B. Server → brauzer | HTTPS (TLS 1.2+) interfeys va signalling; media WebRTC DTLS-SRTP | MediaMTX WebRTC HTTP signalling faqat 127.0.0.1 da; brauzer unga backend HTTPS proxy orqali boradi. |

Yangi kodek yoki shifrlash protokoli yaratilmagan: TLS (Go stdlib), DTLS-SRTP (MediaMTX/brauzer), Argon2id va AES-256-GCM (Go x/crypto, stdlib).

## 3. Ruxsat modeli
- Rollar: `admin`, `user`, `guest`. Standart: **ruxsat yo'q**. Admin hamma streamni ko'radi.
- Ruxsat = (user|guest) × stream, ixtiyoriy tugash vaqti. Bekor qilish yozuv sifatida saqlanadi (`revoked_at`), audit bilan.
- Har bir avtorizatsiya qarori serverda **bitta funksiya** (`authorizeView`) bilan bazadagi joriy holatdan olinadi: chipta berishda, MediaMTX hook'ida va har 1 s lik reconciler'da.
- Tasdiqlanmagan mehmonga: video, thumbnail (umuman yo'q), stream URL, stream ro'yxati, ichki yo'l nomlari **berilmaydi**. `/api/streams` faqat ruxsat etilganlarni qaytaradi.

## 4. Media sessiyalari
1. Brauzer `POST /api/watch/{id}/ticket` — server ruxsatni tekshiradi, **bir martalik** chipta (256 bit, 30 s, bazada SHA-256 hash) beradi: web-sessiya + stream + nonce ga bog'langan.
2. Brauzer `POST /api/whep/{id}` (cookie + CSRF + `Bearer chipta`) — backend chipta shu sessiyaga va streamga tegishliligini tekshiradi, so'ng loopback MediaMTX ga `?ds=<nonce>` bilan proxy qiladi. Brauzer ichki yo'l nomini bilmaydi.
3. MediaMTX `authMethod: http` hook'i — backend **BEGIN IMMEDIATE** tranzaksiyada: chiptani iste'mol qiladi (takror ishlatish rad), nonce va yo'lni tekshiradi, ruxsatni qayta tekshiradi, limitlarni tekshiradi va media sessiyani MediaMTX sessiya ID si bilan yozadi. Hook javobida `expireAt` = min(ijara, ruxsat tugashi, sessiya tugashi).
4. **Bog'lash**: hook'dagi `id` = MediaMTX WebRTC sessiya ID (v1.21.3 da tajribada tasdiqlangan). Uzish shu ID bo'yicha — bir IP dagi turli foydalanuvchilar aralashmaydi.
5. **Uzish**: ruxsat o'zgarishi bazaga commit qilinadi → darhol reconcile → `POST /v3/webrtc/sessions/kick/{id}`. Zaxira: har 1 s reconciler barcha MediaMTX o'quvchilarini bazaga solishtiradi; noma'lum (5 s dan eski) yoki ruxsatsiz sessiyalarni uzadi.
6. **Poyga**: SQLite yozuvlari ketma-ket. Hook revoke'dan oldin commit bo'lsa — revoke sessiyani ko'radi va uzadi; keyin bo'lsa — hook ruxsatni ko'rmaydi va rad etadi. 25 ta real WebRTC poyga sinovi + 40 ta unit poyga sinovi: sizish 0.
7. Token muddati tugashi ochiq WebRTC ni yopmaydi deb faraz qilingan: shuning uchun server (`expireAt` + reconciler + kick) o'zi yopadi.
8. Parallel ulanishlar: subyekt bo'yicha `max_media_sessions_per_subject` (default 12), har tab+stream uchun ≤2 (uzilishsiz yangilash uchun).
9. Brauzer allaqachon olgan kadrlarni qaytarib olib bo'lmaydi; ekran yozib olishni hech narsa to'xtata olmaydi. Watermark (ism + vaqt) faqat manbani aniqlashga yordam beradi.

### O'lchangan uzish vaqtlari (TEST_REPORT.md)
Maqsad ≤ 3 s. Revoke, blok, favqulodda, mehmonni yakunlash: oxirgi paket API javobidan oldin yoki ~0–5 ms ichida (lokal tarmoq). Muddat tugashi: tugash vaqtiga nisbatan ~±20 ms.

## 5. Nosozlikda xatti-harakat (fail-closed) — haqiqiy kafolatlar
| Holat | Mexanizm | Kafolat / cheklov |
|---|---|---|
| Backend jarayoni qulab tushdi | MediaMTX Windows **Job Object (KILL_ON_JOB_CLOSE)** da: OS uni ham o'ldiradi | O'lchangan: video darhol to'xtadi, MediaMTX qolmadi. Pultlar ham uziladi. Service qayta ishga tushiradi |
| Baza ishlamaydi (qulf, disk) | Watchdog (1 s, 1 s busy-timeout): 3 marta ketma-ket xato → barcha o'quvchilar kick, chipta/hook rad | O'lchangan: ~3.7 s ichida uzildi. Qayta tiklangach avtomatik ishlaydi |
| Backend tirik, lekin qotib qolgan | MediaMTX o'zi `expireAt` (ijara, default 120 s) da sessiyani yopadi; yangi ulanish uchun hook javob bermaydi → rad | Eng yomon holatda ochiq video ≤ `lease_seconds` davom etishi mumkin. Kamaytirish uchun lease ni qisqartiring (min 15 s; tez-tez qayta ulanish narxi) |
| MediaMTX qulab tushdi | Backend uni qayta ishga tushiradi; barcha sessiyalar uzilgan bo'ladi | Yangi ulanishlar yana hook orqali |
| Yangi ulanish, hook ishlamaydi | MediaMTX auth xatosi → rad | — |

## 6. Sirt (attack surface)
- Tashqariga ochiq: HTTPS (8443), WebRTC ICE UDP (8189) [+TCP], RTMP (VPN), ixtiyoriy RTMPS, ixtiyoriy TURN.
- Faqat 127.0.0.1: MediaMTX Control API (9997), WebRTC signalling (8889), ichki hook/boshqaruv (9180; hook URL da tasodifiy sir, boshqaruvda `data\runtime\ctl.token`). Konfiguratsiya validatsiyasi loopback bo'lmagan qiymatni rad etadi.
- MediaMTX da o'chirilgan: HLS, RTSP, SRT, MoQ, playback, metrics, pprof, recording. Yo'l konfiguratsiyasi faqat `live/<slug>[/<kalit>]`. `overridePublisher: false`. O'quvchi faqat `webrtc` protokoli orqali chipta bilan; RTMP read, HLS va boshqalar hook'da rad. Integratsiya testida RTMP pull va HLS/RTSP/SRT portlari yopiqligi tekshirilgan.
- Publish kaliti: stream bo'yicha, 32 belgi (~187 bit), bazada SHA-256 (tekshirish) + AES-GCM (adminga qayta ko'rsatish; master kalit DPAPI). Kalit hech qachon o'qish huquqi bermaydi. Noto'g'ri kalit / boshqa yo'l / noto'g'ri protokol rad etiladi va auditga (rate-limited) yoziladi. Demo manbalar faqat loopback WebRTC dan publish qila oladi.
- TURN (ichki): faqat shu serverning o'z IP lariga relay qiladi (ochiq relay emas), HMAC asosidagi 10 daqiqalik hisob. STUN/TURN default o'chiq; tashqi xizmat yashirincha ishlatilmaydi.

## 7. Veb xavfsizligi
- Parollar: Argon2id (m=64 MiB, t=3, p=2, 16 bayt tuz). Mavjud bo'lmagan login uchun ham vaqt tenglashtiriladi. 5 xato → 5 daqiqa qulf.
- Sessiya cookie: `__Host-ds`, `Secure; HttpOnly; SameSite=Strict; Path=/`, 256 bit, bazada hash. Mutlaq muddat 24 soat, harakatsizlik 8 soat. Login/guest'da eski sessiya bekor qilinadi (fixation yo'q).
- CSRF: har sessiyaga token (`X-CSRF-Token`) + maxsus sarlavha `X-DS-Request: 1` + `Origin` tekshiruvi + SameSite=Strict.
- Rate limit: login 10/daq/IP, mehmon so'rovi ~3 ta / 10 daq / IP, setup, chipta. Kutilayotgan mehmonlar soni chegaralangan.
- XSS: React avtomatik escaping, `dangerouslySetInnerHTML` yo'q; serverda boshqaruv/bidi belgilari tozalanadi; CSP `script-src 'self'; object-src 'none'; frame-ancestors 'none'`. Sinov: `<script>`, `<img onerror>` mehmon matnida bajarilmadi (brauzerda tekshirildi).
- Sarlavhalar: HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy, COOP/CORP, API uchun `Cache-Control: no-store`.
- Barcha API larda server tomon avtorizatsiya (`authed`/`admin` middleware); frontend yashirish xavfsizlik vositasi sifatida ishlatilmaydi.
- Loglar: sirli atribut nomlari (`key`, `token`, `pass`, `secret`, `ticket`, `cookie`) va matndagi `key=…`, `Bearer …`, hook URL siri, path-rejim kalitlari niqoblanadi; MediaMTX chiqishi ham niqoblovchi orqali yoziladi.
- Frontend build va Git'da sir yo'q (`.gitignore`: secrets, *.key, *.db, *.dsbak, runtime). Konfiguratsiya namunasida sir yo'q.
- Video yozib olish o'chiq (`record: false`, playback server o'chiq). Tashqi analytics/telemetry yo'q (Go `GOTELEMETRY=off` build, frontendda tashqi so'rov yo'q).

## 8. Audit
Hodisalar: kirish/chiqish/xato kirish, setup, mehmon so'rovi/tasdiq/rad/yakun, ruxsat berish/olish, ko'rishga ulanish/uzilish/rad, pult ulanishi/rad/band/uzilishi, kalit ko'rish/almashtirish/bekor qilish, blok, parol tiklash, favqulodda to'xtatish, holat o'zgarishi, backup yaratish/yuklab olish, restore. Saqlash: `audit_retention_days` (180), har soat tozalash; tugagan media sessiyalar 30 kun, chiptalar 1 kun.

## 9. Zaxira va ko'chirish
Backup: SQLite `VACUUM INTO` (izchil) + config + master kalit + TLS/TURN sirlari → ZIP → Argon2id(parol) + AES-256-GCM (sarlavha AAD sifatida). Restore yangi kompyuterda master kalitni DPAPI bilan qayta bog'laydi, barcha sessiyalarni bekor qiladi va **standby** rejimida ishga tushadi. `backup --migrate-out` eski serverni "migrated" holatiga o'tkazadi.

## 10. Ma'lum cheklovlar
- Real DJI, tashqi internet, NAT/CGNAT, TURN, RTMPS sertifikat tekshiruvi, Windows service va toza yangi kompyuter **sinalmagan** (TEST_REPORT.md).
- Backend qotib qolganda ochiq video ≤ lease davom etishi mumkin.
- Master kalit DPAPI **LocalMachine** bilan: shu kompyuterdagi har qanday jarayon uni ochishi mumkin (fayl ACL bilan cheklangan). Bu disk/backupni boshqa kompyuterga ko'chirib o'qishdan himoya qiladi, lokal adminlardan emas.
- Ichki MediaMTX API autentifikatsiyasiz (loopback). Lokal ishonchsiz foydalanuvchilar server kompyuterida bo'lmasligi kerak.
- O'z-o'zidan imzolangan sertifikat bilan foydalanuvchilar sertifikat ogohlantirishiga ko'nikib qolishi xavfli — ishlab chiqarishda CA sertifikatidan foydalaning.

## 11. Zaiflik haqida xabar berish
Loyiha egasiga yopiq kanal orqali xabar bering; publish kalitlari va parollarni xabarga qo'shmang.

## 12. v1.1: maxsus havolalar va media
### Maxsus havolalar
- Token: 24 bayt (192 bit) `crypto/rand`, bazada SHA-256 (tekshirish) + AES-256-GCM nusxa (adminga qayta ko'rsatish/QR uchun). Shifrlash kaliti — master kalit: bazada emas, `config\secrets\master.key` da DPAPI bilan.
- URL: `https://<public-base>/link#<token>`. Token URL **fragmentida**: brauzer uni serverga yubormaydi; server loglari, Referer va audit uni ko'rmaydi; Telegram/skaner/prefetch GET qilsa faqat oddiy sahifa oladi — foydalanish sarflanmaydi (integratsiya testi: 0). Sahifa tokenni darhol manzil satridan olib tashlaydi.
- Faollashtirish faqat POST `/api/link/activate` (maxsus sarlavha + Origin tekshiruvi) bilan, BEGIN IMMEDIATE tranzaksiyada: holat, vaqt oynasi, limit, parallel chegara, bog'langan hisob bloki, favqulodda to'xtatish tekshiriladi; foydalanish sarflanadi va sessiya yaratiladi. 20 parallel urinishdan bitta g'olib (o'lchangan). Bir xil `requestId` bilan qayta yuborish (10 daqiqa ichida) yangi foydalanish sarflamaydi.
- Keyin oddiy server sessiyasi (`__Host-ds`, HttpOnly, Secure, SameSite=Strict). Refresh, tab, lease, media qayta ulanish — foydalanish emas.
- Bekor qilish: DB → havola sessiyalari bekor → jonli va fayl yetkazishlar uziladi. "Yangilash" eski tokenni bekor qiladi (ixtiyoriy: mavjud sessiyalarni ham).
- Oluvchi nomi tasdiqlangan shaxs emas. Cookie o'chirilsa yoki boshqa brauzerga o'tilsa sessiya tiklanmaydi.
- Rate limit: inspect/activate IP bo'yicha (`security.link_rate_per_minute`, default 60/daq). NAT ortidagi katta guruh uchun oshiring.
- Restore'dan keyin: barcha sessiyalar bekor, ishlatilgan havolalar ishlatilgan holicha qoladi, faollashtirish qayta-urinish oynasi yopiladi.

### Media (matn, rasm, video)
- Matn oddiy matn sifatida saqlanadi va escape qilib ko'rsatiladi (HTML/JS bajarilmaydi).
- Yuklash: tur va hajm cheklovi (`library.max_image_mb`=25, `max_video_mb`=2048), haqiqiy format (magic bytes + dekoder; MP4 `stsd` kodek H.264/AV1/VP9; WebM VP8/VP9/AV1). SVG, HTML/XML/skript, H.265 aniq xabar bilan rad. Transkodlash yo'q — FFmpeg runtime'da ishlatilmaydi.
- Saqlash: `data\media\<tasodifiy id>` (public papka emas, mijoz yo'l bermaydi). Fayl, thumbnail va har bir Range so'rovida serverda ruxsat. Javob: `Cache-Control: private, no-store`, `nosniff`, `CSP: default-src 'none'; sandbox`.
- Revoke/muddat/yashirish: davom etayotgan yuklash uziladi (o'lchangan: 20 MB videodan 0.3–0.9 MB o'tgach; tarmoq buferlari bir necha yuz KB gacha yetkazishi mumkin), keyingi Range rad etiladi. UI: matn/rasm yo'qoladi, video to'xtatiladi.
- **Cheklov:** foydalanuvchi allaqachon olgan matn, rasm yoki video baytlarini qurilmasidan qaytarib bo'lmaydi (kesh, skrinshot, ekran yozuvi). Kontent "nusxalab bo'lmaydigan" emas.

### Backend qotib qolishi (v1.0 cheklovi, yangi media turlari uchun baho)
- Jonli WebRTC: o'zgarmagan — eng yomon holatda ochiq video ≤ `lease_seconds` (default 120 s) davom etishi mumkin. Bu cheklov **bartaraf etilmagan**; qotishning o'zi sinalmagan (faqat lease mexanizmi).
- Yuklangan video/rasm/matn: baytlarni backend o'zi yetkazadi, backend qotsa yangi bayt yuborilmaydi. Lekin brauzer buferlagan qism (qisqa videoda butun fayl) o'ynashda davom etadi va ochiq matn/rasm ekranda qoladi. Bu ssenariy alohida sinalmagan.
