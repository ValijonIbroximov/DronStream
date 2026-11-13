# DronStream — xavfsizlik modeli va arxitektura auditi (v1.3.0)

Bu hujjat **kim videoni ko'ra oladi va kim ko'ra olmaydi** degan savolga kod asosida javob beradi. Undagi har bir da'vo yo kod bilan, yo test bilan, yo "tasdiqlanmagan" belgisi bilan berilgan. "Hech kim ko'ra olmaydi" degan mutlaq da'vo yo'q.

Bog'liq hujjatlar: [SECURITY.md](SECURITY.md) (batafsil mexanizmlar), [SECURITY_ACCEPTANCE.md](SECURITY_ACCEPTANCE.md) (qabul testlari va dalillar), [TEST_REPORT.md](TEST_REPORT.md).

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
| Pult ↔ server oralig'idagi kuzatuvchi | **Oddiy RTMP'da HA** | VPN / yopiq tarmoq; RTMPS server tomonida bor, DJI pulti bilan tasdiqlanmagan | **Ochiq xavf**, 4-bo'lim |
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
- Mehmon so'rovi (login-parolsiz) ham administrator tasdig'ini kutadi va tekshirish kodini ko'rsatadi. Ism va xabar shaxsni tasdiqlamaydi.
- IP va brauzer nomi faqat ma'lumot uchun ko'rsatiladi, shaxsni tasdiqlash vositasi sifatida ishlatilmaydi.
- **Migratsiya**: 1.1.0/1.2.0 da havola orqali avtomatik ochilgan sessiyalar yangilanishda `pending` holatiga o'tadi va ularga tekshirish kodi beriladi — test `TestMigrationFromV2`.

**Qurilma kalitiga bog'lash (WebAuthn/qurilma kaliti bilan challenge)** amalga oshirilmagan. Hozirgi bog'lanish — serverda tekshiriladigan cookie sessiyasi. Cookie qurilmadan o'g'irlansa (zararli dastur), sessiya shu cookie bilan ishlatilishi mumkin; bu "buzilgan tomoshabin qurilmasi" holati (7-bo'lim).

### Administrator autentifikatsiyasi

- Parol: Argon2id, bloklash, rate limit (avvalgidek).
- **TOTP (RFC 6238)**: sir master kalit bilan AES-GCM shifrlangan holda saqlanadi; bir marta ishlatilgan kod qayta qabul qilinmaydi; 10 ta bir martalik tiklash kodi (bazada SHA-256 xesh). RFC 4226/6238 test vektorlari bilan tekshirilgan.
- **secure rejimda** TOTP'siz administrator faqat TOTP'ni yoqa oladi, boshqa admin amallari bloklanadi.
- **Qayta tasdiqlash**: pult kalitini ko'rish/almashtirish/bekor qilish, stream o'chirish, foydalanuvchi yaratish/o'zgartirish, parolni tiklash, server holatini o'zgartirish — oxirgi 10 daqiqada shu brauzer sessiyasida parol (+TOTP) talab qiladi.
- **Tiklash tartibi**: (1) tiklash kodi; (2) server kompyuterida lokal huquq bilan `dronstream reset-admin --username <LOGIN>` — vaqtinchalik parol beradi, TOTP va tiklash kodlarini o'chiradi, barcha sessiyalarni yopadi, auditga yozadi. Bu yo'l server ustidan lokal nazorat bor odamga ishonadi — bu ataylab qilingan.
- **Passkey (WebAuthn)** amalga oshirilmagan. Sabab: tashqi kutubxona va brauzer/qurilma sinovlarini talab qiladi; keyingi bosqich.

## 4. Pult → server segmenti va DJI cheklovlari

| Variant | Yo'lda kim ko'radi | Holat |
|---|---|---|
| Oddiy RTMP, ochiq internet | Yo'ldagi har kim (kalit ham ochiq) | **secure rejimda taqiqlangan**: `rtmp_listen` barcha interfeyslarda yoki ommaviy IP'da bo'lsa dastur ishga tushmaydi (test: `TestSecureModeConfigRefusesPublicPlainRTMP`, CI'da systemd bilan) |
| Oddiy RTMP + VPN / yopiq tarmoq | VPN ichidagi qurilmalar; VPN operatori | Ishlaydi; himoya VPN sifatiga bog'liq |
| RTMPS (`rtmps_listen`) | Yo'lda — hech kim (TLS), agar pult sertifikatni tekshirsa | Server tomoni bor. **DJI Pilot 2 RTMPS'ni qo'llashi tasdiqlanmagan** (DJI hujjatlarida faqat RTMP/RTSP/GB28181/Agora; forumda qo'llanmasligi aytilgan) |

**Real qurilmada RTMPS sinash tartibi** (pult qo'lda bo'lganda):

