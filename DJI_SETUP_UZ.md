# DJI pultni ulash (Mavic 3T / DJI Pilot 2) va real qurilmada sinov yo'riqnomasi

> **Holat: real DJI qurilmasida SINALMAGAN.** Quyidagi qadamlar DronStream/MediaMTX ning RTMP/RTMPS qabul qilish mexanizmiga asoslangan (FFmpeg RTMP manbasi bilan sinalgan). Pult ilovasining aynan sizdagi firmware versiyasida RTMPS, sertifikat tekshiruvi yoki URL dagi `?key=` qo'llab-quvvatlanishi **kafolatlanmaydi** — 4-bo'limdagi sinovni bajarib, natijani yozib qo'ying.

## 1. Ikki yo'l: qaysini tanlash
| Yo'l | Shifrlash | Qachon |
|---|---|---|
| **A. RTMPS** (`rtmps://domen:1936/...`) | TLS (pult → server) | Pult RTMPS ni qo'llasa **va** server sertifikati pult ishonadigan CA dan bo'lsa |
| **B. RTMP + VPN** (`rtmp://10.8.0.1:1935/...`) | VPN tunnel shifrlaydi | Pult faqat RTMP yuborsa yoki RTMPS sertifikat tekshiruvidan o'tmasa |

**Hech qachon** shifrlanmagan RTMP ni ochiq internet orqali yubormang: kalit va video ochiq ketadi.

## 2. Server tomoni
### A. RTMPS
```yaml
# config\dronstream.yaml
media:
  rtmps_listen: ":1936"
  publish_host: "stream.example.uz"     # sertifikatdagi domen
```
- `config\secrets\tls.crt` (to'liq zanjir) va `tls.key` — **ishonchli CA** sertifikati bo'lishi kerak (o'z-o'zidan imzolangan sertifikatni pult rad etishi ehtimoli katta).
- Firewall: `firewall-rules.ps1 -RtmpsPort 1936 -Apply`.

### B. RTMP + VPN (OpenVPN bilan)
- Mavjud OpenVPN serveringizdan foydalanish mumkin. Masalan VPN tarmog'i `10.8.0.0/24`, DronStream serverining VPN manzili `10.8.0.1` (server o'zi OpenVPN server bo'lishi yoki OpenVPN mijozi sifatida shu tarmoqqa ulangan bo'lishi mumkin).
```yaml
media:
  rtmp_listen: "10.8.0.1:1935"   # FAQAT VPN interfeysida tinglaydi
  publish_host: "10.8.0.1"
```
- Agar VPN interfeysi DronStream dan keyin ko'tarilsa, `10.8.0.1` ga bog'lanib bo'lmaydi va MediaMTX ishga tushmaydi — VPN ni avval ishga tushiring yoki `":1935"` qo'yib firewall bilan cheklang: `firewall-rules.ps1 -RtmpRemote 10.8.0.0/24 -Apply`.
- **VPN uzilsa trafik ochiq internetga chiqmasligi**: pultdagi URL da **faqat VPN ichki IP** si (`10.8.0.1`) yoziladi. Bu manzil internetda yo'naltirilmaydi, shuning uchun VPN uzilganda pult ulana olmaydi — ochiq internetga hech narsa ketmaydi. Pult URL iga public IP yoki domen yozmang.
- **UDP yoki TCP**: OpenVPN UDP varianti faqat server UDP ni qo'llasa va tarmoq UDP ni o'tkazsa ishlaydi — real tarmoqda sinang; ishlamasa TCP (`proto tcp`).
- Pultning o'zida VPN: DJI RC Pro / RC Plus (Android asosida) da uchinchi tomon VPN ilovasini o'rnatish imkoniyati firmware ga bog'liq va **tekshirilmagan**. Muqobil: VPN mijozli mobil router / Wi-Fi hotspot (masalan OpenVPN mijozli GL.iNet kabi), pult shu Wi-Fi ga ulanadi. Routerda "kill-switch" (VPN uzilsa internetni bloklash) yoqilsin.
- DronStream yangi tarmoq protokoli yoki shifrlash yaratmaydi; paket yo'qolishi, jitter yoki kanal yetishmasligini avtomatik bartaraf etmaydi.

