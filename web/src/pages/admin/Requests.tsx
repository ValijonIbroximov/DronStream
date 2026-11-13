import { useState } from 'react'
import { get, post, fmtTime, fmtAgo, tashkentInputToUTC } from '../../api'
import { useServerEvents } from '../../events'
import { Dot, Modal, durationOptions, toLocalInput, useAction, useLoad } from '../../components/ui'
import ObjectPicker, { type CollectionLite, type ContentLite, type Pick } from '../../components/ObjectPicker'

export interface Guest {
  id: number
  displayName: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'ended'
  createdAt: number
  decidedAt: number | null
  decidedBy: string
  note: string
  accessUntil: number | null
  ip: string
  userAgent: string
  sessionId: number
  online: boolean
  verifyCode: string
}

interface LinkRequest {
  sessionId: number
  linkId: number
  linkName: string
  verifyCode: string
  createdAt: number
  ip: string
  userAgent: string
}

// Special-link requests: the administrator approves one exact browser session.
// The code must be the one the visitor reads out from their own screen.
function LinkRequests() {
  const { data, err, reload } = useLoad(() => get<LinkRequest[]>('/api/admin/approvals'), [], 5000)
  const [codes, setCodes] = useState<Record<number, string>>({})
  const { busy, run } = useAction()
  useServerEvents((e) => ['sessions', 'links'].includes(e.kind) && reload())
  if (!data || data.length === 0) return err ? <div className="alert error">{err}</div> : null
  return (
    <div className="card">
      <h2>Maxsus havola orqali kirish so'rovlari ({data.length})</h2>
      <p className="muted small">
        Havolani olgan har kim so'rov yubora oladi — havolaning o'zi kirish huquqi emas. Tomoshabin ekranidagi tekshirish kodini undan ishonchli yo'l bilan
        (masalan telefon orqali) so'rang va shu yerga yozing: faqat kod mos kelsa aynan shu brauzer sessiyasi tasdiqlanadi. IP va brauzer faqat ma'lumot uchun,
        shaxsni tasdiqlamaydi.
      </p>
      <div className="stream-list">
        {data.map((r) => (
          <div className="card inner" key={r.sessionId}>
            <div className="row between">
              <b>{r.linkName}</b>
              <span className="muted small">{fmtAgo(r.createdAt)}</span>
            </div>
            <div className="kv small">
              <span>So'rov vaqti</span>
              <span>{fmtTime(r.createdAt)}</span>
              <span>IP (shaxsni tasdiqlamaydi)</span>
              <span>{r.ip}</span>
              <span>Brauzer</span>
              <span className="ua">{r.userAgent}</span>
            </div>
            <div className="row gap wrap">
              <input
                className="mono"
                placeholder="Tomoshabin aytgan kod (XXX-XXX)"
                value={codes[r.sessionId] || ''}
                onChange={(e) => setCodes({ ...codes, [r.sessionId]: e.target.value })}
                aria-label="Tekshirish kodi"
              />
              <button
                className="primary"
                disabled={busy || !(codes[r.sessionId] || '').trim()}
                onClick={() => run(() => post(`/api/admin/approvals/${r.sessionId}/approve`, { verifyCode: codes[r.sessionId] }).then(reload), { ok: 'Tasdiqlandi' })}
              >
                Tasdiqlash
              </button>
              <button disabled={busy} onClick={() => run(() => post(`/api/admin/approvals/${r.sessionId}/reject`).then(reload), { ok: 'Rad etildi' })}>
                Rad etish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS = [
  { s: 'pending', l: 'Kutilayotgan' },
  { s: 'approved', l: 'Tasdiqlangan' },
  { s: 'rejected', l: 'Rad etilgan' },
  { s: 'ended', l: 'Yakunlangan' },
]

export default function Requests() {
  const [tab, setTab] = useState('pending')
  const { data, err, reload } = useLoad(() => get<Guest[]>(`/api/admin/guests?status=${tab}`), [tab], 5000)
  const [approving, setApproving] = useState<Guest | null>(null)
  const { busy, run } = useAction()
  useServerEvents((e) => ['guest_request', 'guests', 'sessions'].includes(e.kind) && reload())

  return (
    <div className="page">
      <h1>Kirish so'rovlari</h1>
      <LinkRequests />
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.s} className={tab === t.s ? 'active' : ''} onClick={() => setTab(t.s)}>
            {t.l}
          </button>
        ))}
      </div>
      {err && <div className="alert error">{err}</div>}
      {data?.length === 0 && <p className="muted">So'rov yo'q.</p>}
      <div className="stream-list">
        {data?.map((g) => (
          <div className="card" key={g.id}>
            <div className="row between">
              <h3>
                <span className="guest-badge">Mehmon</span> {g.displayName}
              </h3>
              <span className="muted small">
                <Dot on={g.online} title="saytda online" /> {g.online ? 'saytda online' : 'saytda emas'} · {fmtAgo(g.createdAt)}
              </span>
            </div>
            <p className="muted small">Ism foydalanuvchi o'zi yozgan matn — tasdiqlangan shaxs emas.</p>
            {g.status === 'pending' && g.verifyCode && (
              <p className="small">
                Tekshirish kodi: <b className="mono">{g.verifyCode}</b> — mehmon ekranidagi kod bilan ishonchli yo'l orqali solishtiring.
              </p>
            )}
            <div className="reason pre">{g.reason}</div>
            <div className="kv small">
              <span>So'rov vaqti</span>
              <span>{fmtTime(g.createdAt)}</span>
              <span>IP (diagnostika uchun, shaxsni tasdiqlamaydi)</span>
              <span>{g.ip}</span>
              <span>Brauzer</span>
              <span className="ua">{g.userAgent}</span>
              {g.decidedAt && (
                <>
                  <span>Qaror</span>
                  <span>
                    {fmtTime(g.decidedAt)} — {g.decidedBy}
                    {g.note && ` (${g.note})`}
                  </span>
                </>
              )}
              {g.accessUntil && (
                <>
                  <span>Ruxsat tugashi</span>
                  <span>{fmtTime(g.accessUntil)}</span>
                </>
              )}
            </div>
            <div className="row gap wrap">
              {(g.status === 'pending' || g.status === 'approved') && (
                <button className="primary" onClick={() => setApproving(g)}>
                  {g.status === 'pending' ? 'Tasdiqlash…' : "Ruxsatni o'zgartirish…"}
                </button>
              )}
              {(g.status === 'pending' || g.status === 'approved') && (
                <button
                  disabled={busy}
                  onClick={() => {
                    const note = window.prompt('Rad etish sababi (ixtiyoriy, mehmonga ko‘rinadi):') ?? null
                    if (note === null) return
                    run(() => post(`/api/admin/guests/${g.id}/reject`, { note }).then(reload), { ok: 'Rad etildi' })
                  }}
                >
                  Rad etish
                </button>
              )}
              {g.status !== 'ended' && (
                <button className="danger" disabled={busy} onClick={() => run(() => post(`/api/admin/guests/${g.id}/end`).then(reload), { confirm: 'Mehmon sessiyasi yakunlansinmi? Video darhol uziladi.', ok: 'Yakunlandi' })}>
                  Sessiyani yakunlash
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {approving && <ApproveModal g={approving} onClose={() => setApproving(null)} onDone={() => (setApproving(null), reload())} />}
    </div>
  )
}

function ApproveModal({ g, onClose, onDone }: { g: Guest; onClose: () => void; onDone: () => void }) {
  const [sel, setSel] = useState<Pick[]>([])
  const [minutes, setMinutes] = useState(120)
  const [custom, setCustom] = useState(toLocalInput(Date.now() + 2 * 3600_000))
  const [useCustom, setUseCustom] = useState(false)
  const [note, setNote] = useState('')
  const contents = useLoad(() => get<ContentLite[]>('/api/admin/contents'), [])
  const cols = useLoad(() => get<CollectionLite[]>('/api/admin/collections'), [])
  const { busy, run } = useAction()
  return (
    <Modal title={`Mehmonni tasdiqlash: ${g.displayName}`} onClose={onClose} wide>
      <div className="reason pre small">{g.reason}</div>
      <h4>Qaysi kontent / to'plamlar?</h4>
      {contents.data && cols.data && <ObjectPicker contents={contents.data} collections={cols.data} value={sel} onChange={setSel} />}
      <h4>Ruxsat muddati (Toshkent vaqti)</h4>
      <div className="row gap wrap">
        <select value={useCustom ? 'custom' : minutes} onChange={(e) => (e.target.value === 'custom' ? setUseCustom(true) : (setUseCustom(false), setMinutes(Number(e.target.value))))}>
          {durationOptions().map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
          <option value="custom">Aniq vaqtgacha…</option>
        </select>
        {useCustom && <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} />}
      </div>
      <label className="form">
        Izoh (ixtiyoriy)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </label>
      <button
        className="primary"
        disabled={busy || sel.length === 0}
        onClick={() =>
          run(
            () =>
              post(`/api/admin/guests/${g.id}/approve`, {
                objects: sel,
                until: useCustom ? tashkentInputToUTC(custom) : Date.now() + minutes * 60_000,
                note,
              }).then(onDone),
            { ok: 'Tasdiqlandi' },
          )
        }
      >
        Tasdiqlash ({sel.length})
      </button>
    </Modal>
  )
}
