# Backup, tiklash, ko'chirish, yangilash va rollback

## 1. Backupda nima bor
Shifrlangan bitta fayl (`.dsbak`):
- `dronstream.db` — foydalanuvchilar, mehmonlar, streamlar (kalitlar shifrlangan), ruxsatlar, audit. **Izchil snapshot**: SQLite `VACUUM INTO` — server ishlayotgan paytda ham to'g'ri nusxa (oddiy fayl nusxalash emas).
- `master.key` — publish kalitlarini ochadigan kalit (DPAPI dan chiqarilgan holda, faqat backup ichida, parol bilan shifrlangan).
- `dronstream.yaml`, `tls.crt`/`tls.key`, `turn.secret` (bo'lsa).

Shifrlash: Argon2id (parol → kalit) + AES-256-GCM. **Parolni yo'qotsangiz backupni ochib bo'lmaydi.** Parol kamida 12 belgi; backup faylidan alohida saqlang.

## 2. Backup yaratish
- Admin panel → Tarmoq va tizim → Backup (fayl `data\backups\` ga yoziladi, u yerdan yuklab olish mumkin), yoki:
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\backup.ps1                      # parol so'raladi
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\backup.ps1 -Out E:\dronstream.dsbak
```
- Avtomatlashtirish (Task Scheduler): `DRONSTREAM_BACKUP_PASSPHRASE` muhit o'zgaruvchisi bilan `dronstream.exe backup --root C:\DronStream --out ...`. Parolni vazifa sozlamasida ochiq yozmang — Windows Credential Manager yoki faqat SYSTEM o'qiy oladigan faylda saqlang.
- CLI har backupdan keyin uni qayta ochib tekshiradi.
- Backupni server diskidan **tashqarida** saqlang (USB, boshqa kompyuter).

## 3. Shu kompyuterda tiklash
```powershell
powershell -File C:\DronStream\scripts\restore.ps1 -In E:\dronstream.dsbak -Force
```
Server to'xtatiladi; joriy baza `dronstream.db.pre-restore-<vaqt>` sifatida saqlab qo'yiladi. Tiklangan server **standby** rejimida ochiladi — shu kompyuterning o'zi bo'lsa darhol faollashtiring: `dronstream.exe activate --root C:\DronStream` yoki admin panel.

## 4. Boshqa kompyuterga ko'chirish
**Avtomatik bajariladi:** foydalanuvchilar, streamlar, kalitlar, ruxsatlar, audit tiklanadi; master kalit yangi kompyuterda DPAPI bilan **qayta bog'lanadi**; eski sessiyalar va ochiq media bekor qilinadi; yangi instance ID; standby rejimi.
**Avtomatik bajarilMAYdi** (qo'lda): IP/domen, TLS, firewall, VPN, pult URL lari. "Papkani nusxalasangiz hammasi ishlaydi" — **yo'q**.

### Qadamlar
1. **Eski serverda** — backup va eski serverni to'xtatish belgisi:
   ```powershell
   powershell -File C:\DronStream\scripts\backup.ps1 -Out E:\move.dsbak -MigrateOut
   ```
   `-MigrateOut` backupdan keyin eski serverni "migrated" holatiga o'tkazadi: ~1 s ichida barcha tomosha uziladi, publish rad etiladi. Shunday qilib ikki server bir vaqtda xizmat qilmaydi. (Bekor qilish: `dronstream.exe activate --root C:\DronStream`.)
2. **Yangi kompyuterda** — paketni o'rnating (INSTALL_UZ.md, 2-bo'lim), lekin **ishga tushirmang**.
3. Tiklang:
   ```powershell
   powershell -File C:\DronStream\scripts\restore.ps1 -In E:\move.dsbak
   ```
   Agar yangi kompyuterda `dronstream.yaml` allaqachon bo'lsa, backupdagi nusxa `dronstream.yaml.from-backup` ga yoziladi — solishtiring.
4. **Tarmoq sozlamalarini yangilang** (`config\dronstream.yaml`):
   - `web.public_hosts`, `media.webrtc_additional_hosts` — yangi IP/domen;
   - `media.publish_host`, `rtmp_listen` — yangi VPN IP;
   - TLS: domen o'zgarsa yangi sertifikat (`config\secrets\tls.crt/.key`) yoki o'z-o'zidan imzolanganni o'chirib qayta yaratish (`tls.crt`, `tls.key`, `tls.crt.selfsigned` ni o'chiring);
   - TURN: `turn.public_ip`, coturn bo'lsa `turn.secret` coturn bilan bir xilligi.
5. Firewall: `scripts\firewall-rules.ps1 -RtmpRemote <VPN tarmoq> -Apply` (administrator). Routerda port yo'naltirishni yangi LAN IP ga o'zgartiring.
6. VPN: yangi server VPN ga ulanganini / VPN server sozlamalarini tekshiring.
7. `scripts\start.ps1` → admin bilan kiring (eski parollar ishlaydi; barcha foydalanuvchilar qayta kiradi).
8. **Eski server haqiqatan o'chirilganini tekshiring**, so'ng: Tarmoq va tizim → "Serverni faollashtirish" (tasdiq matni: `ESKI SERVER O'CHIRILDI`).
9. Pultlardagi URL host qismini yangi manzilga almashtiring (kalitlar o'zgarmaydi). Xavfsizlik uchun ko'chirishdan keyin kalitlarni almashtirish tavsiya etiladi (Streamlar → Kalitni almashtirish).
10. Foydalanuvchilarga yangi manzilni xabar qiling.

## 5. Yangilash
```powershell
powershell -File C:\DronStream\scripts\update.ps1 -Package D:\DronStream-1.0.1-win64.zip
```
Bajariladi: paket SHA256 tekshiruvi → yangilashdan oldingi shifrlangan backup (`data\backups\pre-update-…`) → to'xtatish → `app\<yangi>` o'rnatish → `active.txt` almashtirish (service bo'lsa binPath yangilanadi) → ishga tushirish → 60 s sog'liq tekshiruvi → sog'lom bo'lmasa **avtomatik rollback**. Eski versiya `app\<eski>` da qoladi. Konfiguratsiya va ma'lumotlarga tegilmaydi.

## 6. Rollback
```powershell
powershell -File C:\DronStream\scripts\rollback.ps1 -ToVersion 1.0.0
```
Agar yangi versiya bazani yangi sxemaga o'tkazgan bo'lsa, eski versiya bazani ochmaydi ("schema is newer") — u holda yangilashdan oldingi backup bilan:
```powershell
powershell -File C:\DronStream\scripts\rollback.ps1 -ToVersion 1.0.0 -Backup C:\DronStream\data\backups\pre-update-1.0.0-to-1.0.1-....dsbak
```
(Backupdan keyingi o'zgarishlar yo'qoladi.) 1.0.x ichida sxema v1 — o'zgarmagan.

## 7. Sinov holati
`tests\install-roundtrip.ps1` (bir kompyuterda ikki toza ROOT): backup ishlayotgan serverda, migrate-out, noto'g'ri parol rad, tiklash, standby, faollashtirish, foydalanuvchi/stream/ruxsat/kalit tiklanishi — **o'tdi**. `tests\update-rollback.ps1`: 1.0.0 → 1.0.1 → 1.0.0 — natija TEST_REPORT.md da. **Haqiqiy boshqa kompyuterga ko'chirish (boshqa DPAPI kaliti) sinalmagan.**