## 3. Pultga kiritish (DJI Pilot 2)
1. Admin panel → Streamlar → kerakli stream → **Pult URL va kalit** → URL ni nusxalang.
2. DJI Pilot 2: *Live Stream* / *Jonli efir* → *RTMP* (custom). Menyu nomlari firmware ga qarab farq qiladi.
3. URL maydoniga to'liq URL ni kiriting, masalan:
   - query: `rtmp://10.8.0.1:1935/live/mavic1?key=AbCd...`
   - path:  `rtmp://10.8.0.1:1935/live/mavic1/AbCd...`
4. Agar ilova "Server URL" va "Stream key" ni alohida so'rasa: odatda server = `rtmp://10.8.0.1:1935/live`, key = `mavic1?key=AbCd...` (query) yoki `mavic1/AbCd...` (path). Ilova ularni `/` bilan birlashtiradi — sinab ko'ring.
5. Tavsiya etilgan video: H.264, 1080p yoki 720p, 2–6 Mbit/s. **H.265 brauzerlarda WebRTC orqali ko'pincha ishlamaydi**; pultda H.264 tanlang. B-kadrlar bo'lsa ba'zi brauzerlar ko'rsatmasligi mumkin.
6. Pultning AAC ovozi WebRTC orqali uzatilmaydi (brauzer AAC ni WebRTC da qo'llamaydi) — faqat video.

## 4. Real qurilmada sinov protokoli (bajarib natijani yozing)
| # | Sinov | Kutilgan natija | Natija (sana, firmware) |
|---|---|---|---|
| 1 | Pult firmware va DJI Pilot 2 versiyasini yozib oling | — | |
| 2 | RTMP + VPN, query URL bilan publish | Admin panelda "efirda", kodek H264 | |
| 3 | Agar 2 ishlamasa: path URL bilan | "efirda" | |
| 4 | Noto'g'ri kalit bilan (1 belgini o'zgartiring) | Pult ulana olmaydi; auditda `publish_denied bad_key` | |
| 5 | VPN ni o'chirib publish | Ulanmaydi; server logida hech narsa yo'q; internetga trafik yo'q (routerda tekshiring) | |
| 6 | RTMPS (CA sertifikat bilan) | "efirda", manba turi `rtmpsConn` | |
| 7 | RTMPS, o'z-o'zidan imzolangan sertifikat bilan | Pult **rad etishi kerak** (sertifikat tekshiruvi ishlayotganini ko'rsatadi). Agar ulansa — pult sertifikatni tekshirmayapti, RTMPS ga tayanmang, VPN ishlating | |
| 8 | Ikkinchi qurilma bilan bir xil URL | Ikkinchisi rad, birinchisi davom etadi | |
| 9 | Admin "Kalitni almashtirish" | Pult uziladi, eski URL bilan qayta ulana olmaydi | |
| 10 | Kechikish: pult ekranidagi soat va brauzer orasidagi farq | O'lchang (odatda 0.5–2 s, kafolat yo'q) | |
| 11 | 30 daqiqa uzluksiz efir; bitrate va xatoli kadrlar | Admin statistikasidan yozing | |
| 12 | Mobil internet uzilib-ulanishi | Pult qayta ulanishi ≤ ~10–15 s | |

## 5. Muammolar
| Belgi | Sabab / yechim |
|---|---|
| Pult "connection failed" | VPN ulanganmi? `rtmp_listen` IP to'g'rimi? Firewall? `logs\mediamtx.log` |
| Auditda `publish_denied bad_key` | URL/kalit noto'g'ri yoki almashtirilgan — admin paneldan qayta nusxalang |
| `wrong_url_form` | Stream URL turi (query/path) pultga kiritilgan URL bilan mos emas |
| `publish_rejected_busy` | Shu yo'lda boshqa manba ulangan — "Manbani uzish" |
| "efirda", lekin brauzerda qora ekran | Pult H.265 yuborayapti yoki B-kadrlar — pultda H.264 tanlang |
