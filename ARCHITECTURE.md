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
| 1935/tcp RTMP | pultlar | faqat VPN interfeysi / ruxsatlangan IP |
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
