import { useState } from 'react'
import { get, post, put, fmtTime, fmtAgo, tashkentInputToUTC, utcToTashkentInput } from '../../api'
import { useServerEvents } from '../../events'
import { Modal, useAction, useLoad } from '../../components/ui'
import AccessWizard, { type WizardPreset } from '../../components/AccessWizard'
import ShareDialog, { type Share } from '../../components/ShareDialog'
import PreviewModal from '../../components/PreviewModal'

export interface LinkRow {
  id: number
  name: string
  preset: 'once' | 'multi' | 'timed' | 'custom'
  maxUses: number | null
  usesCount: number
  maxParallel: number | null
  startsAt: number | null
  endsAt: number | null
  sessionMinutes: number
  forUserId: number | null
  forUserName: string
  note: string
  createdAt: number
  revokedAt: number | null
  activeSessions: number
  status: 'pending' | 'active' | 'expired' | 'used_up' | 'revoked'
  statusText: string
  remaining: number | null
}
interface GrantRow {
  id: number
  subjectId: number
  objectType: 'content' | 'collection'
  objectId: number
  objectTitle: string
  includeFuture: boolean
}

const PRESET_LABEL = { once: 'Bir martalik', multi: 'Bir necha martalik', timed: 'Vaqtinchalik', custom: 'Maxsus sozlangan' }
const FILTERS = [
  { v: '', l: 'Hammasi' },
  { v: 'active', l: 'Faol' },
  { v: 'pending', l: 'Kutilmoqda' },
  { v: 'expired', l: 'Tugagan' },
  { v: 'used_up', l: 'Limit tugagan' },
  { v: 'revoked', l: 'Bekor qilingan' },
]

