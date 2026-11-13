# DronStream

DJI pultlaridan kelayotgan jonli videoni markaziy Windows serverda qabul qilib, **faqat administrator ruxsat bergan** foydalanuvchi va mehmonlarga brauzerda (WebRTC) ko'rsatadigan dastur.

```
DJI pult --RTMP (VPN orqali) / RTMPS--> [ Windows server: DronStream + MediaMTX ] --HTTPS + WebRTC--> brauzerlar
```

> **Muhim.** Bu markaziy serverga ishonadigan tizim: server videoni ochiq ko'rinishda qabul qiladi va qayta uzatadi. Bu **end-to-end shifrlash emas**. Server kompyuteri o'chsa, uxlasa yoki tarmoqdan uzilsa — translatsiya ham to'xtaydi. Admin kompyuteri server bo'lishi mumkin, lekin u yoqiq va uyqu rejimiga o'tmaydigan bo'lishi kerak.

## Imkoniyatlar
- Admin: pult/streamlar, har biriga alohida publish kaliti (almashtirish, bekor qilish), online/offline va haqiqiy statistika, tomoshani yopish va publishni taqiqlash (alohida amallar), foydalanuvchilar, mehmon so'rovlari (real vaqt + ixtiyoriy tovush), ruxsatlar (user/guest × stream, muddat bilan), faol tomoshabinlar, audit, favqulodda to'xtatish, backup.
- Tomoshabin: login yoki "Mehmon sifatida kirish", tasdiqni kutish, ruxsat etilgan streamlar, 1 / 2×2 / 3×3, to'liq ekran, ism+vaqt watermark, uzilish sabablari (ruxsat bekor qilindi, muddati tugadi, admin uzdi, bloklandi, efirda emas…).
- Xavfsizlik: bir martalik qisqa muddatli ko'rish chiptalari, server tomonidan majburiy uzish (MediaMTX Control API), ijara (lease), fail-closed, Argon2id, CSRF, rate limit, CSP, sirlarni niqoblash. Batafsil: [SECURITY.md](SECURITY.md).
- Haqiqiy pult ulanmaguncha 2 ta **DEMO** manba (o'rnatilgan test tasviri; "haqiqiy pult emas" deb belgilangan).

## Hujjatlar
| Fayl | Mazmuni |
|---|---|
| [INSTALL_UZ.md](INSTALL_UZ.md) | Toza Windows kompyuterga o'rnatish |
| [ADMIN_GUIDE_UZ.md](ADMIN_GUIDE_UZ.md) | Administrator qo'llanmasi |
| [DJI_SETUP_UZ.md](DJI_SETUP_UZ.md) | Pult (Mavic 3T / DJI Pilot 2) va VPN sozlash, real qurilmada sinov yo'riqnomasi |
| [SECURITY.md](SECURITY.md) | Xavfsizlik modeli, kafolatlar va cheklovlar |
| [BACKUP_RESTORE_UZ.md](BACKUP_RESTORE_UZ.md) | Backup, tiklash, boshqa kompyuterga ko'chirish, yangilash/rollback |
| [TEST_REPORT.md](TEST_REPORT.md) | Nima sinaldi, natijalar, nima sinalmadi |
| [ARCHITECTURE.md](ARCHITECTURE.md), [REQUIREMENTS.md](REQUIREMENTS.md), [PROGRESS.md](PROGRESS.md) | Arxitektura, talablar, ish jurnali |

## Bir bosishda ishlatish (4 ta BAT fayl)
Loyiha ildizida (va tarqatish paketida — birinchi ikkitasi):

| Fayl | Nima qiladi |
|---|---|
| `DronStreamStart.bat` | Tekshiradi → kerak bo'lsa **bir marta** avtomatik tayyorlaydi → serverni ishga tushiradi → health-check → brauzerni ochadi. Server allaqachon ishlayotgan bo'lsa ikkinchi nusxa ochmaydi, faqat brauzerni ochadi. Birinchi ishga tushirishda admin yaratish sahifasi ochiladi, bir martalik kod shu oynada ko'rinadi (logga yozilmaydi). |
| `DronStreamTayyorla.bat` | Kompyuterni tayyorlaydi: Windows x64 tekshiruvi; paketda kompilyatorsiz; manba kodda mahkamlangan Go 1.27.4, Node 22.23.5, MediaMTX v1.21.3 ni `.tools` ga (rasmiy manbadan, SHA256 bilan) yuklaydi, `npm ci` (package-lock) va `go.sum` bo'yicha build qiladi; papkalar va sirsiz konfiguratsiya shablonini yaratadi (mavjudini ustidan yozmaydi); oxirida tayyorlik tekshiruvi. |
| `pull.bat` | Repozitoriy ichida: faqat fast-forward yangilash; lokal o'zgarish bo'lsa to'xtaydi (o'chirmaydi, stash qilmaydi); kod o'zgargan bo'lsa Tayyorla'ni ishga tushiradi, server ishlayotgan bo'lsa uni to'xtatmaydi. Yangi kompyuterda: yonidagi `DronStream` papkasiga clone qiladi va tayyorlaydi. |
| `push.bat` | O'zgarishlarni ko'rsatadi, sir/baza/log/media/build fayllarini (yangi commitlar tarixida ham) tekshiradi, commit qiladi, force'siz push qiladi, lokal va remote SHA ni solishtiradi, commit havolasini chiqaradi. Avtomatik: `push.bat -Message "xabar"`. |

