# DronStream — talablar

Manba: foydalanuvchining 2026-11-13 dagi topshirig'i. Har bir talab ID bilan; holati `PROGRESS.md` va `TEST_REPORT.md` da kuzatiladi.

## R1. Umumiy
- R1.1 DJI pultlaridan jonli videoni markaziy serverda qabul qilish, faqat admin ruxsat bergan foydalanuvchilarga ko'rsatish.
- R1.2 Windows'da ishlaydigan markaziy server; admin kompyuteri server bo'lishi mumkin. Server o'chsa translatsiya ishlamaydi (hujjatlashtiriladi).
- R1.3 Go backend, React + TypeScript frontend, SQLite, MediaMTX (versiya mahkamlangan).
- R1.4 Brauzerga HTTPS orqali interfeys, WebRTC orqali video. Docker majburiy emas. Frontend build backend bilan birga tarqatiladi.
- R1.5 O'z kodek yoki shifrlash protokolini yaratmaslik.

## R2. Pultlar va streamlar (admin)
- R2.1 Stream qo'shish, nomlash, tahrirlash.
- R2.2 Har bir manbaga alohida publish kaliti; almashtirish va bekor qilish.
- R2.3 Online/offline holat va haqiqiy texnik statistika (soxta ko'rsatkich yo'q).
- R2.4 Streamni barcha tomoshabinlar uchun yopish (tomosha taqiqi).
- R2.5 Alohida amal: manbaning video yuborishini taqiqlash (publish taqiqi). R2.4 va R2.5 — alohida amallar.
- R2.6 Pult URL va kaliti faqat adminga ko'rsatiladi. Publish kaliti ko'rish huquqini bermaydi.
- R2.7 Noto'g'ri kalit yoki boshqa stream yo'liga publish rad etiladi.
- R2.8 Parallel publish siyosati aniq; yashirin manba almashtirish yo'q.
- R2.9 Haqiqiy pult ulanmaguncha belgilangan test tasvirli demo manba; u "DEMO" deb belgilanadi.

## R3. Foydalanuvchi va guest
- R3.1 Rollar: admin, user, guest.
- R3.2 Login/parol; foydalanuvchini admin yaratadi, bloklaydi, parolini tiklaydi.
- R3.3 Birinchi ishga tushishda bir martalik admin yaratish; standart admin/admin yo'q.
- R3.4 Guest: ism + "Kimligingiz / kirish sababi"; alohida sessiya; "tasdiq kutilmoqda" holati.
- R3.5 Admin panelida real vaqtda yangi so'rov, ixtiyoriy tovushli bildirishnoma.
- R3.6 Admin streamlar va muddatni belgilab tasdiqlaydi yoki rad etadi.
- R3.7 Guest ismi tasdiqlangan shaxs emas — interfeysda "Mehmon" deb belgilanadi.
- R3.8 Boshqa brauzerda guest — yangi sessiya va yangi tasdiq.
- R3.9 Tasdiqlanmagan foydalanuvchiga video, thumbnail, stream URL, ichki ma'lumot berilmaydi; streamlar ro'yxati oshkor qilinmaydi.

## R4. Admin nazorati
- R4.1 Kutilayotgan/tasdiqlangan/rad etilgan so'rovlar.
- R4.2 Login qilgan foydalanuvchilar va guest sessiyalari; bir nechta qurilma/tab sessiyalari.
- R4.3 Qaysi foydalanuvchi qaysi streamga faol media ulanishda; ulangan va oxirgi faol vaqt; IP va brauzer (diagnostika, shaxsni tasdiqlamaydi).
- R4.4 "Saytda online" va "videoga ulangan" alohida; videoga ulanish tomosha isboti emas.
- R4.5 Ruxsat: (user|guest) × stream, ixtiyoriy tugash vaqti; default — ruxsat yo'q.
- R4.6 Amallar: bir/bir nechta streamga ruxsat; bitta ruxsatni olish; guest sessiyasini yakunlash; foydalanuvchini barcha sessiyalardan chiqarish; hisobni bloklash; barcha tomoshani favqulodda to'xtatish.
- R4.7 Bekor qilish avval bazaga yoziladi, so'ng media sessiyalar uziladi; qayta ulanish rad etiladi.

