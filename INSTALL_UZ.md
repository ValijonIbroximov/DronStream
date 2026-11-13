# Toza Windows kompyuterga o'rnatish

> Holat: bu yo'riqnoma ishlab chiquvchi kompyuterida **alohida toza papkaga** o'rnatish orqali avtomatik sinaldi (`tests\install-roundtrip.ps1`). **Haqiqiy yangi Windows kompyuterida hali sinalmagan** — birinchi o'rnatishda quyidagi qadamlarni tekshirib boring.

## 1. Talablar
- Windows 10/11 yoki Windows Server 2019+ (x64). Go, Node yoki boshqa dasturlash muhiti **kerak emas**.
- Doimiy yoqiq kompyuter: *Quvvat sozlamalari → Uyqu: Hech qachon*.
- Statik LAN IP (routerda DHCP rezervatsiya).
- Internet orqali kirish kerak bo'lsa: public IP yoki port yo'naltirish, yoki VPN (6-bo'lim).
- Bo'sh portlar: 8443/tcp, 8189/udp, 1935/tcp (va ichki 127.0.0.1:9180, 9997, 8889).

## 2. Paketni tekshirish va o'rnatish
```powershell
Get-FileHash .\DronStream-1.0.0-win64.zip -Algorithm SHA256   # .sha256 fayldagi qiymat bilan solishtiring
Expand-Archive .\DronStream-1.0.0-win64.zip -DestinationPath .
powershell -ExecutionPolicy Bypass -File .\DronStream-1.0.0-win64\scripts\install.ps1 -Root C:\DronStream
```
`install.ps1` paket ichidagi har bir faylni `SHA256SUMS.txt` bo'yicha tekshiradi va quyidagini yaratadi:
```
C:\DronStream\app\1.0.0\        dastur (dronstream.exe, mediamtx\)
C:\DronStream\app\active.txt    faol versiya
C:\DronStream\config\           dronstream.yaml (sirsiz), secrets\ (avtomatik)
C:\DronStream\data\             baza, backups\, runtime\
C:\DronStream\logs\             loglar
C:\DronStream\scripts\          boshqaruv skriptlari
```
`config\secrets`, `data`, `logs` papkalari faqat Administrators, SYSTEM va o'rnatuvchi foydalanuvchiga ochiq qilinadi.

## 3. Sozlash (`C:\DronStream\config\dronstream.yaml`)
Minimal LAN sozlamasi (server IP = 192.168.1.50 deb faraz qilaylik):
```yaml
web:
  listen: ":8443"
  public_hosts: [192.168.1.50, server.local]
media:
  webrtc_additional_hosts: [192.168.1.50]
  rtmp_listen: ""                  # oddiy RTMP shifrlanmagan: secure rejimda faqat "" yoki "127.0.0.1:1935" (DJI_SETUP_UZ.md)
  rtmps_listen: ""                 # RTMPS uchun masalan ":1936" + ishonchli sertifikat
  publish_host: "localhost"        # pult URL ida ko'rinadigan manzil
```
Har bir parametr izohi `dronstream.example.yaml` da.

## 4. Ishga tushirish
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\start.ps1
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\status.ps1
```
Brauzer: `https://192.168.1.50:8443`. Birinchi marta o'z-o'zidan imzolangan sertifikat ishlatiladi — brauzer ogohlantiradi (7-bo'lim). Bir martalik o'rnatish kodi: `C:\DronStream\data\runtime\setup-token.txt`. U bilan birinchi administratorni yarating; kod ishlatilgach o'chadi.

## 5. Windows service (ixtiyoriy, tavsiya etiladi)
Administrator PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\service-install.ps1
```
Service avtomatik ishga tushadi, qulasa 5/10/30 s dan keyin qayta ishga tushadi. Olib tashlash: `service-uninstall.ps1` (ma'lumotlar qoladi). *Service rejimi kodda bor, lekin service sifatida o'rnatish sinalmagan (tizim sozlamasini o'zgartirgani uchun ishlab chiquvchi kompyuterida ishga tushirilmadi).*

## 6. Firewall va tarmoq
```powershell
# avval nima qilinishini ko'ring:
powershell -File C:\DronStream\scripts\firewall-rules.ps1 -RtmpRemote 10.8.0.0/24
# so'ng administrator sifatida qo'llang:
powershell -File C:\DronStream\scripts\firewall-rules.ps1 -RtmpRemote 10.8.0.0/24 -Apply
```
- Ochiladi: HTTPS (8443/tcp), WebRTC (8189/udp, ixtiyoriy tcp), ixtiyoriy RTMPS, ixtiyoriy TURN.
- RTMP **faqat** VPN tarmog'idan. Windows "ruxsat berasizmi?" oynasi chiqsa, mediamtx.exe ga **barcha tarmoqlar uchun ruxsat bermang** — qoidalar skript bilan boshqariladi.
- Ochilmaydi: 9997 (MediaMTX API), 8889 (WebRTC signalling), 9180 (ichki) — ular faqat 127.0.0.1 da tinglaydi.

### Internet orqali kirish
- **Public IP bo'lsa**: routerda 8443/tcp va 8189/udp ni server LAN IP siga yo'naltiring; `webrtc_additional_hosts` ga public IP yoki domenni yozing.
- **NAT ortida, lekin port yo'naltirish mumkin**: xuddi shunday.
- **CGNAT** (provayder umumiy IP beradi, port yo'naltirib bo'lmaydi): internetdan to'g'ridan-to'g'ri kirish ishlamaydi. Variantlar: public IP xizmatini olish; tomoshabinlarni ham VPN orqali ulash; yoki public IP li o'z serveringizda TURN/relay. Tashqi bulut relay yashirincha ishlatilmaydi.
- **UDP bloklangan tarmoqlar**: `webrtc_tcp_listen: ":8189"` yoki TURN (`turn.mode: builtin` + `public_ip`, yoki o'zingizning coturn `use-auth-secret`).
- Dastur paket yo'qolishi, jitter yoki kanal yetishmasligini avtomatik bartaraf etmaydi: video sifati kanalga bog'liq.

## 7. HTTPS sertifikat
- Lokal sinov: avtomatik o'z-o'zidan imzolangan sertifikat (`config\secrets\tls.crt`). Ogohlantirishni yo'qotish uchun uni foydalanuvchilar kompyuterlariga "Trusted Root" sifatida o'rnatish mumkin (faqat o'z tashkilotingizda).
- Haqiqiy foydalanish: CA tomonidan berilgan sertifikatni `tls.crt` (to'liq zanjir) va `tls.key` sifatida `config\secrets\` ga qo'ying, `tls.crt.selfsigned` faylini o'chiring, qayta ishga tushiring.
- Domen va internetdan 80/443 ochiq bo'lsa: `web.acme_domain`, `web.listen: ":443"`, `web.redirect_http: ":80"` — Let's Encrypt avtomatik (sinalmagan: haqiqiy domen talab qiladi).

## 8. Tekshiruv ro'yxati
- [ ] `status.ps1` → `"auth": true, "media": true`
- [ ] Admin panelda 2 ta DEMO manba "efirda"
- [ ] Boshqa kompyuter/telefondan `https://<server>:8443` ochiladi va DEMO video ko'rinadi
- [ ] Pult ulanishi: DJI_SETUP_UZ.md
- [ ] Backup yaratildi va boshqa joyda saqlandi: BACKUP_RESTORE_UZ.md

## 9. Eng oson yo'l: `DronStreamStart.bat` (v1.1)
Paketni istalgan papkaga oching (bo'sh joy va o'zbekcha harfli papka ham bo'ladi) va **`DronStreamStart.bat`** ni ikki marta bosing:
1. Birinchi marta u avtomatik `DronStreamTayyorla.bat` ni bir marta ishga tushiradi (papkalar, faol versiya, sirsiz konfiguratsiya; kompilyator kerak emas), so'ng serverni ishga tushiradi va brauzerni ochadi. Paket papkasining o'zi ROOT bo'ladi (`config\`, `data\`, `logs\` shu yerda).
2. Oynada bir martalik admin kodi ko'rinadi (logga yozilmaydi) — brauzerdagi birinchi sozlash sahifasiga kiriting.
3. Keyingi bosishlarda: server ishlayotgan bo'lsa ikkinchi nusxa ochilmaydi, faqat brauzer ochiladi.
4. Muammo bo'lsa oyna yopilmaydi: sabab, keyingi qadam va log manzili ko'rsatiladi. Band port, buzilgan baza yoki noto'g'ri TLS avtomatik "tuzatilmaydi".

`install.ps1` bilan `C:\DronStream` ga o'rnatish (2-bo'lim) ham ishlaydi; o'rnatilgan papkaga ham `DronStreamStart.bat` / `DronStreamTayyorla.bat` nusxalanadi.

Manba koddan ishlash (Git): `pull.bat` → `DronStreamTayyorla.bat` (Go 1.27.4, Node 22.23.5, MediaMTX v1.21.3 ni checksum bilan `.tools` ga — loyiha yo'li juda uzun bo'lsa `%LOCALAPPDATA%\DronStream\t-<id>` ga — yuklab, build qiladi; runtime `runtime\` papkasida) → `DronStreamStart.bat`. Batafsil: README_UZ.md.

**Faqat x64 Windows 10/11.** ARM64 va 32-bit Windows aniq xabar bilan rad etiladi (sinalmagan). Tavsiya: loyihani qisqa yo'lda saqlang (masalan `D:\DronStream`).

## 10. Serverga o'rnatish va Linux
Doimiy serverga (masalan Dell PowerEdge R570) o'rnatish, Windows Server va Ubuntu Server yo'llari, xizmat, firewall va Windows'dan Linux'ga ko'chirish — [SERVER_INSTALL_UZ.md](SERVER_INSTALL_UZ.md). Bosqichma-bosqich, buyruq kartalari bilan qo'llanma — `info.html` (paket ildizida; ikki marta bosib ochiladi).
