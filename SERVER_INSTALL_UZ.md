# DronStream'ni serverga o'rnatish (Dell PowerEdge R570)

Bu hujjat DronStream'ni doimiy serverga o'rnatish tartibini beradi. To'liq, rasmli-animatsiyali qo'llanma — paket ichidagi `info.html` (ikki marta bosib ochiladi, internet kerak emas) va admin paneldagi **?** tugmasi. Ikkalasi shu loyihadagi bitta manbadan (`guide/src/guide.md`) hosil qilinadi.

> **Halol holat.** Dastur haqiqiy R570 serverida **ishga tushirilmagan**: serverga kirish va uning operatsion tizimi haqida ma'lumot yo'q edi. Windows yo'li ishlab chiquvchi kompyuterida (Windows 11), Linux yo'li esa GitHub'ning Ubuntu 24.04 virtual mashinasida avtomatik sinovdan o'tgan (natijalar `TEST_REPORT.md` da). Ubuntu 26.04, Windows Server va haqiqiy R570 — sinalmagan.

## 0. Nimadan boshlash kerak

Server modeli operatsion tizimni bildirmaydi. **Avval OS'ni aniqlang, keyin shunga mos yo'lni tanlang.** OS aniqlanmaguncha hech narsa o'rnatmang.

Bu hujjat quyidagilarni **o'z ichiga olmaydi**: disk/RAID/BIOS sozlamalarini o'zgartirish, operatsion tizimni o'rnatish yoki qayta o'rnatish, serverdagi boshqa xizmatlarni to'xtatish yoki o'zgartirish.

