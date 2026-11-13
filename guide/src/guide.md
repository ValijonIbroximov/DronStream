#! DronStream qo'llanmasining YAGONA manbasi. info.html va admin yordam sahifasi shundan hosil qilinadi:
#!   node guide/build.mjs
#! Format: "# Qism {#id}", "## Bo'lim {#id}", "### Kichik sarlavha", ro'yxatlar, |jadval|, ```kod```,
#!   :::note info|warn|ok ... :::   va   :::cmd os=... shell=... admin=yes|no kind=diag|setup|undo title="..." ... :::
#! Namunaviy manzillar: <SERVER_IP>, <DOMEN> va h.k. Haqiqiy manzil, parol yoki kalit YOZILMAYDI.

:::story
1. Pult video yuboradi | DJI pulti jonli videoni server manziliga RTMP orqali yuboradi. Har bir pult uchun alohida manzil va maxfiy kalit bor.
2. Server manbani tekshiradi | Server kalit to'g'riligini va shu yo'l band emasligini tekshiradi. Kalit noto'g'ri bo'lsa yoki boshqa manba ulanib turgan bo'lsa — rad etadi.
3. Foydalanuvchi kiradi yoki havolani faollashtiradi | Tomoshabin brauzerda login-parol bilan kiradi, mehmon so'rovi yuboradi yoki maxsus havolani ochib "Kirish"ni bosadi. Alohida dastur o'rnatilmaydi.
4. Administrator ruxsatni boshqaradi | Admin kim nimani va qachongacha ko'rishini belgilaydi. Ruxsat berilmagan narsa umuman ko'rinmaydi.
5. Ruxsatli kontent ko'rsatiladi | Server har bir video ulanishini alohida tekshiradi va faqat ruxsat etilgan streamni WebRTC orqali uzatadi.
6. Revoke'dan keyin ulanish uziladi | Admin ruxsatni olib tashlasa, server ochiq video ulanishini o'zi uzadi va qayta ulanishni rad etadi. Bu faqat tugmani yashirish emas.
:::

# A. Dastur haqida {#a}

## Dastur nima qiladi {#maqsad}

DronStream — DJI pultidan kelayotgan jonli videoni bitta markaziy serverga qabul qilib, uni faqat administrator ruxsat bergan odamlarga brauzer orqali ko'rsatadigan dastur. Tomoshabinga alohida dastur, VPN klienti yoki plagin kerak emas: oddiy Chrome, Edge, Firefox yoki Safari yetadi.

Dastur ikki qismdan iborat va ikkalasi bitta paketda keladi:

- **dronstream** — veb-sahifa, foydalanuvchilar, ruxsatlar, havolalar va audit bilan shug'ullanadigan asosiy dastur.
- **MediaMTX v1.21.3** — videoni qabul qilib, brauzerlarga uzatadigan media server. Uni dronstream o'zi ishga tushiradi va nazorat qiladi; siz uni alohida sozlamaysiz.

Ma'lumotlar bitta SQLite faylida saqlanadi. Tashqi baza, bulut xizmati yoki uchinchi tomon hisobi talab qilinmaydi.

:::note info
Bu markaziy serverga ishonadigan tizim. Server videoni ochiq holda qabul qiladi va qayta uzatadi. Server o'chsa, translatsiya ham to'xtaydi.
:::

## Kim nima qiladi: pult, server, administrator, tomoshabin {#rollar}

| Ishtirokchi | Vazifasi | Nimaga kirishi bor |
|---|---|---|
| DJI pulti | Videoni serverga yuboradi | Faqat o'z yo'liga yozish (kalit bilan). Hech narsani ko'ra olmaydi |
| Server | Manbani tekshiradi, ruxsatlarni qo'llaydi, videoni uzatadi | Hamma narsa shu yerda saqlanadi |
| Administrator | Pultlar, kontent, hisoblar, havolalar, ruxsatlarni boshqaradi | Hamma narsani ko'radi va boshqaradi |
| Tomoshabin | Faqat ruxsat berilgan kontentni ko'radi | O'ziga berilgan stream, matn, rasm, video |

Pult kaliti faqat video **yuborish** uchun. U bilan videoni ko'rib bo'lmaydi va saytga kirib bo'lmaydi.

## Foydalanuvchi turlari {#foydalanuvchilar}

| Tur | Qanday kiradi | Qachon ishlatiladi |
|---|---|---|
| Doimiy foydalanuvchi | Login va parol | Doimiy xodimlar. Admin yaratadi, bloklashi mumkin |
| Mehmon (so'rov bilan) | Ismini yozib so'rov yuboradi, admin tasdiqlaydi | Oldindan hisob ochilmagan odam. Ism tasdiqlanmagan hisoblanadi |
| Maxsus havola | Havolani ochib "Kirish"ni bosadi, login yo'q | Bir martalik, N martalik yoki vaqtinchalik kirish; QR orqali ulashish |
| Administrator | Login va parol | Tizimni boshqarish |

Maxsus havolaning uch turi bor:

- **Bir martalik** — bir marta faollashtiriladi. Boshqa brauzerda qayta ochilmaydi.
- **N martalik** — belgilangan marta faollashtiriladi; bir vaqtdagi sessiyalar soni ham cheklanadi.
- **Vaqtinchalik** — belgilangan vaqt oralig'ida ishlaydi (boshlanishidan oldin ham, tugaganidan keyin ham rad etiladi).

Havolani shunchaki ochish, oldindan ko'rish yoki QR kodni skanerlash foydalanishni **sarflamaydi**. Faqat "Kirish" tugmasi bosilganda sarflanadi. Sahifani yangilash, boshqa tab ochish yoki video qayta ulanishi yangi kirish hisoblanmaydi.

## Kontent: jonli stream, matn, rasm, video, to'plam {#kontent}

- **Jonli stream** — pultdan kelayotgan video. Har bir pult uchun bitta.
- **Matn** — e'lon yoki ko'rsatma.
- **Rasm** — PNG, JPEG yoki GIF.
- **Video** — yuklangan fayl: MP4 (H.264) yoki WebM (VP8/VP9). H.265 qabul qilinmaydi, chunki ko'p brauzerlar uni ko'rsatmaydi.
- **To'plam** — bir nechta kontentni bitta nom ostida birlashtiradi.

Har bir kontentning sarlavhasi va izohi bor. To'plamga ruxsat berishda ikki siyosatdan biri tanlanadi: **"keyin qo'shilganlar ham"** (to'plamga yangi narsa qo'shilsa, u ham ochiladi) yoki **"faqat hozirgi elementlar"** (keyin qo'shilganlar ochilmaydi).

## Ruxsat va shifrlash — ikki xil narsa {#ruxsat-shifr}

Bu ikki tushunchani aralashtirmaslik muhim.

- **Shifrlash** yo'ldagi begona odam trafikni o'qiy olmasligini ta'minlaydi. Brauzer bilan server orasida HTTPS va WebRTC (DTLS-SRTP) shifrlangan.
- **Ruxsat** kim nimani ko'rishi mumkinligini belgilaydi. Uni server tekshiradi: har bir video ulanishi, har bir fayl va har bir Range so'rovi uchun alohida.

Shifrlash bor degani ruxsat bor degani emas, va aksincha. Oddiy **RTMP shifrlanmagan**: pultdan serverga boradigan video yo'lda ochiq ketadi. Buning yechimlari [[#ingest|"Pult → server yo'li"]] bo'limida.

Bu end-to-end shifrlash emas: server videoni ochiq holda ko'radi.

## Nimani kafolatlab bo'lmaydi {#chegaralar}

:::note warn
Tomoshabin qurilmasiga yetib borgan narsani qaytarib olib bo'lmaydi. Ruxsat olib tashlanganda server ulanishni uzadi va keyingi so'rovlarni rad etadi, lekin allaqachon ko'rilgan kadrlar, yuklab olingan rasm yoki ekrandan olingan yozuv tomoshabinda qoladi.
:::

- Ekran yozib olishni yoki telefon bilan ekranni suratga olishni brauzer orqali mutlaq taqiqlab bo'lmaydi.
- Video ustidagi ism va vaqt belgisi (watermark) nusxalashni to'xtatmaydi; u faqat sizib chiqqan yozuv kimdan ekanini aniqlashga yordam beradi.
- Dastur qotib qolsa (jarayon tirik, lekin javob bermayapti), ochiq jonli video eng ko'pi bilan 120 soniya davom etishi mumkin (ijara muddati). Dastur butunlay o'chsa, media server ham darhol to'xtaydi.

# B. Tarmoq asoslari {#b}

## Manzillar: localhost, lokal IP, public IP, domen {#manzillar}

| Manzil | Namuna | Qayerdan ochiladi |
|---|---|---|
| localhost | `https://localhost:8443` | Faqat serverning o'zidan |
| Lokal (xususiy) IP | `https://<SERVER_IP>:8443`, masalan 192.168.x.x yoki 10.x.x.x | Faqat shu lokal tarmoqdagi qurilmalardan |
| Public IP | Internet provayder bergan tashqi manzil | Internetdan, agar firewall va router ruxsat bersa |
| Domen | `https://<DOMEN>` | Domen public IP ga yo'naltirilgan bo'lsa |

:::note warn
Domenning o'zi hech qanday portni ochmaydi. Domen faqat nomni IP manzilga aylantiradi. Port ochiq bo'lishi uchun serverda firewall qoidasi, routerda esa port yo'naltirish (yoki serverning o'zida public IP) kerak.
:::

