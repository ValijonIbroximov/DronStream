# DronStream — xavfsizlik qabul testlari (v1.3.0)

Har bir talab yonida **dalil turi** ko'rsatilgan. Turlar aralashtirilmaydi:

| Belgi | Ma'nosi |
|---|---|
| **K** | Kod testi (Go unit / web test), shu kompyuterda |
| **I** | Integratsiya testi: haqiqiy `dronstream` + MediaMTX v1.21.3 + WebRTC (pion) + FFmpeg RTMP, loopback'da (Windows lokal va Ubuntu CI) |
| **CI** | GitHub Actions'da haqiqiy Ubuntu 24.04 (systemd) yoki Windows virtual mashinasi |
| **S** | Simulyatsiya (masalan `-Offline`, soatni surish) |
| **Q** | Haqiqiy qurilma / tarmoq sinovi — **hali bajarilmagan** joylar shu belgi bilan |
| **A** | Mustaqil xavfsizlik auditi — **bajarilmagan** |

Muhim: barcha avtomatik testlarni AI yozgan. Ularning o'tishi kod kutilgan xatti-harakatni ko'rsatishini bildiradi, **mustaqil audit o'rnini bosmaydi**.

Natijalar va sanalar: [TEST_REPORT.md](TEST_REPORT.md) (v1.3 bo'limi). Model: [SECURITY_MODEL.md](SECURITY_MODEL.md).

## 1. Kirish va havolalar

| # | Talab | Test | Tur |
|---|---|---|---|
| 1.1 | Nusxalangan havola yangi brauzerda video ochmaydi | `TestLinksAndMedia`: `copied_link_other_browser_no_access` (bir brauzer tasdiqlangach ham ikkinchi brauzerdagi nusxa hech narsa ko'rmaydi); `link_alone_grants_nothing` (chipta 403, fayl 403, kutubxona bo'sh) | I, CI |
| 1.2 | GET / preview / QR / "Kirish" huquq bermaydi | `link_preview_get_qr_no_consume`; "Kirish" faqat `pending` sessiya (`TestOneTimeLinkRequestsAndSingleApproval`) | K, I |
| 1.3 | Tasdiq aniq sessiyaga va tekshirish kodiga bog'langan | Noto'g'ri kod → `verify_code_mismatch` (unit va HTTP); bo'sh kod bilan tasdiq yo'q | K, I |
| 1.4 | Bir martalik/N martalik limitlar admin tasdig'ida, parallel holatda oshmaydi | Bir martalik: 2 parallel tasdiqdan 1 g'olib; N=3: 5 so'rov, parallel tasdiqdan 3 tasi | K, I |
| 1.5 | Begona "Kirish" bosib bir martalik havolani yeb qo'ya olmaydi | Foydalanish faqat tasdiqda sanaladi; kutayotgan so'rovlar ≤ 5 | K, I |
| 1.6 | Admin tasdiqlamagan mehmon media/kalit olmaydi | `guest_pending` rad (v1.0 dan beri, `TestAcceptance`) | I |
| 1.7 | Ruxsatsiz user boshqa streamga kira olmaydi | `TestAcceptance` (chipta 403, soxta chipta, boshqa sessiyaning chiptasi) | I |
| 1.8 | Eski token / replay | Chipta qayta ishlatish rad, boshqa brauzerdan chipta rad, so'rovni qayta yuborish ikki marta sanalmaydi, restore'dan keyin eski cookie 401 | K, I |
| 1.9 | Publish kaliti playback huquqi bermaydi | `publish_key_no_playback` | I |
| 1.10 | Eski avtomatik sessiyalar yangi siyosatga o'tadi | `TestMigrationFromV2`: 1.1.0 da ochiq havola sessiyasi yangilangach `pending`, kutubxona bo'sh; tasdiqlangach ochiladi | I (Windows lokal) |
| 1.11 | IP/user-agent shaxs dalili sifatida ishlatilmaydi | Kod: tasdiq faqat sessiya + kod; UI'da "shaxsni tasdiqlamaydi" | K (kod ko'rigi) |

## 2. Administrator autentifikatsiyasi

| # | Talab | Test | Tur |
|---|---|---|---|
| 2.1 | TOTP to'g'ri (RFC 4226/6238 vektorlari), qayta ishlatish rad | `TestHOTPAndTOTPVectors`, `TestVerifyTOTPWindowAndReplay` | K |
| 2.2 | Parolning o'zi yetmaydi; tiklash kodi bir marta | `TestTOTPLoginRecoveryAndReauth`; HTTP: `TestSecureModeAdminMFAGateAndSensitiveActions` | K |
| 2.3 | secure rejimda TOTP'siz admin faqat TOTP yoqadi | Web test; Ubuntu'da systemd ostida haqiqiy TOTP bilan (`linux-package-test.sh`) | K, CI |
| 2.4 | Muhim amallar qayta tasdiqlashsiz rad | `TestSensitiveActionsNeedReauth` (soat surilgan) | K, S |
| 2.5 | TOTP siri bazada ochiq emas | Unit: shifrlangan saqlanadi | K |
| 2.6 | Passkey (WebAuthn) | Amalga oshirilmagan | — |