| Qadam | Nima qilinadi | O'zgartiradimi |
|---|---|---|
| 1 | OS, arxitektura, resurslar, band portlarni aniqlash | Yo'q |
| 2 | Yo'lni tanlash: Windows Server yoki Ubuntu Server | Yo'q |
| 3 | Paketni tekshirish va o'rnatish | Ha — faqat o'z papkasi va (Linux'da) bitta tizim hisobi, bitta systemd unit |
| 4 | Sozlamani tahrirlash, ishga tushirish, birinchi administrator | Ha |
| 5 | Xizmat sifatida avtomatik ishga tushish | Ha |
| 6 | Firewall (alohida, ataylab) | Ha |
| 7 | Tekshiruvlar, backup | — |

### iDRAC haqida

R570 da iDRAC (BMC) alohida boshqaruv kontrolleri: o'z tarmoq porti va o'z manzili bor, operatsion tizimga bog'liq emas. U DronStream manzili **emas**. DronStream portlarini iDRAC bilan aralashtirmang va iDRAC'ni internetga chiqarmang (Dell uni to'g'ridan-to'g'ri internetga ulash uchun mo'ljallanmaganini yozadi). DronStream'ni o'rnatish uchun iDRAC'ga kirish shart emas.

## 1. Serverni aniqlash (faqat o'qiydigan buyruqlar)

**Windows** (oddiy PowerShell):

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture
Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, NumberOfLogicalProcessors, @{n='RAM_GB';e={[math]::Round($_.TotalPhysicalMemory/1GB)}}
Get-Volume | Where-Object DriveLetter | Select-Object DriveLetter, @{n='Free_GB';e={[math]::Round($_.SizeRemaining/1GB)}}
Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway
Get-NetTCPConnection -State Listen -LocalPort 8443,1935,9180,9997,8889 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, @{n='Jarayon';e={(Get-Process -Id $_.OwningProcess).ProcessName}}
Get-NetUDPEndpoint -LocalPort 8189 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort
```

**Linux** (oddiy foydalanuvchi):

```bash
cat /etc/os-release
uname -m
nproc; free -h; df -h
ip -brief addr; ip route show default
ss -tulpn
```

Linux paketida shularning hammasini bajarib hisobot beradigan, hech narsani o'zgartirmaydigan skript bor:

```bash
bash scripts/preflight.sh --root /opt/dronstream
```

Chiqish kodi 0 — to'siq yo'q; 4 — o'rnatishdan oldin hal qilinishi kerak bo'lgan to'siq bor (masalan port band yoki arxitektura mos emas).

Port band bo'lsa **begona xizmatni to'xtatmang** — `config/dronstream.yaml` da boshqa port tanlang.

## 2. Yo'lni tanlash

| Serverdagi tizim | Paket | Holat |
|---|---|---|
| Windows Server 2022 / 2025 | `DronStream-<versiya>-win64.zip` | Dastur Windows 11 da sinalgan; Windows Server'da sinalmagan |
| Ubuntu Server 26.04 LTS yoki 24.04 LTS (amd64) | `DronStream-<versiya>-linux-amd64.tar.gz` | Ubuntu 24.04 (GitHub runner) da avtomatik sinalgan; 26.04 da sinalmagan |
| Boshqa Linux (RHEL, SLES…) | — | Qo'llab-quvvatlanmaydi (sinalmagan). systemd va amd64 bo'lsa ishlashi mumkin, lekin kafolat yo'q |
| VMware ESXi | — | Ichida Windows Server yoki Ubuntu virtual mashinasi yarating va yuqoridagi yo'ldan foydalaning |

Nega Ubuntu: Dell R570 uchun Ubuntu Server 24.04 va 26.04 LTS ni rasman qo'llab-quvvatlaydi, Canonical esa R570 ni shu ikki versiya uchun sertifikatlagan. 26.04 LTS ning standart qo'llab-quvvatlash muddati uzoqroq (2031-yil mayigacha; 24.04 — 2029-yil mayigacha). Manbalar: `guide/SOURCES.md`.

## 3. Windows Server yo'li

Barcha buyruqlar PowerShell'da. `C:\DronStream` — namuna; boshqa papka tanlashingiz mumkin.

```powershell
# 1) Paket SHA-256 qiymatini .sha256 faylidagi bilan solishtiring
Get-FileHash .\DronStream-1.2.0-win64.zip -Algorithm SHA256
Get-Content .\DronStream-1.2.0-win64.zip.sha256

# 2) Oching va o'rnating (mavjud sozlama va ma'lumotlarga tegmaydi)
Expand-Archive .\DronStream-1.2.0-win64.zip -DestinationPath .
cd .\DronStream-1.2.0-win64
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Root C:\DronStream
```

So'ng:

1. `C:\DronStream\config\dronstream.yaml` ni tahrirlang: `web.public_hosts` (tomoshabin yozadigan nom yoki IP), `media.publish_host` (pult ulanadigan manzil), `media.webrtc_additional_hosts` (video uchun e'lon qilinadigan manzil).
2. Ishga tushiring va tekshiring:

```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\start.ps1
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\status.ps1
```

3. Brauzerda `https://localhost:8443`. Birinchi administrator uchun bir martalik kod: `C:\DronStream\data\runtime\setup-token.txt`. Paket **secure** rejimda: administrator yaratilgach panel ikkinchi bosqichni (TOTP) yoqishni talab qiladi — telefondagi autentifikator ilovasi kerak; berilgan 10 ta tiklash kodini xavfsiz joyga yozing (11-bo'lim).
4. Xizmat sifatida (administrator PowerShell) — kompyuter yonganda o'zi ishga tushadi:

```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\service-install.ps1
```

Xizmatni olib tashlash alohida buyruq (`service-uninstall.ps1`); u ma'lumotlarni o'chirmaydi.

`DronStreamStart.bat` ham ishlaydi: tekshiradi, kerak bo'lsa bir marta tayyorlaydi, ishga tushiradi va brauzerni ochadi.

## 4. Linux yo'li (Ubuntu Server)

```bash
# 1) Yaxlitlikni tekshiring va oching
sha256sum -c DronStream-1.2.0-linux-amd64.tar.gz.sha256
tar -xzf DronStream-1.2.0-linux-amd64.tar.gz
cd DronStream-1.2.0-linux-amd64

# 2) Faqat o'qiydigan tekshiruv
bash scripts/preflight.sh --root /opt/dronstream

# 3) O'rnatish (xizmatni ishga tushirmaydi, firewall'ga tegmaydi)
sudo bash scripts/install.sh --root /opt/dronstream
```

`install.sh` nima qiladi: paket fayllarini SHA-256 bo'yicha tekshiradi; `dronstream` nomli, login qila olmaydigan tizim hisobini yaratadi; fayllarni `/opt/dronstream` ga joylaydi; sozlama yo'q bo'lsa namunadan yaratadi (mavjudini almashtirmaydi); `/etc/systemd/system/dronstream.service` ni yozadi. To'ldirilmagan (`<...>`) yoki tizim papkasi bo'lgan `--root` rad etiladi.

So'ng:

```bash
sudoedit /opt/dronstream/config/dronstream.yaml      # public_hosts, publish_host, webrtc_additional_hosts
sudo systemctl enable --now dronstream               # ishga tushirish + avtomatik yuklash
systemctl status dronstream --no-pager
sudo cat /opt/dronstream/data/runtime/setup-token.txt   # birinchi administrator kodi (jurnalga yozilmaydi)
```

Birinchi kirishdan keyin panel TOTP'ni yoqishni so'raydi (secure rejim) — 11-bo'lim.

Jurnal: `sudo journalctl -u dronstream -n 50 --no-pager`.

### Egalik va huquqlar

| Papka | Egasi | Huquq |
|---|---|---|
| `/opt/dronstream/app/` | root | dastur fayllari, xizmat ularni o'zgartira olmaydi |
| `config/dronstream.yaml` | root:dronstream | 640 — sir yo'q |
| `config/secrets/` | dronstream | 700; `master.key` 600 |
| `data/` | dronstream | 700 — baza, media, backuplar |
| `logs/` | dronstream | 750 |

Xizmat alohida huquqsiz hisobda ishlaydi va faqat `config/secrets`, `data`, `logs` ga yoza oladi (systemd: `ProtectSystem=strict`, `NoNewPrivileges`, `PrivateTmp` va boshqalar). Dastur o'chsa yoki o'ldirilsa, MediaMTX ham darhol to'xtaydi.

**Sirlar Linux'da.** Windows'da master kalit DPAPI bilan kompyuterga bog'lanadi; Linux'da DPAPI yo'q. U yerda kalit fayl huquqi (600) va alohida hisob bilan himoyalanadi; huquq kengroq bo'lsa dastur ishga tushmaydi va sababini yozadi. Serverda root huquqi bor odam kalitni o'qiy oladi. `chmod 777` bermang, xizmatni root sifatida ishlatmang.

**443/80 portlar.** Standart port 8443 — qo'shimcha huquq kerak emas. 443 ishlatsangiz unit ichidagi `AmbientCapabilities=CAP_NET_BIND_SERVICE` qatorlarini izohdan chiqaring va `sudo systemctl daemon-reload` qiling.

## 5. Firewall — alohida va ataylab

Skriptlar firewall'ni o'zi ochmaydi. Faqat kerakli portlar, faqat kerakli manbalarga. Firewall'ni butunlay o'chirmang.

| Port | Protokol | Kimga | Izoh |
|---|---|---|---|
| 8443 | TCP | Tomoshabinlar | HTTPS |
| 8189 | UDP | Tomoshabinlar | WebRTC video |
| 1935 | TCP | **Faqat pult tarmog'i / VPN** | RTMP shifrlanmagan |
| 9180, 9997, 8889 | TCP | Hech kimga | Faqat 127.0.0.1 — ochmang |

**Windows** — avval nima qo'shilishini ko'ring (hech narsa o'zgarmaydi):

```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\firewall-rules.ps1
```

Qo'shish (administrator; `<PULT_TARMOGI>` ni to'ldiring, masalan `10.8.0.0/24`):

```powershell
$PultTarmogi = '<PULT_TARMOGI>'
if ($PultTarmogi -match '[<>]') { throw "Avval <PULT_TARMOGI> ni to'ldiring" }
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\firewall-rules.ps1 -RtmpRemote $PultTarmogi -Apply
```

Olib tashlash — alohida buyruq: `firewall-rules.ps1 -Remove` (faqat "DronStream" nomli qoidalar).

**Ubuntu (ufw)** — avval holat: `sudo ufw status verbose`. ufw o'chiq bo'lsa, uni yoqishdan oldin SSH qoidasi borligiga ishonch hosil qiling (`sudo ufw allow OpenSSH`), aks holda masofaviy ulanish uzilishi mumkin.

```bash
sudo ufw allow 8443/tcp comment 'DronStream HTTPS'
sudo ufw allow 8189/udp comment 'DronStream WebRTC'
```

RTMP — faqat pult tarmog'idan:

```bash
NET='<PULT_TARMOGI>'
case "$NET" in
  *'<'*) echo "Avval NET ni to'ldiring" ;;
  *) sudo ufw allow from "$NET" to any port 1935 proto tcp comment 'DronStream RTMP' ;;
esac
```

Olib tashlash — alohida: `sudo ufw status numbered`, so'ng kerakli raqamni `sudo ufw delete <RAQAM>`.

## 6. O'rnatishdan keyingi tekshiruv

1. Health-check serverning o'zida: `curl -k https://localhost:8443/api/health` → `{"ok":true,"auth":true,"media":true}`. (`-k` faqat diagnostika uchun.)
2. Boshqa qurilmadan sahifa ochiladi.
3. Admin bo'lib kirib, **▶ Tomosha qilish** da ikki DEMO video o'ynaydi — bu video kanali (UDP) ham ishlayotganini ko'rsatadi. Sahifa ochilishi videoni kafolatlamaydi.
4. Admin panelda **Audit va sozlamalar → Sozlamalar → Tashqi manzil** kiritiladi (usiz havola va QR yaratilmaydi).
5. Birinchi backup olinadi va serverdan tashqariga ko'chiriladi.
6. Server rejali qayta yuklanadi va xizmat o'zi ishga tushgani tekshiriladi (`Get-Service DronStream` yoki `systemctl is-active dronstream`).

Haqiqiy pultni ulash va internetdan kirish — alohida sinovlar (`info.html`, "Tashqi internet" va "Haqiqiy pultni ulash" bo'limlari; `DJI_SETUP_UZ.md`).

## 7. Backup, yangilash, rollback

| Amal | Windows | Linux |
|---|---|---|
| Backup | `scripts\backup.ps1` | `sudo bash /opt/dronstream/scripts/backup.sh` |
| Tiklash (server to'xtatilgan) | `scripts\restore.ps1 -In <FAYL>` | `sudo bash /opt/dronstream/scripts/restore.sh --in <FAYL>` |
| Yangilash | `scripts\update.ps1 -Package <YANGI_PAKET>` | `sudo bash <YANGI_PAKET>/scripts/update.sh` |
| Rollback | `scripts\rollback.ps1 -ToVersion <VERSIYA>` | `sudo bash /opt/dronstream/scripts/rollback.sh --to-version <VERSIYA>` |

- Backup parol bilan shifrlanadi (kamida 12 belgi). Parol yo'qolsa backup ochilmaydi.
- Yangilash avval o'zi backup oladi; yangi versiya sog'lom bo'lmasa avtomatik orqaga qaytadi.
- Baza sxemasi o'zgargan bo'lsa, eski dastur yangi bazani ochmaydi: rollback yangilashdan oldingi backupni tiklaydi (undan keyingi o'zgarishlar yo'qoladi).
- Tiklangan server **kutish (standby)** rejimida boshlanadi — ikki server bir vaqtda xizmat qilmasligi uchun. Admin panelda faollashtiriladi.

## 8. Windows'dan Linux'ga ko'chirish

Windows'dagi `config\secrets` papkasini Linux'ga nusxalash **ishlamaydi**: kalit DPAPI bilan o'sha kompyuterga bog'langan. To'g'ri yo'l — parolli backup:

1. Windows'da: `scripts\backup.ps1 -Out <FAYL> -MigrateOut` (eski server xizmat ko'rsatishni to'xtatadi).
2. Faylni Linux serverga ko'chiring.
3. Linux'da `install.sh` (xizmatni ishga tushirmasdan), so'ng `restore.sh --in <FAYL>`.
4. `sudo systemctl start dronstream`, admin bo'lib kirib serverni faollashtiring.
5. Sozlamani tekshiring (`public_hosts`, `publish_host`, sertifikat).

Bu yo'l CI'da tekshiriladi: Windows virtual mashinasida olingan backup Ubuntu'da tiklanadi (natija `TEST_REPORT.md` da).

## 9. Manbadan ishlab turgan serverni yangilash emas

`pull.bat` / `push.bat` faqat **manba kodni** kompyuterlar orasida ko'chiradi. Ular serverdagi baza, media va kalitlarga tegmaydi va ishlab turgan server dasturini almashtirmaydi. Ishlab turgan serverni yangilash — har doim yangi paket va `update` skripti orqali.

## 10. Secure rejim — nimani majburiy qiladi

Paketdagi `config/dronstream.yaml` da `security.mode: "secure"`:

| Talab | Natija |
|---|---|
| Oddiy (shifrlanmagan) RTMP tarmoqdan qabul qilinmaydi | `media.rtmp_listen` bo'sh (sukut) yoki `127.0.0.1:1935`. Xususiy IP (`<VPN_IP>:1935`, LAN, Wi-Fi), ommaviy IP, `":1935"` yoki host nomi bo'lsa dastur **ishga tushmaydi** va sababini logga yozadi: xususiy IP shifrlash emas |
| RTMPS | `media.rtmps_listen` (masalan `":1936"`) + ishonchli sertifikat. RTMPS ishlamasa avtomatik RTMP'ga o'tilmaydi. DJI pulti bilan sinash tartibi: SECURITY_MODEL.md 4-bo'lim |
| Administrator ikkinchi bosqichi | TOTP yoqilmaguncha admin amallari bloklangan |

Mavjud o'rnatishdagi (1.0–1.2 dan yangilangan) sozlama faylida `security.mode` bo'lmasa — `standard`, ya'ni **laboratoriya rejimi**: admin panel har sahifada "Laboratoriya rejimi — production emas" deb ko'rsatadi. Production uchun uni `secure` ga o'zgartiring va xizmatni qayta ishga tushiring; avval `rtmp_listen` ni tekshiring (yuqoridagi jadval).

Pultni secure rejimda ulash yo'llari (RTMPS yoki shifrlangan tunnel + serverdagi gateway) va ularning tasdiqlanmagan joylari: `DJI_SETUP_UZ.md`. Haqiqiy pult bilan tasdiqlangan yo'l hali yo'q.

Admin panel → **Audit va sozlamalar → Sozlamalar → Xavfsizlik holati** qaysi himoya amalda tekshirilgani va qaysi biri tasdiqlanmaganini ko'rsatadi.

## 11. Administrator: TOTP va tiklash

1. Panel so'raganda (yoki **Sozlamalar → Ikkinchi bosqich (TOTP)**) QR kodni autentifikator ilovasi bilan skanerlang va 6 xonali kodni kiriting.
2. 10 ta tiklash kodini qog'ozga yoki parol menejeriga yozing — boshqa ko'rsatilmaydi.
3. Telefon yo'qolsa: tiklash kodi bilan kiring va yangi TOTP yarating.
4. Tiklash kodlari ham yo'q bo'lsa: serverda `dronstream reset-admin --username <LOGIN>` (Windows: `C:\DronStream\app\<VERSIYA>\dronstream.exe`, Linux: `sudo -u dronstream /opt/dronstream/app/current/dronstream reset-admin --root /opt/dronstream --username <LOGIN>`). U vaqtinchalik parol beradi va TOTP'ni o'chiradi.

Havola va QR endi faqat taklif: tomoshabin so'rov yuboradi, siz uni **Kirish so'rovlari** sahifasida tomoshabin aytgan tekshirish kodi bilan tasdiqlaysiz.

## 12. Hali tekshirilmagan

- Haqiqiy Dell PowerEdge R570 (har qanday OS bilan).
- Windows Server 2022/2025; Ubuntu Server 26.04 LTS.
- Tashqi internetdan kirish, NAT/CGNAT, TURN haqiqiy tarmoqda.
- Haqiqiy DJI pulti; RTMPS va pultning sertifikat tekshiruvi.
- Server qayta yuklanganidan keyin avtomatik ishga tushish (CI'da faqat `enabled` holati va xizmat qulaganda qayta ishga tushishi tekshirilgan).
- ufw qoidalari (buyruqlar rasmiy hujjatga mos, lekin bu loyihada bajarilmagan).