## NAT va CGNAT {#nat}

**NAT** — router ortidagi qurilmalar bitta tashqi manzildan foydalanadi. Tashqaridan serverga yetish uchun routerda port yo'naltirish sozlanadi.

**CGNAT** — provayderning o'zi sizni yana bir NAT ortiga qo'yadi. Bu holda routeringizdagi "tashqi" manzil ham aslida xususiy bo'ladi va port yo'naltirish internetdan ishlamaydi. Belgisi: routerdagi WAN manzil bilan internetda ko'rinadigan manzil boshqa-boshqa.

CGNAT ortida server joylashtirish uchun provayderdan haqiqiy (statik) public IP olish yoki serverni public IP bor joyga ko'chirish kerak.

## Telefon hotspot va USB modem {#hotspot}

- Telefon hotspoti yoki USB modem orqali ulangan kompyuter deyarli har doim CGNAT ortida bo'ladi: unga internetdan kirib bo'lmaydi.
- Bu usul faqat **lokal** sinov uchun yaroqli: telefon va kompyuter bir-birini lokal manzil orqali ko'radi.
- Ba'zi hotspotlar ulangan qurilmalarni bir-biridan ajratadi (client isolation) — bu holda lokal manzil ham ochilmaydi.

## HTTPS, WebRTC, ICE, TURN {#webrtc}

- **HTTPS** (TCP, standart port 8443) — sahifa, login va boshqaruv shu orqali ishlaydi.
- **WebRTC** — video shu orqali uzatiladi. U HTTPS dan **alohida** yo'l: asosan UDP (standart port 8189).
- **ICE** — brauzer va server bir-biriga qaysi manzil va port orqali yeta olishini aniqlaydigan jarayon.
- **STUN** — qurilma NAT ortidan qaysi tashqi manzil bilan ko'rinishini bilib oladi. DronStream sukut bo'yicha tashqi STUN ishlatmaydi.
- **TURN** — to'g'ridan-to'g'ri ulanish imkoni bo'lmaganda videoni vositachi (relay) orqali o'tkazadi. Serverda ochiq manzil va ochiq UDP port bo'lsa, odatda TURN kerak bo'lmaydi.

Tomoshabin faqat video **qabul qiladi**, shuning uchun brauzer kamera yoki mikrofon ruxsatini so'ramaydi.

## Sahifa ochildi — video ham ishlaydi degani emas {#sahifa-video}

Bu eng ko'p uchraydigan chalkashlik. Sahifa TCP 8443 orqali keladi, video esa UDP 8189 orqali. Birinchisi ochiq, ikkinchisi yopiq bo'lishi mumkin. Shunda sahifa to'liq ishlaydi, login qilinadi, lekin player "Ulanmoqda…" holatida qoladi.

Shuning uchun har bir yangi tarmoqda **ikkalasini alohida** tekshiring: sahifa ochilishini va demo video o'ynashini.

## Portlar jadvali {#portlar}

Standart konfiguratsiya (`config/dronstream.yaml`) bo'yicha. Portlarni shu faylda o'zgartirsangiz, firewall qoidalarini ham moslang.

