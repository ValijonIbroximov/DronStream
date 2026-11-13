# DronStream — xavfsizlik modeli va arxitektura auditi (v1.3.0)

Bu hujjat **kim videoni ko'ra oladi va kim ko'ra olmaydi** degan savolga kod asosida javob beradi. Undagi har bir da'vo yo kod bilan, yo test bilan, yo "tasdiqlanmagan" belgisi bilan berilgan. "Hech kim ko'ra olmaydi" degan mutlaq da'vo yo'q.

Bog'liq hujjatlar: [SECURITY.md](SECURITY.md) (batafsil mexanizmlar), [SECURITY_ACCEPTANCE.md](SECURITY_ACCEPTANCE.md) (qabul testlari va dalillar), [TEST_REPORT.md](TEST_REPORT.md).

## Joriy holat (v1.3.0) — qisqa xulosa

- **Kirish nazorati kuchaytirilgan.** Havola va QR faqat taklif; administrator har bir brauzer sessiyasini (havola ham, mehmon ham) tomoshabin aytgan tekshirish kodi bilan tasdiqlaydi; administrator uchun TOTP va muhim amallarda qayta tasdiqlash bor.
- **Server videoni ochiq ko'radi.** TLS/DTLS serverda tugaydi. Server egasi, root huquqi bor odam, hosting provayderi yoki serverni egallagan hujumchi videoni ko'ra oladi.
- **Pult → server yo'li tasdiqlanmagan.** Pultning RTMPS'ni qo'llashi va server sertifikatini tekshirishi haqiqiy qurilmada sinalmagan. Oddiy RTMP shifrlanmagan va production (secure) rejimida tarmoqdan qabul qilinmaydi.
- **Pultdan tomoshabingacha E2EE amalga oshirilmagan.** Alohida proof-of-concept (`poc/e2ee/`) **ish jarayonida**: hali ko'rib chiqilmagan, sinovlari tasdiqlanmagan va repozitoriyga kiritilmagan.

Shuning uchun bu versiya haqida "video maxfiyligi ta'minlangan" deb aytib bo'lmaydi. To'g'ri ifoda: **ruxsatsiz tomoshabinlardan himoya kuchaytirilgan; server tomoni va pult → server yo'li bo'yicha ochiq masalalar qolgan.** Admin paneldagi "Xavfsizlik holati" bo'limi ham aynan shu to'rt xulosa bilan boshlanadi va ular sozlamaga bog'liq emas.

## 1. Maqsad

Video faqat ikki toifaga ochilishi kerak:

1. huquqi berilgan administrator;
2. administrator tasdiqlagan tomoshabin (doimiy hisob, tasdiqlangan mehmon yoki tasdiqlangan havola sessiyasi).

Ko'ra olmasligi kerak bo'lganlar va **joriy holat**:

| Kim | Hozir ko'ra oladimi | Qanday himoya | Holat |
|---|---|---|---|
| Faqat havolani olgan begona odam | Yo'q | Havola faqat taklif; administrator aniq brauzer sessiyasini tekshirish kodi bilan tasdiqlaydi (3-bo'lim) | Kod va testlar bilan tasdiqlangan |
| Ruxsatsiz boshqa foydalanuvchi | Yo'q | Har bir chipta, media ulanish, fayl va Range so'rovi serverda tekshiriladi | Kod va testlar bilan tasdiqlangan |
| Lokal tarmoq kuzatuvchisi (brauzer ↔ server) | Yo'q (mazmun) | HTTPS (TLS) va WebRTC DTLS-SRTP | Shifrlash standart; sertifikat ishonchliligi o'rnatishga bog'liq (5-bo'lim) |
| Internet provayderi (brauzer ↔ server) | Yo'q (mazmun) | Xuddi shu | Xuddi shu |
| Pult ↔ server oralig'idagi kuzatuvchi | **Oddiy RTMP'da HA** (xususiy tarmoqda ham) | secure rejimda oddiy RTMP tarmoqdan qabul qilinmaydi; RTMPS server tomonida bor, DJI pulti bilan tasdiqlanmagan | **Ochiq masala**: pultni ulashning tasdiqlangan shifrlangan yo'li hali yo'q (4-bo'lim) |
| Tashqi relay (TURN) operatori | Yo'q (mazmun) | Media DTLS-SRTP; TURN faqat shifrlangan paketlarni uzatadi | Standart bo'yicha; o'z TURN serveringiz bo'lsa ham shu |
| Hosting provayderi / server root administratori | **HA** | Hech qanday — video serverda ochiq | **Amalga oshirilmagan**: E2EE yo'q (6-bo'lim) |
| Media-server (MediaMTX) | **HA** | — | Arxitektura shunday; 4-bo'lim |

Metadata hamma joyda ko'rinadi: shifrlangan video ham trafik hajmi, bitreyt o'zgarishi, vaqt, IP manzillar va portlarni yashirmaydi. Masalan provayder stream qachon boshlanib qachon tugaganini va taxminan qancha tomoshabin borligini ko'rishi mumkin.

## 2. Joriy media yo'li — kod bo'yicha audit

```
DJI pulti ──RTMP (yoki RTMPS)──► MediaMTX (DronStream child jarayoni) ──WebRTC DTLS-SRTP──► brauzer
                                      ▲ hook: har publish/read so'rovi               ▲ HTTPS: sahifa, API, WHEP signalizatsiya
                                      └──── dronstream (Go) ── ruxsat, chipta, audit ─┘
```

