# DJI pultni ulash (Mavic 3T / DJI Pilot 2) va haqiqiy qurilmada sinov yo'riqnomasi

> **Holat: haqiqiy DJI qurilmasida SINALMAGAN.** Quyidagi qadamlar DronStream/MediaMTX ning RTMP/RTMPS qabul qilish mexanizmiga asoslangan (FFmpeg RTMP manbasi bilan sinalgan). Pult ilovasining aynan sizdagi versiyasida RTMPS, sertifikat tekshiruvi yoki URL dagi `?key=` qo'llanishi **kafolatlanmaydi** — 5-bo'limdagi sinovni bajarib, natijani yozib qo'ying.
>
> **Secure (production) rejimda haqiqiy pultni ulashning tasdiqlangan yo'li hali yo'q.** Sabablari va variantlar: [SECURITY_MODEL.md](SECURITY_MODEL.md) 4- va 6-bo'limlar.

## 1. Yo'llar: qaysi biri qachon

| Yo'l | Pult → server shifrlanishi | Rejim | Holat |
|---|---|---|---|
| **A. RTMPS** (`rtmps://<DOMEN>:1936/...`) | TLS | secure | Server tomoni tayyor. Pult RTMPS'ni qo'llashi va sertifikatni tekshirishi **tasdiqlanmagan** (DJI rasmiy hujjatlarida faqat RTMP, RTSP, GB28181, Agora ko'rsatilgan) |
| **B. Shifrlangan tunnel + serverdagi gateway** | Tunnel (VPN) | secure | Tunnel server kompyuterida tugaydi va oqim `127.0.0.1` ga yo'naltiriladi. Qo'shimcha sozlash/dastur kerak; bu loyihada **sinalmagan** |
| **L. Oddiy RTMP** (`rtmp://<IP>:1935/...`) | **Yo'q** | faqat laboratoriya (`standard`) | Stend sinovi uchun. Haqiqiy operativ video uchun emas |

**Xususiy IP — shifrlash emas.** `10.x`, `192.168.x`, `100.64.x` kabi manzildagi oddiy RTMP'ni shu tarmoqdagi (Wi-Fi, LAN yoki VPN ichidagi) har qanday qurilma o'qiy oladi: video ham, pult kaliti ham ochiq ketadi. Shuning uchun secure rejimda `rtmp_listen` faqat bo'sh yoki `127.0.0.1` bo'lishi mumkin; boshqa manzil bilan dastur ishga tushmaydi.

Hech bir yo'l videoni **serverdan** yashirmaydi: server uni ochiq ko'radi (SECURITY_MODEL.md, C variant).

## 2. Server tomoni

### A. RTMPS

```yaml
# config\dronstream.yaml
media:
  rtmp_listen: ""
  rtmps_listen: ":1936"
  publish_host: "<DOMEN>"     # sertifikatdagi nom
security:
  mode: "secure"
```

- `config\secrets\tls.crt` (to'liq zanjir) va `tls.key` — **ishonchli CA** sertifikati bo'lishi kerak (o'z-o'zidan imzolangan sertifikatni pult rad etishi kerak — 5-bo'lim, 7-sinov).
- Firewall: `firewall-rules.ps1 -RtmpsPort 1936 -Apply`.
- RTMPS ishlamasa dastur o'zi RTMP'ga o'tmaydi. Pultning o'zi shunday qiladimi — tekshirilmagan; shuning uchun `rtmp_listen` bo'sh qoladi.

### B. Shifrlangan tunnel + serverdagi gateway (sinalmagan sxema)

Tamoyil: VPN tunnel **DronStream serverining o'zida** tugaydi; tunnel interfeysiga kelgan TCP ulanish shu kompyuterdagi `127.0.0.1:1935` ga yo'naltiriladi; DronStream esa faqat loopback'da tinglaydi.

```yaml
media:
  rtmp_listen: "127.0.0.1:1935"
  publish_host: "<VPN_IP>"      # pult URL ida ko'rinadigan manzil (tunnel ichidagi server manzili)
security:
  mode: "secure"
```

Yo'naltirish operatsion tizim vositasi bilan qilinadi (DronStream tarkibiga kirmaydi). Namuna — **bu loyihada sinalmagan**, o'z tarmog'ingizda tekshiring:

```powershell
# Windows, Administrator. <VPN_IP> - serverning tunnel ichidagi manzili
netsh interface portproxy add v4tov4 listenaddress=<VPN_IP> listenport=1935 connectaddress=127.0.0.1 connectport=1935
# Bekor qilish:
netsh interface portproxy delete v4tov4 listenaddress=<VPN_IP> listenport=1935
```

Ishonch chegarasi (to'liq: SECURITY_MODEL.md 4.2):

1. Tunnel haqiqatan shifrlanganini DronStream **tekshirmaydi** — bu sizning mas'uliyatingiz.
2. Tunnel qayerdan boshlansa, undan oldingi bo'lak ochiq. Pultda VPN ilovasi bo'lmasa va tunnel pult yonidagi routerdan boshlansa, **pult ↔ router** oralig'ida RTMP ochiq ketadi: bu ulanishda faqat pult va router bo'lsin (alohida tarmoq yoki kabel), umumiy Wi-Fi ishlatilmasin.
3. Tunnel ichidagi boshqa qurilmalar ham `<VPN_IP>:1935` ga yeta oladi: tunnel a'zolarini cheklang.
4. Pult URL iga faqat tunnel ichidagi manzil yoziladi (ommaviy IP yoki domen emas), shunda tunnel uzilganda pult ulana olmaydi va ochiq internetga hech narsa ketmaydi. Routerda "kill-switch" yoqilsin.
5. Pultning o'ziga VPN ilovasini o'rnatish imkoniyati tekshirilmagan.

### L. Laboratoriya: oddiy RTMP

```yaml
media:
  rtmp_listen: "<STEND_IP>:1935"
  publish_host: "<STEND_IP>"
security:
  mode: "standard"     # laboratoriya rejimi - production emas
```

- Admin panel har sahifada "Laboratoriya rejimi — production emas" deb ogohlantiradi, xavfsizlik holatida oddiy RTMP "buzilgan" deb ko'rsatiladi.
- Faqat alohida ajratilgan sinov tarmog'ida va haqiqiy operativ videosiz ishlating.
- Firewall bilan manbani cheklash: `firewall-rules.ps1 -RtmpRemote <TARMOQ>/24 -Apply`.

DronStream yangi tarmoq protokoli yoki shifrlash yaratmaydi; paket yo'qolishi, jitter yoki kanal yetishmasligini avtomatik bartaraf etmaydi.

## 3. Pultga kiritish (DJI Pilot 2)

1. Admin panel → Kontent → Dron pultlari → kerakli stream → **Pult sozlamasi** → URL ni nusxalang (bu amal parolni qayta tasdiqlashni so'rashi mumkin).
2. DJI Pilot 2: *Live Stream* / *Jonli efir* → *RTMP* (custom). Menyu nomlari versiyaga qarab farq qiladi.
3. URL maydoniga to'liq URL ni kiriting, masalan:
   - query: `rtmp://<MANZIL>:1935/live/mavic1?key=<KALIT>`
   - path:  `rtmp://<MANZIL>:1935/live/mavic1/<KALIT>`
4. Agar ilova "Server URL" va "Stream key" ni alohida so'rasa: odatda server = `rtmp://<MANZIL>:1935/live`, key = `mavic1?key=<KALIT>` (query) yoki `mavic1/<KALIT>` (path). Ilova ularni `/` bilan birlashtiradi — sinab ko'ring.
5. Tavsiya etilgan video: H.264, 1080p yoki 720p, 2–6 Mbit/s. **H.265 brauzerlarda WebRTC orqali ko'pincha ishlamaydi**; pultda H.264 tanlang. B-kadrlar bo'lsa ba'zi brauzerlar ko'rsatmasligi mumkin.
6. Pultning AAC ovozi WebRTC orqali uzatilmaydi (brauzer AAC ni WebRTC da qo'llamaydi) — faqat video.

## 4. Sinovdan oldin yozib olinadigan ma'lumotlar

Bular noma'lum va taxmin qilinmagan; ularsiz to'g'ri yo'lni tanlab bo'lmaydi (to'liq ro'yxat: SECURITY_MODEL.md 6.5):

1. Pultning aniq modeli (yorliqdagi model raqami) va firmware versiyasi.
2. Dron modeli va firmware versiyasi.
3. DJI Pilot 2 versiyasi.
4. Pilot 2 jonli efir menyusidagi turlar (RTMP, RTSP, GB28181, boshqa); `rtmps://` manzili qabul qilinadimi.
5. Pultga o'z ilovangizni o'rnatish va Pilot 2 o'rniga boshqa ilova bilan uchish mumkinmi.
6. Pult yonida qo'shimcha qurilma ishlatish mumkinmi; pultda HDMI chiqishi bormi.
7. Dala sharoitidagi aloqa turi (LTE, Wi-Fi, boshqa) va VPN.

## 5. Haqiqiy qurilmada sinov protokoli (bajarib natijani yozing)

| # | Sinov | Kutilgan natija | Natija (sana, versiyalar) |
|---|---|---|---|
| 1 | 4-bo'limdagi ma'lumotlarni yozib oling | — | |
| 2 | Laboratoriya rejimi, ajratilgan tarmoq: RTMP, query URL bilan publish | Admin panelda "efirda", kodek H264 | |
| 3 | Agar 2 ishlamasa: path URL bilan | "efirda" | |
| 4 | Noto'g'ri kalit bilan (1 belgini o'zgartiring) | Pult ulana olmaydi; auditda `publish_denied bad_key` | |
| 5 | RTMPS (CA sertifikat bilan), secure rejim | "efirda", manba turi `rtmpsConn` | |
| 6 | RTMPS manzili noto'g'ri portga yoki RTMPS o'chiq holatda | Pult ulanmaydi va **oddiy RTMP'ga o'zi o'tmaydi** (tarmoqda 1935 ga urinish yo'qligini routerda tekshiring) | |
| 7 | RTMPS, o'z-o'zidan imzolangan sertifikat bilan | Pult **rad etishi kerak**. Ulansa — pult sertifikatni tekshirmayapti: RTMPS faqat passiv kuzatuvchidan himoya qiladi | |
| 8 | RTMPS, boshqa nomga berilgan yoki muddati o'tgan sertifikat | Pult rad etishi kerak | |
| 9 | Ikkinchi qurilma bilan bir xil URL | Ikkinchisi rad, birinchisi davom etadi | |
| 10 | Admin "Kalitni almashtirish" | Pult uziladi, eski URL bilan qayta ulana olmaydi | |
| 11 | B sxema (tunnel + gateway): tunnelni o'chirib publish | Ulanmaydi; ochiq internetga trafik yo'q (routerda tekshiring) | |
| 12 | Kechikish: pult ekranidagi soat va brauzer orasidagi farq | O'lchang (kafolat yo'q) | |
| 13 | 30 daqiqa uzluksiz efir; bitrate va xatoli kadrlar | Admin statistikasidan yozing | |
| 14 | Mobil internet uzilib-ulanishi | Pult qayta ulanish vaqtini yozing | |

## 6. Muammolar

| Belgi | Sabab / yechim |
|---|---|
| Server ishga tushmaydi: `security.mode=secure: media.rtmp_listen ...` | Secure rejimda oddiy RTMP faqat `127.0.0.1` da yoki o'chiq bo'ladi. A yoki B yo'lni tanlang; stend sinovi uchun `security.mode: standard` |
| Pult "connection failed" | Manzil va port to'g'rimi? Tunnel ulanganmi? Firewall? `logs\mediamtx.log` |
| Auditda `publish_denied bad_key` | URL/kalit noto'g'ri yoki almashtirilgan — admin paneldan qayta nusxalang |
| `wrong_url_form` | Stream URL turi (query/path) pultga kiritilgan URL bilan mos emas |
| `publish_rejected_busy` | Shu yo'lda boshqa manba ulangan — "Manbani uzish" |
| "efirda", lekin brauzerda qora ekran | Pult H.265 yuborayapti yoki B-kadrlar — pultda H.264 tanlang |
