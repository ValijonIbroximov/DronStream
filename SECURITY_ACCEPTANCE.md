# DronStream — xavfsizlik qabul testlari (v1.3.0)

> **Bu sinov relizi.** Quyidagi testlar kirish nazorati va shifrlanmagan ingest siyosatini tekshiradi. Ular uchta hal qilinmagan masalani **yopmaydi**: server videoni ochiq ko'radi; haqiqiy pultda RTMPS va sertifikat tekshiruvi tasdiqlanmagan; E2EE mahsulotda yo'q. TOTP, administrator tasdig'i yoki CI muvaffaqiyati bu masalalar hal bo'ldi degani emas.

Har bir talab yonida **dalil turi** ko'rsatilgan. Turlar aralashtirilmaydi:

| Belgi | Ma'nosi |
|---|---|
| **K** | Kod testi (Go unit / web test), shu kompyuterda (Windows 11) |
| **I** | Integratsiya testi: haqiqiy `dronstream` + MediaMTX v1.21.3 + WebRTC (pion) + FFmpeg RTMP, loopback'da (Windows lokal va Ubuntu CI) |
| **CI** | GitHub Actions'da haqiqiy Ubuntu 24.04 (systemd) yoki Windows virtual mashinasi |
| **B** | Brauzerda qo'lda: Chromium 156 asosidagi ichki brauzer, lokal sinov serveri (alohida papka, baza va portlar), har bir "tomoshabin" alohida cookie omborida |
| **S** | Simulyatsiya (masalan soatni surish) |
| **Q** | Haqiqiy qurilma / tarmoq sinovi — **hali bajarilmagan** joylar shu belgi bilan |
| **A** | Mustaqil xavfsizlik auditi — **bajarilmagan** |

Muhim: barcha avtomatik testlarni va brauzer sinovlarini AI yozgan va o'tkazgan. Ularning o'tishi kod kutilgan xatti-harakatni ko'rsatishini bildiradi, **mustaqil audit o'rnini bosmaydi**.