| Savol | Javob | Manba |
|---|---|---|
| Video qayerda ochiq? | (1) Oddiy RTMP bo'lsa pult ↔ server yo'lida; (2) MediaMTX jarayoni xotirasida doim; (3) tomoshabin qurilmasida (dekodlangandan keyin) | `backend/internal/mtx/conf.go` |
| TLS qayerda tugaydi? | HTTPS — `dronstream` jarayonida (`tlsutil`). WebRTC DTLS — MediaMTX'da. RTMPS — MediaMTX'da. Hammasi server ichida | `internal/tlsutil`, `internal/mtx/conf.go` (`rtmpServerCert`) |
| Shifrlash kalitlariga kim ega? | TLS kaliti va DTLS kalitlari — server. Pult publish kaliti — server bazasida SHA-256 xesh + master kalit bilan AES-GCM nusxa. Master kalit — Windows'da DPAPI, Linux'da 0600 fayl | `internal/secure`, `core/streams.go` |
| Qaysi jarayon videoni qayta paketlaydi? | MediaMTX: RTMP/FLV'dan H.264 kirish birliklarini ajratadi va WebRTC uchun RTP'ga qayta paketlaydi. Transkod yo'q (piksel darajasida qayta kodlanmaydi), lekin kadrlar ochiq ko'rinishda o'tadi | MediaMTX v1.21.3 ishlash tartibi |
| Qaysi sozlama oddiy RTMP'ni qabul qiladi? | `media.rtmp_listen` bo'sh bo'lmasa. RTMPS yoqilsa va `rtmp_listen` ham berilgan bo'lsa MediaMTX `rtmpEncryption: optional` — ikkalasi ham qabul qilinadi. `rtmp_listen` bo'sh va RTMPS yoqilgan bo'lsa `strict` (faqat RTMPS) | `internal/mtx/conf.go` `Render` |
| Avtomatik RTMPS → RTMP fallback bormi? | Serverda yo'q: dastur o'zi bir protokoldan ikkinchisiga o'tmaydi. Pult ilovasining o'z xatti-harakati tasdiqlanmagan | — |
| Muqobil o'qish yo'llari? | HLS, RTSP, SRT, playback, recording, metrics, pprof o'chirilgan; WebRTC signalizatsiya va boshqaruv API faqat 127.0.0.1 | `conf.go`, `config.Validate` |
| Kim chiqish ulanishlari qiladi? | `dronstream`: faqat loopback (MediaMTX API, WHIP demo) va ACME yoqilsa Let's Encrypt. MediaMTX: tashqi STUN/TURN ro'yxati bo'sh. Telemetriya/analytics yo'q | kod qidiruvi (`net.Dial`, `http.Get` faqat loopback), `webrtcICEServers2: []` |

### Tashqi ulanishlarni inventarizatsiya qilish tartibi (har o'rnatishda)

1. Xizmat ishlab turganda chiquvchi ulanishlarni ro'yxatlang:
   - Windows: `Get-NetTCPConnection -OwningProcess (Get-Process dronstream,mediamtx).Id | Where-Object RemoteAddress -notin '127.0.0.1','::1','0.0.0.0','::'`
   - Linux: `sudo ss -tunp | grep -E 'dronstream|mediamtx'`