1. Serverda `rtmps_listen: ":1936"`, ishonchli sertifikat (domen mos), `rtmp_listen: ""`.
2. Pultda `rtmps://<DOMEN>:1936/live/<YOL>?key=<KALIT>`. Natija: efirga chiqdi / chiqmadi.
3. **Ishonchsiz sertifikat**: o'z-o'zidan imzolangan sertifikat qo'ying → pult ulanmasligi kerak.
4. **Nom mos emas**: boshqa domen uchun sertifikat → ulanmasligi kerak.
5. **Muddati o'tgan** sertifikat → ulanmasligi kerak.
6. 3–5 dan birortasida pult ulansa — u sertifikatni tekshirmaydi: RTMPS faqat passiv kuzatuvchidan himoya qiladi, faol MITM'dan emas. Natijani `DJI_SETUP_UZ.md` ga yozing.
7. Har holatda: noto'g'ri kalit rad, boshqa stream yo'li rad, ikkinchi publisher rad (bular avtomatik testlarda tasdiqlangan).

**Muhim:** RTMPS ishlasa ham video **serverdan yashirilmaydi** — TLS MediaMTX'da tugaydi.

## 5. Brauzer ↔ server segmenti

- HTTPS: TLS 1.2+. **O'z-o'zidan imzolangan sertifikat** bilan foydalanuvchi ogohlantirishni o'tkazib yuborsa, faol MITM aniqlanmaydi — xavfsizlik holati panelida "zaif" deb ko'rsatiladi. Production: CA yoki ACME sertifikat.
- WebRTC media: DTLS-SRTP (WebRTC standartida majburiy). DTLS barmoq izi HTTPS orqali o'tgan SDP ichida keladi — shuning uchun media himoyasi HTTPS ishonchliligiga tayanadi.
- Cookie: `__Host-` prefiks, Secure, HttpOnly, SameSite=Strict; CSRF tokeni; CSP `script-src 'self'`.

## 6. Pultdan tomoshabingacha E2EE — natija: amalga oshirilmagan, blokerlar aniq

**Talab:** media-server ham videoni o'qiy olmasin. **Joriy holat:** bajarilmaydi. Quyida sabablar va mumkin bo'lgan yo'l.

### 6.1 Blokerlar

