# DronStream — E2EE PoC (SFrame + HPKE)

Bu papka **alohida tajriba (proof of concept)**. U DronStream mahsulotining qismi emas, mahsulot kodiga ulanmagan va mahsulotga hech narsa qo'shmaydi. Maqsad bitta savolga halol javob berish:

> «Manba simulyatori → kalitsiz relay → brauzer» zanjiri **mavjud standartlar** bilan (o'zimiz o'ylab topgan kriptografiyasiz) ishlay oladimi va bunda relay videoni ochiq ko'rmaydimi?

Qisqa javob: avtomatik testlar doirasida — **ha, ishlaydi**; lekin quyidagi «Nimani isbotlaMAYDI» bo'limidagi cheklovlar bilan. Bu DJI qurilmalarida ishlashini **anglatmaydi** va production uchun tayyor yechim **emas**.

```
 manba simulyatori                 relay (kalitsiz)                    tomoshabin
 cmd/source                        cmd/relay                           viewer/ (brauzer) yoki cmd/receiver (Go)
 ───────────────                   ────────────────                    ──────────────────────────────
 H.264 kadr (ochiq)                                                    P-256 kalit juftligi (WebCrypto,
        │ SFrame (RFC 9605)                                            yopiq kalit eksport qilinmaydi)
        ▼                                                                      │ ochiq kalit (join so'rovi)
 shifrlangan kadr ───────────────► faqat baytlarni uzatadi ───────────► SFrame bilan ochish
                                   (kalit yo'q, kripto kodi yo'q)              ▲
 epoch kaliti ── HPKE (RFC 9180) ─► «konvert»ni saqlaydi/uzatadi ──────► HPKE bilan ochish
        ▲                                                                      │
        └────── operator barmoq izini ALOHIDA kanal orqali solishtiradi ◄──────┘

 viewerhost (cmd/viewerhost) — tomoshabin sahifasini beradigan ALOHIDA manzil (origin); relay sahifa bermaydi.
```

## 1. Ishlatilgan standartlar