Chiqish kodlari: 0 tayyor, 1 xato, 2 port band, 3 boshqa nusxa ishlamoqda, 4 qo'lda harakat kerak, 5 platforma qo'llanmaydi, 6 internet yo'q va vosita yetishmaydi, 7 server ishlayapti (binary ustidan yozilmaydi). Loglar: `runtime\logs\` (manba kod) yoki `<ROOT>\logs\` (paket).

Avtomatik "tuzatilmaydigan" holatlar (aniq tashxis beriladi): boshqa dastur band qilgan port (u to'xtatilmaydi), buzilgan yoki yangi sxemadagi baza, noto'g'ri TLS kalit, noto'g'ri konfiguratsiya. Firewall, Windows service va sertifikatni ishonch omboriga qo'shish — alohida, administrator bilan bajariladigan amallar (`scripts\firewall-rules.ps1`, `scripts\service-install.ps1`).

### Ikki kompyuter o'rtasida ishlash
1. Birinchi kompyuterda ish tugagach → `push.bat`
2. Ikkinchi kompyuterda → `pull.bat`
3. Dasturni ochish → `DronStreamStart.bat`
4. Zarur bo'lsa qo'lda tayyorlash → `DronStreamTayyorla.bat`

Git **faqat kod va xavfsiz loyiha fayllarini** ko'chiradi. Foydalanuvchilar bazasi, media, haqiqiy konfiguratsiya (`runtime\config\dronstream.yaml`), master kalit va TLS kalitlari Git'ga kirmaydi va yangi clone'da avtomatik paydo bo'lmaydi. Ularni ko'chirish yo'li — shifrlangan backup/restore ([BACKUP_RESTORE_UZ.md](BACKUP_RESTORE_UZ.md)); yoki yangi kompyuterda birinchi sozlash (bir martalik kod bilan yangi admin).

### Yangi kompyuterga `pull.bat` ning o'zini olish
- GitHub sahifasida `pull.bat` faylini oching → **Raw** → `Ctrl+S` bilan masalan `D:\Ish\pull.bat` sifatida saqlang (yoki repozitoriyni ZIP qilib yuklab, ichidan `pull.bat` ni oling).
- Shu papkada `pull.bat` ni ikki marta bosing: Git bo'lmasa o'rnatish yo'lini ko'rsatadi; bor bo'lsa `D:\Ish\DronStream` ga clone qiladi va `DronStreamTayyorla.bat` ni ishga tushiradi. Agar `DronStream` papkasi bor va bo'sh bo'lmasa — ustidan yozmaydi.
- Shaxsiy (private) repozitoriy uchun Git birinchi marta GitHub'ga kirishni so'raydi (Git Credential Manager oynasi). Token/parolni BAT faylga yoki remote URL ga yozmang.

## Tezkor boshlash (tayyor paketdan)
```powershell
# paketni oching, so'ng:
powershell -ExecutionPolicy Bypass -File .\DronStream-1.0.0-win64\scripts\install.ps1 -Root C:\DronStream
notepad C:\DronStream\config\dronstream.yaml
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\start.ps1
```
Brauzerda `https://localhost:8443` → bir martalik o'rnatish kodi bilan birinchi administratorni yarating (kod `C:\DronStream\data\runtime\setup-token.txt` da). Standart `admin/admin` hisob yo'q.

## Manba koddan yig'ish (faqat ishlab chiquvchi uchun)
Talab: Go 1.27+, Node.js 22, PowerShell. Yakuniy foydalanuvchiga Go/Node kerak emas.
```powershell
powershell -ExecutionPolicy Bypass -File build.ps1 -Version 1.0.0
```
Natija: `dist\DronStream-1.0.0-win64.zip` (+ `.sha256`). Skript MediaMTX v1.21.3 ni yuklab, SHA256 ni tekshiradi, frontendni yig'adi, unit testlarni ishga tushiradi va paketni yaratadi.

Testlar:
```powershell
cd backend; go test ./internal/...                                   # unit
go test -tags integration -count=1 -v -timeout 30m ./integration/    # real MediaMTX + WebRTC (FFmpeg kerak)
powershell -File tests\install-roundtrip.ps1 -Zip dist\DronStream-1.0.0-win64.zip
```

## Tuzilma
```
backend/   Go server (cmd/dronstream, internal/*), integration testlari
web/       React + TypeScript frontend (Vite)
packaging/ Windows skriptlari (install, start/stop/status, service, firewall, backup/restore, update/rollback)
config/    dronstream.example.yaml (sirsiz namuna)
tests/     o'rnatish/backup avtomatik testi
```

## Litsenziyalar
MediaMTX — MIT (paketda `mediamtx\LICENSE-mediamtx.txt`). FFmpeg paketga **kirmaydi** (faqat ishlab chiqishda test tasvir yaratish va RTMP sinovi uchun ishlatilgan).