1. **Manba (DJI Pilot 2)**: jonli efir faqat RTMP/RTSP/GB28181/Agora orqali (DJI rasmiy hujjati). Bularning hech biri bizning tomoshabinlarimizga mo'ljallangan manba tomonidagi E2EE emas. Demak **pultdan boshlanadigan E2EE mavjud qurilmalar bilan mumkin emas.** Serverda qabul qilib keyin shifrlash E2EE **emas** va shunday ko'rsatilmaydi.
2. **Media-server**: MediaMTX kirish birliklarini (H.264 NAL) tahlil qilib qayta paketlaydi. Kadr ichi shifrlangan (SFrame uslubida) oqimni o'zgarishsiz uzatishi **isbotlanmagan**; RTMP manba bilan esa umuman mumkin emas (RTMP ichida shifrlangan kadr formati yo'q). E2EE uchun media qatlamini shifrlangan yukni "ochmasdan" uzatadigan SFU bilan almashtirish kerak bo'ladi.
3. **Brauzerga JavaScript yetkazuvchi server**: tomoshabin kodni shu serverdan yuklasa, zararli yoki buzilgan server boshqa JavaScript berib kalitni olib qo'yishi mumkin. CSP va SRI server egasining o'zidan himoya qilmaydi (u CSP va xeshlarni ham o'zgartiradi). Server root'iga qarshi E2EE uchun frontend **boshqa ishonchli manbadan** tarqatilishi kerak (imzolangan o'rnatiladigan ilova yoki alohida, o'zgarmas va tekshiriladigan statik paket).
4. **Brauzer qo'llab-quvvatlashi**: WebRTC Encoded Transform (`RTCRtpScriptTransform`) va SFrame qo'llanishi brauzerlar bo'yicha farq qiladi va bu loyihada sinalmagan. Mos bo'lmagan brauzerda jim shifrlanmagan fallback qilinmasligi kerak — aniq rad etish.

### 6.2 Texnik jihatdan mumkin bo'lgan yo'l (rejalashtirilgan arxitektura, amalga oshirilmagan)

```
DJI pulti ─RTMP (lokal, kabel/USB yoki yopiq Wi‑Fi)─► ISHONCHLI LOKAL GATEWAY ─SFrame shifrlangan WebRTC─► SFU (kalitsiz) ─► brauzer (Encoded Transform bilan ochadi)
                                                     (videoni OCHIQ ko'radi)
```

- **Gateway** — operator qo'lidagi qurilma (noutbuk yoki mini-PC) pult yonida. U videoni ochiq ko'radi; pult → gateway oralig'i lokal va fizik nazorat ostida bo'lishi kerak. Bu "ortiqcha dasturiy ta'minot yo'q" talabiga zid: **qo'shimcha qurilma va dastur zarur**, buni yashirmaymiz. Muqobil — DJI MSDK/Cloud API asosida o'zimizning publisher ilovasi (pultning o'zida) — DJI SDK imkoniyatlari real qurilmada tekshirilishi kerak.
- **SFU** — shifrlangan yukni ochmasdan uzatadigan, SFrame/Encoded Transform bilan sinalgan yetuk yechim (masalan, ochiq kodli SFU'lardan E2EE qo'llab-quvvatlaydiganlari). MediaMTX'ni almashtirish yoki unda shu rejimni isbotlash kerak.
- **Kalitlar** (o'zimiz protokol yaratmaymiz; standart konstruksiyalar: WebCrypto ECDH/ECDSA, HKDF, AES-GCM; guruh kaliti uchun MLS kabi standart):
  - har tomoshabin qurilmasida eksport qilinmaydigan kalit juftligi;
  - a'zolik ro'yxatini **administrator qurilmasidagi** imzo kaliti imzolaydi; server ro'yxatni o'zgartira olmaydi (imzo tekshiruvi), soxta public key qo'sha olmaydi;
  - media kaliti davrlarga (epoch) bo'linadi; revoke'da yangi davr, yangi kalit faqat qolgan a'zolarga; yangi tomoshabinga eski davr kalitlari berilmaydi;
  - kalitlar URL, log, analytics yoki Git'ga tushmaydi; yo'qolganda — qurilma qayta tasdiqlanadi (avtomatik tiklash yo'q);
  - admin ko'rishi uchun admin qurilmasi ham oddiy recipient sifatida kalit oladi: **boshqarish huquqi ≠ ko'rish huquqi**.
- **Saqlangan media** (matn/rasm/video, thumbnail) bu sxemaga kirmaydi: ular hozir serverda ochiq saqlanadi va shunday qoladi, agar alohida mijoz tomonida shifrlash qo'shilmasa.

### 6.3 Isbot talablari (amalga oshirilganda)

- Media-server jarayonida va diskda media kaliti yo'qligi: kod tahlili + xotira/disk qidiruvi.
- Packet capture: SFU'dan chiqqan RTP yuki shifrlangan — **yagona isbot sifatida ishlatilmaydi**.
- Revoke'dan keyin eski recipient keyingi davr kadrlarini ocha olmasligi — avtomatik test.
- Server a'zolik ro'yxatini o'zgartirganda mijoz buni aniqlashi — avtomatik test.
- Mustaqil kriptografik audit.

## 7. Raqiblar bo'yicha tahlil

| Raqib | Nima qila oladi | Nima qila olmaydi | Izoh |
|---|---|---|---|
| Passiv tarmoq kuzatuvchisi | Metadata (IP, port, vaqt, hajm) ko'radi; oddiy RTMP bo'lsa pult videosi va kalitini | HTTPS va DTLS-SRTP mazmunini o'qiy olmaydi | Pult segmentini VPN/RTMPS bilan yoping |
| Faol MITM | O'z-o'zidan imzolangan sertifikatni foydalanuvchi qabul qilsa — hammasini; oddiy RTMP'ni o'zgartirish | Ishonchli sertifikat bilan HTTPS'ni buzolmaydi | Faqat ishonchli TLS; pult RTMPS'da sertifikatni tekshirishi tasdiqlanmagan |
| Hosting / server root | Videoni (MediaMTX xotirasi), yuklangan media, bazani, master kalitni — **hammasini** | — | Joriy arxitekturada to'liq ishonchli tomon. E2EE yo'q |
| Zararli/buzilgan signalizatsiya serveri | Bu tizimda signalizatsiya = DronStream serveri: root bilan bir xil | — | Alohida ishonchli signalizatsiya yo'q |
| Brauzerga JS yetkazuvchi server | Istalgan kodni ishga tushirish, sessiyani o'g'irlash | — | E2EE bo'lganda ham shu sababli frontend boshqa ishonchli manbadan kelishi kerak (6.1-3) |
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
| Minimal ochiq portlar | Sukut: HTTPS va WebRTC UDP; RTMP o'chiq |
| Alohida xizmat hisobi, minimal huquqlar | Linux: `dronstream` hisobi, systemd cheklovlari (CI'da tekshirilgan); Windows: hujjatda |
| Sirlarni niqoblash | Log niqoblagich (unit test) |
| Auth/revoke fail-closed | Hook, reconciler, watchdog, Job Object / Pdeathsig (testlar) |
| Telemetriya yo'q | Kod; chiquvchi ulanishlar inventarizatsiyasi (2-bo'lim) |
| Xavfsiz backup/restore | Shifrlangan; restore'dan keyin standby; TOTP va ruxsatlar saqlanadi (CI) |

## 10. Ochiq savollar va keyingi qadamlar

1. Haqiqiy DJI pultida RTMPS va sertifikat tekshiruvi (4-bo'lim tartibi).
2. E2EE: gateway yoki SDK publisher + E2EE SFU + ishonchli frontend tarqatish — alohida loyiha, real qurilma va mustaqil audit bilan.
3. Passkey (WebAuthn) administratorlar uchun.
4. Mustaqil xavfsizlik auditi. **Bu loyihadagi testlarni AI yozgan; ularning o'tishi mustaqil audit emas.**
