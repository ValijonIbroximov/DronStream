/*! DronStream qo‘llanmasi: interfeys va 3D sahna (manba: guide/src). Tarmoqqa ulanmaydi.
 * Ichida three.js 0.187.0 ning ishlatilgan qismlari bor. three.js litsenziyasi:
 * The MIT License
 *
 * Copyright © 2010-2026 three.js authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(()=>{var Zi={scenes:[{id:"olam",sectionBeats:{},beats:[{cam:"overview",state:[],labels:[["remote","Pult","videoni serverga yuboradi"],["server","DronStream serveri","tekshiradi, ruxsatni qo\u2018llaydi, uzatadi"],["admin","Administrator","kim nimani ko\u2018rishini belgilaydi"],["laptop","Tomoshabin","faqat ruxsat berilganini ko\u2018radi"]]},{cam:"flow",state:["flow","ingest","egress"],labels:[["ingestMid","Pult \u2192 server","RTMP"],["egressMid","Server \u2192 brauzer","HTTPS + WebRTC"],["phone","Telefon yoki noutbuk","oddiy brauzer yetadi"],["drone","Dron","stilizatsiya, aniq model emas"]]}]},{id:"xavfsizlik",sectionBeats:{"ruxsat-shifr":2,"kim-koradi":1,ingest:0,"secure-rejim":0},beats:[{cam:"sec_ingest",state:["ingest"],labels:[["ingestMid","RTMP \u2014 shifrlanmagan","video va kalit ochiq ketadi","bad"],["vpnTag","Xususiy tarmoq \u2014 shifrlash emas","oddiy RTMP faqat laboratoriya rejimida","warn"],["remote","DJI Pilot 2","RTMP yuboradi; RTMPS tasdiqlanmagan","warn"]]},{cam:"sec_server",state:["ingest","trust","clear","tlsKey"],labels:[["serverScreen","Video serverda ochiq","MediaMTX qayta paketlaydi","warn"],["trust","Ishonch chegarasi","serverga ishoniladi"],["tlsKey","TLS/DTLS kalitlari","serverda saqlanadi"],["rackTop","Operator yoki root","videoni ko\u2018ra oladi","warn"]]},{cam:"sec_egress",state:["egress","egressLock","trust"],labels:[["egressMid","HTTPS + WebRTC (DTLS-SRTP)","yo\u2018lda shifrlangan","ok"],["egressLock","Shifrlash serverda tugaydi","end-to-end emas","warn"],["phone","Metadata ko\u2018rinadi","hajm, vaqt, IP manzillar","warn"]]},{cam:"sec_plan",state:["planned","dim"],labels:[["plannedMid","End-to-end shifrlash","REJA \u2014 amalga oshirilmagan","plan"],["gateway","Lokal shlyuz yoki pultdagi ilova (reja)","qo\u2018shimcha dastur/qurilma; tekshirilmagan","plan"],["remote","DJI Pilot 2","joriy oqimda E2EE yo\u2018q","bad"]]}]},{id:"ornatish",sectionBeats:{},beats:[{cam:"inst_rack",state:[],labels:[["rackTop","Server","stilizatsiya \u2014 aniq Dell modeli emas"],["portPanel","Portlar","band emasligini tekshiring"]]},{cam:"inst_layers",state:["explode"],labels:[["L0","Operatsion tizim","Windows yoki Ubuntu LTS"],["L1","DronStream xizmati","administrator/root huquqisiz"],["L2","Sozlama","config/dronstream.yaml, secrets"],["L3","Media server","MediaMTX \u2014 dronstream boshqaradi"],["L4","Ma\u2019lumotlar bazasi","SQLite, data/ papkasi"]]},{cam:"inst_os",state:["explode","osPick"],labels:[["osChip","Windows yo\u2018li","DronStreamStart.bat, PowerShell skriptlari","ok","windows"],["L1","Windows xizmati","service-install.ps1","","windows"],["osChip","Linux yo\u2018li","install.sh, bash skriptlari","ok","linux"],["L1","systemd xizmati","systemctl enable --now dronstream","","linux"],["L2","Sozlama","ikkala OS da bir xil fayl"]]}]},{id:"tarmoq",sectionBeats:{},beats:[{cam:"net_lan",state:["lan"],labels:[["lanTag","Lokal tarmoq","lokal IP faqat shu tarmoqdan ochiladi"],["laptop","Lokal tomoshabin","https://<SERVER_IP>:8443"],["server","Server","localhost \u2014 faqat serverning o\u2018zidan"]]},{cam:"net_nat",state:["lan","nat","globe","phoneOut"],labels:[["router","Router (NAT)","port yo\u2018naltirish shu yerda"],["fw","Firewall","faqat kerakli portlar"],["globe","Internet","CGNAT bo\u2018lsa \u2014 kirib bo\u2018lmaydi","warn"]]},{cam:"net_https",state:["lan","nat","globe","phoneOut","https"],labels:[["httpsMid","HTTPS \xB7 TCP 8443","sahifa, login, boshqaruv","ok"],["phone","Tashqi tomoshabin","masalan, mobil internetda"]]},{cam:"net_udp",state:["lan","nat","globe","phoneOut","https","udp","turn"],labels:[["udpMid","WebRTC \xB7 UDP 8189","video shu yo\u2018ldan","ok"],["turnMid","TURN (ixtiyoriy)","serverning o\u2018zida, 3478"],["httpsMid","Sahifa ochildi \u2260 video bor","ikkalasini alohida tekshiring","warn"]]},{cam:"net_dns",state:["lan","nat","globe","phoneOut","domain","https"],labels:[["domain","<DOMEN> \u2014 faqat nom","DNS: nom \u2192 IP manzil"],["router","Portni router va firewall ochadi","domen emas","warn"],["httpsMid","Shifrlash: sertifikat + HTTPS","domen emas","warn"]]}]},{id:"pult",sectionBeats:{},beats:[{cam:"pult_create",state:["source"],labels:[["admin","Admin panel","yangi stream"],["slot","Yangi yo\u2018l","har pult uchun alohida"]]},{cam:"pult_key",state:["source","key","keyTravel~"],labels:[["key","Pult kaliti","faqat yuborish uchun, ko\u2018rish uchun emas"],["remote","DJI Pilot 2","jonli efir turi: RTMP"]]},{cam:"pult_check",state:["source","key","keyTravel","ingest","scan"],labels:[["scan","Kalit tekshirilmoqda","bitta yo\u2018lga bitta manba"],["ingestMid","RTMP","VPN yoki yopiq tarmoq orqali","warn"]]},{cam:"pult_live",state:["source","keyTravel","ingest","live","egress","flow"],labels:[["rackTop","Efirda","stream faol","ok"],["laptop","Video ko\u2018rinadi","faqat ruxsat berilganlarga","ok"],["drone","Demo \u2260 haqiqiy pult","pultni alohida sinab ko\u2018ring","warn"]]}]},{id:"hisob",sectionBeats:{"f-hisob":1,"f-sessiya":2,"admin-mfa":4},beats:[{cam:"acc_login",state:["login"],labels:[["laptop","Login + parol","HTTPS orqali"],["server","Server tekshiradi","hisob, parol, blok holati"]]},{cam:"acc_approve",state:["guestTravel~"],labels:[["req","Mehmon so\u2018rovi","ism shaxsni isbotlamaydi","warn"],["admin","Admin kodni so\u2018rab kiritadi","kod faqat mehmon ekranida ko\u2018rinadi"]]},{cam:"acc_session",state:["session","approve"],labels:[["session","Brauzer sessiyasi","shu qurilmaga bog\u2018langan"],["laptopScreen","Faol sessiyalar","admin yakunlay oladi"]]},{cam:"acc_rights",state:["session","rights","egress"],labels:[["rightsOk","Ruxsat berilgan","ko\u2018rinadi","ok"],["rightsNo","Ruxsat yo\u2018q","umuman ko\u2018rinmaydi","bad"]]},{cam:"acc_admin",state:[],labels:[["admin","Parol + TOTP kodi","bir marta ishlatilgan kod qayta o\u2018tmaydi"],["adminScreen","Muhim amalda qayta tasdiqlash","oxirgi 10 daqiqada parol kiritilgan bo\u2018lishi kerak","warn"]]}]},{id:"havola",sectionBeats:{},beats:[{cam:"link_invite",state:["invite"],labels:[["qr","QR (namuna)","faqat taklif"],["envelope","Havola","kalit emas","warn"]]},{cam:"link_request",state:["invite","request~","waiting"],labels:[["laptop","Kutilmoqda","hali video yo\u2018q","warn"],["req","Kirish so\u2018rovi","admin ko\u2018radi"]]},{cam:"link_approve",state:["request","code","approve","session","egress"],labels:[["adminScreen","Admin kodni kiritadi","kod admin panelda ko\u2018rsatilmaydi"],["laptopScreen","Tekshirish kodi (namuna): K7Q\u20114MX","faqat tomoshabin ekranida"],["admin","Ism yoki xabar \u2014 dalil emas","kodni tomoshabindan so\u2018rang","warn"]]},{cam:"link_copy",state:["session","egress","browserB","blockB~"],labels:[["tablet","Boshqa brauzer","nusxa havola \u2014 video yo\u2018q","bad"],["shield","Server rad etadi","tasdiqlanmagan sessiya","bad"],["session","Tasdiqlangan sessiya","faqat shu brauzer","ok"]]}]},{id:"kontent",sectionBeats:{},beats:[{cam:"content_types",state:["tiles"],labels:[["tStream","Jonli stream","har pult uchun bitta"],["tText","Matn","e\u2019lon, ko\u2018rsatma"],["tImage","Rasm","PNG, JPEG, GIF"],["tVideo","Video","MP4 (H.264) yoki WebM"]]},{cam:"content_group",state:["tiles","group"],labels:[["group","To\u2018plam","bir nechta kontent, bitta nom"],["laptop","Tomoshabin","faqat ruxsat etilganini ko\u2018radi"]]}]},{id:"revoke",sectionBeats:{},beats:[{cam:"rev_play",state:["egress","session"],labels:[["egressMid","Ruxsatli video","WebRTC","ok"],["session","Sessiya","ruxsat bor","ok"]]},{cam:"rev_admin",state:["egress","session","revoke"],labels:[["admin","Ruxsat olib tashlandi","bitta odam, bitta kontent","bad"]]},{cam:"rev_cut",state:["revoke","cut"],labels:[["cutMark","Server media sessiyani uzdi","1\u20132 soniyada","bad"],["laptop","Video to\u2018xtadi","ulanish uzildi","bad"]]},{cam:"rev_reject",state:["revoke","cut","reject"],labels:[["shield","Qayta ulanish rad etildi","server tekshiradi","bad"],["laptop","Ko\u2018rilgan narsa qaytmaydi","ekran yozuvi tomoshabinda qoladi","warn"]]}]},{id:"backup",sectionBeats:{},beats:[{cam:"bak_file",state:["bakMake"],labels:[["bak",".dsbak fayli","parol bilan shifrlangan"],["server","Joriy server","backup shu yerda olinadi"]]},{cam:"bak_new",state:["bakMake","n2","bakTravel~"],labels:[["n2","Yangi server","toza o\u2018rnatish"],["bak","Faqat backup orqali","secrets papkasini nusxalamang","warn"]]},{cam:"bak_new",state:["n2","bakTravel","restore","standby"],labels:[["n2","Standby","eski server o\u2018chirilguncha video yo\u2018q","warn"],["server","Eski server","ikki server bir vaqtda ishlamasin"]]},{cam:"bak_verify",state:["n2","verified","bakTravel"],labels:[["n2","Faol","health-check, demo, pult","ok"],["server","Eski server","xizmat ko\u2018rsatmaydi"]]}]},{id:"diag",sectionBeats:{"x-video":0,"x-android":0,"x-port":1,"x-sayt":1,"x-xizmat":1,"x-sert":2,"x-offline":3,"x-limit":4},beats:[{cam:"diag_udp",state:["dUdp"],labels:[["pageMid","TCP 8443 \u2713","sahifa ochildi","ok"],["videoCut","UDP 8189 \u2717","video kanali ulanmadi","bad"]]},{cam:"diag_port",state:["dPort"],labels:[["portPanel","Port band","boshqa dastur tinglayapti","bad"]]},{cam:"diag_cert",state:["dCert"],labels:[["certMark","Sertifikat ogohlantirishi","manzil va sertifikat mosmi","warn"]]},{cam:"diag_offline",state:["dOffline"],labels:[["remote","Efirda emas","pult ulanmagan","bad"],["ingestMid","1935 yoki VPN","yo\u2018l ochiqmi","warn"]]},{cam:"diag_limit",state:["dLimit"],labels:[["laptopScreen","12/12","chegara to\u2018ldi","warn"]]}]},{id:"qabul",sectionBeats:{},beats:[{cam:"final",state:["checks"],labels:[["remote","DJI pulti bilan ulanish","hali sinalmagan","warn"],["rackTop","Haqiqiy R570 da","hali ishga tushirilmagan","warn"],["globe","Tashqi internetdan kirish","hali sinalmagan","warn"],["phone","Android 17 + Chrome 156","lokal tarmoqda kuzatilgan","ok"],["egressMid","End-to-end shifrlash","amalga oshirilmagan","plan"]]},{cam:"final_go",state:["checks","ok","flow","ingest","egress"],labels:[["server","Health-check",'{"ok":true,\u2026}',"ok"],["laptop","Boshqa internetdan sinov","sahifa + demo video","ok"]]}]}]};var qu=0,lh=1,Yu=2;var Ts=1,Zu=2,fr=3,rs=0,hn=1,wn=2,As=0,pr=1,as=2,ch=3,hh=4,Ju=5;var Es=100,$u=101,Ku=102,Qu=103,ju=104,td=200,ed=201,nd=202,id=203,uh=204,dh=205,sd=206,rd=207,ad=208,od=209,ld=210,cd=211,hd=212,ud=213,dd=214,ko=0,zo=1,Go=2,tr=3,Vo=4,Ho=5,Wo=6,Xo=7,Sl=0,fd=1,pd=2,_i=0,fh=1,ph=2,mh=3,gh=4,_h=5,xh=6,Fa=7;var yh=300,Cs=301,mr=302,bl=303,wl=304,qo=1e3,oi=1001,Yo=1002,ln=1003,md=1004;var Oa=1005;var Sn=1006,Tl=1007;var Hi=1008;var En=1009,vh=1010,Mh=1011,gr=1012,Al=1013,jn=1014,Vn=1015,ti=1016,El=1017,Cl=1018,Rs=1020,Sh=35902,bh=35899,wh=1021,Th=1022,ei=1023,Oi=1026,Wi=1027,Rl=1028,Pl=1029,os=1030,Il=1031;var Ll=1033,Ba=33776,ka=33777,za=33778,Ga=33779,Nl=35840,Dl=35841,Ul=35842,Fl=35843,Ol=36196,Bl=37492,kl=37496,zl=37488,Gl=37489,Va=37490,Vl=37491,Hl=37808,Wl=37809,Xl=37810,ql=37811,Yl=37812,Zl=37813,Jl=37814,$l=37815,Kl=37816,Ql=37817,jl=37818,tc=37819,ec=37820,nc=37821,ic=36492,sc=36494,rc=36495,ac=36283,oc=36284,Ha=36285,lc=36286;var Qr=2300,Zo=2301,Fo=2302,Kc=2303,Qc=2400,jc=2401,th=2402;var gd=3200;var Wa=0,_d=1,Xi="",Mn="srgb",jr="srgb-linear",ta="linear",Ee="srgb";var Oo=7680;var xd=519,yd=512,vd=513,Md=514,Ah=515,Sd=516,bd=517,Eh=518,Ch=519,wd=35044;var Rh="300 es",kn=2e3,er=2001;function np(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function ip(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function ea(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Td(){let i=ea("canvas");return i.style.display="block",i}var uu={},nr=null;function Ph(...i){let t="THREE."+i.shift();nr?nr("log",t,...i):console.log(t,...i)}function Ad(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function $t(...i){i=Ad(i);let t="THREE."+i.shift();if(nr)nr("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function ee(...i){i=Ad(i);let t="THREE."+i.shift();if(nr)nr("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function _s(...i){let t=i.join(" ");t in uu||(uu[t]=!0,$t(...i))}function Ed(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var Cd={[ko]:ko,[Go]:Wo,[Vo]:Vo,[tr]:Ho,[zo]:zo,[Wo]:Go,[Xo]:Xo,[Ho]:tr},ci=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},fn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var Bo=Math.PI/180,Jo=180/Math.PI;function _r(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(fn[i&255]+fn[i>>8&255]+fn[i>>16&255]+fn[i>>24&255]+"-"+fn[t&255]+fn[t>>8&255]+"-"+fn[t>>16&15|64]+fn[t>>24&255]+"-"+fn[e&63|128]+fn[e>>8&255]+"-"+fn[e>>16&255]+fn[e>>24&255]+fn[n&255]+fn[n>>8&255]+fn[n>>16&255]+fn[n>>24&255]).toLowerCase()}function xe(i,t,e){return Math.max(t,Math.min(e,i))}function sp(i,t){return(i%t+t)%t}function Tc(i,t,e){return(1-e)*i+e*t}function Rd(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Ih(i){switch(i.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function rp(i,t){if(t.constructor===Float32Array)return i;let e=Ih(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(i/e,-1)}function ap(i,t){if(t.constructor===Float32Array)return i;let e=Ih(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(i*e)}var yt=class{static{this.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=xe(this.x,t.x,e.x),this.y=xe(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=xe(this.x,t,e),this.y=xe(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(xe(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(xe(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},zn=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],f=n[s+3],u=r[a+0],d=r[a+1],g=r[a+2],v=r[a+3];if(f!==v||l!==u||c!==d||h!==g){let m=l*u+c*d+h*g+f*v;m<0&&(u=-u,d=-d,g=-g,v=-v,m=-m);let p=1-o;if(m<.9995){let S=Math.acos(m),y=Math.sin(S);p=Math.sin(p*S)/y,o=Math.sin(o*S)/y,l=l*p+u*o,c=c*p+d*o,h=h*p+g*o,f=f*p+v*o}else{l=l*p+u*o,c=c*p+d*o,h=h*p+g*o,f=f*p+v*o;let S=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=S,c*=S,h*=S,f*=S}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=f}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],f=r[a],u=r[a+1],d=r[a+2],g=r[a+3];return t[e]=o*g+h*f+l*d-c*u,t[e+1]=l*g+h*u+c*f-o*d,t[e+2]=c*g+h*d+o*u-l*f,t[e+3]=h*g-o*f-l*u-c*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),f=o(r/2),u=l(n/2),d=l(s/2),g=l(r/2);switch(a){case"XYZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"YZX":this._x=u*h*f+c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f-u*d*g;break;case"XZY":this._x=u*h*f-c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f+u*d*g;break;default:$t("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],f=e[10],u=n+o+f;if(u>0){let d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(r-c)*d,this._z=(a-s)*d}else if(n>o&&n>f){let d=2*Math.sqrt(1+n-o-f);this._w=(h-l)/d,this._x=.25*d,this._y=(s+a)/d,this._z=(r+c)/d}else if(o>f){let d=2*Math.sqrt(1+o-n-f);this._w=(r-c)/d,this._x=(s+a)/d,this._y=.25*d,this._z=(l+h)/d}else{let d=2*Math.sqrt(1+f-n-o);this._w=(a-s)/d,this._x=(r+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(xe(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){let c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},F=class{static{this.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(du.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(du.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*n),h=2*(o*e-r*s),f=2*(r*n-a*e);return this.x=e+l*c+a*f-o*h,this.y=n+l*h+o*c-r*f,this.z=s+l*f+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=xe(this.x,t.x,e.x),this.y=xe(this.y,t.y,e.y),this.z=xe(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=xe(this.x,t,e),this.y=xe(this.y,t,e),this.z=xe(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(xe(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Ac.copy(this).projectOnVector(t),this.sub(Ac)}reflect(t){return this.sub(Ac.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(xe(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Ac=new F,du=new zn,ie=class{static{this.prototype.isMatrix3=!0}constructor(t,e,n,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c)}set(t,e,n,s,r,a,o,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],f=n[7],u=n[2],d=n[5],g=n[8],v=s[0],m=s[3],p=s[6],S=s[1],y=s[4],x=s[7],R=s[2],E=s[5],_=s[8];return r[0]=a*v+o*S+l*R,r[3]=a*m+o*y+l*E,r[6]=a*p+o*x+l*_,r[1]=c*v+h*S+f*R,r[4]=c*m+h*y+f*E,r[7]=c*p+h*x+f*_,r[2]=u*v+d*S+g*R,r[5]=u*m+d*y+g*E,r[8]=u*p+d*x+g*_,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],f=h*a-o*c,u=o*l-h*r,d=c*r-a*l,g=e*f+n*u+s*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let v=1/g;return t[0]=f*v,t[1]=(s*c-h*n)*v,t[2]=(o*n-s*a)*v,t[3]=u*v,t[4]=(h*e-s*l)*v,t[5]=(s*r-o*e)*v,t[6]=d*v,t[7]=(n*l-c*e)*v,t[8]=(a*e-n*r)*v,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return _s("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ec.makeScale(t,e)),this}rotate(t){return _s("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ec.makeRotation(-t)),this}translate(t,e){return _s("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ec.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Ec=new ie,fu=new ie().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),pu=new ie().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function op(){let i={enabled:!0,workingColorSpace:jr,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===Ee&&(s.r=Fi(s.r),s.g=Fi(s.g),s.b=Fi(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Ee&&(s.r=js(s.r),s.g=js(s.g),s.b=js(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Xi?ta:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[a].fromXYZ).multiply(this.spaces[r].toXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[jr]:{primaries:t,whitePoint:n,transfer:ta,toXYZ:fu,fromXYZ:pu,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Mn},outputColorSpaceConfig:{drawingBufferColorSpace:Mn}},[Mn]:{primaries:t,whitePoint:n,transfer:Ee,toXYZ:fu,fromXYZ:pu,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Mn}}}),i}var ye=op();function Fi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function js(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var ks,$o=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{ks===void 0&&(ks=ea("canvas")),ks.width=t.width,ks.height=t.height;let s=ks.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=ks}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=ea("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Fi(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Fi(e[n]/255)*255):e[n]=Fi(e[n]);return{data:e,width:t.width,height:t.height}}else return $t("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},lp=0,ir=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:lp++}),this.uuid=_r(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width||0,e.height||0,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(Cc(s[a].image)):r.push(Cc(s[a]))}else r=Cc(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function Cc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?$o.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:($t("Texture: Unable to serialize Texture."),{})}var cp=0,Rc=new F,bn=class i extends ci{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=oi,s=oi,r=Sn,a=Hi,o=ei,l=En,c=i.DEFAULT_ANISOTROPY,h=Xi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:cp++}),this.uuid=_r(),this.name="",this.source=new ir(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new yt(0,0),this.repeat=new yt(1,1),this.center=new yt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ie,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Rc).x}get height(){return this.source.getSize(Rc).y}get depth(){return this.source.getSize(Rc).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.mipmapsAutoUpdate=t.mipmapsAutoUpdate,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isPMREMTexture=t.isPMREMTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){$t(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){$t(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==yh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case qo:t.x=t.x-Math.floor(t.x);break;case oi:t.x=t.x<0?0:1;break;case Yo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case qo:t.y=t.y-Math.floor(t.y);break;case oi:t.y=t.y<0?0:1;break;case Yo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};bn.DEFAULT_IMAGE=null;bn.DEFAULT_MAPPING=yh;bn.DEFAULT_ANISOTROPY=1;var He=class{static{this.prototype.isVector4=!0}constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],f=l[8],u=l[1],d=l[5],g=l[9],v=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(f-v)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+v)<.1&&Math.abs(g+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let y=(c+1)/2,x=(d+1)/2,R=(p+1)/2,E=(h+u)/4,_=(f+v)/4,w=(g+m)/4;return y>x&&y>R?y<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(y),s=E/n,r=_/n):x>R?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=E/s,r=w/s):R<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(R),n=_/r,s=w/r),this.set(n,s,r,e),this}let S=Math.sqrt((m-g)*(m-g)+(f-v)*(f-v)+(u-h)*(u-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(f-v)/S,this.z=(u-h)/S,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=xe(this.x,t.x,e.x),this.y=xe(this.y,t.y,e.y),this.z=xe(this.z,t.z,e.z),this.w=xe(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=xe(this.x,t,e),this.y=xe(this.y,t,e),this.z=xe(this.z,t,e),this.w=xe(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(xe(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Ko=class extends ci{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Sn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new He(0,0,t,e),this.scissorTest=!1,this.viewport=new He(0,0,t,e),this.textures=[];let s=n.count;for(let r=0;r<s;r++)this.textures[r]=new bn({width:t,height:e,depth:n.depth}),this.textures[r].isRenderTargetTexture=!0,this.textures[r].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Sn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.mipmapsAutoUpdate!==void 0&&(e.mipmapsAutoUpdate=t.mipmapsAutoUpdate),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new ir(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;else this.depthTexture=null;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ln=class extends Ko{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},na=class extends bn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=ln,this.minFilter=ln,this.wrapR=oi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Qo=class extends bn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=ln,this.minFilter=ln,this.wrapR=oi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Te=class i{static{this.prototype.isMatrix4=!0}constructor(t,e,n,s,r,a,o,l,c,h,f,u,d,g,v,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c,h,f,u,d,g,v,m)}set(t,e,n,s,r,a,o,l,c,h,f,u,d,g,v,m){let p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=f,p[14]=u,p[3]=d,p[7]=g,p[11]=v,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/zs.setFromMatrixColumn(t,0).length(),r=1/zs.setFromMatrixColumn(t,1).length(),a=1/zs.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),f=Math.sin(r);if(t.order==="XYZ"){let u=a*h,d=a*f,g=o*h,v=o*f;e[0]=l*h,e[4]=-l*f,e[8]=c,e[1]=d+g*c,e[5]=u-v*c,e[9]=-o*l,e[2]=v-u*c,e[6]=g+d*c,e[10]=a*l}else if(t.order==="YXZ"){let u=l*h,d=l*f,g=c*h,v=c*f;e[0]=u+v*o,e[4]=g*o-d,e[8]=a*c,e[1]=a*f,e[5]=a*h,e[9]=-o,e[2]=d*o-g,e[6]=v+u*o,e[10]=a*l}else if(t.order==="ZXY"){let u=l*h,d=l*f,g=c*h,v=c*f;e[0]=u-v*o,e[4]=-a*f,e[8]=g+d*o,e[1]=d+g*o,e[5]=a*h,e[9]=v-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){let u=a*h,d=a*f,g=o*h,v=o*f;e[0]=l*h,e[4]=g*c-d,e[8]=u*c+v,e[1]=l*f,e[5]=v*c+u,e[9]=d*c-g,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){let u=a*l,d=a*c,g=o*l,v=o*c;e[0]=l*h,e[4]=v-u*f,e[8]=g*f+d,e[1]=f,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=d*f+g,e[10]=u-v*f}else if(t.order==="XZY"){let u=a*l,d=a*c,g=o*l,v=o*c;e[0]=l*h,e[4]=-f,e[8]=c*h,e[1]=u*f+v,e[5]=a*h,e[9]=d*f-g,e[2]=g*f-d,e[6]=o*h,e[10]=v*f+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(hp,t,up)}lookAt(t,e,n){let s=this.elements;return Rn.subVectors(t,e),Rn.lengthSq()===0&&(Rn.z=1),Rn.normalize(),Ji.crossVectors(n,Rn),Ji.lengthSq()===0&&(Math.abs(n.z)===1?Rn.x+=1e-4:Rn.z+=1e-4,Rn.normalize(),Ji.crossVectors(n,Rn)),Ji.normalize(),oo.crossVectors(Rn,Ji),s[0]=Ji.x,s[4]=oo.x,s[8]=Rn.x,s[1]=Ji.y,s[5]=oo.y,s[9]=Rn.y,s[2]=Ji.z,s[6]=oo.z,s[10]=Rn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],f=n[5],u=n[9],d=n[13],g=n[2],v=n[6],m=n[10],p=n[14],S=n[3],y=n[7],x=n[11],R=n[15],E=s[0],_=s[4],w=s[8],B=s[12],A=s[1],P=s[5],z=s[9],Y=s[13],I=s[2],k=s[6],q=s[10],V=s[14],at=s[3],J=s[7],it=s[11],rt=s[15];return r[0]=a*E+o*A+l*I+c*at,r[4]=a*_+o*P+l*k+c*J,r[8]=a*w+o*z+l*q+c*it,r[12]=a*B+o*Y+l*V+c*rt,r[1]=h*E+f*A+u*I+d*at,r[5]=h*_+f*P+u*k+d*J,r[9]=h*w+f*z+u*q+d*it,r[13]=h*B+f*Y+u*V+d*rt,r[2]=g*E+v*A+m*I+p*at,r[6]=g*_+v*P+m*k+p*J,r[10]=g*w+v*z+m*q+p*it,r[14]=g*B+v*Y+m*V+p*rt,r[3]=S*E+y*A+x*I+R*at,r[7]=S*_+y*P+x*k+R*J,r[11]=S*w+y*z+x*q+R*it,r[15]=S*B+y*Y+x*V+R*rt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],f=t[6],u=t[10],d=t[14],g=t[3],v=t[7],m=t[11],p=t[15],S=l*d-c*u,y=o*d-c*f,x=o*u-l*f,R=a*d-c*h,E=a*u-l*h,_=a*f-o*h;return e*(v*S-m*y+p*x)-n*(g*S-m*R+p*E)+s*(g*y-v*R+p*_)-r*(g*x-v*E+m*_)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+s*(r*c-a*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],f=t[9],u=t[10],d=t[11],g=t[12],v=t[13],m=t[14],p=t[15],S=e*o-n*a,y=e*l-s*a,x=e*c-r*a,R=n*l-s*o,E=n*c-r*o,_=s*c-r*l,w=h*v-f*g,B=h*m-u*g,A=h*p-d*g,P=f*m-u*v,z=f*p-d*v,Y=u*p-d*m,I=S*Y-y*z+x*P+R*A-E*B+_*w;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let k=1/I;return t[0]=(o*Y-l*z+c*P)*k,t[1]=(s*z-n*Y-r*P)*k,t[2]=(v*_-m*E+p*R)*k,t[3]=(u*E-f*_-d*R)*k,t[4]=(l*A-a*Y-c*B)*k,t[5]=(e*Y-s*A+r*B)*k,t[6]=(m*x-g*_-p*y)*k,t[7]=(h*_-u*x+d*y)*k,t[8]=(a*z-o*A+c*w)*k,t[9]=(n*A-e*z-r*w)*k,t[10]=(g*E-v*x+p*S)*k,t[11]=(f*x-h*E-d*S)*k,t[12]=(o*B-a*P-l*w)*k,t[13]=(e*P-n*B+s*w)*k,t[14]=(v*y-g*R-m*S)*k,t[15]=(h*R-f*y+u*S)*k,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,f=o+o,u=r*c,d=r*h,g=r*f,v=a*h,m=a*f,p=o*f,S=l*c,y=l*h,x=l*f,R=n.x,E=n.y,_=n.z;return s[0]=(1-(v+p))*R,s[1]=(d+x)*R,s[2]=(g-y)*R,s[3]=0,s[4]=(d-x)*E,s[5]=(1-(u+p))*E,s[6]=(m+S)*E,s[7]=0,s[8]=(g+y)*_,s[9]=(m-S)*_,s[10]=(1-(u+v))*_,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=zs.set(s[0],s[1],s[2]).length(),o=zs.set(s[4],s[5],s[6]).length(),l=zs.set(s[8],s[9],s[10]).length();r<0&&(a=-a),Zn.copy(this);let c=1/a,h=1/o,f=1/l;return Zn.elements[0]*=c,Zn.elements[1]*=c,Zn.elements[2]*=c,Zn.elements[4]*=h,Zn.elements[5]*=h,Zn.elements[6]*=h,Zn.elements[8]*=f,Zn.elements[9]*=f,Zn.elements[10]*=f,e.setFromRotationMatrix(Zn),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,s,r,a,o=kn,l=!1){let c=this.elements,h=2*r/(e-t),f=2*r/(n-s),u=(e+t)/(e-t),d=(n+s)/(n-s),g,v;if(l)g=r/(a-r),v=a*r/(a-r);else if(o===kn)g=-(a+r)/(a-r),v=-2*a*r/(a-r);else if(o===er)g=-a/(a-r),v=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=f,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=kn,l=!1){let c=this.elements,h=2/(e-t),f=2/(n-s),u=-(e+t)/(e-t),d=-(n+s)/(n-s),g,v;if(l)g=1/(a-r),v=a/(a-r);else if(o===kn)g=-2/(a-r),v=-(a+r)/(a-r);else if(o===er)g=-1/(a-r),v=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=f,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},zs=new F,Zn=new Te,hp=new F(0,0,0),up=new F(1,1,1),Ji=new F,oo=new F,Rn=new F,mu=new Te,gu=new zn,hi=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],f=s[2],u=s[6],d=s[10];switch(e){case"XYZ":this._y=Math.asin(xe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-xe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(xe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-xe(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(xe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-xe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:$t("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return mu.makeRotationFromQuaternion(t),this.setFromRotationMatrix(mu,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return gu.setFromEuler(this),this.setFromQuaternion(gu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};hi.DEFAULT_ORDER="XYZ";var ia=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},dp=0,_u=new F,Gs=new zn,Pi=new Te,lo=new F,Vr=new F,fp=new F,pp=new zn,xu=new F(1,0,0),yu=new F(0,1,0),vu=new F(0,0,1),Mu={type:"added"},mp={type:"removed"},Vs={type:"childadded",child:null},Pc={type:"childremoved",child:null},We=class i extends ci{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:dp++}),this.uuid=_r(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new F,e=new hi,n=new zn,s=new F(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Te},normalMatrix:{value:new ie}}),this.matrix=new Te,this.matrixWorld=new Te,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ia,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Gs.setFromAxisAngle(t,e),this.quaternion.multiply(Gs),this}rotateOnWorldAxis(t,e){return Gs.setFromAxisAngle(t,e),this.quaternion.premultiply(Gs),this}rotateX(t){return this.rotateOnAxis(xu,t)}rotateY(t){return this.rotateOnAxis(yu,t)}rotateZ(t){return this.rotateOnAxis(vu,t)}translateOnAxis(t,e){return _u.copy(t).applyQuaternion(this.quaternion),this.position.add(_u.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(xu,t)}translateY(t){return this.translateOnAxis(yu,t)}translateZ(t){return this.translateOnAxis(vu,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Pi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?lo.copy(t):lo.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Vr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Pi.lookAt(Vr,lo,this.up):Pi.lookAt(lo,Vr,this.up),this.quaternion.setFromRotationMatrix(Pi),s&&(Pi.extractRotation(s.matrixWorld),Gs.setFromRotationMatrix(Pi),this.quaternion.premultiply(Gs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(ee("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Mu),Vs.child=t,this.dispatchEvent(Vs),Vs.child=null):ee("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(mp),Pc.child=t,this.dispatchEvent(Pc),Pc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Pi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Pi.multiply(t.parent.matrixWorld)),t.applyMatrix4(Pi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Mu),Vs.child=t,this.dispatchEvent(Vs),Vs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Vr,t,fp),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Vr,pp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let f=l[c];r(t.shapes,f)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){let o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),f=a(t.shapes),u=a(t.skeletons),d=a(t.animations),g=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};We.DEFAULT_UP=new F(0,1,0);We.DEFAULT_MATRIX_AUTO_UPDATE=!0;We.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var oe=class extends We{constructor(){super(),this.isGroup=!0,this.type="Group"}},gp={type:"move"},sr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new oe,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new oe,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new F,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new F),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new oe,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new F,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new F,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(let v of t.hand.values()){let m=e.getJointPose(v,n),p=this._getHandJoint(c,v);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.quaternion,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&u>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.quaternion,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(gp)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new oe;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Pd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},$i={h:0,s:0,l:0},co={h:0,s:0,l:0};function Ic(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Qt=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Mn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ye.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=ye.workingColorSpace){return this.r=t,this.g=e,this.b=n,ye.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=ye.workingColorSpace){if(t=sp(t,1),e=xe(e,0,1),n=xe(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=Ic(a,r,t+1/3),this.g=Ic(a,r,t),this.b=Ic(a,r,t-1/3)}return ye.colorSpaceToWorking(this,s),this}setStyle(t,e=Mn){function n(r){r!==void 0&&parseFloat(r)<1&&$t("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseFloat(r[1]))/100,Math.min(100,parseFloat(r[2]))/100,Math.min(100,parseFloat(r[3]))/100,e);break;case"hsl":case"hsla":if(r=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:$t("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);$t("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Mn){let n=Pd[t.toLowerCase()];return n!==void 0?this.setHex(n,e):$t("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Fi(t.r),this.g=Fi(t.g),this.b=Fi(t.b),this}copyLinearToSRGB(t){return this.r=js(t.r),this.g=js(t.g),this.b=js(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Mn){return ye.workingToColorSpace(pn.copy(this),t),Math.round(xe(pn.r*255,0,255))*65536+Math.round(xe(pn.g*255,0,255))*256+Math.round(xe(pn.b*255,0,255))}getHexString(t=Mn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ye.workingColorSpace){ye.workingToColorSpace(pn.copy(this),e);let n=pn.r,s=pn.g,r=pn.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let f=a-o;switch(c=h<=.5?f/(a+o):f/(2-a-o),a){case n:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-n)/f+2;break;case r:l=(n-s)/f+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=ye.workingColorSpace){return ye.workingToColorSpace(pn.copy(this),e),t.r=pn.r,t.g=pn.g,t.b=pn.b,t}getStyle(t=Mn){ye.workingToColorSpace(pn.copy(this),t);let e=pn.r,n=pn.g,s=pn.b;return t!==Mn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL($i),this.setHSL($i.h+t,$i.s+e,$i.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL($i),t.getHSL(co);let n=Tc($i.h,co.h,e),s=Tc($i.s,co.s,e),r=Tc($i.l,co.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},pn=new Qt;Qt.NAMES=Pd;var sa=class i{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new Qt(t),this.near=e,this.far=n}clone(){return new i(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},xs=class extends We{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new hi,this.environmentIntensity=1,this.environmentRotation=new hi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),this.background=t.background!==null?t.background.clone():null,this.environment=t.environment!==null?t.environment.clone():null,this.fog=t.fog!==null?t.fog.clone():null,this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),this.overrideMaterial=t.overrideMaterial!==null?t.overrideMaterial.clone():null,this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Jn=new F,Ii=new F,Lc=new F,Li=new F,Hs=new F,Ws=new F,Su=new F,Nc=new F,Dc=new F,Uc=new F,Fc=new He,Oc=new He,Bc=new He,Ui=class i{constructor(t=new F,e=new F,n=new F){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Jn.subVectors(t,e),s.cross(Jn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Jn.subVectors(s,e),Ii.subVectors(n,e),Lc.subVectors(t,e);let a=Jn.dot(Jn),o=Jn.dot(Ii),l=Jn.dot(Lc),c=Ii.dot(Ii),h=Ii.dot(Lc),f=a*c-o*o;if(f===0)return r.set(0,0,0),null;let u=1/f,d=(c*l-o*h)*u,g=(a*h-o*l)*u;return r.set(1-d-g,g,d)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Li)===null?!1:Li.x>=0&&Li.y>=0&&Li.x+Li.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,Li)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Li.x),l.addScaledVector(a,Li.y),l.addScaledVector(o,Li.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return Fc.setScalar(0),Oc.setScalar(0),Bc.setScalar(0),Fc.fromBufferAttribute(t,e),Oc.fromBufferAttribute(t,n),Bc.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(Fc,r.x),a.addScaledVector(Oc,r.y),a.addScaledVector(Bc,r.z),a}static isFrontFacing(t,e,n,s){return Jn.subVectors(n,e),Ii.subVectors(t,e),Jn.cross(Ii).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Jn.subVectors(this.c,this.b),Ii.subVectors(this.a,this.b),Jn.cross(Ii).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;Hs.subVectors(s,n),Ws.subVectors(r,n),Nc.subVectors(t,n);let l=Hs.dot(Nc),c=Ws.dot(Nc);if(l<=0&&c<=0)return e.copy(n);Dc.subVectors(t,s);let h=Hs.dot(Dc),f=Ws.dot(Dc);if(h>=0&&f<=h)return e.copy(s);let u=l*f-h*c;if(u<=0&&l>=0&&h<=0&&l-h>0)return a=l/(l-h),e.copy(n).addScaledVector(Hs,a);Uc.subVectors(t,r);let d=Hs.dot(Uc),g=Ws.dot(Uc);if(g>=0&&d<=g)return e.copy(r);let v=d*c-l*g;if(v<=0&&c>=0&&g<=0)return o=c/(c-g),e.copy(n).addScaledVector(Ws,o);let m=h*g-d*f;if(m<=0&&f-h>=0&&d-g>=0)return Su.subVectors(r,s),o=(f-h)/(f-h+(d-g)),e.copy(s).addScaledVector(Su,o);let p=1/(m+v+u);return a=v*p,o=u*p,e.copy(n).addScaledVector(Hs,a).addScaledVector(Ws,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},ui=class{constructor(t=new F(1/0,1/0,1/0),e=new F(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint($n.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint($n.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=$n.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0&&t.isBatchedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,$n):$n.fromBufferAttribute(r,a),$n.applyMatrix4(t.matrixWorld),this.expandByPoint($n);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),ho.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ho.copy(n.boundingBox)),ho.applyMatrix4(t.matrixWorld),this.union(ho)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,$n),$n.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Hr),uo.subVectors(this.max,Hr),Xs.subVectors(t.a,Hr),qs.subVectors(t.b,Hr),Ys.subVectors(t.c,Hr),Ki.subVectors(qs,Xs),Qi.subVectors(Ys,qs),fs.subVectors(Xs,Ys);let e=[0,-Ki.z,Ki.y,0,-Qi.z,Qi.y,0,-fs.z,fs.y,Ki.z,0,-Ki.x,Qi.z,0,-Qi.x,fs.z,0,-fs.x,-Ki.y,Ki.x,0,-Qi.y,Qi.x,0,-fs.y,fs.x,0];return!kc(e,Xs,qs,Ys,uo)||(e=[1,0,0,0,1,0,0,0,1],!kc(e,Xs,qs,Ys,uo))?!1:(fo.crossVectors(Ki,Qi),e=[fo.x,fo.y,fo.z],kc(e,Xs,qs,Ys,uo))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,$n).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize($n).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ni[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ni[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ni[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ni[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ni[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ni[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ni[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ni[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ni),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Ni=[new F,new F,new F,new F,new F,new F,new F,new F],$n=new F,ho=new ui,Xs=new F,qs=new F,Ys=new F,Ki=new F,Qi=new F,fs=new F,Hr=new F,uo=new F,fo=new F,ps=new F;function kc(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){ps.fromArray(i,r);let o=s.x*Math.abs(ps.x)+s.y*Math.abs(ps.y)+s.z*Math.abs(ps.z),l=t.dot(ps),c=e.dot(ps),h=n.dot(ps);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var Qe=new F,po=new yt,_p=0,In=class extends ci{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:_p++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=wd,this.updateRanges=[],this.gpuType=Vn,this.version=0,this._normalizationScale=t!==void 0?Ih(t):void 0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this._normalizationScale=t._normalizationScale,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)po.fromBufferAttribute(this,e),po.applyMatrix3(t),this.setXY(e,po.x,po.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Qe.fromBufferAttribute(this,e),Qe.applyMatrix3(t),this.setXYZ(e,Qe.x,Qe.y,Qe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Qe.fromBufferAttribute(this,e),Qe.applyMatrix4(t),this.setXYZ(e,Qe.x,Qe.y,Qe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Qe.fromBufferAttribute(this,e),Qe.applyNormalMatrix(t),this.setXYZ(e,Qe.x,Qe.y,Qe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Qe.fromBufferAttribute(this,e),Qe.transformDirection(t),this.setXYZ(e,Qe.x,Qe.y,Qe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=this._denormalize(n)),n}setComponent(t,e,n){return this.normalized&&(n=this._normalize(n)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=this._denormalize(e)),e}setX(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=this._denormalize(e)),e}setY(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=this._denormalize(e)),e}setZ(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=this._denormalize(e)),e}setW(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s),r=this._normalize(r)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(t){let e=this._normalizationScale;return e!==void 0?Math.max(t/e,-1):rp(t,this.array)}_normalize(t){let e=this._normalizationScale;return e!==void 0?Math.round(t*e):ap(t,this.array)}};var ra=class extends In{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var aa=class extends In{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var ne=class extends In{constructor(t,e,n){super(new Float32Array(t),e,n)}},xp=new ui,Wr=new F,zc=new F,Bi=class{constructor(t=new F,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):xp.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Wr.subVectors(t,this.center);let e=Wr.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Wr,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(zc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Wr.copy(t.center).add(zc)),this.expandByPoint(Wr.copy(t.center).sub(zc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},yp=0,Bn=new Te,Gc=new We,Zs=new F,Pn=new ui,Xr=new ui,on=new F,Be=class i extends ci{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:yp++}),this.uuid=_r(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(np(t)?aa:ra)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new ie().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Bn.makeRotationFromQuaternion(t),this.applyMatrix4(Bn),this}rotateX(t){return Bn.makeRotationX(t),this.applyMatrix4(Bn),this}rotateY(t){return Bn.makeRotationY(t),this.applyMatrix4(Bn),this}rotateZ(t){return Bn.makeRotationZ(t),this.applyMatrix4(Bn),this}translate(t,e,n){return Bn.makeTranslation(t,e,n),this.applyMatrix4(Bn),this}scale(t,e,n){return Bn.makeScale(t,e,n),this.applyMatrix4(Bn),this}lookAt(t){return Gc.lookAt(t),Gc.updateMatrix(),this.applyMatrix4(Gc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Zs).negate(),this.translate(Zs.x,Zs.y,Zs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ne(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&$t("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ui);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){ee("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new F(-1/0,-1/0,-1/0),new F(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Pn.setFromBufferAttribute(r),this.morphTargetsRelative?(on.addVectors(this.boundingBox.min,Pn.min),this.boundingBox.expandByPoint(on),on.addVectors(this.boundingBox.max,Pn.max),this.boundingBox.expandByPoint(on)):(this.boundingBox.expandByPoint(Pn.min),this.boundingBox.expandByPoint(Pn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ee('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Bi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){ee("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new F,1/0);return}if(t){let n=this.boundingSphere.center;if(Pn.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];Xr.setFromBufferAttribute(o),this.morphTargetsRelative?(on.addVectors(Pn.min,Xr.min),Pn.expandByPoint(on),on.addVectors(Pn.max,Xr.max),Pn.expandByPoint(on)):(Pn.expandByPoint(Xr.min),Pn.expandByPoint(Xr.max))}Pn.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)on.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(on));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)on.fromBufferAttribute(o,c),l&&(Zs.fromBufferAttribute(t,c),on.add(Zs)),s=Math.max(s,n.distanceToSquared(on))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&ee('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){ee("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new In(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],l=[],c=new Uint8Array(n.count);for(let B=0;B<n.count;B++)o[B]=new F,l[B]=new F;let h=new F,f=new F,u=new F,d=new yt,g=new yt,v=new yt,m=new F,p=new F;function S(B,A,P){c[B]=c[A]=c[P]=1,h.fromBufferAttribute(n,B),f.fromBufferAttribute(n,A),u.fromBufferAttribute(n,P),d.fromBufferAttribute(r,B),g.fromBufferAttribute(r,A),v.fromBufferAttribute(r,P),f.sub(h),u.sub(h),g.sub(d),v.sub(d);let z=1/(g.x*v.y-v.x*g.y);isFinite(z)&&(m.copy(f).multiplyScalar(v.y).addScaledVector(u,-g.y).multiplyScalar(z),p.copy(u).multiplyScalar(g.x).addScaledVector(f,-v.x).multiplyScalar(z),o[B].add(m),o[A].add(m),o[P].add(m),l[B].add(p),l[A].add(p),l[P].add(p))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let B=0,A=y.length;B<A;++B){let P=y[B],z=P.start,Y=P.count;for(let I=z,k=z+Y;I<k;I+=3)S(t.getX(I+0),t.getX(I+1),t.getX(I+2))}let x=new F,R=new F,E=new F,_=new F;function w(B){E.fromBufferAttribute(s,B),_.copy(E);let A=o[B];x.copy(A),x.sub(E.multiplyScalar(E.dot(A))).normalize(),R.crossVectors(_,A);let z=R.dot(l[B])<0?-1:1;a.setXYZW(B,x.x,x.y,x.z,z)}for(let B=0,A=n.count;B<A;++B)c[B]&&w(B);this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new In(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);let s=new F,r=new F,a=new F,o=new F,l=new F,c=new F,h=new F,f=new F;if(t)for(let u=0,d=t.count;u<d;u+=3){let g=t.getX(u+0),v=t.getX(u+1),m=t.getX(u+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,v),a.fromBufferAttribute(e,m),h.subVectors(a,r),f.subVectors(s,r),h.cross(f),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,d=e.count;u<d;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),f.subVectors(s,r),h.cross(f),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)on.fromBufferAttribute(t,e),on.normalize(),t.setXYZ(e,on.x,on.y,on.z)}toNonIndexed(){function t(o,l){let c=o.array,h=o.itemSize,f=o.normalized,u=new c.constructor(l.length*h),d=0,g=0;for(let v=0,m=l.length;v<m;v++){o.isInterleavedBufferAttribute?d=l[v]*o.data.stride+o.offset:d=l[v]*h;for(let p=0;p<h;p++)u[g++]=c[d++]}return new In(u,h,f)}if(this.index===null)return $t("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=t(l,n);e.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,f=c.length;h<f;h++){let u=c[h],d=t(u,n);l.push(d)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let f=0,u=c.length;f<u;f++){let d=c[f];h.push(d.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],f=r[c];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let c=0,h=a.length;c<h;c++){let f=a[c];this.addGroup(f.start,f.count,f.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Vc=new F,vp=new F,Mp=new ie,Kn=class{constructor(t=new F(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=Vc.subVectors(n,e).cross(vp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(Vc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Mp.getNormalMatrix(t),s=this.coplanarPoint(Vc).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},Sp=0,Qn=class extends ci{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Sp++}),this.uuid=_r(),this.name="",this.type="Material",this.blending=pr,this.side=rs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=uh,this.blendDst=dh,this.blendEquation=Es,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Qt(0,0,0),this.blendAlpha=0,this.depthFunc=tr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=xd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Oo,this.stencilZFail=Oo,this.stencilZPass=Oo,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){$t(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){$t(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(t).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Qt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.diffuseRoughness!==void 0&&(this.diffuseRoughness=t.diffuseRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessMinimum),t.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=t.iridescenceThicknessMaximum),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=t.iridescenceThicknessRange[1]),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Kn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new yt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new yt().fromArray(t.clearcoatNormalScale)),t.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=e[t.diffuseRoughnessMap]||null),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var Di=new F,Hc=new F,mo=new F,go=new F,oa=class{constructor(t=new F,e=new F(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Di)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Di.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Di.copy(this.origin).addScaledVector(this.direction,e),Di.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Hc.copy(t).add(e).multiplyScalar(.5),mo.copy(e).sub(t).normalize(),go.copy(this.origin).sub(Hc);let r=t.distanceTo(e)*.5,a=-this.direction.dot(mo),o=go.dot(this.direction),l=-go.dot(mo),c=go.lengthSq(),h=Math.abs(1-a*a),f,u,d,g;if(h>0)if(f=a*l-o,u=a*o-l,g=r*h,f>=0)if(u>=-g)if(u<=g){let v=1/h;f*=v,u*=v,d=f*(f+a*u+2*o)+u*(a*f+u+2*l)+c}else u=r,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;else u=-r,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;else u<=-g?(f=Math.max(0,-(-a*r+o)),u=f>0?-r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c):u<=g?(f=0,u=Math.min(Math.max(-r,-l),r),d=u*(u+2*l)+c):(f=Math.max(0,-(a*r+o)),u=f>0?r:Math.min(Math.max(-r,-l),r),d=-f*f+u*(u+2*l)+c);else u=a>0?-r:r,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(Hc).addScaledVector(mo,u),d}intersectSphere(t,e){if(t.radius<0)return null;Di.subVectors(t.center,this.origin);let n=Di.dot(this.direction),s=Di.dot(Di)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),f>=0?(o=(t.min.z-u.z)*f,l=(t.max.z-u.z)*f):(o=(t.max.z-u.z)*f,l=(t.min.z-u.z)*f),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Di)!==null}intersectTriangle(t,e,n,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,f=t.x-a.x,u=t.y-a.y,d=t.z-a.z,g=e.x-a.x,v=e.y-a.y,m=e.z-a.z,p=n.x-a.x,S=n.y-a.y,y=n.z-a.z,x=Math.abs(l),R=Math.abs(c),E=Math.abs(h),_,w,B,A,P,z,Y,I,k,q,V,at;if(x>=R&&x>=E?(B=l,z=f,k=g,at=p,l>=0?(_=c,w=h,A=u,P=d,Y=v,I=m,q=S,V=y):(_=h,w=c,A=d,P=u,Y=m,I=v,q=y,V=S)):R>=E?(B=c,z=u,k=v,at=S,c>=0?(_=h,w=l,A=d,P=f,Y=m,I=g,q=y,V=p):(_=l,w=h,A=f,P=d,Y=g,I=m,q=p,V=y)):(B=h,z=d,k=m,at=y,h>=0?(_=l,w=c,A=f,P=u,Y=g,I=v,q=p,V=S):(_=c,w=l,A=u,P=f,Y=v,I=g,q=S,V=p)),B===0)return null;let J=_/B,it=w/B,rt=1/B,Dt=A-J*z,Pt=P-it*z,$=Y-J*k,j=I-it*k,Nt=q-J*at,Vt=V-it*at,Ct=Nt*j-Vt*$,qt=Dt*Vt-Pt*Nt,Me=$*Pt-j*Dt;if(s){if(Ct<0||qt<0||Me<0)return null}else if((Ct<0||qt<0||Me<0)&&(Ct>0||qt>0||Me>0))return null;let Yt=Ct+qt+Me;if(Yt===0)return null;let re=rt*(Ct*z+qt*k+Me*at);return(Yt>0?re<0:re>0)?null:this.at(re/Yt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},di=class extends Qn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Qt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.combine=Sl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},bu=new Te,ms=new oa,_o=new Bi,wu=new F,xo=new F,yo=new F,vo=new F,Wc=new F,Mo=new F,Tu=new F,So=new F,ke=class extends We{constructor(t=new Be,e=new di){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){Mo.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],f=r[l];h!==0&&(Wc.fromBufferAttribute(f,t),a?Mo.addScaledVector(Wc,h):Mo.addScaledVector(Wc.sub(e),h))}e.add(Mo)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),_o.copy(n.boundingSphere),_o.applyMatrix4(r),ms.copy(t.ray).recast(t.near),!(_o.containsPoint(ms.origin)===!1&&(ms.intersectSphere(_o,wu)===null||ms.origin.distanceToSquared(wu)>(t.far-t.near)**2))&&(bu.copy(r).invert(),ms.copy(t.ray).applyMatrix4(bu),!(n.boundingBox!==null&&ms.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ms)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,u=r.groups,d=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,v=u.length;g<v;g++){let m=u[g],p=a[m.materialIndex],S=Math.max(m.start,d.start),y=Math.min(o.count,Math.min(m.start+m.count,d.start+d.count));for(let x=S,R=y;x<R;x+=3){let E=o.getX(x),_=o.getX(x+1),w=o.getX(x+2);s=bo(this,p,t,n,c,h,f,E,_,w),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let g=Math.max(0,d.start),v=Math.min(o.count,d.start+d.count);for(let m=g,p=v;m<p;m+=3){let S=o.getX(m),y=o.getX(m+1),x=o.getX(m+2);s=bo(this,a,t,n,c,h,f,S,y,x),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,v=u.length;g<v;g++){let m=u[g],p=a[m.materialIndex],S=Math.max(m.start,d.start),y=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let x=S,R=y;x<R;x+=3){let E=x,_=x+1,w=x+2;s=bo(this,p,t,n,c,h,f,E,_,w),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let g=Math.max(0,d.start),v=Math.min(l.count,d.start+d.count);for(let m=g,p=v;m<p;m+=3){let S=m,y=m+1,x=m+2;s=bo(this,a,t,n,c,h,f,S,y,x),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}};function bp(i,t,e,n,s,r,a,o){let l;if(t.side===hn?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===rs,o),l===null)return null;So.copy(o),So.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(So);return c<e.near||c>e.far?null:{distance:c,point:So.clone(),object:i}}function bo(i,t,e,n,s,r,a,o,l,c){i.getVertexPosition(o,xo),i.getVertexPosition(l,yo),i.getVertexPosition(c,vo);let h=bp(i,t,e,n,xo,yo,vo,Tu);if(h){let f=new F;Ui.getBarycoord(Tu,xo,yo,vo,f),s&&(h.uv=Ui.getInterpolatedAttribute(s,o,l,c,f,new yt)),r&&(h.uv1=Ui.getInterpolatedAttribute(r,o,l,c,f,new yt)),a&&(h.normal=Ui.getInterpolatedAttribute(a,o,l,c,f,new F),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:l,c,normal:new F,materialIndex:0};Ui.getNormal(xo,yo,vo,u.normal),h.face=u,h.barycoord=f}return h}var la=class extends bn{constructor(t=null,e=1,n=1,s,r,a,o,l,c=ln,h=ln,f,u){super(null,a,o,l,c,h,s,r,f,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var rr=class extends In{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Js=new Te,Au=new Te,wo=[],Eu=new ui,wp=new Te,qr=new ke,Yr=new Bi,ki=class extends ke{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new rr(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,wp)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new ui),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Js),Eu.copy(t.boundingBox).applyMatrix4(Js),this.boundingBox.union(Eu)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Bi),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Js),Yr.copy(t.boundingSphere).applyMatrix4(Js),this.boundingSphere.union(Yr)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),this.morphTexture=t.morphTexture!==null?t.morphTexture.clone():null,this.instanceColor=t.instanceColor!==null?t.instanceColor.clone():null,this.count=t.count,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=t*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(t,e){let n=this.matrixWorld,s=this.count;if(qr.geometry=this.geometry,qr.material=this.material,qr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Yr.copy(this.boundingSphere),Yr.applyMatrix4(n),t.ray.intersectsSphere(Yr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Js),Au.multiplyMatrices(n,Js),qr.matrixWorld=Au,qr.raycast(t,wo);for(let a=0,o=wo.length;a<o;a++){let l=wo[a];l.instanceId=r,l.object=this,e.push(l)}wo.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new rr(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new la(new Float32Array(s*this.count),s,this.count,Rl,Vn));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<n.length;c++)a+=n[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*t;return r[l]=o,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},gs=new Bi,Tp=new yt(.5,.5),To=new F,ts=class{constructor(t=new Kn,e=new Kn,n=new Kn,s=new Kn,r=new Kn,a=new Kn){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=kn,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],f=r[5],u=r[6],d=r[7],g=r[8],v=r[9],m=r[10],p=r[11],S=r[12],y=r[13],x=r[14],R=r[15];if(s[0].setComponents(c-a,d-h,p-g,R-S).normalize(),s[1].setComponents(c+a,d+h,p+g,R+S).normalize(),s[2].setComponents(c+o,d+f,p+v,R+y).normalize(),s[3].setComponents(c-o,d-f,p-v,R-y).normalize(),n)s[4].setComponents(l,u,m,x).normalize(),s[5].setComponents(c-l,d-u,p-m,R-x).normalize();else if(s[4].setComponents(c-l,d-u,p-m,R-x).normalize(),e===kn)s[5].setComponents(c+l,d+u,p+m,R+x).normalize();else if(e===er)s[5].setComponents(l,u,m,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),gs.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),gs.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(gs)}intersectsSprite(t){gs.center.set(0,0,0);let e=Tp.distanceTo(t.center);return gs.radius=.7071067811865476+e,gs.applyMatrix4(t.matrixWorld),this.intersectsSphere(gs)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(To.x=s.normal.x>0?t.max.x:t.min.x,To.y=s.normal.y>0?t.max.y:t.min.y,To.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(To)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Cu=new Te,jo=class i{constructor(){this.coordinateSystem=kn,this._frustums=[],this._count=0}setFromArrayCamera(t){let e=t.cameras,n=this._frustums;for(let s=0;s<e.length;s++){let r=e[s];Cu.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[s]===void 0&&(n[s]=new ts),n[s].setFromProjectionMatrix(Cu,r.coordinateSystem,r.reversedDepth)}return this._count=e.length,this}getFrustum(t){return this._frustums[t]}intersectsObject(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsObject(t))return!0;return!1}intersectsSprite(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSprite(t))return!0;return!1}intersectsSphere(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSphere(t))return!0;return!1}intersectsBox(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsBox(t))return!0;return!1}containsPoint(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].containsPoint(t))return!0;return!1}copy(t){this.coordinateSystem=t.coordinateSystem;let e=this._frustums,n=t._frustums;for(let s=0;s<t._count;s++)e[s]===void 0&&(e[s]=new ts),e[s].copy(n[s]);return this._count=t._count,this}clone(){return new i().copy(this)}};var ys=class extends Qn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Qt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},tl=new F,el=new F,Ru=new Te,Zr=new oa,Ao=new Bi,Xc=new F,Pu=new F,nl=class extends We{constructor(t=new Be,e=new ys){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)tl.fromBufferAttribute(e,s-1),el.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=tl.distanceTo(el);t.setAttribute("lineDistance",new ne(n,1))}else $t("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ao.copy(n.boundingSphere),Ao.applyMatrix4(s),Ao.radius+=r,t.ray.intersectsSphere(Ao)===!1)return;Ru.copy(s).invert(),Zr.copy(t.ray).applyMatrix4(Ru);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let d=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let v=d,m=g-1;v<m;v+=c){let p=h.getX(v),S=h.getX(v+1),y=Eo(this,t,Zr,l,p,S,v);y&&e.push(y)}if(this.isLineLoop){let v=h.getX(g-1),m=h.getX(d),p=Eo(this,t,Zr,l,v,m,g-1);p&&e.push(p)}}else{let d=Math.max(0,a.start),g=Math.min(u.count,a.start+a.count);for(let v=d,m=g-1;v<m;v+=c){let p=Eo(this,t,Zr,l,v,v+1,v);p&&e.push(p)}if(this.isLineLoop){let v=Eo(this,t,Zr,l,g-1,d,g-1);v&&e.push(v)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Eo(i,t,e,n,s,r,a){let o=i.geometry.attributes.position;if(tl.fromBufferAttribute(o,s),el.fromBufferAttribute(o,r),e.distanceSqToSegment(tl,el,Xc,Pu)>n)return;Xc.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Xc);if(!(c<t.near||c>t.far))return{distance:c,point:Pu.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var Iu=new F,Lu=new F,Gn=class extends nl{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)Iu.fromBufferAttribute(e,s),Lu.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Iu.distanceTo(Lu);t.setAttribute("lineDistance",new ne(n,1))}else $t("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var ca=class extends bn{constructor(t=[],e=Cs,n,s,r,a,o,l,c,h){super(t,e,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},ha=class extends bn{constructor(t,e,n,s,r,a,o,l,c){super(t,e,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var zi=class extends bn{constructor(t,e,n=jn,s,r,a,o=ln,l=ln,c,h=Oi,f=1){if(h!==Oi&&h!==Wi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:f};super(u,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new ir(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},ua=class extends zi{constructor(t,e=jn,n=Cs,s,r,a=ln,o=ln,l,c=Oi){let h={width:t,height:t,depth:1},f=[h,h,h,h,h,h];super(t,t,e,n,s,r,a,o,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},da=class extends bn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},fi=class i extends Be{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],f=[],u=0,d=0;g("z","y","x",-1,-1,n,e,t,a,r,0),g("z","y","x",1,-1,n,e,-t,a,r,1),g("x","z","y",1,1,t,n,e,s,a,2),g("x","z","y",1,-1,t,n,-e,s,a,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ne(c,3)),this.setAttribute("normal",new ne(h,3)),this.setAttribute("uv",new ne(f,2));function g(v,m,p,S,y,x,R,E,_,w,B){let A=x/_,P=R/w,z=x/2,Y=R/2,I=E/2,k=_+1,q=w+1,V=0,at=0,J=new F;for(let it=0;it<q;it++){let rt=it*P-Y;for(let Dt=0;Dt<k;Dt++){let Pt=Dt*A-z;J[v]=Pt*S,J[m]=rt*y,J[p]=I,c.push(J.x,J.y,J.z),J[v]=0,J[m]=0,J[p]=E>0?1:-1,h.push(J.x,J.y,J.z),f.push(Dt/_),f.push(1-it/w),V+=1}}for(let it=0;it<w;it++)for(let rt=0;rt<_;rt++){let Dt=u+rt+k*it,Pt=u+rt+k*(it+1),$=u+(rt+1)+k*(it+1),j=u+(rt+1)+k*it;l.push(Dt,Pt,j),l.push(Pt,$,j),at+=6}o.addGroup(d,at,B),d+=at,u+=V}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var vs=class i extends Be{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);let r=[],a=[],o=[],l=[],c=new F,h=new yt;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let f=0,u=3;f<=e;f++,u+=3){let d=n+f/e*s;c.x=t*Math.cos(d),c.y=t*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(a[u]/t+1)/2,h.y=(a[u+1]/t+1)/2,l.push(h.x,h.y)}for(let f=1;f<=e;f++)r.push(f,f+1,0);this.setIndex(r),this.setAttribute("position",new ne(a,3)),this.setAttribute("normal",new ne(o,3)),this.setAttribute("uv",new ne(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.segments,t.thetaStart,t.thetaLength)}},es=class i extends Be{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],f=[],u=[],d=[],g=0,v=[],m=n/2,p=0;S(),a===!1&&(t>0&&y(!0),e>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new ne(f,3)),this.setAttribute("normal",new ne(u,3)),this.setAttribute("uv",new ne(d,2));function S(){let x=new F,R=new F,E=0,_=(e-t)/n;for(let w=0;w<=r;w++){let B=[],A=w/r,P=A*(e-t)+t;for(let z=0;z<=s;z++){let Y=z/s,I=Y*l+o,k=Math.sin(I),q=Math.cos(I);R.x=P*k,R.y=-A*n+m,R.z=P*q,f.push(R.x,R.y,R.z),x.set(k,_,q).normalize(),u.push(x.x,x.y,x.z),d.push(Y,1-A),B.push(g++)}v.push(B)}for(let w=0;w<s;w++)for(let B=0;B<r;B++){let A=v[B][w],P=v[B+1][w],z=v[B+1][w+1],Y=v[B][w+1];(t>0||B!==0)&&(h.push(A,P,Y),E+=3),(e>0||B!==r-1)&&(h.push(P,z,Y),E+=3)}c.addGroup(p,E,0),p+=E}function y(x){let R=g,E=new yt,_=new F,w=0,B=x===!0?t:e,A=x===!0?1:-1;for(let z=1;z<=s;z++)f.push(0,m*A,0),u.push(0,A,0),d.push(.5,.5),g++;let P=g;for(let z=0;z<=s;z++){let I=z/s*l+o,k=Math.cos(I),q=Math.sin(I);_.x=B*q,_.y=m*A,_.z=B*k,f.push(_.x,_.y,_.z),u.push(0,A,0),E.x=k*.5+.5,E.y=q*.5*A+.5,d.push(E.x,E.y),g++}for(let z=0;z<s;z++){let Y=R+z,I=P+z;x===!0?h.push(I,I+1,Y):h.push(I+1,I,Y),w+=3}c.addGroup(p,w,x===!0?1:2),p+=w}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var fa=class i extends Be{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};let r=[],a=[];o(s),c(n),h(),this.setAttribute("position",new ne(r,3)),this.setAttribute("normal",new ne(r.slice(),3)),this.setAttribute("uv",new ne(a,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function o(S){let y=new F,x=new F,R=new F;for(let E=0;E<e.length;E+=3)d(e[E+0],y),d(e[E+1],x),d(e[E+2],R),l(y,x,R,S)}function l(S,y,x,R){let E=R+1,_=[];for(let w=0;w<=E;w++){_[w]=[];let B=S.clone().lerp(x,w/E),A=y.clone().lerp(x,w/E),P=E-w;for(let z=0;z<=P;z++)z===0&&w===E?_[w][z]=B:_[w][z]=B.clone().lerp(A,z/P)}for(let w=0;w<E;w++)for(let B=0;B<2*(E-w)-1;B++){let A=Math.floor(B/2);B%2===0?(u(_[w][A+1]),u(_[w+1][A]),u(_[w][A])):(u(_[w][A+1]),u(_[w+1][A+1]),u(_[w+1][A]))}}function c(S){let y=new F;for(let x=0;x<r.length;x+=3)y.x=r[x+0],y.y=r[x+1],y.z=r[x+2],y.normalize().multiplyScalar(S),r[x+0]=y.x,r[x+1]=y.y,r[x+2]=y.z}function h(){let S=new F;for(let y=0;y<r.length;y+=3){S.x=r[y+0],S.y=r[y+1],S.z=r[y+2];let x=m(S)/2/Math.PI+.5,R=p(S)/Math.PI+.5;a.push(x,1-R)}g(),f()}function f(){for(let S=0;S<a.length;S+=6){let y=a[S+0],x=a[S+2],R=a[S+4],E=Math.max(y,x,R),_=Math.min(y,x,R);E>.9&&_<.1&&(y<.2&&(a[S+0]+=1),x<.2&&(a[S+2]+=1),R<.2&&(a[S+4]+=1))}}function u(S){r.push(S.x,S.y,S.z)}function d(S,y){let x=S*3;y.x=t[x+0],y.y=t[x+1],y.z=t[x+2]}function g(){let S=new F,y=new F,x=new F,R=new F,E=new yt,_=new yt,w=new yt;for(let B=0,A=0;B<r.length;B+=9,A+=6){S.set(r[B+0],r[B+1],r[B+2]),y.set(r[B+3],r[B+4],r[B+5]),x.set(r[B+6],r[B+7],r[B+8]),E.set(a[A+0],a[A+1]),_.set(a[A+2],a[A+3]),w.set(a[A+4],a[A+5]),R.copy(S).add(y).add(x).divideScalar(3);let P=m(R);v(E,A+0,S,P),v(_,A+2,y,P),v(w,A+4,x,P)}}function v(S,y,x,R){R<0&&S.x===1&&(a[y]=S.x-1),x.x===0&&x.z===0&&(a[y]=R/2/Math.PI+.5)}function m(S){return Math.atan2(S.z,-S.x)}function p(S){return Math.atan2(-S.y,Math.sqrt(S.x*S.x+S.z*S.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.vertices,t.indices,t.radius,t.detail)}};var Co=new F,Ro=new F,qc=new F,Po=new Ui,Gi=class extends Be{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(Bo*e),a=t.getIndex(),o=t.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],f=new Array(3),u=new Map,d=[];for(let g=0;g<l;g+=3){a?(c[0]=a.getX(g),c[1]=a.getX(g+1),c[2]=a.getX(g+2)):(c[0]=g,c[1]=g+1,c[2]=g+2);let{a:v,b:m,c:p}=Po;if(v.fromBufferAttribute(o,c[0]),m.fromBufferAttribute(o,c[1]),p.fromBufferAttribute(o,c[2]),Po.getNormal(qc),f[0]=`${Math.round(v.x*s)},${Math.round(v.y*s)},${Math.round(v.z*s)}`,f[1]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,f[2]=`${Math.round(p.x*s)},${Math.round(p.y*s)},${Math.round(p.z*s)}`,!(f[0]===f[1]||f[1]===f[2]||f[2]===f[0]))for(let S=0;S<3;S++){let y=(S+1)%3,x=f[S],R=f[y],E=Po[h[S]],_=Po[h[y]],w=`${x}_${R}`,B=`${R}_${x}`,A=u.get(B);A?(qc.dot(A.normal)<=r&&(d.push(E.x,E.y,E.z),d.push(_.x,_.y,_.z)),u.set(B,null)):u.has(w)||u.set(w,{index0:c[S],index1:c[y],normal:qc.clone()})}}for(let g of u.values())if(g){let{index0:v,index1:m}=g;Co.fromBufferAttribute(o,v),Ro.fromBufferAttribute(o,m),d.push(Co.x,Co.y,Co.z),d.push(Ro.x,Ro.y,Ro.z)}this.setAttribute("position",new ne(d,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}},Nn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){$t("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,a;e?a=e:a=t*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);let h=n[s],u=n[s+1]-h,d=(a-h)/u;return(s+d)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=e||(a.isVector2?new yt:new F);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new F,s=[],r=[],a=[],o=new F,l=new Te;for(let d=0;d<=t;d++){let g=d/t;s[d]=this.getTangentAt(g,new F)}r[0]=new F,a[0]=new F;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),f=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),f<=c&&(c=f,n.set(0,1,0)),u<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let d=1;d<=t;d++){if(r[d]=r[d-1].clone(),a[d]=a[d-1].clone(),o.crossVectors(s[d-1],s[d]),o.length()>Number.EPSILON){o.normalize();let g=Math.acos(xe(s[d-1].dot(s[d]),-1,1));r[d].applyMatrix4(l.makeRotationAxis(o,g))}a[d].crossVectors(s[d],r[d])}if(e===!0){let d=Math.acos(xe(r[0].dot(r[t]),-1,1));d/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(d=-d);for(let g=1;g<=t;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],d*g)),a[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this.cacheArcLengths=null,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this.cacheArcLengths=null,this}},ar=class extends Nn{constructor(t=0,e=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new yt){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),f=Math.sin(this.aRotation),u=l-this.aX,d=c-this.aY;l=u*h-d*f+this.aX,c=u*f+d*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},il=class extends ar{constructor(t,e,n,s,r,a){super(t,e,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Lh(){let i=0,t=0,e=0,n=0;function s(r,a,o,l){i=r,t=o,e=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,f){let u=(a-r)/c-(o-r)/(c+h)+(o-a)/h,d=(o-a)/h-(l-a)/(h+f)+(l-o)/f;u*=h,d*=h,s(a,o,u,d)},calc:function(r){let a=r*r,o=a*r;return i+t*r+e*a+n*o}}}var Nu=new F,Du=new F,Yc=new Lh,Zc=new Lh,Jc=new Lh,or=class extends Nn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new F){let n=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(Du.subVectors(s[0],s[1]).add(s[0]),c=Du);let f=s[o%r],u=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(Nu.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Nu),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,g=Math.pow(c.distanceToSquared(f),d),v=Math.pow(f.distanceToSquared(u),d),m=Math.pow(u.distanceToSquared(h),d);v<1e-4&&(v=1),g<1e-4&&(g=v),m<1e-4&&(m=v),Yc.initNonuniformCatmullRom(c.x,f.x,u.x,h.x,g,v,m),Zc.initNonuniformCatmullRom(c.y,f.y,u.y,h.y,g,v,m),Jc.initNonuniformCatmullRom(c.z,f.z,u.z,h.z,g,v,m)}else this.curveType==="catmullrom"&&(Yc.initCatmullRom(c.x,f.x,u.x,h.x,this.tension),Zc.initCatmullRom(c.y,f.y,u.y,h.y,this.tension),Jc.initCatmullRom(c.z,f.z,u.z,h.z,this.tension));return n.set(Yc.calc(l),Zc.calc(l),Jc.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new F().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function Uu(i,t,e,n,s){let r=(n-t)*.5,a=(s-e)*.5,o=i*i,l=i*o;return(2*e-2*n+r+a)*l+(-3*e+3*n-2*r-a)*o+r*i+e}function Ap(i,t){let e=1-i;return e*e*t}function Ep(i,t){return 2*(1-i)*i*t}function Cp(i,t){return i*i*t}function $r(i,t,e,n){return Ap(i,t)+Ep(i,e)+Cp(i,n)}function Rp(i,t){let e=1-i;return e*e*e*t}function Pp(i,t){let e=1-i;return 3*e*e*i*t}function Ip(i,t){return 3*(1-i)*i*i*t}function Lp(i,t){return i*i*i*t}function Kr(i,t,e,n,s){return Rp(i,t)+Pp(i,e)+Ip(i,n)+Lp(i,s)}var pa=class extends Nn{constructor(t=new yt,e=new yt,n=new yt,s=new yt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new yt){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Kr(t,s.x,r.x,a.x,o.x),Kr(t,s.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},sl=class extends Nn{constructor(t=new F,e=new F,n=new F,s=new F){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new F){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Kr(t,s.x,r.x,a.x,o.x),Kr(t,s.y,r.y,a.y,o.y),Kr(t,s.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},ma=class extends Nn{constructor(t=new yt,e=new yt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new yt){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new yt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},rl=class extends Nn{constructor(t=new F,e=new F){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new F){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new F){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},ga=class extends Nn{constructor(t=new yt,e=new yt,n=new yt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new yt){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set($r(t,s.x,r.x,a.x),$r(t,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},_a=class extends Nn{constructor(t=new F,e=new F,n=new F){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new F){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set($r(t,s.x,r.x,a.x),$r(t,s.y,r.y,a.y),$r(t,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},xa=class extends Nn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new yt){let n=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],f=s[a>s.length-3?s.length-1:a+2];return n.set(Uu(o,l.x,c.x,h.x,f.x),Uu(o,l.y,c.y,h.y,f.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new yt().fromArray(s))}return this}},al=Object.freeze({__proto__:null,ArcCurve:il,CatmullRomCurve3:or,CubicBezierCurve:pa,CubicBezierCurve3:sl,EllipseCurve:ar,LineCurve:ma,LineCurve3:rl,QuadraticBezierCurve:ga,QuadraticBezierCurve3:_a,SplineCurve:xa}),ol=class extends Nn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1,this.cacheLengths=null}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new al[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this.cacheLengths=null,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new al[s.type]().fromJSON(s))}return this.cacheLengths=null,this}},ya=class extends ol{constructor(t){super(),this.type="Path",this.currentPoint=new yt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new ma(this.currentPoint.clone(),new yt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new ga(this.currentPoint.clone(),new yt(t,e),new yt(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,a){let o=new pa(this.currentPoint.clone(),new yt(t,e),new yt(n,s),new yt(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new xa(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,s,r,a),this}absarc(t,e,n,s,r,a){return this.absellipse(t,e,n,n,s,r,a),this}ellipse(t,e,n,s,r,a,o,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,a,o,l),this}absellipse(t,e,n,s,r,a,o,l){let c=new ar(t,e,n,s,r,a,o,l);if(this.curves.length>0){let f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},pi=class extends ya{constructor(t){super(t),this.uuid=_r(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new ya().fromJSON(s))}return this}};function Np(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=Id(i,0,s,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(n&&(r=Bp(i,t,r,e)),i.length>80*e){o=i[0],l=i[1];let h=o,f=l;for(let u=e;u<s;u+=e){let d=i[u],g=i[u+1];d<o&&(o=d),g<l&&(l=g),d>h&&(h=d),g>f&&(f=g)}c=Math.max(h-o,f-l),c=c!==0?32767/c:0}return va(r,a,e,o,l,c,0),a}function Id(i,t,e,n,s){let r;if(s===Jp(i,t,e,n)>0)for(let a=t;a<e;a+=n)r=Fu(a/n|0,i[a],i[a+1],r);else for(let a=e-n;a>=t;a-=n)r=Fu(a/n|0,i[a],i[a+1],r);return r&&lr(r,r.next)&&(Sa(r),r=r.next),r}function Ms(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(lr(e,e.next)||Ze(e.prev,e,e.next)===0)){if(Sa(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function va(i,t,e,n,s,r,a){if(!i)return;!a&&r&&Hp(i,n,s,r);let o=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?Up(i,n,s,r):Dp(i)){t.push(l.i,i.i,c.i),Sa(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=Fp(Ms(i),t),va(i,t,e,n,s,r,2)):a===2&&Op(i,t,e,n,s,r):va(Ms(i),t,e,n,s,r,1);break}}}function Dp(i){let t=i.prev,e=i,n=i.next;if(Ze(t,e,n)>=0)return!1;let s=t.x,r=e.x,a=n.x,o=t.y,l=e.y,c=n.y,h=Math.min(s,r,a),f=Math.min(o,l,c),u=Math.max(s,r,a),d=Math.max(o,l,c),g=n.next;for(;g!==t;){if(g.x>=h&&g.x<=u&&g.y>=f&&g.y<=d&&Jr(s,o,r,l,a,c,g.x,g.y)&&Ze(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Up(i,t,e,n){let s=i.prev,r=i,a=i.next;if(Ze(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,f=r.y,u=a.y,d=Math.min(o,l,c),g=Math.min(h,f,u),v=Math.max(o,l,c),m=Math.max(h,f,u),p=eh(d,g,t,e,n),S=eh(v,m,t,e,n),y=i.prevZ,x=i.nextZ;for(;y&&y.z>=p&&x&&x.z<=S;){if(y.x>=d&&y.x<=v&&y.y>=g&&y.y<=m&&y!==s&&y!==a&&Jr(o,h,l,f,c,u,y.x,y.y)&&Ze(y.prev,y,y.next)>=0||(y=y.prevZ,x.x>=d&&x.x<=v&&x.y>=g&&x.y<=m&&x!==s&&x!==a&&Jr(o,h,l,f,c,u,x.x,x.y)&&Ze(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;y&&y.z>=p;){if(y.x>=d&&y.x<=v&&y.y>=g&&y.y<=m&&y!==s&&y!==a&&Jr(o,h,l,f,c,u,y.x,y.y)&&Ze(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;x&&x.z<=S;){if(x.x>=d&&x.x<=v&&x.y>=g&&x.y<=m&&x!==s&&x!==a&&Jr(o,h,l,f,c,u,x.x,x.y)&&Ze(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function Fp(i,t){let e=i;do{let n=e.prev,s=e.next.next;!lr(n,s)&&Nd(n,e,e.next,s)&&Ma(n,s)&&Ma(s,n)&&(t.push(n.i,e.i,s.i),Sa(e),Sa(e.next),e=i=s),e=e.next}while(e!==i);return Ms(e)}function Op(i,t,e,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&qp(a,o)){let l=Dd(a,o);a=Ms(a,a.next),l=Ms(l,l.next),va(a,t,e,n,s,r,0),va(l,t,e,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function Bp(i,t,e,n){let s=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*n,l=r<a-1?t[r+1]*n:i.length,c=Id(i,o,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Xp(c))}s.sort(kp);for(let r=0;r<s.length;r++)e=zp(s[r],e);return e}function kp(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function zp(i,t){let e=Gp(i,t);if(!e)return t;let n=Dd(e,i);return Ms(n,n.next),Ms(e,e.next)}function Gp(i,t){let e=t,n=i.x,s=i.y,r=-1/0,a;if(lr(i,e))return e;do{if(lr(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let f=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=n&&f>r&&(r=f,a=e.x<e.next.x?e:e.next,f===n))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,l=a.x,c=a.y,h=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Ld(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){let f=Math.abs(s-e.y)/(n-e.x);Ma(e,i)&&(f<h||f===h&&(e.x>a.x||e.x===a.x&&Vp(a,e)))&&(a=e,h=f)}e=e.next}while(e!==o);return a}function Vp(i,t){return Ze(i.prev,i,t.prev)<0&&Ze(t.next,i,i.next)<0}function Hp(i,t,e,n){let s=i;do s.z===0&&(s.z=eh(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Wp(s)}function Wp(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let a=n,o=0;for(let c=0;c<e&&(o++,a=a.nextZ,!!a);c++);let l=e;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,e*=2}while(t>1);return i}function eh(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Xp(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Ld(i,t,e,n,s,r,a,o){return(s-a)*(t-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(s-a)*(n-o)}function Jr(i,t,e,n,s,r,a,o){return!(i===a&&t===o)&&Ld(i,t,e,n,s,r,a,o)}function qp(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!Yp(i,t)&&(Ma(i,t)&&Ma(t,i)&&Zp(i,t)&&(Ze(i.prev,i,t.prev)||Ze(i,t.prev,t))||lr(i,t)&&Ze(i.prev,i,i.next)>0&&Ze(t.prev,t,t.next)>0)}function Ze(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function lr(i,t){return i.x===t.x&&i.y===t.y}function Nd(i,t,e,n){let s=Lo(Ze(i,t,e)),r=Lo(Ze(i,t,n)),a=Lo(Ze(e,n,i)),o=Lo(Ze(e,n,t));return!!(s!==r&&a!==o||s===0&&Io(i,e,t)||r===0&&Io(i,n,t)||a===0&&Io(e,i,n)||o===0&&Io(e,t,n))}function Io(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function Lo(i){return i>0?1:i<0?-1:0}function Yp(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Nd(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function Ma(i,t){return Ze(i.prev,i,i.next)<0?Ze(i,t,i.next)>=0&&Ze(i,i.prev,t)>=0:Ze(i,t,i.prev)<0||Ze(i,i.next,t)<0}function Zp(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function Dd(i,t){let e=nh(i.i,i.x,i.y),n=nh(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Fu(i,t,e,n){let s=nh(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Sa(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function nh(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Jp(i,t,e,n){let s=0;for(let r=t,a=e-n;r<e;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var ih=class{static triangulate(t,e,n=2){return Np(t,e,n)}},li=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];Ou(t),Bu(n,t);let a=t.length;e.forEach(Ou);for(let l=0;l<e.length;l++)s.push(a),a+=e[l].length,Bu(n,e[l]);let o=ih.triangulate(n,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function Ou(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function Bu(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var ba=class i extends Be{constructor(t=new pi([new yt(.5,.5),new yt(-.5,.5),new yt(-.5,-.5),new yt(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,s=[],r=[];for(let o=0,l=t.length;o<l;o++){let c=t[o];a(c)}this.setAttribute("position",new ne(s,3)),this.setAttribute("uv",new ne(r,2)),this.computeVertexNormals();function a(o){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,f=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,d=e.bevelThickness!==void 0?e.bevelThickness:.2,g=e.bevelSize!==void 0?e.bevelSize:d-.1,v=e.bevelOffset!==void 0?e.bevelOffset:0,m=e.bevelSegments!==void 0?e.bevelSegments:3,p=e.extrudePath,S=e.UVGenerator!==void 0?e.UVGenerator:$p,y,x=!1,R,E,_,w;if(p){y=p.getSpacedPoints(h),x=!0,u=!1;let st=p.isCatmullRomCurve3?p.closed:!1;R=p.computeFrenetFrames(h,st),E=new F,_=new F,w=new F}u||(m=0,d=0,g=0,v=0);let B=o.extractPoints(c),A=B.shape,P=B.holes;if(!li.isClockWise(A)){A=A.reverse();for(let st=0,mt=P.length;st<mt;st++){let vt=P[st];li.isClockWise(vt)&&(P[st]=vt.reverse())}}function Y(st){let vt=10000000000000001e-36,It=st[0];for(let At=1;At<=st.length;At++){let jt=At%st.length,zt=st[jt],fe=zt.x-It.x,Kt=zt.y-It.y,me=fe*fe+Kt*Kt,O=Math.max(Math.abs(zt.x),Math.abs(zt.y),Math.abs(It.x),Math.abs(It.y)),ze=vt*O*O;if(me<=ze){st.splice(jt,1),At--;continue}It=zt}}Y(A),P.forEach(Y);let I=P.length,k=A;for(let st=0;st<I;st++){let mt=P[st];A=A.concat(mt)}function q(st,mt,vt){return mt||ee("ExtrudeGeometry: vec does not exist"),st.clone().addScaledVector(mt,vt)}let V=A.length;function at(st,mt,vt){let It,At,jt,zt=st.x-mt.x,fe=st.y-mt.y,Kt=vt.x-st.x,me=vt.y-st.y,O=zt*zt+fe*fe,ze=zt*me-fe*Kt;if(Math.abs(ze)>Number.EPSILON){let ce=Math.sqrt(O),Ae=Math.sqrt(Kt*Kt+me*me),wt=mt.x-fe/ce,Ge=mt.y+zt/ce,Wt=vt.x-me/Ae,te=vt.y+Kt/Ae,C=((Wt-wt)*me-(te-Ge)*Kt)/(zt*me-fe*Kt);It=wt+zt*C-st.x,At=Ge+fe*C-st.y;let M=It*It+At*At;if(M<=2)return new yt(It,At);jt=Math.sqrt(M/2)}else{let ce=!1;zt>Number.EPSILON?Kt>Number.EPSILON&&(ce=!0):zt<-Number.EPSILON?Kt<-Number.EPSILON&&(ce=!0):Math.sign(fe)===Math.sign(me)&&(ce=!0),ce?(It=-fe,At=zt,jt=Math.sqrt(O)):(It=zt,At=fe,jt=Math.sqrt(O/2))}return new yt(It/jt,At/jt)}let J=[];for(let st=0,mt=k.length,vt=mt-1,It=st+1;st<mt;st++,vt++,It++)vt===mt&&(vt=0),It===mt&&(It=0),J[st]=at(k[st],k[vt],k[It]);let it=[],rt,Dt=J.concat();for(let st=0,mt=I;st<mt;st++){let vt=P[st];rt=[];for(let It=0,At=vt.length,jt=At-1,zt=It+1;It<At;It++,jt++,zt++)jt===At&&(jt=0),zt===At&&(zt=0),rt[It]=at(vt[It],vt[jt],vt[zt]);it.push(rt),Dt=Dt.concat(rt)}let Pt;if(m===0)Pt=li.triangulateShape(k,P);else{let st=[],mt=[];for(let vt=0;vt<m;vt++){let It=vt/m,At=d*Math.cos(It*Math.PI/2),jt=g*Math.sin(It*Math.PI/2)+v;for(let zt=0,fe=k.length;zt<fe;zt++){let Kt=q(k[zt],J[zt],jt);qt(Kt.x,Kt.y,-At),It===0&&st.push(Kt)}for(let zt=0,fe=I;zt<fe;zt++){let Kt=P[zt];rt=it[zt];let me=[];for(let O=0,ze=Kt.length;O<ze;O++){let ce=q(Kt[O],rt[O],jt);qt(ce.x,ce.y,-At),It===0&&me.push(ce)}It===0&&mt.push(me)}}Pt=li.triangulateShape(st,mt)}let $=Pt.length,j=g+v;for(let st=0;st<V;st++){let mt=u?q(A[st],Dt[st],j):A[st];x?(_.copy(R.normals[0]).multiplyScalar(mt.x),E.copy(R.binormals[0]).multiplyScalar(mt.y),w.copy(y[0]).add(_).add(E),qt(w.x,w.y,w.z)):qt(mt.x,mt.y,0)}for(let st=1;st<=h;st++)for(let mt=0;mt<V;mt++){let vt=u?q(A[mt],Dt[mt],j):A[mt];x?(_.copy(R.normals[st]).multiplyScalar(vt.x),E.copy(R.binormals[st]).multiplyScalar(vt.y),w.copy(y[st]).add(_).add(E),qt(w.x,w.y,w.z)):qt(vt.x,vt.y,f/h*st)}for(let st=m-1;st>=0;st--){let mt=st/m,vt=d*Math.cos(mt*Math.PI/2),It=g*Math.sin(mt*Math.PI/2)+v;for(let At=0,jt=k.length;At<jt;At++){let zt=q(k[At],J[At],It);qt(zt.x,zt.y,f+vt)}for(let At=0,jt=P.length;At<jt;At++){let zt=P[At];rt=it[At];for(let fe=0,Kt=zt.length;fe<Kt;fe++){let me=q(zt[fe],rt[fe],It);x?qt(me.x,me.y+y[h-1].y,y[h-1].x+vt):qt(me.x,me.y,f+vt)}}}Nt(),Vt();function Nt(){let st=s.length/3;if(u){let mt=0,vt=V*mt;for(let It=0;It<$;It++){let At=Pt[It];Me(At[2]+vt,At[1]+vt,At[0]+vt)}mt=h+m*2,vt=V*mt;for(let It=0;It<$;It++){let At=Pt[It];Me(At[0]+vt,At[1]+vt,At[2]+vt)}}else{for(let mt=0;mt<$;mt++){let vt=Pt[mt];Me(vt[2],vt[1],vt[0])}for(let mt=0;mt<$;mt++){let vt=Pt[mt];Me(vt[0]+V*h,vt[1]+V*h,vt[2]+V*h)}}n.addGroup(st,s.length/3-st,0)}function Vt(){let st=s.length/3,mt=0;Ct(k,mt),mt+=k.length;for(let vt=0,It=P.length;vt<It;vt++){let At=P[vt];Ct(At,mt),mt+=At.length}n.addGroup(st,s.length/3-st,1)}function Ct(st,mt){let vt=st.length;for(;--vt>=0;){let It=vt,At=vt-1;At<0&&(At=st.length-1);for(let jt=0,zt=h+m*2;jt<zt;jt++){let fe=V*jt,Kt=V*(jt+1),me=mt+It+fe,O=mt+At+fe,ze=mt+At+Kt,ce=mt+It+Kt;Yt(me,O,ze,ce)}}}function qt(st,mt,vt){l.push(st),l.push(mt),l.push(vt)}function Me(st,mt,vt){re(st),re(mt),re(vt);let It=s.length/3,At=S.generateTopUV(n,s,It-3,It-2,It-1);de(At[0]),de(At[1]),de(At[2])}function Yt(st,mt,vt,It){re(st),re(mt),re(It),re(mt),re(vt),re(It);let At=s.length/3,jt=S.generateSideWallUV(n,s,At-6,At-3,At-2,At-1);de(jt[0]),de(jt[1]),de(jt[3]),de(jt[1]),de(jt[2]),de(jt[3])}function re(st){s.push(l[st*3+0]),s.push(l[st*3+1]),s.push(l[st*3+2])}function de(st){r.push(st.x),r.push(st.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return Kp(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];n.push(o)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new al[s.type]().fromJSON(s)),new i(n,t.options)}},$p={generateTopUV:function(i,t,e,n,s){let r=t[e*3],a=t[e*3+1],o=t[n*3],l=t[n*3+1],c=t[s*3],h=t[s*3+1];return[new yt(r,a),new yt(o,l),new yt(c,h)]},generateSideWallUV:function(i,t,e,n,s,r){let a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],f=t[n*3+2],u=t[s*3],d=t[s*3+1],g=t[s*3+2],v=t[r*3],m=t[r*3+1],p=t[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new yt(a,1-l),new yt(c,1-f),new yt(u,1-g),new yt(v,1-p)]:[new yt(o,1-l),new yt(h,1-f),new yt(d,1-g),new yt(m,1-p)]}};function Kp(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var wa=class i extends fa{constructor(t=1,e=0){let n=(1+Math.sqrt(5))/2,s=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,r,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new i(t.radius,t.detail)}};var Ta=class i extends fa{constructor(t=1,e=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new i(t.radius,t.detail)}},gn=class i extends Be{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,f=t/o,u=e/l,d=[],g=[],v=[],m=[];for(let p=0;p<h;p++){let S=p*u-a;for(let y=0;y<c;y++){let x=y*f-r;g.push(x,-S,0),v.push(0,0,1),m.push(y/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<o;S++){let y=S+c*p,x=S+c*(p+1),R=S+1+c*(p+1),E=S+1+c*p;d.push(y,x,E),d.push(x,R,E)}this.setIndex(d),this.setAttribute("position",new ne(g,3)),this.setAttribute("normal",new ne(v,3)),this.setAttribute("uv",new ne(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}},Aa=class i extends Be{constructor(t=.5,e=1,n=32,s=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:a},n=Math.max(3,n),s=Math.max(1,s);let o=[],l=[],c=[],h=[],f=t,u=(e-t)/s,d=new F,g=new yt;for(let v=0;v<=s;v++){for(let m=0;m<=n;m++){let p=r+m/n*a;d.x=f*Math.cos(p),d.y=f*Math.sin(p),l.push(d.x,d.y,d.z),c.push(0,0,1),g.x=(d.x/e+1)/2,g.y=(d.y/e+1)/2,h.push(g.x,g.y)}f+=u}for(let v=0;v<s;v++){let m=v*(n+1);for(let p=0;p<n;p++){let S=p+m,y=S,x=S+n+1,R=S+n+2,E=S+1;o.push(y,x,E),o.push(x,R,E)}}this.setIndex(o),this.setAttribute("position",new ne(l,3)),this.setAttribute("normal",new ne(c,3)),this.setAttribute("uv",new ne(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Ss=class i extends Be{constructor(t=new pi([new yt(0,.5),new yt(-.5,-.5),new yt(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],s=[],r=[],a=[],o=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(n),this.setAttribute("position",new ne(s,3)),this.setAttribute("normal",new ne(r,3)),this.setAttribute("uv",new ne(a,2));function c(h){let f=s.length/3,u=h.extractPoints(e),d=u.shape,g=u.holes;li.isClockWise(d)===!1&&(d=d.reverse());for(let m=0,p=g.length;m<p;m++){let S=g[m];li.isClockWise(S)===!0&&(g[m]=S.reverse())}let v=li.triangulateShape(d,g);for(let m=0,p=g.length;m<p;m++){let S=g[m];d=d.concat(S)}for(let m=0,p=d.length;m<p;m++){let S=d[m];s.push(S.x,S.y,0),r.push(0,0,1),a.push(S.x,S.y)}for(let m=0,p=v.length;m<p;m++){let S=v[m],y=S[0]+f,x=S[1]+f,R=S[2]+f;n.push(y,x,R),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return Qp(e,t)}static fromJSON(t,e){let n=[];for(let s=0,r=t.shapes.length;s<r;s++){let a=e[t.shapes[s]];n.push(a)}return new i(n,t.curveSegments)}};function Qp(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){let s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}var Ea=class i extends Be{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],f=new F,u=new F,d=[],g=[],v=[],m=[];for(let p=0;p<=n;p++){let S=[],y=p/n,x=a+y*o,R=t*Math.cos(x),E=Math.sqrt(t*t-R*R),_=0;p===0&&a===0?_=.5/e:p===n&&l===Math.PI&&(_=-.5/e);for(let w=0;w<=e;w++){let B=w/e,A=s+B*r;f.x=-E*Math.cos(A),f.y=R,f.z=E*Math.sin(A),g.push(f.x,f.y,f.z),u.copy(f).normalize(),v.push(u.x,u.y,u.z),m.push(B+_,1-y),S.push(c++)}h.push(S)}for(let p=0;p<n;p++)for(let S=0;S<e;S++){let y=h[p][S+1],x=h[p][S],R=h[p+1][S],E=h[p+1][S+1];(p!==0||a>0)&&d.push(y,x,E),(p!==n-1||l<Math.PI)&&d.push(x,R,E)}this.setIndex(d),this.setAttribute("position",new ne(g,3)),this.setAttribute("normal",new ne(v,3)),this.setAttribute("uv",new ne(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var bs=class i extends Be{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,a=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:a,thetaLength:o},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],h=[],f=[],u=new F,d=new F,g=new F;for(let v=0;v<=n;v++){let m=a+v/n*o;for(let p=0;p<=s;p++){let S=p/s*r;d.x=(t+e*Math.cos(m))*Math.cos(S),d.y=(t+e*Math.cos(m))*Math.sin(S),d.z=e*Math.sin(m),c.push(d.x,d.y,d.z),u.x=t*Math.cos(S),u.y=t*Math.sin(S),g.subVectors(d,u).normalize(),h.push(g.x,g.y,g.z),f.push(p/s),f.push(v/n)}}for(let v=1;v<=n;v++)for(let m=1;m<=s;m++){let p=(s+1)*v+m-1,S=(s+1)*(v-1)+m-1,y=(s+1)*(v-1)+m,x=(s+1)*v+m;l.push(p,S,x),l.push(S,y,x)}this.setIndex(l),this.setAttribute("position",new ne(c,3)),this.setAttribute("normal",new ne(h,3)),this.setAttribute("uv",new ne(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var cr=class i extends Be{constructor(t=new _a(new F(-1,-1,0),new F(-1,1,0),new F(1,1,0)),e=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:s,closed:r};let a=t.computeFrenetFrames(e,r);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new F,l=new F,c=new yt,h=new F,f=[],u=[],d=[],g=[];v(),this.setIndex(g),this.setAttribute("position",new ne(f,3)),this.setAttribute("normal",new ne(u,3)),this.setAttribute("uv",new ne(d,2));function v(){for(let y=0;y<e;y++)m(y);m(r===!1?e:0),S(),p()}function m(y){h=t.getPointAt(y/e,h);let x=a.normals[y],R=a.binormals[y];for(let E=0;E<=s;E++){let _=E/s*Math.PI*2,w=Math.sin(_),B=-Math.cos(_);l.x=B*x.x+w*R.x,l.y=B*x.y+w*R.y,l.z=B*x.z+w*R.z,l.normalize(),u.push(l.x,l.y,l.z),o.x=h.x+n*l.x,o.y=h.y+n*l.y,o.z=h.z+n*l.z,f.push(o.x,o.y,o.z)}}function p(){for(let y=1;y<=e;y++)for(let x=1;x<=s;x++){let R=(s+1)*(y-1)+(x-1),E=(s+1)*y+(x-1),_=(s+1)*y+x,w=(s+1)*(y-1)+x;g.push(R,E,w),g.push(E,_,w)}}function S(){for(let y=0;y<=e;y++)for(let x=0;x<=s;x++)c.x=y/e,c.y=x/s,d.push(c.x,c.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new i(new al[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};var Ca=class extends Qn{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new Qt(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};function Ps(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(ku(s))s.isRenderTargetTexture?($t("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(ku(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function _n(i){let t={};for(let e=0;e<i.length;e++){let n=Ps(i[e]);for(let s in n)t[s]=n[s]}return t}function ku(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function jp(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Nh(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ye.workingColorSpace}var Ud={clone:Ps,merge:_n},tm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,em=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,mi=class extends Qn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=tm,this.fragmentShader=em,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Ps(t.uniforms),this.uniformsGroups=jp(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new Qt().setHex(s.value);break;case"v2":this.uniforms[n].value=new yt().fromArray(s.value);break;case"v3":this.uniforms[n].value=new F().fromArray(s.value);break;case"v4":this.uniforms[n].value=new He().fromArray(s.value);break;case"m3":this.uniforms[n].value=new ie().fromArray(s.value);break;case"m4":this.uniforms[n].value=new Te().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},ll=class extends mi{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},gi=class extends Qn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Qt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Qt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Wa,this.normalScale=new yt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},Vi=class extends gi{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new yt(1,1),this.clearcoatNormalMap=null,this.diffuseRoughnessMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return xe(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessMinimum=100,this.iridescenceThicknessMaximum=400,this.iridescenceThicknessMap=null,this.sheenColor=new Qt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Qt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Qt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._diffuseRoughness=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get diffuseRoughness(){return this._diffuseRoughness}set diffuseRoughness(t){this._diffuseRoughness>0!=t>0&&this.version++,this._diffuseRoughness=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}get iridescenceThicknessRange(){return _s('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),[this.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum]}set iridescenceThicknessRange(t){_s('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),this.iridescenceThicknessMinimum=t[0],this.iridescenceThicknessMaximum=t[1]}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.diffuseRoughness=t.diffuseRoughness,this.diffuseRoughnessMap=t.diffuseRoughnessMap,this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessMinimum=t.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum=t.iridescenceThicknessMaximum,this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var Ra=class extends Qn{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Qt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Qt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Wa,this.normalScale=new yt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.combine=Sl,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},cl=class extends Qn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=gd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},hl=class extends Qn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function $s(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function No(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var ns=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},ul=class extends ns{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Qc,endingEnd:Qc}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case jc:r=t,o=2*e-n;break;case th:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case jc:a=t,l=2*n-e;break;case th:a=1,l=n+s[1]-s[0];break;default:a=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this._offsetPrev,f=this._offsetNext,u=this._weightPrev,d=this._weightNext,g=(n-e)/(s-e),v=g*g,m=v*g,p=-u*m+2*u*v-u*g,S=(1+u)*m+(-1.5-2*u)*v+(-.5+u)*g+1,y=(-1-d)*m+(1.5+d)*v+.5*g,x=d*m-d*v;for(let R=0;R!==o;++R)r[R]=p*a[h+R]+S*a[c+R]+y*a[l+R]+x*a[f+R];return r}},dl=class extends ns{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=(n-e)/(s-e),f=1-h;for(let u=0;u!==o;++u)r[u]=a[c+u]*f+a[l+u]*h;return r}},fl=class extends ns{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},pl=class extends ns{interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this.inTangents,f=this.outTangents;if(!h||!f){let g=(n-e)/(s-e),v=1-g;for(let m=0;m!==o;++m)r[m]=a[c+m]*v+a[l+m]*g;return r}let u=o*2,d=t-1;for(let g=0;g!==o;++g){let v=a[c+g],m=a[l+g],p=d*u+g*2,S=f[p],y=f[p+1],x=t*u+g*2,R=h[x],E=h[x+1],_=im(n,e,S,R,s);r[g]=Fd(_,v,y,E,m)}return r}};function Fd(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function nm(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function im(i,t,e,n,s){let r=(i-t)/(s-t);for(let a=0;a<8;a++){let o=Fd(r,t,e,n,s)-i;if(Math.abs(o)<1e-10)break;let l=nm(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var Dn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=$s(e,this.TimeBufferType),this.values=$s(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:$s(t.times,Array),values:$s(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),No(t.settings)&&(n.settings={inTangents:$s(t.settings.inTangents,Array),outTangents:$s(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new fl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new dl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new ul(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new pl(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Qr:e=this.InterpolantFactoryMethodDiscrete;break;case Zo:e=this.InterpolantFactoryMethodLinear;break;case Fo:e=this.InterpolantFactoryMethodSmooth;break;case Kc:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return $t("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Qr;case this.InterpolantFactoryMethodLinear:return Zo;case this.InterpolantFactoryMethodSmooth:return Fo;case this.InterpolantFactoryMethodBezier:return Kc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t;No(this.settings)&&(zu(this.settings.inTangents,t),zu(this.settings.outTangents,t))}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;No(this.settings)&&(Gu(this.settings.inTangents,t),Gu(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(ee("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(ee("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){ee("KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(a!==null&&a>l){ee("KeyframeTrack: Out of order keys.",this,o,l,a),t=!1;break}a=l}if(s!==void 0&&ip(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){ee("KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Fo,r=t.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=t[o],h=t[o+1];if(c!==h&&(o!==1||c!==t[0]))if(s)l=!0;else{let f=o*n,u=f-n,d=f+n;for(let g=0;g!==n;++g){let v=e[f+g];if(v!==e[u+g]||v!==e[d+g]){l=!0;break}}}if(l){if(o!==a){t[a]=t[o];let f=o*n,u=a*n;for(let d=0;d!==n;++d)e[u+d]=e[f+d]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)e[l+c]=e[o+c];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,No(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function zu(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]+=t}function Gu(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Dn.prototype.ValueTypeName="";Dn.prototype.TimeBufferType=Float32Array;Dn.prototype.ValueBufferType=Float32Array;Dn.prototype.DefaultInterpolation=Zo;var is=class extends Dn{constructor(t,e,n){super(t,e,n)}};is.prototype.ValueTypeName="bool";is.prototype.ValueBufferType=Array;is.prototype.DefaultInterpolation=Qr;is.prototype.InterpolantFactoryMethodLinear=void 0;is.prototype.InterpolantFactoryMethodSmooth=void 0;var ml=class extends Dn{constructor(t,e,n,s){super(t,e,n,s)}};ml.prototype.ValueTypeName="color";var gl=class extends Dn{constructor(t,e,n,s){super(t,e,n,s)}};gl.prototype.ValueTypeName="number";var _l=class extends ns{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-e)/(s-e),c=t*o;for(let h=c+o;c!==h;c+=4)zn.slerpFlat(r,0,a,c-o,a,c,l);return r}},Pa=class extends Dn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new _l(this.times,this.values,this.getValueSize(),t)}};Pa.prototype.ValueTypeName="quaternion";Pa.prototype.InterpolantFactoryMethodSmooth=void 0;var ss=class extends Dn{constructor(t,e,n){super(t,e,n)}};ss.prototype.ValueTypeName="string";ss.prototype.ValueBufferType=Array;ss.prototype.DefaultInterpolation=Qr;ss.prototype.InterpolantFactoryMethodLinear=void 0;ss.prototype.InterpolantFactoryMethodSmooth=void 0;var xl=class extends Dn{constructor(t,e,n,s){super(t,e,n,s)}};xl.prototype.ValueTypeName="vector";var yl=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,f){return c.push(h,f),this},this.removeHandler=function(h){let f=c.indexOf(h);return f!==-1&&c.splice(f,2),this},this.getHandler=function(h){for(let f=0,u=c.length;f<u;f+=2){let d=c[f],g=c[f+1];if(d.global&&(d.lastIndex=0),d.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Od=new yl,vl=class{constructor(t){this.manager=t!==void 0?t:Od,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}setPriority(t){return this.priority=t,this}setCache(t){return this.cache=t,this}abort(){return this}};vl.DEFAULT_MATERIAL_NAME="__DEFAULT";var hr=class extends We{static registerNode(t){this.prototype._lightNode=t}constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Qt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},Ia=class extends hr{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(We.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Qt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},$c=new Te,Vu=new F,Hu=new F,La=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new yt(512,512),this.mapType=En,this.map=null,this.mapPass=null,this.matrix=new Te,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ts,this._frameExtents=new yt(1,1),this._viewportCount=1,this._viewports=[new He(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Vu.setFromMatrixPosition(t.matrixWorld),e.position.copy(Vu),Hu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Hu),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){$c.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix($c,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===er||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply($c)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.mapType=t.mapType,this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.mapType=this.mapType,t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Do=new F,Uo=new zn,ai=new F,Na=class extends We{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Te,this.projectionMatrix=new Te,this.projectionMatrixInverse=new Te,this.coordinateSystem=kn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Do,Uo,ai),ai.x===1&&ai.y===1&&ai.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Do,Uo,ai.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Do,Uo,ai),ai.x===1&&ai.y===1&&ai.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Do,Uo,ai.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ji=new F,Wu=new yt,Xu=new yt,mn=class extends Na{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Jo*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Bo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Jo*2*Math.atan(Math.tan(Bo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){ji.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(ji.x,ji.y).multiplyScalar(-t/ji.z),ji.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ji.x,ji.y).multiplyScalar(-t/ji.z)}getViewSize(t,e){return this.getViewBounds(t,Wu,Xu),e.subVectors(Xu,Wu)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Bo*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var sh=class extends La{constructor(){super(new mn(90,1,.5,500)),this.isPointLightShadow=!0}},Da=class extends hr{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new sh}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Ua=class extends Na{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},rh=class extends La{constructor(){super(new Ua(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ws=class extends hr{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(We.DEFAULT_UP),this.updateMatrix(),this.target=new We,this.shadow=new rh}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}};var Ks=-90,Qs=1,ur=class extends We{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new mn(Ks,Qs,t,e);s.layers=this.layers,this.add(s);let r=new mn(Ks,Qs,t,e);r.layers=this.layers,this.add(r);let a=new mn(Ks,Qs,t,e);a.layers=this.layers,this.add(a);let o=new mn(Ks,Qs,t,e);o.layers=this.layers,this.add(o);let l=new mn(Ks,Qs,t,e);l.layers=this.layers,this.add(l);let c=new mn(Ks,Qs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(let c of e)this.remove(c);if(t===kn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===er)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,f=t.getRenderTarget(),u=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;let v=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.mipmapsAutoUpdate=v,t.setRenderTarget(n,5,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(f,u,d),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Ml=class extends mn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t,this.perCameraFrustumCulled=!1}};var Dh="\\[\\]\\.:\\/",sm=new RegExp("["+Dh+"]","g"),Uh="[^"+Dh+"]",rm="[^"+Dh.replace("\\.","")+"]",am=/((?:WC+[\/:])*)/.source.replace("WC",Uh),om=/(WCOD+)?/.source.replace("WCOD",rm),lm=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Uh),cm=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Uh),hm=new RegExp("^"+am+om+lm+cm+"$"),um=["material","materials","bones","map"],ah=class{constructor(t,e,n){let s=n||Oe.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Oe=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(sm,"")}static parseTrackName(t){let e=hm.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);um.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let l=n(o.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){$t("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){ee("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){ee("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){ee("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){ee("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){ee("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){ee("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){ee("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let a=t[s];if(a===void 0){let c=e.nodeName;ee("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){ee("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){ee("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Oe.Composite=ah;Oe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Oe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Oe.prototype.GetterByBindingType=[Oe.prototype._getValue_direct,Oe.prototype._getValue_array,Oe.prototype._getValue_arrayElement,Oe.prototype._getValue_toArray];Oe.prototype.SetterByBindingTypeAndVersioning=[[Oe.prototype._setValue_direct,Oe.prototype._setValue_direct_setNeedsUpdate,Oe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Oe.prototype._setValue_array,Oe.prototype._setValue_array_setNeedsUpdate,Oe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Oe.prototype._setValue_arrayElement,Oe.prototype._setValue_arrayElement_setNeedsUpdate,Oe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Oe.prototype._setValue_fromArray,Oe.prototype._setValue_fromArray_setNeedsUpdate,Oe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Cy=new Float32Array(1);var oh=class{static{this.prototype.isMatrix2=!0}constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};var dr=class extends Gn{constructor(t=10,e=10,n=4473924,s=8947848){n=new Qt(n),s=new Qt(s);let r=e/2,a=t/e,o=t/2,l=[],c=[];for(let u=0,d=0,g=-o;u<=e;u++,g+=a){l.push(-o,0,g,o,0,g),l.push(g,0,-o,g,0,o);let v=u===r?n:s;v.toArray(c,d),d+=3,v.toArray(c,d),d+=3,v.toArray(c,d),d+=3,v.toArray(c,d),d+=3}let h=new Be;h.setAttribute("position",new ne(l,3)),h.setAttribute("color",new ne(c,3));let f=new ys({vertexColors:!0,toneMapped:!1});super(h,f),this.type="GridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}};function Fh(i,t,e,n){let s=dm(n);switch(e){case wh:return i*t;case Rl:return i*t/s.components*s.byteLength;case Pl:return i*t/s.components*s.byteLength;case os:return i*t*2/s.components*s.byteLength;case Il:return i*t*2/s.components*s.byteLength;case Th:return i*t*3/s.components*s.byteLength;case ei:return i*t*4/s.components*s.byteLength;case Ll:return i*t*4/s.components*s.byteLength;case Ba:case ka:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case za:case Ga:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Dl:case Fl:return Math.max(i,16)*Math.max(t,8)/4;case Nl:case Ul:return Math.max(i,8)*Math.max(t,8)/2;case Ol:case Bl:case zl:case Gl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case kl:case Va:case Vl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Hl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Wl:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Xl:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case ql:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Yl:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Zl:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Jl:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case $l:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Kl:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Ql:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case jl:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case tc:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case ec:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case nc:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case ic:case sc:case rc:return Math.ceil(i/4)*Math.ceil(t/4)*16;case ac:case oc:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Ha:case lc:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function dm(i){switch(i){case En:case vh:return{byteLength:1,components:1};case gr:case Mh:case ti:return{byteLength:2,components:1};case El:case Cl:return{byteLength:2,components:4};case jn:case Al:case Vn:return{byteLength:4,components:1};case Sh:case bh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"187"}}));typeof window<"u"&&(window.__THREE__?$t("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="187");function af(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function vm(i){let t=new WeakMap;function e(o,l){let c=o.array,h=o.usage,f=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),o.onUploadCallback();let d;if(c instanceof Float32Array)d=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?d=i.HALF_FLOAT:d=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=i.SHORT;else if(c instanceof Uint32Array)d=i.UNSIGNED_INT;else if(c instanceof Int32Array)d=i.INT;else if(c instanceof Int8Array)d=i.BYTE;else if(c instanceof Uint8Array)d=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function n(o,l,c){let h=l.array,f=l.updateRanges;if(i.bindBuffer(c,o),f.length===0)i.bufferSubData(c,0,h);else{f.sort((d,g)=>d.start-g.start);let u=0;for(let d=1;d<f.length;d++){let g=f[u],v=f[d];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++u,f[u]=v)}f.length=u+1;for(let d=0,g=f.length;d<g;d++){let v=f[d];i.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Mm=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Sm=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,bm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,wm=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Tm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Am=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Em=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Cm=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Rm=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Pm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Im=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Lm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Nm=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Dm=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Um=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Fm=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Om=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Bm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,km=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,zm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Gm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Vm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Hm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Wm=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Xm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,qm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ym=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Zm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Jm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,$m="gl_FragColor = linearToOutputTexel( gl_FragColor );",Km=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Qm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,jm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,t0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,e0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,n0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,i0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,s0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,r0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,a0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,o0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,l0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,c0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,h0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,u0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,d0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,f0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,p0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,m0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,g0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,_0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,x0=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,y0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,v0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,M0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,S0=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,b0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,w0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,T0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,A0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,E0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,C0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,R0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,P0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,I0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,L0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,N0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,D0=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,U0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,F0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,O0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,B0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,k0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,z0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,G0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,V0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,H0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,W0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,X0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,q0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Y0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Z0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,J0=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,$0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,K0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Q0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,j0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,tg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,eg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ng=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,ig=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,sg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,rg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,ag=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,og=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,lg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,cg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,hg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ug=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,dg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,fg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,pg=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,mg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,gg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,_g=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,xg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,yg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,vg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Mg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Sg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,bg=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,wg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Tg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ag=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Eg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Cg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Rg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Pg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Ig=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Lg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ng=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Dg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Ug=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Fg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Og=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,kg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Gg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Vg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Wg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Xg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Yg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Zg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Jg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,$g=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Kg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Qg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,jg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,pe={alphahash_fragment:Mm,alphahash_pars_fragment:Sm,alphamap_fragment:bm,alphamap_pars_fragment:wm,alphatest_fragment:Tm,alphatest_pars_fragment:Am,aomap_fragment:Em,aomap_pars_fragment:Cm,batching_pars_vertex:Rm,batching_vertex:Pm,begin_vertex:Im,beginnormal_vertex:Lm,bsdfs:Nm,iridescence_fragment:Dm,bumpmap_pars_fragment:Um,clipping_planes_fragment:Fm,clipping_planes_pars_fragment:Om,clipping_planes_pars_vertex:Bm,clipping_planes_vertex:km,color_fragment:zm,color_pars_fragment:Gm,color_pars_vertex:Vm,color_vertex:Hm,common:Wm,defaultnormal_vertex:Xm,displacementmap_pars_vertex:qm,displacementmap_vertex:Ym,emissivemap_fragment:Zm,emissivemap_pars_fragment:Jm,colorspace_fragment:$m,colorspace_pars_fragment:Km,envmap_fragment:Qm,envmap_common_pars_fragment:jm,envmap_pars_fragment:t0,envmap_pars_vertex:e0,envmap_physical_pars_fragment:d0,envmap_vertex:n0,fog_vertex:i0,fog_pars_vertex:s0,fog_fragment:r0,fog_pars_fragment:a0,gradientmap_pars_fragment:o0,lightmap_pars_fragment:l0,lights_lambert_fragment:c0,lights_lambert_pars_fragment:h0,lights_pars_begin:u0,lights_toon_fragment:f0,lights_toon_pars_fragment:p0,lights_phong_fragment:m0,lights_phong_pars_fragment:g0,lights_physical_fragment:_0,lights_physical_pars_fragment:x0,lights_fragment_begin:y0,lights_fragment_maps:v0,lights_fragment_end:M0,lightprobes_pars_fragment:S0,logdepthbuf_fragment:b0,logdepthbuf_pars_fragment:w0,logdepthbuf_pars_vertex:T0,logdepthbuf_vertex:A0,map_fragment:E0,map_pars_fragment:C0,map_particle_fragment:R0,map_particle_pars_fragment:P0,metalnessmap_fragment:I0,metalnessmap_pars_fragment:L0,morphinstance_vertex:N0,morphcolor_vertex:D0,morphnormal_vertex:U0,morphtarget_pars_vertex:F0,morphtarget_vertex:O0,normal_fragment_begin:B0,normal_fragment_maps:k0,normal_pars_fragment:z0,normal_pars_vertex:G0,normal_vertex:V0,normalmap_pars_fragment:H0,clearcoat_normal_fragment_begin:W0,clearcoat_normal_fragment_maps:X0,clearcoat_pars_fragment:q0,iridescence_pars_fragment:Y0,opaque_fragment:Z0,packing:J0,premultiplied_alpha_fragment:$0,project_vertex:K0,dithering_fragment:Q0,dithering_pars_fragment:j0,roughnessmap_fragment:tg,roughnessmap_pars_fragment:eg,shadowmap_pars_fragment:ng,shadowmap_pars_vertex:ig,shadowmap_vertex:sg,shadowmask_pars_fragment:rg,skinbase_vertex:ag,skinning_pars_vertex:og,skinning_vertex:lg,skinnormal_vertex:cg,specularmap_fragment:hg,specularmap_pars_fragment:ug,tonemapping_fragment:dg,tonemapping_pars_fragment:fg,transmission_fragment:pg,transmission_pars_fragment:mg,uv_pars_fragment:gg,uv_pars_vertex:_g,uv_vertex:xg,worldpos_vertex:yg,background_vert:vg,background_frag:Mg,backgroundCube_vert:Sg,backgroundCube_frag:bg,cube_vert:wg,cube_frag:Tg,depth_vert:Ag,depth_frag:Eg,distance_vert:Cg,distance_frag:Rg,equirect_vert:Pg,equirect_frag:Ig,linedashed_vert:Lg,linedashed_frag:Ng,meshbasic_vert:Dg,meshbasic_frag:Ug,meshlambert_vert:Fg,meshlambert_frag:Og,meshmatcap_vert:Bg,meshmatcap_frag:kg,meshnormal_vert:zg,meshnormal_frag:Gg,meshphong_vert:Vg,meshphong_frag:Hg,meshphysical_vert:Wg,meshphysical_frag:Xg,meshtoon_vert:qg,meshtoon_frag:Yg,points_vert:Zg,points_frag:Jg,shadow_vert:$g,shadow_frag:Kg,sprite_vert:Qg,sprite_frag:jg},Rt={common:{diffuse:{value:new Qt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ie},alphaMap:{value:null},alphaMapTransform:{value:new ie},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ie}},envmap:{envMap:{value:null},envMapRotation:{value:new ie},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ie}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ie}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ie},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ie},normalScale:{value:new yt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ie},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ie}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ie}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ie}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Qt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Qt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ie},alphaTest:{value:0},uvTransform:{value:new ie}},sprite:{diffuse:{value:new Qt(16777215)},opacity:{value:1},center:{value:new yt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ie},alphaMap:{value:null},alphaMapTransform:{value:new ie},alphaTest:{value:0}}},yi={basic:{uniforms:_n([Rt.common,Rt.specularmap,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.fog]),vertexShader:pe.meshbasic_vert,fragmentShader:pe.meshbasic_frag},lambert:{uniforms:_n([Rt.common,Rt.specularmap,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.fog,Rt.lights,{emissive:{value:new Qt(0)},envMapIntensity:{value:1}}]),vertexShader:pe.meshlambert_vert,fragmentShader:pe.meshlambert_frag},phong:{uniforms:_n([Rt.common,Rt.specularmap,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.fog,Rt.lights,{emissive:{value:new Qt(0)},specular:{value:new Qt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:pe.meshphong_vert,fragmentShader:pe.meshphong_frag},standard:{uniforms:_n([Rt.common,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.roughnessmap,Rt.metalnessmap,Rt.fog,Rt.lights,{emissive:{value:new Qt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:pe.meshphysical_vert,fragmentShader:pe.meshphysical_frag},toon:{uniforms:_n([Rt.common,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.gradientmap,Rt.fog,Rt.lights,{emissive:{value:new Qt(0)}}]),vertexShader:pe.meshtoon_vert,fragmentShader:pe.meshtoon_frag},matcap:{uniforms:_n([Rt.common,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.fog,{matcap:{value:null}}]),vertexShader:pe.meshmatcap_vert,fragmentShader:pe.meshmatcap_frag},points:{uniforms:_n([Rt.points,Rt.fog]),vertexShader:pe.points_vert,fragmentShader:pe.points_frag},dashed:{uniforms:_n([Rt.common,Rt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:pe.linedashed_vert,fragmentShader:pe.linedashed_frag},depth:{uniforms:_n([Rt.common,Rt.displacementmap]),vertexShader:pe.depth_vert,fragmentShader:pe.depth_frag},normal:{uniforms:_n([Rt.common,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,{opacity:{value:1}}]),vertexShader:pe.meshnormal_vert,fragmentShader:pe.meshnormal_frag},sprite:{uniforms:_n([Rt.sprite,Rt.fog]),vertexShader:pe.sprite_vert,fragmentShader:pe.sprite_frag},background:{uniforms:{uvTransform:{value:new ie},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:pe.background_vert,fragmentShader:pe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ie}},vertexShader:pe.backgroundCube_vert,fragmentShader:pe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:pe.cube_vert,fragmentShader:pe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:pe.equirect_vert,fragmentShader:pe.equirect_frag},distance:{uniforms:_n([Rt.common,Rt.displacementmap,{referencePosition:{value:new F},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:pe.distance_vert,fragmentShader:pe.distance_frag},shadow:{uniforms:_n([Rt.lights,Rt.fog,{color:{value:new Qt(0)},opacity:{value:1}}]),vertexShader:pe.shadow_vert,fragmentShader:pe.shadow_frag}};yi.physical={uniforms:_n([yi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ie},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ie},clearcoatNormalScale:{value:new yt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ie},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new ie},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ie},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ie},sheen:{value:0},sheenColor:{value:new Qt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ie},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ie},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ie},transmissionSamplerSize:{value:new yt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ie},attenuationDistance:{value:0},attenuationColor:{value:new Qt(0)},specularColor:{value:new Qt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ie},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ie},anisotropyVector:{value:new yt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ie}}]),vertexShader:pe.meshphysical_vert,fragmentShader:pe.meshphysical_frag};var cc={r:0,b:0,g:0},t_=new Te,of=new ie;of.set(-1,0,0,0,1,0,0,0,1);function e_(i,t,e,n,s,r){let a=new Qt(0),o=s===!0?0:1,l,c,h=null,f=0,u=null;function d(S){let y=S.isScene===!0?S.background:null;if(y&&y.isTexture){let x=S.backgroundBlurriness>0;y=t.get(y,x)}return y}function g(S){let y=!1,x=d(S);x===null?m(a,o):x&&x.isColor&&(m(x,1),y=!0);let R=i.xr.getEnvironmentBlendMode();R==="additive"?e.buffers.color.setClear(0,0,0,1,r):R==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||y)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function v(S,y){let x=d(y);x&&x.isCubeTexture?(c===void 0&&(c=new ke(new fi(1,1,1),new mi({name:"BackgroundCubeMaterial",uniforms:Ps(yi.backgroundCube.uniforms),vertexShader:yi.backgroundCube.vertexShader,fragmentShader:yi.backgroundCube.fragmentShader,side:hn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(R,E,_){this.matrixWorld.copyPosition(_.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(t_.makeRotationFromEuler(y.backgroundRotation)).transpose(),x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(of),c.material.toneMapped=ye.getTransfer(x.colorSpace)!==Ee,(h!==x||f!==x.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=x,f=x.version,u=i.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new ke(new gn(2,2),new mi({name:"BackgroundMaterial",uniforms:Ps(yi.background.uniforms),vertexShader:yi.background.vertexShader,fragmentShader:yi.background.fragmentShader,side:rs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,l.material.toneMapped=ye.getTransfer(x.colorSpace)!==Ee,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||f!==x.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=x,f=x.version,u=i.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}function m(S,y){S.getRGB(cc,Nh(i)),e.buffers.color.setClear(cc.r,cc.g,cc.b,y,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(S,y=1){a.set(S),o=y,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(S){o=S,m(a,o)},render:g,addToRenderList:v,dispose:p}}function n_(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,a=!1;function o(P,z,Y,I,k){let q=!1,V=f(P,I,Y,z);r!==V&&(r=V,c(r.object)),q=d(P,I,Y,k),q&&g(P,I,Y,k),k!==null&&t.update(k,i.ELEMENT_ARRAY_BUFFER),(q||a)&&(a=!1,x(P,z,Y,I),k!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(k).buffer))}function l(){return i.createVertexArray()}function c(P){return i.bindVertexArray(P)}function h(P){return i.deleteVertexArray(P)}function f(P,z,Y,I){let k=I.wireframe===!0,q=n[z.id];q===void 0&&(q={},n[z.id]=q);let V=P.isInstancedMesh===!0?P.id:0,at=q[V];at===void 0&&(at={},q[V]=at);let J=at[Y.id];J===void 0&&(J={},at[Y.id]=J);let it=J[k];return it===void 0&&(it=u(l()),J[k]=it),it}function u(P){let z=[],Y=[],I=[];for(let k=0;k<e;k++)z[k]=0,Y[k]=0,I[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:z,enabledAttributes:Y,attributeDivisors:I,object:P,attributes:{},index:null}}function d(P,z,Y,I){let k=r.attributes,q=z.attributes,V=0,at=Y.getAttributes();for(let J in at)if(at[J].location>=0){let rt=k[J],Dt=q[J];if(Dt===void 0&&(J==="instanceMatrix"&&P.instanceMatrix&&(Dt=P.instanceMatrix),J==="instanceColor"&&P.instanceColor&&(Dt=P.instanceColor)),rt===void 0||rt.attribute!==Dt||Dt&&rt.data!==Dt.data)return!0;V++}return r.attributesNum!==V||r.index!==I}function g(P,z,Y,I){let k={},q=z.attributes,V=0,at=Y.getAttributes();for(let J in at)if(at[J].location>=0){let rt=q[J];rt===void 0&&(J==="instanceMatrix"&&P.instanceMatrix&&(rt=P.instanceMatrix),J==="instanceColor"&&P.instanceColor&&(rt=P.instanceColor));let Dt={};Dt.attribute=rt,rt&&rt.data&&(Dt.data=rt.data),k[J]=Dt,V++}r.attributes=k,r.attributesNum=V,r.index=I}function v(){let P=r.newAttributes;for(let z=0,Y=P.length;z<Y;z++)P[z]=0}function m(P){p(P,0)}function p(P,z){let Y=r.newAttributes,I=r.enabledAttributes,k=r.attributeDivisors;Y[P]=1,I[P]===0&&(i.enableVertexAttribArray(P),I[P]=1),k[P]!==z&&(i.vertexAttribDivisor(P,z),k[P]=z)}function S(){let P=r.newAttributes,z=r.enabledAttributes;for(let Y=0,I=z.length;Y<I;Y++)z[Y]!==P[Y]&&(i.disableVertexAttribArray(Y),z[Y]=0)}function y(P,z,Y,I,k,q,V){V===!0?i.vertexAttribIPointer(P,z,Y,k,q):i.vertexAttribPointer(P,z,Y,I,k,q)}function x(P,z,Y,I){v();let k=I.attributes,q=Y.getAttributes(),V=z.defaultAttributeValues;for(let at in q){let J=q[at];if(J.location>=0){let it=k[at];if(it===void 0&&(at==="instanceMatrix"&&P.instanceMatrix&&(it=P.instanceMatrix),at==="instanceColor"&&P.instanceColor&&(it=P.instanceColor)),it!==void 0){let rt=it.normalized,Dt=it.itemSize,Pt=t.get(it);if(Pt===void 0)continue;let $=Pt.buffer,j=Pt.type,Nt=Pt.bytesPerElement,Vt=j===i.INT||j===i.UNSIGNED_INT||it.gpuType===Al;if(it.isInterleavedBufferAttribute){let Ct=it.data,qt=Ct.isInterleavedBuffer===!0?Ct.stride:Ct.itemSize,Me=it.offset;if(Ct.isInstancedInterleavedBuffer||Ct.isInstancedBufferAttribute){for(let Yt=0;Yt<J.locationSize;Yt++)p(J.location+Yt,Ct.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=Ct.meshPerAttribute*Ct.count)}else for(let Yt=0;Yt<J.locationSize;Yt++)m(J.location+Yt);i.bindBuffer(i.ARRAY_BUFFER,$);for(let Yt=0;Yt<J.locationSize;Yt++)y(J.location+Yt,Dt/J.locationSize,j,rt,qt*Nt,(Me+Dt/J.locationSize*Yt)*Nt,Vt)}else{if(it.isInstancedBufferAttribute){for(let Ct=0;Ct<J.locationSize;Ct++)p(J.location+Ct,it.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let Ct=0;Ct<J.locationSize;Ct++)m(J.location+Ct);i.bindBuffer(i.ARRAY_BUFFER,$);for(let Ct=0;Ct<J.locationSize;Ct++)y(J.location+Ct,Dt/J.locationSize,j,rt,Dt*Nt,Dt/J.locationSize*Ct*Nt,Vt)}}else if(V!==void 0){let rt=V[at];if(rt!==void 0)switch(rt.length){case 2:i.vertexAttrib2fv(J.location,rt);break;case 3:i.vertexAttrib3fv(J.location,rt);break;case 4:i.vertexAttrib4fv(J.location,rt);break;default:i.vertexAttrib1fv(J.location,rt)}}}}S()}function R(){B();for(let P in n){let z=n[P];for(let Y in z){let I=z[Y];for(let k in I){let q=I[k];for(let V in q)h(q[V].object),delete q[V];delete I[k]}}delete n[P]}}function E(P){if(n[P.id]===void 0)return;let z=n[P.id];for(let Y in z){let I=z[Y];for(let k in I){let q=I[k];for(let V in q)h(q[V].object),delete q[V];delete I[k]}}delete n[P.id]}function _(P){for(let z in n){let Y=n[z];for(let I in Y){let k=Y[I];if(k[P.id]===void 0)continue;let q=k[P.id];for(let V in q)h(q[V].object),delete q[V];delete k[P.id]}}}function w(P){for(let z in n){let Y=n[z],I=P.isInstancedMesh===!0?P.id:0,k=Y[I];if(k!==void 0){for(let q in k){let V=k[q];for(let at in V)h(V[at].object),delete V[at];delete k[q]}delete Y[I],Object.keys(Y).length===0&&delete n[z]}}}function B(){A(),a=!0,r!==s&&(r=s,c(r.object))}function A(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:B,resetDefaultState:A,dispose:R,releaseStatesOfGeometry:E,releaseStatesOfObject:w,releaseStatesOfProgram:_,initAttributes:v,enableAttribute:m,disableUnusedAttributes:S}}function i_(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let d=0;d<h;d++)u+=c[d];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function s_(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let _=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(_.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(_){return!(_!==ei&&n.convert(_)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(_){let w=_===ti&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(_!==En&&_!==Vn&&!w&&n.convert(_)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(_){if(_==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";_="mediump"}return _==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&($t("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let f=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),u=e.logarithmicDepthBuffer===!0&&f===!1;e.reversedDepthBuffer===!0&&f===!1&&$t("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),e.logarithmicDepthBuffer===!0&&f===!0&&$t("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");let d=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),R=i.getParameter(i.MAX_SAMPLES),E=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:y,maxFragmentUniforms:x,maxSamples:R,samples:E}}function r_(i){let t=this,e=null,n=0,s=!1,r=!1,a=new Kn,o=new ie,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){let d=f.length!==0||u||n!==0||s;return s=u,n=f.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,u){e=h(f,u,0)},this.setState=function(f,u,d){let g=f.clippingPlanes,v=f.clipIntersection,m=f.clipShadows,p=i.get(f);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{let S=r?0:n,y=S*4,x=p.clippingState||null;l.value=x,x=h(g,u,y,d);for(let R=0;R!==y;++R)x[R]=e[R];p.clippingState=x,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(f,u,d,g){let v=f!==null?f.length:0,m=null;if(v!==0){if(m=l.value,g!==!0||m===null){let p=d+v*4,S=u.matrixWorldInverse;o.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,x=d;y!==v;++y,x+=4)a.copy(f[y]).applyMatrix4(S,o),a.normal.toArray(m,x),m[x+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,m}}var Ya=class extends Ln{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new ca(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new fi(5,5,5),r=new mi({name:"CubemapFromEquirect",uniforms:Ps(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:hn,blending:As});r.uniforms.tEquirect.value=e;let a=new ke(s,r),o=e.minFilter;return e.minFilter===Hi&&(e.minFilter=Sn),new ur(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}},Bd=256,a_=3,o_=20,lf=256,cf=16,l_=3,c_=new F,h_=new Qt,yr=class i{constructor(t){this._renderer=t,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new ur(1,10,null),this._boxMesh=new ke(new fi(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=c_}=r,l=this._renderer;this._setSize(a);let c=this._allocateTarget(),h=this._getSourceTarget(!0);e>0&&(h.texture.mipmapsAutoUpdate=!1);let f=l.autoClear,u=l.autoClearColor,d=l.autoClearDepth,g=l.autoClearStencil,v=t.background;l.autoClear=!0,l.autoClearColor=!0,l.autoClearDepth=!0,l.autoClearStencil=!0,v===null&&(t.background=l.getClearColor(h_));let m=new ur(n,s,h);return m.position.copy(o),m.update(l,t),l.autoClear=f,l.autoClearColor=u,l.autoClearDepth=d,l.autoClearStencil=g,t.background=v,e>0&&(h.texture.mipmapsAutoUpdate=!0,this._blur(c,e)),this._applyPMREM(c),c}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Gd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=zd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(t,e){return e>0?1-Math.sqrt(1-t/e):0}_setSize(t){this._cubeSize=Math.max(Bd,Rd(t))}_fromTexture(t,e){t.mapping===Cs||t.mapping===mr?this._setSize(t.image.length===0?Bd:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4);let n=e||this._allocateTarget();return this._textureToCubemap(t),this._applyPMREM(n),n}_allocateTarget(){let t=this._cubeSize,e=kd(t,!1,!1),n=Math.log2(t)-a_;for(let s=0;s<=n;s++)e.texture.mipmaps.push({width:t>>s,height:t>>s});return e.texture.name="PMREM",e.texture.isPMREMTexture=!0,e}_getSourceTarget(t=!1){let e=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==e||t&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=kd(e,!0,t)),this._sourceTarget}_compileMaterial(t){this._boxMesh.material=t,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(t,e,n){let s=this._boxMesh,r=this._cubeCamera;s.material=n,r.renderTarget=t,r.activeMipmapLevel=e;let a=t.width>>e;t.viewport.set(0,0,a,a),r.update(this._renderer,s),t.viewport.set(0,0,t.width,t.height)}_textureToCubemap(t){let e;t.mapping===Cs||t.mapping===mr?(this._cubemapMaterial===null&&(this._cubemapMaterial=Gd()),e=this._cubemapMaterial,e.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=zd()),e=this._equirectMaterial),e.uniforms.envMap.value=t,this._renderCube(this._getSourceTarget(),0,e)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=u_(),this._integrationMaterial=d_());let e=this._cubeSize,n=t.texture.mipmaps.length-1,s=this._ggxMaterial.uniforms;s.envMap.value=this._sourceTarget.texture;let r=this._integrationMaterial.uniforms;r.envMap.value=this._sourceTarget.texture,r.sourceLod.value=Math.log2(e/cf);for(let a=0;a<=n;a++){let o=i.lodToRoughness(a,n);if(a>n-l_)r.roughness.value=o,this._renderCube(t,a,this._integrationMaterial);else{let l=o>0?Math.log2(e)+.5*Math.log2(6/(lf*Math.pow(o,4)))+.5:0;s.roughness.value=o,s.lodBias.value=l,this._renderCube(t,a,this._ggxMaterial)}}}_blur(t,e){this._blurMaterial===null&&(this._blurMaterial=f_());let n=this._blurMaterial,s=n.uniforms,r=this._sourceTarget;s.sigma.value=Math.min(e,Math.PI)/Math.SQRT2,s.envMap.value=r.texture,this._renderCube(t,0,n),s.envMap.value=t.texture,this._renderCube(r,0,n)}};function kd(i,t,e){return new Ya(i,{minFilter:Hi,generateMipmaps:t,type:ti,colorSpace:jr,depthBuffer:e})}function Za(i,t,e){return new mi({name:i,uniforms:t,vertexShader:pe.cube_vert,fragmentShader:e,side:hn,blending:As,depthTest:!1,depthWrite:!1})}function u_(){return Za("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${lf}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function d_(){return Za("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:cf}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function f_(){return Za("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${o_}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function zd(){return Za("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Gd(){return Za("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function p_(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,d=!1){return u==null?null:d?a(u):r(u)}function r(u){if(u&&u.isTexture){let d=u.mapping;if(d===bl||d===wl)if(t.has(u)){let g=t.get(u).texture;return o(g,u.mapping)}else{let g=u.image;if(g&&g.height>0){let v=new Ya(g.height);return v.fromEquirectangularTexture(i,u),t.set(u,v),u.addEventListener("dispose",c),o(v.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture&&u.isPMREMTexture!==!0){let d=u.mapping,g=d===bl||d===wl,v=d===Cs||d===mr;if(g||v){let m=e.get(u),p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new yr(i)),m=g?n.fromEquirectangular(u,m):n.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),m.texture;if(m!==void 0)return m.texture;{let S=u.image;return g&&S&&S.height>0||v&&S&&l(S)?(n===null&&(n=new yr(i)),m=g?n.fromEquirectangular(u):n.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function o(u,d){return d===bl?u.mapping=Cs:d===wl&&(u.mapping=mr),u}function l(u){let d=0,g=6;for(let v=0;v<g;v++)u[v]!==void 0&&d++;return d===g}function c(u){let d=u.target;d.removeEventListener("dispose",c);let g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function h(u){let d=u.target;d.removeEventListener("dispose",h);let g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function f(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:f}}function m_(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&_s("WebGLRenderer: "+n+" extension not supported."),s}}}function g_(i,t,e,n){let s={},r=new WeakMap,a=new FinalizationRegistry(g=>delete s[g]);function o(g){l(g.target)}function l(g){g.index!==null&&t.remove(g.index);for(let m in g.attributes)t.remove(g.attributes[m]);g.removeEventListener("dispose",o),delete s[g.id],a.unregister(g);let v=r.get(g);v&&(t.remove(v),r.delete(g)),n.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,e.memory.geometries--}function c(g,v){return s[v.id]!==void 0||(v.addEventListener("dispose",o),s[v.id]=new WeakRef(v),a.register(v,v.id,v),e.memory.geometries++),v}function h(g){let v=g.attributes;for(let m in v)t.update(v[m],i.ARRAY_BUFFER)}function f(g){let v=g.index,m=g.attributes.position,p=0;if(m===void 0)return;let S=v!==null?v.array.length:m.array.length/3-1,y=m.count>=65535?aa:ra,x=new y(Math.ceil(S/3)*6,1),R=x.array;if(v!==null){let _=v.array;p=v.version;for(let w=0,B=0;w<S;w+=3){let A=_[w+0],P=_[w+1],z=_[w+2];R[B++]=A,R[B++]=P,R[B++]=P,R[B++]=z,R[B++]=z,R[B++]=A}}else{p=m.version;for(let _=0,w=0;_<S;_+=3){let B=_+0,A=_+1,P=_+2;R[w++]=B,R[w++]=A,R[w++]=A,R[w++]=P,R[w++]=P,R[w++]=B}}x.version=p;let E=r.get(g);E&&t.remove(E),r.set(g,x)}function u(g){let v=r.get(g);if(v){let m=g.index;m!==null&&v.version<m.version&&f(g)}else f(g);return r.get(g)}function d(){for(let g in s){let v=s[g].deref();v!==void 0&&l(v)}}return{get:c,update:h,getWireframeAttribute:u,dispose:d}}function __(i,t,e){let n;function s(f){n=f}let r,a;function o(f){r=f.type,a=f.bytesPerElement}function l(f,u){i.drawElements(n,u,r,f*a),e.update(u,n,1)}function c(f,u,d){d!==0&&(i.drawElementsInstanced(n,u,r,f*a,d),e.update(u,n,d))}function h(f,u,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,f,0,d);let v=0;for(let m=0;m<d;m++)v+=u[m];e.update(v,n,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function x_(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:ee("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function y_(i,t,e){let n=new WeakMap,s=new He;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==f){let B=function(){_.dispose(),n.delete(o),o.removeEventListener("dispose",B)};u!==void 0&&u.texture.dispose();let d=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],S=o.morphAttributes.color||[],y=0;d===!0&&(y=1),g===!0&&(y=2),v===!0&&(y=3);let x=o.attributes.position.count*y,R=1;x>t.maxTextureSize&&(R=Math.ceil(x/t.maxTextureSize),x=t.maxTextureSize);let E=new Float32Array(x*R*4*f),_=new na(E,x,R,f);_.type=Vn,_.needsUpdate=!0;let w=y*4;for(let A=0;A<f;A++){let P=m[A],z=p[A],Y=S[A],I=x*R*4*A;for(let k=0;k<P.count;k++){let q=k*w;d===!0&&(s.fromBufferAttribute(P,k),E[I+q+0]=s.x,E[I+q+1]=s.y,E[I+q+2]=s.z,E[I+q+3]=0),g===!0&&(s.fromBufferAttribute(z,k),E[I+q+4]=s.x,E[I+q+5]=s.y,E[I+q+6]=s.z,E[I+q+7]=0),v===!0&&(s.fromBufferAttribute(Y,k),E[I+q+8]=s.x,E[I+q+9]=s.y,E[I+q+10]=s.z,E[I+q+11]=Y.itemSize===4?s.w:1)}}u={count:f,texture:_,size:new yt(x,R)},n.set(o,u),o.addEventListener("dispose",B)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let d=0;for(let v=0;v<c.length;v++)d+=c[v];let g=o.morphTargetsRelative?1:1-d;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function v_(i,t,e,n,s){let r=new WeakMap;function a(c){let h=s.render.frame,f=c.geometry,u=t.get(c,f);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let d=c.skeleton;r.get(d)!==h&&(d.update(),r.set(d,h))}return u}function o(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var M_={[fh]:"LINEAR_TONE_MAPPING",[ph]:"REINHARD_TONE_MAPPING",[mh]:"CINEON_TONE_MAPPING",[gh]:"ACES_FILMIC_TONE_MAPPING",[xh]:"AGX_TONE_MAPPING",[Fa]:"NEUTRAL_TONE_MAPPING",[_h]:"CUSTOM_TONE_MAPPING"};function S_(i,t,e,n,s,r){let a=new Ln(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=null,h=new Be;h.setAttribute("position",new ne([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new ne([0,2,0,0,2,0],2));let f=new ll({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new ke(h,f),d=new Ua(-1,1,1,-1,0,1),g=null,v=null,m=!1,p,S=null,y=[],x=!1;this.setSize=function(R,E){a.setSize(R,E),o!==null&&o.setSize(R,E),l!==null&&l.setSize(R,E);for(let _=0;_<y.length;_++){let w=y[_];w.setSize&&w.setSize(R,E)}},this.setEffects=function(R){y=R,x=y.length>0&&y[0].isRenderPass===!0;let E=a.width,_=a.height;y.length>0&&o===null&&(o=new Ln(E,_,{type:ti,depthBuffer:!1,stencilBuffer:!1}),l=new Ln(E,_,{type:ti,depthBuffer:!1,stencilBuffer:!1}));let w=s===!0&&y.some(B=>B.needsDepthTexture===!0);w!==(a.depthTexture!==null)&&(w===!0&&c===null&&(c=new zi(E,_),r===!0&&(c.format=Wi,c.type=Rs)),a.dispose(),a.depthTexture=w?c:null,a.resolveDepthBuffer=w,a.storeMultisampledDepthBuffer=w);for(let B=0;B<y.length;B++){let A=y[B];A.setSize&&A.setSize(E,_),w&&A.needsDepthTexture===!0&&A.setDepthTexture&&A.setDepthTexture(c)}},this.begin=function(R,E){if(m||R.toneMapping===_i&&y.length===0)return!1;if(S=E,E!==null){let _=E.width,w=E.height;(a.width!==_||a.height!==w)&&this.setSize(_,w)}return x===!1&&R.setRenderTarget(a),p=R.toneMapping,R.toneMapping=_i,!0},this.hasRenderPass=function(){return x},this.end=function(R,E){R.toneMapping=p,m=!0;let _=a,w=o;for(let B=0;B<y.length;B++){let A=y[B];A.enabled!==!1&&(A.render(R,w,_,E),A.needsSwap!==!1&&(_=w,w=w===o?l:o))}if(g!==R.outputColorSpace||v!==R.toneMapping){g=R.outputColorSpace,v=R.toneMapping,f.defines={},ye.getTransfer(g)===Ee&&(f.defines.SRGB_TRANSFER="");let B=M_[v];B&&(f.defines[B]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=_.texture,R.setRenderTarget(S),R.render(u,d),S=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),h.dispose(),f.dispose()}}var hf=new bn,uf=new zi(1,1),df=new ua(1),ff=new na,pf=new Qo,mf=new ca,Vd=[],Hd=[],Wd=new Float32Array(16),Xd=new Float32Array(9),qd=new Float32Array(4);function vr(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Vd[s];if(r===void 0&&(r=new Float32Array(s),Vd[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function en(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function nn(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function dc(i,t){let e=Hd[t];e===void 0&&(e=new Int32Array(t),Hd[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function b_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function w_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(en(e,t))return;i.uniform2fv(this.addr,t),nn(e,t)}}function T_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(en(e,t))return;i.uniform3fv(this.addr,t),nn(e,t)}}function A_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(en(e,t))return;i.uniform4fv(this.addr,t),nn(e,t)}}function E_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(en(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),nn(e,t)}else{if(en(e,n))return;qd.set(n),i.uniformMatrix2fv(this.addr,!1,qd),nn(e,n)}}function C_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(en(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),nn(e,t)}else{if(en(e,n))return;Xd.set(n),i.uniformMatrix3fv(this.addr,!1,Xd),nn(e,n)}}function R_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(en(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),nn(e,t)}else{if(en(e,n))return;Wd.set(n),i.uniformMatrix4fv(this.addr,!1,Wd),nn(e,n)}}function P_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function I_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(en(e,t))return;i.uniform2iv(this.addr,t),nn(e,t)}}function L_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(en(e,t))return;i.uniform3iv(this.addr,t),nn(e,t)}}function N_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(en(e,t))return;i.uniform4iv(this.addr,t),nn(e,t)}}function D_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function U_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(en(e,t))return;i.uniform2uiv(this.addr,t),nn(e,t)}}function F_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(en(e,t))return;i.uniform3uiv(this.addr,t),nn(e,t)}}function O_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(en(e,t))return;i.uniform4uiv(this.addr,t),nn(e,t)}}function fc(i){return i.version===0&&(i.compareFunction=Ch,i.needsUpdate=!0),i}function B_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?r=fc(uf):r=hf,e.setTexture2D(t||r,s)}function k_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||pf,s)}function z_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_CUBE_SHADOW?r=fc(df):r=mf,e.setTextureCube(t||r,s)}function G_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||ff,s)}function V_(i){switch(i){case 5126:return b_;case 35664:return w_;case 35665:return T_;case 35666:return A_;case 35674:return E_;case 35675:return C_;case 35676:return R_;case 5124:case 35670:return P_;case 35667:case 35671:return I_;case 35668:case 35672:return L_;case 35669:case 35673:return N_;case 5125:return D_;case 36294:return U_;case 36295:return F_;case 36296:return O_;case 35678:case 36198:case 36298:case 36306:case 35682:return B_;case 35679:case 36299:case 36307:return k_;case 35680:case 36300:case 36308:case 36293:return z_;case 36289:case 36303:case 36311:case 36292:return G_}}function H_(i,t){i.uniform1fv(this.addr,t)}function W_(i,t){let e=vr(t,this.size,2);i.uniform2fv(this.addr,e)}function X_(i,t){let e=vr(t,this.size,3);i.uniform3fv(this.addr,e)}function q_(i,t){let e=vr(t,this.size,4);i.uniform4fv(this.addr,e)}function Y_(i,t){let e=vr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Z_(i,t){let e=vr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function J_(i,t){let e=vr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function $_(i,t){i.uniform1iv(this.addr,t)}function K_(i,t){i.uniform2iv(this.addr,t)}function Q_(i,t){i.uniform3iv(this.addr,t)}function j_(i,t){i.uniform4iv(this.addr,t)}function tx(i,t){i.uniform1uiv(this.addr,t)}function ex(i,t){i.uniform2uiv(this.addr,t)}function nx(i,t){i.uniform3uiv(this.addr,t)}function ix(i,t){i.uniform4uiv(this.addr,t)}function sx(i,t,e){let n=this.cache,s=t.length,r=dc(e,s);en(n,r)||(i.uniform1iv(this.addr,r),nn(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=fc(uf):a=hf;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function rx(i,t,e){let n=this.cache,s=t.length,r=dc(e,s);en(n,r)||(i.uniform1iv(this.addr,r),nn(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||pf,r[a])}function ax(i,t,e){let n=this.cache,s=t.length,r=dc(e,s);en(n,r)||(i.uniform1iv(this.addr,r),nn(n,r));let a;this.type===i.SAMPLER_CUBE_SHADOW?a=fc(df):a=mf;for(let o=0;o!==s;++o)e.setTextureCube(t[o]||a,r[o])}function ox(i,t,e){let n=this.cache,s=t.length,r=dc(e,s);en(n,r)||(i.uniform1iv(this.addr,r),nn(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||ff,r[a])}function lx(i){switch(i){case 5126:return H_;case 35664:return W_;case 35665:return X_;case 35666:return q_;case 35674:return Y_;case 35675:return Z_;case 35676:return J_;case 5124:case 35670:return $_;case 35667:case 35671:return K_;case 35668:case 35672:return Q_;case 35669:case 35673:return j_;case 5125:return tx;case 36294:return ex;case 36295:return nx;case 36296:return ix;case 35678:case 36198:case 36298:case 36306:case 35682:return sx;case 35679:case 36299:case 36307:return rx;case 35680:case 36300:case 36308:case 36293:return ax;case 36289:case 36303:case 36311:case 36292:return ox}}var kh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=V_(e.type)}},zh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=lx(e.type)}},Gh=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},Oh=/(\w+)(\])?(\[|\.)?/g;function Yd(i,t){i.seq.push(t),i.map[t.id]=t}function cx(i,t,e){let n=i.name,s=n.length;for(Oh.lastIndex=0;;){let r=Oh.exec(n),a=Oh.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Yd(e,c===void 0?new kh(o,i,t):new zh(o,i,t));break}else{let f=e.map[o];f===void 0&&(f=new Gh(o),Yd(e,f)),e=f}}}var xr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);cx(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function Zd(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var hx=37297,ux=0;function dx(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var Jd=new ie;function fx(i){ye._getMatrix(Jd,ye.workingColorSpace,i);let t=`mat3( ${Jd.elements.map(e=>e.toFixed(4))} )`;switch(ye.getTransfer(i)){case ta:return[t,"LinearTransferOETF"];case Ee:return[t,"sRGBTransferOETF"];default:return $t("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function $d(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+dx(i.getShaderSource(t),o)}else return r}function px(i,t){let e=fx(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( ${e[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}var mx={[fh]:"Linear",[ph]:"Reinhard",[mh]:"Cineon",[gh]:"ACESFilmic",[xh]:"AgX",[Fa]:"Neutral",[_h]:"Custom"};function gx(i,t){let e=mx[t];return e===void 0?($t("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var hc=new F;function _x(){ye.getLuminanceCoefficients(hc);let i=hc.x.toFixed(4),t=hc.y.toFixed(4),e=hc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function xx(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qa).join(`
`)}function yx(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function vx(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function qa(i){return i!==""}function Kd(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function Qd(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Mx=/^[ \t]*#include +<([\w\d./]+)>/gm;function Vh(i){return i.replace(Mx,Sx)}function Sx(i,t){let e=pe[t];if(e===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">");return Vh(e)}var bx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function jd(i){return i.replace(bx,wx)}function wx(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function tf(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var Tx={[Ts]:"SHADOWMAP_TYPE_PCF",[fr]:"SHADOWMAP_TYPE_VSM"};function Ax(i){return Tx[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Ex={[mr]:"ENVMAP_MODE_REFRACTION"};function Cx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Ex[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Rx={[Sl]:"ENVMAP_BLENDING_MULTIPLY",[fd]:"ENVMAP_BLENDING_MIX",[pd]:"ENVMAP_BLENDING_ADD"};function Px(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Rx[i.combine]||"ENVMAP_BLENDING_NONE"}function Ix(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,l=Ax(e),c=e.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",h=Cx(e),f=Px(e),u=xx(e),d=yx(r),g=s.createProgram(),v,m,p=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(v=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,d].filter(qa).join(`
`),v.length>0&&(v+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,d].filter(qa).join(`
`),m.length>0&&(m+=`
`)):(v=[tf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,d,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+e.diffuseRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qa).join(`
`),m=[tf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,d,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+f:"",e.envMapPMREM?"#define ENVMAP_MAX_LOD "+e.envMapMaxLod+".0":"",e.envMapPMREM?"#define ENVMAP_SIZE "+e.envMapSize+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==_i?"#define TONE_MAPPING":"",e.toneMapping!==_i?pe.tonemapping_pars_fragment:"",e.toneMapping!==_i?gx("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",pe.colorspace_pars_fragment,px("linearToOutputTexel",e.outputColorSpace),_x(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(qa).join(`
`)),a=Vh(a),a=Kd(a,e),a=Qd(a,e),o=Vh(o),o=Kd(o,e),o=Qd(o,e),a=jd(a),o=jd(o),e.isRawShaderMaterial!==!0&&(p=`#version 300 es
`,v=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+v,m=["#define varying in",e.glslVersion===Rh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Rh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let S=p+v+a,y=p+m+o,x=Zd(s,s.VERTEX_SHADER,S),R=Zd(s,s.FRAGMENT_SHADER,y);s.attachShader(g,x),s.attachShader(g,R),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function E(A){if(i.debug.checkShaderErrors){let P=s.getProgramInfoLog(g)||"",z=s.getShaderInfoLog(x)||"",Y=s.getShaderInfoLog(R)||"",I=P.trim(),k=z.trim(),q=Y.trim(),V=!0,at=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(V=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,g,x,R);else{let J=$d(s,x,"vertex"),it=$d(s,R,"fragment");ee("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+I+`
`+J+`
`+it)}else I!==""?$t("WebGLProgram: Program Info Log:",I):(k===""||q==="")&&(at=!1);at&&(A.diagnostics={runnable:V,programLog:I,vertexShader:{log:k,prefix:v},fragmentShader:{log:q,prefix:m}})}s.deleteShader(x),s.deleteShader(R),_=new xr(s,g),w=vx(s,g)}let _;this.getUniforms=function(){return _===void 0&&E(this),_};let w;this.getAttributes=function(){return w===void 0&&E(this),w};let B=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return B===!1&&(B=s.getProgramParameter(g,hx)),B},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=ux++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=x,this.fragmentShader=R,this}var Lx=0,Hh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new Wh(t),e.set(t,n)),n}},Wh=class{constructor(t){this.id=Lx++,this.code=t,this.usedTimes=0}};function Nx(i){return i===os||i===Va||i===Ha}function Dx(i,t,e,n,s,r){let a=new ia,o=new Hh,l=new Set,c=[],h=new Map,f=n.logarithmicDepthBuffer,u={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function d(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,w,B,A,P,z){let Y=A.fog,I=P.geometry,k=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?A.environment:null,q=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,V=t.get(_.envMap||k,q),at=u[_.type],J=n.precision;_.precision!==null&&(J=n.getMaxPrecision(_.precision),J!==_.precision&&$t("WebGLProgram.getParameters:",_.precision,"not supported, using",J,"instead."));let it=I.morphAttributes.position||I.morphAttributes.normal||I.morphAttributes.color,rt=it!==void 0?it.length:0,Dt=0;I.morphAttributes.position!==void 0&&(Dt=1),I.morphAttributes.normal!==void 0&&(Dt=2),I.morphAttributes.color!==void 0&&(Dt=3);let Pt,$,j,Nt;if(at){let Et=yi[at];Pt=Et.vertexShader,$=Et.fragmentShader}else{Pt=_.vertexShader,$=_.fragmentShader;let Et=o.getVertexShaderStage(_),be=o.getFragmentShaderStage(_);o.update(_,Et,be),j=Et.id,Nt=be.id}let Vt=i.getRenderTarget(),Ct=i.state.buffers.depth.getReversed(),qt=P.isInstancedMesh===!0,Me=P.isBatchedMesh===!0,Yt=!!_.map,re=!!_.matcap,de=!!V,st=de&&V.isPMREMTexture===!0,mt=!!_.aoMap,vt=!!_.lightMap,It=!!_.bumpMap&&_.wireframe===!1,At=!!_.normalMap,jt=!!_.displacementMap,zt=!!_.emissiveMap,fe=!!_.metalnessMap,Kt=!!_.roughnessMap,me=_.anisotropy>0,O=_.clearcoat>0,ze=_.diffuseRoughness>0,ce=_.dispersion>0,Ae=_.retroreflectivity>0,wt=_.iridescence>0,Ge=_.sheen>0,Wt=_.transmission>0,te=me&&!!_.anisotropyMap,C=O&&!!_.clearcoatMap,M=O&&!!_.clearcoatNormalMap,G=O&&!!_.clearcoatRoughnessMap,lt=ze&&!!_.diffuseRoughnessMap,Q=wt&&!!_.iridescenceMap,Mt=wt&&!!_.iridescenceThicknessMap,bt=Ge&&!!_.sheenColorMap,tt=Ge&&!!_.sheenRoughnessMap,et=!!_.specularMap,gt=!!_.specularColorMap,L=!!_.specularIntensityMap,nt=Wt&&!!_.transmissionMap,K=Wt&&!!_.thicknessMap,ht=!!_.gradientMap,ut=!!_.alphaMap,St=_.alphaTest>0,Gt=!!_.alphaHash,Zt=!!_.extensions,pt=_i;_.toneMapped&&(Vt===null||Vt.isXRRenderTarget===!0)&&(pt=i.toneMapping);let Ht=st?V.isCompressedCubeTexture?V.image[0].mipmaps:V.mipmaps:null,se={shaderID:at,shaderType:_.type,shaderName:_.name,vertexShader:Pt,fragmentShader:$,defines:_.defines,customVertexShaderID:j,customFragmentShaderID:Nt,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:J,batching:Me,batchingColor:Me&&P._colorsTexture!==null,instancing:qt,instancingColor:qt&&P.instanceColor!==null,instancingMorph:qt&&P.morphTexture!==null,outputColorSpace:Vt===null?i.outputColorSpace:Vt.isXRRenderTarget===!0?Vt.texture.colorSpace:ye.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Yt,matcap:re,envMap:de,envMapMode:de&&V.mapping,envMapPMREM:st,envMapMaxLod:st?Ht.length-1:null,envMapSize:st?Ht[0].width:null,aoMap:mt,lightMap:vt,bumpMap:It,normalMap:At,displacementMap:jt,emissiveMap:zt,normalMapObjectSpace:At&&_.normalMapType===_d,normalMapTangentSpace:At&&_.normalMapType===Wa,packedNormalMap:At&&_.normalMapType===Wa&&Nx(_.normalMap.format),metalnessMap:fe,roughnessMap:Kt,anisotropy:me,anisotropyMap:te,clearcoat:O,clearcoatMap:C,clearcoatNormalMap:M,clearcoatRoughnessMap:G,diffuseRoughness:ze,diffuseRoughnessMap:lt,dispersion:ce,retroreflection:Ae,iridescence:wt,iridescenceMap:Q,iridescenceThicknessMap:Mt,sheen:Ge,sheenColorMap:bt,sheenRoughnessMap:tt,specularMap:et,specularColorMap:gt,specularIntensityMap:L,transmission:Wt,transmissionMap:nt,thicknessMap:K,gradientMap:ht,opaque:_.transparent===!1&&_.blending===pr&&_.alphaToCoverage===!1,alphaMap:ut,alphaTest:St,alphaHash:Gt,combine:_.combine,mapUv:Yt&&d(_.map.channel),aoMapUv:mt&&d(_.aoMap.channel),lightMapUv:vt&&d(_.lightMap.channel),bumpMapUv:It&&d(_.bumpMap.channel),normalMapUv:At&&d(_.normalMap.channel),displacementMapUv:jt&&d(_.displacementMap.channel),emissiveMapUv:zt&&d(_.emissiveMap.channel),metalnessMapUv:fe&&d(_.metalnessMap.channel),roughnessMapUv:Kt&&d(_.roughnessMap.channel),anisotropyMapUv:te&&d(_.anisotropyMap.channel),clearcoatMapUv:C&&d(_.clearcoatMap.channel),clearcoatNormalMapUv:M&&d(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:G&&d(_.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:lt&&d(_.diffuseRoughnessMap.channel),iridescenceMapUv:Q&&d(_.iridescenceMap.channel),iridescenceThicknessMapUv:Mt&&d(_.iridescenceThicknessMap.channel),sheenColorMapUv:bt&&d(_.sheenColorMap.channel),sheenRoughnessMapUv:tt&&d(_.sheenRoughnessMap.channel),specularMapUv:et&&d(_.specularMap.channel),specularColorMapUv:gt&&d(_.specularColorMap.channel),specularIntensityMapUv:L&&d(_.specularIntensityMap.channel),transmissionMapUv:nt&&d(_.transmissionMap.channel),thicknessMapUv:K&&d(_.thicknessMap.channel),alphaMapUv:ut&&d(_.alphaMap.channel),vertexTangents:!!I.attributes.tangent&&(At||me),vertexNormals:!!I.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!I.attributes.color&&I.attributes.color.itemSize===4,pointsUvs:P.isPoints===!0&&!!I.attributes.uv&&(Yt||ut),fog:!!Y,useFog:_.fog===!0,fogExp2:!!Y&&Y.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||I.attributes.normal===void 0&&At===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:Ct,skinning:P.isSkinnedMesh===!0,hasPositionAttribute:I.attributes.position!==void 0,morphTargets:I.morphAttributes.position!==void 0,morphNormals:I.morphAttributes.normal!==void 0,morphColors:I.morphAttributes.color!==void 0,morphTargetsCount:rt,morphTextureStride:Dt,numSunLights:w.sun.length,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numSunLightShadows:w.sunShadowMap.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numLightProbeGrids:z.filter(Et=>Et.texture!==null).length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:i.shadowMap.enabled&&B.length>0,shadowMapType:i.shadowMap.type,toneMapping:pt,decodeVideoTexture:Yt&&_.map.isVideoTexture===!0&&ye.getTransfer(_.map.colorSpace)===Ee,decodeVideoTextureEmissive:zt&&_.emissiveMap.isVideoTexture===!0&&ye.getTransfer(_.emissiveMap.colorSpace)===Ee,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===wn,flipSided:_.side===hn,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Zt&&_.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Zt&&_.extensions.multiDraw===!0||Me)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return se.vertexUv1s=l.has(1),se.vertexUv2s=l.has(2),se.vertexUv3s=l.has(3),l.clear(),se}function v(_){let w=[];if(_.shaderID?w.push(_.shaderID):(w.push(_.customVertexShaderID),w.push(_.customFragmentShaderID)),_.defines!==void 0)for(let B in _.defines)w.push(B),w.push(_.defines[B]);return _.isRawShaderMaterial===!1&&(m(w,_),p(w,_),w.push(i.outputColorSpace)),w.push(_.customProgramCacheKey),w.join()}function m(_,w){_.push(w.precision),_.push(w.outputColorSpace),_.push(w.envMapMode),_.push(w.envMapPMREM),_.push(w.envMapMaxLod),_.push(w.envMapSize),_.push(w.mapUv),_.push(w.alphaMapUv),_.push(w.lightMapUv),_.push(w.aoMapUv),_.push(w.bumpMapUv),_.push(w.normalMapUv),_.push(w.displacementMapUv),_.push(w.emissiveMapUv),_.push(w.metalnessMapUv),_.push(w.roughnessMapUv),_.push(w.anisotropyMapUv),_.push(w.clearcoatMapUv),_.push(w.clearcoatNormalMapUv),_.push(w.clearcoatRoughnessMapUv),_.push(w.diffuseRoughnessMapUv),_.push(w.iridescenceMapUv),_.push(w.iridescenceThicknessMapUv),_.push(w.sheenColorMapUv),_.push(w.sheenRoughnessMapUv),_.push(w.specularMapUv),_.push(w.specularColorMapUv),_.push(w.specularIntensityMapUv),_.push(w.transmissionMapUv),_.push(w.thicknessMapUv),_.push(w.combine),_.push(w.fogExp2),_.push(w.sizeAttenuation),_.push(w.morphTargetsCount),_.push(w.numSunLights),_.push(w.numDirLights),_.push(w.numPointLights),_.push(w.numSpotLights),_.push(w.numSpotLightMaps),_.push(w.numHemiLights),_.push(w.numRectAreaLights),_.push(w.numSunLightShadows),_.push(w.numDirLightShadows),_.push(w.numPointLightShadows),_.push(w.numSpotLightShadows),_.push(w.numSpotLightShadowsWithMaps),_.push(w.numLightProbes),_.push(w.numLightProbeGrids),_.push(w.shadowMapType),_.push(w.toneMapping),_.push(w.numClippingPlanes),_.push(w.numClipIntersection),_.push(w.depthPacking)}function p(_,w){a.disableAll(),w.instancing&&a.enable(0),w.instancingColor&&a.enable(1),w.instancingMorph&&a.enable(2),w.matcap&&a.enable(3),w.envMap&&a.enable(4),w.normalMapObjectSpace&&a.enable(5),w.normalMapTangentSpace&&a.enable(6),w.clearcoat&&a.enable(7),w.iridescence&&a.enable(8),w.alphaTest&&a.enable(9),w.vertexColors&&a.enable(10),w.vertexAlphas&&a.enable(11),w.vertexUv1s&&a.enable(12),w.vertexUv2s&&a.enable(13),w.vertexUv3s&&a.enable(14),w.vertexTangents&&a.enable(15),w.anisotropy&&a.enable(16),w.alphaHash&&a.enable(17),w.batching&&a.enable(18),w.dispersion&&a.enable(19),w.retroreflection&&a.enable(24),w.diffuseRoughness&&a.enable(25),w.batchingColor&&a.enable(20),w.gradientMap&&a.enable(21),w.packedNormalMap&&a.enable(22),w.vertexNormals&&a.enable(23),_.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),w.numLightProbeGrids>0&&a.enable(22),w.hasPositionAttribute&&a.enable(23),_.push(a.mask)}function S(_){let w=u[_.type],B;if(w){let A=yi[w];B=Ud.clone(A.uniforms)}else B=_.uniforms;return B}function y(_,w){let B=h.get(w);return B!==void 0?++B.usedTimes:(B=new Ix(i,w,_,s),c.push(B),h.set(w,B)),B}function x(_){if(--_.usedTimes===0){let w=c.indexOf(_);c[w]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function R(_){o.remove(_)}function E(){o.dispose()}return{getParameters:g,getProgramCacheKey:v,getUniforms:S,acquireProgram:y,releaseProgram:x,releaseShaderCache:R,programs:c,dispose:E}}function Ux(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Fx(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function ef(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function nf(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function o(u,d,g,v,m,p){let S=i[t];return S===void 0?(S={id:u.id,object:u,geometry:d,material:g,materialVariant:a(u),groupOrder:v,renderOrder:u.renderOrder,z:m,group:p},i[t]=S):(S.id=u.id,S.object=u,S.geometry=d,S.material=g,S.materialVariant=a(u),S.groupOrder=v,S.renderOrder=u.renderOrder,S.z=m,S.group=p),t++,S}function l(u,d,g,v,m,p,S){S.reversedDepth===!0&&(m=-m);let y=o(u,d,g,v,m,p);g.transmission>0?n.push(y):g.transparent===!0?s.push(y):e.push(y)}function c(u,d,g,v,m,p){let S=o(u,d,g,v,m,p);g.transmission>0?n.unshift(S):g.transparent===!0?s.unshift(S):e.unshift(S)}function h(u,d){e.length>1&&e.sort(u||Fx),n.length>1&&n.sort(d||ef),s.length>1&&s.sort(d||ef)}function f(){for(let u=t,d=i.length;u<d;u++){let g=i[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:f,sort:h}}function Ox(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new nf,i.set(n,[a])):s>=r.length?(a=new nf,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function Bx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new F,color:new Qt};break;case"SpotLight":e={position:new F,direction:new F,color:new Qt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new F,color:new Qt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new F,skyColor:new Qt,groundColor:new Qt};break;case"RectAreaLight":e={color:new Qt,position:new F,halfWidth:new F,halfHeight:new F};break}return i[t.id]=e,e}}}function kx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new yt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new yt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new yt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var zx=0;function Gx(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Vx(i){let t=new Bx,e=kx(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new F);let s=new F,r=new Te,a=new Te;function o(c){let h=0,f=0,u=0;for(let z=0;z<9;z++)n.probe[z].set(0,0,0);let d=0,g=0,v=0,m=0,p=0,S=0,y=0,x=0,R=0,E=0,_=0,w=0,B=0,A=0;c.sort(Gx);for(let z=0,Y=c.length;z<Y;z++){let I=c[z],k=I.color,q=I.intensity,V=I.distance,at=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===os?at=I.shadow.map.texture:at=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=k.r*q,f+=k.g*q,u+=k.b*q;else if(I.isLightProbe){for(let J=0;J<9;J++)n.probe[J].addScaledVector(I.sh.coefficients[J],q);A++}else if(I.isSunLight){let J=t.get(I);if(J.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let it=I.shadow,rt=e.get(I);rt.shadowIntensity=it.intensity,rt.shadowBias=it.bias,rt.shadowNormalBias=it.normalBias,rt.shadowRadius=it.radius,rt.shadowMapSize.copy(it.mapSize).multiply(it.getFrameExtents()),n.sunShadow[g]=rt,n.sunShadowMap[g]=at;let Dt=it.getViewportCount();for(let Pt=0;Pt<Dt;Pt++)n.sunShadowMatrix[v+Pt]=it.getMatrix(Pt),n.sunShadowCascade[v+Pt]=it._cascadeData[Pt];v+=Dt,g++}n.sun[d]=J,d++}else if(I.isDirectionalLight){let J=t.get(I);if(J.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let it=I.shadow,rt=e.get(I);rt.shadowIntensity=it.intensity,rt.shadowBias=it.bias,rt.shadowNormalBias=it.normalBias,rt.shadowRadius=it.radius,rt.shadowMapSize=it.mapSize,n.directionalShadow[m]=rt,n.directionalShadowMap[m]=at,n.directionalShadowMatrix[m]=I.shadow.matrix,R++}n.directional[m]=J,m++}else if(I.isSpotLight){let J=t.get(I);J.position.setFromMatrixPosition(I.matrixWorld),J.color.copy(k).multiplyScalar(q),J.distance=V,J.coneCos=Math.cos(I.angle),J.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),J.decay=I.decay,n.spot[S]=J;let it=I.shadow;if(I.map&&(n.spotLightMap[w]=I.map,w++,it.updateMatrices(I),I.castShadow&&B++),n.spotLightMatrix[S]=it.matrix,I.castShadow){let rt=e.get(I);rt.shadowIntensity=it.intensity,rt.shadowBias=it.bias,rt.shadowNormalBias=it.normalBias,rt.shadowRadius=it.radius,rt.shadowMapSize=it.mapSize,n.spotShadow[S]=rt,n.spotShadowMap[S]=at,_++}S++}else if(I.isRectAreaLight){let J=t.get(I);J.color.copy(k).multiplyScalar(q),J.halfWidth.set(I.width*.5,0,0),J.halfHeight.set(0,I.height*.5,0),n.rectArea[y]=J,y++}else if(I.isPointLight){let J=t.get(I);if(J.color.copy(I.color).multiplyScalar(I.intensity),J.distance=I.distance,J.decay=I.decay,I.castShadow){let it=I.shadow,rt=e.get(I);rt.shadowIntensity=it.intensity,rt.shadowBias=it.bias,rt.shadowNormalBias=it.normalBias,rt.shadowRadius=it.radius,rt.shadowMapSize=it.mapSize,rt.shadowCameraNear=it.camera.near,rt.shadowCameraFar=it.camera.far,n.pointShadow[p]=rt,n.pointShadowMap[p]=at,n.pointShadowMatrix[p]=I.shadow.matrix,E++}n.point[p]=J,p++}else if(I.isHemisphereLight){let J=t.get(I);J.skyColor.copy(I.color).multiplyScalar(q),J.groundColor.copy(I.groundColor).multiplyScalar(q),n.hemi[x]=J,x++}}y>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Rt.LTC_FLOAT_1,n.rectAreaLTC2=Rt.LTC_FLOAT_2):(n.rectAreaLTC1=Rt.LTC_HALF_1,n.rectAreaLTC2=Rt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=u;let P=n.hash;(P.sunLength!==d||P.directionalLength!==m||P.pointLength!==p||P.spotLength!==S||P.rectAreaLength!==y||P.hemiLength!==x||P.numSunShadows!==g||P.numDirectionalShadows!==R||P.numPointShadows!==E||P.numSpotShadows!==_||P.numSpotMaps!==w||P.numLightProbes!==A)&&(n.sun.length=d,n.directional.length=m,n.spot.length=S,n.rectArea.length=y,n.point.length=p,n.hemi.length=x,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=v,n.sunShadowCascade.length=v,n.directionalShadow.length=R,n.directionalShadowMap.length=R,n.directionalShadowMatrix.length=R,n.pointShadow.length=E,n.pointShadowMap.length=E,n.pointShadowMatrix.length=E,n.spotShadow.length=_,n.spotShadowMap.length=_,n.spotLightMatrix.length=_+w-B,n.spotLightMap.length=w,n.numSpotLightShadowsWithMaps=B,n.numLightProbes=A,P.sunLength=d,P.directionalLength=m,P.pointLength=p,P.spotLength=S,P.rectAreaLength=y,P.hemiLength=x,P.numSunShadows=g,P.numDirectionalShadows=R,P.numPointShadows=E,P.numSpotShadows=_,P.numSpotMaps=w,P.numLightProbes=A,n.version=zx++)}function l(c,h){let f=0,u=0,d=0,g=0,v=0,m=0,p=h.matrixWorldInverse;for(let S=0,y=c.length;S<y;S++){let x=c[S];if(x.isSunLight){let R=n.sun[f];R.direction.setFromMatrixPosition(x.matrixWorld),R.direction.transformDirection(p),f++}else if(x.isDirectionalLight){let R=n.directional[u];R.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),R.direction.sub(s),R.direction.transformDirection(p),u++}else if(x.isSpotLight){let R=n.spot[g];R.position.setFromMatrixPosition(x.matrixWorld),R.position.applyMatrix4(p),R.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),R.direction.sub(s),R.direction.transformDirection(p),g++}else if(x.isRectAreaLight){let R=n.rectArea[v];R.position.setFromMatrixPosition(x.matrixWorld),R.position.applyMatrix4(p),a.identity(),r.copy(x.matrixWorld),r.premultiply(p),a.extractRotation(r),R.halfWidth.set(x.width*.5,0,0),R.halfHeight.set(0,x.height*.5,0),R.halfWidth.applyMatrix4(a),R.halfHeight.applyMatrix4(a),v++}else if(x.isPointLight){let R=n.point[d];R.position.setFromMatrixPosition(x.matrixWorld),R.position.applyMatrix4(p),d++}else if(x.isHemisphereLight){let R=n.hemi[m];R.direction.setFromMatrixPosition(x.matrixWorld),R.direction.transformDirection(p),m++}}}return{setup:o,setupView:l,state:n}}function sf(i){let t=new Vx(i),e=[],n=[],s=[];function r(f){h.camera=f,e.length=0,n.length=0,s.length=0}function a(f){f.isLightProbeGrid?s.push(f):e.push(f)}function o(f){n.push(f)}function l(){t.setup(e),s.sort((f,u)=>f.priority-u.priority||f.id-u.id)}function c(f){t.setupView(e,f)}let h={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:h,setupLights:l,setupLightsView:c,pushLight:a,pushShadow:o}}function Hx(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new sf(i),t.set(s,[o])):r>=a.length?(o=new sf(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var Wx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Xx=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,qx=[new F(1,0,0),new F(-1,0,0),new F(0,1,0),new F(0,-1,0),new F(0,0,1),new F(0,0,-1)],Yx=[new F(0,-1,0),new F(0,-1,0),new F(0,0,1),new F(0,0,-1),new F(0,-1,0),new F(0,-1,0)],rf=new Te,Xa=new F,Bh=new F;function Zx(i,t,e){let n=new ts,s=new yt,r=new yt,a=new He,o=new cl,l=new hl,c={},h=e.maxTextureSize,f={[rs]:hn,[hn]:rs,[wn]:wn},u=new mi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new yt},radius:{value:4}},vertexShader:Wx,fragmentShader:Xx}),d=u.clone();d.defines.HORIZONTAL_PASS=1;let g=new Be;g.setAttribute("position",new In(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new ke(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ts;let p=this.type;this.render=function(E,_,w){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||E.length===0)return;this.type===Zu&&($t("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Ts);let B=i.getRenderTarget(),A=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),z=i.state;z.setBlending(As),z.buffers.depth.getReversed()===!0?z.buffers.color.setClear(0,0,0,0):z.buffers.color.setClear(1,1,1,1),z.buffers.depth.setTest(!0),z.setScissorTest(!1);let Y=p!==this.type;Y&&_.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(k=>k.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,k=E.length;I<k;I++){let q=E[I],V=q.shadow;if(V===void 0){$t("WebGLShadowMap:",q,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);let at=V.getFrameExtents();s.multiply(at),r.copy(V.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/at.x),s.x=r.x*at.x,V.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/at.y),s.y=r.y*at.y,V.mapSize.y=r.y));let J=i.state.buffers.depth.getReversed();if(V.camera._reversedDepth=J,V.map===null||Y===!0){if(V.map!==null&&(V.map.depthTexture!==null&&(V.map.depthTexture.dispose(),V.map.depthTexture=null),V.map.dispose()),this.type===fr){if(q.isPointLight){$t("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}V.map=new Ln(s.x,s.y,{format:os,type:ti,minFilter:Sn,magFilter:Sn,generateMipmaps:!1}),V.map.texture.name=q.name+".shadowMap",V.map.depthTexture=new zi(s.x,s.y,Vn),V.map.depthTexture.name=q.name+".shadowMapDepth",V.map.depthTexture.format=Oi,V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=ln,V.map.depthTexture.magFilter=ln}else q.isPointLight?(V.map=new Ya(s.x),V.map.depthTexture=new ua(s.x,jn)):(V.map=new Ln(s.x,s.y),V.map.depthTexture=new zi(s.x,s.y,jn)),V.map.depthTexture.name=q.name+".shadowMap",V.map.depthTexture.format=Oi,this.type===Ts?(V.map.depthTexture.compareFunction=J?Eh:Ah,V.map.depthTexture.minFilter=Sn,V.map.depthTexture.magFilter=Sn):(V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=ln,V.map.depthTexture.magFilter=ln);V.camera.updateProjectionMatrix()}V.map.isWebGLCubeRenderTarget!==!0&&(V.map.width!==s.x||V.map.height!==s.y)&&V.map.setSize(s.x,s.y);let it=V.map.isWebGLCubeRenderTarget?6:V.getViewportCount();q.isPointLight!==!0&&V.updateMatrices(q,w);let rt=(V.camera.layers.mask&4294967294)!==0?V.camera.layers:w.layers;for(let Dt=0;Dt<it;Dt++){let Pt=V.getCamera(Dt);if(q.isPointLight){let $=V.camera,j=V.matrix,Nt=q.distance||$.far;Nt!==$.far&&($.far=Nt,$.updateProjectionMatrix()),Xa.setFromMatrixPosition(q.matrixWorld),$.position.copy(Xa),Bh.copy($.position),Bh.add(qx[Dt]),$.up.copy(Yx[Dt]),$.lookAt(Bh),$.updateMatrixWorld(),j.makeTranslation(-Xa.x,-Xa.y,-Xa.z),rf.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),V._frustum.setFromProjectionMatrix(rf,$.coordinateSystem,$.reversedDepth)}if(V.map.isWebGLCubeRenderTarget)i.setRenderTarget(V.map,Dt),i.clear();else{Dt===0&&(i.setRenderTarget(V.map),i.clear());let $=V.getViewport(Dt);a.set(r.x*$.x,r.y*$.y,r.x*$.z,r.y*$.w),z.viewport(a)}n=V.getFrustum(Dt),x(_,w,Pt,q,rt,this.type)}V.isPointLightShadow!==!0&&this.type===fr&&S(V,w),V.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(B,A,P)};function S(E,_){let w=t.update(v);u.defines.VSM_SAMPLES!==E.blurSamples&&(u.defines.VSM_SAMPLES=E.blurSamples,d.defines.VSM_SAMPLES=E.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),E.mapPass===null?E.mapPass=new Ln(s.x,s.y,{format:os,type:ti}):(E.mapPass.width!==E.map.width||E.mapPass.height!==E.map.height)&&E.mapPass.setSize(E.map.width,E.map.height),u.uniforms.shadow_pass.value=E.map.depthTexture,u.uniforms.resolution.value.set(E.map.width,E.map.height),u.uniforms.radius.value=E.radius,i.setRenderTarget(E.mapPass),i.clear(),i.renderBufferDirect(_,null,w,u,v,null),d.uniforms.shadow_pass.value=E.mapPass.texture,d.uniforms.resolution.value.set(E.map.width,E.map.height),d.uniforms.radius.value=E.radius,i.setRenderTarget(E.map),i.clear(),i.renderBufferDirect(_,null,w,d,v,null)}function y(E,_,w,B){let A=null,P=w.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(P!==void 0)A=P;else if(A=w.isPointLight===!0?l:o,i.localClippingEnabled&&_.clipShadows===!0&&Array.isArray(_.clippingPlanes)&&_.clippingPlanes.length!==0||_.displacementMap&&_.displacementScale!==0||_.alphaMap&&_.alphaTest>0||_.map&&_.alphaTest>0||_.alphaToCoverage===!0){let z=A.uuid,Y=_.uuid,I=c[z];I===void 0&&(I={},c[z]=I);let k=I[Y];k===void 0&&(k=A.clone(),I[Y]=k,_.addEventListener("dispose",R)),A=k}if(A.visible=_.visible,A.wireframe=_.wireframe,B===fr?A.side=_.shadowSide!==null?_.shadowSide:_.side:A.side=_.shadowSide!==null?_.shadowSide:f[_.side],A.alphaMap=_.alphaMap,A.alphaTest=_.alphaToCoverage===!0?.5:_.alphaTest,A.map=_.map,A.clipShadows=_.clipShadows,A.clippingPlanes=_.clippingPlanes,A.clipIntersection=_.clipIntersection,A.displacementMap=_.displacementMap,A.displacementScale=_.displacementScale,A.displacementBias=_.displacementBias,A.wireframeLinewidth=_.wireframeLinewidth,A.linewidth=_.linewidth,w.isPointLight===!0&&A.isMeshDistanceMaterial===!0){let z=i.properties.get(A);z.light=w}return A}function x(E,_,w,B,A,P){if(E.visible===!1)return;if(E.layers.test(A)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&P===fr)&&(!E.frustumCulled||E.intersectsFrustum(n))){E.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,E.matrixWorld);let I=t.update(E),k=E.material;if(Array.isArray(k)){let q=I.groups;for(let V=0,at=q.length;V<at;V++){let J=q[V],it=k[J.materialIndex];if(it&&it.visible){let rt=y(E,it,B,P);E.onBeforeShadow(i,E,_,w,I,rt,J),i.renderBufferDirect(w,null,I,rt,E,J),E.onAfterShadow(i,E,_,w,I,rt,J)}}}else if(k.visible){let q=y(E,k,B,P);E.onBeforeShadow(i,E,_,w,I,q,null),i.renderBufferDirect(w,null,I,q,E,null),E.onAfterShadow(i,E,_,w,I,q,null)}}let Y=E.children;for(let I=0,k=Y.length;I<k;I++)x(Y[I],_,w,B,A,P)}function R(E){E.target.removeEventListener("dispose",R);for(let w in c){let B=c[w],A=E.target.uuid;A in B&&(B[A].dispose(),delete B[A])}}}function Jx(i,t){function e(){let L=!1,nt=new He,K=null,ht=new He(0,0,0,0);return{setMask:function(ut){K!==ut&&!L&&(i.colorMask(ut,ut,ut,ut),K=ut)},setLocked:function(ut){L=ut},setClear:function(ut,St,Gt,Zt,pt){pt===!0&&(ut*=Zt,St*=Zt,Gt*=Zt),nt.set(ut,St,Gt,Zt),ht.equals(nt)===!1&&(i.clearColor(ut,St,Gt,Zt),ht.copy(nt))},reset:function(){L=!1,K=null,ht.set(-1,0,0,0)}}}function n(){let L=!1,nt=!1,K=null,ht=null,ut=null;return{setReversed:function(St){if(nt!==St){let Gt=t.get("EXT_clip_control");St?Gt.clipControlEXT(Gt.LOWER_LEFT_EXT,Gt.ZERO_TO_ONE_EXT):Gt.clipControlEXT(Gt.LOWER_LEFT_EXT,Gt.NEGATIVE_ONE_TO_ONE_EXT),nt=St;let Zt=ut;ut=null,this.setClear(Zt)}},getReversed:function(){return nt},setTest:function(St){St?Ct(i.DEPTH_TEST):qt(i.DEPTH_TEST)},setMask:function(St){K!==St&&!L&&(i.depthMask(St),K=St)},setFunc:function(St){if(nt&&(St=Cd[St]),ht!==St){switch(St){case ko:i.depthFunc(i.NEVER);break;case zo:i.depthFunc(i.ALWAYS);break;case Go:i.depthFunc(i.LESS);break;case tr:i.depthFunc(i.LEQUAL);break;case Vo:i.depthFunc(i.EQUAL);break;case Ho:i.depthFunc(i.GEQUAL);break;case Wo:i.depthFunc(i.GREATER);break;case Xo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ht=St}},setLocked:function(St){L=St},setClear:function(St){ut!==St&&(ut=St,nt&&(St=1-St),i.clearDepth(St))},reset:function(){L=!1,K=null,ht=null,ut=null,nt=!1}}}function s(){let L=!1,nt=null,K=null,ht=null,ut=null,St=null,Gt=null,Zt=null,pt=null;return{setTest:function(Ht){L||(Ht?Ct(i.STENCIL_TEST):qt(i.STENCIL_TEST))},setMask:function(Ht){nt!==Ht&&!L&&(i.stencilMask(Ht),nt=Ht)},setFunc:function(Ht,se,Et){(K!==Ht||ht!==se||ut!==Et)&&(i.stencilFunc(Ht,se,Et),K=Ht,ht=se,ut=Et)},setOp:function(Ht,se,Et){(St!==Ht||Gt!==se||Zt!==Et)&&(i.stencilOp(Ht,se,Et),St=Ht,Gt=se,Zt=Et)},setLocked:function(Ht){L=Ht},setClear:function(Ht){pt!==Ht&&(i.clearStencil(Ht),pt=Ht)},reset:function(){L=!1,nt=null,K=null,ht=null,ut=null,St=null,Gt=null,Zt=null,pt=null}}}let r=new e,a=new n,o=new s,l={},c=new WeakMap,h={},f={},u={},d=new WeakMap,g=[],v=null,m=!1,p=null,S=null,y=null,x=null,R=null,E=null,_=null,w=new Qt(0,0,0),B=0,A=!1,P=null,z=null,Y=null,I=null,k=null,q=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),V=!1,at=0,J=i.getParameter(i.VERSION);J.indexOf("WebGL")!==-1?(at=parseFloat(/^WebGL (\d)/.exec(J)[1]),V=at>=1):J.indexOf("OpenGL ES")!==-1&&(at=parseFloat(/^OpenGL ES (\d)/.exec(J)[1]),V=at>=2);let it=null,rt={},Dt=i.getParameter(i.SCISSOR_BOX),Pt=i.getParameter(i.VIEWPORT),$=new He().fromArray(Dt),j=new He().fromArray(Pt);function Nt(L,nt,K,ht){let ut=new Uint8Array(4),St=i.createTexture();i.bindTexture(L,St),i.texParameteri(L,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(L,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Gt=0;Gt<K;Gt++)L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY?i.texImage3D(nt,0,i.RGBA,1,1,ht,0,i.RGBA,i.UNSIGNED_BYTE,ut):i.texImage2D(nt+Gt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ut);return St}let Vt={};Vt[i.TEXTURE_2D]=Nt(i.TEXTURE_2D,i.TEXTURE_2D,1),Vt[i.TEXTURE_CUBE_MAP]=Nt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Vt[i.TEXTURE_2D_ARRAY]=Nt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Vt[i.TEXTURE_3D]=Nt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),Ct(i.DEPTH_TEST),a.setFunc(tr),It(!1),At(lh),Ct(i.CULL_FACE),mt(As);function Ct(L){h[L]!==!0&&(i.enable(L),h[L]=!0)}function qt(L){h[L]!==!1&&(i.disable(L),h[L]=!1)}function Me(L,nt){return u[L]!==nt?(i.bindFramebuffer(L,nt),u[L]=nt,L===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=nt),L===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=nt),!0):!1}function Yt(L,nt){let K=g,ht=!1;if(L){K=d.get(nt),K===void 0&&(K=[],d.set(nt,K));let ut=L.textures;if(K.length!==ut.length||K[0]!==i.COLOR_ATTACHMENT0){for(let St=0,Gt=ut.length;St<Gt;St++)K[St]=i.COLOR_ATTACHMENT0+St;K.length=ut.length,ht=!0}}else K[0]!==i.BACK&&(K[0]=i.BACK,ht=!0);ht&&i.drawBuffers(K)}function re(L){return v!==L?(i.useProgram(L),v=L,!0):!1}let de={[Es]:i.FUNC_ADD,[$u]:i.FUNC_SUBTRACT,[Ku]:i.FUNC_REVERSE_SUBTRACT};de[Qu]=i.MIN,de[ju]=i.MAX;let st={[td]:i.ZERO,[ed]:i.ONE,[nd]:i.SRC_COLOR,[uh]:i.SRC_ALPHA,[ld]:i.SRC_ALPHA_SATURATE,[ad]:i.DST_COLOR,[sd]:i.DST_ALPHA,[id]:i.ONE_MINUS_SRC_COLOR,[dh]:i.ONE_MINUS_SRC_ALPHA,[od]:i.ONE_MINUS_DST_COLOR,[rd]:i.ONE_MINUS_DST_ALPHA,[cd]:i.CONSTANT_COLOR,[hd]:i.ONE_MINUS_CONSTANT_COLOR,[ud]:i.CONSTANT_ALPHA,[dd]:i.ONE_MINUS_CONSTANT_ALPHA};function mt(L,nt,K,ht,ut,St,Gt,Zt,pt,Ht){if(L===As){m===!0&&(qt(i.BLEND),m=!1);return}if(m===!1&&(Ct(i.BLEND),m=!0),L!==Ju){if(L!==p||Ht!==A){if((S!==Es||R!==Es)&&(i.blendEquation(i.FUNC_ADD),S=Es,R=Es),Ht)switch(L){case pr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case as:i.blendFunc(i.ONE,i.ONE);break;case ch:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case hh:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:ee("WebGLState: Invalid blending: ",L);break}else switch(L){case pr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case as:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case ch:ee("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case hh:ee("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ee("WebGLState: Invalid blending: ",L);break}y=null,x=null,E=null,_=null,w.set(0,0,0),B=0,p=L,A=Ht}return}ut=ut||nt,St=St||K,Gt=Gt||ht,(nt!==S||ut!==R)&&(i.blendEquationSeparate(de[nt],de[ut]),S=nt,R=ut),(K!==y||ht!==x||St!==E||Gt!==_)&&(i.blendFuncSeparate(st[K],st[ht],st[St],st[Gt]),y=K,x=ht,E=St,_=Gt),(Zt.equals(w)===!1||pt!==B)&&(i.blendColor(Zt.r,Zt.g,Zt.b,pt),w.copy(Zt),B=pt),p=L,A=!1}function vt(L,nt){L.side===wn?qt(i.CULL_FACE):Ct(i.CULL_FACE);let K=L.side===hn;nt&&(K=!K),It(K),L.blending===pr&&L.transparent===!1?mt(As):mt(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),a.setFunc(L.depthFunc),a.setTest(L.depthTest),a.setMask(L.depthWrite),r.setMask(L.colorWrite);let ht=L.stencilWrite;o.setTest(ht),ht&&(o.setMask(L.stencilWriteMask),o.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),o.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),zt(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?Ct(i.SAMPLE_ALPHA_TO_COVERAGE):qt(i.SAMPLE_ALPHA_TO_COVERAGE)}function It(L){P!==L&&(L?i.frontFace(i.CW):i.frontFace(i.CCW),P=L)}function At(L){L!==qu?(Ct(i.CULL_FACE),L!==z&&(L===lh?i.cullFace(i.BACK):L===Yu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):qt(i.CULL_FACE),z=L}function jt(L){L!==Y&&(V&&i.lineWidth(L),Y=L)}function zt(L,nt,K){L?(Ct(i.POLYGON_OFFSET_FILL),(I!==nt||k!==K)&&(I=nt,k=K,a.getReversed()&&(nt=-nt,K=-K),i.polygonOffset(nt,K))):qt(i.POLYGON_OFFSET_FILL)}function fe(L){L?Ct(i.SCISSOR_TEST):qt(i.SCISSOR_TEST)}function Kt(L){L===void 0&&(L=i.TEXTURE0+q-1),it!==L&&(i.activeTexture(L),it=L)}function me(L,nt,K){K===void 0&&(it===null?K=i.TEXTURE0+q-1:K=it);let ht=rt[K];ht===void 0&&(ht={type:void 0,texture:void 0},rt[K]=ht),(ht.type!==L||ht.texture!==nt)&&(it!==K&&(i.activeTexture(K),it=K),i.bindTexture(L,nt||Vt[L]),ht.type=L,ht.texture=nt)}function O(){let L=rt[it];L!==void 0&&L.type!==void 0&&(i.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function ze(){try{i.compressedTexImage2D(...arguments)}catch(L){ee("WebGLState:",L)}}function ce(){try{i.compressedTexImage3D(...arguments)}catch(L){ee("WebGLState:",L)}}function Ae(){try{i.texSubImage2D(...arguments)}catch(L){ee("WebGLState:",L)}}function wt(){try{i.texSubImage3D(...arguments)}catch(L){ee("WebGLState:",L)}}function Ge(){try{i.compressedTexSubImage2D(...arguments)}catch(L){ee("WebGLState:",L)}}function Wt(){try{i.compressedTexSubImage3D(...arguments)}catch(L){ee("WebGLState:",L)}}function te(){try{i.texStorage2D(...arguments)}catch(L){ee("WebGLState:",L)}}function C(){try{i.texStorage3D(...arguments)}catch(L){ee("WebGLState:",L)}}function M(){try{i.texImage2D(...arguments)}catch(L){ee("WebGLState:",L)}}function G(){try{i.texImage3D(...arguments)}catch(L){ee("WebGLState:",L)}}function lt(L){return f[L]!==void 0?f[L]:i.getParameter(L)}function Q(L,nt){f[L]!==nt&&(i.pixelStorei(L,nt),f[L]=nt)}function Mt(L){$.equals(L)===!1&&(i.scissor(L.x,L.y,L.z,L.w),$.copy(L))}function bt(L){j.equals(L)===!1&&(i.viewport(L.x,L.y,L.z,L.w),j.copy(L))}function tt(L,nt){let K=c.get(nt);K===void 0&&(K=new WeakMap,c.set(nt,K));let ht=K.get(L);ht===void 0&&(ht=i.getUniformBlockIndex(nt,L.name),i.uniformBlockBinding(nt,ht,ht),K.set(L,ht))}function et(L,nt,K){let ut=c.get(nt).get(L);l[ut]!==K&&(i.bindBufferBase(i.UNIFORM_BUFFER,ut,K),l[ut]=K)}function gt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},f={},it=null,rt={},u={},l={},d=new WeakMap,g=[],v=null,m=!1,p=null,S=null,y=null,x=null,R=null,E=null,_=null,w=new Qt(0,0,0),B=0,A=!1,P=null,z=null,Y=null,I=null,k=null,$.set(0,0,i.canvas.width,i.canvas.height),j.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:Ct,disable:qt,bindFramebuffer:Me,drawBuffers:Yt,useProgram:re,setBlending:mt,setMaterial:vt,setFlipSided:It,setCullFace:At,setLineWidth:jt,setPolygonOffset:zt,setScissorTest:fe,activeTexture:Kt,bindTexture:me,unbindTexture:O,compressedTexImage2D:ze,compressedTexImage3D:ce,texImage2D:M,texImage3D:G,pixelStorei:Q,getParameter:lt,updateUBOMapping:tt,uniformBlockBinding:et,texStorage2D:te,texStorage3D:C,texSubImage2D:Ae,texSubImage3D:wt,compressedTexSubImage2D:Ge,compressedTexSubImage3D:Wt,scissor:Mt,viewport:bt,reset:gt}}function $x(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new yt,h=new WeakMap,f=new Set,u,d=new WeakMap,g=new Set,v=new FinalizationRegistry(C=>g.delete(C)),m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(C,M){return m?new OffscreenCanvas(C,M):ea("canvas")}function S(C,M,G){let lt=1,Q=te(C);if((Q.width>G||Q.height>G)&&(lt=G/Math.max(Q.width,Q.height)),lt<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){let Mt=Math.floor(lt*Q.width),bt=Math.floor(lt*Q.height);u===void 0&&(u=p(Mt,bt));let tt=M?p(Mt,bt):u;return tt.width=Mt,tt.height=bt,tt.getContext("2d").drawImage(C,0,0,Mt,bt),$t("WebGLRenderer: Texture has been resized from ("+Q.width+"x"+Q.height+") to ("+Mt+"x"+bt+")."),tt}else return"data"in C&&$t("WebGLRenderer: Image in DataTexture is too big ("+Q.width+"x"+Q.height+")."),C;return C}function y(C){return C.generateMipmaps}function x(C){i.generateMipmap(C)}function R(C){return C.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?i.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function E(C,M,G,lt,Q,Mt=!1){if(C!==null){if(i[C]!==void 0)return i[C];$t("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let bt;lt&&(bt=t.get("EXT_texture_norm16"),bt||$t("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let tt=M;if(M===i.RED&&(G===i.FLOAT&&(tt=i.R32F),G===i.HALF_FLOAT&&(tt=i.R16F),G===i.UNSIGNED_BYTE&&(tt=i.R8),G===i.UNSIGNED_SHORT&&bt&&(tt=bt.R16_EXT),G===i.SHORT&&bt&&(tt=bt.R16_SNORM_EXT)),M===i.RED_INTEGER&&(G===i.UNSIGNED_BYTE&&(tt=i.R8UI),G===i.UNSIGNED_SHORT&&(tt=i.R16UI),G===i.UNSIGNED_INT&&(tt=i.R32UI),G===i.BYTE&&(tt=i.R8I),G===i.SHORT&&(tt=i.R16I),G===i.INT&&(tt=i.R32I)),M===i.RG&&(G===i.FLOAT&&(tt=i.RG32F),G===i.HALF_FLOAT&&(tt=i.RG16F),G===i.UNSIGNED_BYTE&&(tt=i.RG8),G===i.UNSIGNED_SHORT&&bt&&(tt=bt.RG16_EXT),G===i.SHORT&&bt&&(tt=bt.RG16_SNORM_EXT)),M===i.RG_INTEGER&&(G===i.UNSIGNED_BYTE&&(tt=i.RG8UI),G===i.UNSIGNED_SHORT&&(tt=i.RG16UI),G===i.UNSIGNED_INT&&(tt=i.RG32UI),G===i.BYTE&&(tt=i.RG8I),G===i.SHORT&&(tt=i.RG16I),G===i.INT&&(tt=i.RG32I)),M===i.RGB_INTEGER&&(G===i.UNSIGNED_BYTE&&(tt=i.RGB8UI),G===i.UNSIGNED_SHORT&&(tt=i.RGB16UI),G===i.UNSIGNED_INT&&(tt=i.RGB32UI),G===i.BYTE&&(tt=i.RGB8I),G===i.SHORT&&(tt=i.RGB16I),G===i.INT&&(tt=i.RGB32I)),M===i.RGBA_INTEGER&&(G===i.UNSIGNED_BYTE&&(tt=i.RGBA8UI),G===i.UNSIGNED_SHORT&&(tt=i.RGBA16UI),G===i.UNSIGNED_INT&&(tt=i.RGBA32UI),G===i.BYTE&&(tt=i.RGBA8I),G===i.SHORT&&(tt=i.RGBA16I),G===i.INT&&(tt=i.RGBA32I)),M===i.RGB&&(G===i.UNSIGNED_SHORT&&bt&&(tt=bt.RGB16_EXT),G===i.SHORT&&bt&&(tt=bt.RGB16_SNORM_EXT),G===i.UNSIGNED_INT_5_9_9_9_REV&&(tt=i.RGB9_E5),G===i.UNSIGNED_INT_10F_11F_11F_REV&&(tt=i.R11F_G11F_B10F)),M===i.RGBA){let et=Mt?ta:ye.getTransfer(Q);G===i.FLOAT&&(tt=i.RGBA32F),G===i.HALF_FLOAT&&(tt=i.RGBA16F),G===i.UNSIGNED_BYTE&&(tt=et===Ee?i.SRGB8_ALPHA8:i.RGBA8),G===i.UNSIGNED_SHORT&&bt&&(tt=bt.RGBA16_EXT),G===i.SHORT&&bt&&(tt=bt.RGBA16_SNORM_EXT),G===i.UNSIGNED_SHORT_4_4_4_4&&(tt=i.RGBA4),G===i.UNSIGNED_SHORT_5_5_5_1&&(tt=i.RGB5_A1)}return(tt===i.R16F||tt===i.R32F||tt===i.RG16F||tt===i.RG32F||tt===i.RGBA16F||tt===i.RGBA32F)&&t.get("EXT_color_buffer_float"),tt}function _(C,M){let G;return C?M===null||M===jn||M===Rs?G=i.DEPTH24_STENCIL8:M===Vn?G=i.DEPTH32F_STENCIL8:M===gr&&(G=i.DEPTH24_STENCIL8,$t("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===jn||M===Rs?G=i.DEPTH_COMPONENT24:M===Vn?G=i.DEPTH_COMPONENT32F:M===gr&&(G=i.DEPTH_COMPONENT16),G}function w(C,M){return y(C)===!0||C.isFramebufferTexture&&C.minFilter!==ln&&C.minFilter!==Sn?Math.log2(Math.max(M.width,M.height))+1:C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?M.mipmaps.length:1}function B(C){let M=new WeakRef(C);n.get(C).__ref=M,g.add(M),v.register(C,M,M)}function A(C){let M=n.get(C).__ref;M!==void 0&&(g.delete(M),v.unregister(M))}function P(C){Y(C.target)}function z(C){I(C.target)}function Y(C){C.removeEventListener("dispose",P),A(C),q(C),C.isVideoTexture&&h.delete(C),C.isHTMLTexture&&f.delete(C)}function I(C){C.removeEventListener("dispose",z),A(C),at(C)}function k(){for(let C of g){let M=C.deref();M!==void 0&&(M.isRenderTarget===!0?I(M):Y(M))}g.clear(),f.clear()}function q(C){let M=n.get(C);if(M.__webglInit===void 0)return;let G=C.source,lt=d.get(G);if(lt){let Q=lt[M.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&V(C),Object.keys(lt).length===0&&d.delete(G)}n.remove(C)}function V(C){let M=n.get(C);i.deleteTexture(M.__webglTexture);let G=C.source,lt=d.get(G);delete lt[M.__cacheKey],a.memory.textures--}function at(C){let M=n.get(C);M.__depthDisposeCallback&&M.__depthDisposeCallback();let G=C.depthTexture;if(G&&G.renderTarget===C&&Y(G),C.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(M.__webglFramebuffer[Q]))for(let Mt=0;Mt<M.__webglFramebuffer[Q].length;Mt++)i.deleteFramebuffer(M.__webglFramebuffer[Q][Mt]);else i.deleteFramebuffer(M.__webglFramebuffer[Q]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[Q])}else{if(Array.isArray(M.__webglFramebuffer))for(let Q=0;Q<M.__webglFramebuffer.length;Q++)i.deleteFramebuffer(M.__webglFramebuffer[Q]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let Q=0;Q<M.__webglColorRenderbuffer.length;Q++)M.__webglColorRenderbuffer[Q]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[Q]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}let lt=C.textures;for(let Q=0,Mt=lt.length;Q<Mt;Q++){let bt=n.get(lt[Q]);bt.__webglTexture&&(i.deleteTexture(bt.__webglTexture),a.memory.textures--),n.remove(lt[Q])}n.remove(C)}let J=0;function it(){J=0}function rt(){return J}function Dt(C){J=C}function Pt(){let C=J;return C>=s.maxTextures&&$t("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+s.maxTextures),J+=1,C}function $(C){let M=[];return M.push(C.wrapS),M.push(C.wrapT),M.push(C.wrapR||0),M.push(C.magFilter),M.push(C.minFilter),M.push(C.anisotropy),M.push(C.internalFormat),M.push(C.format),M.push(C.type),M.push(C.generateMipmaps),M.push(C.mipmapsAutoUpdate),M.push(C.premultiplyAlpha),M.push(C.flipY),M.push(C.unpackAlignment),M.push(C.colorSpace),M.join()}function j(C,M){let G=n.get(C);if(C.isVideoTexture&&Ge(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&G.__version!==C.version){let lt=C.image;if(lt===null)$t("WebGLRenderer: Texture marked for update but no image data found.");else if(lt.complete===!1)$t("WebGLRenderer: Texture marked for update but image is incomplete");else{vt(G,C,M);return}}else C.isExternalTexture&&(G.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,G.__webglTexture,i.TEXTURE0+M)}function Nt(C,M){let G=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&G.__version!==C.version){vt(G,C,M);return}else C.isExternalTexture&&(G.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,G.__webglTexture,i.TEXTURE0+M)}function Vt(C,M){let G=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&G.__version!==C.version){vt(G,C,M);return}e.bindTexture(i.TEXTURE_3D,G.__webglTexture,i.TEXTURE0+M)}function Ct(C,M){let G=n.get(C);if(C.version>0&&G.__version!==C.version){It(G,C,M);return}e.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture,i.TEXTURE0+M)}let qt={[qo]:i.REPEAT,[oi]:i.CLAMP_TO_EDGE,[Yo]:i.MIRRORED_REPEAT},Me={[ln]:i.NEAREST,[md]:i.NEAREST_MIPMAP_NEAREST,[Oa]:i.NEAREST_MIPMAP_LINEAR,[Sn]:i.LINEAR,[Tl]:i.LINEAR_MIPMAP_NEAREST,[Hi]:i.LINEAR_MIPMAP_LINEAR},Yt={[yd]:i.NEVER,[Ch]:i.ALWAYS,[vd]:i.LESS,[Ah]:i.LEQUAL,[Md]:i.EQUAL,[Eh]:i.GEQUAL,[Sd]:i.GREATER,[bd]:i.NOTEQUAL};function re(C,M){if(M.type===Vn&&t.has("OES_texture_float_linear")===!1&&(M.magFilter===Sn||M.magFilter===Tl||M.magFilter===Oa||M.magFilter===Hi||M.minFilter===Sn||M.minFilter===Tl||M.minFilter===Oa||M.minFilter===Hi)&&$t("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(C,i.TEXTURE_WRAP_S,qt[M.wrapS]),i.texParameteri(C,i.TEXTURE_WRAP_T,qt[M.wrapT]),(C===i.TEXTURE_3D||C===i.TEXTURE_2D_ARRAY)&&i.texParameteri(C,i.TEXTURE_WRAP_R,qt[M.wrapR]),i.texParameteri(C,i.TEXTURE_MAG_FILTER,Me[M.magFilter]),i.texParameteri(C,i.TEXTURE_MIN_FILTER,Me[M.minFilter]),M.compareFunction&&(i.texParameteri(C,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(C,i.TEXTURE_COMPARE_FUNC,Yt[M.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===ln||M.minFilter!==Oa&&M.minFilter!==Hi||M.type===Vn&&t.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){let G=t.get("EXT_texture_filter_anisotropic");i.texParameterf(C,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,s.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function de(C,M){let G=!1;C.__webglInit===void 0&&(C.__webglInit=!0,M.addEventListener("dispose",P),B(M));let lt=M.source,Q=d.get(lt);Q===void 0&&(Q={},d.set(lt,Q));let Mt=$(M);if(Mt!==C.__cacheKey){Q[Mt]===void 0&&(Q[Mt]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,G=!0),Q[Mt].usedTimes++;let bt=Q[C.__cacheKey];bt!==void 0&&(Q[C.__cacheKey].usedTimes--,bt.usedTimes===0&&V(M)),C.__cacheKey=Mt,C.__webglTexture=Q[Mt].texture}return G}function st(C,M,G){return Math.floor(Math.floor(C/G)/M)}function mt(C,M,G,lt){let Mt=C.updateRanges;if(Mt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,M.width,M.height,G,lt,M.data);else{Mt.sort((L,nt)=>L.start-nt.start);let bt=0;for(let L=1;L<Mt.length;L++){let nt=Mt[bt],K=Mt[L],ht=nt.start+nt.count,ut=st(K.start,M.width,4),St=st(nt.start,M.width,4);K.start<=ht+1&&ut===St&&st(K.start+K.count-1,M.width,4)===ut?nt.count=Math.max(nt.count,K.start+K.count-nt.start):(++bt,Mt[bt]=K)}Mt.length=bt+1;let tt=e.getParameter(i.UNPACK_ROW_LENGTH),et=e.getParameter(i.UNPACK_SKIP_PIXELS),gt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,M.width);for(let L=0,nt=Mt.length;L<nt;L++){let K=Mt[L],ht=Math.floor(K.start/4),ut=Math.ceil(K.count/4),St=ht%M.width,Gt=Math.floor(ht/M.width),Zt=ut,pt=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,St),e.pixelStorei(i.UNPACK_SKIP_ROWS,Gt),e.texSubImage2D(i.TEXTURE_2D,0,St,Gt,Zt,pt,G,lt,M.data)}C.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,tt),e.pixelStorei(i.UNPACK_SKIP_PIXELS,et),e.pixelStorei(i.UNPACK_SKIP_ROWS,gt)}}function vt(C,M,G){let lt=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(lt=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(lt=i.TEXTURE_3D);let Q=de(C,M),Mt=M.source;e.bindTexture(lt,C.__webglTexture,i.TEXTURE0+G);let bt=n.get(Mt);if(Mt.version!==bt.__version||Q===!0){if(e.activeTexture(i.TEXTURE0+G),(typeof ImageBitmap<"u"&&M.image instanceof ImageBitmap)===!1){let pt=ye.getPrimaries(ye.workingColorSpace),Ht=M.colorSpace===Xi?null:ye.getPrimaries(M.colorSpace),se=M.colorSpace===Xi||pt===Ht?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,se)}e.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment);let et=S(M.image,!1,s.maxTextureSize);et=Wt(M,et);let gt=r.convert(M.format,M.colorSpace),L=r.convert(M.type),nt=E(M.internalFormat,gt,L,M.normalized,M.colorSpace,M.isVideoTexture);re(lt,M);let K,ht=M.mipmaps,ut=M.isVideoTexture!==!0,St=bt.__version===void 0||Q===!0,Gt=Mt.dataReady,Zt=w(M,et);if(M.isDepthTexture)nt=_(M.format===Wi,M.type),St&&(ut?e.texStorage2D(i.TEXTURE_2D,1,nt,et.width,et.height):e.texImage2D(i.TEXTURE_2D,0,nt,et.width,et.height,0,gt,L,null));else if(M.isDataTexture)if(ht.length>0){ut&&St&&e.texStorage2D(i.TEXTURE_2D,Zt,nt,ht[0].width,ht[0].height);for(let pt=0,Ht=ht.length;pt<Ht;pt++)K=ht[pt],ut?Gt&&e.texSubImage2D(i.TEXTURE_2D,pt,0,0,K.width,K.height,gt,L,K.data):e.texImage2D(i.TEXTURE_2D,pt,nt,K.width,K.height,0,gt,L,K.data);M.generateMipmaps=!1}else ut?(St&&e.texStorage2D(i.TEXTURE_2D,Zt,nt,et.width,et.height),Gt&&mt(M,et,gt,L)):e.texImage2D(i.TEXTURE_2D,0,nt,et.width,et.height,0,gt,L,et.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){ut&&St&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Zt,nt,ht[0].width,ht[0].height,et.depth);for(let pt=0,Ht=ht.length;pt<Ht;pt++)if(K=ht[pt],M.format!==ei)if(gt!==null)if(ut){if(Gt)if(M.layerUpdates.size>0){let se=Fh(K.width,K.height,M.format,M.type);for(let Et of M.layerUpdates){let be=K.data.subarray(Et*se/K.data.BYTES_PER_ELEMENT,(Et+1)*se/K.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,pt,0,0,Et,K.width,K.height,1,gt,be)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,pt,0,0,0,K.width,K.height,et.depth,gt,K.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,pt,nt,K.width,K.height,et.depth,0,K.data,0,0);else $t("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ut?Gt&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,pt,0,0,0,K.width,K.height,et.depth,gt,L,K.data):e.texImage3D(i.TEXTURE_2D_ARRAY,pt,nt,K.width,K.height,et.depth,0,gt,L,K.data);M.layerUpdates.size>0&&M.clearLayerUpdates()}else{ut&&St&&e.texStorage2D(i.TEXTURE_2D,Zt,nt,ht[0].width,ht[0].height);for(let pt=0,Ht=ht.length;pt<Ht;pt++)K=ht[pt],M.format!==ei?gt!==null?ut?Gt&&e.compressedTexSubImage2D(i.TEXTURE_2D,pt,0,0,K.width,K.height,gt,K.data):e.compressedTexImage2D(i.TEXTURE_2D,pt,nt,K.width,K.height,0,K.data):$t("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ut?Gt&&e.texSubImage2D(i.TEXTURE_2D,pt,0,0,K.width,K.height,gt,L,K.data):e.texImage2D(i.TEXTURE_2D,pt,nt,K.width,K.height,0,gt,L,K.data)}else if(M.isDataArrayTexture)if(ut){if(St&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Zt,nt,et.width,et.height,et.depth),Gt)if(M.layerUpdates.size>0){let pt=Fh(et.width,et.height,M.format,M.type);for(let Ht of M.layerUpdates){let se=et.data.subarray(Ht*pt/et.data.BYTES_PER_ELEMENT,(Ht+1)*pt/et.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Ht,et.width,et.height,1,gt,L,se)}M.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,et.width,et.height,et.depth,gt,L,et.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,nt,et.width,et.height,et.depth,0,gt,L,et.data);else if(M.isData3DTexture)ut?(St&&e.texStorage3D(i.TEXTURE_3D,Zt,nt,et.width,et.height,et.depth),Gt&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,et.width,et.height,et.depth,gt,L,et.data)):e.texImage3D(i.TEXTURE_3D,0,nt,et.width,et.height,et.depth,0,gt,L,et.data);else if(M.isFramebufferTexture){if(St)if(ut)e.texStorage2D(i.TEXTURE_2D,Zt,nt,et.width,et.height);else{let pt=et.width,Ht=et.height;for(let se=0;se<Zt;se++)e.texImage2D(i.TEXTURE_2D,se,nt,pt,Ht,0,gt,L,null),pt>>=1,Ht>>=1}}else if(M.isHTMLTexture){if("texElementImage2D"in i){let pt=i.canvas;if(pt.hasAttribute("layoutsubtree")||pt.setAttribute("layoutsubtree","true"),et.parentNode!==pt){pt.appendChild(et),f.add(M),pt.onpaint=Ht=>{let se=Ht.changedElements;for(let Et of f)se.includes(Et.image)&&(Et.needsUpdate=!0)},pt.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,et);else{let se=i.RGBA,Et=i.RGBA,be=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,se,Et,be,et)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(ht.length>0){if(ut&&St){let pt=te(ht[0]);e.texStorage2D(i.TEXTURE_2D,Zt,nt,pt.width,pt.height)}for(let pt=0,Ht=ht.length;pt<Ht;pt++)K=ht[pt],ut?Gt&&e.texSubImage2D(i.TEXTURE_2D,pt,0,0,gt,L,K):e.texImage2D(i.TEXTURE_2D,pt,nt,gt,L,K);M.generateMipmaps=!1}else if(ut){if(St){let pt=te(et);e.texStorage2D(i.TEXTURE_2D,Zt,nt,pt.width,pt.height)}Gt&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,gt,L,et)}else e.texImage2D(i.TEXTURE_2D,0,nt,gt,L,et);y(M)&&M.mipmapsAutoUpdate===!0&&x(lt),bt.__version=Mt.version,M.onUpdate&&M.onUpdate(M)}C.__version=M.version}function It(C,M,G){if(M.image.length!==6)return;let lt=de(C,M),Q=M.source;e.bindTexture(i.TEXTURE_CUBE_MAP,C.__webglTexture,i.TEXTURE0+G);let Mt=n.get(Q);if(Q.version!==Mt.__version||lt===!0){e.activeTexture(i.TEXTURE0+G);let bt=ye.getPrimaries(ye.workingColorSpace),tt=M.colorSpace===Xi?null:ye.getPrimaries(M.colorSpace),et=M.colorSpace===Xi||bt===tt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,et);let gt=M.isCompressedTexture||M.image[0].isCompressedTexture,L=M.image[0]&&M.image[0].isDataTexture,nt=[];for(let Et=0;Et<6;Et++)!gt&&!L?nt[Et]=S(M.image[Et],!0,s.maxCubemapSize):nt[Et]=L?M.image[Et].image:M.image[Et],nt[Et]=Wt(M,nt[Et]);let K=nt[0],ht=r.convert(M.format,M.colorSpace),ut=r.convert(M.type),St=E(M.internalFormat,ht,ut,M.normalized,M.colorSpace),Gt=M.isVideoTexture!==!0,Zt=Mt.__version===void 0||lt===!0,pt=Q.dataReady,Ht=w(M,K);re(i.TEXTURE_CUBE_MAP,M);let se;if(M.isDepthTexture){if(St=_(M.format===Wi,M.type),Zt)if(Gt)e.texStorage2D(i.TEXTURE_CUBE_MAP,1,St,K.width,K.height);else for(let Et=0;Et<6;Et++)e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,0,St,K.width,K.height,0,ht,ut,null)}else if(gt){Gt&&Zt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Ht,St,K.width,K.height);for(let Et=0;Et<6;Et++){se=nt[Et].mipmaps;for(let be=0;be<se.length;be++){let Ne=se[be];M.format!==ei?ht!==null?Gt?pt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be,0,0,Ne.width,Ne.height,ht,Ne.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be,St,Ne.width,Ne.height,0,Ne.data):$t("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Gt?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be,0,0,Ne.width,Ne.height,ht,ut,Ne.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be,St,Ne.width,Ne.height,0,ht,ut,Ne.data)}}}else{if(se=M.mipmaps,Gt&&Zt){se.length>0&&Ht++;let Et=te(nt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Ht,St,Et.width,Et.height)}for(let Et=0;Et<6;Et++)if(L){Gt?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,0,0,0,nt[Et].width,nt[Et].height,ht,ut,nt[Et].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,0,St,nt[Et].width,nt[Et].height,0,ht,ut,nt[Et].data);for(let be=0;be<se.length;be++){let un=se[be].image[Et].image;Gt?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be+1,0,0,un.width,un.height,ht,ut,un.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be+1,St,un.width,un.height,0,ht,ut,un.data)}}else{Gt?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,0,0,0,ht,ut,nt[Et]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,0,St,ht,ut,nt[Et]);for(let be=0;be<se.length;be++){let Ne=se[be];Gt?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be+1,0,0,ht,ut,Ne.image[Et]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Et,be+1,St,ht,ut,Ne.image[Et])}}}y(M)&&M.mipmapsAutoUpdate===!0&&x(i.TEXTURE_CUBE_MAP),Mt.__version=Q.version,M.onUpdate&&M.onUpdate(M)}C.__version=M.version}function At(C,M,G,lt,Q,Mt){let bt=r.convert(G.format,G.colorSpace),tt=r.convert(G.type),et=E(G.internalFormat,bt,tt,G.normalized,G.colorSpace),gt=n.get(M),L=n.get(G);if(L.__renderTarget=M,!gt.__hasExternalTextures){let nt=Math.max(1,M.width>>Mt),K=Math.max(1,M.height>>Mt);Q===i.TEXTURE_3D||Q===i.TEXTURE_2D_ARRAY?e.texImage3D(Q,Mt,et,nt,K,M.depth,0,bt,tt,null):e.texImage2D(Q,Mt,et,nt,K,0,bt,tt,null)}e.bindFramebuffer(i.FRAMEBUFFER,C),wt(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,lt,Q,L.__webglTexture,0,Ae(M)):(Q===i.TEXTURE_2D||Q>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,lt,Q,L.__webglTexture,Mt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function jt(C,M,G){if(i.bindRenderbuffer(i.RENDERBUFFER,C),M.depthBuffer){let lt=M.depthTexture,Q=lt&&lt.isDepthTexture?lt.type:null,Mt=_(M.stencilBuffer,Q),bt=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;wt(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ae(M),Mt,M.width,M.height):G?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ae(M),Mt,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,Mt,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,bt,i.RENDERBUFFER,C)}else{let lt=M.textures;for(let Q=0;Q<lt.length;Q++){let Mt=lt[Q],bt=r.convert(Mt.format,Mt.colorSpace),tt=r.convert(Mt.type),et=E(Mt.internalFormat,bt,tt,Mt.normalized,Mt.colorSpace);wt(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ae(M),et,M.width,M.height):G?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ae(M),et,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,et,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function zt(C,M,G){let lt=M.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,C),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Q=n.get(M.depthTexture);Q.__renderTarget=M;let Mt=lt?M.depthTexture.image[0]:M.depthTexture.image;(!Q.__webglTexture||Mt.width!==M.width||Mt.height!==M.height)&&(Mt.width=M.width,Mt.height=M.height,M.depthTexture.needsUpdate=!0),lt?Ct(M.depthTexture,0):j(M.depthTexture,0);let bt=Q.__webglTexture,tt=Ae(M),et=lt?i.TEXTURE_CUBE_MAP_POSITIVE_X+G:i.TEXTURE_2D,gt=M.depthTexture.format===Wi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(M.depthTexture.format===Oi)wt(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,gt,et,bt,0,tt):i.framebufferTexture2D(i.FRAMEBUFFER,gt,et,bt,0);else if(M.depthTexture.format===Wi)wt(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,gt,et,bt,0,tt):i.framebufferTexture2D(i.FRAMEBUFFER,gt,et,bt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function fe(C){let M=n.get(C),G=C.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==C.depthTexture){let lt=C.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),lt){let Q=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,lt.removeEventListener("dispose",Q)};lt.addEventListener("dispose",Q),M.__depthDisposeCallback=Q}M.__boundDepthTexture=lt}if(C.depthTexture&&!M.__autoAllocateDepthBuffer)if(G)for(let lt=0;lt<6;lt++)zt(M.__webglFramebuffer[lt],C,lt);else C.texture.mipmaps.length>0?zt(M.__webglFramebuffer[0],C,0):zt(M.__webglFramebuffer,C,0);else if(G){M.__webglDepthbuffer=[];for(let lt=0;lt<6;lt++)if(e.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[lt]),M.__webglDepthbuffer[lt]===void 0)M.__webglDepthbuffer[lt]=i.createRenderbuffer(),jt(M.__webglDepthbuffer[lt],C,!1);else{let Q=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Mt=M.__webglDepthbuffer[lt];i.bindRenderbuffer(i.RENDERBUFFER,Mt),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,Mt)}}else if(C.texture.mipmaps.length>0?e.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),jt(M.__webglDepthbuffer,C,!1);else{let Q=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Mt=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Mt),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,Mt)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Kt(C,M,G){let lt=n.get(C);M!==void 0&&At(lt.__webglFramebuffer,C,C.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),G!==void 0&&fe(C)}function me(C){let M=C.texture,G=n.get(C),lt=n.get(M);C.addEventListener("dispose",z),B(C);let Q=C.textures,Mt=C.isWebGLCubeRenderTarget===!0,bt=Q.length>1;if(bt||(lt.__webglTexture===void 0&&(lt.__webglTexture=i.createTexture()),lt.__version=M.version,a.memory.textures++),Mt){G.__webglFramebuffer=[];for(let tt=0;tt<6;tt++)if(M.mipmaps.length>0){G.__webglFramebuffer[tt]=[];for(let et=0;et<M.mipmaps.length;et++)G.__webglFramebuffer[tt][et]=i.createFramebuffer()}else G.__webglFramebuffer[tt]=i.createFramebuffer()}else{if(M.mipmaps.length>0){G.__webglFramebuffer=[];for(let tt=0;tt<M.mipmaps.length;tt++)G.__webglFramebuffer[tt]=i.createFramebuffer()}else G.__webglFramebuffer=i.createFramebuffer();if(bt)for(let tt=0,et=Q.length;tt<et;tt++){let gt=n.get(Q[tt]);gt.__webglTexture===void 0&&(gt.__webglTexture=i.createTexture(),a.memory.textures++)}if(C.samples>0&&wt(C)===!1){G.__webglMultisampledFramebuffer=i.createFramebuffer(),G.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let tt=0;tt<Q.length;tt++){let et=Q[tt];G.__webglColorRenderbuffer[tt]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,G.__webglColorRenderbuffer[tt]);let gt=r.convert(et.format,et.colorSpace),L=r.convert(et.type),nt=E(et.internalFormat,gt,L,et.normalized,et.colorSpace,C.isXRRenderTarget===!0),K=Ae(C);i.renderbufferStorageMultisample(i.RENDERBUFFER,K,nt,C.width,C.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+tt,i.RENDERBUFFER,G.__webglColorRenderbuffer[tt])}i.bindRenderbuffer(i.RENDERBUFFER,null),C.depthBuffer&&(G.__webglDepthRenderbuffer=i.createRenderbuffer(),jt(G.__webglDepthRenderbuffer,C,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Mt){e.bindTexture(i.TEXTURE_CUBE_MAP,lt.__webglTexture),re(i.TEXTURE_CUBE_MAP,M);for(let tt=0;tt<6;tt++)if(M.mipmaps.length>0)for(let et=0;et<M.mipmaps.length;et++)At(G.__webglFramebuffer[tt][et],C,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,et);else At(G.__webglFramebuffer[tt],C,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+tt,0);y(M)?x(i.TEXTURE_CUBE_MAP):M.mipmaps.length>0&&i.texParameteri(i.TEXTURE_CUBE_MAP,i.TEXTURE_MAX_LEVEL,M.mipmaps.length-1),e.unbindTexture()}else if(bt){for(let tt=0,et=Q.length;tt<et;tt++){let gt=Q[tt],L=n.get(gt),nt=i.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(nt=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(nt,L.__webglTexture),re(nt,gt),At(G.__webglFramebuffer,C,gt,i.COLOR_ATTACHMENT0+tt,nt,0),y(gt)&&x(nt)}e.unbindTexture()}else{let tt=i.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(tt=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(tt,lt.__webglTexture),re(tt,M),M.mipmaps.length>0)for(let et=0;et<M.mipmaps.length;et++)At(G.__webglFramebuffer[et],C,M,i.COLOR_ATTACHMENT0,tt,et);else At(G.__webglFramebuffer,C,M,i.COLOR_ATTACHMENT0,tt,0);y(M)?x(tt):M.mipmaps.length>0&&i.texParameteri(tt,i.TEXTURE_MAX_LEVEL,M.mipmaps.length-1),e.unbindTexture()}C.depthBuffer&&fe(C)}function O(C){let M=C.textures;for(let G=0,lt=M.length;G<lt;G++){let Q=M[G];if(y(Q)&&Q.mipmapsAutoUpdate===!0){let Mt=R(C),bt=n.get(Q).__webglTexture;e.bindTexture(Mt,bt),x(Mt),e.unbindTexture()}}}let ze=[];function ce(C){if(C.samples>0){if(wt(C)===!1){let M=C.textures,G=C.width,lt=C.height,Q=i.COLOR_BUFFER_BIT,Mt=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,bt=n.get(C),tt=M.length>1;if(tt)for(let gt=0;gt<M.length;gt++)e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,bt.__webglMultisampledFramebuffer),C.texture.mipmaps.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglFramebuffer);for(let gt=0;gt<M.length;gt++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(Q|=i.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(Q|=i.STENCIL_BUFFER_BIT)),tt){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,bt.__webglColorRenderbuffer[gt]);let L=n.get(M[gt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,L,0)}i.blitFramebuffer(0,0,G,lt,0,0,G,lt,Q,i.NEAREST),l===!0&&(ze.length=0,ze.push(i.COLOR_ATTACHMENT0+gt),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&ze.push(Mt),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ze))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),tt)for(let gt=0;gt<M.length;gt++){e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.RENDERBUFFER,bt.__webglColorRenderbuffer[gt]);let L=n.get(M[gt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+gt,i.TEXTURE_2D,L,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&l){let M=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function Ae(C){return Math.min(s.maxSamples,C.samples)}function wt(C){let M=n.get(C);return C.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function Ge(C){let M=a.render.frame;h.get(C)!==M&&(h.set(C,M),C.update())}function Wt(C,M){let G=C.colorSpace,lt=C.format,Q=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||G!==jr&&G!==Xi&&(ye.getTransfer(G)===Ee?(lt!==ei||Q!==En)&&$t("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ee("WebGLTextures: Unsupported texture color space:",G)),M}function te(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=Pt,this.resetTextureUnits=it,this.getTextureUnits=rt,this.setTextureUnits=Dt,this.setTexture2D=j,this.setTexture2DArray=Nt,this.setTexture3D=Vt,this.setTextureCube=Ct,this.rebindTextures=Kt,this.setupRenderTarget=me,this.updateRenderTargetMipmap=O,this.updateMultisampleRenderTarget=ce,this.setupDepthRenderbuffer=fe,this.setupFrameBufferTexture=At,this.useMultisampledRTT=wt,this.dispose=k}function Kx(i,t){function e(n,s=Xi){let r,a=ye.getTransfer(s);if(n===En)return i.UNSIGNED_BYTE;if(n===El)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Cl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Sh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===bh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===vh)return i.BYTE;if(n===Mh)return i.SHORT;if(n===gr)return i.UNSIGNED_SHORT;if(n===Al)return i.INT;if(n===jn)return i.UNSIGNED_INT;if(n===Vn)return i.FLOAT;if(n===ti)return i.HALF_FLOAT;if(n===wh)return i.ALPHA;if(n===Th)return i.RGB;if(n===ei)return i.RGBA;if(n===Oi)return i.DEPTH_COMPONENT;if(n===Wi)return i.DEPTH_STENCIL;if(n===Rl)return i.RED;if(n===Pl)return i.RED_INTEGER;if(n===os)return i.RG;if(n===Il)return i.RG_INTEGER;if(n===Ll)return i.RGBA_INTEGER;if(n===Ba||n===ka||n===za||n===Ga)if(a===Ee)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Ba)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ka)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===za)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ga)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Ba)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ka)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===za)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ga)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Nl||n===Dl||n===Ul||n===Fl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Nl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Dl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ul)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Fl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ol||n===Bl||n===kl||n===zl||n===Gl||n===Va||n===Vl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Ol||n===Bl)return a===Ee?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===kl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===zl)return r.COMPRESSED_R11_EAC;if(n===Gl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Va)return r.COMPRESSED_RG11_EAC;if(n===Vl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Hl||n===Wl||n===Xl||n===ql||n===Yl||n===Zl||n===Jl||n===$l||n===Kl||n===Ql||n===jl||n===tc||n===ec||n===nc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Hl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Wl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Xl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ql)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Yl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Zl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Jl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===$l)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Kl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ql)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===jl)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===tc)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===ec)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===nc)return a===Ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ic||n===sc||n===rc)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===ic)return a===Ee?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===sc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===rc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===ac||n===oc||n===Ha||n===lc)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===ac)return r.COMPRESSED_RED_RGTC1_EXT;if(n===oc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Ha)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===lc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Rs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var Qx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,jx=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Xh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new da(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new mi({vertexShader:Qx,fragmentShader:jx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ke(new gn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},qh=class extends ci{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,f=null,u=null,d=null,g=null,v=typeof XRWebGLBinding<"u",m=new Xh,p={},S=e.getContextAttributes(),y=null,x=null,R=[],E=[],_=new yt,w=null,B=null,A=new mn;A.viewport=new He;let P=new mn;P.viewport=new He;let z=[A,P],Y=new Ml,I=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let j=R[$];return j===void 0&&(j=new sr,R[$]=j),j.getTargetRaySpace()},this.getControllerGrip=function($){let j=R[$];return j===void 0&&(j=new sr,R[$]=j),j.getGripSpace()},this.getHand=function($){let j=R[$];return j===void 0&&(j=new sr,R[$]=j),j.getHandSpace()};function q($){let j=E.indexOf($.inputSource);if(j===-1)return;let Nt=R[j];Nt!==void 0&&(Nt.update($.inputSource,$.frame,c||a),Nt.dispatchEvent({type:$.type,data:$.inputSource}))}function V(){s.removeEventListener("select",q),s.removeEventListener("selectstart",q),s.removeEventListener("selectend",q),s.removeEventListener("squeeze",q),s.removeEventListener("squeezestart",q),s.removeEventListener("squeezeend",q),s.removeEventListener("end",V),s.removeEventListener("inputsourceschange",at);for(let $=0;$<R.length;$++){let j=E[$];j!==null&&(E[$]=null,R[$].disconnect(j))}I=null,k=null,m.reset();for(let $ in p)delete p[$];if(t.setRenderTarget(y),d=null,u=null,f=null,s=null,x=null,Pt.stop(),n.isPresenting=!1,t.setPixelRatio(w),t.setSize(_.width,_.height,!1),B!==null){let $=B.camera;$.fov=B.fov,$.zoom=B.zoom,$.updateProjectionMatrix(),B=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,n.isPresenting===!0&&$t("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){o=$,n.isPresenting===!0&&$t("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function($){c=$},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f===null&&v&&(f=new XRWebGLBinding(s,e)),f},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function($){if(s=$,s!==null){if(y=t.getRenderTarget(),s.addEventListener("select",q),s.addEventListener("selectstart",q),s.addEventListener("selectend",q),s.addEventListener("squeeze",q),s.addEventListener("squeezestart",q),s.addEventListener("squeezeend",q),s.addEventListener("end",V),s.addEventListener("inputsourceschange",at),S.xrCompatible!==!0&&await e.makeXRCompatible(),w=t.getPixelRatio(),t.getSize(_),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let Nt=null,Vt=null,Ct=null;S.depth&&(Ct=S.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,Nt=S.stencil?Wi:Oi,Vt=S.stencil?Rs:jn);let qt={colorFormat:e.RGBA8,depthFormat:Ct,scaleFactor:r};f=this.getBinding(),u=f.createProjectionLayer(qt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),x=new Ln(u.textureWidth,u.textureHeight,{format:ei,type:En,depthTexture:new zi(u.textureWidth,u.textureHeight,Vt,void 0,void 0,void 0,void 0,void 0,void 0,Nt),stencilBuffer:S.stencil,colorSpace:t.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let Nt={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(s,e,Nt),s.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),x=new Ln(d.framebufferWidth,d.framebufferHeight,{format:ei,type:En,colorSpace:t.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Pt.setContext(s),Pt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function at($){for(let j=0;j<$.removed.length;j++){let Nt=$.removed[j],Vt=E.indexOf(Nt);Vt>=0&&(E[Vt]=null,R[Vt].disconnect(Nt))}for(let j=0;j<$.added.length;j++){let Nt=$.added[j],Vt=E.indexOf(Nt);if(Vt===-1){for(let qt=0;qt<R.length;qt++)if(qt>=E.length){E.push(Nt),Vt=qt;break}else if(E[qt]===null){E[qt]=Nt,Vt=qt;break}if(Vt===-1)break}let Ct=R[Vt];Ct&&Ct.connect(Nt)}}function J($,j){j===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(j.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(s===null)return;let j=$.near,Nt=$.far;m.texture!==null&&(m.depthNear>0&&(j=m.depthNear),m.depthFar>0&&(Nt=m.depthFar)),Y.near=P.near=A.near=j,Y.far=P.far=A.far=Nt,(I!==Y.near||k!==Y.far)&&(s.updateRenderState({depthNear:Y.near,depthFar:Y.far}),I=Y.near,k=Y.far),Y.layers.mask=$.layers.mask|6,A.layers.mask=Y.layers.mask&-5,P.layers.mask=Y.layers.mask&-3;let Vt=$.parent,Ct=Y.cameras;J(Y,Vt);for(let qt=0;qt<Ct.length;qt++)J(Ct[qt],Vt);Y.projectionMatrix.copy(A.projectionMatrix),Y.projectionMatrixInverse.copy(A.projectionMatrixInverse),B===null&&$.isPerspectiveCamera&&(B={camera:$,fov:$.fov,zoom:$.zoom}),it($,Y,Vt)};function it($,j,Nt){Nt===null?$.matrix.copy(j.matrixWorld):($.matrix.copy(Nt.matrixWorld),$.matrix.invert(),$.matrix.multiply(j.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(j.projectionMatrix),$.projectionMatrixInverse.copy(j.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=Jo*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return Y},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function($){l=$,u!==null&&(u.fixedFoveation=$),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=$)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(Y)},this.getCameraTexture=function($){return p[$]};let rt=null;function Dt($,j){if(h=j.getViewerPose(c||a),g=j,h!==null){let Nt=h.views;d!==null&&(t.setRenderTargetFramebuffer(x,d.framebuffer),t.setRenderTarget(x));let Vt=!1;Nt.length!==Y.cameras.length&&(Y.cameras.length=0,Vt=!0);for(let Yt=0;Yt<Nt.length;Yt++){let re=Nt[Yt],de=null;if(d!==null)de=d.getViewport(re);else{let mt=f.getViewSubImage(u,re);de=mt.viewport,Yt===0&&(t.setRenderTargetTextures(x,mt.colorTexture,mt.depthStencilTexture),t.setRenderTarget(x))}let st=z[Yt];st===void 0&&(st=new mn,st.layers.enable(Yt),st.viewport=new He,z[Yt]=st),st.matrix.fromArray(re.transform.matrix),st.matrix.decompose(st.position,st.quaternion,st.scale),st.projectionMatrix.fromArray(re.projectionMatrix),st.projectionMatrixInverse.copy(st.projectionMatrix).invert(),st.viewport.set(de.x,de.y,de.width,de.height),Yt===0&&(Y.matrix.copy(st.matrix),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale)),Vt===!0&&Y.cameras.push(st)}let Ct=s.enabledFeatures;if(Ct&&Ct.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&v){f=n.getBinding();let Yt=f.getDepthInformation(Nt[0]);Yt&&Yt.isValid&&Yt.texture&&m.init(Yt,s.renderState)}if(Ct&&Ct.includes("camera-access")&&v){t.state.unbindTexture(),f=n.getBinding();for(let Yt=0;Yt<Nt.length;Yt++){let re=Nt[Yt].camera;if(re){let de=p[re];de||(de=new da,p[re]=de);let st=f.getCameraImage(re);de.sourceTexture=st}}}}for(let Nt=0;Nt<R.length;Nt++){let Vt=E[Nt],Ct=R[Nt];Vt!==null&&Ct!==void 0&&Ct.update(Vt,j,c||a)}rt&&rt($,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),g=null}let Pt=new af;Pt.setAnimationLoop(Dt),this.setAnimationLoop=function($){rt=$},this.dispose=function(){}}},ty=new Te,gf=new ie;gf.set(-1,0,0,0,1,0,0,0,1);function ey(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Nh(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,y,x){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(m,p):p.isMeshLambertMaterial?(r(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(m,p),f(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(m,p),u(m,p),p.isMeshPhysicalMaterial&&d(m,p,x)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),v(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,S,y):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===hn&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===hn&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let S=t.get(p),y=S.envMap,x=S.envMapRotation;y&&(m.envMap.value=y,m.envMapRotation.value.setFromMatrix4(ty.makeRotationFromEuler(x)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(gf),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=y*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,S){m.ior.value=p.ior,p.diffuseRoughness>0&&(m.diffuseRoughness.value=p.diffuseRoughness,p.diffuseRoughnessMap&&(m.diffuseRoughnessMap.value=p.diffuseRoughnessMap,e(p.diffuseRoughnessMap,m.diffuseRoughnessMapTransform))),p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===hn&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.retroreflectivity>0&&(m.retroreflectivity.value=p.retroreflectivity),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessMinimum,m.iridescenceThicknessMaximum.value=p.iridescenceThicknessMaximum,p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function v(m,p){let S=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function ny(i,t,e,n){let s={},r={};function a(S,y){let x=y.program;n.uniformBlockBinding(S,x,s[S.id])}function o(S,y){let x=s[S.id];x===void 0&&(g(S),x=l(S),s[S.id]=x,S.addEventListener("dispose",m));let R=y.program;n.updateUBOMapping(S,R);let E=t.render.frame;r[S.id]!==E&&(c(S),r[S.id]=E)}function l(S){let y=i.createBuffer(),x=S.__size,R=S.usage;return i.bindBuffer(i.UNIFORM_BUFFER,y),i.bufferData(i.UNIFORM_BUFFER,x,R),i.bindBuffer(i.UNIFORM_BUFFER,null),y}function c(S){let y=s[S.id],x=S.uniforms,R=S.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let E=0,_=x.length;E<_;E++){let w=x[E];if(Array.isArray(w))for(let B=0,A=w.length;B<A;B++)h(w[B],E,B,R);else h(w,E,0,R)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function h(S,y,x,R){if(u(S,y,x,R)===!0){let E=S.__offset,_=S.value;if(Array.isArray(_)){let w=0;for(let B=0;B<_.length;B++){let A=_[B],P=v(A,!0);f(A,S.__data,w),w+=P.storage/Float32Array.BYTES_PER_ELEMENT}}else f(_,S.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,E,S.__data)}}function f(S,y,x){typeof S=="number"||typeof S=="boolean"?y[x]=S:S.isMatrix3?(y[x]=S.elements[0],y[x+1]=S.elements[1],y[x+2]=S.elements[2],y[x+3]=0,y[x+4]=S.elements[3],y[x+5]=S.elements[4],y[x+6]=S.elements[5],y[x+7]=0,y[x+8]=S.elements[6],y[x+9]=S.elements[7],y[x+10]=S.elements[8],y[x+11]=0):ArrayBuffer.isView(S)?y.set(S.subarray(0,y.length-x),x):S.toArray(y,x)}function u(S,y,x,R){let E=S.value,_=y+"_"+x;if(Array.isArray(E)){R[_]===void 0&&(R[_]=[]);let w=R[_],B=!1;for(let A=0;A<E.length;A++)d(E[A],w,A)===!0&&(B=!0);return B}return d(E,R,_)}function d(S,y,x){if(y[x]===void 0)return typeof S=="number"||typeof S=="boolean"?y[x]=S:ArrayBuffer.isView(S)?y[x]=S.slice():y[x]=S.clone(),!0;{let R=y[x];if(typeof S=="number"||typeof S=="boolean"){if(R!==S)return y[x]=S,!0}else{if(ArrayBuffer.isView(S))return!0;if(R.equals(S)===!1)return R.copy(S),!0}}return!1}function g(S){let y=S.uniforms,x=0,R=16;for(let _=0,w=y.length;_<w;_++){let B=Array.isArray(y[_])?y[_]:[y[_]];for(let A=0,P=B.length;A<P;A++){let z=B[A],Y=Array.isArray(z.value)?z.value:[z.value],I=Array.isArray(y[_])||Array.isArray(z.value),k=x;for(let V=0,at=Y.length;V<at;V++){let J=Y[V],it=v(J,I),rt=x%R,Dt=rt%it.boundary,Pt=rt+Dt;x+=Dt,Pt!==0&&R-Pt<it.storage&&(x+=R-Pt),V===0&&(k=x),x+=it.storage}let q=z.type==="int"?Int32Array:z.type==="uint"?Uint32Array:Float32Array;z.__data=new q((x-k)/Float32Array.BYTES_PER_ELEMENT),z.__offset=k}}let E=x%R;return E>0&&(x+=R-E),S.__size=x,S.__cache={},this}function v(S,y){let x={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(x.boundary=4,x.storage=4):S.isVector2?(x.boundary=8,x.storage=8):S.isVector3||S.isColor?(x.boundary=16,x.storage=12):S.isVector4?(x.boundary=16,x.storage=16):S.isMatrix3?(x.boundary=16,x.storage=48):S.isMatrix4?(x.boundary=16,x.storage=64):S.isTexture?$t("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(x.boundary=16,x.storage=S.byteLength):$t("WebGLRenderer: Unsupported uniform value type.",S),y===!0&&(x.boundary=16,x.storage=Math.ceil(x.storage/16)*16),x}function m(S){let y=S.target;y.removeEventListener("dispose",m),i.deleteBuffer(s[y.id]),delete s[y.id],delete r[y.id]}function p(){for(let S in s)i.deleteBuffer(s[S]);s={},r={}}return{bind:a,update:o,dispose:p}}var iy=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),xi=null;function sy(){return xi===null&&(xi=new la(iy,16,16,os,ti),xi.name="DFG_LUT",xi.minFilter=Sn,xi.magFilter=Sn,xi.wrapS=oi,xi.wrapT=oi,xi.generateMipmaps=!1,xi.needsUpdate=!0),xi}var uc=class{constructor(t={}){let{canvas:e=Td(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:u=!1,outputBufferType:d=En}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=a;let v=d,m=new Set([Ll,Il,Pl]),p=new Set([En,jn,gr,Rs,El,Cl]),S=new Uint32Array(4),y=new Int32Array(4),x={textures:[],min:[],max:[],resolution:[]},R=null,E=null,_=[],w=[],B=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=_i,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let A=this,P=!1,z=null,Y=null,I=null,k=null;this._outputColorSpace=Mn;let q=0,V=0,at=null,J=-1,it=null,rt=new He,Dt=new He,Pt=null,$=new Qt(0),j=0,Nt=e.width,Vt=e.height,Ct=1,qt=null,Me=null,Yt=new He(0,0,Nt,Vt),re=new He(0,0,Nt,Vt),de=!1,st=new ts,mt=new jo,vt=!1,It=!1,At=new Te,jt=new F,zt=new He,fe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Kt=!1;function me(){return at===null?Ct:1}let O=n;function ze(b,U){return e.getContext(b,U)}let ce,Ae,wt,Ge,Wt,te,C,M,G,lt,Q,Mt,bt,tt,et,gt,L,nt,K,ht,ut,St,Gt;try{let b={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"187"}`),e.addEventListener("webglcontextlost",Ht,!1),e.addEventListener("webglcontextrestored",se,!1),e.addEventListener("webglcontextcreationerror",Et,!1),O===null){let U="webgl2";if(O=ze(U,b),O===null)throw ze(U)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Zt()}catch(b){throw e.removeEventListener("webglcontextlost",Ht,!1),e.removeEventListener("webglcontextrestored",se,!1),e.removeEventListener("webglcontextcreationerror",Et,!1),ee("WebGLRenderer: "+b.message),b}function Zt(){ce=new m_(O),ce.init(),ut=new Kx(O,ce),Ae=new s_(O,ce,t,ut),wt=new Jx(O,ce),Ae.reversedDepthBuffer&&u&&wt.buffers.depth.setReversed(!0),Y=O.createFramebuffer(),I=O.createFramebuffer(),k=O.createFramebuffer(),Ge=new x_(O),Wt=new Ux,te=new $x(O,ce,wt,Wt,Ae,ut,Ge),C=new p_(A),M=new vm(O),St=new n_(O,M),G=new g_(O,M,Ge,St),lt=new v_(O,G,M,St,Ge),nt=new y_(O,Ae,te),et=new r_(Wt),Q=new Dx(A,C,ce,Ae,St,et),Mt=new ey(A,Wt),bt=new Ox,tt=new Hx(ce),L=new e_(A,C,wt,lt,g,l),gt=new Zx(A,lt,Ae),Gt=new ny(O,Ge,Ae,wt),K=new i_(O,ce,Ge),ht=new __(O,ce,Ge),Ge.programs=Q.programs,A.capabilities=Ae,A.extensions=ce,A.properties=Wt,A.renderLists=bt,A.shadowMap=gt,A.state=wt,A.info=Ge}v!==En&&(B=new S_(v,e.width,e.height,o,s,r));let pt=new qh(A,O);this.xr=pt,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let b=ce.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=ce.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return Ct},this.setPixelRatio=function(b){b!==void 0&&(Ct=b,this.setSize(Nt,Vt,!1))},this.getSize=function(b){return b.set(Nt,Vt)},this.setSize=function(b,U,Z=!0){if(pt.isPresenting){$t("WebGLRenderer: Can't change size while VR device is presenting.");return}Nt=b,Vt=U,e.width=Math.floor(b*Ct),e.height=Math.floor(U*Ct),Z===!0&&(e.style.width=b+"px",e.style.height=U+"px"),B!==null&&B.setSize(e.width,e.height),this.setViewport(0,0,b,U)},this.getDrawingBufferSize=function(b){return b.set(Nt*Ct,Vt*Ct).floor()},this.setDrawingBufferSize=function(b,U,Z){Nt=b,Vt=U,Ct=Z,e.width=Math.floor(b*Z),e.height=Math.floor(U*Z),this.setViewport(0,0,b,U)},this.setEffects=function(b){if(v===En){ee("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let U=0;U<b.length;U++)if(b[U].isOutputPass===!0){$t("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}B.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(rt)},this.getViewport=function(b){return b.copy(Yt)},this.setViewport=function(b,U,Z,H){b.isVector4?Yt.set(b.x,b.y,b.z,b.w):Yt.set(b,U,Z,H),wt.viewport(rt.copy(Yt).multiplyScalar(me()).round())},this.getScissor=function(b){return b.copy(re)},this.setScissor=function(b,U,Z,H){b.isVector4?re.set(b.x,b.y,b.z,b.w):re.set(b,U,Z,H),wt.scissor(Dt.copy(re).multiplyScalar(me()).round())},this.getScissorTest=function(){return de},this.setScissorTest=function(b){wt.setScissorTest(de=b)},this.setOpaqueSort=function(b){qt=b},this.setTransparentSort=function(b){Me=b},this.getClearColor=function(b){return b.copy(L.getClearColor())},this.setClearColor=function(){L.setClearColor(...arguments)},this.getClearAlpha=function(){return L.getClearAlpha()},this.setClearAlpha=function(){L.setClearAlpha(...arguments)},this.clear=function(b=!0,U=!0,Z=!0){let H=0;if(b){let W=!1;if(at!==null){let _t=at.texture.format;W=m.has(_t)}if(W){let _t=at.texture.type,Ut=p.has(_t),xt=L.getClearColor(),Tt=L.getClearAlpha(),Ft=xt.r,Jt=xt.g,ge=xt.b;Ut?(S[0]=Ft,S[1]=Jt,S[2]=ge,S[3]=Tt,O.clearBufferuiv(O.COLOR,0,S)):(y[0]=Ft,y[1]=Jt,y[2]=ge,y[3]=Tt,O.clearBufferiv(O.COLOR,0,y))}else H|=O.COLOR_BUFFER_BIT}U&&(H|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Z&&(H|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H!==0&&O.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),z=b},this.dispose=function(){e.removeEventListener("webglcontextlost",Ht,!1),e.removeEventListener("webglcontextrestored",se,!1),e.removeEventListener("webglcontextcreationerror",Et,!1),L.dispose(),bt.dispose(),tt.dispose(),te.dispose(),Wt.dispose(),C.dispose(),lt.dispose(),G.dispose(),St.dispose(),Gt.dispose(),Q.dispose(),pt.dispose(),pt.removeEventListener("sessionstart",Rr),pt.removeEventListener("sessionend",bi),Cn.stop()};function Ht(b){b.preventDefault(),Ph("WebGLRenderer: Context Lost."),P=!0}function se(){Ph("WebGLRenderer: Context Restored."),P=!1;let b=Ge.autoReset,U=gt.enabled,Z=gt.autoUpdate,H=gt.needsUpdate,W=gt.type;Zt(),Ge.autoReset=b,gt.enabled=U,gt.autoUpdate=Z,gt.needsUpdate=H,gt.type=W}function Et(b){ee("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function be(b){let U=b.target;U.removeEventListener("dispose",be),Ne(U)}function Ne(b){un(b),Wt.remove(b)}function un(b){let U=Wt.get(b).programs;U!==void 0&&(U.forEach(function(Z){Q.releaseProgram(Z)}),b.isShaderMaterial&&Q.releaseShaderCache(b))}this.renderBufferDirect=function(b,U,Z,H,W,_t){U===null&&(U=fe);let Ut=W.isMesh&&W.matrixWorld.determinantAffine()<0,xt=Xn(b,U,Z,H,W);wt.setMaterial(H,Ut);let Tt=Z.index,Ft=1;if(H.wireframe===!0){if(Tt=G.getWireframeAttribute(Z),Tt===void 0)return;Ft=2}let Jt=Z.drawRange,ge=Z.attributes.position,Ot=Jt.start*Ft,ae=(Jt.start+Jt.count)*Ft;_t!==null&&(Ot=Math.max(Ot,_t.start*Ft),ae=Math.min(ae,(_t.start+_t.count)*Ft)),Tt!==null?(Ot=Math.max(Ot,0),ae=Math.min(ae,Tt.count)):ge!=null&&(Ot=Math.max(Ot,0),ae=Math.min(ae,ge.count));let Ie=ae-Ot;if(Ie<0||Ie===1/0)return;St.setup(W,H,xt,Z,Tt);let we,_e=K;if(Tt!==null&&(we=M.get(Tt),_e=ht,_e.setIndex(we)),W.isMesh)H.wireframe===!0?(wt.setLineWidth(H.wireframeLinewidth*me()),_e.setMode(O.LINES)):_e.setMode(O.TRIANGLES);else if(W.isLine){let $e=H.linewidth;$e===void 0&&($e=1),wt.setLineWidth($e*me()),W.isLineSegments?_e.setMode(O.LINES):W.isLineLoop?_e.setMode(O.LINE_LOOP):_e.setMode(O.LINE_STRIP)}else W.isPoints?_e.setMode(O.POINTS):W.isSprite&&_e.setMode(O.TRIANGLES);if(W.isBatchedMesh)if(ce.get("WEBGL_multi_draw"))_e.renderMultiDraw(W._multiDrawStarts,W._multiDrawCounts,W._multiDrawCount);else{let $e=W._multiDrawStarts,Lt=W._multiDrawCounts,qe=W._multiDrawCount,he=Tt?M.get(Tt).bytesPerElement:1,Ai=Wt.get(H).currentProgram.getUniforms();for(let De=0;De<qe;De++)Ai.setValue(O,"_gl_DrawID",De),_e.render($e[De]/he,Lt[De])}else if(W.isInstancedMesh)_e.renderInstances(Ot,Ie,W.count);else if(Z.isInstancedBufferGeometry){let $e=Z._maxInstanceCount!==void 0?Z._maxInstanceCount:1/0,Lt=Math.min(Z.instanceCount,$e);_e.renderInstances(Ot,Ie,Lt)}else _e.render(Ot,Ie)};function eo(b,U,Z,H){z!==null&&b.isNodeMaterial&&z.setObject(H,b),vt===!0&&et.setState(b,Z,!1),b.transparent===!0&&b.side===wn&&b.forceSinglePass===!1?(b.side=hn,b.needsUpdate=!0,On(b,U,H),b.side=rs,b.needsUpdate=!0,On(b,U,H),b.side=wn):On(b,U,H)}this.compile=function(b,U,Z=null){Z===null&&(Z=b),z!==null&&z.renderStart(b,U,Z),E=tt.get(Z),E.init(U),w.push(E),Z.traverseVisible(function(W){W.isLight&&W.layers.test(U.layers)&&(E.pushLight(W),W.castShadow&&E.pushShadow(W))}),b!==Z&&b.traverseVisible(function(W){W.isLight&&W.layers.test(U.layers)&&(E.pushLight(W),W.castShadow&&E.pushShadow(W))}),E.setupLights(),z!==null&&z.updateLights(E.state.lightsArray),It=this.localClippingEnabled,vt=et.init(this.clippingPlanes,It),vt===!0&&et.setGlobalState(this.clippingPlanes,U),z!==null&&gt.render(E.state.shadowsArray,Z,U);let H=new Set;return b.traverse(function(W){if(!(W.isMesh||W.isPoints||W.isLine||W.isSprite))return;let _t=W.material;if(_t)if(Array.isArray(_t))for(let Ut=0;Ut<_t.length;Ut++){let xt=_t[Ut];eo(xt,Z,U,W),H.add(xt)}else eo(_t,Z,U,W),H.add(_t)}),E=w.pop(),z!==null&&z.renderEnd(),H},this.compileAsync=function(b,U,Z=null){let H=this.compile(b,U,Z);return new Promise(W=>{function _t(){if(H.forEach(function(Ut){let Tt=Wt.get(Ut).currentProgram;(Tt===void 0||Tt.isReady())&&H.delete(Ut)}),H.size===0){W(b);return}setTimeout(_t,10)}ce.get("KHR_parallel_shader_compile")!==null?_t():setTimeout(_t,10)})};let Si=null;function no(b){Si&&Si(b)}function Rr(){Cn.stop()}function bi(){Cn.start()}let Cn=new af;Cn.setAnimationLoop(no),typeof self<"u"&&Cn.setContext(self),this.setAnimationLoop=function(b){Si=b,pt.setAnimationLoop(b),b===null?Cn.stop():Cn.start()},pt.addEventListener("sessionstart",Rr),pt.addEventListener("sessionend",bi),this.render=function(b,U){if(U!==void 0&&U.isCamera!==!0){ee("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;z!==null&&z.renderStart(b,U);let Z=pt.enabled===!0&&pt.isPresenting===!0,H=B!==null&&(at===null||Z)&&B.begin(A,at);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),pt.enabled===!0&&pt.isPresenting===!0&&(B===null||B.isCompositing()===!1)&&(pt.cameraAutoUpdate===!0&&pt.updateCamera(U),U=pt.getCamera()),b.isScene===!0&&b.onBeforeRender(A,b,U,at),E=tt.get(b,w.length),E.init(U),E.state.textureUnits=te.getTextureUnits(),w.push(E),At.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),U.isArrayCamera?mt.setFromArrayCamera(U):st.setFromProjectionMatrix(At,kn,U.reversedDepth),It=this.localClippingEnabled,vt=et.init(this.clippingPlanes,It),R=bt.get(b,_.length),R.init(),_.push(R),this.info.render.frame++,pt.enabled===!0&&pt.isPresenting===!0){let Ut=A.xr.getDepthSensingMesh();Ut!==null&&Pr(Ut,U,-1/0,A.sortObjects)}Pr(b,U,0,A.sortObjects),R.finish(),z!==null&&z.updateLights(E.state.lightsArray),A.sortObjects===!0&&R.sort(qt,Me),Kt=pt.enabled===!1||pt.isPresenting===!1||pt.hasDepthSensing()===!1,Kt&&L.addToRenderList(R,b),this.info.autoReset===!0&&this.info.reset(),vt===!0&&et.beginShadows();let W=E.state.shadowsArray;if(gt.render(W,b,U),vt===!0&&et.endShadows(),(H&&B.hasRenderPass())===!1){let Ut=R.opaque,xt=R.transmissive;if(E.setupLights(),U.isArrayCamera){let Tt=U.cameras;if(xt.length>0)for(let Ft=0,Jt=Tt.length;Ft<Jt;Ft++){let ge=Tt[Ft];wi(Ut,xt,b,ge)}Kt&&L.render(b);for(let Ft=0,Jt=Tt.length;Ft<Jt;Ft++){let ge=Tt[Ft];Ds(R,b,ge,ge.viewport)}}else xt.length>0&&wi(Ut,xt,b,U),Kt&&L.render(b),Ds(R,b,U)}at!==null&&V===0&&(te.updateMultisampleRenderTarget(at),te.updateRenderTargetMipmap(at)),H&&B.end(A),b.isScene===!0&&b.onAfterRender(A,b,U),St.resetDefaultState(),J=-1,it=null,w.pop(),w.length>0?(E=w[w.length-1],te.setTextureUnits(E.state.textureUnits),vt===!0&&et.setGlobalState(A.clippingPlanes,E.state.camera)):E=null,_.pop(),_.length>0?R=_[_.length-1]:R=null,z!==null&&z.renderEnd()};function Pr(b,U,Z,H){if(b.visible===!1)return;if(b.layers.test(U.layers)){if(b.isGroup)Z=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(U);else if(b.isLight)E.pushLight(b),b.castShadow&&E.pushShadow(b);else if(b.isSprite){let Ut=U.isArrayCamera?mt:st;if(!b.frustumCulled||b.intersectsFrustum(Ut)){H&&zt.setFromMatrixPosition(b.matrixWorld).applyMatrix4(At);let xt=lt.update(b),Tt=b.material;Tt.visible&&R.push(b,xt,Tt,Z,zt.z,null,U)}}else if(b.isMesh||b.isLine||b.isPoints){let Ut=U.isArrayCamera?mt:st;if(!b.frustumCulled||b.intersectsFrustum(Ut)){let xt=lt.update(b),Tt=b.material;if(H&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),zt.copy(b.boundingSphere.center)):(xt.boundingSphere===null&&xt.computeBoundingSphere(),zt.copy(xt.boundingSphere.center)),zt.applyMatrix4(b.matrixWorld).applyMatrix4(At)),Array.isArray(Tt)){let Ft=xt.groups;for(let Jt=0,ge=Ft.length;Jt<ge;Jt++){let Ot=Ft[Jt],ae=Tt[Ot.materialIndex];ae&&ae.visible&&R.push(b,xt,ae,Z,zt.z,Ot,U)}}else Tt.visible&&R.push(b,xt,Tt,Z,zt.z,null,U)}}}let _t=b.children;for(let Ut=0,xt=_t.length;Ut<xt;Ut++)Pr(_t[Ut],U,Z,H)}function Ds(b,U,Z,H){let{opaque:W,transmissive:_t,transparent:Ut}=b;E.setupLightsView(Z),vt===!0&&et.setGlobalState(A.clippingPlanes,Z),H&&wt.viewport(rt.copy(H)),W.length>0&&ii(W,U,Z),_t.length>0&&ii(_t,U,Z),Ut.length>0&&ii(Ut,U,Z),wt.buffers.depth.setTest(!0),wt.buffers.depth.setMask(!0),wt.buffers.color.setMask(!0),wt.setPolygonOffset(!1)}function wi(b,U,Z,H){if((Z.isScene===!0?Z.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[H.id]===void 0){let Ot=ce.has("EXT_color_buffer_half_float")||ce.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[H.id]=new Ln(1,1,{generateMipmaps:!0,type:Ot?ti:En,minFilter:Hi,samples:Math.max(4,Ae.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ye.workingColorSpace})}let _t=E.state.transmissionRenderTarget[H.id],Ut=H.viewport||rt;_t.setSize(Ut.z*A.transmissionResolutionScale,Ut.w*A.transmissionResolutionScale);let xt=A.getRenderTarget(),Tt=A.getActiveCubeFace(),Ft=A.getActiveMipmapLevel();A.setRenderTarget(_t),A.getClearColor($),j=A.getClearAlpha(),j<1&&A.setClearColor(16777215,.5),A.clear(),Kt&&L.render(Z);let Jt=A.toneMapping;A.toneMapping=_i;let ge=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),E.setupLightsView(H),vt===!0&&et.setGlobalState(A.clippingPlanes,H),ii(b,Z,H),te.updateMultisampleRenderTarget(_t),te.updateRenderTargetMipmap(_t),ce.has("WEBGL_multisampled_render_to_texture")===!1){let Ot=!1;for(let ae=0,Ie=U.length;ae<Ie;ae++){let we=U[ae],{object:_e,geometry:$e,material:Lt,group:qe}=we;if(Lt.side===wn&&_e.layers.test(H.layers)){let he=Lt.side;Lt.side=hn,Lt.needsUpdate=!0,Ir(_e,Z,H,$e,Lt,qe),Lt.side=he,Lt.needsUpdate=!0,Ot=!0}}Ot===!0&&(te.updateMultisampleRenderTarget(_t),te.updateRenderTargetMipmap(_t))}A.setRenderTarget(xt,Tt,Ft),A.setClearColor($,j),ge!==void 0&&(H.viewport=ge),A.toneMapping=Jt}function ii(b,U,Z){let H=U.isScene===!0?U.overrideMaterial:null;for(let W=0,_t=b.length;W<_t;W++){let Ut=b[W],{object:xt,geometry:Tt,group:Ft}=Ut,Jt=Ut.material;Jt.allowOverride===!0&&H!==null&&(Jt=H),xt.layers.test(Z.layers)&&Ir(xt,U,Z,Tt,Jt,Ft)}}function Ir(b,U,Z,H,W,_t){z!==null&&W.isNodeMaterial&&z.setObject(b,W),b.onBeforeRender(A,U,Z,H,W,_t),b.modelViewMatrix.multiplyMatrices(Z.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),W.onBeforeRender(A,U,Z,H,b,_t),W.transparent===!0&&W.side===wn&&W.forceSinglePass===!1?(W.side=hn,W.needsUpdate=!0,A.renderBufferDirect(Z,U,H,W,b,_t),W.side=rs,W.needsUpdate=!0,A.renderBufferDirect(Z,U,H,W,b,_t),W.side=wn):A.renderBufferDirect(Z,U,H,W,b,_t),b.onAfterRender(A,U,Z,H,W,_t)}function Lr(b){let U=0;for(let Z of b)Z.texture!==null&&U++;return U}function On(b,U,Z){U.isScene!==!0&&(U=fe);let H=Wt.get(b),W=E.state.lights,_t=E.state.shadowsArray,Ut=W.state.version,xt=Q.getParameters(b,W.state,_t,U,Z,E.state.lightProbeGridArray),Tt=Q.getProgramCacheKey(xt),Ft=H.programs;H.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?U.environment:null,H.fog=U.fog;let Jt=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;H.envMap=C.get(b.envMap||H.environment,Jt),H.envMapRotation=H.environment!==null&&b.envMap===null?U.environmentRotation:b.envMapRotation,Ft===void 0&&(b.addEventListener("dispose",be),Ft=new Map,H.programs=Ft,H.programVariants=new Map);let ge=Ft.get(Tt);if(ge!==void 0){if(H.currentProgram===ge&&H.lightsStateVersion===Ut)return Wn(b,xt),ge}else xt.uniforms=Q.getUniforms(b),z!==null&&b.isNodeMaterial&&z.build(b,Z,xt),b.onBeforeCompile(xt,A),ge=Q.acquireProgram(xt,Tt),Ft.set(Tt,ge),H.uniforms=xt.uniforms;let Ot=H.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Ot.clippingPlanes=et.uniform),Wn(b,xt),H.needsLights=Us(b),H.lightsStateVersion=Ut,H.needsLights&&(Ot.ambientLightColor.value=W.state.ambient,Ot.lightProbe.value=W.state.probe,Ot.sunLights.value=W.state.sun,Ot.sunLightShadows.value=W.state.sunShadow,Ot.directionalLights.value=W.state.directional,Ot.directionalLightShadows.value=W.state.directionalShadow,Ot.spotLights.value=W.state.spot,Ot.spotLightShadows.value=W.state.spotShadow,Ot.rectAreaLights.value=W.state.rectArea,Ot.ltc_1.value=W.state.rectAreaLTC1,Ot.ltc_2.value=W.state.rectAreaLTC2,Ot.pointLights.value=W.state.point,Ot.pointLightShadows.value=W.state.pointShadow,Ot.hemisphereLights.value=W.state.hemi,Ot.sunShadowMatrix.value=W.state.sunShadowMatrix,Ot.sunShadowCascade.value=W.state.sunShadowCascade,Ot.directionalShadowMatrix.value=W.state.directionalShadowMatrix,Ot.spotLightMatrix.value=W.state.spotLightMatrix,Ot.spotLightMap.value=W.state.spotLightMap,Ot.pointShadowMatrix.value=W.state.pointShadowMatrix),H.numLightProbeGrids=Lr(E.state.lightProbeGridArray),H.currentProgram=ge,H.uniformsList=null,ge}function Ti(b,U,Z,H,W){let _t=Wt.get(b),Ut=_t.currentProgram.id+","+H+","+W,xt=_t.programVariants.get(Ut);return xt===void 0?(xt=On(b,U,Z),_t.programVariants.set(Ut,xt)):(_t.currentProgram=xt,_t.uniformsList=null,_t.outputColorSpace=H,_t.toneMapping=W),xt}function io(b){if(b.uniformsList===null){let U=b.currentProgram.getUniforms();b.uniformsList=xr.seqWithValue(U.seq,b.uniforms)}return b.uniformsList}function Wn(b,U){let Z=Wt.get(b);Z.outputColorSpace=U.outputColorSpace,Z.batching=U.batching,Z.batchingColor=U.batchingColor,Z.instancing=U.instancing,Z.instancingColor=U.instancingColor,Z.instancingMorph=U.instancingMorph,Z.skinning=U.skinning,Z.morphTargets=U.morphTargets,Z.morphNormals=U.morphNormals,Z.morphColors=U.morphColors,Z.morphTargetsCount=U.morphTargetsCount,Z.numClippingPlanes=U.numClippingPlanes,Z.numIntersection=U.numClipIntersection,Z.vertexAlphas=U.vertexAlphas,Z.vertexTangents=U.vertexTangents,Z.toneMapping=U.toneMapping}function Xn(b,U,Z,H,W){U.isScene!==!0&&(U=fe),te.resetTextureUnits();let _t=U.fog,Ut=H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial?U.environment:null,xt=at===null?A.outputColorSpace:at.isXRRenderTarget===!0?at.texture.colorSpace:ye.workingColorSpace,Tt=H.isMeshStandardMaterial||H.isMeshLambertMaterial&&!H.envMap||H.isMeshPhongMaterial&&!H.envMap,Ft=C.get(H.envMap||Ut,Tt),Jt=H.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,ge=!!Z.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Ot=!!Z.morphAttributes.position,ae=!!Z.morphAttributes.normal,Ie=!!Z.morphAttributes.color,we=_i;H.toneMapped&&(at===null||at.isXRRenderTarget===!0)&&(we=A.toneMapping);let _e=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,$e=_e!==void 0?_e.length:0,Lt=Wt.get(H),qe=E.state.lights;if(vt===!0&&(It===!0||b!==it)){let Ue=b===it&&H.id===J;et.setState(H,b,Ue)}let he=!1,Ai=!1;H.version===Lt.__version?Lt.needsLights&&Lt.lightsStateVersion!==qe.state.version||W.isBatchedMesh&&Lt.batching===!1||!W.isBatchedMesh&&Lt.batching===!0||W.isBatchedMesh&&Lt.batchingColor===!0&&W._colorsTexture===null||W.isBatchedMesh&&Lt.batchingColor===!1&&W._colorsTexture!==null||W.isInstancedMesh&&Lt.instancing===!1||!W.isInstancedMesh&&Lt.instancing===!0||W.isSkinnedMesh&&Lt.skinning===!1||!W.isSkinnedMesh&&Lt.skinning===!0||W.isInstancedMesh&&Lt.instancingColor===!0&&W.instanceColor===null||W.isInstancedMesh&&Lt.instancingColor===!1&&W.instanceColor!==null||W.isInstancedMesh&&Lt.instancingMorph===!0&&W.morphTexture===null||W.isInstancedMesh&&Lt.instancingMorph===!1&&W.morphTexture!==null||Lt.envMap!==Ft||H.fog===!0&&Lt.fog!==_t||Lt.numClippingPlanes!==void 0&&(Lt.numClippingPlanes!==et.numPlanes||Lt.numIntersection!==et.numIntersection)||Lt.vertexAlphas!==Jt||Lt.vertexTangents!==ge||Lt.morphTargets!==Ot||Lt.morphNormals!==ae||Lt.morphColors!==Ie||Lt.morphTargetsCount!==$e||Lt.numLightProbeGrids!==Lr(E.state.lightProbeGridArray)?he=!0:(Lt.outputColorSpace!==xt||Lt.toneMapping!==we)&&(Ai=!0):(he=!0,Lt.__version=H.version);let De=Lt.currentProgram;(he===!0||Ai===!0)&&(De=Ai===!0?Ti(H,U,W,xt,we):On(H,U,W),z&&H.isNodeMaterial&&z.onUpdateProgram(H,De,Lt));let qn=!1,si=!1,dn=!1,ve=De.getUniforms(),Fe=Lt.uniforms;if(wt.useProgram(De.program)&&(qn=!0,si=!0,dn=!0),H.id!==J&&(J=H.id,si=!0),qn||it!==b){wt.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),ve.setValue(O,"projectionMatrix",b.projectionMatrix),ve.setValue(O,"viewMatrix",b.matrixWorldInverse);let Je=ve.map.cameraPosition;Je!==void 0&&Je.setValue(O,jt.setFromMatrixPosition(b.matrixWorld)),Ae.logarithmicDepthBuffer&&ve.setValue(O,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&ve.setValue(O,"isOrthographic",b.isOrthographicCamera===!0),it!==b&&(it=b,si=!0,dn=!0)}if(Lt.needsLights&&(qe.state.sunShadowMap.length>0&&ve.setValue(O,"sunShadowMap",qe.state.sunShadowMap,te),qe.state.directionalShadowMap.length>0&&ve.setValue(O,"directionalShadowMap",qe.state.directionalShadowMap,te),qe.state.spotShadowMap.length>0&&ve.setValue(O,"spotShadowMap",qe.state.spotShadowMap,te),qe.state.pointShadowMap.length>0&&ve.setValue(O,"pointShadowMap",qe.state.pointShadowMap,te)),W.isSkinnedMesh){ve.setOptional(O,W,"bindMatrix"),ve.setOptional(O,W,"bindMatrixInverse");let Ue=W.skeleton;Ue&&(Ue.boneTexture===null&&Ue.computeBoneTexture(),ve.setValue(O,"boneTexture",Ue.boneTexture,te))}W.isBatchedMesh&&(ve.setOptional(O,W,"batchingTexture"),ve.setValue(O,"batchingTexture",W._matricesTexture,te),ve.setOptional(O,W,"batchingIdTexture"),ve.setValue(O,"batchingIdTexture",W._indirectTexture,te),ve.setOptional(O,W,"batchingColorTexture"),W._colorsTexture!==null&&ve.setValue(O,"batchingColorTexture",W._colorsTexture,te));let An=Z.morphAttributes;if((An.position!==void 0||An.normal!==void 0||An.color!==void 0)&&nt.update(W,Z,De),(si||Lt.receiveShadow!==W.receiveShadow)&&(Lt.receiveShadow=W.receiveShadow,ve.setValue(O,"receiveShadow",W.receiveShadow)),(H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial)&&H.envMap===null&&U.environment!==null&&(Fe.envMapIntensity.value=U.environmentIntensity),Fe.dfgLUT!==void 0&&(Fe.dfgLUT.value=sy()),si){if(ve.setValue(O,"toneMappingExposure",A.toneMappingExposure),Lt.needsLights&&Se(Fe,dn),_t&&H.fog===!0&&Mt.refreshFogUniforms(Fe,_t),Mt.refreshMaterialUniforms(Fe,H,Ct,Vt,E.state.transmissionRenderTarget[b.id]),Lt.needsLights&&Lt.numLightProbeGrids>0){let Ue=x,Je=0;for(let Yn of E.state.lightProbeGridArray)Yn.texture!==null&&(Ue.textures[Je]=Yn.texture,Ue.min[Je]=Yn.boundingBox.min,Ue.max[Je]=Yn.boundingBox.max,Ue.resolution[Je]=Yn.resolution,Je++);for(let Yn in Ue)Ue[Yn].length=Je;Fe.probesSH.value=Ue.textures,Fe.probesMin.value=Ue.min,Fe.probesMax.value=Ue.max,Fe.probesResolution.value=Ue.resolution}xr.upload(O,io(Lt),Fe,te)}if(H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(xr.upload(O,io(Lt),Fe,te),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&ve.setValue(O,"center",W.center),ve.setValue(O,"modelViewMatrix",W.modelViewMatrix),ve.setValue(O,"normalMatrix",W.normalMatrix),ve.setValue(O,"modelMatrix",W.matrixWorld),H.uniformsGroups!==void 0){let Ue=H.uniformsGroups;for(let Je=0,Yn=Ue.length;Je<Yn;Je++){let ri=Ue[Je];Gt.update(ri,De),Gt.bind(ri,De)}}return De}function Se(b,U){b.ambientLightColor.needsUpdate=U,b.lightProbe.needsUpdate=U,b.sunLights.needsUpdate=U,b.sunLightShadows.needsUpdate=U,b.directionalLights.needsUpdate=U,b.directionalLightShadows.needsUpdate=U,b.pointLights.needsUpdate=U,b.pointLightShadows.needsUpdate=U,b.spotLights.needsUpdate=U,b.spotLightShadows.needsUpdate=U,b.rectAreaLights.needsUpdate=U,b.hemisphereLights.needsUpdate=U}function Us(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return q},this.getActiveMipmapLevel=function(){return V},this.getRenderTarget=function(){return at},this.setRenderTargetTextures=function(b,U,Z){let H=Wt.get(b);H.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),Wt.get(b.texture).__webglTexture=U,Wt.get(b.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:Z,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,U){let Z=Wt.get(b);Z.__webglFramebuffer=U,Z.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(b,U=0,Z=0){at=b,q=U,V=Z;let H=null,W=!1,_t=!1;if(b){let xt=Wt.get(b);if(xt.__useDefaultFramebuffer!==void 0){wt.bindFramebuffer(O.FRAMEBUFFER,xt.__webglFramebuffer),rt.copy(b.viewport),Dt.copy(b.scissor),Pt=b.scissorTest,wt.viewport(rt),wt.scissor(Dt),wt.setScissorTest(Pt),J=-1;return}else if(xt.__webglFramebuffer===void 0)te.setupRenderTarget(b);else if(xt.__hasExternalTextures)te.rebindTextures(b,Wt.get(b.texture).__webglTexture,Wt.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let Jt=b.depthTexture;if(xt.__boundDepthTexture!==Jt){if(Jt!==null&&Wt.has(Jt)&&(b.width!==Jt.image.width||b.height!==Jt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");te.setupDepthRenderbuffer(b)}}let Tt=b.texture;(Tt.isData3DTexture||Tt.isDataArrayTexture||Tt.isCompressedArrayTexture)&&(_t=!0);let Ft=Wt.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Ft[U])?H=Ft[U][Z]:H=Ft[U],W=!0):b.samples>0&&te.useMultisampledRTT(b)===!1?H=Wt.get(b).__webglMultisampledFramebuffer:Array.isArray(Ft)?H=Ft[Z]:H=Ft,rt.copy(b.viewport),Dt.copy(b.scissor),Pt=b.scissorTest}else rt.copy(Yt).multiplyScalar(Ct).floor(),Dt.copy(re).multiplyScalar(Ct).floor(),Pt=de;if(Z!==0&&(H=Y),wt.bindFramebuffer(O.FRAMEBUFFER,H)&&wt.drawBuffers(b,H),wt.viewport(rt),wt.scissor(Dt),wt.setScissorTest(Pt),W){let xt=Wt.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+U,xt.__webglTexture,Z)}else if(_t){let xt=U;for(let Tt=0;Tt<b.textures.length;Tt++){let Ft=Wt.get(b.textures[Tt]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Tt,Ft.__webglTexture,Z,xt)}}else if(b!==null&&Z!==0){let xt=Wt.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,xt.__webglTexture,Z)}J=-1};function us(b){let U=Wt.get(b);return(U.__readFormat!==b.format||U.__readType!==b.type)&&(U.__readFormat=b.format,U.__readType=b.type,U.__formatReadable=Ae.textureFormatReadable(b.format),U.__typeReadable=Ae.textureTypeReadable(b.type)),U}this.readRenderTargetPixels=function(b,U,Z,H,W,_t,Ut,xt=0){if(!(b&&b.isWebGLRenderTarget)){ee("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Tt=Wt.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Ut!==void 0&&(Tt=Tt[Ut],Array.isArray(Tt)&&(Tt=Tt[0])),Tt){wt.bindFramebuffer(O.FRAMEBUFFER,Tt);try{let Ft=b.textures[xt],Jt=Ft.format,ge=Ft.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+xt);let Ot=us(Ft);if(Ot.__formatReadable===!1){ee("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Ot.__typeReadable===!1){ee("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=b.width-H&&Z>=0&&Z<=b.height-W&&O.readPixels(U,Z,H,W,ut.convert(Jt),ut.convert(ge),_t)}finally{let Ft=at!==null?Wt.get(at).__webglFramebuffer:null;wt.bindFramebuffer(O.FRAMEBUFFER,Ft)}}},this.readRenderTargetPixelsAsync=async function(b,U,Z,H,W,_t,Ut,xt=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Tt=Wt.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Ut!==void 0&&(Tt=Tt[Ut],Array.isArray(Tt)&&(Tt=Tt[0])),Tt)if(U>=0&&U<=b.width-H&&Z>=0&&Z<=b.height-W){wt.bindFramebuffer(O.FRAMEBUFFER,Tt);let Ft=b.textures[xt],Jt=Ft.format,ge=Ft.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+xt);let Ot=us(Ft);if(Ot.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Ot.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ae=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ae),O.bufferData(O.PIXEL_PACK_BUFFER,_t.byteLength,O.STREAM_READ),O.readPixels(U,Z,H,W,ut.convert(Jt),ut.convert(ge),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);let Ie=at!==null?Wt.get(at).__webglFramebuffer:null;wt.bindFramebuffer(O.FRAMEBUFFER,Ie);let we=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Ed(O,we,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ae),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,_t),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(ae),O.deleteSync(we),_t}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,U=null,Z=0){let H=Math.pow(2,-Z),W=Math.floor(b.image.width*H),_t=Math.floor(b.image.height*H),Ut=U!==null?U.x:0,xt=U!==null?U.y:0;te.setTexture2D(b,0),O.copyTexSubImage2D(O.TEXTURE_2D,Z,0,0,Ut,xt,W,_t),wt.unbindTexture()},this.copyTextureToTexture=function(b,U,Z=null,H=null,W=0,_t=0){let Ut,xt,Tt,Ft,Jt,ge,Ot,ae,Ie,we=b.isCompressedTexture?b.mipmaps[_t]:b.image;if(Z!==null)Ut=Z.max.x-Z.min.x,xt=Z.max.y-Z.min.y,Tt=Z.isBox3?Z.max.z-Z.min.z:1,Ft=Z.min.x,Jt=Z.min.y,ge=Z.isBox3?Z.min.z:0;else{let ve=Math.pow(2,-W);Ut=Math.floor(we.width*ve),xt=Math.floor(we.height*ve),b.isDataArrayTexture?Tt=we.depth:b.isData3DTexture?Tt=Math.floor(we.depth*ve):Tt=1,Ft=0,Jt=0,ge=0}H!==null?(Ot=H.x,ae=H.y,Ie=H.z):(Ot=0,ae=0,Ie=0);let _e=ut.convert(U.format),$e=ut.convert(U.type),Lt;U.isData3DTexture?(te.setTexture3D(U,0),Lt=O.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(te.setTexture2DArray(U,0),Lt=O.TEXTURE_2D_ARRAY):(te.setTexture2D(U,0),Lt=O.TEXTURE_2D),wt.activeTexture(O.TEXTURE0),wt.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,U.flipY),wt.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),wt.pixelStorei(O.UNPACK_ALIGNMENT,U.unpackAlignment);let qe=wt.getParameter(O.UNPACK_ROW_LENGTH),he=wt.getParameter(O.UNPACK_IMAGE_HEIGHT),Ai=wt.getParameter(O.UNPACK_SKIP_PIXELS),De=wt.getParameter(O.UNPACK_SKIP_ROWS),qn=wt.getParameter(O.UNPACK_SKIP_IMAGES);wt.pixelStorei(O.UNPACK_ROW_LENGTH,we.width),wt.pixelStorei(O.UNPACK_IMAGE_HEIGHT,we.height),wt.pixelStorei(O.UNPACK_SKIP_PIXELS,Ft),wt.pixelStorei(O.UNPACK_SKIP_ROWS,Jt),wt.pixelStorei(O.UNPACK_SKIP_IMAGES,ge);let si=b.isDataArrayTexture||b.isData3DTexture,dn=U.isDataArrayTexture||U.isData3DTexture;if(b.isDepthTexture){let ve=Wt.get(b),Fe=Wt.get(U),An=Wt.get(ve.__renderTarget),Ue=Wt.get(Fe.__renderTarget);wt.bindFramebuffer(O.READ_FRAMEBUFFER,An.__webglFramebuffer),wt.bindFramebuffer(O.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer);for(let Je=0;Je<Tt;Je++)si&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Wt.get(b).__webglTexture,W,ge+Je),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Wt.get(U).__webglTexture,_t,Ie+Je)),O.blitFramebuffer(Ft,Jt,Ft+Ut,Jt+xt,Ot,ae,Ot+Ut,ae+xt,O.DEPTH_BUFFER_BIT,O.NEAREST);wt.bindFramebuffer(O.READ_FRAMEBUFFER,null),wt.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(W!==0||b.isRenderTargetTexture||Wt.has(b)){let ve=Wt.get(b),Fe=Wt.get(U);wt.bindFramebuffer(O.READ_FRAMEBUFFER,I),wt.bindFramebuffer(O.DRAW_FRAMEBUFFER,k);for(let An=0;An<Tt;An++)si?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,ve.__webglTexture,W,ge+An):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,ve.__webglTexture,W),dn?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Fe.__webglTexture,_t,Ie+An):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Fe.__webglTexture,_t),W!==0?O.blitFramebuffer(Ft,Jt,Ft+Ut,Jt+xt,Ot,ae,Ot+Ut,ae+xt,O.COLOR_BUFFER_BIT,O.NEAREST):dn?O.copyTexSubImage3D(Lt,_t,Ot,ae,Ie+An,Ft,Jt,Ut,xt):O.copyTexSubImage2D(Lt,_t,Ot,ae,Ft,Jt,Ut,xt);wt.bindFramebuffer(O.READ_FRAMEBUFFER,null),wt.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else dn?b.isDataTexture||b.isData3DTexture?O.texSubImage3D(Lt,_t,Ot,ae,Ie,Ut,xt,Tt,_e,$e,we.data):U.isCompressedArrayTexture?O.compressedTexSubImage3D(Lt,_t,Ot,ae,Ie,Ut,xt,Tt,_e,we.data):O.texSubImage3D(Lt,_t,Ot,ae,Ie,Ut,xt,Tt,_e,$e,we):b.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,_t,Ot,ae,Ut,xt,_e,$e,we.data):b.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,_t,Ot,ae,we.width,we.height,_e,we.data):O.texSubImage2D(O.TEXTURE_2D,_t,Ot,ae,Ut,xt,_e,$e,we);wt.pixelStorei(O.UNPACK_ROW_LENGTH,qe),wt.pixelStorei(O.UNPACK_IMAGE_HEIGHT,he),wt.pixelStorei(O.UNPACK_SKIP_PIXELS,Ai),wt.pixelStorei(O.UNPACK_SKIP_ROWS,De),wt.pixelStorei(O.UNPACK_SKIP_IMAGES,qn),_t===0&&U.generateMipmaps===!0&&U.mipmapsAutoUpdate===!0&&O.generateMipmap(Lt),wt.unbindTexture()},this.initRenderTarget=function(b){Wt.get(b).__webglFramebuffer===void 0&&te.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?te.setTextureCube(b,0):b.isData3DTexture?te.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?te.setTexture2DArray(b,0):te.setTexture2D(b,0),wt.unbindTexture()},this.resetState=function(){q=0,V=0,at=null,wt.reset(),St.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return kn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=ye._getDrawingBufferColorSpace(t),e.unpackColorSpace=ye._getUnpackColorSpace()}};var pc=class extends xs{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let t=new fi;t.deleteAttribute("uv");let e=new gi({side:hn}),n=new gi,s=new Da(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);let r=new ke(t,e);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let a=new ki(t,n,6),o=new We;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);let l=new ke(t,Mr(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new ke(t,Mr(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let h=new ke(t,Mr(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);let f=new ke(t,Mr(43));f.position.set(-.462,8.89,14.52),f.scale.set(4.38,5.441,.088),this.add(f);let u=new ke(t,Mr(20));u.position.set(3.235,11.486,-12.541),u.scale.set(2.5,2,.1),this.add(u);let d=new ke(t,Mr(100));d.position.set(0,20,0),d.scale.set(1,.1,1),this.add(d)}dispose(){let t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(let e of t)e.dispose()}};function Mr(i){return new Ra({color:0,emissive:16777215,emissiveIntensity:i})}function xf(i,t=!1){let e=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),s=new Set(Object.keys(i[0].morphAttributes)),r={},a={},o=i[0].morphTargetsRelative,l=new Be;l.morphTargetsRelative=o;let c=0;for(let h=0;h<i.length;++h){let f=i[h],u=0,d=0;if(e!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let g in f.attributes){if(!n.has(g))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+g+'" attribute exists among all geometries, or in none of them.'),null;r[g]===void 0&&(r[g]=[]),r[g].push(f.attributes[g]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(o!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let g in f.morphAttributes){if(!s.has(g))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;if(f.morphAttributes[g].length!==i[0].morphAttributes[g].length)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have the same number of morph targets for the "'+g+'" morph attribute.'),null;a[g]===void 0&&(a[g]=[]),a[g].push(f.morphAttributes[g]),d++}if(d!==s.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of morph attributes."),null;if(t){let g;if(e)g=f.index.count;else if(f.attributes.position!==void 0)g=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,g,h),c+=g}}if(e){let h=0,f=[];for(let u=0;u<i.length;++u){let d=i[u].index;for(let g=0;g<d.count;++g)f.push(d.getX(g)+h);h+=i[u].attributes.position.count}l.setIndex(f)}for(let h in r){let f=_f(r[h]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,f)}for(let h in a){let f=a[h][0].length;if(f!==0){l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<f;++u){let d=[];for(let v=0;v<a[h].length;++v)d.push(a[h][v][u]);let g=_f(d);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(g)}}}return l}function _f(i){let t,e,n,s=-1,r=0;for(let c=0;c<i.length;++c){let h=i[c];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1&&(s=h.gpuType),s!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*e}let a=new t(r),o=new In(a,e,n),l=0;for(let c=0;c<i.length;++c){let h=i[c];if(h.isInterleavedBufferAttribute){let f=l/e;for(let u=0,d=h.count;u<d;u++)for(let g=0;g<e;g++){let v=h.getComponent(u,g);o.setComponent(u+f,g,v)}}else a.set(h.array,l);l+=h.count*e}return s!==void 0&&(o.gpuType=s),o}var yf={overview:[1.4,1.2,.4,32,.32,.42],flow:[1,1.5,.8,29,.22,.3],sec_ingest:[-4.4,1.9,1,17,-.1,.25],sec_server:[0,1.5,.3,10.5,.42,.2],sec_egress:[4.6,1.4,1.5,17,.2,.28],sec_plan:[.2,1.6,2,25,.04,.4],inst_rack:[0,1.25,0,7.6,.55,.17],inst_layers:[.2,2,1.2,10,.62,.12],inst_os:[-.4,1.5,1.6,9.5,-.12,.2],net_lan:[3.8,.3,.3,25,0,.82],net_nat:[13.5,1.5,.6,15,.5,.3],net_https:[9.2,1.4,1,29,.12,.38],net_udp:[9.2,1.4,1,29,-.1,.34],net_dns:[14.2,2.2,.4,13,.25,.2],pult_create:[2.4,1.3,-2.6,13,.72,.3],pult_key:[-1.2,2,-1,21,.18,.46],pult_check:[-3.4,1.7,.8,15,-.2,.25],pult_live:[-.6,1.8,.8,28,-.04,.3],acc_login:[3.8,1.4,.8,15,.3,.28],acc_approve:[4,1.3,-1.4,18,.45,.42],acc_session:[7.4,1.3,1.6,7.6,.38,.22],acc_rights:[6.6,1.8,1.4,9.5,.1,.24],acc_admin:[3.4,1.3,-4.2,8.5,-.15,.2],link_invite:[7.6,1.5,2,8.5,.15,.2],link_request:[4,1.3,-1.2,19,.4,.45],link_approve:[5.4,1.2,-1.2,18,.25,.55],link_copy:[4.6,1.3,2.6,15,.05,.42],content_types:[2.7,2.4,1.6,8.6,.28,.12],content_group:[3.4,2.1,1.5,9.6,-.18,.18],rev_play:[4.2,1.4,.8,16,.25,.28],rev_admin:[4.2,1.4,-1.6,17,.5,.4],rev_cut:[4.2,1.3,.8,15,.1,.26],rev_reject:[3.8,1.4,.9,13,-.1,.22],bak_file:[-.8,1.3,-1.6,10,.2,.3],bak_new:[-2.4,1.4,-3.8,17,.9,.33],bak_verify:[-2.4,1.4,-3.8,17,.7,.33],diag_udp:[3.9,1.4,.9,13,.3,.3],diag_port:[1.1,1.1,.1,6.5,1,.2],diag_cert:[5.8,1.5,1.1,8,.25,.22],diag_offline:[-6.8,2,1.6,10,-.2,.24],diag_limit:[7.4,1.15,1.5,5.5,-.4,.16],final:[2.2,1.2,.4,34,.3,.46],final_go:[1.6,1.3,.6,31,.18,.36]},mc=["flow","ingest","vpn","trust","clear","tlsKey","egress","egressLock","planned","dim","explode","osPick","lan","nat","globe","phoneOut","https","udp","turn","domain","source","key","keyTravel","scan","live","login","guestTravel","approve","session","rights","invite","request","waiting","code","browserB","blockB","tiles","group","revoke","cut","reject","bakMake","bakTravel","n2","restore","standby","verified","dUdp","dPort","dCert","dOffline","dLimit","checks","ok"];var Yh=Math.PI*2,ni=i=>i<0?0:i>1?1:i,ls=(i,t,e)=>i+(t-i)*e,cs=i=>i*i*(3-2*i),gc={};mc.forEach((i,t)=>{gc[i]=t});var kt={cyan:2282478,blue:3900150,sky:6333946,amber:16096779,red:15680580,green:3462041,violet:10980346,white:14411767};function ry(i){let t=mc.length,e=[];return i.forEach((n,s)=>{let r=new Float32Array(t),a=new Float32Array(t);for(let l in n.set)r[gc[l]]=n.set[l][0],a[gc[l]]=n.set[l][1];let o=yf[n.cam];e.push({t:s+.2,v:r,cam:o,drift:0},{t:s+.8,v:a,cam:o,drift:1})}),e}function Zh(i,t){let e=t.quality==="light",n=T=>Math.max(6,Math.round(e?T*.55:T)),s=new uc({canvas:i,antialias:!e,alpha:!0,powerPreference:"high-performance",failIfMajorPerformanceCaveat:!!t.strict});s.setClearColor(0,0),s.toneMapping=Fa,s.toneMappingExposure=1,s.shadowMap.enabled=!e,s.shadowMap.type=Ts;let r=new xs;r.fog=new sa(396573,38,95);let a=new yr(s),o=new pc,l=a.fromScene(o,.04);o.dispose(),r.environment=l.texture,r.environmentIntensity=.45;let c=new mn(30,1,.1,220),h=ry(t.holds),f=[];r.add(new Ia(10273535,396054,.55));let u=new ws(15003135,1.55);u.position.set(7,15,11),u.target.position.set(2,0,0),e||(u.castShadow=!0,u.shadow.mapSize.set(2048,2048),Object.assign(u.shadow.camera,{left:-15,right:21,top:13,bottom:-12,near:2,far:50}),u.shadow.bias=-5e-4,u.shadow.normalBias=.02),r.add(u,u.target);let d=new ws(3900150,1.3);d.position.set(-10,7,-13),r.add(d);let g=new ws(2282478,.35);g.position.set(14,3,9),r.add(g);let v=(T,N,D)=>new gi({color:T,metalness:N,roughness:D}),m=(T,N,D,X)=>new Vi({color:T,metalness:N,roughness:D,clearcoat:X,clearcoatRoughness:.2}),p=(T,N)=>new gi({color:198414,emissive:T,emissiveIntensity:N===void 0?1.6:N,roughness:.5,metalness:0}),S=T=>new di({color:T,transparent:!0,opacity:0,blending:as,depthWrite:!1}),y={frame:v(2504015,.85,.3),panel:v(857640,.55,.55),unit:v(1384762,.7,.38),face:v(1978188,.8,.28),vent:v(330260,.3,.85),metal:v(10794703,.92,.24),shell:m(14016492,0,.3,.85),graphite:m(1779257,.45,.34,.6),rubber:v(593432,0,.9),plinth:v(989483,.75,.32),glass:new Vi({color:10275071,metalness:0,roughness:.06,transparent:!0,opacity:.16,depthWrite:!1,side:wn,envMapIntensity:1.3}),cyan:p(kt.cyan,1.4),blue:p(kt.blue,1.5),green:p(kt.green,1.5),red:p(kt.red,1.7),amber:p(kt.amber,1.6),violet:p(kt.violet,1.4)},x=(T,N,D)=>new fi(T,N,D),R=(T,N,D,X)=>new es(T,N,D,n(X||24)),E=(T,N,D)=>new bs(T,N,8,n(D||48)),_=(T,N)=>new Ea(T,n(N||20),n(Math.round((N||20)*.6))),w=T=>xf(T,!1),B=T=>(e||(T.castShadow=!0,T.receiveShadow=!0),T),A=(T,N,D,X,ot,ft)=>{let Bt=new ke(T,N);return Bt.position.set(X||0,ot||0,ft||0),D.add(Bt),Bt},P=(T,N,D,X,ot,ft)=>B(A(T,N,D,X,ot,ft)),z=(T,N,D)=>{let X=new pi,ot=-T/2,ft=-N/2;return X.moveTo(ot+D,ft),X.lineTo(ot+T-D,ft),X.quadraticCurveTo(ot+T,ft,ot+T,ft+D),X.lineTo(ot+T,ft+N-D),X.quadraticCurveTo(ot+T,ft+N,ot+T-D,ft+N),X.lineTo(ot+D,ft+N),X.quadraticCurveTo(ot,ft+N,ot,ft+N-D),X.lineTo(ot,ft+D),X.quadraticCurveTo(ot,ft,ot+D,ft),X},Y=(T,N,D,X)=>{let ot=new ba(z(T,N,X),{depth:D,bevelEnabled:!0,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:e?3:6});return ot.translate(0,0,-D/2),ot},I={},k=(T,N,D,X,ot)=>{let ft=new We;return ft.position.set(D,X,ot),N.add(ft),I[T]=ft,ft},q=(T,N,D)=>new F(T,N,D),V=T=>new or(T.map(N=>q(N[0],N[1],N[2])),!1,"centripetal");function at(T,N,D){let X=document.createElement("canvas");X.width=T,X.height=N;let ot=X.getContext("2d");D(ot,T,N);let ft=new ha(X);return ft.colorSpace=Mn,f.push(ft),ft}let J=e?192:320,it=Math.round(J*.62);function rt(T,N,D){let X=T.createLinearGradient(0,0,0,D*.62);X.addColorStop(0,"#0e2f57"),X.addColorStop(1,"#4f8fcf"),T.fillStyle=X,T.fillRect(0,0,N,D),T.fillStyle="#1d3a52",T.beginPath(),T.moveTo(0,D*.62);for(let Ke=0;Ke<=8;Ke++)T.lineTo(Ke/8*N,D*(.5+.08*Math.sin(Ke*1.7)+Ke%2*.04));T.lineTo(N,D),T.lineTo(0,D),T.fill();let ot=T.createLinearGradient(0,D*.6,0,D);ot.addColorStop(0,"#1f4a3a"),ot.addColorStop(1,"#0c1f18"),T.fillStyle=ot,T.fillRect(0,D*.66,N,D*.34),T.strokeStyle="rgba(200,220,235,.55)",T.lineWidth=Math.max(1,N/160),T.beginPath(),T.moveTo(N*.36,D),T.lineTo(N*.52,D*.66),T.stroke(),T.strokeStyle="rgba(34,211,238,.9)",T.lineWidth=Math.max(1,N/220);let ft=N/2,Bt=D/2,ue=N*.05;T.beginPath(),T.moveTo(ft-ue,Bt),T.lineTo(ft-ue*.35,Bt),T.moveTo(ft+ue*.35,Bt),T.lineTo(ft+ue,Bt),T.moveTo(ft,Bt-ue),T.lineTo(ft,Bt-ue*.35),T.moveTo(ft,Bt+ue*.35),T.lineTo(ft,Bt+ue);let Xt=N*.06;T.moveTo(Xt,Xt*1.8),T.lineTo(Xt,Xt),T.lineTo(Xt*1.8,Xt),T.moveTo(N-Xt,Xt*1.8),T.lineTo(N-Xt,Xt),T.lineTo(N-Xt*1.8,Xt),T.moveTo(Xt,D-Xt*1.8),T.lineTo(Xt,D-Xt),T.lineTo(Xt*1.8,D-Xt),T.moveTo(N-Xt,D-Xt*1.8),T.lineTo(N-Xt,D-Xt),T.lineTo(N-Xt*1.8,D-Xt),T.stroke()}function Dt(T,N,D){T.fillStyle="#071226",T.fillRect(0,0,N,D),T.strokeStyle="rgba(59,130,246,.22)",T.lineWidth=1;for(let X=0;X<N;X+=N/12)T.beginPath(),T.moveTo(X,0),T.lineTo(X,D),T.stroke();for(let X=0;X<D;X+=D/7)T.beginPath(),T.moveTo(0,X),T.lineTo(N,X),T.stroke()}let Pt={video:at(J,it,rt),idle:at(J,it,Dt),waiting:at(J,it,(T,N,D)=>{Dt(T,N,D),T.strokeStyle="#f59e0b",T.lineWidth=N/40,T.beginPath(),T.arc(N/2,D/2,D*.22,-1.2,3.6),T.stroke()}),error:at(J,it,(T,N,D)=>{T.fillStyle="#1c0609",T.fillRect(0,0,N,D),T.strokeStyle="#ef4444",T.lineWidth=N/30,T.beginPath(),T.moveTo(N*.38,D*.28),T.lineTo(N*.62,D*.72),T.moveTo(N*.62,D*.28),T.lineTo(N*.38,D*.72),T.stroke(),T.lineWidth=N/80,T.strokeRect(N*.03,D*.05,N*.94,D*.9)}),grid:at(J,it,(T,N,D)=>{T.fillStyle="#0b1220",T.fillRect(0,0,N,D);let X=N/4,ot=D/3;for(let ft=0;ft<12;ft++){let Bt=ft%4*X,ue=Math.floor(ft/4)*ot,Xt=T.createLinearGradient(0,ue,0,ue+ot);Xt.addColorStop(0,"#24507e"),Xt.addColorStop(1,"#173826"),T.fillStyle=Xt,T.fillRect(Bt+3,ue+3,X-6,ot-6)}T.strokeStyle="#f59e0b",T.lineWidth=N/70,T.strokeRect(2,2,N-4,D-4)}),admin:at(J,it,(T,N,D)=>{T.fillStyle="#07101f",T.fillRect(0,0,N,D),T.fillStyle="#0f1d36",T.fillRect(0,0,N*.2,D),T.fillStyle="#3b82f6";for(let X=0;X<6;X++)T.fillRect(N*.03,D*(.1+X*.13),N*.13,D*.05);for(let X=0;X<5;X++)T.fillStyle=X===1?"#164e63":"#0f1d36",T.fillRect(N*.25,D*(.12+X*.16),N*.7,D*.11),T.fillStyle=X===1?"#22d3ee":"#2b4a72",T.fillRect(N*.28,D*(.155+X*.16),N*(.25+.07*(X%3)),D*.04),T.fillStyle=X%2?"#34d399":"#3b82f6",T.fillRect(N*.86,D*(.145+X*.16),N*.06,D*.06)}),locked:at(J,it,(T,N,D)=>{T.fillStyle="#0a0f1c",T.fillRect(0,0,N,D),T.strokeStyle="#ef4444",T.lineWidth=N/50,T.beginPath(),T.arc(N/2,D*.42,D*.12,Math.PI,0),T.stroke(),T.fillStyle="#ef4444",T.fillRect(N/2-D*.18,D*.42,D*.36,D*.26)}),rack:at(J,it,(T,N,D)=>{T.fillStyle="#050b16",T.fillRect(0,0,N,D);for(let X=0;X<6;X++)T.fillStyle="#10213b",T.fillRect(N*.06,D*(.1+X*.14),N*.88,D*.08),T.fillStyle=X%3?"#3b82f6":"#22d3ee",T.fillRect(N*.06,D*(.1+X*.14),N*(.2+.11*(X*7%5)),D*.08)})},$=T=>new di({map:T,toneMapped:!1}),j=new oe;r.add(j);let Nt=new dr(70,35,1849958,1255235);Nt.material.transparent=!0,Nt.material.opacity=.6,Nt.position.set(2,.002,0),j.add(Nt);let Vt=new dr(70,140,924979,924979);Vt.material.transparent=!0,Vt.material.opacity=.35,Vt.position.set(2,.001,0),j.add(Vt);let Ct=at(256,256,(T,N)=>{let D=T.createRadialGradient(N/2,N/2,4,N/2,N/2,N/2);D.addColorStop(0,"rgba(46,110,220,.38)"),D.addColorStop(.5,"rgba(30,70,160,.12)"),D.addColorStop(1,"rgba(10,20,50,0)"),T.fillStyle=D,T.fillRect(0,0,N,N)}),qt=A(new gn(46,30).rotateX(-Math.PI/2),new di({map:Ct,transparent:!0,depthWrite:!1,blending:as}),j,3,.003,0);if(qt.renderOrder=-1,!e){let T=A(new gn(60,40).rotateX(-Math.PI/2),new Ca({opacity:.45}),j,2,.004,0);T.receiveShadow=!0}let Me=(T,N)=>new ys({color:T,transparent:!0,opacity:N});function Yt(T,N,D,X){let ot=[];for(let Bt=0;Bt<N;Bt++){let ue=Bt/N*Yh,Xt=(Bt+1)/N*Yh;ot.push(Math.cos(ue)*T,0,Math.sin(ue)*T,Math.cos(Xt)*T,0,Math.sin(Xt)*T)}for(let Bt=0;Bt<D;Bt++){let ue=Bt/D*Yh,Xt=Bt%6===0?.35:.15;ot.push(Math.cos(ue)*T,0,Math.sin(ue)*T,Math.cos(ue)*(T+Xt),0,Math.sin(ue)*(T+Xt))}let ft=new Be;return ft.setAttribute("position",new ne(ot,3)),new Gn(ft,X)}let re=new oe;j.add(re);let de=Yt(2.35,96,72,Me(3108824,.55));de.position.y=.01,re.add(de);let st=Yt(15.5,160,120,Me(1919887,.35));st.position.set(3,.01,0),re.add(st);function mt(T,N,D,X,ot){let ft=new oe;return ft.position.set(N,0,D),T.add(ft),P(R(X,X*1.08,ot,36),y.plinth,ft,0,ot/2,0),A(E(X*1.01,.012,64).rotateX(Math.PI/2),y.cyan,ft,0,ot-.01,0),A(R(X*1.25,X*1.3,.05,36),y.panel,ft,0,.025,0),ft.userData.top=ot,ft}function vt(T){let N=new oe;return A(E(.13,.04,32),T,N,-.26,0,0),A(w([x(.42,.055,.05).translate(.05,0,0),x(.05,.12,.05).translate(.18,-.06,0),x(.05,.09,.05).translate(.08,-.045,0)]),T,N),N}function It(T,N){let D=new oe;return A(x(.26,.2,.1),T,D,0,0,0),A(new bs(.085,.022,8,n(24),Math.PI),N,D,0,.1,0),D}function At(){let T=new oe;A(x(.5,.32,.025),y.shell,T);let N=new pi;return N.moveTo(-.25,.16),N.lineTo(.25,.16),N.lineTo(0,-.02),N.lineTo(-.25,.16),A(new Ss(N),y.cyan,T,0,0,.016),T}function jt(T){let N=new oe,D=A(new Ta(.16,0),T,N,0,.5,0);return A(E(.36,.014,48).rotateX(Math.PI/2),T,N,0,0,0),A(E(.22,.01,40).rotateX(Math.PI/2),T,N,0,.5,0),N.userData.core=D,N.scale.setScalar(.001),N}function zt(T,N){return new ke(new es(N,N,N*.45,6),T)}function fe(T){let N=new oe,D=1.5,X=2.4,ot=1.15,ft=[];for(let[Ye,tn]of[[-D/2,-ot/2],[D/2,-ot/2],[-D/2,ot/2],[D/2,ot/2]])ft.push(x(.08,X,.08).translate(Ye,X/2,tn));ft.push(x(D+.04,.08,ot+.04).translate(0,X-.04,0),x(D+.12,.1,ot+.12).translate(0,.05,0)),P(w(ft),y.frame,N),P(w([x(.02,X-.2,ot-.08).translate(-D/2,X/2,0),x(.02,X-.2,ot-.08).translate(D/2,X/2,0),x(D-.08,X-.2,.02).translate(0,X/2,-ot/2)]),y.panel,N);let Bt=A(x(D-.06,X-.22,.012),y.glass,N,0,X/2,ot/2+.035);Bt.renderOrder=4;let ue=p(kt.cyan,1.6);A(x(D*.7,.035,.02),ue,N,0,X-.17,ot/2+.05);let Xt=w([x(1.3,.28,.98),x(.03,.2,.04).translate(-.6,0,.52),x(.03,.2,.04).translate(.6,0,.52)]),Ke=w([x(1.32,.28,.02).translate(0,0,.5)]),je=w([0,1,2,3].map(Ye=>x(.035,.17,.01).translate(.12+Ye*.08,0,.513))),rn=[];for(let Ye=0;Ye<5;Ye++){let tn=new oe;P(Xt,y.unit,tn),A(Ke,y.face,tn),A(je,y.vent,tn);let Yi=p([kt.blue,kt.cyan,kt.sky,kt.cyan,kt.blue][Ye],1.2);A(x(.4,.032,.012),Yi,tn,-.36,.05,.515),tn.position.set(0,.34+Ye*.34,0),tn.userData.base=tn.position.clone(),N.add(tn),rn.push({g:tn,led:Yi})}let vn=null;return T&&(vn=A(new gn(1,.36),$(Pt.rack),N,0,2.06,ot/2+.045)),{g:N,layers:rn,statusMat:ue,screen:vn}}let Kt=fe(!0);j.add(Kt.g),k("server",Kt.g,0,2.7,0),k("rackTop",Kt.g,.55,2.45,.5),k("rackSide",Kt.g,-.75,1.2,.4),k("serverScreen",Kt.g,.3,2.06,.62),Kt.layers.forEach((T,N)=>k("L"+N,T.g,.66,.1,.5)),k("slot",Kt.layers[3].g,-.2,.08,.52);let me=new oe;me.position.set(.77,1,.05),Kt.g.add(me),A(x(.02,.46,.72),y.face,me);let O=[];for(let T=0;T<6;T++){let N=.11-Math.floor(T/3)*.2,D=-.2+T%3*.2;A(x(.025,.09,.11),y.vent,me,.012,N,D);let X=p(kt.green,1.2);A(_(.018,10),X,me,.03,N+.07,D),O.push(X)}k("portPanel",me,.05,.25,.3);let ze=new oe,ce=new oe,Ae=p(kt.sky,1),wt=p(kt.cyan,1);for(let[T,N]of[[ze,-1.05],[ce,-1.62]])T.position.set(N,.05,.3),T.scale.setScalar(.001),Kt.layers[0].g.add(T),A(Y(.46,.46,.05,.06),y.graphite,T);for(let T=0;T<4;T++)A(x(.15,.15,.02),Ae,ze,T%2?.085:-.085,T<2?.085:-.085,.045);A(w([x(.16,.035,.02).rotateZ(-.7).translate(-.06,.05,0),x(.16,.035,.02).rotateZ(.7).translate(-.06,-.05,0),x(.14,.035,.02).translate(.08,-.1,0)]),wt,ce,0,0,.045);let Ge=k("osChip",Kt.layers[0].g,-1.05,.32,.3),Wt=new Vi({color:8369407,roughness:.1,transparent:!0,opacity:0,depthWrite:!1,side:wn}),te=A(new es(2.05,2.05,3.1,n(56),1,!0),Wt,j,0,1.55,.1);te.renderOrder=5;let C=A(E(2.05,.02,96).rotateX(Math.PI/2),S(kt.amber),j,0,.03,.1);k("trust",j,-1.45,2.9,1.45);let M=A(E(1.15,.018,64).rotateX(Math.PI/2),y.cyan,j,0,1.2,0);M.scale.setScalar(.001),k("scan",j,-.9,2.3,.8);let G=vt(p(kt.sky,1.3));G.position.set(1.15,2.75,.55),j.add(G),k("tlsKey",G,.1,.1,0);let lt=It(y.graphite,y.cyan);lt.position.set(1.25,1.95,.5),j.add(lt),k("egressLock",lt,.1,.18,0);let Q=new oe;Q.position.set(-9.2,3.4,.4),Q.rotation.y=.55,j.add(Q),P(_(1,30).scale(.62,.2,.4),y.shell,Q),P(_(1,24).scale(.38,.12,.25),y.graphite,Q,-.05,.1,0);let Mt=[[.78,.6],[.78,-.6],[-.78,.6],[-.78,-.6]],bt=[];for(let[T,N]of Mt){let D=Math.hypot(T,N);bt.push(x(D,.05,.075).rotateY(-Math.atan2(N,T)).translate(T/2,.02,N/2)),bt.push(R(.1,.1,.13,20).translate(T,.06,N))}P(w(bt),y.graphite,Q);let tt=[],et=w([x(.66,.008,.06),x(.66,.008,.06).rotateY(Math.PI/2)]);Mt.forEach(([T,N],D)=>{A(E(.1,.012,24).rotateX(Math.PI/2),y.cyan,Q,T,.12,N);let X=A(et,y.metal,Q,T,.14,N);X.rotation.y=D,tt.push(X)});let gt=new oe;gt.position.set(.42,-.2,0),Q.add(gt),P(_(.11,18),y.graphite,gt),A(R(.055,.055,.07,16).rotateZ(Math.PI/2),y.glass,gt,.1,0,0),A(E(.056,.01,20).rotateY(Math.PI/2),y.cyan,gt,.13,0,0),P(w([x(.035,.3,.035).translate(0,-.25,.24),x(.035,.3,.035).translate(0,-.25,-.24),x(.75,.03,.04).translate(0,-.4,.24),x(.75,.03,.04).translate(0,-.4,-.24)]),y.rubber,Q);let L=p(kt.green,2),nt=p(kt.red,2);A(_(.03,8),L,Q,.86,.05,.66),A(_(.03,8),nt,Q,.86,.05,-.66),k("drone",Q,0,.45,0);let K=mt(j,-7,2.2,.72,.72),ht=new oe;ht.position.set(0,.8,0),ht.rotation.set(-.12,.42,0),K.add(ht),P(Y(1.1,.48,.1,.16).rotateX(-Math.PI/2),y.graphite,ht),P(_(1,18).scale(.16,.08,.22),y.shell,ht,-.5,-.02,.05),P(_(1,18).scale(.16,.08,.22),y.shell,ht,.5,-.02,.05);for(let T of[-.3,.3])A(R(.018,.018,.08,10),y.metal,ht,T,.09,.08),A(_(.035,12),y.rubber,ht,T,.14,.08);let ut=new oe;ut.position.set(0,.22,-.16),ut.rotation.x=-.32,ht.add(ut),P(x(.64,.38,.03),y.graphite,ut);let St=A(new gn(.58,.32),$(Pt.video),ut,0,0,.017);for(let T of[-1,1]){let N=A(x(.05,.34,.018),y.shell,ht,T*.47,.2,-.2);N.rotation.z=-T*.32}let Gt=p(kt.green,1.8);A(_(.025,10),Gt,ht,0,.07,.2),k("remote",ht,0,.62,0);let Zt=new oe;Zt.position.set(4.6,0,-4.8),Zt.rotation.y=-.45,j.add(Zt),P(w([x(2,.06,.9).translate(0,.75,0),x(.06,.72,.8).translate(-.94,.36,0),x(.06,.72,.8).translate(.94,.36,0),x(1.9,.5,.03).translate(0,.5,-.4)]),y.frame,Zt),P(w([x(1.36,.82,.05).translate(0,1.32,-.22),x(.08,.45,.06).translate(0,.98,-.26),x(.4,.03,.26).translate(0,.79,-.24)]),y.graphite,Zt);let pt=A(new gn(1.26,.72),$(Pt.admin),Zt,0,1.32,-.193);P(x(.9,.03,.3),y.panel,Zt,0,.795,.17);let Ht=S(kt.cyan);A(E(1.35,.02,96).rotateX(Math.PI/2),Ht,Zt,0,.03,0);let se=S(kt.cyan);A(w([x(1.44,.02,.02).translate(0,1.74,-.2),x(1.44,.02,.02).translate(0,.9,-.2),x(.02,.86,.02).translate(-.71,1.32,-.2),x(.02,.86,.02).translate(.71,1.32,-.2)]),se,Zt);let Et=new oe;Et.position.set(0,1.9,-.15),Et.scale.setScalar(.001),Zt.add(Et);for(let T=0;T<4;T++)A(x(.12,.16,.03),y.cyan,Et,-.24+T*.16,0,0);k("admin",Zt,-.3,2,0),k("adminScreen",Zt,.45,1.5,-.18);let be=mt(j,7.4,1.5,.75,.74),Ne=new oe;Ne.position.set(0,.76,0),Ne.rotation.y=-.5,be.add(Ne),P(Y(1.02,.7,.04,.05).rotateX(-Math.PI/2),y.graphite,Ne,0,.02,0),A(x(.86,.006,.34),y.panel,Ne,0,.045,-.04);let un=new oe;un.position.set(0,.04,-.34),un.rotation.x=-.26,Ne.add(un),P(Y(1.02,.68,.03,.05),y.graphite,un,0,.34,0);let eo=A(new gn(.92,.58),$(Pt.idle),un,0,.35,.025),Si=new oe;Si.position.set(0,.85,.05),Si.scale.setScalar(.001),un.add(Si);for(let T=0;T<4;T++)A(x(.1,.13,.03),y.cyan,Si,-.21+T*.14,0,0);k("laptop",Ne,0,1.15,-.2),k("laptopScreen",un,.3,.5,.05);let no=mt(j,9.1,3.4,.5,.74),Rr={a:q(9.1,0,3.4),b:q(16.2,0,3.1)},bi=new oe;bi.position.set(0,.76,0),bi.rotation.y=-.7,no.add(bi);let Cn=new oe;Cn.position.set(0,.42,0),Cn.rotation.x=-.2,bi.add(Cn),P(Y(.38,.76,.035,.06),y.graphite,Cn);let Pr=A(new gn(.33,.68),$(Pt.idle),Cn,0,0,.032);P(x(.3,.06,.2),y.frame,bi,0,.03,.05),k("phone",bi,0,1,0);let Ds=mt(j,5.4,5.2,.62,.74);Ds.scale.setScalar(.001);let wi=new oe;wi.position.set(0,.76,0),wi.rotation.y=-.35,Ds.add(wi);let ii=new oe;ii.position.set(0,.36,0),ii.rotation.x=-.25,wi.add(ii),P(Y(.84,.58,.035,.05),y.graphite,ii),A(new gn(.76,.5),$(Pt.locked),ii,0,0,.032),P(x(.4,.06,.24),y.frame,wi,0,.03,.06),k("tablet",wi,0,.95,0);let Ir=S(kt.cyan),Lr=new di({color:kt.blue,transparent:!0,opacity:0,depthWrite:!1,blending:as});A(new Aa(7.15,7.24,n(160)).rotateX(-Math.PI/2),Ir,j,3.8,.02,.3),A(new vs(7.15,n(96)).rotateX(-Math.PI/2),Lr,j,3.8,.015,.3),k("lanTag",j,-1.2,.2,5.4);let On=mt(j,10.6,.6,.55,.74);On.scale.setScalar(.001),P(Y(.9,.55,.16,.06).rotateX(-Math.PI/2),y.graphite,On,0,.84,0),P(w([-.3,0,.3].map(T=>R(.02,.025,.45,10).translate(T,1.12,-.22))),y.graphite,On);for(let T=0;T<5;T++)A(x(.05,.02,.01),y.green,On,-.2+T*.1,.86,.29);k("router",On,0,1.45,0);let Ti=new oe;Ti.position.set(11.8,0,.7),Ti.scale.setScalar(.001),j.add(Ti);let io=A(x(.05,2.5,4.6),y.glass,Ti,0,1.25,0);io.renderOrder=5;{let T=[];for(let D=-2.3;D<=2.31;D+=.46)T.push(0,0,D,0,2.5,D);for(let D=0;D<=2.51;D+=.5)T.push(0,D,-2.3,0,D,2.3);let N=new Be;N.setAttribute("position",new ne(T,3)),Ti.add(new Gn(N,Me(3900150,.5)))}k("fw",Ti,0,2.6,-1.6);let Wn=new oe;Wn.position.set(17.8,3.6,-1.8),Wn.scale.setScalar(.001),j.add(Wn),Wn.add(new Gn(new Gi(new wa(1.35,1)),Me(2282478,.7))),A(_(1.25,28),new Vi({color:731733,roughness:.3,transparent:!0,opacity:.55,depthWrite:!1}),Wn),k("globe",Wn,-.6,1.5,.4);let Xn=new oe;Xn.position.set(14.6,2.7,1.4),Xn.rotation.y=-.3,Xn.scale.setScalar(.001),j.add(Xn),P(x(1.7,.44,.05),y.graphite,Xn),Xn.add(new Gn(new Gi(x(1.74,.48,.07)),Me(2282478,.9))),A(x(.2,.2,.02),y.cyan,Xn,-.6,0,.04),k("domain",Xn,0,.3,0);let Se={link:V([[-8.75,3,.65],[-8,2.4,1.4],[-7.05,1.35,2.05]]),ingest:V([[-6.75,1.2,2],[-4.3,2.35,1.75],[-2,2.05,.95],[-.82,1.45,.35]]),egressL:V([[.82,1.45,.35],[3,2.2,1.05],[5.6,1.95,1.4],[7.1,1.2,1.45]]),egressP:V([[.82,1.25,.5],[3.6,1.85,2.5],[7,1.75,3.3],[8.95,1.2,3.35]]),pageL:V([[.82,1.75,.1],[3.2,2.75,.55],[5.7,2.4,.95],[7.15,1.4,1.3]]),admin:V([[.6,1.9,-.55],[2.4,2.4,-2.6],[4.25,1.55,-4.35]]),https:V([[16,1.25,2.95],[13.2,1.5,1.6],[10.6,1.2,.6],[5.5,2,.15],[.82,1.65,0]]),udp:V([[16,1,3.2],[13.2,1.1,2],[10.6,.95,.95],[5.5,1.45,.65],[.82,1.2,.3]]),turn:V([[16,1.35,2.8],[12.5,3.7,1.4],[6,3.9,.4],[.4,2.45,.1]]),dns:V([[13.8,2.6,1.5],[12.2,2.4,1],[10.7,1.5,.6]]),key:V([[4.3,1.55,-4.4],[1,4.4,-2.2],[-4,3.9,.4],[-6.75,1.4,2]]),req:V([[7,1.35,1.4],[4,2.25,.9],[.85,1.8,.25],[2,2.5,-2.4],[4.3,1.65,-4.3]]),tablet:V([[5.3,1.35,5],[3.8,2.1,3.2],[2.25,1.55,1.2]]),bak:V([[-.6,1.05,-.62],[-2,3,-3.4],[-4,2.6,-6.2],[-4.45,1.2,-6.95]]),planned:V([[-6.6,1.15,2.45],[-5.1,1.1,4.25],[-1.5,3.5,3.5],[2.4,3.7,2.9],[6.95,1.35,1.7]])},Us=q(0,0,0),us=q(0,0,0),b=new Te,U=new zn,Z=q(1,1,1),H=q(0,1,0),W=q(0,0,1);function _t(T,N,D,X,ot){let ft=new cr(T,n(72),D,6,!1),Bt=S(N),ue=A(ft,Bt,j);ue.renderOrder=6;let Xt=ft.index.count,Ke=p(N,1.8),je=new ki(x(.17,.1,.1),Ke,X);je.frustumCulled=!1,j.add(je);let rn=null;ot&&(rn=new ki(x(.26,.18,.18),y.glass,X),rn.frustumCulled=!1,rn.renderOrder=7,j.add(rn));let vn={c:T,tube:ue,mat:Bt,pm:Ke,packets:je,shells:rn,n:X,total:Xt,base:new Qt(N)};return vn.update=(Ye,tn,Yi,Sc,Or)=>{let Os=Ye>.004;ue.visible=Os,Bt.opacity=.75*Ye;let Bs=Yi===void 0?1:Yi;ft.setDrawRange(0,Math.max(0,Math.floor(Xt*Bs/6)*6));let Br=Os&&Or!==!1;if(je.visible=Br,rn&&(rn.visible=Br),!Br)return;let bc=ni(Ye*1.3);for(let ds=0;ds<X;ds++){let Ri=((ds/X+tn)%1+1)%1;Sc<0&&(Ri=1-Ri),Ri*=Bs,T.getPointAt(Ri,us),T.getTangentAt(Ri,Us),U.setFromUnitVectors(q(1,0,0),Us);let kr=Math.min(1,Ri*8,(Bs-Ri)*8);Z.setScalar(Math.max(1e-4,bc*kr)),b.compose(us,U,Z),je.setMatrixAt(ds,b),rn&&rn.setMatrixAt(ds,b)}je.instanceMatrix.needsUpdate=!0,rn&&(rn.instanceMatrix.needsUpdate=!0)},vn.color=(Ye,tn)=>{Bt.color.copy(vn.base).lerp(Ut.set(Ye),tn),Ke.emissive.copy(vn.base).lerp(Ut.set(Ye),tn)},vn}let Ut=new Qt;function xt(T,N,D,X){let ot=p(N,1.5),ft=new ki(R(.022,.022,X,8),ot,D);ft.frustumCulled=!1,j.add(ft);let Bt={im:ft,mat:ot};return Bt.update=(ue,Xt)=>{if(ft.visible=ue>.004,!!ft.visible){for(let Ke=0;Ke<D;Ke++){let je=ni(((Ke+.5)/D+(Xt||0))%1);T.getPointAt(je,us),T.getTangentAt(je,Us),U.setFromUnitVectors(H,Us),Z.setScalar(Math.max(1e-4,ni(ue))),b.compose(us,U,Z),ft.setMatrixAt(Ke,b)}ft.instanceMatrix.needsUpdate=!0}},Bt}let Tt={ingest:_t(Se.ingest,kt.amber,.028,6,!1),egressL:_t(Se.egressL,kt.cyan,.03,6,!0),egressP:_t(Se.egressP,kt.sky,.026,5,!0),pageL:_t(Se.pageL,kt.blue,.024,4,!0),admin:_t(Se.admin,kt.sky,.022,4,!1),https:_t(Se.https,kt.blue,.03,7,!0),udp:_t(Se.udp,kt.cyan,.03,7,!0)},Ft={link:xt(Se.link,kt.cyan,7,.16),turn:xt(Se.turn,kt.white,26,.22),dns:xt(Se.dns,kt.cyan,8,.14),key:xt(Se.key,kt.sky,30,.14),planned:xt(Se.planned,kt.violet,40,.2),bak:xt(Se.bak,kt.cyan,18,.14)},Jt=(T,N,D,X)=>{let ot=new We;return T.getPointAt(N,ot.position),ot.position.y+=D||0,j.add(ot),X&&(I[X]=ot),ot};Jt(Se.ingest,.45,.12,"ingestMid"),Jt(Se.egressL,.42,.12,"egressMid"),Jt(Se.pageL,.55,.12,"pageMid"),Jt(Se.https,.38,.14,"httpsMid"),Jt(Se.udp,.62,-.05,"udpMid"),Jt(Se.turn,.45,.15,"turnMid"),Jt(Se.planned,.5,.2,"plannedMid"),Jt(Se.ingest,.3,.42,"vpnTag");let ge=new Vi({color:3462041,roughness:.2,transparent:!0,opacity:0,depthWrite:!1,side:wn}),Ot=A(new cr(Se.ingest,n(64),.2,n(16),!1),ge,j);Ot.renderOrder=8;let ae=vt(p(kt.cyan,1.6));ae.scale.setScalar(.001),j.add(ae),k("key",ae,0,.2,0);let Ie=At();Ie.scale.setScalar(.001),j.add(Ie),k("req",Ie,0,.25,0);let we=At();we.scale.setScalar(.001),j.add(we);let _e=new oe;_e.scale.setScalar(.001),j.add(_e),P(Y(.52,.34,.14,.05).rotateX(-Math.PI/2),y.graphite,_e),A(x(.4,.02,.01),y.cyan,_e,0,0,.18);let $e=It(y.graphite,y.cyan);$e.scale.setScalar(.7),$e.position.set(0,.2,0),_e.add($e),k("bak",_e,0,.35,0);let Lt=new oe;Lt.position.set(-5.1,0,4.25),Lt.scale.setScalar(.001),j.add(Lt),Lt.add(new Gn(new Gi(x(.9,.6,.6)),Me(10980346,.9)).translateY(.95)),Lt.add(new Gn(new Gi(new es(.5,.55,.62,6)),Me(10980346,.5)).translateY(.31)),k("gateway",Lt,0,1.45,0);let qe=zt(p(kt.cyan,1.4),.2);qe.position.set(7.35,2.35,1.45),qe.scale.setScalar(.001),j.add(qe),k("session",qe,0,.15,0);let he=new oe;he.position.set(6.4,2.3,1.9),he.rotation.y=-.4,he.scale.setScalar(.001),j.add(he);let Ai=[p(kt.green,.9),p(kt.green,.9),p(kt.red,.9)];for(let T=0;T<3;T++)P(Y(.5,.34,.03,.04),T===2?y.panel:y.graphite,he,-.62+T*.62,0,0),A(new gn(.42,.26),$(T===2?Pt.locked:Pt.video),he,-.62+T*.62,0,.03),A(x(.5,.02,.02),Ai[T],he,-.62+T*.62,-.2,.02);k("rightsOk",he,-.62,.25,0),k("rightsNo",he,.62,.25,0);let De=new oe;De.position.set(8.55,1.85,2.45),De.rotation.y=-.55,De.scale.setScalar(.001),j.add(De),P(Y(.72,.72,.03,.04),y.shell,De);{let N=.03529411764705882,D=[],X=(ot,ft)=>ot<5&&ft<5||ot<5&&ft>11||ot>11&&ft<5;for(let ot=0;ot<17;ot++)for(let ft=0;ft<17;ft++){let Bt;if(X(ot,ft)){let ue=ot<5?ot:ot-12,Xt=ft<5?ft:ft-12;Bt=ue===0||ue===4||Xt===0||Xt===4||ue===2&&Xt===2}else Bt=Math.sin(ot*12.9898+ft*78.233)*43758.5453%1>.1;Bt&&D.push(x(N*.92,N*.92,.02).translate(-.3+(ft+.5)*N,.3-(ot+.5)*N,.03))}A(w(D),y.rubber,De)}k("qr",De,.15,.45,0);let qn=At();qn.position.set(6.7,2.05,2.35),qn.rotation.y=-.3,qn.scale.setScalar(.001),j.add(qn),k("envelope",qn,0,.25,0);let si=p(kt.red,1.4),dn=new ke(new bs(.6,.035,6,6),si);dn.position.set(2.2,1.55,1.15),dn.rotation.y=1.1,dn.scale.setScalar(.001),j.add(dn);let ve=new ke(new vs(.58,6),new di({color:kt.red,transparent:!0,opacity:.12,side:wn,depthWrite:!1,blending:as}));dn.add(ve),k("shield",dn,0,.75,0);let Fe=new oe;Se.egressL.getPointAt(.47,Fe.position),Fe.scale.setScalar(.001),j.add(Fe),A(E(.22,.03,32),y.red,Fe).rotation.y=1.2,A(w([x(.36,.05,.05).rotateZ(.785),x(.36,.05,.05).rotateZ(-.785)]),y.red,Fe).rotation.y=1.2,k("cutMark",Fe,0,.35,0);let An=[];for(let T=0;T<3;T++){let N=A(_(.06,10),y.red,j);N.visible=!1,An.push(N)}let Ue=[],Je={a:[q(1.55,2.95,2.25),q(3.4,3.05,1.55),q(1.85,1.95,2.65),q(3.75,2.05,2.35)],b:[q(2.62,2.62,1.6),q(3.62,2.62,1.6),q(2.62,1.98,1.6),q(3.62,1.98,1.6)]},Yn=["tStream","tText","tImage","tVideo"];for(let T=0;T<4;T++){let N=new oe;if(N.scale.setScalar(.001),j.add(N),P(Y(.86,.54,.035,.05),y.graphite,N),T===0)A(new gn(.76,.44),$(Pt.video),N,0,0,.03),A(_(.04,10),y.red,N,.3,.17,.05);else if(T===1)A(w([0,1,2].map(D=>x(.6-D*.12,.05,.01).translate(-.06*D,.12-D*.12,0))),y.cyan,N,0,0,.03);else if(T===2){let D=new pi;D.moveTo(-.34,-.18),D.lineTo(-.12,.1),D.lineTo(0,-.02),D.lineTo(.14,.14),D.lineTo(.34,-.18),D.lineTo(-.34,-.18),A(new Ss(D),y.blue,N,0,0,.03),A(new vs(.06,16),y.amber,N,-.22,.15,.03)}else{let D=new pi;D.moveTo(-.08,-.13),D.lineTo(.14,0),D.lineTo(-.08,.13),D.lineTo(-.08,-.13),A(new Ss(D),y.cyan,N,0,0,.03)}k(Yn[T],N,.3,.32,0),Ue.push(N)}let ri=new oe;ri.position.set(3.12,2.3,1.55),ri.scale.setScalar(.001),j.add(ri);let zf=A(x(2.25,1.55,.36),y.glass,ri);zf.renderOrder=6,ri.add(new Gn(new Gi(x(2.27,1.57,.38)),Me(2282478,.9))),k("group",ri,-.95,.9,0);let Ei=fe(!1);Ei.g.position.set(-4.6,0,-7.6),Ei.g.rotation.y=.3,Ei.g.scale.setScalar(.001),j.add(Ei.g),k("n2",Ei.g,0,2.8,0);let yn={udp:jt(y.red),port:jt(y.red),cert:jt(y.amber),offline:jt(y.red),limit:jt(y.amber)};Se.egressL.getPointAt(.47,yn.udp.position),yn.udp.position.y-=.5,I.videoCut=new We,Se.egressL.getPointAt(.47,I.videoCut.position),I.videoCut.position.y+=.2,j.add(I.videoCut),yn.port.position.set(1.55,.55,.05),Se.pageL.getPointAt(.82,yn.cert.position),yn.cert.position.y-=.45,I.certMark=new We,I.certMark.position.copy(yn.cert.position),I.certMark.position.y+=.75,j.add(I.certMark);let Nr=It(y.graphite,y.amber);Se.pageL.getPointAt(.82,Nr.position),Nr.scale.setScalar(.001),j.add(Nr),yn.offline.position.set(-6,.9,2.6),yn.limit.position.set(8.25,1.5,1);for(let T in yn)j.add(yn[T]);let lu=mc.length,cu=new Float32Array(lu),qi=new Float32Array(6),dt=T=>cu[gc[T]],so=0;function Gf(T){let N=h.length,D,X,ot,ft;if(T<=h[0].t)D=X=h[0],ot=0;else if(T>=h[N-1].t)D=X=h[N-1],ot=0;else{let Bt=0,ue=N-1;for(;ue-Bt>1;){let Xt=Bt+ue>>1;h[Xt].t<=T?Bt=Xt:ue=Xt}D=h[Bt],X=h[ue],ot=(T-D.t)/(X.t-D.t),ft=Bt%2===1,ft&&(ot=cs(ot))}for(let Bt=0;Bt<lu;Bt++)cu[Bt]=D.v[Bt]+(X.v[Bt]-D.v[Bt])*ot;for(let Bt=0;Bt<6;Bt++)qi[Bt]=D.cam[Bt]+(X.cam[Bt]-D.cam[Bt])*ot;if(qi[4]+=.07*ls(D.drift,X.drift,ot),so=0,D.cam!==X.cam){let Bt=Math.hypot(D.cam[0]-X.cam[0],D.cam[1]-X.cam[1],D.cam[2]-X.cam[2]);so=Math.sin(Math.PI*ot)*Math.min(1,Bt/10)}}let ro=1,Dr=1,Ci={x:0,y:0,fw:1,fh:1};function Vf(T,N,D,X){ro=T,Dr=N,s.setPixelRatio(D),s.setSize(T,N,!1),c.aspect=T/N,hu(X)}function hu(T){let N=ro,D=Dr,X=T.x+T.w/2,ot=T.y+T.h/2;Ci.x=-(X-N/2),Ci.y=-(ot-D/2),Ci.fw=T.w,Ci.fh=T.h,c.setViewOffset(N,D,Ci.x,Ci.y,N,D),c.updateProjectionMatrix()}let Ur=q(0,0,0);function Hf(){let T=Ci.fw/Math.max(1,Ci.fh),N=Math.min(2.4,Math.max(1,Dr/Math.max(1,Ci.fh)*.9,1.3/T))*(ro<Dr?.8:1),D=qi[3]*N*(1+.35*so),X=qi[5]+.18*so,ot=qi[4];Ur.set(qi[0],qi[1],qi[2]),c.position.set(Ur.x+Math.sin(ot)*Math.cos(X)*D,Ur.y+Math.sin(X)*D,Ur.z+Math.cos(ot)*Math.cos(X)*D),c.lookAt(Ur)}let Re=(T,N)=>T.scale.setScalar(Math.max(.001,N)),Fs="windows";function Wf(T,N,D){Gf(T),Fs=D;let X=N,ot=Math.max(dt("flow"),dt("live"),dt("ingest"));Q.position.y=3.4+.07*Math.sin(X*1.3),Q.rotation.z=.03*Math.sin(X*.9),tt.forEach((Ve,an)=>{Ve.rotation.y=an+X*(14+10*ot)}),Ft.link.update(Math.max(dt("flow"),dt("live")),X*.25%1);let ft=dt("dOffline");Gt.emissive.set(ft>.5?kt.red:ot>.5?kt.green:kt.sky),St.material.map=ft>.5?Pt.idle:Pt.video;let Bt=cs(ni(dt("explode")));Kt.layers.forEach((Ve,an)=>{let Gr=Ve.g.userData.base;Ve.g.position.set(Gr.x,ls(Gr.y,.55+an*.64,Bt),ls(Gr.z,1.85,Bt)),Ve.g.rotation.y=ls(0,-.32,Bt),Ve.led.emissiveIntensity=1.2+(an===3?2.2*dt("source"):0)});let ue=dt("osPick");Re(ze,ue*(Fs==="windows"?1.2:.75)),Re(ce,ue*(Fs==="linux"?1.2:.75)),Ae.emissiveIntensity=Fs==="windows"?2.2:.05,wt.emissiveIntensity=Fs==="linux"?2.2:.05,Ge.position.set(Fs==="windows"?-1.05:-1.62,.32,.3);let Xt=dt("verified"),Ke=dt("dPort");Kt.statusMat.emissive.set(Ke>.5?kt.red:Xt>.5?3359061:dt("live")>.5||dt("ok")>.5?kt.green:kt.cyan),Kt.statusMat.emissiveIntensity=Xt>.5?.4:1.6,Kt.screen.material.map=dt("clear")>.5?Pt.video:Pt.rack,O.forEach((Ve,an)=>Ve.emissive.set(an===1&&Ke>.5?kt.red:kt.green)),Wt.opacity=.07*dt("trust"),C.material.opacity=.8*dt("trust"),Re(M,dt("scan")),M.position.y=1.2+.85*Math.sin(X*1.6),Re(G,dt("tlsKey")),G.rotation.y=X*.8,Re(lt,dt("egressLock")),lt.rotation.y=.4*Math.sin(X*.7);let je=X*.16+T*.9,rn=1-.7*dt("dim");Tt.ingest.update(Math.max(dt("ingest"),dt("flow"),.5*ft)*rn,je,ft>.5?.3:1,1,ft<.5),Tt.ingest.color(kt.red,ft),ge.opacity=.16*dt("vpn"),Ot.visible=dt("vpn")>.004;let vn=dt("cut"),Ye=dt("dUdp");Tt.egressL.update(Math.max(dt("egress"),dt("flow"),vn,Ye)*rn,je,1-.53*Math.max(vn,Ye),1,Math.max(vn,Ye)<.5),Tt.egressL.color(kt.red,Math.max(vn,Ye)),Tt.egressP.update(Math.max(dt("egress"),dt("flow"))*(1-dt("phoneOut"))*rn,je+.3,1,1);let tn=dt("login");Tt.pageL.update(Math.max(tn,Ye,dt("dCert")),je+.1,1,tn>.5?-1:1),Tt.admin.update(Math.max(dt("source"),dt("approve"),dt("revoke")),je,1,1),Tt.admin.color(kt.red,dt("revoke")),Tt.https.update(dt("https")*dt("phoneOut"),je,1,-1),Tt.udp.update(dt("udp")*dt("phoneOut"),je+.5,1,1),Ft.turn.update(dt("turn"),X*.05%1),Ft.dns.update(dt("domain"),0),Ft.key.update(dt("key")*.8,0),Ft.planned.update(dt("planned"),0),Ft.bak.update(Math.max(dt("bakMake"),dt("bakTravel"))*(1-dt("verified"))*.8,X*.04%1);let Yi=dt("lan");Ir.opacity=.9*Yi,Lr.opacity=.05*Yi,Re(On,dt("nat")),Re(Ti,dt("nat")),Re(Wn,dt("globe")),Wn.rotation.y=X*.12,Re(Xn,dt("domain"));let Sc=cs(ni(dt("phoneOut")));no.position.lerpVectors(Rr.a,Rr.b,Sc),Pr.material.map=Math.max(dt("egress"),dt("flow"),dt("udp"))>.5?Pt.video:Pt.idle;let Or=dt("revoke"),Os=dt("approve"),Bs=Or>.5?kt.red:Os>.5?kt.green:kt.cyan;Ht.color.set(Bs),Ht.opacity=.9*Math.max(Or,Os,dt("source"),dt("code")),se.color.set(Bs),se.opacity=.9*Math.max(Or,Os,dt("code")),Re(Et,dt("code")),Re(Si,dt("code"));let Br=Math.max(dt("egress"),dt("flow"),dt("live"));eo.material.map=dt("dLimit")>.5?Pt.grid:vn>.5?Pt.error:dt("waiting")>.5?Pt.waiting:Br>.5&&Ye<.5?Pt.video:Pt.idle;let bc=cs(ni(dt("keyTravel")));Se.key.getPointAt(bc,ae.position),ae.rotation.set(.3,X*1.2,.2),Re(ae,dt("key")*1.4);let ds=dt("guestTravel"),Ri=dt("request"),kr=Math.max(ds,Ri);Se.req.getPointAt(cs(ni(kr)),Ie.position),Ie.rotation.y=.4+X*.6,Re(Ie,kr>.01?Math.min(1,kr*5):0);let ao=dt("blockB");Se.tablet.getPointAt(cs(ni(ao*1.7))*.97,we.position),Re(we,ao>.01?Math.min(1,ao*5):0);let Jf=Math.max(dt("bakMake"),dt("bakTravel"));Se.bak.getPointAt(cs(ni(dt("bakTravel"))),_e.position),_e.position.y+=.15,_e.rotation.y=X*.5,Re(_e,Jf*(1-Xt)),Re(qe,dt("session")),qe.rotation.y=X*.7,qe.position.y=2.35+.05*Math.sin(X*1.4),Re(he,dt("rights")),Re(De,dt("invite")),De.position.y=1.85+.04*Math.sin(X*1.1),Re(qn,dt("invite")),Re(Ds,dt("browserB"));let wc=dt("reject"),$f=Math.max(wc,ni((ao-.45)*6));Re(dn,$f),dn.rotation.z=X*.4,Re(Fe,vn),An.forEach((Ve,an)=>{if(Ve.visible=wc>.05,!Ve.visible)return;let Gr=(X*.45+an/3)%1,tp=1-Math.abs(1-2*Gr);Se.egressL.getPointAt(ls(.98,.3,tp),Ve.position),Ve.scale.setScalar(wc)});let Kf=dt("tiles"),zr=cs(ni(dt("group")));Ue.forEach((Ve,an)=>{Ve.position.lerpVectors(Je.a[an],Je.b[an],zr),Ve.rotation.set(0,ls(-.4+.25*Math.sin(an*2.1),0,zr),ls(.12*Math.sin(an*3.3),0,zr)),Ve.position.y+=(1-zr)*.05*Math.sin(X*1.1+an),Re(Ve,Kf*ls(1,.92,zr))}),Re(ri,dt("group"));let Qf=dt("n2");Re(Ei.g,Qf),Ei.statusMat.emissive.set(Xt>.5?kt.green:dt("standby")>.5?kt.amber:kt.cyan),Ei.statusMat.emissiveIntensity=1.6+(dt("restore")>.5&&Xt<.5?.8*Math.sin(X*4):0),Ei.layers.forEach((Ve,an)=>{Ve.led.emissiveIntensity=Xt>.5?1.4:dt("restore")>.5?.8+.6*((an+Math.floor(X*3))%5===0?1:0):.15}),Re(Lt,dt("planned"));let jf=[[yn.udp,Ye],[yn.port,Ke],[yn.cert,dt("dCert")],[yn.offline,ft],[yn.limit,dt("dLimit")]];for(let[Ve,an]of jf)Re(Ve,an),Ve.userData.core.rotation.y=X*1.5,Ve.userData.core.position.y=.5+.06*Math.sin(X*2.2);Re(Nr,dt("dCert")),Nr.rotation.y=X*.6,re.rotation.y=X*.01,Hf()}let Fr=q(0,0,0);function Xf(T,N){let D=I[T];if(!D)return!1;D.updateWorldMatrix(!0,!1),Fr.setFromMatrixPosition(D.matrixWorld);let X=Fr.clone().applyMatrix4(c.matrixWorldInverse);N.behind=X.z>-c.near,Fr.project(c),N.x=(Fr.x+1)/2*ro,N.y=(1-Fr.y)/2*Dr;let ot=D,ft=1;for(;ot&&ot!==r;)ft*=ot.scale.x,ot=ot.parent;return N.hidden=ft<.2,!0}function qf(){s.render(r,c)}function Yf(T){s.shadowMap.enabled=T&&!e,r.traverse(N=>{N.material&&(N.material.needsUpdate=!0)})}function Zf(){let T=new Set,N=new Set;r.traverse(D=>{D.geometry&&N.add(D.geometry),D.material&&(Array.isArray(D.material)?D.material:[D.material]).forEach(X=>T.add(X))}),N.forEach(D=>D.dispose()),T.forEach(D=>D.dispose()),f.forEach(D=>D.dispose()),l.dispose(),a.dispose(),s.dispose();try{s.forceContextLoss()}catch{}}return{update:Wf,render:qf,resize:Vf,setFree:hu,project:Xf,dispose:Zf,setShadows:Yf,renderer:s,info:s.info}}var ay=Zi,le=document,cn=le.documentElement,Pe=i=>le.getElementById(i),Fn=(i,t,e)=>Math.max(t,Math.min(e,i)),Ls={get:i=>{try{return window.localStorage.getItem("ds-guide-"+i)}catch{return null}},set:(i,t)=>{try{window.localStorage.setItem("ds-guide-"+i,t)}catch{}}},nu=i=>window.matchMedia?window.matchMedia(i):{matches:!1,addEventListener(){}},Jh=nu("(prefers-reduced-motion: reduce)"),wf=nu("(max-width: 760px)"),ja=()=>Pe("bar").offsetHeight,sn={};window.location.hash.indexOf("=")>0&&window.location.hash.slice(1).split("&").forEach(i=>{let t=i.indexOf("=");t>0&&(sn[decodeURIComponent(i.slice(0,t))]=decodeURIComponent(i.slice(t+1)))});cn.classList.add("js");var vf=0;function $a(i){let t=Pe("toast");t.textContent=i,t.hidden=!1,clearTimeout(vf),vf=setTimeout(()=>{t.hidden=!0},4200)}function oy(i){let t=i.textContent,e=/<[A-Z][A-Z0-9_]*>/g;if(!e.test(t))return!1;e.lastIndex=0;let n=le.createDocumentFragment(),s=0,r;for(;r=e.exec(t);){n.appendChild(le.createTextNode(t.slice(s,r.index)));let a=le.createElement("span");a.className="ph",a.textContent=r[0],n.appendChild(a),s=r.index+r[0].length}return n.appendChild(le.createTextNode(t.slice(s))),i.textContent="",i.appendChild(n),!0}function Tf(i){let t=window.getSelection(),e=le.createRange();e.selectNodeContents(i),t.removeAllRanges(),t.addRange(e)}function ly(i,t){let e=i.textContent,n=t?"Nusxalandi. Diqqat: <\u2026> ko\u2018rinishidagi joylarni o\u2018z qiymatlaringiz bilan almashtiring.":"Nusxalandi.",s=()=>{Tf(i);let r=!1;try{r=le.execCommand("copy")}catch{r=!1}$a(r?n:"Avtomatik nusxalab bo\u2018lmadi. Kod belgilandi \u2014 Ctrl+C (Mac: \u2318C) bosing.")};navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext?navigator.clipboard.writeText(e).then(()=>$a(n),s):s()}le.querySelectorAll("pre.code").forEach(i=>{let t=i.querySelector("code"),e=oy(t),n=le.createElement("div");n.className="code-tools";let s=le.createElement("span");s.className="lang",s.textContent=i.getAttribute("data-lang")||"";let r=le.createElement("button");r.type="button",r.textContent="Belgilash",r.title="Kodni belgilaydi (keyin Ctrl+C)",r.addEventListener("click",()=>{xn(),Tf(t),$a("Kod belgilandi \u2014 Ctrl+C (Mac: \u2318C) bosing.")});let a=le.createElement("button");a.type="button",a.textContent="Nusxalash",a.addEventListener("click",()=>{xn(),ly(t,e)}),n.appendChild(s),n.appendChild(r),n.appendChild(a),i.parentNode.insertBefore(n,i.nextSibling)});var Hn=[],Le=Array.from(le.querySelectorAll("main .scene")).map((i,t)=>{let e=ay.scenes[t],n=Hn.length;return e.beats.forEach((s,r)=>{let a={};s.state.forEach(o=>{o.endsWith("~")?a[o.slice(0,-1)]=[0,1]:a[o]=[1,1]}),Hn.push({scene:t,beat:r,cam:s.cam,set:a,labels:s.labels})}),{i:t,el:i,id:e.id,first:n,count:e.beats.length,sectionBeats:e.sectionBeats||{},stage:i.querySelector(".stage"),panel:i.querySelector(".panel"),details:i.querySelector(".details"),more:i.querySelector(".more"),beats:Array.from(i.querySelectorAll(".beat")),nav:Array.from(i.querySelectorAll(".beat-nav button")),toggles:Array.from(i.querySelectorAll(".seg [data-beat]")),secs:Array.from(i.querySelectorAll(".details .sec")),open:!1,y0:0,y1:1,yd:1}}),Mi=Hn.length,iu=i=>Le[Hn[Fn(i,0,Mi-1)].scene],$h=sn.plain==="1"||Ls.get("plain")==="1",Sr=Ls.get("anim")!==null?Ls.get("anim")==="1":!0,su=()=>Jh.matches||!Sr,br=sn.os||Ls.get("os")||"windows",Ce=!1,Ja=!1,Un=[];function vc(){if(!Ce)return;let i=window.scrollY,t=window.innerHeight,e=ja(),n=wf.matches,s=r=>r.getBoundingClientRect().top+i;Le.forEach(r=>{let a=s(r.stage),o=a+r.stage.offsetHeight,l=r.panel.offsetHeight,c,h;if(n)c=a+l-t,h=o-t;else{let f=e+16;c=a-f,h=o-f-l}h<c+40&&(h=c+40),r.y0=c,r.y1=h,r.t0=r.first+.2,r.t1=r.first+r.count-.2}),Un=[],Le.forEach((r,a)=>{Un.push({y0:r.y0,y1:r.y1,t0:r.t0,t1:r.t1});let o=r.y1;if(r.open){let l=r.first+r.count-.5,c=r.y1,h=l;r.secs.forEach(f=>{let u=Math.max(c,s(f)-e-t*.3);u>c&&Un.push({y0:c,y1:u,t0:h,t1:h}),c=u;let d=r.sectionBeats[f.id];h=d===void 0?l:r.first+d+.5}),o=Math.max(c,s(r.details)+r.details.offsetHeight-t*.5),o>c&&Un.push({y0:c,y1:o,t0:h,t1:h})}if(r.yd=o,a+1<Le.length){let l=Le[a+1];Un.push({y0:o,y1:Math.max(o+1,l.y0),t0:r.t1,t1:l.t0})}})}function Mc(i){if(!Un.length)return .2;if(i<=Un[0].y0)return Un[0].t0;let t=Un[0];for(let e=0;e<Un.length;e++){let n=Un[e];if(i<n.y0)return t.t1;if(i<=n.y1)return n.y1>n.y0?n.t0+(n.t1-n.t0)*(i-n.y0)/(n.y1-n.y0):n.t1;t=n}return t.t1}function cy(i){for(let t=0;t<Un.length;t++){let e=Un[t];if(e.t1>e.t0&&i>=e.t0&&i<=e.t1)return e.y0+(i-e.t0)/(e.t1-e.t0)*(e.y1-e.y0)}return i<=.2?0:null}function hy(i){let t=iu(i),e=Fn(i+.5,t.t0,t.t1);return t.y0+(e-t.t0)/Math.max(1e-6,t.t1-t.t0)*(t.y1-t.y0)}function Ns(i){if(!Ce){let t=iu(i),e=t.beats[i-t.first]||t.el;wr(e);return}window.scrollTo(0,Math.max(0,Math.round(hy(i))+1))}function wr(i){let t=i.getBoundingClientRect().top+window.scrollY-ja()-12;window.scrollTo(0,Math.max(0,t))}var ct={world:null,T:.2,Tt:.2,raf:0,last:0,amb:0,ambUntil:0,visible:!le.hidden,onscreen:!0,free:{x:0,y:0,w:1,h:1},renderMs:[],frames:0,lost:!1,quality:""},ru=6e3;function to(){!ct.world||!ct.visible||!ct.onscreen||ct.raf||(ct.raf=window.requestAnimationFrame(uy))}function hs(){ct.ambUntil=performance.now()+ru,to()}function uy(i){if(ct.raf=0,!ct.world)return;let t=ct.last?Math.min(.1,(i-ct.last)/1e3):.016;ct.last=i,Xe.on&&My(t),ct.Tt=Mc(window.scrollY);let e=su();e?ct.T=Fn(Math.floor(ct.Tt-.2)+.5+(ct.Tt-.2-Math.floor(ct.Tt-.2)>.5?1:0),.5,Mi-.5):(ct.T+=(ct.Tt-ct.T)*(1-Math.exp(-t*7)),Math.abs(ct.Tt-ct.T)<4e-4&&(ct.T=ct.Tt));let n=!e&&i<ct.ambUntil;n&&(ct.amb+=t),ct.world.update(ct.T,ct.amb,br);let s=performance.now();ct.world.render();let r=performance.now()-s;ct.frames++,ct.renderMs.length<400&&ct.renderMs.push(r),ct.frames===24&&dy(),my(),Ef();let a=e?ct.T:ct.Tt;ct.T!==a||n||Xe.on?to():ct.last=0}function dy(){let i=ct.renderMs.slice(4).sort((e,n)=>e-n);(i[i.length>>1]||0)>30&&ct.quality==="high"&&(ct.world.setShadows(!1),ct.quality="high-noshadow",ou())}var Tr=[],Mf="http://www.w3.org/2000/svg";function fy(){let i=Pe("labels"),t=Pe("leaders");for(let e=0;e<10;e++){let n=le.createElement("div");n.className="lbl";let s=le.createElement("b"),r=le.createElement("span");n.appendChild(s),n.appendChild(r),i.appendChild(n);let a=le.createElementNS(Mf,"line"),o=le.createElementNS(Mf,"circle");o.setAttribute("r","3"),t.appendChild(a),t.appendChild(o),Tr.push({el:n,b:s,s:r,ln:a,dot:o,key:"",w:0,h:0})}}var Tn={x:0,y:0,behind:!1,hidden:!1};function py(i,t){let e=i+.2,n=i+.8;return t>=e&&t<=n?1:Fn(1-(t<e?e-t:t-n)/.4,0,1)}function my(){let i=ct.T,t=ct.free,e=[],n=0;if(cn.classList.contains("no-labels")){Kh(0);return}for(let s=Math.max(0,Math.floor(i)-1);s<=Math.min(Mi-1,Math.floor(i)+1);s++){let r=py(s,i);if(!(r<.04))for(let a of Hn[s].labels){if(n>=Tr.length)break;if(a[4]&&a[4]!==br||!ct.world.project(a[0],Tn)||Tn.behind||Tn.hidden||Tn.x<t.x+4||Tn.x>t.x+t.w-4||Tn.y<t.y+4||Tn.y>t.y+t.h-4)continue;let o=Tr[n],l=a[1]+"|"+a[2]+"|"+(a[3]||"");o.key!==l&&(o.key=l,o.b.textContent=a[1],o.s.textContent=a[2]||"",o.s.hidden=!a[2],o.el.className="lbl"+(a[3]?" t-"+a[3]:""),o.w=o.el.offsetWidth,o.h=o.el.offsetHeight);let c=[[22,-o.h-20],[-22-o.w,-o.h-20],[22,16],[-22-o.w,16],[-o.w/2,-o.h-46],[-o.w/2,30]],h=null;for(let[d,g]of c){let v={x:Tn.x+d,y:Tn.y+g,w:o.w,h:o.h};if(!(v.x<t.x+6||v.y<t.y+6||v.x+v.w>t.x+t.w-6||v.y+v.h>t.y+t.h-6)&&!e.some(m=>v.x<m.x+m.w+6&&v.x+v.w+6>m.x&&v.y<m.y+m.h+6&&v.y+v.h+6>m.y)){h=v;break}}if(!h)continue;e.push(h),o.el.style.transform="translate("+Math.round(h.x)+"px,"+Math.round(h.y)+"px)",o.el.style.opacity=r.toFixed(3);let f=Fn(Tn.x,h.x,h.x+h.w),u=Fn(Tn.y,h.y,h.y+h.h);o.ln.setAttribute("x1",Tn.x.toFixed(1)),o.ln.setAttribute("y1",Tn.y.toFixed(1)),o.ln.setAttribute("x2",f.toFixed(1)),o.ln.setAttribute("y2",u.toFixed(1)),o.ln.setAttribute("class","ld"+(a[3]?" t-"+a[3]:"")),o.ln.setAttribute("opacity",(.85*r).toFixed(3)),o.dot.setAttribute("cx",Tn.x.toFixed(1)),o.dot.setAttribute("cy",Tn.y.toFixed(1)),o.dot.setAttribute("class","ld"+(a[3]?" t-"+a[3]:"")),o.dot.setAttribute("opacity",r.toFixed(3)),n++}}Kh(n)}function Kh(i){for(let t=i;t<Tr.length;t++){let e=Tr[t];e.el.style.opacity="0",e.ln.setAttribute("opacity","0"),e.dot.setAttribute("opacity","0")}}var vi=-1,Af=Pe("scene-pos"),Ka={};le.querySelectorAll("#toc a[data-scene]").forEach(i=>{Ka[i.getAttribute("data-scene")]=i});function Ef(){let i=Ce?ct.T:.5,t=Fn(Math.round(i-.5),0,Mi-1);if(t===vi)return;let e=vi>=0?Hn[vi]:null;vi=t;let n=Hn[t],s=Le[n.scene];(!e||e.scene!==n.scene)&&(Le.forEach(r=>r.el.classList.toggle("current",r===s)),Af.textContent=n.scene+1+" / "+Le.length,Object.keys(Ka).forEach(r=>Ka[r].classList.toggle("active",r===s.id))),s.beats.forEach((r,a)=>r.classList.toggle("on",a===n.beat)),s.nav.forEach((r,a)=>{a===n.beat?r.setAttribute("aria-current","step"):r.removeAttribute("aria-current")}),s.toggles.forEach(r=>{let a=(r.getAttribute("data-beats")||"").split(",").map(Number);r.setAttribute("aria-pressed",a.indexOf(n.beat)>=0?"true":"false")})}Le.forEach(i=>{i.nav.concat(i.toggles).forEach(e=>e.addEventListener("click",()=>{xn(),Ns(i.first+Number(e.getAttribute("data-beat")))})),i.more&&i.more.addEventListener("click",()=>xc(i,!i.open,!0));let t=i.details.querySelector(".less");t&&t.addEventListener("click",()=>{xc(i,!1,!1),Ns(i.first+i.count-1),i.more.focus()})});function xc(i,t,e){i.open!==t&&(i.open=t,i.details.classList.toggle("open",t),i.more.setAttribute("aria-expanded",t?"true":"false"),i.more.querySelector(".more-t").textContent=t?"Batafsilni yopish":"Batafsil",t&&xn(),vc(),t&&e&&wr(i.details),Ce&&to())}var Cf=Array.from(le.querySelectorAll("[data-os-pick]"));function Rf(){cn.setAttribute("data-os",br),Cf.forEach(i=>i.setAttribute("aria-pressed",i.getAttribute("data-os-pick")===br?"true":"false"))}Cf.forEach(i=>i.addEventListener("click",()=>{br=i.getAttribute("data-os-pick"),Ls.set("os",br),Rf(),hs()}));var gy=Array.from(le.querySelectorAll("main .sec")),Qh=Pe("btn-toc"),au=Pe("toc");Qh.addEventListener("click",()=>{let i=au.classList.toggle("open");Qh.setAttribute("aria-expanded",i?"true":"false")});function _y(){au.classList.remove("open"),Qh.setAttribute("aria-expanded","false")}function yc(i){let t=i&&Pe(i);if(!t||!cn.contains(t))return!1;xn();let e=t.closest(".scene"),n=e?Le.find(s=>s.el===e):null;return n&&Ce?t.closest(".details")?(xc(n,!0,!1),wr(t)):Ns(t===e?n.first:n.first+Math.max(0,Number(t.getAttribute("data-beat")||0))):wr(t),!0}le.addEventListener("click",i=>{let t=i.target.closest?i.target.closest('a[href^="#"]'):null;if(!t)return;let e=t.getAttribute("href").slice(1);!e||e.indexOf("=")>=0||yc(e)&&(i.preventDefault(),au.contains(t)&&_y(),window.history&&window.history.replaceState&&window.history.replaceState(null,"","#"+e))});window.addEventListener("hashchange",()=>{let i=window.location.hash.slice(1);i.indexOf("=")<0&&yc(i)});function Pf(){let i=cn.scrollHeight-window.innerHeight,t=i>0?Fn(window.scrollY/i,0,1):0;Pe("progress").style.transform="scaleX("+t.toFixed(4)+")"}function If(){if(Ce)return;let i=ja()+80,t=Le[0];for(let n of Le)if(n.el.getBoundingClientRect().top<=i)t=n;else break;let e=t.first;e!==jh&&(jh=e,vi=e,Af.textContent=t.i+1+" / "+Le.length,Object.keys(Ka).forEach(n=>Ka[n].classList.toggle("active",n===t.id)))}var jh=-1,Lf=i=>i.toLowerCase().replace(/[‘’ʻʼ`]/g,"'").replace(/\s+/g," "),xy=gy.map(i=>({el:i,title:i.getAttribute("data-title")||"",text:Lf(i.textContent)})),Ar=Pe("q"),Nf=Pe("results"),Sf=0;function Qa(){Nf.hidden=!0}function Df(){let i=Lf(Ar.value.trim()),t=Pe("results-list");if(t.textContent="",i.length<2){Qa();return}let e=0;xy.forEach(n=>{let s=n.text.indexOf(i);if(s<0)return;e++;let r=le.createElement("li"),a=le.createElement("a");a.href="#"+n.el.id;let o=n.el.closest(".scene"),l=o?Le.find(d=>d.el===o):null;a.textContent=n.title;let c=le.createElement("span");c.className="where",c.textContent=l?" \xB7 "+(l.i+1)+"-sahna":"";let h=le.createElement("span");h.className="snip";let f=Math.max(0,s-50);h.appendChild(le.createTextNode((f>0?"\u2026":"")+n.text.slice(f,s)));let u=le.createElement("mark");u.textContent=n.text.slice(s,s+i.length),h.appendChild(u),h.appendChild(le.createTextNode(n.text.slice(s+i.length,s+i.length+70)+"\u2026")),r.appendChild(a),r.appendChild(c),r.appendChild(h),t.appendChild(r)}),Pe("results-count").textContent=e?e+" ta bo\u2018limda topildi":"Hech narsa topilmadi",Nf.hidden=!1}Ar.addEventListener("input",()=>{clearTimeout(Sf),Sf=setTimeout(Df,120)});Ar.addEventListener("keydown",i=>{if(i.key==="Escape"&&(Ar.value="",Qa()),i.key==="Enter"){Df();let t=le.querySelector("#results-list a");t&&(t.click(),Qa())}});Pe("results-close").addEventListener("click",Qa);Pe("results-list").addEventListener("click",i=>{i.target.closest&&i.target.closest("a")&&Qa()});le.addEventListener("keydown",i=>{let t=(i.target.tagName||"").toLowerCase();i.key==="/"&&t!=="input"&&t!=="select"&&t!=="textarea"&&(i.preventDefault(),Ar.focus())});var Xe={on:!1,T:.2,acc:0},Er=Pe("btn-auto"),yy=Pe("auto-speed");function xn(i){Xe.on&&(Xe.on=!1,Er.setAttribute("aria-pressed","false"),Er.textContent="\u25B6 Avto namoyish",i&&$a(i))}function vy(){Ce&&(vc(),Xe.T=ct.Tt>=Mi-.25?.2:ct.Tt,Xe.acc=0,Xe.on=!0,Er.setAttribute("aria-pressed","true"),Er.textContent="\u23F8 Pauza",hs())}function My(i){let t=parseFloat(yy.value)||1;if(su()){if(Xe.acc+=i*t,Xe.acc<4.5)return;Xe.acc=0,Xe.T=Math.floor(Xe.T-.2)+1.5}else Xe.T+=i*t/3.4;Xe.T>=Mi-.2&&(Xe.T=Mi-.2,xn("Namoyish tugadi."));let e=iu(Math.floor(Xe.T));if(e.open&&Xe.T>e.t1-.05){xn("\u201CBatafsil\u201D ochiq \u2014 avto namoyish to\u2018xtatildi.");return}let n=cy(Xe.T);n!==null&&window.scrollTo(0,Math.round(n)),ct.ambUntil=performance.now()+ru}Er.addEventListener("click",()=>{Xe.on?xn():vy()});function Uf(i){let t=Hn[Fn(vi,0,Mi-1)].scene,e=Le[Fn(t+i,0,Le.length-1)];Ce?(Ns(e.first),Xe.on&&(Xe.T=e.t0)):wr(e.el)}Pe("scene-prev").addEventListener("click",()=>Uf(-1));Pe("scene-next").addEventListener("click",()=>Uf(1));var Sy=i=>i&&i.closest&&i.closest(".auto-group"),by=i=>{Xe.on&&!Sy(i.target)&&xn("Avto namoyish to\u2018xtatildi.")};["wheel","touchstart","pointerdown","keydown"].forEach(i=>window.addEventListener(i,by,{passive:!0}));le.addEventListener("selectionchange",()=>{let i=window.getSelection();Xe.on&&i&&!i.isCollapsed&&xn("Avto namoyish to\u2018xtatildi.")});le.addEventListener("copy",()=>xn("Avto namoyish to\u2018xtatildi."));var Is=Pe("gl");function Ff(){let i=le.createElement("canvas");i.id="gl",Is.parentNode.replaceChild(i,Is),Is=i,Is.addEventListener("webglcontextlost",Bf)}function wy(){return sn.quality==="high"||sn.quality==="light"?sn.quality:Math.min(window.innerWidth,window.innerHeight)<700||nu("(pointer: coarse)").matches?"light":"high"}function Ty(){if(ct.world)return!0;let i=wy(),t=null;try{t=Zh(Is,{quality:i,holds:Hn,strict:!sn.quality})}catch{t=null}if(!t)try{Ff(),i="light",t=Zh(Is,{quality:"light",holds:Hn,strict:!1}),ct.software=!0}catch{t=null}return t?(ct.world=t,ct.quality=i,ct.renderMs=[],ct.frames=0,ct.lost=!1,Tr.length||fy(),!0):!1}function Of(){if(ct.raf&&window.cancelAnimationFrame(ct.raf),ct.raf=0,!ct.world)return;let i=ct.world;ct.world=null,ct.disposing=!0,i.dispose(),ct.disposing=!1,Kh(0),Ff()}function Bf(i){ct.disposing||!ct.world||(i.preventDefault(),ct.world=null,ct.raf=0,Ja=!0,Cr(),$a("3D ko\u2018rinish to\u2018xtadi (grafika konteksti yo\u2018qoldi). Oddiy rejimga o\u2018tildi."))}Is.addEventListener("webglcontextlost",Bf);function ou(){if(cn.style.setProperty("--bar-h",ja()+"px"),!Ce||!ct.world)return;let i=window.innerWidth,t=window.innerHeight,e=ct.quality==="light"?ct.software?1:1.25:ct.quality==="high-noshadow"?1.25:1.5;ct.world.resize(i,t,Math.min(window.devicePixelRatio||1,e),kf()),vc(),hs()}function kf(){let i=window.innerWidth,t=window.innerHeight,e=ja(),n;if(wf.matches)n={x:0,y:e+34,w:i,h:Math.max(80,t-e-42-Le[0].panel.offsetHeight)};else{let s=cn.classList.contains("reading")?Le.find(o=>o.open):null,r=(s?s.details:Le[0].panel).getBoundingClientRect(),a=Math.round(r.left+r.width+12);i-a<260&&(a=Math.round(Le[0].panel.getBoundingClientRect().right+12)),n={x:a,y:e,w:Math.max(80,i-a),h:t-e}}return ct.free=n,n}var _c=Pe("btn-plain"),tu=Pe("btn-anim");function Cr(){let i=!$h&&!Ja;i&&!Ce?Ty()?Ce=!0:(Ja=!0,cn.classList.add("no-webgl")):!i&&Ce&&(Of(),Ce=!1),cn.classList.toggle("gl",Ce),cn.classList.toggle("plain",!Ce),cn.classList.toggle("anim",!su()),_c.setAttribute("aria-pressed",Ce?"false":"true"),_c.disabled=Ja,_c.title=Ja?"Bu brauzerda 3D (WebGL) mavjud emas \u2014 faqat oddiy rejim":"Sahnasiz, oddiy matnli ko\u2018rinish",tu.setAttribute("aria-pressed",Sr?"true":"false"),tu.textContent=Sr?"Animatsiya: yoqilgan":"Animatsiya: o\u2018chirilgan",Er.disabled=!Ce,Pe("scene-prev").disabled=!1,Ce||xn(),vi=-1,jh=-1,Ce&&(ou(),ct.T=ct.Tt=Mc(window.scrollY),hs()),Ef(),If()}_c.addEventListener("click",()=>{xn();let i=Hn[Fn(vi,0,Mi-1)]?Le[Hn[Fn(vi,0,Mi-1)].scene]:Le[0];$h=Ce,Ls.set("plain",$h?"1":"0"),Cr(),Ce?Ns(i.first):wr(i.el)});tu.addEventListener("click",()=>{Sr=!Sr,Ls.set("anim",Sr?"1":"0"),Cr()});Jh.addEventListener&&Jh.addEventListener("change",Cr);Pe("btn-print").addEventListener("click",()=>{xn(),window.print()});var eu=!1;function Ay(){if(eu=!1,Pf(),Ce){let i=window.scrollY,t=Mc(i);t!==ct.Tt&&(ct.Tt=t,hs());let e=Le.some(n=>n.open&&i>=n.y1-2&&i<n.yd);e!==cn.classList.contains("reading")&&(cn.classList.toggle("reading",e),ct.world&&(ct.world.setFree(kf()),hs()))}else If()}window.addEventListener("scroll",()=>{eu||(eu=!0,window.requestAnimationFrame(Ay))},{passive:!0});var bf=0;window.addEventListener("resize",()=>{clearTimeout(bf),bf=setTimeout(ou,80)});if(window.ResizeObserver){let i=0;new window.ResizeObserver(()=>{clearTimeout(i),i=setTimeout(()=>{vc(),Ce&&hs()},60)}).observe(Pe("content"))}le.addEventListener("visibilitychange",()=>{ct.visible=!le.hidden,le.hidden?xn():Ce&&to()});window.IntersectionObserver&&new window.IntersectionObserver(i=>{ct.onscreen=i[i.length-1].isIntersecting,ct.onscreen&&Ce&&to()}).observe(Pe("stage3d"));window.addEventListener("pagehide",()=>{xn(),Of(),Ce=!1});window.addEventListener("pageshow",i=>{i.persisted&&Cr()});window.addEventListener("beforeprint",()=>{Le.forEach(i=>i.details.classList.add("print-open"))});window.addEventListener("afterprint",()=>{Le.forEach(i=>i.details.classList.remove("print-open"))});cn.getAttribute("data-variant")==="admin"&&window.parent!==window&&(cn.classList.add("embedded"),le.addEventListener("keydown",i=>{i.key==="Escape"&&le.activeElement!==Ar&&window.parent.postMessage({type:"ds-help-close"},window.location.origin)}));Rf();sn.labels==="0"&&cn.classList.add("no-labels");Cr();Pf();{let i=sn.scene&&Le.find(t=>t.id===sn.scene);if(i){if(sn.open){let t=Pe(sn.open);t&&i.el.contains(t)&&xc(i,!0,!1)}sn.open&&Pe(sn.open)?yc(sn.open):Ns(i.first+Fn(Number(sn.beat||0),0,i.count-1))}else window.location.hash.length>1&&window.location.hash.indexOf("=")<0&&yc(window.location.hash.slice(1));Ce&&(ct.Tt=ct.T=Mc(window.scrollY),hs())}sn.debug==="1"&&(window.__dsGuide={state:()=>({T:ct.T,Tt:ct.Tt,hold:vi,gl:Ce,frames:ct.frames,rendering:!!ct.raf,open:Le.filter(i=>i.open).map(i=>i.id),auto:Xe.on,quality:ct.quality,reading:cn.classList.contains("reading"),y:Math.round(window.scrollY)})});if(sn.perf==="1"){let i=le.createElement("pre");i.id="perf-out",i.hidden=!0,le.body.appendChild(i);let t=e=>{let n=e.slice().sort((r,a)=>r-a),s=r=>n.length?n[Math.min(n.length-1,Math.floor(r*n.length))]:0;return{n:n.length,median:+s(.5).toFixed(2),p95:+s(.95).toFixed(2),max:+(n[n.length-1]||0).toFixed(2)}};setTimeout(()=>{let e=[],n=ct.renderMs.length,s=cn.scrollHeight-window.innerHeight,r=Number(sn.dur||2e4),a=0,o=0,l=c=>{a?e.push(c-o):a=o=c,o=c;let h=Math.min(1,(c-a)/r);if(window.scrollTo(0,Math.round(h*s)),h<1){window.requestAnimationFrame(l);return}let f=ct.renderMs.slice(n),u=ct.frames;setTimeout(()=>{let d=ct.frames;setTimeout(()=>{i.textContent=JSON.stringify({quality:ct.quality,software:!!ct.software,gl:Ce,dpr:window.devicePixelRatio,viewport:[window.innerWidth,window.innerHeight],rafDeltaMs:t(e),renderCpuMs:t(f),framesDuringScroll:u,framesWhileIdle3s:ct.frames-d,info:ct.world?{calls:ct.world.info.render.calls,triangles:ct.world.info.render.triangles,geometries:ct.world.info.memory.geometries,textures:ct.world.info.memory.textures}:null}),i.hidden=!1},3e3)},ru+1500)};window.requestAnimationFrame(l)},1500)}})();