export default function Links() {
  const links = useLoad(() => get<LinkRow[]>('/api/admin/links'), [], 10000)
  const grants = useLoad(() => get<GrantRow[]>('/api/admin/grants?subjectType=link'), [], 15000)
  const [filter, setFilter] = useState('')
  const [q, setQ] = useState('')
  const [wizard, setWizard] = useState<WizardPreset | null>(null)
  const [share, setShare] = useState<Share | null>(null)
  const [edit, setEdit] = useState<LinkRow | null>(null)
  const [sessFor, setSessFor] = useState<LinkRow | null>(null)
  const [preview, setPreview] = useState<LinkRow | null>(null)
  const { busy, run } = useAction()
  useServerEvents((e) => ['links', 'sessions'].includes(e.kind) && links.reload())
  const reload = () => (links.reload(), grants.reload())

  const rows = (links.data || []).filter((l) => (!filter || l.status === filter) && (!q || l.name.toLowerCase().includes(q.toLowerCase())))
  const resOf = (id: number) => (grants.data || []).filter((g) => g.subjectId === id)

  const openShare = (l: LinkRow) => run(async () => setShare((await get<{ share: Share }>(`/api/admin/links/${l.id}/share`)).share))
  const revoke = (l: LinkRow) => {
    if (l.activeSessions > 0) {
      const t = window.prompt(`"${l.name}" bekor qilinsa ${l.activeSessions} ta ochiq sessiya va ularning videolari darhol uziladi. Tasdiqlash uchun BEKOR deb yozing:`)
      if (t !== 'BEKOR') return
    } else if (!window.confirm(`"${l.name}" bekor qilinsinmi?`)) return
    run(() => post(`/api/admin/links/${l.id}/revoke`).then(reload), { ok: 'Havola bekor qilindi' })
  }
  const regenerate = (l: LinkRow) => {
    if (!window.confirm('Eski havola (va QR) ishlamay qoladi, yangi havola yaratiladi. Davom etasizmi?')) return
    const end = l.activeSessions > 0 && window.confirm(`Mavjud ${l.activeSessions} ta sessiya ham yakunlansinmi? (Bekor = sessiyalar davom etadi)`)
    run(async () => {
      const r = await post<{ share: Share }>(`/api/admin/links/${l.id}/regenerate`, { endSessions: end })
      setShare(r.share)
      reload()
    })
  }
  const template = (l: LinkRow) =>
    setWizard({
      mode: 'link',
      preset: l.preset === 'custom' ? 'multi' : l.preset,
      name: l.name + ' (nusxa)',
      objects: resOf(l.id).map((g) => ({ type: g.objectType, id: g.objectId, includeFuture: g.includeFuture })),
      maxUses: l.maxUses || 3,
      maxParallel: l.maxParallel || 1,
      sessionMinutes: l.sessionMinutes,
    })

  return (
    <div className="page">
      <div className="row between">
        <h1>Maxsus havolalar</h1>
        <button className="primary" onClick={() => setWizard({ mode: 'link' })}>
          + Havola yaratish
        </button>
      </div>
      <p className="muted small">
        Havola — faqat taklif: uni ochgan odam kirish so'rovini yuboradi, siz esa "Kirish so'rovlari" bo'limida tomoshabin aytgan tekshirish kodi bilan aynan o'sha brauzerni
        tasdiqlaysiz. Havolani ochish yoki so'rov yuborish hech narsa sarflamaydi — foydalanish tasdiqlaganingizda sanaladi. Oluvchi nomi tasdiqlangan shaxs emas. "Faol
        sessiyalar" — tasdiqlangan sessiyalar soni. Barcha vaqtlar Toshkent vaqtida (UTC+5).
      </p>
      <div className="filters">
        <input placeholder="Nomi bo'yicha qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tabs" style={{ margin: 0 }}>
          {FILTERS.map((f) => (
            <button key={f.v} className={filter === f.v ? 'active' : ''} onClick={() => setFilter(f.v)}>
              {f.l}
            </button>
          ))}
        </div>
      </div>
      {links.err && <div className="alert error">{links.err}</div>}
      {rows.length === 0 && <p className="muted">Havola yo'q.</p>}
      <div className="stream-list">
        {rows.map((l) => (
          <div className="card" key={l.id}>
            <div className="row between">
              <h3>{l.name}</h3>
              <span className={`status ${l.status}`}>{l.statusText}</span>
            </div>
            <div className="kv small">
              <span>Turi</span>
              <span>{PRESET_LABEL[l.preset]}</span>
              <span>Resurslar</span>
              <span>{resOf(l.id).map((g) => g.objectTitle + (g.objectType === 'collection' ? (g.includeFuture ? ' (dinamik)' : '') : '')).join(', ') || '—'}</span>
              <span>Amal qilish</span>
              <span>
                {l.startsAt ? fmtTime(l.startsAt) : 'hozirdan'} → {l.endsAt ? fmtTime(l.endsAt) : 'muddat belgilanmagan'}
              </span>
              <span>Foydalanish</span>
              <span>{l.maxUses ? `${l.usesCount} / ${l.maxUses} (qolgan: ${l.remaining})` : `${l.usesCount} (cheklanmagan)`}</span>
              <span>Faol sessiyalar</span>
              <span>
                {l.activeSessions}
                {l.maxParallel ? ` / ${l.maxParallel}` : ''}
              </span>
              <span>Sessiya davomiyligi</span>
              <span>{l.sessionMinutes} daqiqa</span>
              {l.forUserName && (
                <>
                  <span>Bog'langan hisob</span>
                  <span>{l.forUserName}</span>
                </>
              )}
              <span>Yaratilgan</span>
              <span>{fmtTime(l.createdAt)}</span>
            </div>
            <div className="row gap wrap">
              {l.status !== 'revoked' && (
                <button className="primary" disabled={busy} onClick={() => openShare(l)}>
                  Ulashish / QR
                </button>
              )}
              <button onClick={() => setSessFor(l)}>Sessiyalar ({l.activeSessions})</button>
              <button onClick={() => setPreview(l)}>Nimani ko'radi?</button>
              {l.status !== 'revoked' && <button onClick={() => setEdit(l)}>Cheklovlar</button>}
              <button onClick={() => template(l)}>Shablon sifatida</button>
              {l.status !== 'revoked' && (
                <button disabled={busy} onClick={() => regenerate(l)}>
                  Havolani yangilash
                </button>
              )}
              {l.status !== 'revoked' && (
                <button className="danger" disabled={busy} onClick={() => revoke(l)}>
                  Bekor qilish
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {wizard && <AccessWizard initial={wizard} onClose={() => setWizard(null)} onDone={() => (setWizard(null), reload())} />}
      {share && <ShareDialog share={share} onClose={() => setShare(null)} />}
      {edit && <EditLimits l={edit} onClose={() => setEdit(null)} onDone={() => (setEdit(null), reload())} />}
      {sessFor && <LinkSessions l={sessFor} onClose={() => setSessFor(null)} onChange={reload} />}
      {preview && <PreviewModal subjectType="link" subjectId={preview.id} title={preview.name} onClose={() => setPreview(null)} />}
    </div>
  )
}

function EditLimits({ l, onClose, onDone }: { l: LinkRow; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    name: l.name,
    maxUses: l.maxUses ?? 0,
    maxParallel: l.maxParallel ?? 1,
    sessionMinutes: l.sessionMinutes,
    startsAt: l.startsAt ? utcToTashkentInput(l.startsAt) : '',
    endsAt: l.endsAt ? utcToTashkentInput(l.endsAt) : '',
  })
  const { busy, run } = useAction()
  return (
    <Modal title={`Cheklovlar: ${l.name}`} onClose={onClose}>
      <div className="form">
        <label>
          Nomi
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label>
          Jami foydalanish (0 = cheklanmagan; hozir {l.usesCount} ishlatilgan)
          <input type="number" min={0} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: Number(e.target.value) })} />
        </label>
        <label>
          Parallel faol sessiyalar
          <input type="number" min={1} value={f.maxParallel} onChange={(e) => setF({ ...f, maxParallel: Number(e.target.value) })} />
        </label>
        <label>
          Sessiya davomiyligi (daqiqa)
          <input type="number" min={5} value={f.sessionMinutes} onChange={(e) => setF({ ...f, sessionMinutes: Number(e.target.value) })} />
        </label>
        <label>
          Boshlanish (Toshkent vaqti, ixtiyoriy)
          <input type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
        </label>
        <label>
          Tugash (Toshkent vaqti) — qisqartirilsa ochiq sessiyalar ham shu vaqtda yopiladi
          <input type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
        </label>
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            run(
              () =>
                put(`/api/admin/links/${l.id}`, {
                  name: f.name,
                  maxUses: f.maxUses > 0 ? f.maxUses : null,
                  maxParallel: f.maxParallel,
                  sessionMinutes: f.sessionMinutes,
                  startsAt: f.startsAt ? tashkentInputToUTC(f.startsAt) : null,
                  endsAt: f.endsAt ? tashkentInputToUTC(f.endsAt) : null,
                }).then(onDone),
              { ok: 'Qo‘llandi' },
            )
          }
        >
          Qo'llash
        </button>
      </div>
    </Modal>
  )
}

interface SessRow {
  id: number
  kind: string
  linkId?: number
  ip: string
  userAgent: string
  createdAt: number
  lastSeen: number
  expiresAt: number
  online: boolean
  mediaCount: number
}

function LinkSessions({ l, onClose, onChange }: { l: LinkRow; onClose: () => void; onChange: () => void }) {
  const s = useLoad(() => get<SessRow[]>('/api/admin/sessions'), [], 5000)
  const { busy, run } = useAction()
  const rows = (s.data || []).filter((x) => x.kind === 'link' && x.linkId === l.id)
  return (
    <Modal title={`Havola sessiyalari: ${l.name}`} onClose={onClose} wide>
      <p className="muted small">Har bir qator — alohida brauzer sessiyasi (bitta foydalanish). IP faqat diagnostika uchun.</p>
      {rows.length === 0 && <p className="muted">Faol sessiya yo'q.</p>}
      <table className="table small">
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td>#{x.id}</td>
              <td>{x.online ? 'saytda online' : 'yo‘q'}</td>
              <td>{x.mediaCount} video</td>
              <td>ochilgan {fmtTime(x.createdAt)}</td>
              <td>oxirgi faol {fmtAgo(x.lastSeen)}</td>
              <td>tugaydi {fmtTime(x.expiresAt)}</td>
              <td>
                {x.ip}
                <div className="ua muted">{x.userAgent}</div>
              </td>
              <td>
                <button className="danger" disabled={busy} onClick={() => run(() => post(`/api/admin/sessions/${x.id}/revoke`).then(() => (s.reload(), onChange())), { confirm: 'Shu sessiya uzilsinmi?', ok: 'Uzildi' })}>
                  Uzish
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}