## R5. Media sessiyalari xavfsizligi
- R5.1 Har bir media ulanish web-sessiya, stream va media-server sessiya ID'siga bog'langan; bir IP dagi foydalanuvchilar aralashmaydi.
- R5.2 Playback ruxsati backendda tekshiriladi, qisqa muddatli, stream/sessiyaga bog'langan; doimiy ochiq URL yo'q.
- R5.3 Token muddati tugashi ochiq WebRTC sessiyani yopadi deb faraz qilinmaydi — server o'zi uzadi.
- R5.4 Backend Control API orqali haqiqiy ulanishni uzadi; token takroriy ishlatilishi va parallel ulanishlar nazorati.
- R5.5 Revoke ↔ ulanish ochilishi poyga holatlari testlanadi.
- R5.6 Revoke'dan media to'xtashigacha maqsad ≤ 3 s, amalda o'lchanadi.
- R5.7 Auth backend ishlamasa yangi ulanish rad; mavjudlari uchun qisqa ijara + alohida nazorat bilan cheklangan vaqtda uzish; kafolat va cheklovlar hujjatlashtiriladi.
- R5.8 MediaMTX API, diagnostika portlari va ishlatilmaydigan protokollar tashqariga ochilmaydi; HLS va boshqa yo'llar ruxsatni aylanib o'tmaydi.

