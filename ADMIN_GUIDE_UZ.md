# Administrator qo'llanmasi

## 1. Birinchi kirish
1. Server ishga tushgach `https://<server>:8443` ni oching.
2. "Birinchi administratorni yaratish" oynasida bir martalik kodni kiriting (`<ROOT>\data\runtime\setup-token.txt` yoki konsol). Kod faqat bir marta ishlaydi. Standart `admin/admin` yo'q.
3. Parol kamida 10 belgi. Parolni unutsangiz — server kompyuterida: `dronstream.exe reset-admin --root C:\DronStream --username <login>` (vaqtinchalik parol beradi, birinchi kirishda almashtiriladi).

## 2. Menyu
| Bo'lim | Nima uchun |
|---|---|
| Bosh sahifa | Efirdagi manbalar, video ulanishlar, online sessiyalar, kutilayotgan so'rovlar, tizim holati, **favqulodda to'xtatish** |
| Streamlar | Pult qo'shish/tahrirlash, URL va kalit, kalitni almashtirish/bekor qilish, tomoshani yopish, publishni taqiqlash, manbani uzish, statistika |
| Kirish so'rovlari | Mehmon so'rovlari: kutilayotgan / tasdiqlangan / rad etilgan / yakunlangan |
| Foydalanuvchilar va ruxsatlar | Hisoblar, bloklash, parolni tiklash, hamma joydan chiqarish, ruxsatlar (muddat bilan) |
| Faol tomoshabinlar | Videoga ulanishlar, sessiyalar (saytda online), IP/brauzer, uzish/yakunlash |
| Audit | Barcha muhim hodisalar |
| Tarmoq va tizim | Joriy tarmoq/TLS sozlamalari, mehmon sozlamalari, backup, server holati (ko'chirish), parolingiz |
| ▶ Tomosha qilish | Admin sifatida videolarni ko'rish (admin barcha streamlarni ko'radi) |

## 3. Pult (stream) qo'shish
1. Streamlar → **+ Yangi stream** → nom va yo'l nomi (`mavic1`).
2. URL turi: odatda `?key=` (query). Agar pult ilovasi URL dagi `?` ni qabul qilmasa — "kalit yo'lda" turini tanlang.
3. Saqlangach oynada **pult URL va kalit** chiqadi. Uni pultga kiriting (DJI_SETUP_UZ.md). Bu ma'lumot faqat adminga ko'rinadi; har ko'rish auditga yoziladi.
4. Kalit faqat **shu streamga** publish qilish uchun. U video ko'rish huquqini bermaydi.

### Kalitni almashtirish / bekor qilish
- **Kalitni almashtirish** — yangi kalit, eskisi darhol ishlamaydi, joriy ulangan pult uziladi. Pultga yangi URL ni kiriting.
- **Kalitni bekor qilish** — kalit yo'q; yangi kalit yaratilmaguncha hech qanday pult ulana olmaydi.

### Ikki xil "to'xtatish"
- **Tomoshani yopish** — barcha tomoshabinlar uziladi, yangi ulanishlar rad etiladi. Pult yuborishda davom etadi.
- **Publishni taqiqlash** — pultning video yuborishi rad etiladi (joriy manba uziladi). Tomoshabinlar ruxsati o'zgarmaydi, lekin video bo'lmaydi.

### Parallel publish siyosati
Bir stream yo'liga bir vaqtda faqat **bitta** manba. Birinchi ulangan manba ushlab turadi, ikkinchisi rad etiladi va audit + ogohlantirish chiqadi ("ikkinchi manba ulanmoqchi bo'ldi"). Yashirin manba almashtirish mumkin emas. Agar pult tarmoq uzilishidan keyin qayta ulanayotgan bo'lsa va eski ulanish hali yopilmagan bo'lsa, u ~10 s ichida ulana oladi; darhol bo'shatish uchun **Manbani uzish**.

### Statistika
Holat, manba turi va IP, kodek/o'lcham, kiruvchi va chiquvchi bitrate, xatoli kadrlar — MediaMTX dan har 1 s olinadigan **haqiqiy** qiymatlar. DEMO manbalar statistikasi test oqimiga tegishli.