2. Kutilgani: faqat tomoshabin/pult ulanishlari (kiruvchi) va ACME yoqilgan bo'lsa Let's Encrypt. Boshqa manzil bo'lsa — to'xtating va tekshiring.
3. Qat'iy muhitda chiquvchi trafikni firewall'da sukut bo'yicha yoping va faqat kerakli yo'nalishlarni oching; dastur shunda ham ishlashi kerak (ACME'dan tashqari).

## 3. Kirish siyosati: havola — kalit emas

v1.3.0 dan boshlab (avvalgi "havolaning o'zi kirish beradi" rejimi olib tashlandi):

- Havola yoki QR'ni ochish, GET so'rov, skanerlash — hech narsa bermaydi va hech narsani sarflamaydi.
- "Kirish so'rovini yuborish" shu brauzerda **pending** sessiya yaratadi va ekranda tasodifiy **tekshirish kodi** (`XXX-XXX`) chiqaradi. Bu sessiyada chipta, fayl, kutubxona, media yo'q (`link_pending_approval`).
- Administrator so'rovni faqat tomoshabin aytgan kodni kiritib tasdiqlaydi; kod mos kelmasa rad etiladi. Shu tarzda admin aynan o'zi gaplashgan odamning brauzerini tasdiqlaydi.
- Tasdiq **brauzer sessiyasiga** bog'langan (HttpOnly, Secure, SameSite=Strict cookie). Nusxalangan havola boshqa brauzerda faqat yangi so'rov yaratadi — test: `copied_link_other_browser_no_access`.
- Bir martalik/N martalik/vaqt chegaralari saqlangan va **tasdiqlash paytida** sanaladi: havolani olgan begona odam "Kirish" bosib haqiqiy egasining bir martalik imkoniyatini yeb qo'ya olmaydi. Bitta havola bo'yicha kutayotgan so'rovlar ≤ 5.
- Mehmon so'rovi (login-parolsiz) ham xuddi shunday: mehmon ekranida tekshirish kodi chiqadi, administrator uni mehmondan so'rab kiritadi; kod mos kelmasa tasdiqlanmaydi. Ism va xabar shaxsni tasdiqlamaydi.
- Tekshirish kodlari admin paneliga **yuborilmaydi** (admin API ularni qaytarmaydi): administrator kodni faqat tomoshabinning o'zidan, alohida ishonchli kanal orqali oladi.
- IP va brauzer nomi faqat ma'lumot uchun ko'rsatiladi, shaxsni tasdiqlash vositasi sifatida ishlatilmaydi.
- **Migratsiya**: 1.1.0/1.2.0 da havola orqali avtomatik ochilgan sessiyalar yangilanishda `pending` holatiga o'tadi va ularga tekshirish kodi beriladi. Ularning foydalanishi eski versiyada sanalgan, shuning uchun qayta tasdiqlashda ikkinchi marta sanalmaydi va bir martalik havolaning o'z sessiyasi "limit tugagan" deb rad etilmaydi; boshqa brauzer esa tugagan havoladan foydalana olmaydi. Testlar: `TestMigrationFromV2` (haqiqiy 1.1.0 bazasi), `TestApprovalOfSessionCountedBeforeUpgrade`; brauzerda 1.2.0 → 1.3 bilan qo'lda tekshirilgan.

**Qurilma kalitiga bog'lash (WebAuthn/qurilma kaliti bilan challenge)** amalga oshirilmagan. Hozirgi bog'lanish — serverda tekshiriladigan cookie sessiyasi. Cookie qurilmadan o'g'irlansa (zararli dastur), sessiya shu cookie bilan ishlatilishi mumkin; bu "buzilgan tomoshabin qurilmasi" holati (7-bo'lim).

### Administrator autentifikatsiyasi

- Parol: Argon2id, bloklash, rate limit (avvalgidek).
- **TOTP (RFC 6238)**: sir master kalit bilan AES-GCM shifrlangan holda saqlanadi; bir marta ishlatilgan kod qayta qabul qilinmaydi; 10 ta bir martalik tiklash kodi (bazada SHA-256 xesh). RFC 4226/6238 test vektorlari bilan tekshirilgan.
- **secure rejimda** TOTP'siz administrator faqat TOTP'ni yoqa oladi, boshqa admin amallari bloklanadi.
- **Qayta tasdiqlash**: pult kalitini ko'rish/almashtirish/bekor qilish, stream o'chirish, foydalanuvchi yaratish/o'zgartirish, parolni tiklash, server holatini o'zgartirish — oxirgi 10 daqiqada shu brauzer sessiyasida parol (+TOTP) talab qiladi.
- **Tiklash tartibi**: (1) tiklash kodi; (2) server kompyuterida lokal huquq bilan `dronstream reset-admin --username <LOGIN>` — vaqtinchalik parol beradi, TOTP va tiklash kodlarini o'chiradi, barcha sessiyalarni yopadi, auditga yozadi. Bu yo'l server ustidan lokal nazorat bor odamga ishonadi — bu ataylab qilingan.
- **Passkey (WebAuthn)** amalga oshirilmagan. Sabab: tashqi kutubxona va brauzer/qurilma sinovlarini talab qiladi; keyingi bosqich.

## 4. Pult → server segmenti: shifrlanmagan ingest siyosati

Oddiy RTMP'da video ham, pult (publish) kaliti ham ochiq matnda ketadi. **Xususiy IP manzil shifrlash emas.** 10.x, 172.16–31.x, 192.168.x, 100.64.x (CGNAT yoki VPN overlay) va link-local manzillar faqat marshrutlash doirasini bildiradi. Shu tarmoq segmentidagi — Wi-Fi, LAN yoki hatto VPN ichidagi — har qanday qurilma oqimni o'qiy oladi. Wi-Fi paroli faqat tarmoqqa kirmagan odamdan himoya qiladi, tarmoq ichidagilardan emas.

### 4.1 Rejimlar

| Rejim | `media.rtmp_listen` | Natija |
|---|---|---|
| **secure** — production (paketda sukut) | bo'sh | Oddiy RTMP yo'q |
| | `127.0.0.1:PORT` yoki `[::1]:PORT` | Qabul qilinadi — yagona istisno (4.2) |
| | xususiy IP, CGNAT, link-local, ommaviy IP, `:PORT`, `0.0.0.0:PORT`, host nomi (`localhost` ham) | **Dastur ishga tushmaydi** va sababini yozadi |
| **standard** — laboratoriya | har qanday | Ishga tushadi; admin panelda doimiy "Laboratoriya rejimi — production emas" ogohlantirishi; holat panelida rejim va ochiq RTMP "buzilgan" deb ko'rsatiladi |

- RTMPS (`media.rtmps_listen`) har qanday interfeysda ruxsat etiladi: u TLS ichida. RTMPS'dan RTMP'ga avtomatik o'tish yo'q.
- "Bu interfeys VPN" degan sozlama bayrog'i **ataylab yo'q**. Dastur interfeys shifrlangan tunnel ekanini ishonchli aniqlay olmaydi; bunday bayroq tekshirib bo'lmaydigan va'da bo'lardi.
- MediaMTX'ning boshqa kirish yo'llari (RTSP, SRT, HLS, MoQ, playback, metrics, pprof) o'chirilgan; boshqaruv API va WebRTC signalizatsiya faqat 127.0.0.1 da. Demak tarmoqdan ko'rinadigan tinglovchilar: HTTPS (TCP), WebRTC ICE (UDP, DTLS-SRTP), yoqilgan bo'lsa RTMPS va TURN.

Dalillar:

- Kod testi: `TestSecureModeRefusesPlainRTMPOnAnyNetwork` (18 xil manzil), `TestSecurityStatusIsHonestAboutIngestAndE2EE`.
- CI (Ubuntu, systemd ostidagi haqiqiy paket): `:1935`, `10.8.0.1:1935`, `192.168.1.10:1935`, `localhost:1935` bilan xizmat ishga tushmaydi va sabab jurnalda; `127.0.0.1:1935` bilan ishga tushadi va `ss` faqat loopback tinglovchini ko'rsatadi; tinglovchi soketlar inventarizatsiyasi — tarmoqdan ko'rinadigan TCP faqat HTTPS porti, MediaMTX'ning UDP porti faqat WebRTC.

### 4.2 Loopback istisnosi va ishonchli gateway — ishonch chegarasi

`127.0.0.1` dagi tinglovchiga faqat shu kompyuterdagi jarayonlar ulana oladi. Istisnoning yagona maqsadi: operator **shu kompyuterda** shifrlangan kanalni tugatadigan gateway (TLS terminator yoki shifrlangan tunnel uchi) ishlatib, uni 127.0.0.1 ga yo'naltirishi mumkin.

Ishonch chegarasi aniq shunday:

1. Gateway server kompyuterida ishlaydi va videoni ochiq ko'radi. Bu yangi ishonchli tomon qo'shmaydi: server baribir videoni ochiq ko'radi.
2. Gateway'gacha bo'lgan tashqi yo'l shifrlanganmi — **DronStream tekshirmaydi va tekshira olmaydi.** Bu operator mas'uliyati. Holat panelida loopback RTMP "tekshirilgan" deb chiqadi (tinglovchi haqiqatan faqat loopback'da), lekin izohda aynan shu cheklov yozilgan.
3. Shifrlangan kanal qayerdan boshlansa, undan oldingi bo'lak ochiq. Tunnel pult yonidagi routerdan boshlansa, pult ↔ router oralig'ida RTMP ochiq ketadi. Bu bo'lak faqat pult va router ulangan, jismonan nazorat qilinadigan ulanish bo'lishi kerak (kabel/USB yoki alohida tarmoq); umumiy Wi-Fi bunga kirmaydi.
4. Shu kompyuterdagi boshqa lokal jarayon ham 127.0.0.1 ga ulana oladi. Publish baribir stream kalitini talab qiladi, lekin serverga lokal kirishi bor odam allaqachon ishonchli tomon hisoblanadi.
5. Gateway sxemalari bu loyihada **sinalmagan** va paketga kiritilmagan. Ular qo'shimcha dastur/qurilma talab qiladi (6-bo'lim, B variant).

### 4.3 Laboratoriya rejimi production emas

`security.mode: standard` — stend sinovlari uchun: demo manbalar, alohida ajratilgan sinov tarmog'ida pultni birinchi ulash. Bu rejimda haqiqiy operativ video uzatilmasligi kerak. 1.0–1.2 dan yangilangan o'rnatishlarda sozlama faylida `security.mode` yo'q, shuning uchun ular laboratoriya rejimida qoladi va admin panel buni har sahifada ko'rsatadi; production'ga o'tish — `security.mode: secure` va `rtmp_listen` ni tekshirish.

### 4.4 Haqiqiy pult uchun joriy holat — bloklovchi omil

Secure rejimda haqiqiy DJI pultini ulashning **tasdiqlangan yo'li hali yo'q**:

| Yo'l | Holat |
|---|---|
| RTMPS | Server tomoni tayyor. Pult (DJI Pilot 2) `rtmps://` ni qo'llashi rasmiy hujjatlarda na tasdiqlangan, na rad etilgan; sertifikatni tekshirishi noma'lum. Haqiqiy qurilmada sinov kerak (4.5) |
| Gateway / tunnel → 127.0.0.1 | Qo'shimcha qurilma yoki dastur kerak; sinalmagan |
| Oddiy RTMP | Faqat laboratoriya rejimida |

Himoyani zaiflashtirib pultni ulash yo'li dasturga kiritilmagan va kiritilmaydi.

### 4.5 Haqiqiy qurilmada RTMPS sinash tartibi

1. Serverda `rtmps_listen: ":1936"`, ishonchli sertifikat (domen mos), `rtmp_listen: ""`.
2. Pultda `rtmps://<DOMEN>:1936/live/<YOL>?key=<KALIT>`. Natija: efirga chiqdi / chiqmadi.
3. **Ishonchsiz sertifikat**: o'z-o'zidan imzolangan sertifikat qo'ying → pult ulanmasligi kerak.
4. **Nom mos emas**: boshqa domen uchun sertifikat → ulanmasligi kerak.
5. **Muddati o'tgan** sertifikat → ulanmasligi kerak.
6. 3–5 dan birortasida pult ulansa — u sertifikatni tekshirmaydi: RTMPS faqat passiv kuzatuvchidan himoya qiladi, faol MITM'dan emas. Natijani `DJI_SETUP_UZ.md` ga yozing.
7. Har holatda: noto'g'ri kalit rad, boshqa stream yo'li rad, ikkinchi publisher rad (bular avtomatik testlarda tasdiqlangan).

**Muhim:** RTMPS ishlasa ham video **serverdan yashirilmaydi** — TLS MediaMTX'da tugaydi. Bu 6-bo'limdagi C variant.

## 5. Brauzer ↔ server segmenti

- HTTPS: TLS 1.2+. **O'z-o'zidan imzolangan sertifikat** bilan foydalanuvchi ogohlantirishni o'tkazib yuborsa, faol MITM aniqlanmaydi — xavfsizlik holati panelida "zaif" deb ko'rsatiladi. Production: CA yoki ACME sertifikat.
- WebRTC media: DTLS-SRTP (WebRTC standartida majburiy). DTLS barmoq izi HTTPS orqali o'tgan SDP ichida keladi — shuning uchun media himoyasi HTTPS ishonchliligiga tayanadi.
- Cookie: `__Host-` prefiks, Secure, HttpOnly, SameSite=Strict; CSRF tokeni; CSP `script-src 'self'`.

## 6. Pultdan tomoshabingacha E2EE: joriy holat, variantlar, blokerlar

**Talab:** media-server va uning egasi ham videoni o'qiy olmasin.

**Joriy holat:** joriy DJI Pilot 2 → MediaMTX → brauzer oqimida E2EE **yo'q**. Shu bilan birga "DJI bilan E2EE umuman mumkin emas" degan xulosa ham **dalillanmagan**: mos publisher/SDK imkoniyati rasmiy hujjatlarda bor, lekin bu loyihaning qurilmasida hali tekshirilmagan (6.1, 6.2).

### 6.1 Rasmiy DJI hujjatlaridan aniqlangan faktlar (2026-11-14 holatiga)

Daraja: **✔** — sahifa bu ish davomida ikki marta mustaqil o'qilgan; **◻** — rasmiy sahifadan bir marta o'qilgan (sahifa keyin qayta ochilmadi); **?** — topilmadi.

| # | Fakt | Daraja | Manba |
|---|---|---|---|
| 1 | Mavic 3 Enterprise seriyasi (3E/3T) uchun rasmiy pult — DJI RC Pro Enterprise; unda Mini-HDMI video chiqishi bor | ◻ | [S1] |
| 2 | Mobile SDK V5 Mavic 3 Enterprise seriyasini qo'llaydi; oxirgi versiya 5.20.1 | ✔ | [S2] |
| 3 | Mavic 3E/3T MSDK'ga 5.1.0 da (2022-09) qo'shilgan; har relizda mos dron/pult firmware juftligi ko'rsatilgan | ◻ | [S3] |
| 4 | `ILiveStreamManager` jonli efir turlari: RTMP, RTSP, GB28181, AGORA. RTMPS, TLS yoki sertifikat haqida hech narsa yo'q | ✔ | [S4] |
| 5 | `ICameraStreamManager` (MSDK 5.8.0 dan): `addReceiveStreamListener` kameraning **kodlangan xom oqimini** beradi va hujjatda aynan o'zi dekodlash yoki uchinchi tomon jonli efiri uchun deyilgan; `addFrameListener` — dekodlangan kadrlar | ✔ | [S5] |
| 6 | Bir vaqtda bitta ilova dron bilan ishlaydi: MSDK 5.1.x eslatmalarida uchinchi tomon ilovasidan oldin DJI Pilot majburan to'xtatilishi kerak; 5.6.0 da almashish mumkin, lekin fondagi ilova dron ma'lumotini olmaydi | ◻ | [S3] |
| 7 | DJI Pilot 2 jonli efiri: Agora, RTMP, RTSP, GB28181. RC Pro (M3E) uchun Cloud API sahifasida Agora, RTMP, GB28181; WebRTC/WHIP faqat RC Plus 2 va Dock 3 sahifalarida | ◻ | [S6] [S7] |
| 8 | Pilot 2 `rtmps://` ni qo'llashi yoki qo'llamasligi haqida rasmiy bayonot; pultga o'z CA sertifikatini o'rnatish tartibi | ? | — |
| 9 | Payload SDK "Liveview": Mavic 3E/3T da E-Port orqali H.264 oqimi (Linux, USB; E-Port Development Kit kerak). M3E da PSDK "Network Access" yo'q — bort kompyuteriga o'z aloqa kanali kerak; M3E uchun PSDK faqat qo'llab-quvvatlash rejimida | ◻ | [S8] [S9] |
| 10 | DJI'ning o'z shifrlashi dron ↔ pult radio kanaliga tegishli (AES-256). Pult → media-server bo'lagi haqida DJI hech narsa demaydi | ◻ | [S10] |
| 11 | RC Pro Enterprise'ning Android versiyasi; pultga o'z APK'ni o'rnatishning rasmiy tartibi; HDMI chiqishi toza tasvirmi yoki interfeys nusxasimi; M3T xom oqimining kodeki (H.264/H.265) | ? | — |

Manbalar:

- [S1] enterprise.dji.com/mavic-3-enterprise/specs
- [S2] github.com/dji-sdk/Mobile-SDK-Android-V5 (README)
- [S3] developer.dji.com/doc/mobile-sdk-tutorial/en/ (MSDK Release Note)
- [S4] developer.dji.com/api-reference-v5/android-api/Components/IMediaDataCenter/ILiveStreamManager.html
- [S5] developer.dji.com/api-reference-v5/android-api/Components/IMediaDataCenter/ICameraStreamManager.html
- [S6] developer.dji.com/doc/cloud-api-tutorial/en/feature-set/pilot-feature-set/pilot-livestream.html
- [S7] developer.dji.com/doc/cloud-api-tutorial/en/api-reference/pilot-to-cloud/mqtt/rc-pro/live.html
- [S8] developer.dji.com/doc/payload-sdk-tutorial/en/function-overview/advanced-function/liveview.html
- [S9] developer.dji.com/doc/payload-sdk-tutorial/en/development-preparation/development-platform-overview/open-capability-list.html
- [S10] enterprise.dji.com/news/detail/dji-mavic3-enterprise-released

"Hujjatda API bor" degani "shu qurilmada ishlaydi" degani emas: quyidagilarning hech biri haqiqiy pultda sinalmagan.

### 6.2 Uch variant solishtiruvi

| | **A.** Pultdagi o'z publisher ilovasi (MSDK) | **B.** Ishonchli lokal gateway | **C.** RTMPS → o'z serverimiz → WebRTC |
|---|---|---|---|
| Shifrlash qayerdan boshlanadi | Pult ichida, kadr kodlangan zahoti | Gateway'da; pult ↔ gateway bo'lagi ochiq | Uchdan-uchga shifrlash yo'q: bo'lak-bo'lak (TLS, keyin DTLS-SRTP) |
| Videoni ochiq ko'radiganlar | Pult (DJI apparati, firmware, bizning ilova) va tasdiqlangan tomoshabin qurilmasi | Shular + gateway va pult ↔ gateway bo'lagidagi kuzatuvchi | Shular + **server, uning root egasi, hosting, MediaMTX** |
| Server egasidan yashiradimi | Ha — agar 6.3 dagi shartlar bajarilsa | Ha — xuddi shu shartlar bilan | **Yo'q** |
| Nima kerak | Android ilova (MSDK ≥ 5.8.0) va uni pultga o'rnatish; ilova Pilot 2 **o'rnida** ishlaydi, demak parvoz interfeysi ham o'zimizniki bo'lishi kerak; kalitsiz relay; alohida tarqatiladigan frontend | Pult yonida qo'shimcha qurilma (noutbuk/mini-PC) va dastur; pultdan lokal RTMP/RTSP yoki HDMI; qolgani A bilan bir xil | Hozirgi tizim; pult RTMPS'ni qo'llashi kerak |
| Hujjat/sinov holati | API hujjatlashtirilgan (6.1: 2, 5); bu qurilmada sinalmagan | Qismlari hujjatlashtirilgan (6.1: 1, 4, 7); sinalmagan | Pult tomonda RTMPS hujjatlashtirilmagan (6.1: 8) |
| "Ortiqcha dastursiz ishlash" talabi | **Zid**: pultga yangi ilova o'rnatiladi va Pilot 2 o'rniga ishlatiladi | **Zid**: qo'shimcha qurilma va dastur | Mos |
| Asosiy xavf | Parvoz xavfsizligi: Pilot 2 beradigan funksiyalarni (xarita, termal ko'rinish, missiyalar) o'zimiz ta'minlashimiz kerak; ilova fonda oqim ololmaydi | Pult yonidagi ochiq bo'lak; qurilma yo'qolishi yoki buzilishi | Server buzilsa yoki egasi xohlasa — hamma video ochiq |

**C varianti to'liq E2EE emas** va "videoni server egasidan ham yashirish" talabini bajarmaydi. U bu hujjatda ham, interfeysda ham E2EE deb atalmaydi. Hozirgi mahsulot — aynan C ning pult tomoni tasdiqlanmagan ko'rinishi.

Hujjatlarda to'rtinchi yo'l ham bor: dron bortidagi kompyuter E-Port/Payload SDK orqali oqimni oladi (6.1: 9). U qo'shimcha apparat, alohida aloqa kanali talab qiladi va bu loyiha doirasidan tashqarida.

Qo'shimcha publisher yoki gateway mahsulotga **yashirin kiritilmagan**: paketda bunday komponent yo'q.

### 6.3 A va B uchun umumiy shartlar (hali bajarilmagan)

1. **Kalitsiz relay.** MediaMTX kirish birliklarini (H.264 NAL) tahlil qilib qayta paketlaydi; kadr ichi shifrlangan oqimni o'zgarishsiz uzatishi isbotlanmagan, RTMP manbada esa bunday format umuman yo'q. Shifrlangan yukni ochmasdan uzatadigan relay/SFU kerak.
2. **Frontend tarqatish ishonchi.** Tomoshabin JavaScript'ni shu serverdan yuklasa, buzilgan yoki zararli server boshqa kod berib kalitni olib qo'yadi. CSP va SRI server egasidan himoya qilmaydi (ularni ham u beradi). Frontend alohida ishonchli manbadan — imzolangan ilova yoki alohida, o'zgarmas va tekshiriladigan statik paket ko'rinishida — tarqatilishi kerak.
3. **Kalitlarni server orqali yashirin olish va recipient almashtirish.** Server tomoshabinning ochiq kalitini o'zinikiga almashtirishi mumkin. Himoya: kalit barmoq izini alohida kanal orqali solishtirish yoki a'zolik ro'yxatini administrator qurilmasidagi kalit bilan imzolash. Qisqa (6 xonali) kod buning uchun yetarli emas.
4. **Revoke va kalit davri.** Tomoshabin chiqarilganda yangi davr (epoch) kaliti faqat qolganlarga beriladi; eski davr kadrlarini qaytarib olib bo'lmaydi. Production uchun standart — MLS (RFC 9420).
5. **Brauzer.** WebRTC Encoded Transform bilan SFrame barcha brauzerlarda bir xil emas va bu loyihada sinalmagan; mos kelmagan brauzerda jim shifrlanmagan rejimga o'tilmasligi kerak.
6. **O'zgarmaydigan chegaralar.** Metadata (hajm, vaqt, IP, kim ulangan) relay'ga ko'rinadi; kaliti bor tomoshabin ekranni yozib olishi mumkin; DJI apparati va firmware videoni manbada ko'radi.
7. **Saqlangan media** (matn/rasm/video, thumbnail) bu sxemaga kirmaydi: ular serverda ochiq saqlanadi.

### 6.4 Proof-of-concept: `poc/e2ee/`

**Holat: ish jarayonida — kod hali ko'rib chiqilmagan, sinov natijalari tasdiqlanmagan, repozitoriyga kiritilmagan.** Reja bo'yicha mahsulotdan alohida, unga ulanmagan sinov zanjiri: **manba simulyatori → kalitsiz relay → qabul qiluvchi (Go) va brauzer sahifasi**. O'zimiz kriptografik protokol yaratmaganmiz: kadr shifrlash — SFrame (RFC 9605), kalitni har bir tasdiqlangan qabul qiluvchiga yetkazish — HPKE (RFC 9180). Bu standart primitivlar kompozitsiyasi, auditdan o'tgan protokol emas.

Natijalar tekshirilgach shu yerga va TEST_REPORT.md ga yoziladi. Kutilayotgan chegaralari: DJI qurilmasida sinalmagan; transport WebRTC emas; SFrame implementatsiyasi o'zimizniki va faqat rasmiy test vektorlari bilan tekshirilgan; barmoq izini solishtirish qo'lda; mustaqil audit yo'q.

### 6.5 Qaror uchun kerak bo'lgan qurilma ma'lumotlari

A, B yoki C ni tanlashdan oldin aniqlanishi kerak (hozir noma'lum, taxmin qilinmagan):

1. Pultning aniq modeli (yorlig'idagi model raqami) va firmware versiyasi.
2. Dron modeli (Mavic 3T ekanini tasdiqlash) va firmware versiyasi.
3. DJI Pilot 2 versiyasi.
4. Pilot 2 jonli efir menyusida qaysi turlar bor (RTMP, RTSP, GB28181, boshqa) va `rtmps://` manzili qabul qilinadimi.
5. Pultga o'z ilovangizni (APK) o'rnatish tashkilot qoidalari bo'yicha mumkinmi; Pilot 2 o'rniga boshqa ilova bilan uchish maqbulmi.
6. Pult yonida qo'shimcha qurilma (noutbuk/mini-PC) ishlatish mumkinmi; pultning HDMI chiqishi yoki lokal tarmoq ulanishi bormi.
7. Dala sharoitidagi aloqa: LTE modem, Wi-Fi, sun'iy yo'ldosh; VPN ishlatiladimi.
8. Server: haqiqiy R570 dagi OS, domen/sertifikat, kim root huquqiga ega.

### 6.6 Isbot talablari (E2EE mahsulotga kiritilganda)

- Media-server jarayonida va diskda media kaliti yo'qligi: kod tahlili + xotira/disk qidiruvi.
- Packet capture: relay'dan chiqqan yuk shifrlangan — **yagona isbot sifatida ishlatilmaydi**.
- Revoke'dan keyin eski qabul qiluvchi keyingi davr kadrlarini ocha olmasligi — avtomatik test.
- Server a'zolik ro'yxatini yoki ochiq kalitni almashtirganda mijoz buni aniqlashi — avtomatik test.
- Haqiqiy pultda sinov va mustaqil kriptografik audit.

## 7. Raqiblar bo'yicha tahlil

| Raqib | Nima qila oladi | Nima qila olmaydi | Izoh |
|---|---|---|---|
| Passiv tarmoq kuzatuvchisi | Metadata (IP, port, vaqt, hajm) ko'radi; oddiy RTMP bo'lsa (laboratoriya rejimi yoki gateway'gacha bo'lgan ochiq bo'lak) pult videosi va kalitini | HTTPS va DTLS-SRTP mazmunini o'qiy olmaydi | secure rejimda oddiy RTMP tarmoqdan qabul qilinmaydi; xususiy tarmoq ham himoya emas (4-bo'lim) |
| Faol MITM | O'z-o'zidan imzolangan sertifikatni foydalanuvchi qabul qilsa — hammasini; oddiy RTMP'ni o'zgartirish | Ishonchli sertifikat bilan HTTPS'ni buzolmaydi | Faqat ishonchli TLS; pult RTMPS'da sertifikatni tekshirishi tasdiqlanmagan |
| Hosting / server root | Videoni (MediaMTX xotirasi), yuklangan media, bazani, master kalitni — **hammasini** | — | Joriy arxitekturada to'liq ishonchli tomon. E2EE yo'q |
| Zararli/buzilgan signalizatsiya serveri | Bu tizimda signalizatsiya = DronStream serveri: root bilan bir xil | — | Alohida ishonchli signalizatsiya yo'q |
| Brauzerga JS yetkazuvchi server | Istalgan kodni ishga tushirish, sessiyani o'g'irlash | — | E2EE bo'lganda ham shu sababli frontend boshqa ishonchli manbadan kelishi kerak (6.3, 2-band) |
| DJI apparati va firmware | Videoni manbada ko'radi; firmware'ning tarmoq xatti-harakatini biz nazorat qilmaymiz | — | Tekshirib bo'lmaydi; tashqi xizmatlarga chiqishini tarmoq darajasida kuzating (2-bo'lim tartibi pult tarmog'iga ham) |
| Buzilgan tomoshabin qurilmasi | Ko'rayotgan videoni, cookie'ni (sessiyani) | Boshqa tomoshabin ruxsatini | Revoke sessiyani uzadi; olingan kadrlarni qaytarib bo'lmaydi |
| Ruxsatli tomoshabinning ekran yozuvi | Ko'rgan hamma narsasini yozib oladi | — | Texnik jihatdan to'xtatib bo'lmaydi; watermark faqat manbani aniqlashga yordam beradi |
| Havolani olgan begona | So'rov yuborish (≤ 5 kutayotgan) | Kod va admin tasdig'isiz hech narsa | Testlar bilan tasdiqlangan |

## 8. Saqlangan media, backup, loglar

| Obyekt | Qayerda | Kim o'qiy oladi | Himoya |
|---|---|---|---|
| Yuklangan rasm/video/matn | `data/media`, baza | Server root, xizmat hisobi | Fayl huquqlari; har so'rovda ruxsat (fayl, thumbnail, Range); revoke davom etayotgan yuklashni uzadi. **Serverdan yashirilmagan** |
| Thumbnail | `data/media` | Xuddi shu | Xuddi shu |
| Backup (`.dsbak`) | Siz tanlagan joy | Parolni biluvchi | Argon2id + AES-256-GCM, oqimli; parolsiz ochilmaydi |
| Loglar | `logs/` | Server root, xizmat hisobi | Sirlar niqoblanadi (kalit, token, parol, setup kodi); video log qilinmaydi |
| Crash dump | OS sozlamasiga bog'liq | Server root | Go panic faqat stek chiqaradi. Windows Error Reporting yoki Linux core dump yoqilgan bo'lsa jarayon xotirasi (kadrlar, kalitlar) diskka tushishi mumkin — production'da xizmat uchun dump yig'ishni o'chiring yoki cheklang |

## 9. Production talablari va ularning holati

Admin panel → **Audit va sozlamalar → Sozlamalar → Xavfsizlik holati** har bir bandni "tekshirilgan / zaif / buzilgan / tasdiqlanmagan / mavjud emas" deb ko'rsatadi. "Secure" yozuvi faqat sozlamadagi bayroq uchun chiqmaydi: har band ish vaqtida hisoblanadi.

| Talab | Qanday ta'minlanadi |
|---|---|
| Ishonchli TLS | Sozlama; o'z-o'zidan imzolangan bo'lsa panel "zaif" |
| Ichki API faqat loopback | Ishga tushishda tekshiriladi (aks holda ishga tushmaydi) |
| Minimal ochiq portlar | Sukut: HTTPS va WebRTC UDP; RTMP o'chiq. CI'da tinglovchi soketlar inventarizatsiyasi (4.1) |
| Shifrlanmagan ingest yo'q | secure rejimda oddiy RTMP faqat 127.0.0.1 yoki o'chiq; aks holda dastur ishga tushmaydi (4.1) |
| Alohida xizmat hisobi, minimal huquqlar | Linux: `dronstream` hisobi, systemd cheklovlari (CI'da tekshirilgan); Windows: hujjatda |
| Sirlarni niqoblash | Log niqoblagich (unit test) |
| Auth/revoke fail-closed | Hook, reconciler, watchdog, Job Object / Pdeathsig (testlar) |
| Telemetriya yo'q | Kod; chiquvchi ulanishlar inventarizatsiyasi (2-bo'lim) |
| Xavfsiz backup/restore | Shifrlangan; restore'dan keyin standby; TOTP va ruxsatlar saqlanadi (CI) |

## 10. Ochiq savollar va keyingi qadamlar

Bajarilmagan xavfsizlik talablari (hech biri "tayyor" deb ko'rsatilmaydi):

1. **Serverdan yashirish / E2EE** — amalga oshirilmagan. Variantlar va shartlar: 6-bo'lim. Proof-of-concept mahsulot emas.
2. **Pult → server shifrlangan yo'li** — tasdiqlanmagan: haqiqiy pultda RTMPS va sertifikat tekshiruvi (4.5), yoki gateway sxemasi.
3. **Qurilma ma'lumotlari** — 6.5 dagi ro'yxat; ularsiz A/B/C tanlab bo'lmaydi.
4. **Passkey (WebAuthn)** va **qurilma kalitiga bog'lash** — amalga oshirilmagan (3-bo'lim).
5. **Haqiqiy tarmoqda faol MITM sinovi**, haqiqiy R570 serveri, tashqi internet.
6. **Mustaqil xavfsizlik auditi.** Bu loyihadagi kod va testlarni AI yozgan; testlarning o'tishi mustaqil audit emas.
