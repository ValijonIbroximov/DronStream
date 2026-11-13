# DronStream — ish jurnali

## Bajarildi
- [2026-11-13] Muhit: Windows 11 Pro, 16 CPU, 32 GB RAM. Node 22.7, Git 2.56 mavjud edi. Go 1.27.4, MediaMTX v1.21.3, FFmpeg (faqat dev) `.tools/` ga yuklandi, SHA256 tekshirildi.
- [2026-11-13] MediaMTX v1.21.3 hujjati (auth, Control API, WebRTC) rasmiy tegdan o'qildi.
- [2026-11-13] Integratsiya tajribasi (spike): RTMP publish `?key=` bilan hook'ga `query` sifatida keladi; WHEP `Authorization: Bearer` → hook `token`; hook `id` = WebRTC sessiya ID; `expireAt` sessiyani aynan vaqtida yopdi; `kick` dan keyin RTP darhol to'xtadi; noto'g'ri token → 401.
- [2026-11-13] Demo test tasvirlar (H.264 baseline, 640×360, 25 fps, GOP 1 s) yaratildi: `backend/internal/demo/assets/`.

## Jarayonda
- Backend yadrosi.

## Keyingi
- Frontend, tarqatish, hujjatlar, testlar.

## Tekshirilmagan (real muhit talab qiladi)
- Real DJI Mavic 3T / Pilot 2 bilan RTMP/RTMPS.
- Tashqi internet, NAT/CGNAT, TURN real tarmoqda.
- Toza Windows kompyuterda o'rnatish.