## 3. Ingest (pult → server)

| # | Talab | Test | Tur |
|---|---|---|---|
| 3.1 | secure rejimda ochiq interfeysdagi shifrlanmagan RTMP rad | `TestSecureModeConfigRefusesPublicPlainRTMP`; Ubuntu'da `rtmp_listen ":1935"` bilan xizmat ishga tushmaydi va sababini jurnalga yozadi | K, CI |
| 3.2 | Sukut bo'yicha oddiy RTMP o'chiq | CI: paket sozlamasi bilan 1935 tinglanmaydi | CI |
| 3.3 | RTMPS → RTMP avtomatik fallback yo'q | Kod: `rtmp_listen` bo'sh + RTMPS = `rtmpEncryption: strict` | K (kod ko'rigi) |
| 3.4 | Noto'g'ri kalit, boshqa stream yo'li, takroriy publisher rad | `TestAcceptance` | I |
| 3.5 | Oddiy RTMP haqiqatan ochiq ekanini ko'rsatish (xavf dalili) | `pcap-check.py`: RTMP publish buyrug'i va kalit ochiq ushlanadi | CI |
| 3.6 | DJI Pilot 2 RTMPS, ishonchsiz/nomi mos emas/muddati o'tgan sertifikat rad etilishi | Tartib SECURITY_MODEL.md 4-bo'limda | **Q — bajarilmagan** |

## 4. Shifrlash va tarmoq

| # | Talab | Test | Tur |
|---|---|---|---|
| 4.1 | Packet capture'da WebRTC'da ochiq H.264 yo'q | `pcap-check.py`: demo oqimning SPS baytlari va x264 SEI matni UDP paketlarida uchramasligi | CI |
| 4.2 | Noto'g'ri sertifikat / MITM | Brauzer tomoni (o'z-o'zidan imzolangan sertifikat ogohlantirishi); xavfsizlik holati paneli "zaif" | **Q — haqiqiy MITM sinovi bajarilmagan** |
| 4.3 | Ichki API'lar faqat loopback | `config.Validate` (aks holda ishga tushmaydi) | K |
| 4.4 | Tashqi ulanishlar inventarizatsiyasi | Kod qidiruvi; tartib SECURITY_MODEL.md 2-bo'limda | K (kod ko'rigi), **Q — server'da bajarilmagan** |

Packet capture yagona xavfsizlik isboti sifatida ishlatilmaydi: u faqat bitta yo'lda shifrlash borligini ko'rsatadi.

## 5. Revoke va fail-closed

| # | Talab | Test | Tur |
|---|---|---|---|
| 5.1 | Revoke barcha tegishli sessiyalarni uzadi | `TestAcceptance` (o'lchangan vaqtlar), havola revoke jonli videoni va yuklashni uzadi | I |
| 5.2 | Backend o'lsa MediaMTX ham o'ladi | Windows: Job Object (`TestAcceptance`); Linux: `PR_SET_PDEATHSIG` (CI, `kill -9`) | I, CI |
| 5.3 | E2EE kalit davri: revoke'dan keyin eski recipient keyingi davrni ocholmaydi | E2EE yo'q | **Mavjud emas** |
| 5.4 | Media-server ciphertext bilan ishlaydi, unda media kaliti yo'q | Joriy arxitekturada **noto'g'ri**: MediaMTX videoni ochiq ko'radi | **Mavjud emas** |
| 5.5 | Server ruxsatsiz membership/key almashtirsa aniqlanadi | E2EE yo'q | **Mavjud emas** |

## 6. Backup, restore, restart

| # | Talab | Test | Tur |
|---|---|---|---|
| 6.1 | Backup shifrlangan, noto'g'ri parol rad | `install-roundtrip.ps1`, CI | I, CI |
| 6.2 | Restore'dan keyin ruxsatlar susaymaydi | Standby; eski sessiyalar 401; ishlatilgan havola qayta ochilmaydi; TOTP talab qilinishi saqlanadi (CI) | I, CI |
| 6.3 | Windows → Linux ko'chirish | `restore-windows-backup.sh` | CI |
| 6.4 | Restart'dan keyin | systemd qayta ishga tushirishi (CI); server qayta yuklanishi | CI, **Q — haqiqiy reboot bajarilmagan** |

## 7. Qolgan ishlar (aniq)

1. **Q**: DJI pulti bilan RTMPS va sertifikat tekshiruvi (3.6).
2. **Q**: Haqiqiy tarmoqda MITM sinovi (4.2) va serverda chiquvchi ulanishlar inventarizatsiyasi (4.4).
3. **E2EE** (5.3–5.5): mavjud qurilmalar bilan mumkin emas; SECURITY_MODEL.md 6-bo'lim.
4. **A**: mustaqil xavfsizlik auditi.
