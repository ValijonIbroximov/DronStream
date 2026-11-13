# Qo'llanma uchun tekshirilgan rasmiy manbalar (2026-11-13)

Bu ro'yxat `guide/src` dagi qo'llanma va `SERVER_INSTALL_UZ.md` dagi versiyaga bog'liq da'volar qaysi rasmiy
sahifadan olinganini ko'rsatadi. "Tasdiqlangan" = sahifa ochib o'qilgan. Tasdiqlanmagan narsa qo'llanmada fakt sifatida yozilmaydi.

## Dell PowerEdge R570
- Dell qo'llab-quvvatlaydigan OS ro'yxati: Windows Server 2022 LTSC va 2025 LTSC; Ubuntu Server 24.04 (U3) va 26.04 LTS; RHEL 9 va 10; SLES 15 va 16; VMware ESXi 8.0, 9.0, 9.1 U1. — https://www.dell.com/support/home/en-us/drivers/supportedos/poweredge-r570
- 2U, bitta soket, Intel Xeon 6 (E-core 144 tagacha yoki P-core 86 tagacha yadro). Ubuntu ISO: amd64. — https://www.delltechnologies.com/assetlink/doc/en-us/poweredge-r570-spec-sheet-en-dl1m4e7-original.pdf
- Orqa panelda alohida "1 Gb dedicated BMC Ethernet port"; boshqaruv kontrolleri iDRAC10, OS'ga bog'liq emas. — https://www.dell.com/support/manuals/en-us/poweredge-r570/idrac10_1.20.xx_ug/overview-of-idrac
- iDRAC10 zavoddan DHCP va "Dedicated" NIC bilan keladi; foydalanuvchi root, paroli tizim yorlig'ida. — https://www.dell.com/support/kbdoc/en-us/000374138/set-up-idrac10-ip-address-and-log-in-to-idrac10
- Dell: "The iDRAC is not designed nor intended to be placed on, nor connected directly to the Internet"; alohida, firewall bilan himoyalangan boshqaruv tarmog'i tavsiya etiladi. — https://www.dell.com/support/manuals/en-us/idrac10-lifecycle-controller-v1-xx-series/idrac10_1.xx_scg/best-practices
- TASDIQLANMAGAN: R570 Technical Guide PDF (hajmi katta, o'qilmadi).

## Ubuntu Server
- Standart qo'llab-quvvatlash: 24.04 LTS — 2029-yil may; 26.04 LTS — 2031-yil may. — https://ubuntu.com/about/release-cycle
- 26.04.1 LTS chiqqan (`ubuntu-26.04.1-live-server-amd64.iso`). — https://releases.ubuntu.com/resolute/
- Canonical R570 ni 26.04 LTS va 24.04 LTS uchun sertifikatlagan (Xeon 6787P va 6780E konfiguratsiyalari; 26.04: BIOS 1.8.5 / 1.9.4, 24.04: BIOS 1.2.6). — https://ubuntu.com/certified/202503-36549 , https://ubuntu.com/certified/202503-36566
- Tanlangan Linux yo'li: **Ubuntu Server 26.04 LTS (amd64)**; teng sertifikatlangan zaxira: 24.04 LTS (24.04.3+).
- ufw: Ubuntu'ning standart firewall vositasi, boshida o'chiq; `sudo ufw enable`, `sudo ufw allow 22`, `sudo ufw status verbose`, `sudo ufw app list`. — https://ubuntu.com/server/docs/how-to/security/firewalls/
- `ufw allow 80/tcp` shakli; standart: kiruvchi rad, chiquvchi ruxsat; qoidalar yoqishdan oldin qo'shilishi mumkin; yoqish mavjud SSH ulanishini uzishi mumkin. — https://manpages.ubuntu.com/manpages/noble/en/man8/ufw.8.html
- `OpenSSH` ufw profili (22/tcp) openssh-server bilan keladi. — https://git.launchpad.net/ubuntu/+source/openssh/plain/debian/openssh-server.ufw.profile?h=ubuntu/noble
- systemd: `NoNewPrivileges=`, `ProtectSystem=strict`, `ProtectHome=`, `PrivateTmp=`, `ReadWritePaths=`, `UMask=`, `User=`, `AmbientCapabilities=`. — https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- `KillMode=` control-group (standart) | mixed | process | none. — https://www.freedesktop.org/software/systemd/man/latest/systemd.kill.html
- `CAP_NET_BIND_SERVICE`: 1024 dan kichik portlarga bog'lanish. — https://man7.org/linux/man-pages/man7/capabilities.7.html
- `useradd --system` (uy papkasiz tizim hisobi); `adduser --system --group` (shell `/usr/sbin/nologin`). — https://manpages.ubuntu.com/manpages/noble/en/man8/useradd.8.html , https://manpages.ubuntu.com/manpages/noble/en/man8/adduser.8.html

## Android va Chrome: lokal tarmoq
- Android 17 (API 37): SDK 37+ ni nishonlagan ilovalar uchun lokal tarmoq himoyasi majburiy; ruxsat `ACCESS_LOCAL_NETWORK`, `NEARBY_DEVICES` guruhida; lokal manzillarga TCP va UDP ni qamraydi; internetga ta'sir qilmaydi. Yo'l: Settings > Apps > [ilova] > Permissions > Nearby devices > Allow. — https://developer.android.com/privacy-and-security/local-network-permission
- Android 16 da bu faqat ixtiyoriy (opt-in) edi.
- Chromium xatosi (Google ochgan): Android 17 da RFC1918 manzillarga yetish uchun ruxsat kerak, aks holda `ERR_LOCAL_NETWORK_PERMISSION_MISSING`. Bu xato hisoboti, mahsulot hujjati emas. — https://issues.chromium.org/issues/576047781
- TASDIQLANMAGAN: Chrome yordam sahifasida "Yaqin-atrofdagi qurilmalar" so'rovi tavsifi; USB tethering haqida Android hujjati; ishlab chiqaruvchilar bo'yicha menyu nomlari farqi.
- Chrome'ning alohida saytga xos "Local network access" ruxsati (Chrome 142+): ommaviy sayt lokal manzilga so'rov yuborganda; sahifaning o'zi xususiy IP da bo'lib xususiy IP ga murojaat qilsa qo'llanmaydi. — https://developer.chrome.com/release-notes/142 , https://wicg.github.io/local-network-access/

## WebRTC
- Media HTTPS dan alohida: ICE orqali secure RTP, asosan UDP; ICE-TCP va TURN (TCP/TLS) zaxira. — https://www.rfc-editor.org/rfc/rfc8835.html
- ICE — NAT'dan o'tish protokoli (STUN va TURN dan foydalanadi). — https://www.rfc-editor.org/rfc/rfc8445.html
- STUN — NAT bergan tashqi manzil/portni aniqlaydi. — https://www.rfc-editor.org/rfc/rfc8489.html
- TURN — NAT ortidagi xost uchun relay; ikkala tomon ham "yaxshi ishlamaydigan" NAT ortida bo'lsa teshik ochish ishlamaydi. — https://www.rfc-editor.org/rfc/rfc8656.html
- MediaMTX: 8889/TCP (signalling), 8189/UDP (media); TCP media ixtiyoriy. — https://mediamtx.org/docs/usage/webrtc-specific-features
- Faqat qabul qilish uchun kamera/mikrofon ruxsati kerak emas (`addTransceiver(..., {direction: 'recvonly'})`). — https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTransceiver
- TASDIQLANMAGAN: "CGNAT odatda TURN talab qiladi" degan rasmiy manba (qo'llanmada ehtimol sifatida yoziladi).

## DJI
- DJI Pilot 2 jonli efir turlari: Agora, RTMP, RTSP, GB28181; RTMP bitta URL oladi. — https://developer.dji.com/doc/cloud-api-tutorial/en/feature-set/pilot-feature-set/pilot-livestream.html
- RTMPS: rasmiy qo'llab-quvvatlash TASDIQLANMAGAN. Faqat DJI forumi administratori javobi bor (2024-05-27, Mavic 3T): "DJI Pilot/DJI Pilot 2 doesn't support RTMPS live streams" — forum xabari, qo'llanma emas, eskirgan bo'lishi mumkin. — https://forum.dji.com/thread-309646-1-1.html