Natijalar, sanalar, muhit va tekshirilgan commitlar: [TEST_REPORT.md](TEST_REPORT.md) (v1.3 bo'limi). Model: [SECURITY_MODEL.md](SECURITY_MODEL.md).

## 1. Kirish va havolalar

| # | Talab | Test | Tur |
|---|---|---|---|
| 1.1 | Nusxalangan havola yangi brauzerda video ochmaydi | `TestLinksAndMedia`: `copied_link_other_browser_no_access`, `link_alone_grants_nothing` (chipta 403, fayl 403, kutubxona bo'sh). Brauzerda: ikkinchi cookie omborida yangi so'rov, boshqa kod, kutubxona bo'sh, chipta 403 | I, CI, B |
| 1.2 | GET / preview / QR / "Kirish" huquq bermaydi | `link_preview_get_qr_no_consume`; "Kirish" faqat `pending` sessiya (`TestOneTimeLinkRequestsAndSingleApproval`) | K, I |
| 1.3 | Tasdiq aniq sessiyaga va tekshirish kodiga bog'langan | Noto'g'ri kod → `verify_code_mismatch` (unit va HTTP); bo'sh kod bilan tasdiq yo'q. Brauzerda: noto'g'ri kod va **boshqa sessiyaning kodi** rad etildi, tomoshabin `pending` qoldi | K, I, B |
| 1.4 | Bir martalik/N martalik limitlar admin tasdig'ida, parallel holatda oshmaydi | Bir martalik: 2 parallel tasdiqdan 1 g'olib; N=3: 5 so'rov, parallel tasdiqdan 3 tasi | K, I |
| 1.5 | Begona "Kirish" bosib bir martalik havolani yeb qo'ya olmaydi | Foydalanish faqat tasdiqda sanaladi; kutayotgan so'rovlar ≤ 5 | K, I |
| 1.6 | Mehmon ham kod bilan tasdiqlanadi; kodsiz yoki noto'g'ri kod bilan tasdiq yo'q | `core_test.go` (bo'sh, noto'g'ri, qo'shimcha belgili kod → `verify_code_mismatch`, ruxsat paydo bo'lmaydi); `TestAcceptance`: `guest_wrong_code_refused`. Brauzerda: noto'g'ri kod rad, to'g'ri kod bilan sahifa o'zi ochildi | K, I, B |
| 1.7 | Tekshirish kodlari admin API'ga chiqmaydi | `TestAcceptance` (mehmonlar ro'yxatida kod yo'q), `links_media_test.go` `approve` (so'rovlar ro'yxatida kod yo'q). Brauzerda: admin kartasida kod ko'rinmaydi | I, B |
| 1.8 | Ruxsatsiz user boshqa streamga kira olmaydi | `TestAcceptance` (chipta 403, soxta chipta, boshqa sessiyaning chiptasi) | I |
| 1.9 | Eski token / replay | Chipta qayta ishlatish rad, boshqa brauzerdan chipta rad, so'rovni qayta yuborish ikki marta sanalmaydi, restore'dan keyin eski cookie 401 | K, I |
| 1.10 | Publish kaliti playback huquqi bermaydi | `publish_key_no_playback` | I |
| 1.11 | Eski avtomatik sessiyalar yangi siyosatga o'tadi | `TestMigrationFromV2` (haqiqiy 1.1.0 bazasi): eski havola sessiyasi `pending`, kutubxona bo'sh; tasdiqlangach ochiladi; foydalanish ikkinchi marta sanalmaydi; bir martalik havolaning o'z sessiyasi rad etilmaydi, begona brauzer esa `link_used_up`. `TestApprovalOfSessionCountedBeforeUpgrade`. Brauzerda: 1.2.0 → 1.3 bilan bir xil cookie | K, I, B |
| 1.12 | IP/user-agent shaxs dalili sifatida ishlatilmaydi | Kod: tasdiq faqat sessiya + kod; interfeysda "shaxsni tasdiqlamaydi" | K (kod ko'rigi) |
| 1.13 | Rad etish, chiqish, bloklash, muddat tugashi sessiyani yopadi | Brauzerda: rad etilgan sahifa "So'rovingiz rad etildi"; chiqishdan keyin 401; bloklangan foydalanuvchi chiqarildi va qayta kira olmadi (403); havola muddati tugagach sessiya yo'q, havola "muddati tugadi". Avtomatik: `TestAcceptance`, `TestTimedLinkWindow` | K, I, B |

## 2. Administrator autentifikatsiyasi

| # | Talab | Test | Tur |
|---|---|---|---|
| 2.1 | TOTP to'g'ri (RFC 4226/6238 vektorlari), qayta ishlatish rad | `TestHOTPAndTOTPVectors`, `TestVerifyTOTPWindowAndReplay`. Brauzerda: bir xil kod ikkinchi marta rad etildi | K, B |
| 2.2 | Parolning o'zi yetmaydi; tiklash kodi bir marta | `TestTOTPLoginRecoveryAndReauth`; `TestSecureModeAdminMFAGateAndSensitiveActions`. Brauzerda: parol → ikkinchi bosqich so'raldi; tiklash kodi bir marta ishladi, ikkinchi marta rad | K, B |
| 2.3 | secure rejimda TOTP'siz admin faqat TOTP yoqadi | Web test; Ubuntu'da systemd ostida haqiqiy TOTP bilan (`linux-package-test.sh`). Brauzerda: server secure rejimda qayta ishga tushgach ochiq turgan admin sahifasi o'zi TOTP yoqish ekraniga o'tdi | K, CI, B |
| 2.4 | Muhim amallar qayta tasdiqlashsiz rad | `TestSensitiveActionsNeedReauth` (soat surilgan). Brauzerda: 10 daqiqadan keyin "Qayta tasdiqlash" oynasi; noto'g'ri parol rad; to'g'ri parol bilan amal davom etdi | K, S, B |
| 2.5 | TOTP siri bazada ochiq emas | Unit: shifrlangan saqlanadi | K |
| 2.6 | Passkey (WebAuthn), qurilma kalitiga bog'lash | Amalga oshirilmagan | — |

## 3. Ingest (pult → server)

| # | Talab | Test | Tur |
|---|---|---|---|
| 3.1 | secure rejimda shifrlanmagan RTMP **hech qanday tarmoq manzilida** qabul qilinmaydi (xususiy IP ham) | `TestSecureModeRefusesPlainRTMPOnAnyNetwork` (18 manzil: xususiy, CGNAT, link-local, IPv6 ULA, ommaviy, barcha interfeyslar, host nomi → rad; bo'sh va loopback → qabul). Ubuntu'da systemd ostida `:1935`, `10.8.0.1:1935`, `192.168.1.10:1935`, `localhost:1935` bilan xizmat ishga tushmaydi va sababini jurnalga yozadi | K, CI |
| 3.2 | Loopback istisnosi haqiqatan faqat loopback | CI: `127.0.0.1:1935` bilan ishga tushadi, `ss` faqat `127.0.0.1:1935` ni ko'rsatadi, holat paneli `ingest_plain = ok`. Istisno — **server ichidagi ishonch chegarasi**: gateway'ning tashqi yo'li shifrlanganini dastur tekshirmaydi (SECURITY_MODEL.md 4.2) | CI |
| 3.3 | Sukut bo'yicha tarmoqdan ko'rinadigan tinglovchilar faqat shifrlangan xizmatlar | CI inventarizatsiyasi: tarmoqdan ko'rinadigan TCP — faqat HTTPS porti; MediaMTX UDP — faqat WebRTC porti; RTMP/RTSP/HLS/API/metrics portlari tarmoqqa ochiq emas | CI |
| 3.4 | Laboratoriya rejimi production'dan ajratilgan | `TestSecurityStatusIsHonestAboutIngestAndE2EE`: standard rejimda rejim va tarmoqdagi oddiy RTMP "buzilgan"; sessiya javobida `securityMode`. Brauzerda: har sahifada "Laboratoriya rejimi — production emas" | K, B |
| 3.5 | RTMPS → RTMP avtomatik fallback yo'q (server tomonda) | Kod: `rtmp_listen` bo'sh + RTMPS = `rtmpEncryption: strict` | K (kod ko'rigi) |
| 3.6 | Noto'g'ri kalit, boshqa stream yo'li, takroriy publisher rad | `TestAcceptance` | I |
| 3.7 | Oddiy RTMP haqiqatan ochiq ekanini ko'rsatish (xavf dalili) | `pcap-check.py`: RTMP'da pult kaliti ochiq ushlanadi | CI |
| 3.8 | DJI Pilot 2 RTMPS'ni qo'llashi; ishonchsiz / nomi mos emas / muddati o'tgan sertifikatni rad etishi; o'zi RTMP'ga o'tmasligi | Tartib: SECURITY_MODEL.md 4.5, DJI_SETUP_UZ.md 5-bo'lim | **Q — bajarilmagan** |
| 3.9 | Tunnel + serverdagi gateway sxemasi | Hujjatlashtirilgan, sinalmagan | **Q — bajarilmagan** |

## 4. Shifrlash va tarmoq

| # | Talab | Test | Tur |
|---|---|---|---|
| 4.1 | Packet capture'da WebRTC'da ochiq H.264 yo'q | `pcap-check.py`: demo oqimning SPS baytlari va x264 SEI matni UDP paketlarida uchramasligi | CI |
| 4.2 | Noto'g'ri sertifikat / MITM | Brauzer tomoni (o'z-o'zidan imzolangan sertifikat ogohlantirishi); holat paneli "zaif" | **Q — haqiqiy MITM sinovi bajarilmagan** |
| 4.3 | Ichki API'lar faqat loopback | `config.Validate` (aks holda ishga tushmaydi); CI inventarizatsiyasi (3.3) | K, CI |
| 4.4 | Tashqi (chiquvchi) ulanishlar inventarizatsiyasi | Kod qidiruvi; tartib SECURITY_MODEL.md 2-bo'limda | K (kod ko'rigi), **Q — serverda bajarilmagan** |

Packet capture yagona xavfsizlik isboti sifatida ishlatilmaydi: u faqat bitta yo'lda shifrlash borligini ko'rsatadi.

## 5. Revoke va fail-closed

| # | Talab | Test | Tur |
|---|---|---|---|
| 5.1 | Revoke barcha tegishli sessiyalarni uzadi | `TestAcceptance` (o'lchangan vaqtlar), havola revoke jonli videoni va yuklashni uzadi. Brauzerda: havola bekor qilingach video to'xtadi, sessiya yopildi (aniq kechikish brauzerda o'lchanmagan) | I, B |
| 5.2 | Backend o'lsa MediaMTX ham o'ladi | Windows: Job Object (`TestAcceptance`); Linux: `PR_SET_PDEATHSIG` (CI, `kill -9`) | I, CI |
| 5.3 | E2EE kalit davri: revoke'dan keyin eski recipient keyingi davrni ocholmaydi | Mahsulotda E2EE yo'q | **Mavjud emas** |
| 5.4 | Media-server ciphertext bilan ishlaydi, unda media kaliti yo'q | Joriy arxitekturada **noto'g'ri**: MediaMTX videoni ochiq ko'radi | **Mavjud emas** |
| 5.5 | Server ruxsatsiz membership/key almashtirsa aniqlanadi | Mahsulotda E2EE yo'q | **Mavjud emas** |

5.3–5.5 faqat alohida tajriba (`experiment/e2ee-poc` branch'i, `poc/e2ee/`) doirasida o'rganiladi. U mahsulotga va paketga kirmaydi; uning natijalari mahsulot xususiyati sifatida ko'rsatilmaydi.

## 6. Backup, restore, restart

| # | Talab | Test | Tur |
|---|---|---|---|
| 6.1 | Backup shifrlangan, noto'g'ri parol rad | `install-roundtrip.ps1`, CI | I, CI |
| 6.2 | Restore'dan keyin ruxsatlar susaymaydi | Standby; eski sessiyalar 401; ishlatilgan havola qayta ochilmaydi; TOTP talab qilinishi saqlanadi (CI) | I, CI |
| 6.3 | Windows → Linux ko'chirish | `restore-windows-backup.sh` | CI |
| 6.4 | Restart'dan keyin | systemd qayta ishga tushirishi (CI); server qayta yuklanishi | CI, **Q — haqiqiy reboot bajarilmagan** |

## 7. Qo'llanma (info.html) — xavfsizlikka oid tekshiruvlar

| # | Talab | Test | Tur |
|---|---|---|---|
| 7.1 | Qo'llanma tarmoqqa chiqmaydi | `guide/build.mjs` (tashqi resurs yoki tarmoq chaqiruvi bo'lsa yig'ilmaydi); `TestGuideIsSelfContainedAndSafe`; headless Chrome'da DNS o'chirilgan holda `file://` dan tashqari so'rov 0 | K, B (headless) |
| 7.2 | Mavjud bo'lmagan E2EE tayyor himoya sifatida ko'rsatilmaydi | Sahna "Reja — amalga oshirilmagan" deb belgilangan (punktir chiziq, alohida tugma); joriy yo'lda yashil "himoyalangan" tunnel yo'q; yakuniy sahnada E2EE "amalga oshirilmagan" ro'yxatida. Barcha screenshotlar ko'zdan kechirilgan | B (ko'rik) |
| 7.3 | Admin yordam sahifasi faqat administratorga, qat'iy CSP ostida | `TestAdminHelpAuthorization` | K |

## 8. Qolgan ishlar (aniq)

1. **Q**: haqiqiy pultda RTMPS va sertifikat tekshiruvi (3.8); gateway sxemasi (3.9).
2. **Q**: haqiqiy tarmoqda MITM sinovi (4.2); serverda chiquvchi ulanishlar inventarizatsiyasi (4.4); haqiqiy server va reboot (6.4).
3. **E2EE** (5.3–5.5): mahsulotda yo'q. Variantlar va shartlar — SECURITY_MODEL.md 6-bo'lim; tajriba — alohida branch.
4. Passkey va qurilma kalitiga bog'lash (2.6).
5. **A**: mustaqil xavfsizlik auditi.