| Vazifa | Standart | Amalga oshirish |
|---|---|---|
| Kadrlarni shifrlash | **SFrame, RFC 9605** — sarlavha, `sframe_key`/`sframe_salt` hosil qilish (HKDF), nonce, AAD, AES-GCM | O'zimiz yozgan kod: Go (`sframe/sframe.go`) va JS (`viewer/src/sframe.js`). Shifr to'plamlari: `AES_128_GCM_SHA256_128` (0x0004) va `AES_256_GCM_SHA512_128` (0x0005, sukut bo'yicha). AES-CTR-HMAC to'plamlari (0x0001–0x0003) **yozilmagan**. |
| Kalitni har bir tasdiqlangan tomoshabinga yetkazish | **HPKE, RFC 9180**, base mode, DHKEM(P-256, HKDF-SHA256) + HKDF-SHA256 + AES-256-GCM | Go: standart kutubxona `crypto/hpke`. Brauzer: `@hpke/core` 1.10.1 (npm, aniq versiya, `package-lock.json`da integrity xeshi bilan). HPKE'ni o'zimiz yozmaganmiz. |
| Primitivlar | HKDF (RFC 5869), AES-GCM, ECDH P-256, SHA-256/512 | Go standart kutubxonasi; brauzerda WebCrypto. |
| Guruh a'zoligi va epoch'lar uchun to'g'ri production standarti | **MLS, RFC 9420** | **Ishlatilmagan.** Bu PoC soddaroq kompozitsiyadan foydalanadi: «jo'natuvchi kaliti har bir qabul qiluvchiga HPKE bilan alohida muhrlanadi». Bu standart primitivlarning kompozitsiyasi, **audit qilingan protokol emas**. |

Go tomonida tashqi bog'liqlik yo'q (`go.mod`da `require` yo'q). JS tomonida ishlash vaqtidagi yagona bog'liqlik — `@hpke/core` (u `@hpke/common` 1.13.0 ni tortadi); `esbuild` 0.25.12 faqat yig'ish uchun.

## 2. Qanday ishlaydi

1. **Epoch va kalit.** Manba har bir epoch uchun 32 baytli tasodifiy `base_key` yaratadi. SFrame `KID` = epoch raqami. Har bir kadr uchun `CTR` 0 dan boshlab bittadan oshadi, ya'ni (KID, CTR) juftligi takrorlanmaydi.
2. **Kadr.** Har bir H.264 access unit (Annex-B) butunligicha SFrame bilan shifrlanadi. SFrame «metadata» (AAD ga kiradi, uzatilmaydi) — stream identifikatori, shuning uchun bir stream kadri boshqasida tasdiqdan o'tmaydi.
3. **Qo'shilish.** Tomoshabin P-256 kalit juftligini yaratadi (brauzerda yopiq kalit `extractable: false`), ochiq kalitini relay orqali yuboradi va **barmoq izini** ko'rsatadi: ochiq kalitning (65 bayt, siqilmagan) SHA-256 qiymati, to'liq 64 ta hex belgi, 4 tadan 16 guruh. Manba aynan shu satrni chop etadi.
4. **Tasdiqlash.** Operator barmoq izini tomoshabin bilan **alohida kanal** orqali (ovoz, yuzma-yuz) solishtiradi va `approve <barmoq izi>` buyrug'ini beradi. Manba joriy epoch `base_key`ini shu ochiq kalitga HPKE bilan muhrlaydi. HPKE `info` parametri stream id + epoch + SFrame to'plami + qabul qiluvchi barmoq izini bog'laydi: konvertdagi ochiq maydonlardan birortasi o'zgartirilsa, u ochilmaydi.
5. **Bekor qilish = yangi epoch.** `revoke <barmoq izi>`: yangi tasodifiy `base_key`, faqat qolgan a'zolarga muhrlanadi; shundan keyingi kadrlar yangi KID bilan ketadi. Bekor qilingan tomoshabin yangi kalitni olmaydi.
6. **Qabul qilish qoidalari** (SFrame ularni ilovaga qoldiradi, RFC 9605 §9.1, §9.3): bitta KID ichida CTR qat'iy o'sishi shart (aks holda — replay, rad etiladi); epoch faqat oldinga yuradi; hisoblagich va epoch faqat autentifikatsiyadan o'tgan kadr bilan siljiydi.

Relay API (oddiy HTTP, faqat `127.0.0.1`): `internal/relay/relay.go` boshidagi izohda. Relay uchun kadr ham, konvert ham — ma'nosiz baytlar.

## 3. PoC nimani isbotlaydi (va qaysi test bilan)

| Da'vo | Test |
|---|---|
| Go va JS SFrame kodi RFC 9605 ning **rasmiy test vektorlari**ga mos: sarlavha (289 tadan 289 tasi), kalit hosil qilish (label, `sframe_secret`, `sframe_key`, `sframe_salt`), nonce, AAD, shifrlash va ochish — AES-GCM to'plamlari (4 va 5) uchun | Go: `TestRFC9605HeaderVectors`, `TestRFC9605SFrameVectors`. Node: «RFC 9605 header vectors…», «RFC 9605 SFrame vectors…» |
| HPKE kutubxonalari (Go `crypto/hpke`, JS `@hpke/core`) RFC 9180 A.3.1 ma'lum javoblarini beradi | Go: `TestRFC9180KnownAnswer`. Node: «RFC 9180 Appendix A.3.1 known answers…» |
| Go va JS bir-birining baytlarini tushunadi (HPKE konvert + SFrame kadrlar + qabul qoidalari), ikkala yo'nalishda | `testdata/golden/go-to-js.json` va `js-to-go.json`: Go: `TestGoldenGoToJS`, `TestGoldenJSToGo`. Node: «Go to JS…», «JS to JS…» |
| Zanjir bo'ylab har bir kadr manbadagi baytlarga **aynan teng** holda ochiladi | `TestEveryFrameDecryptsToExactPlaintext`; alohida jarayonlar bilan: `TestRealProcessesChain`; sahifaning o'z JS kodi bilan: Node «chain: Go source -> Go relay -> page JavaScript…» |
| Relay orqali o'tgan baytlarda (so'rovlar, sarlavhalar, tanalar, javoblar; ikki epoch) na ochiq matn (SPS/PPS baytlari, ma'lum matn namunasi, har bir kadrning oxiri), na kalit (`base_key` — xom, hex, base64; `sframe_key`; `sframe_salt`) uchraydi | `TestRelaySeesNeitherPlaintextNorKeys` (93 ta taqiqlangan bayt ketma-ketligi qidiriladi; yozuv to'liqligini musbat nazorat tekshiradi) |
| Relay paketi hech qanday kripto paketini va kalit bilan ishlaydigan paketlarimizni import qilmaydi | `TestRelayPackageImportsNoCryptography` |
| Noto'g'ri kalit, boshqa stream yoki boshqa shifr to'plami — autentifikatsiya xatosi (axlat emas) | `TestWrongKeyFailsAuthentication` |
| Relay o'zgartirgan kadr rad etiladi, oqim davom etadi | `TestTamperedFrameIsRejected` |
| Relay qayta yuborgan (haqiqiy, o'zgartirilmagan) eski kadr rad etiladi | `TestReplayedFrameIsRejected` |
| Relay join so'rovidagi ochiq kalitni o'ziniki bilan almashtirsa: operator ko'radigan barmoq izi tomoshabinnikidan **farq qiladi**; tomoshabin aytgan barmoq izini tasdiqlash rad etiladi; hech qanday kalit chiqmaydi | `TestRelaySubstitutingJoinKeyIsCaughtByFingerprint` |
| Haqiqiy tomoshabinga muhrlangan konvertni relay o'z kaliti bilan ocha olmaydi (manzilini o'zgartirsa ham) | `TestEnvelopeForViewerCannotBeOpenedByRelay` |
| Revoke'dan keyin: bekor qilingan qabul qiluvchi yangi epoch kadrlarini ocha olmaydi (eski kaliti bilan ham); qolgan qabul qiluvchi bitta kadr ham yo'qotmay davom etadi | `TestRevokeStartsNewEpochWithoutRevokedViewer`; `TestRealProcessesChain`; Node «chain…» |
| Brauzer kodi yaratadigan yopiq kalit eksport qilinmaydi; barmoq izi satri Go chop etadigani bilan bir xil | Node: «viewer key: private key is not extractable…», «fingerprint text is identical…» |
| Relay faqat tomoshabin sahifasi manzili (origin) uchun CORS beradi va o'zi sahifa bermaydi | `TestCORSOnlyForTheViewerOrigin`, `TestRelayServesNoPages` |

## 4. PoC nimani isbotlaMAYDI — ma'lum cheklovlar

Bularni yashirmaslik PoC'ning asosiy maqsadi.

1. **DJI qurilmalarida sinalmagan.** Na DJI pulti, na DJI Pilot 2 bilan sinov o'tkazilmagan. «Manba» — kompyuterda ishlaydigan simulyator (ffmpeg test tasviri). DJI Pilot 2 SFrame'ni bilmaydi; real tizimda shifrlashni pult yonidagi ishonchli shlyuz yoki SDK asosidagi ilova bajarishi kerak bo'ladi va **o'sha joy videoni ochiq ko'radi**. «End-to-end» bu yerda «shlyuzdan tomoshabingacha» degani, «dron kamerasidan» emas.
2. **Transport WebRTC emas.** Kadrlar bitta HTTP oqimi (TCP) orqali keladi va WebCodecs bilan dekodlanadi. Kechikish, jitter, paket yo'qolishi va tarmoq tirbandligidagi xatti-harakat **production darajasida emas**: jitter buferi yo'q, bitreytni moslashtirish yo'q, TCP'da bitta yo'qolgan paket hammasini kutdiradi, audio yo'q. Sekin tomoshabin uchun relay kadrlarni tashlab yuboradi.
3. **Brauzerda video ijrosi avtomatik testlar bilan tekshirilmagan.** Sahifaning tarmoq va kripto mantig'i Node ostida real relay va manba bilan sinaladi, lekin DOM, brauzerning CORS/CSP nazorati va WebCodecs dekodlashi faqat brauzerda qo'lda tekshiriladi (5.3-bo'lim). WebCodecs yoki H.264 dekoder mavjud bo'lmagan brauzerda sahifa buni aytadi va faqat hisoblagichlarni ko'rsatadi.
4. **SFrame kodi o'zimizniki va mustaqil audit qilinmagan.** U faqat rasmiy vektorlar bilan tekshirilgan: sarlavha vektorlarining hammasi, SFrame vektorlaridan esa 5 tadan 2 tasi (AES-GCM); qolgan 3 tasi biz yozmagan AES-CTR-HMAC to'plamlariga tegishli. Yon kanallar (vaqt bo'yicha va h.k.) tahlil qilinmagan. `@hpke/core` — uchinchi tomon kutubxonasi, uni ham biz audit qilmaganmiz. RFC 9180 da P-256 + AES-256-GCM uchun vektor yo'q: ma'lum javoblar testi o'sha KEM va KDF bilan, lekin AES-128-GCM bilan o'tadi; AES-256-GCM varianti faqat Go↔JS o'zaro mosligi bilan tekshirilgan.
5. **Barmoq izini alohida kanal orqali solishtirish majburiy.** Ochiq kalitlarni almashtira oladigan server **faqat shu solishtirish orqali** aniqlanadi. Operator ro'yxatdagi barmoq izini solishtirmasdan tasdiqlasa, relay kalitni oladi va videoni ochadi — buni `TestSkippingFingerprintComparisonGivesRelayTheKey` ataylab ko'rsatadi. Shuning uchun `approve`ga ro'yxatdan ko'chirilgan emas, **tomoshabin aytgan** barmoq izi kiritilishi kerak; qisqartirilgan barmoq izi qabul qilinmaydi.
6. **Konvert jo'natuvchisi autentifikatsiya qilinmaydi** (HPKE base mode). Tomoshabinning ochiq kalitini bilgan har kim (relay ham) unga o'z kalitini muhrlab yuborishi va keyin o'z kadrlarini berishi mumkin. Bunda relay haqiqiy videoni **o'qiy olmaydi**, lekin tomoshabinga **soxta video ko'rsatishi** yoki uni haqiqiy oqimdan uzib qo'yishi mumkin. Bu cheklov `TestKnownLimitationEnvelopeSenderIsNotAuthenticated` testi bilan qayd etilgan. Yechim: MLS (a'zolar autentifikatsiya qilinadi) yoki hech bo'lmasa manba kaliti bilan autentifikatsiyalangan kalit yetkazish (HPKE auth mode yoki imzo) + manba barmoq izini ham alohida kanalda solishtirish.
7. **JS ishonchli, alohida tarqatiladigan manzildan kelishi shart.** Agar videoni uzatadigan server sahifa JS kodini ham bersa, u kodni almashtirib, kalitlarni yoki ochilgan kadrlarni o'ziga yuborishi mumkin. PoC'da `viewerhost` alohida jarayon va alohida origin — bu talabni **ko'rsatadi**, lekin hal qilmaydi (ikkalasi ham bitta kompyuterda). `extractable: false` faqat uzoq muddatli yopiq kalitni eksportdan saqlaydi: sahifadagi zararli skript baribir shu kalitdan foydalanishi va `base_key`ni (konvert ochilganda qisqa vaqt JS xotirasida bo'ladi) yoki ochilgan kadrlarni o'qishi mumkin. Brauzer kengaytmalari ham shunday.
8. **Metama'lumot relay'ga ko'rinadi:** kim, qachon, qaysi IP'dan ulangani; stream nomi; kadr o'lchamlari va vaqti (bundan kadr tezligi, GOP tuzilishi, sahnadagi harakat miqdori taxmin qilinadi); tomoshabinlarning ochiq kalitlari va yorliqlari; kim konvert olgani (a'zolik); epoch raqami va hisoblagich (SFrame sarlavhasi ochiq); revoke qachon bo'lgani.
9. **Kaliti bor tomoshabin ekranni yozib olishi** yoki ochilgan kadrlarni saqlashi mumkin. Shifrlash ruxsat berilgan tomoshabinning o'zidan himoya qilmaydi.
10. **Revoke allaqachon qabul qilingan kadrlarni qaytarib ololmaydi.** Bekor qilingan tomoshabinda o'zi a'zo bo'lgan epoch'larning kalitlari qoladi; o'sha epoch'larning yozib olingan shifrlangan kadrlarini keyin ham ocha oladi.
11. **Epoch ichida forward secrecy yo'q.** Epoch `base_key`i oshkor bo'lsa, o'sha epochning barcha kadrlari ochiladi. Tomoshabinning yopiq kaliti oshkor bo'lsa va konvertlar yozib olingan bo'lsa, unga muhrlangan barcha epoch kalitlari ochiladi. Yangi tasdiqlangan tomoshabin **joriy** epoch kalitini oladi — agar u shu epochning oldingi shifrlangan kadrlarini yozib olgan bo'lsa, ularni ham ochadi (kerak bo'lsa `approve`dan oldin `rotate` qiling; MLS buni tuzilishiga ko'ra hal qiladi).
12. **Relay xizmatni buzishi mumkin:** kadr va konvertlarni tashlab yuborish, kechiktirish, tartibini o'zgartirish (bu holda ular replay sifatida rad etiladi). Shifrlash mavjudlikni kafolatlamaydi.
13. **PoC relay'ida autentifikatsiya yo'q** va u faqat `127.0.0.1` da oddiy HTTP bilan ishlaydi: shu kompyuterdagi har qanday jarayon kadr yuborishi yoki join so'rovi qo'yishi mumkin. Manbaning operator endpoint'i veb-sahifalardan himoyalangan (Host tekshiruvi, `Origin` rad etiladi, maxsus sarlavha talab qilinadi), lekin mahalliy jarayonlardan emas.
14. **Holat xotirada.** Sahifa qayta yuklansa — yangi kalit, yangi tasdiq kerak. Relay yoki manba qayta ishga tushsa, a'zolik yo'qoladi.
15. **Faqat Windows 11 da sinalgan** (Go 1.27.4, Node 22). Skriptlarning `.sh` variantlari Git Bash'da sinalgan; Linux/macOS'da ishga tushirib ko'rilmagan.
16. **Production uchun to'g'ri tanlov — MLS (RFC 9420)** (RFC 9605 §5.2 SFrame kalitlarini MLS'dan olishni tasvirlaydi) va WebRTC (Encoded Transform / SFrame) kabi real vaqt transporti. Bu PoC ularning o'rnini bosmaydi.

## 5. Ishga tushirish

Talablar: Go 1.27.x va Node 22+. Repozitoriyadagi `.tools\` papkasi bo'lsa, skriptlar Go, Node va ffmpeg'ni o'sha yerdan o'zi topadi. Birinchi marta `npm ci` internetdan `@hpke/core` va `esbuild`ni yuklaydi (versiyalar `package-lock.json`da qotirilgan). ffmpeg bo'lmasa, manba sintetik (dekodlanmaydigan) kadrlar yuboradi — hisoblagichlar ishlaydi, tasvir bo'lmaydi.

Barcha jarayonlar faqat `127.0.0.1` da tinglaydi. Sukut portlari: relay **59320**, viewerhost **59321**, manba boshqaruvi **59322**. DronStream serverining portlari (8443, 1935, 9180, 9997, 8889, 8189) ishlatilmaydi — demo skriptlari ularni rad etadi.

### 5.1. Testlar

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File poc\e2ee\run-tests.ps1
```

Git Bash:

```bash
bash poc/e2ee/run-tests.sh
```

Ikkalasi ham: `go vet`, `go test -count=1 ./...`, viewer bundle'ini yig'ish, `node --test`. Oxirida `== ALL TESTS PASSED ==` chiqishi kerak. Testlar faqat OS tanlagan bo'sh portlardan foydalanadi va o'zlari ishga tushirgan jarayonlarnigina to'xtatadi.

### 5.2. Demo

PowerShell (manba shu oynada ishlaydi, operator buyruqlari shu yerga yoziladi):

```powershell
powershell -ExecutionPolicy Bypass -File poc\e2ee\run-demo.ps1 -AttackHooks
```

Git Bash: `bash poc/e2ee/run-demo.sh --attack-hooks`

Boshqa rejimlar (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File poc\e2ee\run-demo.ps1 -Check        # brauzersiz o'z-o'zini tekshirish (Go qabul qiluvchi), keyin to'xtaydi
powershell -ExecutionPolicy Bypass -File poc\e2ee\run-demo.ps1 -Background   # hammasi fonda; PID'lar .run\pids.json da
powershell -ExecutionPolicy Bypass -File poc\e2ee\run-demo.ps1 -Stop         # faqat -Background ishga tushirgan jarayonlarni to'xtatadi
```

Parametrlar: `-RelayPort`, `-ViewerPort`, `-ControlPort`, `-Stream`, `-Synthetic` (ffmpeg'siz). Bash'da: `--check`, `--relay-port N`, `--viewer-port N`, `--control-port N`, `--stream ID`, `--synthetic`. Skriptlar faqat o'zlari ishga tushirgan jarayonlarni to'xtatadi (PID, bajariluvchi fayl yo'li va ishga tushgan vaqti bo'yicha).

Skript chop etadigan manzillar:

- Relay: `http://127.0.0.1:59320`
- Tomoshabin sahifasi: `http://127.0.0.1:59321/viewer.html` (portlar o'zgargan bo'lsa: `viewer.html?relay=http://127.0.0.1:PORT&stream=ID`)

Operator buyruqlari — manba oynasiga yoki boshqa terminaldan `operator` dasturi orqali:

```
list                      kutayotgan so'rovlar, a'zolar, bekor qilinganlar (to'liq barmoq izlari bilan)
approve <barmoq izi>      joriy epoch kalitini shu kalitga muhrlash (16 guruhning hammasi kerak)
revoke <barmoq izi>       a'zoni chiqarish va yangi epoch boshlash
rotate                    a'zolikni o'zgartirmasdan yangi epoch
status                    epoch va yuborilgan kadrlar soni
quit                      manbani to'xtatish (faqat manba oynasida)
```

```powershell
poc\e2ee\.run\bin\operator.exe -control http://127.0.0.1:59322 list
poc\e2ee\.run\bin\operator.exe -control http://127.0.0.1:59322 approve "<barmoq izi>"
```

Yomon niyatli relay simulyatsiyasi (faqat `-AttackHooks` bilan):

```powershell
poc\e2ee\.run\bin\operator.exe -relay http://127.0.0.1:59320 attack tamper 5       # keyingi 5 kadr buziladi -> «Authentication failures» oshadi
poc\e2ee\.run\bin\operator.exe -relay http://127.0.0.1:59320 attack replay 5       # eski kadr qayta yuboriladi -> «Replays rejected» oshadi
poc\e2ee\.run\bin\operator.exe -relay http://127.0.0.1:59320 attack substitute-on  # join so'rovlarida relay'ning o'z kaliti ko'rsatiladi
poc\e2ee\.run\bin\operator.exe -relay http://127.0.0.1:59320 attack substitute-off
```

Brauzersiz tekshirish: `poc\e2ee\.run\bin\receiver.exe -relay http://127.0.0.1:59320 -stream demo` — barmoq izini chop etadi, tasdiqni kutadi, hisoblagichlarni ko'rsatadi.

### 5.3. Brauzerda qo'lda tekshirish (avtomatik testlar qamramaydi)

1. Demoni `-AttackHooks` bilan ishga tushiring, `http://127.0.0.1:59321/viewer.html` ni oching, tugmani bosing. Sahifada barmoq izi chiqadi, holat: `waiting for approval`; «Frames received» va «Frames without a key» o'sadi, «Frames decrypted» 0.
2. Manba oynasida `list` — barmoq izi sahifadagi bilan **aynan bir xil** bo'lishi kerak. `approve <barmoq izi>`.
3. Kutiladigan natija: holat `decrypting (epoch 1)`, «Frames decrypted» o'sadi, tasvir (rangli test jadvali) ko'rinadi, «Pictures drawn» o'sadi. Tasvir chiqmasa, «Video» ostidagi izoh sababini aytadi; hisoblagichlar baribir ishlashi kerak.
4. `attack tamper 5` → «Authentication failures» +5; `attack replay 5` → «Replays rejected» +5; tasvir keyingi kalit kadrdan davom etadi.
5. Ikkinchi tabda yana bir tomoshabin oching va tasdiqlang; so'ng birinchisini `revoke` qiling: birinchi tabda ~2 soniyada `revoked: no key for epoch 2`, ikkinchisida `decrypting (epoch 2)`.
6. `attack substitute-on`, yangi tab oching: `list`dagi barmoq izi sahifadagidan farq qiladi; sahifadagi barmoq izi bilan `approve` — `REFUSED`.
7. Brauzer dasturchi panelining Network bo'limida sahifa faqat `127.0.0.1:59321` (sahifa fayllari) va `127.0.0.1:59320` (relay) ga murojaat qilishini tekshiring.

## 6. Testlar ro'yxati

### Go (`go test ./...`) — 30 ta

| Paket | Test | Nimani ko'rsatadi |
|---|---|---|
| `sframe` | `TestRFC9605HeaderVectors` | 289 ta rasmiy sarlavha vektori: kodlash va dekodlash |
| `sframe` | `TestRFC9605SFrameVectors` | Rasmiy SFrame vektorlari (to'plam 4 va 5): label'lar, `sframe_secret`, kalit, salt, nonce, AAD, shifrlangan matn, ochish; 3 ta CTR-HMAC vektori o'tkazib yuboriladi |
| `sframe` | `TestDecodeHeaderRejectsMalformed` | Kesilgan va minimal bo'lmagan sarlavhalar rad etiladi |
| `sframe` | `TestEncryptorCountsUpAndDecryptorAuthenticates` | CTR 0,1,2…; istalgan bitta bit o'zgarishi, boshqa metadata/kalit/KID, kesilgan kadr — rad |
| `sframe` | `TestUnsupportedSuites` | Yozilmagan to'plamlar xato qaytaradi |
| `internal/envelope` | `TestRFC9180KnownAnswer` | Go `crypto/hpke` RFC 9180 A.3.1 javoblarini beradi |
| `internal/envelope` | `TestSealOpenAndBinding` | Konvert ochiladi; epoch/to'plam/stream/manzil/versiya o'zgarsa — ochilmaydi; boshqa kalit ocha olmaydi |
| `internal/envelope` | `TestFingerprintFormat` | Barmoq izi formati; qisqartirilgan qiymat va yaroqsiz ochiq kalit rad etiladi |
| `internal/h264` | `TestAccessUnitsRoundTripSynthetic`, `TestAccessUnitsMultiSliceAndStartCodes` | Annex-B oqimini access unit'larga bo'lish, kalit kadrni aniqlash |
| `internal/h264` | `TestFFmpegPattern` | Haqiqiy libx264 chiqishi: 30 kadr, har bir kalit kadrda SPS/PPS (ffmpeg bo'lmasa o'tkazib yuboriladi) |
| `internal/local` | `TestGuardRefusesAnythingABrowserPageCouldSend`, `TestListenIsLoopbackOnly` | Operator endpoint'lari veb-sahifadan chaqirilmaydi; faqat 127.0.0.1 |
| `internal/relay` | `TestCORSOnlyForTheViewerOrigin`, `TestRelayServesNoPages`, `TestInputLimitsAndAttackHooksOffByDefault` | CORS faqat tomoshabin origin'iga; relay sahifa bermaydi; kirish cheklovlari; hujum simulyatsiyasi sukutda o'chiq |
| `e2e` | `TestEveryFrameDecryptsToExactPlaintext` | Zanjir: 2 tomoshabin, 60 kadr, har biri aynan teng |
| `e2e` | `TestRelaySeesNeitherPlaintextNorKeys` | Relay orqali o'tgan baytlarda ochiq matn ham, kalit ham yo'q |
| `e2e` | `TestRelayPackageImportsNoCryptography` | Relay kodi kripto import qilmaydi |
| `e2e` | `TestWrongKeyFailsAuthentication` | Noto'g'ri kalit / stream / to'plam — autentifikatsiya xatosi |
| `e2e` | `TestTamperedFrameIsRejected` | Buzilgan kadr rad etiladi |
| `e2e` | `TestReplayedFrameIsRejected` | Qayta yuborilgan haqiqiy kadr rad etiladi |
| `e2e` | `TestRelaySubstitutingJoinKeyIsCaughtByFingerprint` | Kalit almashtirilsa barmoq izi boshqa; to'g'ri barmoq izini tasdiqlash rad etiladi |
| `e2e` | `TestEnvelopeForViewerCannotBeOpenedByRelay` | Relay kaliti tomoshabin konvertini ocha olmaydi |
| `e2e` | `TestSkippingFingerprintComparisonGivesRelayTheKey` | **Ogohlantirish testi:** solishtirmasdan tasdiqlansa, relay kalitni oladi |
| `e2e` | `TestRevokeStartsNewEpochWithoutRevokedViewer` | Revoke: yangi epoch; bekor qilingan ocha olmaydi, qolgan davom etadi; eski epoch kadri rad etiladi |
| `e2e` | `TestKnownLimitationEnvelopeSenderIsNotAuthenticated` | **Cheklov testi:** soxta konvert va kadr qabul qilinadi (4-bo'lim, 6-band) |
| `e2e` | `TestGoldenGoToJS`, `TestGoldenJSToGo` | Go ikkala golden faylni o'qiydi (jumladan JS yaratganini) |
| `e2e` | `TestRealProcessesChain` | Alohida jarayonlar (relay, manba + ffmpeg H.264, operator, 2 ta qabul qiluvchi): approve, 150 kadr, revoke, epoch 2, yo'qotishsiz |

### Node (`node --test`) — 15 ta

| Fayl | Nimani ko'rsatadi |
|---|---|
| `viewer/test/sframe-vectors.test.mjs` (4) | JS SFrame kodi rasmiy vektorlardan o'tadi (sarlavha 289/289; to'plam 4 va 5: hosil qilish, shifrlash, ochish); yaroqsiz sarlavhalar; bit o'zgarishi, boshqa kalit/KID/metadata rad etiladi; kalit faqat bitta yo'nalishda ishlatiladi |
| `viewer/test/hpke.test.mjs` (4) | `@hpke/core` RFC 9180 A.3.1 javoblarini beradi; yopiq kalit eksport qilinmaydi; barmoq izi matni Go'niki bilan bir xil; konvert maydonlari bog'langan |
| `viewer/test/golden.test.mjs` (2) | JS ikkala golden faylni ochadi: Go muhrlagan konvertlar va Go shifrlagan kadrlar (va aksincha fayl) |
| `viewer/test/receiver.test.mjs` (4) | Replay rad etiladi; soxta katta CTR oqimni to'xtata olmaydi; epoch almashishi; oqimni kadrlarga bo'lish; H.264 yordamchilari |
| `viewer/test/chain.test.mjs` (1) | Sahifaning o'z modullari (`session.js` va boshqalar) Node ostida real Go relay va manba bilan: tasdiqdan oldin 0 ta ochilgan kadr; approve; 5 marta kalit almashishi — bitta kadr ham yo'qolmaydi, tartib buzilmaydi; revoke → `revoked: no key for epoch 7` |

## 7. Fayllar

```
poc/e2ee/
  go.mod                         alohida Go moduli (tashqi bog'liqliksiz)
  sframe/                        RFC 9605 (Go) + vektor testlari
  internal/envelope/             HPKE konvert, barmoq izi, info satri (Go)
  internal/relay/                kalitsiz relay + yomon niyatli relay simulyatsiyasi (test uchun)
  internal/source/               manba: epoch'lar, approve/revoke/rotate, kadr yuborish
  internal/viewer/               Go qabul qiluvchi (brauzer mantig'ining aynan o'zi)
  internal/h264/, wire/, local/  Annex-B bo'lish; uzunlik prefiksi; loopback va operator himoyasi
  cmd/relay, cmd/source, cmd/viewerhost, cmd/receiver, cmd/operator
  e2e/                           zanjir testlari, golden testlar, alohida jarayonlar testi
  viewer/viewer.html, viewer.css tomoshabin sahifasi (CDN yo'q, tashqi so'rov yo'q)
  viewer/src/                    sframe.js, envelope.js, receiver.js, session.js, h264.js, main.js
  viewer/viewer.bundle.js        esbuild natijasi (kichraytirilmagan; `npm run build` qayta yaratadi)
  viewer/THIRD-PARTY-NOTICES.txt bundle ichidagi @hpke/core va @hpke/common litsenziyalari (MIT)
  viewer/build.mjs               yig'ish skripti (bundle'ga kutilmagan modul kirsa, xato beradi)
  viewer/test/                   Node testlari, gen-golden.mjs
  testdata/                      RFC vektorlari, SOURCES.txt, golden/
  package.json, package-lock.json
  run-tests.sh / .ps1, run-demo.sh / .ps1, scripts/toolchain.ps1
```

## 8. Test vektorlari manbasi

- `testdata/rfc9605-test-vectors.json` — IETF SFrame ishchi guruhi: `github.com/sframe-wg/sframe`, `test-vectors/test-vectors.json`, commit `025d568a506937c901af8e7f0a663f39aeaf67ad` (RFC chiqishidan oldingi oxirgi o'zgarish), bayt-bayt o'zgarishsiz. Fayldagi barcha qiymatlar RFC 9605 matnining C ilovasi bilan solishtirilgan va mos keladi. Repozitoriyaning yangi boshi RFC 9605 da yo'q `aes_256_ctr_hmac` bo'limini qo'shadi; qolgan bo'limlari shu fayl bilan bir xil.
- `testdata/rfc9180-a3-base.json` — RFC 9180 matnining A.3.1 bo'limidan avtomatik ajratib olingan qiymatlar.
- `testdata/golden/*.json` — qabul qiluvchi kaliti RFC 9180 A.3.1 dagi **ochiq e'lon qilingan** namuna kalit juftligi, `base_key`lar — qat'iy namuna baytlar. Bu fayllarda hech qanday sir yo'q. HPKE vaqtinchalik kaliti tasodifiy bo'lgani uchun fayllar qayta yaratilganda `sealed` maydonlari o'zgaradi; shuning uchun ular repozitoriyada saqlanadi.

Batafsil: `testdata/SOURCES.txt`.