| Port | Protokol | Yo'nalish | Maqsad | Kimga ochiladi | Holati |
|---|---|---|---|---|---|
| 8443 | TCP | brauzer → server | HTTPS: sahifa, login, boshqaruv | Tomoshabinlar | Majburiy |
| 8189 | UDP | brauzer ↔ server | WebRTC video | Tomoshabinlar | Majburiy |
| 8189 | TCP | brauzer ↔ server | UDP yopiq tarmoqlar uchun WebRTC | Tomoshabinlar | Ixtiyoriy (`webrtc_tcp_listen`) |
| 1935 | TCP | pult → server | RTMP ingest (shifrlanmagan) | Faqat pult tarmog'i yoki VPN | Pult ishlatilsa |
| 1936 | TCP | pult → server | RTMPS ingest (`rtmps_listen` yoqilsa) | Pultlar | Ixtiyoriy |
| 3478 | UDP va TCP | brauzer ↔ server | TURN (`turn.mode: builtin`) | Tomoshabinlar | Ixtiyoriy |
| 50000–50100 | UDP | brauzer ↔ server | TURN relay portlari | Tomoshabinlar | TURN bilan birga |
| 80 | TCP | internet → server | ACME (Let's Encrypt) va http → https | Internet | Faqat ACME ishlatilsa |
| 9180 | TCP | server ichida | Ichki tekshiruv (hook) | Hech kimga (127.0.0.1) | Ichki |
| 9997 | TCP | server ichida | MediaMTX boshqaruv API | Hech kimga (127.0.0.1) | Ichki |
| 8889 | TCP | server ichida | MediaMTX WebRTC signalizatsiya | Hech kimga (127.0.0.1) | Ichki |

:::note warn
9180, 9997 va 8889 portlarini hech qachon tashqariga ochmang. Ular faqat 127.0.0.1 da tinglaydi va shunday qolishi kerak. Server boshqaruv porti (iDRAC) ham bu jadvalga kirmaydi.
:::

## Tashqi manzil (Public base URL) {#base-url}

Maxsus havola va QR kodlar ichiga yoziladigan manzil. Admin panel: **Audit va sozlamalar → Sozlamalar → Tashqi manzil (Public base URL)**.

- Tomoshabin brauzerga yozadigan manzilni kiriting, masalan `https://<DOMEN>` yoki `https://<SERVER_IP>:8443`.
- `localhost` qabul qilinmaydi: boshqa qurilmada u ochilmaydi.
- Bu sozlama kiritilmaguncha havola va QR yaratilmaydi.
- Manzil o'zgarsa, eski havolalar eski manzilni ko'rsatib qoladi — ularni qaytadan ulashing.

# C. Windows kompyuterda noldan ishga tushirish {#c}

## 1-qadam: paket yoki kodni olish {#win-olish}

Ikki yo'l bor. Oddiy foydalanish uchun birinchisi yetarli.

**Tayyor paket** (`DronStream-<versiya>-win64.zip`): ichida yig'ilgan dastur bor, kompilyator kerak emas. Zip'ni oching — tamom.

**Manba kod** (Git orqali): dasturni o'zgartiradigan yoki ikki kompyuter orasida kod ko'chiradigan ishlab chiquvchi uchun. Yangi kompyuterda faqat `pull.bat` faylining o'zi yetadi: u kodni yuklab oladi va tayyorlashni boshlaydi.

:::note info
Git faqat **kodni** ko'chiradi. Foydalanuvchilar bazasi, yuklangan media, kalitlar va sozlamalar Git'ga kirmaydi. Ular faqat shifrlangan backup orqali ko'chiriladi.
:::

## 2-qadam: Tayyorla va Start {#win-start}

Papkadagi `DronStreamStart.bat` faylini ikki marta bosing. U:

1. sozlama, fayllar va portlarni tekshiradi;
2. biror narsa yetishmasa `DronStreamTayyorla.bat` ni **bir marta** o'zi chaqiradi;
3. serverni ishga tushiradi va sog'lomligini kutadi;
4. brauzerni ochadi.

Server allaqachon ishlab turgan bo'lsa, ikkinchi nusxa ochilmaydi — faqat brauzer ochiladi.

Start quyidagilarni **qilmaydi**: band portni bo'shatish uchun begona dasturni to'xtatmaydi, buzilgan bazani o'chirmaydi, parolni almashtirmaydi. Bunday holatda sababini va log manzilini ko'rsatib to'xtaydi.

| Chiqish kodi | Ma'nosi |
|---|---|
| 0 | Tayyor / ishlayapti |
| 1 | Xato (log'ga qarang) |
| 2 | Port band |
| 3 | Boshqa oynada allaqachon ishlayapti |
| 4 | Qo'lda tuzatish kerak |
| 5 | Platforma mos emas |
| 6 | Internet kerak, lekin yo'q |
| 7 | Server ishlab turibdi — dastur fayli almashtirilmadi |

## 3-qadam: birinchi administrator {#win-admin}

Sukut bo'yicha tayyor administrator yo'q — bu ataylab qilingan. Birinchi ishga tushirishda Start oynasida **bir martalik kod** chiqadi (u log'ga yozilmaydi). Brauzerda shu kodni, o'zingiz tanlagan login va parolni kiriting. Kod bir marta ishlatiladi.

Parol unutilsa, server kompyuterida `dronstream reset-admin --username <LOGIN>` buyrug'i yangi vaqtinchalik parol beradi.

## 4-qadam: lokal tarmoqdan ulanish {#win-lokal}

:::cmd os=windows shell=PowerShell admin=no kind=diag title="Kompyuterning lokal manzili va shlyuzini ko'rish"
where: Server kompyuterida, oddiy PowerShell oynasida
does: Tarmoq adapterlarining IPv4 manzili va shlyuzini ko'rsatadi. Hech narsani o'zgartirmaydi
expect: Faol adapter qatorida 192.168.x.x, 10.x.x.x yoki 172.16–31.x.x ko'rinishidagi manzil
onerror: Manzil ko'rinmasa — kabel yoki Wi-Fi ulanmagan
```powershell
Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway
```
:::

Topilgan manzilni `config\dronstream.yaml` dagi `web.public_hosts` ro'yxatiga qo'shing (o'z-o'zidan imzolangan sertifikatga kiradi) va serverni qayta ishga tushiring. Keyin boshqa qurilmada `https://<SERVER_IP>:8443` ni oching.

Boshqa qurilmadan ochilmasa, Windows Firewall kiruvchi ulanishni to'sayotgan bo'lishi mumkin — [[#firewall|"Firewall va router"]] bo'limiga qarang.

## Sertifikat {#sertifikat}

| Variant | Qachon | Brauzer |
|---|---|---|
| O'z-o'zidan imzolangan (avtomatik) | Sinov, lokal tarmoq | Ogohlantiradi; "Davom etish"ni bosish kerak |
| O'zingizning sertifikatingiz | Ichki CA yoki sotib olingan | Ogohlantirmaydi (CA ishonchli bo'lsa) |
| Let's Encrypt (ACME) | Haqiqiy domen, internetdan 80 va 443 ochiq | Ogohlantirmaydi |

O'z sertifikatingizni ishlatish uchun `tls.crt` va `tls.key` fayllarini `config\secrets\` papkasiga qo'ying va serverni qayta ishga tushiring. ACME uchun `web.acme_domain` va `web.acme_email` ni to'ldiring, `web.listen` ni `:443`, `web.redirect_http` ni `:80` qiling.

:::note warn
Sertifikat ogohlantirishini "o'chirib qo'yadigan" brauzer sozlamalarini ishlatmang. O'z-o'zidan imzolangan sertifikat faqat sinov uchun; doimiy foydalanishda ishonchli sertifikat o'rnating.
:::

## Demo sinov {#demo}

Haqiqiy pult ulanmaguncha dasturda ikki **DEMO** manba ishlaydi (sinov tasviri, ustida "DEMO" yozuvi bor). Ular butun zanjirni pultsiz tekshirishga yordam beradi.

1. Admin bo'lib kiring, menyudan **▶ Tomosha qilish**ni oching.
2. Ikki demo video o'ynashi kerak. O'ynasa — sahifa ham, video kanali ham ishlayapti.
3. Shu sinovni boshqa qurilmadan (telefon, noutbuk) takrorlang.

Demo ishlashi haqiqiy pult ishlashini **isbotlamaydi**: u faqat server → brauzer yo'lini tekshiradi.

## Haqiqiy pultni ulash — alohida tekshiruv {#pult}

1. Admin panel: **Kontent → Dron pultlari → yangi stream**. Dastur pult uchun manzil va kalit beradi.
2. Manzil ko'rinishi: `rtmp://<SERVER_IP>:1935/live/<YOL>?key=<KALIT>`. Pult `?` belgisini qabul qilmasa: `rtmp://<SERVER_IP>:1935/live/<YOL>/<KALIT>`.
3. DJI Pilot 2 da jonli efir turini RTMP qilib, shu manzilni kiriting.
4. Admin panelda stream "efirda" bo'lishi va tomosha sahifasida video ko'rinishi kerak.

:::note warn
Haqiqiy DJI pulti bilan ishlash bu loyihada hali sinalmagan. DJI hujjatlarida DJI Pilot 2 uchun RTMP ko'rsatilgan; RTMPS rasman tasdiqlanmagan. Pult bilan birinchi ulanishni alohida sinov sifatida o'tkazing va natijani yozib qo'ying.
:::

# D. Dell PowerEdge R570 serveri {#d}

## Avval aniqlang: bu serverda nima bor {#r570-aniqlash}

Server modeli operatsion tizimni bildirmaydi. R570 da Windows Server ham, Linux ham, virtualizatsiya ham bo'lishi mumkin. **OS aniqlanmaguncha hech narsa o'rnatmang.** Avval faqat o'qiydigan buyruqlar bilan holatni bilib oling.

:::note warn
Bu qo'llanma disk/RAID/BIOS sozlamalarini o'zgartirishni yoki operatsion tizimni qayta o'rnatishni o'z ichiga olmaydi. Serverda ishlab turgan boshqa xizmatlarga tegilmaydi. Dastur haqiqiy R570 da hali ishga tushirilmagan.
:::

Dell R570 uchun rasman qo'llab-quvvatlaydigan tizimlar orasida Windows Server 2022 va 2025, Ubuntu Server 24.04 va 26.04 LTS bor. DronStream uchun ikki yo'l tayyorlangan: **Windows Server** va **Ubuntu Server 26.04 LTS (yoki 24.04 LTS), amd64**.

:::cmd os=windows shell=PowerShell admin=no kind=diag title="Windows: tizim, arxitektura, resurslar, disk"
where: Serverda (masofaviy ish stoli yoki konsol), oddiy PowerShell
does: OS nomi va versiyasi, arxitektura, protsessor yadrolari, RAM va disklardagi bo'sh joyni ko'rsatadi. Hech narsani o'zgartirmaydi
expect: "Microsoft Windows Server …", "64-bit", yadro soni, RAM (GB) va har bir disk uchun bo'sh joy
onerror: Buyruq topilmasa — bu Windows emas; Linux kartasiga o'ting
```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture
Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, NumberOfLogicalProcessors, @{n='RAM_GB';e={[math]::Round($_.TotalPhysicalMemory/1GB)}}
Get-Volume | Where-Object DriveLetter | Select-Object DriveLetter, @{n='Free_GB';e={[math]::Round($_.SizeRemaining/1GB)}}, @{n='Size_GB';e={[math]::Round($_.Size/1GB)}}
```
:::

:::cmd os=windows shell=PowerShell admin=no kind=diag title="Windows: DronStream portlari band emasmi va kim tinglayapti"
where: Serverda, oddiy PowerShell
does: 8443, 1935, 9180, 9997, 8889 (TCP) va 8189 (UDP) portlarini kim tinglayotganini ko'rsatadi. Hech narsani to'xtatmaydi
expect: Hech narsa chiqmasa — portlar bo'sh. Qator chiqsa — o'sha port band va jarayon nomi ko'rinadi
onerror: Port band bo'lsa begona dasturni to'xtatmang: `config\dronstream.yaml` da boshqa port tanlang
```powershell
Get-NetTCPConnection -State Listen -LocalPort 8443,1935,9180,9997,8889 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, @{n='Jarayon';e={(Get-Process -Id $_.OwningProcess).ProcessName}}
Get-NetUDPEndpoint -LocalPort 8189 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, @{n='Jarayon';e={(Get-Process -Id $_.OwningProcess).ProcessName}}
```
:::

:::cmd os=linux shell=bash admin=no kind=diag title="Linux: tizim, arxitektura, resurslar, disk"
where: Serverda (SSH yoki konsol), oddiy foydalanuvchi
does: Distributiv va versiya, arxitektura, yadrolar, RAM va disklardagi bo'sh joyni ko'rsatadi. Hech narsani o'zgartirmaydi
expect: Masalan "Ubuntu 26.04 LTS" va "x86_64"
onerror: `/etc/os-release` yo'q bo'lsa — bu odatiy Linux emas; tizim administratoridan so'rang
```bash
cat /etc/os-release
uname -m
nproc
free -h
df -h
```
:::

:::cmd os=linux shell=bash admin=no kind=diag title="Linux: manzillar, yo'l va tinglayotgan portlar"
where: Serverda, oddiy foydalanuvchi (jarayon nomlarini to'liq ko'rish uchun sudo bilan)
does: IP manzillar, standart yo'l va tinglayotgan TCP/UDP portlarni ko'rsatadi. Hech narsani o'zgartirmaydi
expect: Ro'yxatda 8443, 8189, 1935, 9180, 9997, 8889 bo'lmasa — DronStream portlari bo'sh
onerror: `ss` yoki `ip` topilmasa — `iproute2` paketi o'rnatilmagan
```bash
ip -brief addr
ip route show default
ss -tulpn
```
:::

Linux paketida bularning hammasini bir yo'la bajaradigan, hech narsani o'zgartirmaydigan skript bor:

:::cmd os=linux shell=bash admin=no kind=diag title="Linux: DronStream preflight tekshiruvi"
where: Serverda, paket ochilgan papkada
does: OS, arxitektura, systemd, resurslar, portlar, firewall holati va vaqt sinxronligini tekshirib hisobot beradi. Hech narsani o'rnatmaydi va o'zgartirmaydi
expect: Oxirida "To'siq topilmadi" va keyingi qadam buyrug'i (chiqish kodi 0)
onerror: "TO'SIQLAR" ro'yxati chiqsa (kod 4) — avval ularni hal qiling; begona xizmatni to'xtatmang
```bash
bash scripts/preflight.sh --root /opt/dronstream
```
:::

## iDRAC — alohida narsa {#idrac}

R570 da **iDRAC** (BMC) degan alohida boshqaruv kontrolleri bor: uning o'z tarmoq porti va o'z manzili bo'ladi, u operatsion tizimga bog'liq emas.

- iDRAC manzili DronStream manzili **emas**. Ularni aralashtirmang.
- DronStream portlarini iDRAC ga yo'naltirmang va iDRAC portlarini DronStream uchun ochmang.
- iDRAC ni internetga chiqarmang. Dell uni to'g'ridan-to'g'ri internetga ulash uchun mo'ljallanmaganini yozadi va alohida, himoyalangan boshqaruv tarmog'ini tavsiya qiladi.

DronStream'ni o'rnatish uchun iDRAC ga kirish shart emas.

## Windows Server yo'li {#r570-windows}

Windows paketi (`DronStream-<versiya>-win64.zip`) ishlatiladi. Paketni serverga ko'chirib oching, so'ng ichidan:

:::cmd os=windows shell=PowerShell admin=no kind=setup title="Windows: dasturni doimiy papkaga o'rnatish"
where: Serverda, ochilgan paket papkasida
does: Dastur fayllarini `C:\DronStream` ga nusxalaydi, papkalarni yaratadi. Sozlama fayli yo'q bo'lsa namunadan yaratadi; mavjud sozlama va ma'lumotlarga tegmaydi
expect: `C:\DronStream\app`, `config`, `data`, `logs`, `scripts` papkalari paydo bo'ladi
onerror: "Ruxsat yo'q" chiqsa — boshqa papka tanlang yoki PowerShell'ni administrator sifatida oching
undo: O'rnatilgan papkani o'chirish yetarli (avval xizmatni olib tashlang va backup oling)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Root C:\DronStream
```
:::

:::cmd os=windows shell=PowerShell admin=no kind=setup title="Windows: ishga tushirish va holatni tekshirish"
where: Serverda, `C:\DronStream` papkasida
does: Serverni fon jarayoni sifatida ishga tushiradi (xizmat o'rnatilgan bo'lsa — xizmat orqali), so'ng holatni ko'rsatadi
expect: status.ps1 chiqish kodi 0 va "sog'lom" holati
onerror: `C:\DronStream\logs\dronstream.log` ning oxirgi qatorlarini o'qing
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\start.ps1
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\status.ps1
```
:::

:::cmd os=windows shell=PowerShell admin=no kind=setup title="Windows: to'xtatish"
where: Serverda
does: Serverni tartibli to'xtatadi. Barcha tomoshabinlarning videosi uziladi
expect: Jarayon tugaydi; status.ps1 chiqish kodi 1
onerror: To'xtamasa log'ni tekshiring; jarayonni majburan o'ldirmang
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\stop.ps1
```
:::

## Linux yo'li: Ubuntu Server 26.04 / 24.04 LTS {#r570-linux}

Linux paketi (`DronStream-<versiya>-linux-amd64.tar.gz`) ishlatiladi. Tanlangan distributiv: **Ubuntu Server 26.04 LTS** (standart qo'llab-quvvatlash 2031-yil mayigacha) yoki **24.04 LTS** (2029-yil mayigacha). Ikkalasi ham R570 uchun Dell va Canonical ro'yxatida bor. Boshqa distributivlarda dastur sinalmagan.

:::note warn
Linux yo'li avtomatik sinovdan GitHub'ning Ubuntu 24.04 virtual mashinasida o'tgan (o'rnatish, systemd, backup, yangilash). Haqiqiy R570 da va Ubuntu 26.04 da hali ishga tushirilmagan.
:::

:::cmd os=linux shell=bash admin=no kind=setup title="Linux: paketni ochish va yaxlitligini tekshirish"
where: Serverda, paket ko'chirilgan papkada
does: Arxiv SHA-256 qiymatini `.sha256` fayli bilan solishtiradi va arxivni ochadi
expect: "OK" va `DronStream-<versiya>-linux-amd64` papkasi
onerror: "FAILED" chiqsa arxivni ishlatmang — qayta yuklab oling
```bash
sha256sum -c DronStream-*-linux-amd64.tar.gz.sha256
tar -xzf DronStream-*-linux-amd64.tar.gz
cd DronStream-*-linux-amd64
```
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Linux: o'rnatish"
where: Serverda, ochilgan paket papkasida
does: Paketni tekshiradi, alohida `dronstream` hisobini yaratadi, fayllarni `/opt/dronstream` ga joylaydi, systemd unit yozadi. Xizmatni yoqmaydi va ishga tushirmaydi; firewall'ga tegmaydi; mavjud sozlamani almashtirmaydi
expect: Oxirida "O'rnatildi" va keyingi qadamlar ro'yxati
onerror: Xabar sababni aytadi. Boshqa versiya o'rnatilgan bo'lsa install.sh emas, update.sh ishlatiladi
undo: Xizmat: `sudo bash /opt/dronstream/scripts/uninstall-service.sh`. Ma'lumotlar o'chirilmaydi
```bash
sudo bash scripts/install.sh --root /opt/dronstream
```
:::

So'ng sozlamani tekshiring (kamida `public_hosts` va `publish_host`):

:::cmd os=linux shell=bash admin=yes kind=setup title="Linux: sozlamani tahrirlash"
where: Serverda
does: Sozlama faylini xavfsiz tahrirlash uchun ochadi. Bu faylda sir yo'q; sirlar `config/secrets/` da
expect: Fayl saqlangach o'zgarish xizmat qayta ishga tushganda kuchga kiradi
onerror: YAML xatosi bo'lsa xizmat ishga tushmaydi va sababini jurnalga yozadi
```bash
sudoedit /opt/dronstream/config/dronstream.yaml
```
:::

## Xizmat hisobi va papkalar {#xizmat-hisobi}

Dastur administrator yoki root huquqi bilan ishlamasligi kerak.

| Papka | Ichida nima bor | Linux'da egasi va huquqi |
|---|---|---|
| `app/<versiya>/` | Dastur va MediaMTX | root, faqat o'qish |
| `config/dronstream.yaml` | Sirsiz sozlama | root:dronstream, 640 |
| `config/secrets/` | Master kalit, TLS kaliti | dronstream, 700 (fayllar 600) |
| `data/` | Baza, media, backuplar | dronstream, 700 |
| `logs/` | Dastur va MediaMTX loglari | dronstream, 750 |

- **Linux**: install.sh `dronstream` nomli tizim hisobini yaratadi (login qila olmaydi). Xizmat faqat `config/secrets`, `data` va `logs` ga yoza oladi.
- **Windows**: master kalit Windows DPAPI bilan shu kompyuterga bog'langan. Xizmatni administrator bo'lmagan alohida hisobda ishlatish tavsiya etiladi.
- **Linux'da DPAPI yo'q**: master kalit fayl huquqi (600) va alohida hisob bilan himoyalanadi. Huquq kengroq bo'lsa dastur ishga tushmaydi. Serverda root huquqi bor odam kalitni o'qiy oladi — bu Linux'ning odatiy chegarasi.

:::note warn
Papkalarga `chmod 777` bermang va xizmatni root sifatida ishga tushirmang. Huquq muammosi chiqsa, egalikni jadvaldagidek tiklang.
:::

## Avtomatik ishga tushish, health-check, loglar {#xizmat}

:::cmd os=windows shell=PowerShell admin=yes kind=setup title="Windows: xizmat sifatida o'rnatish"
where: Serverda, administrator PowerShell
does: DronStream'ni Windows xizmati qiladi: kompyuter yonganda o'zi ishga tushadi, qulasa qayta ishga tushadi
expect: `Get-Service DronStream` holati Running
onerror: "Administrator sifatida ishga tushiring" chiqsa — PowerShell'ni administrator qilib oching
undo: Keyingi kartadagi service-uninstall.ps1
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\service-install.ps1
Get-Service DronStream
```
:::

:::cmd os=windows shell=PowerShell admin=yes kind=undo title="Windows: xizmatni olib tashlash"
where: Serverda, administrator PowerShell
does: Windows xizmatini olib tashlaydi. Dastur fayllari va ma'lumotlar o'chirilmaydi
expect: `Get-Service DronStream` xizmat topilmadi deydi
onerror: Xizmat band bo'lsa avval stop.ps1 ni bajaring
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\service-uninstall.ps1
```
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Linux: xizmatni yoqish va ishga tushirish"
where: Serverda
does: Xizmatni hozir ishga tushiradi va server qayta yuklanganda avtomatik ishga tushadigan qiladi
expect: `active (running)`; ichida dronstream va mediamtx jarayonlari
onerror: `sudo journalctl -u dronstream -n 50 --no-pager` — sabab shu yerda yoziladi
undo: `sudo systemctl disable --now dronstream`
```bash
sudo systemctl enable --now dronstream
systemctl status dronstream --no-pager
```
:::

:::cmd os=linux shell=bash admin=yes kind=diag title="Linux: jurnal va birinchi administrator kodi"
where: Serverda
does: Xizmat jurnalining oxirgi qatorlarini va bir martalik o'rnatish kodini ko'rsatadi. Kod jurnalga yozilmaydi — faqat shu faylda
expect: Jurnalda xatosiz ishga tushish; faylda bir qatorli kod (birinchi administrator yaratilgach fayl yo'qoladi)
onerror: Fayl yo'q bo'lsa — administrator allaqachon yaratilgan
```bash
sudo journalctl -u dronstream -n 50 --no-pager
sudo cat /opt/dronstream/data/runtime/setup-token.txt
```
:::

:::cmd os=any shell=PowerShell/bash admin=no kind=diag title="Sog'liqni tekshirish (health-check)"
where: Serverning o'zida
does: Dasturdan holatini so'raydi. `-k` sertifikatni tekshirmaydi — bu faqat diagnostika uchun, doimiy foydalanishga emas
expect: `{"ok":true,"auth":true,"media":true}`
onerror: Javob yo'q — xizmat ishlamayapti. `"media":false` — MediaMTX ishga tushmagan (mediamtx.log ga qarang)
```bash
curl -k https://localhost:8443/api/health
```
:::

Windows PowerShell'da `curl` o'rniga `curl.exe` deb yozing.

Loglar: `logs/dronstream.log` va `logs/mediamtx.log` (Windows'da `C:\DronStream\logs\`, Linux'da `/opt/dronstream/logs/`). Loglarga parol, kalit va havola tokeni yozilmaydi.

## Backup, yangilash, rollback {#backup-update}

Backup — bitta shifrlangan `.dsbak` fayli: baza, yuklangan media, sozlama, master kalit va TLS sertifikati. U parol bilan shifrlanadi (kamida 12 belgi). **Parol yo'qolsa backup ochilmaydi.**

:::cmd os=windows shell=PowerShell admin=no kind=setup title="Windows: backup olish"
where: Serverda. Server ishlab turganda ham bo'ladi
does: Izchil shifrlangan nusxa oladi. Parolni ikki marta so'raydi
expect: `C:\DronStream\data\backups\` ichida yangi `.dsbak` fayli
onerror: Parol 12 belgidan qisqa bo'lsa rad etiladi
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\backup.ps1
```
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Linux: backup olish"
where: Serverda. Server ishlab turganda ham bo'ladi
does: Izchil shifrlangan nusxa oladi. Parol ekranda ko'rinmaydi va jarayon argumentlariga tushmaydi
expect: `/opt/dronstream/data/backups/` ichida yangi `.dsbak` fayli
onerror: Parol 12 belgidan qisqa bo'lsa rad etiladi
```bash
sudo bash /opt/dronstream/scripts/backup.sh --root /opt/dronstream
```
:::

Backup faylini serverdan tashqariga — boshqa diskka yoki boshqa kompyuterga ko'chirib qo'ying. Parolni fayl bilan birga saqlamang.

**Tiklash** to'xtatilgan serverda bajariladi. Tiklangan server **kutish (standby)** rejimida ishga tushadi: eski server o'chirilganini tasdiqlamaguningizcha video ko'rsatmaydi. Bu ikki server bir vaqtda xizmat qilib qolmasligi uchun.

:::cmd os=windows shell=PowerShell admin=no kind=setup title="Windows: backupni tiklash"
where: Serverda, server to'xtatilgan holda
does: Baza, media va kalitlarni backupdan tiklaydi. Mavjud baza bo'lsa `-Force` kerak (eski fayl `.pre-restore-*` nomi bilan saqlanadi)
expect: "Tiklandi"; ishga tushgach admin panelda kutish rejimi haqida ogohlantirish
onerror: Parol noto'g'ri bo'lsa hech narsa o'zgarmaydi
```powershell
$Backup = '<BACKUP_FAYLI>'
if ($Backup -match '[<>]') { throw "Avval <BACKUP_FAYLI> o'rniga .dsbak fayl yo'lini yozing" }
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\stop.ps1
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\restore.ps1 -In $Backup
```
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Linux: backupni tiklash"
where: Serverda, xizmat to'xtatilgan holda
does: Baza, media va kalitlarni backupdan tiklaydi. Mavjud baza bo'lsa `--force` qo'shing
expect: "Tiklandi"; ishga tushgach admin panelda kutish rejimi haqida ogohlantirish
onerror: Xizmat ishlab turgan bo'lsa skript rad etadi — avval to'xtating
```bash
BACKUP='<BACKUP_FAYLI>'
case "$BACKUP" in
  *'<'*) echo "Avval BACKUP ga .dsbak fayl yo'lini yozing" ;;
  *) sudo systemctl stop dronstream && sudo bash /opt/dronstream/scripts/restore.sh --root /opt/dronstream --in "$BACKUP" ;;
esac
```
:::

**Yangilash** yangi paket ichidagi skript bilan qilinadi. U avval shifrlangan backup oladi, yangi versiyani o'rnatadi, sog'lomligini tekshiradi va muvaffaqiyatsiz bo'lsa o'zi orqaga qaytaradi. Eski versiya fayllari saqlanib qoladi.

:::cmd os=windows shell=PowerShell admin=no kind=setup title="Windows: yangi versiyaga yangilash"
where: Serverda. Yangi paket ochilgan papka yo'lini ko'rsating
does: Paketni tekshiradi, backup oladi, serverni to'xtatib yangi versiyani o'rnatadi va ishga tushiradi. Yangilash paytida video uziladi
expect: "Tayyor: <versiya> ishlayapti"
onerror: Sog'lom bo'lmasa avtomatik eski versiyaga qaytadi
undo: Keyingi kartadagi rollback.ps1
```powershell
$Paket = '<YANGI_PAKET_PAPKASI>'
if ($Paket -match '[<>]') { throw "Avval <YANGI_PAKET_PAPKASI> o'rniga ochilgan paket papkasini yozing" }
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\update.ps1 -Package $Paket
```
:::

:::cmd os=windows shell=PowerShell admin=no kind=undo title="Windows: oldingi versiyaga qaytish (rollback)"
where: Serverda
does: Oldingi versiyani faollashtiradi. Baza sxemasi o'zgargan bo'lsa yangilashdan oldingi backupni tiklaydi — undan keyingi o'zgarishlar yo'qoladi
expect: "Rollback tayyor"
onerror: Backup paroli noto'g'ri bo'lsa faol versiya o'zgarmaydi
```powershell
$Versiya = '<OLDINGI_VERSIYA>'
if ($Versiya -match '[<>]') { throw "Avval <OLDINGI_VERSIYA> o'rniga versiyani yozing, masalan 1.1.0" }
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\rollback.ps1 -ToVersion $Versiya
```
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Linux: yangi versiyaga yangilash"
where: Serverda, YANGI paket ochilgan papkada
does: Paketni tekshiradi, backup oladi, xizmatni to'xtatib yangi versiyani o'rnatadi va ishga tushiradi
expect: "Tayyor: <versiya> ishlayapti"
onerror: Sog'lom bo'lmasa avtomatik eski versiyaga qaytadi
undo: `sudo bash /opt/dronstream/scripts/rollback.sh --root /opt/dronstream --to-version <OLDINGI_VERSIYA>`
```bash
sudo bash scripts/update.sh --root /opt/dronstream
```
:::

## Windows'dan Linux'ga ko'chirish {#win-linux}

Windows'dagi master kalit DPAPI bilan o'sha kompyuterga bog'langan — uni Linux'da to'g'ridan-to'g'ri ochib bo'lmaydi. Shuning uchun `config\secrets` papkasini nusxalash **ishlamaydi**. Ko'chirish faqat parolli backup orqali qilinadi: backup ichida kalit parol bilan shifrlangan holda bo'ladi va tiklashda yangi serverga qayta bog'lanadi.

1. Windows'da: `scripts\backup.ps1 -Out <FAYL> -MigrateOut`. `-MigrateOut` eski serverni "ko'chirilgan" holatga o'tkazadi — u xizmat ko'rsatishni to'xtatadi.
2. `.dsbak` faylini Linux serverga ko'chiring.
3. Linux'da install.sh ni bajaring (xizmatni ishga tushirmasdan), so'ng restore.sh bilan tiklang.
4. Xizmatni ishga tushiring, admin bo'lib kiring va server holatini **faol** qiling.
5. Linux'da sozlamani tekshiring: `public_hosts`, `publish_host`, portlar va sertifikat.

Ko'chadi: hisoblar, ruxsatlar, havolalar (ishlatilgan bir martalik havola ishlatilganicha qoladi), kontent va media, pult kalitlari, audit. Ko'chmaydi: ochiq sessiyalar (hamma qayta kiradi).

## Qayta yuklashdan keyingi tekshiruv {#reboot}

Serverni rejali qayta yuklagandan so'ng:

1. Xizmat o'zi ishga tushdimi: Windows — `Get-Service DronStream`; Linux — `systemctl is-active dronstream`.
2. Health-check `{"ok":true,…}` qaytaradimi.
3. Boshqa qurilmadan sahifa ochiladimi va demo video o'ynaydimi.
4. Pult qayta ulana oladimi (stream "efirda" bo'ladimi).
5. Vaqt to'g'rimi (havola muddatlari server vaqtiga bog'liq).

# E. Tashqi internet {#e}

## Tashqaridan kirish uchun nima kerak {#tashqi-talab}

Tomoshabin internetdan brauzer orqali kirishi uchun to'rtta narsa birga kerak:

1. **Yetib boriladigan manzil** — serverda yoki routerda haqiqiy public IP (CGNAT emas).
2. **Ochiq portlar** — kamida TCP 8443 (yoki 443) va UDP 8189.
3. **Ishonchli sertifikat** — domen va unga berilgan sertifikat.
4. **To'g'ri e'lon qilingan manzil** — server brauzerga video uchun tashqi manzilini aytishi kerak: `media.webrtc_additional_hosts` ro'yxatiga public IP yoki domenni yozing.

Tomoshabinga VPN yoki alohida klient dasturi **kerak emas** — hammasi brauzerda ishlaydi.

:::note warn
Tashqi internetdan kirish bu loyihada hali sinalmagan. Quyidagi qadamlar dastur sozlamalariga mos, lekin har bir tarmoq o'ziga xos — [[#qabul-test|qabul testini]] albatta o'tkazing.
:::

## DNS va HTTPS {#dns-https}

- Domen uchun DNS'da A yozuvini serverning public IP manziliga yo'naltiring.
- `web.public_hosts` ga domenni qo'shing.
- Sertifikat: Let's Encrypt (ACME) uchun `web.acme_domain`, `web.acme_email`, `web.listen: ":443"`, `web.redirect_http: ":80"`. Internetdan 80 va 443 portlar serverga yetib borishi shart.
- Linux'da 443 va 80 portlar uchun systemd unit ichidagi `AmbientCapabilities=CAP_NET_BIND_SERVICE` qatorlarini izohdan chiqaring, so'ng `sudo systemctl daemon-reload`.
- Sozlamadan keyin admin panelda **Tashqi manzil** ni `https://<DOMEN>` qilib kiriting.

## Firewall va router {#firewall}

Faqat kerakli portlarni, faqat kerakli manbalarga oching. Firewall'ni butunlay o'chirmang va "hamma portlar" qoidasini qo'shmang.

### Windows Firewall

:::cmd os=windows shell=PowerShell admin=no kind=diag title="Windows: qanday qoidalar qo'shilishini ko'rish (o'zgartirmaydi)"
where: Serverda
does: Qo'shilishi rejalashtirilgan qoidalarni faqat ko'rsatadi. `-Apply` bo'lmagani uchun hech narsa o'zgarmaydi
expect: HTTPS (TCP 8443) va WebRTC (UDP 8189) qoidalari ro'yxati; RTMP uchun ogohlantirish
onerror: Skript topilmasa — yo'lni tekshiring
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\firewall-rules.ps1
```
:::

:::cmd os=windows shell=PowerShell admin=yes kind=setup title="Windows: qoidalarni qo'shish"
where: Serverda, administrator PowerShell
does: HTTPS va WebRTC uchun kiruvchi qoidalarni qo'shadi. RTMP (1935) faqat siz ko'rsatgan pult tarmog'idan ochiladi
expect: "DronStream …" nomli qoidalar paydo bo'ladi
onerror: Administrator huquqi kerak
undo: Alohida kartada (quyida)
```powershell
$PultTarmogi = '<PULT_TARMOGI>'   # masalan 10.8.0.0/24
if ($PultTarmogi -match '[<>]') { throw "Avval <PULT_TARMOGI> o'rniga pult tarmog'ini yozing" }
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\firewall-rules.ps1 -RtmpRemote $PultTarmogi -Apply
```
:::

:::cmd os=windows shell=PowerShell admin=yes kind=undo title="Windows: DronStream qoidalarini olib tashlash"
where: Serverda, administrator PowerShell
does: Faqat "DronStream" nomi bilan boshlanadigan qoidalarni o'chiradi. Boshqa qoidalarga tegmaydi
expect: "DronStream qoidalari olib tashlandi"
onerror: Administrator huquqi kerak
```powershell
powershell -ExecutionPolicy Bypass -File C:\DronStream\scripts\firewall-rules.ps1 -Remove
```
:::

### Ubuntu (ufw)

ufw Ubuntu'da sukut bo'yicha o'chiq bo'ladi. Yoqilgan bo'lsa, kiruvchi ulanishlar sukut bo'yicha rad etiladi.

:::cmd os=linux shell=bash admin=yes kind=diag title="Ubuntu: firewall holatini ko'rish"
where: Serverda
does: ufw yoqilganmi va qanday qoidalar borligini ko'rsatadi. Hech narsani o'zgartirmaydi
expect: "Status: active" va qoidalar ro'yxati, yoki "Status: inactive"
onerror: ufw topilmasa — serverda boshqa firewall ishlatilmoqda; tizim administratoridan so'rang
```bash
sudo ufw status verbose
```
:::

:::note warn
ufw o'chiq bo'lsa, uni yoqishdan **oldin** SSH uchun qoida borligiga ishonch hosil qiling (`sudo ufw allow OpenSSH` yoki SSH portingiz). Aks holda masofaviy ulanishingiz uzilib qolishi mumkin. DronStream skriptlari ufw'ni o'zi yoqmaydi.
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Ubuntu: tomoshabinlar uchun portlarni ochish"
where: Serverda
does: HTTPS (TCP 8443) va WebRTC (UDP 8189) uchun kiruvchi qoida qo'shadi. ufw'ni yoqmaydi
expect: "Rule added" (yoki ufw o'chiq bo'lsa "Rules updated")
onerror: Portlarni sozlamada o'zgartirgan bo'lsangiz, shu raqamlarni yozing
undo: Alohida kartada (quyida)
```bash
sudo ufw allow 8443/tcp comment 'DronStream HTTPS'
sudo ufw allow 8189/udp comment 'DronStream WebRTC'
```
:::

:::cmd os=linux shell=bash admin=yes kind=setup title="Ubuntu: RTMP ni faqat pult tarmog'idan ochish"
where: Serverda
does: TCP 1935 ni faqat ko'rsatilgan tarmoqdan ochadi. RTMP shifrlanmagan — uni butun internetga ochmang
expect: "Rule added"
onerror: Tarmoq noto'g'ri yozilsa ufw xato beradi va hech narsa qo'shilmaydi
undo: Alohida kartada (quyida)
```bash
NET='<PULT_TARMOGI>'   # masalan 10.8.0.0/24
case "$NET" in
  *'<'*) echo "Avval NET ga pult tarmog'ini yozing" ;;
  *) sudo ufw allow from "$NET" to any port 1935 proto tcp comment 'DronStream RTMP' ;;
esac
```
:::

:::cmd os=linux shell=bash admin=yes kind=undo title="Ubuntu: DronStream qoidalarini olib tashlash"
where: Serverda
does: Avval qoidalarni raqamlari bilan ko'rsatadi. O'chirish uchun raqamni o'zingiz tanlaysiz — SSH qoidasini o'chirib yubormang
expect: Raqamlangan ro'yxat; so'ng tanlangan qoida o'chiriladi
onerror: Noto'g'ri raqam tanlasangiz, qoidani qayta qo'shing
```bash
sudo ufw status numbered
# so'ng, 'DronStream' izohli qoida raqamini ko'rib:  sudo ufw delete <RAQAM>
```
:::

### Router

Server router ortida bo'lsa, routerda quyidagilarni server lokal manziliga yo'naltiring: TCP 8443 (yoki 443) va UDP 8189. RTMP (1935) ni internetga yo'naltirmang — pult uchun [[#ingest|himoyalangan yo'l]] tanlang.

## WebRTC va TURN {#turn}

Ko'p hollarda TURN kerak emas: serverda ochiq UDP 8189 bo'lsa, tomoshabin brauzeri unga to'g'ridan-to'g'ri ulanadi.

TURN kerak bo'lishi mumkin bo'lgan holatlar:

- tomoshabin tarmog'i UDP'ni butunlay to'sadi (ba'zi korporativ tarmoqlar);
- tomoshabin qat'iy NAT ortida va to'g'ridan-to'g'ri ulanish o'rnatilmaydi.

Avval yengilroq yechimni sinab ko'ring: `media.webrtc_tcp_listen: ":8189"` (WebRTC'ni TCP orqali ham qabul qilish) va firewall'da TCP 8189 ni oching.

Ichki TURN'ni yoqish (`config/dronstream.yaml`):

```yaml
turn:
  mode: "builtin"
  urls:
    - "turn:<SERVER_PUBLIC_IP>:3478?transport=udp"
    - "turn:<SERVER_PUBLIC_IP>:3478?transport=tcp"
  public_ip: "<SERVER_PUBLIC_IP>"
```

Bunda firewall'da 3478 (UDP va TCP) hamda 50000–50100 (UDP) portlarini ham oching. TURN uchun hisoblar qisqa muddatli va har sessiyaga alohida beriladi; tashqi (begona) TURN xizmati ishlatilmaydi.

## Qabul testi: boshqa internetdan {#qabul-test}

Sinovni server tarmog'idan **tashqaridagi** qurilmada o'tkazing — masalan, Wi-Fi o'chirilgan, mobil internetdagi telefonda. Ikki yo'lni alohida tekshiring.

**Server → brauzer:**

1. `https://<DOMEN>` ochiladi va sertifikat ogohlantirishi chiqmaydi.
2. Login ishlaydi.
3. Demo video o'ynaydi (kamida 2 daqiqa uzluksiz — ijara yangilanishi ham tekshiriladi).
4. Player ostidagi bitreyt va o'lcham ko'rsatkichi o'zgarib turadi.

**Pult → server:**

1. Pult tanlangan yo'l orqali (VPN yoki RTMPS) ulanadi.
2. Admin panelda stream "efirda".
3. Tomoshabinda haqiqiy pult videosi ko'rinadi.

:::cmd os=windows shell=PowerShell admin=no kind=diag title="Windows: tashqaridan TCP port ochiqligini tekshirish"
where: Server tarmog'idan TASHQARIDAGI kompyuterda
does: Serverning TCP 8443 portiga ulanib ko'radi. UDP 8189 ni bu buyruq tekshira olmaydi — uni faqat demo video ko'rsatadi
expect: `TcpTestSucceeded : True`
onerror: False — firewall, router yo'naltirishi yoki CGNAT'ni tekshiring
```powershell
$Server = '<DOMEN_YOKI_IP>'
if ($Server -match '[<>]') { throw "Avval <DOMEN_YOKI_IP> o'rniga server manzilini yozing" }
Test-NetConnection -ComputerName $Server -Port 8443
```
:::

:::cmd os=linux shell=bash admin=no kind=diag title="Linux/macOS: tashqaridan HTTPS javobini tekshirish"
where: Server tarmog'idan TASHQARIDAGI kompyuterda
does: Sog'liq manzilidan javob so'raydi. Sertifikat to'g'ri bo'lsa `-k` kerak emas; `-k` faqat diagnostika uchun
expect: `{"ok":true,"auth":true,"media":true}`
onerror: Sertifikat xatosi — domen va sertifikatni tekshiring. Javob yo'q — port yopiq
```bash
SERVER='<DOMEN_YOKI_IP>'
case "$SERVER" in
  *'<'*) echo "Avval SERVER ga manzilni yozing" ;;
  *) curl "https://$SERVER:8443/api/health" ;;
esac
```
:::

## Pult → server yo'li va uning himoyasi {#ingest}

Oddiy **RTMP shifrlanmagan**. Pult kaliti va video yo'lda ochiq ketadi. Shuning uchun RTMP portini (1935) internetga ochiq qoldirmang.

| Variant | Himoya | Cheklovi | Holati |
|---|---|---|---|
| RTMP + VPN yoki yopiq tarmoq | VPN shifrlaydi | Pult tomonda VPN router yoki VPN'li mobil router kerak | Dasturda tayyor; firewall'da 1935 faqat VPN tarmog'iga ochiladi |
| RTMPS (`rtmps_listen: ":1936"`) | TLS shifrlaydi, VPN kerak emas | Pult RTMPS'ni qo'llashi va server sertifikatini qabul qilishi kerak | Server tomoni tayyor; **DJI pulti bilan tasdiqlanmagan** |
| Ochiq RTMP internet orqali | Yo'q | Kalit va video ochiq ketadi | Tavsiya etilmaydi |

RTMPS haqida halol holat: DJI hujjatlarida DJI Pilot 2 uchun RTMP ko'rsatilgan, RTMPS rasman tasdiqlanmagan (DJI forumidagi eski javobda qo'llanmasligi aytilgan). Pultingiz RTMPS'ni qabul qilishi va sertifikatni tekshirishi **real qurilmada sinab ko'rilmaguncha**, uni tayyor himoyalangan yo'l deb hisoblamang.

Hozircha VPNsiz, amalda ishlaydigan variant: pult yonidagi kichik router yoki noutbuk RTMP'ni qabul qilib, serverga shifrlangan tunnel orqali uzatadi. Tomoshabinlar uchun bu o'zgarishsiz qoladi — ularga VPN kerak emas.

# F. Kundalik boshqaruv {#f}

## Pultlar va sarlavhalar {#f-pult}

**Kontent → Dron pultlari**: yangi stream yaratish, pult manzili va kalitini ko'rish, kalitni almashtirish.

- **Kalitni almashtirish** — eski kalit darhol ishlamay qoladi; pultga yangi manzilni kiritish kerak.
- **Sarlavha** tomoshabinga ko'rinadigan nom; texnik yo'l nomi (manzildagi qism) o'zgarmaydi, shuning uchun sarlavhani o'zgartirish pult sozlamasini buzmaydi.
- Bitta yo'lga bir vaqtda faqat bitta manba ulanadi. Ikkinchisi rad etiladi va admin ogohlantiriladi.

## Media va to'plamlar {#f-media}

**Kontent → Barcha kontent**: matn yozish, rasm va video yuklash, sarlavha va izohni tahrirlash, yashirish, tartiblash.

- Fayl turi kengaytmasiga emas, haqiqiy tarkibiga qarab tekshiriladi. SVG va HTML qabul qilinmaydi.
- Yuklangan fayllar ochiq papkada turmaydi: har bir so'rovda ruxsat tekshiriladi.

**To'plamlar**: kontentni guruhlash. Ruxsat berishda "keyin qo'shilganlar ham" yoki "faqat hozirgi elementlar" tanlanadi.

## Hisoblar va mehmon so'rovlari {#f-hisob}

**Doimiy foydalanuvchilar**: hisob yaratish, parolni tiklash, bloklash, barcha sessiyalaridan chiqarish, ruxsat berish.

**Kirish so'rovlari**: mehmon so'rovini tasdiqlash (qaysi kontent va qancha vaqtga) yoki rad etish. Mehmon kiritgan ism tasdiqlanmagan — ruxsat berishdan oldin u kim ekaniga boshqa yo'l bilan ishonch hosil qiling.

## Maxsus havolalar va QR {#f-havola}

**Maxsus havolalar → + Havola yaratish**. Uch bosqich: kimga va qanday tur → qaysi kontent yoki to'plam → cheklovlar (foydalanish soni, vaqt oralig'i, bir vaqtdagi sessiyalar, sessiya davomiyligi).

**Ulashish / QR** oynasida: havolani nusxalash, QR rasmni nusxalash, PNG yuklab olish, tizim ulashish oynasi. Brauzer rasmni nusxalashni qo'llamasa, dastur buni aytadi va PNG yuklab olishni taklif qiladi.

- QR kod serverning o'zida yasaladi — havola tashqi xizmatga yuborilmaydi.
- **Bekor qilish** — havola va u orqali ochilgan barcha sessiyalar darhol to'xtaydi.
- **Yangilash** — eski havola ishlamay qoladi, yangisi beriladi.
- Vaqtlar Toshkent vaqti bilan ko'rsatiladi.

## Faol sessiyalar {#f-sessiya}

**Faol sessiyalar**: hozir kim nimani ko'rayotgani, qaysi qurilmadan, qancha vaqtdan beri. Bitta video ulanishini uzish yoki butun sessiyani yakunlash mumkin.

## Revoke, bloklash, publish'ni to'xtatish — farqi {#f-farq}

| Amal | Kimga ta'sir qiladi | Nima bo'ladi | Qaytarish |
|---|---|---|---|
| Ruxsatni olib tashlash (revoke) | Bitta odam, bitta kontent | O'sha videosi 1–2 soniyada uziladi, qayta ulanish rad etiladi. Boshqa ruxsatlari qoladi | Ruxsatni qayta berish |
| Foydalanuvchini bloklash | Bitta odam, hamma narsa | Barcha sessiyalari tugaydi, kira olmaydi | Blokdan chiqarish |
| Sessiyani yakunlash | Bitta brauzer sessiyasi | Chiqarib yuboriladi; ruxsati bo'lsa qayta kira oladi | — |
| Tomoshani yopish (stream) | Shu streamni ko'rayotgan hamma | Hech kim ko'ra olmaydi; pult yuborishda davom etadi | Tomoshani ochish |
| Publishni taqiqlash (stream) | Pult | Pult ulanishi uziladi va qayta ulana olmaydi | Publishga ruxsat |
| Manbani uzish | Hozir ulangan pult | Ulanish uziladi; pult qayta ulanishi mumkin | — |
| Favqulodda to'xtatish | Hamma tomoshabin | Barcha video darhol to'xtaydi | O'chirib qo'yish |

Bularning hammasi serverda bajariladi: tugmani yashirish emas, ulanishni uzish.

## Audit, parol, chiqish, favqulodda to'xtatish {#f-audit}

- **Audit va sozlamalar → Audit**: kim qachon kirdi, kimga ruxsat berildi yoki olib tashlandi, qaysi ulanish rad etildi. Yozuvlar belgilangan muddat saqlanadi (sukut bo'yicha 180 kun).
- **Parol**: o'z parolingizni shu bo'limda almashtirasiz.
- **Chiqish**: sessiyani yakunlaydi. Umumiy kompyuterda albatta chiqing.
- **Favqulodda to'xtatish** (Bosh sahifa): barcha tomoshabinlar uchun videoni bir tugma bilan to'xtatadi.
- **?** tugmasi: shu qo'llanmani ochadi.

## Kodni yangilash va serverni yangilash — ikki alohida ish {#f-yangilash}

| Ish | Vosita | Nimaga tegadi |
|---|---|---|
| Kodni kompyuterlar orasida ko'chirish | `push.bat` va `pull.bat` (Git) | Faqat manba kod. Ishlab turgan serverga tegmaydi |
| Ishlab turgan serverni yangi versiyaga o'tkazish | Yangi paket + `update.ps1` yoki `update.sh` | Dastur fayllari; avval backup oladi |
| Ma'lumotni boshqa serverga ko'chirish | Shifrlangan backup va restore | Baza, media, kalitlar |

- `push.bat` yuborishdan oldin fayllar va commitlar tarixini sirlar bo'yicha tekshiradi, majburiy (force) yuborishni ishlatmaydi va oxirida lokal hamda masofaviy holat bir xilligini tekshiradi.
- `pull.bat` lokal o'zgarishlaringizni yo'qotmaydi va yashirmaydi: toza holatda faqat oldinga siljiydi; tarixlar ajralgan bo'lsa to'xtab, sababini aytadi.
- `pull.bat` ishlab turgan server dasturini almashtirmaydi — avval serverni to'xtatishingiz kerakligini aytadi.

# G. Xatolar {#g}

## Sayt ochilmaydi {#x-sayt}

1. Server ishlayaptimi — health-check ([[#xizmat|buyruq]]).
2. Manzil to'g'rimi: `https://` bilan va port bilan (`:8443`).
3. Serverning o'zida `https://localhost:8443` ochiladimi. Ochilsa — muammo tarmoqda yoki firewall'da.
4. Boshqa qurilma shu tarmoqdami; hotspot qurilmalarni bir-biridan ajratmayaptimi.
5. Firewall qoidasi bormi ([[#firewall|Firewall]]).
6. Internetdan bo'lsa: public IP haqiqiymi (CGNAT emasmi), routerda yo'naltirish bormi.

## Sertifikat ogohlantirishi {#x-sert}

- O'z-o'zidan imzolangan sertifikatda bu kutilgan holat.
- "Manzil sertifikatga mos emas" — manzilni `web.public_hosts` ga qo'shing va serverni qayta ishga tushiring.
- Doimiy foydalanish uchun ishonchli sertifikat o'rnating ([[#sertifikat|Sertifikat]]).
- Qurilma soati noto'g'ri bo'lsa ham sertifikat xatosi chiqadi.

## Sahifa bor, video yo'q {#x-video}

Player "Ulanmoqda…" yoki "video kanali ulanmadi" deb tursa, sahifa (TCP) ishlayapti, video yo'li (UDP) ishlamayapti.

1. Firewall'da UDP 8189 ochiqmi.
2. Routerda UDP 8189 yo'naltirilganmi.
3. `media.webrtc_additional_hosts` da tomoshabin ko'radigan manzil (public IP yoki domen) bormi.
4. Tomoshabin tarmog'i UDP'ni to'sadimi — `webrtc_tcp_listen` yoki [[#turn|TURN]] ni sinang.
5. Android'da — [[#x-android|lokal tarmoq ruxsati]].

## Stream efirda emas {#x-offline}

Player "Manba efirda emas (pult ulanmagan)" desa, server ishlayapti, lekin pult video yubormayapti. Player o'zi kutib turadi va pult ulangach davom etadi.

- Pultda jonli efir yoqilganmi va manzil to'g'rimi.
- Kalit almashtirilmaganmi.
- Stream uchun publish yoqilganmi.
- Pult serverga yeta oladimi (VPN, 1935 porti).
- Audit'da rad etilgan ulanish sababi yozilgan bo'ladi.

## "Juda ko'p ulanish" {#x-limit}

Bir odam bir vaqtda ochishi mumkin bo'lgan video oynalari soni cheklangan (sukut bo'yicha 12; `media.max_media_sessions_per_subject`). Xabarda nechta ishlatilgani va chegara ko'rsatiladi, masalan "12/12".

- Boshqa tab yoki qurilmadagi videolarni yoping.
- Shu sahifada keraksiz joylarni "— bo'sh —" qiling.
- So'ng "Qayta urinish"ni bosing.

Efirda bo'lmagan stream joyi va video ulanishining davriy yangilanishi bu hisobga kirmaydi. Chegarani haddan tashqari oshirish server yuklamasini oshiradi.

## Havola tugagan yoki ishlatilgan {#x-havola}

| Xabar | Sababi | Yechim |
|---|---|---|
| Havola ishlatib bo'lingan | Foydalanish soni tugagan | Admin yangi havola beradi yoki sonini oshiradi |
| Havola muddati tugagan | Vaqt oralig'i o'tgan | Admin muddatni uzaytiradi yoki yangisini beradi |
| Havola hali boshlanmagan | Boshlanish vaqti kelmagan | Kuting; vaqt Toshkent vaqti bilan |
| Havola bekor qilingan | Admin bekor qilgan yoki yangilagan | Yangi havolani so'rang |
| Juda ko'p sessiya | Bir vaqtdagi sessiyalar chegarasi | Boshqa qurilmadagi sessiyani yoping |

Ochiq sessiya ichida sahifani yangilash havolani qayta sarflamaydi.

## Port band {#x-port}

Start "Port band" deb to'xtasa, u qaysi port va qaysi dastur ekanini ko'rsatadi. Begona dasturni to'xtatmang. `config/dronstream.yaml` da o'sha portni boshqasiga o'zgartiring (masalan `web.listen: ":9443"`), firewall qoidasini ham moslang.

Agar portni DronStream'ning o'zi band qilgan bo'lsa — u allaqachon ishlab turibdi; ikkinchi nusxa kerak emas.

## Xizmat ishga tushmaydi {#x-xizmat}

Sababni dastur yozadi — taxmin qilmang, logni o'qing.

- Windows: `C:\DronStream\logs\dronstream.log`.
- Linux: `sudo journalctl -u dronstream -n 50 --no-pager`.

| Logdagi sabab | Ma'nosi | Yechim |
|---|---|---|
| port … busy | Port band | "Port band" bo'limiga qarang |
| master.key cannot be unlocked | Kalit boshqa Windows kompyuterga bog'langan | Papkani nusxalamang — backupdan tiklang |
| master.key has mode … | Linux'da kalit fayli huquqi keng | `sudo chmod 600` va egasi xizmat hisobi |
| schema … is newer | Eski dastur yangi bazani ochmoqchi | Yangi versiyani ishga tushiring yoki rollback bilan backupni tiklang |
| mediamtx binary not found | MediaMTX fayli yo'q | Paketni qayta o'rnating |
| config … | Sozlama faylida xato | YAML'ni tekshiring (bo'sh joylar, qo'shtirnoqlar) |

Bazani o'chirish yoki kalit faylini almashtirish muammoni "tuzatmaydi" — ma'lumotni yo'qotadi.

## Git: kirish va konflikt {#x-git}

- **Kirish so'raladi yoki rad etiladi**: Git Credential Manager brauzer orqali GitHub'ga kirishni so'raydi. Parol yoki tokenni faylga, manzilga yoki chatga yozmang.
- **"Remote'da yangi commit bor"** (push): avval `pull.bat`, so'ng `push.bat`. Majburiy yuborish ishlatilmaydi.
- **"Lokal o'zgarishlar bor"** (pull): o'zgarishlaringizni avval `push.bat` bilan saqlang yoki o'zingiz hal qiling. Skript ularni o'chirmaydi va yashirmaydi.
- **Tarixlar ajralgan**: skript to'xtaydi. Bu holatni qo'lda, nima birlashtirilishini ko'rib hal qilish kerak.
- **Push to'xtatildi: sir topildi**: ko'rsatilgan faylni Git'dan chiqaring. Qiymat ekranga chiqarilmaydi.

## Android: lokal tarmoq ruxsati {#x-android}

Android 17 da ilovalar lokal tarmoqdagi manzillarga (192.168.x.x, 10.x.x.x va shu kabi) ulanishi uchun alohida ruxsat talab qilinadi. Bu ruxsat "Yaqin-atrofdagi qurilmalar" (Nearby devices) guruhiga kiradi. U TCP ga ham, UDP ga ham tegishli — ya'ni sahifaga ham, videoga ham.

Belgisi: telefonda lokal manzildagi sayt ochilmaydi yoki ochiladi-yu video ulanmaydi, kompyuterda esa hammasi ishlaydi.

Yechim: telefon sozlamalarida **Ilovalar → Chrome → Ruxsatlar → Yaqin-atrofdagi qurilmalar → Ruxsat berish**. Menyu nomlari va joylashuvi qurilma ishlab chiqaruvchisi va Android versiyasiga qarab farq qilishi mumkin.

- Bu faqat **lokal** manzillarga tegishli. Internetdagi domen orqali kirganda bu ruxsat kerak emas.
- Bu loyihada bitta qurilmada kuzatilgan: Android 17, Chrome 156 — ruxsat berilgach lokal tarmoqda ikki demo video o'ynadi.
- Chrome'ning saytlar uchun alohida "lokal tarmoqqa kirish" so'rovi boshqa narsa: u internetdagi sayt lokal manzilga murojaat qilganda chiqadi.

# Manbalar {#manbalar-qism}

## Tekshirilgan rasmiy manbalar {#manbalar}

Versiyaga bog'liq ma'lumotlar 2026-yil 13-noyabrda quyidagi rasmiy sahifalardan tekshirilgan. Manzillar matn sifatida berilgan — bu sahifa hech qayerga ulanmaydi.

| Mavzu | Manba |
|---|---|
| R570 qo'llab-quvvatlaydigan tizimlar | `dell.com/support/home/en-us/drivers/supportedos/poweredge-r570` |
| iDRAC10 va internetga ulamaslik tavsiyasi | Dell iDRAC10 Security Configuration Guide, "Best practices" |
| Ubuntu LTS muddatlari | `ubuntu.com/about/release-cycle` |
| R570 uchun Ubuntu sertifikati | `ubuntu.com/certified/202503-36549` |
| ufw | `ubuntu.com/server/docs/how-to/security/firewalls` |
| systemd xizmat cheklovlari | `freedesktop.org/software/systemd/man/latest/systemd.exec.html` |
| Android lokal tarmoq ruxsati | `developer.android.com/privacy-and-security/local-network-permission` |
| WebRTC transporti, ICE, STUN, TURN | RFC 8835, RFC 8445, RFC 8489, RFC 8656 |
| MediaMTX WebRTC portlari | `mediamtx.org/docs/usage/webrtc-specific-features` |
| DJI Pilot 2 jonli efir turlari | `developer.dji.com/doc/cloud-api-tutorial` (Pilot livestream) |

To'liq ro'yxat va tasdiqlanmagan bandlar loyihadagi `guide/SOURCES.md` faylida.