## R6. Shifrlash va tarmoq
- R6.1 Pult → server va server → foydalanuvchi yo'llari alohida himoyalanadi.
- R6.2 HTTPS interfeys; WebRTC (DTLS-SRTP) media.
- R6.3 Mavic 3T / Pilot 2 da RTMPS va sertifikat tekshiruvini real qurilmada sinash yo'riqnomasi (kafolatsiz).
- R6.4 Faqat RTMP bo'lsa — VPN orqali; RTMP porti VPN interfeysi/ruxsatlangan manbalar bilan cheklanadi; VPN uzilsa trafik ochiq internetga chiqmaydi. *(v1.3 da R16.2 bilan qat'iylashtirildi: secure rejimda oddiy RTMP faqat 127.0.0.1 da; VPN interfeysiga bog'lash — faqat laboratoriya rejimida yoki serverdagi gateway orqali.)*
- R6.5 Mavjud OpenVPN bilan moslik; UDP varianti faqat server qo'llasa.
- R6.6 Public IP, NAT/CGNAT, firewall tushuntiriladi; o'zimiz boshqaradigan TURN, qisqa muddatli hisoblar; yashirin tashqi relay/cloud yo'q.
- R6.7 Bu E2E shifrlash emas (server videoni ko'radi) — shunday nomlanmaydi.
- R6.8 Paket yo'qolishi/jitter avtomatik bartaraf etiladi deb da'vo qilinmaydi.

## R7. Veb xavfsizligi
- R7.1 Argon2id parol xeshi. R7.2 Secure/HttpOnly/SameSite cookie. R7.3 CSRF himoyasi.
- R7.4 Login va guest so'roviga rate limit. R7.5 Guest xabari XSS'dan himoyalangan.
- R7.6 Barcha API'da server tomon avtorizatsiya. R7.7 Sir, token, kalitlar loglarda niqoblanadi.
- R7.8 Maxfiy kalit frontend build yoki Git'ga kirmaydi.
- R7.9 Audit: kirish, so'rov, tasdiq, rad, ruxsat o'zgarishi, ko'rishga ulanish, uzish, kalit almashtirish; saqlash muddati va tozalash.
- R7.10 Video yozib olish default o'chiq; tashqi analytics/telemetry yo'q.
- R7.11 Player ustida ism + vaqt watermark; ekran yozishni to'xtatadi deb da'vo qilinmaydi.

## R8. Interfeys
- R8.1 O'zbek lotin, sodda, qorong'i mavzu, kompyuter va telefon.
- R8.2 Admin: bosh sahifa, streamlar, kirish so'rovlari, foydalanuvchilar va ruxsatlar, faol tomoshabinlar, audit, tarmoq va tizim sozlamalari.
- R8.3 Tomoshabin: login/guest, kutish, ruxsat etilgan streamlar, 1 / 2×2 / 3×3, to'liq ekran; uzilish, qayta ulanish, ruxsat tugashi, admin chiqarib yuborishi — alohida holatlar.
- R8.4 Keraksiz videolarni fonda ulab qo'ymaslik; yukni hisobga olish.

## R9. O'rnatish va ko'chirish
- R9.1 Yakuniy foydalanuvchiga Go/Node kerak emas.
- R9.2 Build skripti; versiyalangan Windows paket; start/stop/status; ixtiyoriy Windows service skriptlari; sozlash yo'riqnomasi; backup/restore; yangilash va rollback.
- R9.3 Dastur, konfiguratsiya, baza, loglar alohida joyda.
- R9.4 Izchil SQLite backup (oddiy fayl nusxa emas).
- R9.5 Ko'chirish: foydalanuvchi/stream/ruxsat tiklanadi; sirli backup shifrlangan; yangi IP/domen/TLS/firewall/VPN/pult URL qadamlari; qurilmaga bog'langan sirlarni qayta bog'lash; eski server bilan bir vaqtda ishlash xavfi boshqariladi.

## R10. Qabul testlari
`TEST_REPORT.md` da avtomatik va qo'lda bajariladiganlar alohida. Yuklama: 4 stream × 5 tomoshabin (resurs yetganda), bitrate/CPU/RAM/tarmoq qayd etiladi.

## R11. Yakuniy topshiriladiganlar
Manba kod; Windows build/skript; README_UZ.md; ADMIN_GUIDE_UZ.md; DJI_SETUP_UZ.md; SECURITY.md; BACKUP_RESTORE_UZ.md; TEST_REPORT.md; config namunasi (sirlarsiz); toza kompyuterda o'rnatish yo'riqnomasi; tekshirilmaganlar ro'yxati.

## R12. v1.1 — foydalanuvchi turlari, maxsus havolalar, kontent (2026-11-13 topshirig'i)
- R12.1 Doimiy foydalanuvchi: umumiy kirish havolasi + shaxsiy login-parol; ruxsat hisobga bog'langan; blok/ruxsat o'zgarishi/barcha sessiyalarni yakunlash.
- R12.2 Maxsus havola turlari (admin uchun tayyor variantlar): bir martalik, N martalik (+ parallel sessiya chegarasi), vaqtinchalik (boshlanish–tugash, parallel chegara). Ichki model: foydalanish soni + vaqt + parallel chegara birlashadi. Sessiya davomiyligi majburiy (muddatsiz default yo'q).
- R12.3 Refresh, yangi tab, lease yangilanishi, media qayta ulanishi foydalanishni sarflamaydi; boshqa brauzer — yangi foydalanish.
- R12.4 GET/preview/QR ko'rish sarflamaydi; faqat "Tomosha qilish" (POST) atomar sarflaydi; qayta yuborilgan POST ikki marta sarflamaydi; token URL'dan olib tashlanadi; keyin server sessiyasi ishlaydi.
- R12.5 Token: kriptografik tasodifiy, xesh + alohida shifrlangan nusxa (kalit bazadan tashqarida); log/Referer/auditga tushmaydi; no-referrer, no-store, tashqi resurs yo'q; bekor qilish → barcha sessiya va media uziladi; "yangilash" eski tokenni bekor qiladi; oluvchi nomi tasdiqlangan shaxs emas; blok va favqulodda to'xtatish aylanib o'tilmaydi.
- R12.6 Vaqtlar bazada UTC, interfeysda Asia/Tashkent.
- R12.7 Guest so'rovi saqlanadi va alohida yoqiladi/o'chiriladi.
- R12.8 Kontent: jonli stream, matn, rasm, video — sarlavha, izoh, faol/yashirin, tartib, ruxsatlar; stream sarlavhasi texnik yo'lni almashtirmaydi. To'plamlar (umumiy va element sarlavhasi), ommaviy sarlavha. To'plam ruxsati: "faqat hozirgi elementlar" yoki "dinamik" — aniq tanlanadi.
- R12.9 Media: tur/hajm cheklovi, haqiqiy format tekshiruvi, HTML/SVG rad, public papkadan tarqatilmaydi, har so'rovda (thumbnail, Range) server ruxsati, revoke'da davom etayotgan yetkazish uziladi, UI yashiradi; olingan baytlarni qaytarib bo'lmasligi hujjatlashtiriladi. Brauzerga mos formatlar; transkodlash yo'q.
- R12.10 Backup/restore media va havola holatlarini o'z ichiga oladi.
- R12.11 Ulashish: nusxa, o'z ilovamizda QR, QR PNG clipboard, PNG yuklab olish, tizim ulashishi, fallback; PNG nomida token yo'q; public base URL (localhost emas).
- R12.12 Admin menyu: Bosh sahifa, Kontent, To'plamlar, Doimiy foydalanuvchilar, Maxsus havolalar, Kirish so'rovlari, Faol sessiyalar, Audit va sozlamalar; 3 bosqichli "Ruxsat berish / Havola yaratish"; qidiruv/filtr, ko'p tanlash, shablon, "Nimani ko'radi?" (sarflamaydi), holatlar, telefonga mos, xavfli ommaviy amallar himoyalangan, saqlash holati, "Qo'llash".

## R13. Ishga tushirish va Git skriptlari
- R13.1 `DronStreamStart.bat`, `DronStreamTayyorla.bat`, `push.bat`, `pull.bat` (ildizda), mantiq `scripts\*.ps1` da; yo'llar BAT joylashuvidan; bo'sh joy/Unicode papka; PS 5.1; ASCII matn; xatoda oyna yopilmaydi; sirlar logga yozilmaydi; parallel ishga tushish nazorati; administrator faqat zarur amal uchun.
- R13.2 Start: tekshiruv → sog'lom bo'lsa ikkinchi nusxa yo'q → bir martalik avtomatik tayyorlash → health → brauzer → birinchi sozlash. Band port, buzilgan baza, TLS — tashxis, "tuzatish" yo'q, begona jarayon to'xtatilmaydi.
- R13.3 Tayyorla: platforma, mahkamlangan vositalar `.tools` ga checksum bilan, lock fayllar, build, papkalar, sirsiz shablon, migratsiyadan oldin izchil nusxa, idempotent, readiness exit code, offline rejim.
- R13.4 pull: fast-forward-only, lokal o'zgarish/ajralgan tarixda to'xtash, kerak bo'lsa tayyorlash, server to'xtatilmaydi; yangi kompyuterda mustaqil clone.
- R13.5 push: identifikatsiya (faqat lokal), GCM, sir/ma'lumot tekshiruvi (tarix bilan), commit xabari (parametr ham), force yo'q, push xatosida commit saqlanadi, SHA mosligi va havola.

## R14. v1.2 — serverga tayyorlash, yordam, qo'llanma, Linux (2026-11-13 topshirig'i)
- R14.1 Ish holati `PROGRESS.md` da saqlanadi; checkpoint commitlar; `reset --hard`, `git clean`, force push ishlatilmaydi.
- R14.2 "Juda ko'p ulanish": sabab aniqlanadi va tuzatiladi (grid almashishi, ijara yangilanishi, offline joylar, tab yopilishi, poyga holati); chegara cheksiz oshirilmaydi; haqiqatan tugasa ishlatilgan/maksimal son va nima qilish ko'rsatiladi. Mobil playerda sarlavha, statistika va watermark ustma-ust tushmaydi.
- R14.3 Admin panelida "?" (Parol → Chiqish → ?): tooltip va aria-label "Yordam va qo'llanma", klaviatura, mobil o'lcham; to'liq qo'llanmani ochadi, yangi tabda ochish mumkin; faol streamlar qayta yuklanmaydi; endpoint serverda admin avtorizatsiyasi bilan himoyalangan.
- R14.4 Mustaqil `info.html`: `file://`, internetsiz, CSS/JS ichida, CDN/font/analytics/API/tracking yo'q, sir va operativ manzil yo'q, sozlamani o'qimaydi, buyruq bajarmaydi; nusxalash tugmasi va qo'lda belgilash fallback'i.
- R14.5 Admin yordam va `info.html` bitta manbadan build paytida hosil qilinadi.
- R14.6 3D scroll namoyish: pult, server, admin, tomoshabin; 6 bosqich; haqiqiy trafik deb ko'rsatilmaydi; CSS perspective/transform/SVG; matn va kod tekis; native scroll, mundarija, qidiruv, oldingi/keyingi, progress, animatsiyani o'chirish, oddiy rejim, chop etish; avto namoyish sukut bo'yicha o'chiq, foydalanuvchi aralashganda va tab yashirilganda pauza; `prefers-reduced-motion`.
- R14.7 Qo'llanma mazmuni: A dastur, B tarmoq, C Windows, D R570 (Windows va Linux alohida), E tashqi internet, F kundalik boshqaruv, G xatolar. OS aniqlanmasdan universal buyruq berilmaydi; iDRAC aralashtirilmaydi; RTMP shifrlangan deb ko'rsatilmaydi; RTMPS real qurilmada tasdiqlanmaguncha tayyor deb yozilmaydi.
- R14.8 Buyruq kartalari: qayerda, admin/root, nima qiladi, natija, xatoda, bekor qilish; diagnostika/sozlash/bekor qilish alohida; placeholder to'ldirilmasa xavfli amal bajarilmaydi; firewall'ni o'chirish, hamma portni ochish, `chmod 777`, boshqaruv API'sini ochish tavsiya etilmaydi; `curl -k` faqat diagnostika.
- R14.9 Windows/Linux mosligi: DPAPI, jarayon/xizmat, yo'llar, MediaMTX, backup, SQLite. Linux: alohida kod, xavfsiz sir saqlash, systemd, build/paket, Windows → Linux parolli backup ko'chirish; bitta distributiv (Ubuntu Server 26.04 / 24.04 LTS) rasmiy manbalar bilan asoslangan; cross-compile runtime testi deb yozilmaydi.
- R14.10 BAT/PS1 skriptlari yakunlangan; StrictMode keng doirada o'chirilmaydi.
- R14.11 Testlar amalda bajarilgan holda yoziladi; lokal test tashqi internet yoki haqiqiy R570 bilan tenglashtirilmaydi.
- R14.12 Yangi paket (oldingilar ustidan yozilmaydi), GitHub commit/push, masofadagi SHA tekshiruvi.

## R15. v1.3 — video maxfiyligi va 3D qo'llanma (2026-11-13 topshirig'i; avvalgi zid talablarni almashtiradi)
- R15.1 Video faqat ruxsatli admin va admin tasdiqlagan tomoshabinga. Kim hali ko'ra olishi ochiq yoziladi (SECURITY_MODEL.md).
- R15.2 Havola faqat taklif/so'rov; admin aniq sessiyani tasdiqlaydi; tekshirish kodi; nusxa boshqa brauzerga huquq bermaydi; IP/UA shaxs dalili emas; limitlar saqlanadi; eski havolalar migratsiya qilinadi.
- R15.3 Admin: TOTP, tiklash, muhim amallarda qayta tasdiqlash (passkey — keyingi bosqich).
- R15.4 Pult → server auditi; secure rejimda ochiq oddiy RTMP yo'q; RTMPS fallback yo'q; DJI RTMPS va sertifikat sinovi tartibi; tashqi ulanishlar inventarizatsiyasi.
- R15.5 E2EE imkoniyati tekshirildi: blokerlar va rejalashtirilgan arxitektura; amalga oshirilmagan narsa bajarilgandek ko'rsatilmaydi.
- R15.6 Saqlangan media, thumbnail, Range, backup, log, crash dump ishonch chegaralari.
- R15.7 SECURITY_ACCEPTANCE.md: dalil turlari ajratilgan (kod testi, integratsiya, CI, simulyatsiya, haqiqiy qurilma, mustaqil audit).
- R15.8 info.html: haqiqiy 3D (Three.js, offline bundle), 12 sahna scroll timeline, kamera o'tishlari, obyektga bog'langan label, "Batafsil", qidiruv, avto namoyish, 2D fallback, reduced-motion, print; dark blue tech uslubi; stilizatsiyalangan modellar shunday deb belgilanadi.

## R16. v1.3 davomi — 2026-11-14 topshirig'i
- R16.1 Xulosa halol bo'lsin: "video maxfiyligi tayyor" deyilmaydi. Hujjat va interfeysda: kirish nazorati kuchaytirilgan; server videoni ochiq ko'radi; pult RTMPS va sertifikat tekshiruvi tasdiqlanmagan; E2EE amalga oshirilmagan. "DJI bilan E2EE mumkin emas" degan umumiy da'vo ishlatilmaydi.
- R16.2 Secure rejim: shifrlanmagan har qanday tashqi ingest rad (xususiy IP ham); loopback/gateway istisnosining ishonch chegarasi hujjatlashtirilgan; laboratoriya rejimi production'dan aniq ajratilgan; himoya zaiflashtirilmaydi.
- R16.3 Pult → tomoshabin E2EE: rasmiy DJI hujjatlari asosida qurilma mosligi; A (pultdagi publisher), B (lokal gateway), C (RTMPS → server → WebRTC) solishtiruvi; C E2EE deb ko'rsatilmaydi; standartlar asosida alohida proof-of-concept; "ortiqcha dastursiz" talab bilan ziddiyat aniq yozilgan; noma'lum qurilma ma'lumotlari bitta ro'yxatda so'ralgan.
- R16.4 Brauzerda haqiqiy UI sinovlari: kutish sahifasi, kod bilan tasdiqlash/rad etish, noto'g'ri kod, nusxa havola, qayta tasdiqlash, TOTP va takroriy kod, tiklash kodi, chiqish/bloklash/revoke/muddat, migratsiyadan keyingi sessiyalar.
- R16.5 3D qo'llanma yakunlanadi; yangi xavfsizlik bo'limlari sahnalarga ulanadi; mavjud bo'lmagan E2EE tayyor himoya sifatida ko'rsatilmaydi; desktop va mobil screenshotlar.
- R16.6 Yakuniy commit uchun CI, test hisobotida aniq SHA, yangi paket va SHA256, paketning o'zida o'rnatish/yangilash/backup-restore/skript sinovlari.
