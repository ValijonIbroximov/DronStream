import { useEffect, useState } from 'react'
import { get, post, fmtBytes, fmtTime } from '../../api'
import { useAction, useLoad } from '../../components/ui'

export default function System() {
  const { data, err, reload } = useLoad(() => get<any>('/api/admin/system'), [])
  const backups = useLoad(() => get<{ name: string; size: number; modified: number }[]>('/api/admin/backups'), [])
  const { busy, run } = useAction()
  const [guest, setGuest] = useState({ enabled: true, minutes: 120 })
  const [pass, setPass] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [pw, setPw] = useState({ old: '', new: '' })
  useEffect(() => {
    if (data?.state) setGuest({ enabled: data.state.guestEnabled, minutes: data.state.guestDefaultMinutes })
  }, [data])
  if (!data) return err ? <div className="alert error">{err}</div> : <div className="spinner" />
  const m = data.media
  const tls = data.tls
  return (
    <div className="page">
      <h1>Tarmoq va tizim sozlamalari</h1>
      <p className="muted small">
        Tarmoq parametrlari <code>{data.paths?.config}</code> faylida o'zgartiriladi va xizmatni qayta ishga tushirish talab qilinadi. Bu sahifa joriy
        qiymatlarni ko'rsatadi.
      </p>

      <div className="card">
        <h2>Versiya va joylashuv</h2>
        <div className="kv small">
          <span>DronStream</span>
          <span>{data.version}</span>
          <span>MediaMTX</span>
          <span>{data.mediamtxVersion}</span>
          <span>Konfiguratsiya</span>
          <code>{data.paths?.config}</code>
          <span>Ma'lumotlar (baza, backup)</span>
          <code>{data.paths?.data}</code>
          <span>Loglar</span>
          <code>{data.paths?.logs}</code>
          <span>Video yozib olish</span>
          <span>o'chiq (yozib olinmaydi)</span>
          <span>Tashqi analytics / telemetry</span>
          <span>yo'q</span>
        </div>
      </div>

      <div className="card">
        <h2>HTTPS (brauzer → server)</h2>
        <div className="kv small">
          <span>Manzil</span>
          <span>{data.web.listen}</span>
          <span>Foydalanuvchi kiritadigan nomlar</span>
          <span>{(data.web.publicHosts || []).join(', ')}</span>
          <span>Sertifikat</span>
          <span>
            {tls.mode === 'self-signed' ? <b className="bad">o'z-o'zidan imzolangan (brauzer ogohlantiradi)</b> : tls.mode}
            {tls.notAfter && ` · ${fmtTime(Date.parse(tls.notAfter))} gacha`}
          </span>
          <span>SHA-256</span>
          <code className="wrap-any">{tls.fingerprintSHA256}</code>
          <span>Nomlar</span>
          <span>{(tls.names || []).join(', ')}</span>
        </div>
      </div>

      <div className="card">
        <h2>Media (pult → server, server → brauzer)</h2>
        <div className="kv small">
          <span>RTMP (pult)</span>
          <span>{m.rtmp || "o'chiq"} — faqat VPN interfeysiga bog'lash tavsiya etiladi</span>
          <span>RTMPS (pult)</span>
          <span>{m.rtmps || "o'chiq"}</span>
          <span>Pult URL dagi host</span>
          <span>{m.publishHost}</span>
          <span>WebRTC ICE UDP</span>
          <span>{m.webrtcUdp}</span>
          <span>WebRTC ICE TCP</span>
          <span>{m.webrtcTcp || "o'chiq"}</span>
          <span>E'lon qilinadigan IP/nomlar</span>
          <span>{(m.webrtcHosts || []).join(', ') || 'faqat interfeys IP lari'}</span>
          <span>Ijara (lease)</span>
          <span>{m.leaseSeconds} s — backend javob bermasa ham sessiya shu muddatdan keyin yopiladi</span>
          <span>Ko'rish chiptasi</span>
          <span>{m.ticketTtlSeconds} s, bir martalik</span>
          <span>TURN</span>
          <span>
            {data.turn.mode}
            {data.turn.urls?.length ? ` · ${data.turn.urls.join(', ')}` : ''} · hisob {data.turn.credentialMinutes} daqiqa
          </span>
        </div>
        <h3>Internet orqali kirish uchun tekshiruv ro'yxati</h3>
        <ul className="small">
          <li>Server public IP ga ega bo'lishi yoki router/NAT da port yo'naltirilishi kerak: TCP {data.web.listen}, UDP {m.webrtcUdp}{m.webrtcTcp ? `, TCP ${m.webrtcTcp}` : ''}.</li>
          <li>CGNAT ortida (provayder umumiy IP bergan) port yo'naltirib bo'lmaydi — VPN, public IP li server yoki o'zingiz boshqaradigan TURN kerak.</li>
          <li>webrtc_additional_hosts ga public IP yoki domenni yozing, aks holda brauzer media portiga ulana olmaydi.</li>
          <li>Windows Firewall qoidalari: scripts\firewall-rules.ps1 (admin huquqi bilan, qo'lda tekshirib ishga tushiring).</li>
          <li>RTMP portini internetga ochmang: faqat VPN interfeysi/ruxsatlangan IP lar.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Mehmonlar</h2>
        <div className="row gap wrap">
          <label className="switch">
            <input type="checkbox" checked={guest.enabled} onChange={(e) => setGuest({ ...guest, enabled: e.target.checked })} /> "Mehmon sifatida kirish" yoqilgan
          </label>
          <label>
            Standart muddat (daqiqa){' '}
            <input type="number" min={5} max={43200} value={guest.minutes} onChange={(e) => setGuest({ ...guest, minutes: Number(e.target.value) })} />
          </label>
          <button disabled={busy} onClick={() => run(() => post('/api/admin/system/guest', guest).then(reload), { ok: 'Saqlandi' })}>
            Saqlash
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Backup</h2>
        <p className="muted small">
          Izchil snapshot (SQLite VACUUM INTO) + sozlama + sirlar, parol bilan shifrlanadi (Argon2id + AES-256-GCM). Parolni yo'qotsangiz backupni ochib
          bo'lmaydi. Fayl serverda saqlanadi: {data.paths?.data}\backups
        </p>
        <div className="row gap wrap">
          <input type="password" placeholder="Backup paroli (kamida 12 belgi)" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
          <button disabled={busy || pass.length < 12} onClick={() => run(() => post('/api/admin/backups', { passphrase: pass }).then(() => (setPass(''), backups.reload())), { ok: 'Backup yaratildi' })}>
            Backup yaratish
          </button>
        </div>
        <table className="table small">
          <tbody>
            {backups.data?.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td>{fmtBytes(b.size)}</td>
                <td>{fmtTime(b.modified)}</td>
                <td>
                  <a href={`/api/admin/backups/${encodeURIComponent(b.name)}`} download>
                    Yuklab olish
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Server holati (ko'chirish)</h2>
        <p className="small">
          Joriy holat: <b>{data.state.instanceState}</b>. Backupdan tiklangan server "standby" holatida ishga tushadi va hech narsa uzatmaydi — eski server bilan bir
          vaqtda ishlab ketmasligi uchun.
        </p>
        {data.state.instanceState !== 'active' && (
          <div className="row gap wrap">
            <input placeholder="ESKI SERVER O'CHIRILDI" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            <button className="primary" disabled={busy} onClick={() => run(() => post('/api/admin/system/instance', { state: 'active', confirm: confirmText }).then(reload), { ok: 'Server faollashtirildi' })}>
              Serverni faollashtirish
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Mening parolim</h2>
        <div className="row gap wrap">
          <input type="password" placeholder="Joriy parol" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} autoComplete="current-password" />
          <input type="password" placeholder="Yangi parol (10+)" value={pw.new} onChange={(e) => setPw({ ...pw, new: e.target.value })} autoComplete="new-password" />
          <button disabled={busy} onClick={() => run(() => post('/api/me/password', pw).then(() => setPw({ old: '', new: '' })), { ok: 'Parol almashtirildi' })}>
            Almashtirish
          </button>
        </div>
      </div>
    </div>
  )
}