## 4. Foydalanuvchilar
- **+ Foydalanuvchi**: login, ism, vaqtinchalik parol, rol. Foydalanuvchi birinchi kirishda parolni almashtiradi.
- **Bloklash** — barcha sessiyalar va videolar darhol uziladi, kirish rad etiladi.
- **Hamma joydan chiqarish** — barcha qurilmalardagi sessiyalar tugaydi (hisob bloklanmaydi).
- **Parolni tiklash** — yangi vaqtinchalik parol; barcha sessiyalar tugaydi.
- Standart holatda **hech kimda ruxsat yo'q**.

## 5. Ruxsatlar
- **Ruxsat berish**: bir yoki bir nechta stream, muddat (cheksiz / 30 daqiqa … 7 kun).
- Chipdagi **✕** — bitta stream ruxsatini olib tashlash. Avval bazaga yoziladi, so'ng serverda ochiq videolar uziladi (o'lchangan: ~0–20 ms ichida, TEST_REPORT.md). Qayta ulanish va eski chipta rad etiladi.
- Muddat tugashi bilan ochiq video ham server tomonidan uziladi.

## 6. Mehmonlar
1. Mehmon "Mehmon sifatida kirish" da ism va "Kimligingiz / kirish sababi" ni yozadi. U hech qanday video, rasm, stream ro'yxati ko'rmaydi — faqat "tasdiq kutilmoqda".
2. Admin panelda real vaqtda xabar chiqadi; chap pastdagi **"Yangi so'rovda tovush"** ni yoqsangiz qisqa signal ham chalinadi (brauzer avval sahifa bilan bir marta o'zaro ta'sirni talab qilishi mumkin).
3. **Tasdiqlash…** → streamlar va muddat → tasdiqlash. Yoki **Rad etish** (sabab mehmonga ko'rinadi).
4. **Sessiyani yakunlash** — mehmon videolari darhol uziladi, sessiya tugaydi.
5. Ism — mehmon o'zi yozgan matn, **tasdiqlangan shaxs emas**. Interfeysda doim "Mehmon" belgisi bilan ko'rsatiladi. IP manzil shaxsni tasdiqlamaydi.
6. Mehmon boshqa brauzer yoki qurilmadan kirsa — yangi so'rov va yangi tasdiq kerak.

## 7. Faol tomoshabinlar
- **Videoga ulanishlar** — server hozir video yuborayotgan sessiyalar: kim, qaysi stream, qaysi tab, ulangan vaqt, oxirgi faollik, ijara tugashi, uzatilgan hajm, ICE manzil. **Uzish** — faqat shu ulanishni uzadi (ruxsat saqlanadi; butunlay to'xtatish uchun ruxsatni oling).
- **Sessiyalar** — login/mehmon sessiyalari: "saytda online" (sahifa ochiq), ochiq tablar soni, video ulanishlar soni, IP/brauzer. **Yakunlash** — sessiyani va uning videolarini tugatadi.
- "Saytda online" ≠ "videoga ulangan" ≠ "inson tomosha qilyapti". Hech biri tomosha isboti emas.

## 8. Favqulodda to'xtatish
Bosh sahifa → **BARCHA TOMOSHANI TO'XTATISH**. Barcha video ulanishlar uziladi, yangi chiptalar rad etiladi; pultlardan qabul qilish davom etadi. Qayta ochish — o'sha joyda.

## 9. Audit
Kirish/chiqish, xato kirishlar, mehmon so'rovlari va qarorlari, ruxsat o'zgarishlari, ko'rishga ulanish/uzilish/rad, pult ulanishi/rad/uzilishi, kalit ko'rish/almashtirish/bekor qilish, bloklash, favqulodda to'xtatish, backup. Saqlash muddati: `security.audit_retention_days` (default 180 kun), so'ng har soatlik tozalashda o'chiriladi. Sirlar auditga yozilmaydi.

## 10. Holatlar va tomoshabinga ko'rinadigan xabarlar
| Holat | Tomoshabin ko'radi |
|---|---|
| Ruxsat olib tashlandi | "Ruxsat bekor qilindi" |
| Muddat tugadi | "Ruxsat muddati tugadi" |
| Admin ulanishni uzdi | "Administrator uzdi" |
| Bloklash / sessiya yakunlash | kirish sahifasi + sabab |
| Stream yopildi | "Stream yopildi" |
| Favqulodda | "Favqulodda to'xtatildi" |
| Pult efirda emas | "Manba efirda emas… kutilmoqda" (avtomatik qayta urinadi) |
| Tarmoq uzildi | "Ulanish uzildi — qayta ulanmoqda" |

Brauzerda allaqachon ko'rsatilgan kadrlarni qaytarib olib bo'lmaydi. Watermark (ism + vaqt) ekran yozib olishni to'xtatmaydi.

## 11. Kundalik ishlar
- Holat: `scripts\status.ps1`. Loglar: `<ROOT>\logs\dronstream.log`, `mediamtx.log` (sirlar niqoblangan).
- Backup: Tarmoq va tizim → Backup, yoki `scripts\backup.ps1`. Backup faylini **boshqa joyda** saqlang.
- Yangilash: BACKUP_RESTORE_UZ.md → "Yangilash va rollback".

## 12. v1.1: yangi menyu
Bosh sahifa · **Kontent** · **To'plamlar** · **Doimiy foydalanuvchilar** · **Maxsus havolalar** · Kirish so'rovlari · Faol sessiyalar · Audit va sozlamalar. Vaqtlar **Toshkent vaqtida (UTC+5)** ko'rsatiladi va kiritiladi (bazada UTC).

### Kontent
- Jonli dronlar, matn, rasm, video. Qidiruv, tur filtri, bir nechtasini belgilab **Bir xil sarlavha berish**, **Yashirish/Faol qilish**, ▲▼ tartib. Sarlavha maydonidan chiqqanda saqlanadi: "● saqlanmagan o'zgarish" → "Saqlanmoqda…" → "✓ Saqlandi".
- Dron streami sarlavhasi tomoshabin uchun; texnik yo'l (`live/<nom>`) va pult kaliti o'zgarmaydi ("Dron pultlari (texnik)" tabida).
- **+ Matn**, **+ Rasm** (PNG/JPEG/GIF/WebP), **+ Video** (MP4 H.264/AV1/VP9, WebM). H.265, SVG, HTML rad etiladi — sababi yoziladi.

### To'plamlar
- Umumiy sarlavha + elementlar (har biriga ixtiyoriy alohida sarlavha), tartib, ommaviy element sarlavhasi. Yashirin to'plam orqali dinamik ruxsat ishlamaydi.

### Ruxsat berish / Havola yaratish (3 bosqich)
1. **Kimga va qanday:** maxsus havola (bir martalik / bir necha martalik / vaqtinchalik) yoki doimiy foydalanuvchi(lar).
2. **Nimaga:** kontent va to'plamlar (qidiruv, filtr, shablondan nusxa). To'plam uchun aniq tanlov: **faqat hozirgi elementlar** yoki **dinamik**.
3. **Cheklovlar:** sessiya davomiyligi (majburiy), foydalanish soni, parallel sessiyalar, boshlanish/tugash.
4. Tasdiq — xulosa → **Yaratish va ulashish** (havola) yoki **Qo'llash** (doimiy foydalanuvchi; so'ng umumiy kirish havolasi/QR).

### Maxsus havolalar
- Karta: nomi, turi, resurslar, amal qilish vaqti, foydalanish (sarflangan/limit/qolgan), faol sessiyalar, holat (**Faol, Kutilmoqda, Tugagan, Limit tugagan, Bekor qilingan**). Filtr va qidiruv.
- **Ulashish / QR:** havolani nusxalash, QR (sarlavha va muddat bilan), QR rasmni clipboard'ga, PNG yuklab olish, tizim ulashish oynasi. Brauzer qo'llamasa xabar chiqadi — PNG'ni yuklab oling. QR bizning serverda yaratiladi; PNG nomida token yo'q.
- **Tashqi manzil** (Audit va sozlamalar → Sozlamalar): masalan `https://stream.example.uz:8443`. Sozlanmagan yoki localhost bo'lsa havola/QR berilmaydi va sabab ko'rsatiladi.
- **Sessiyalar** (har bir brauzer alohida, alohida "Uzish"), **Nimani ko'radi?** (sarflamaydi), **Cheklovlar**, **Shablon sifatida**, **Havolani yangilash** (eski havola/QR ishlamaydi), **Bekor qilish** (faol sessiya bo'lsa `BEKOR` deb yozib tasdiqlanadi).

### Doimiy foydalanuvchilar
- "Umumiy kirish havolasi / QR" — hamma uchun bitta manzil (login-parol bilan). Ruxsat chiplari (✕), **Nimani ko'radi?**, bloklash, hamma joydan chiqarish, parolni tiklash.
