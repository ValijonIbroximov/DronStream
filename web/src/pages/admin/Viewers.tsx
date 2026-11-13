import { get, post, fmtAgo, fmtBytes, fmtTime } from '../../api'
import { useServerEvents } from '../../events'
import { Dot, useAction, useLoad } from '../../components/ui'

interface WebSess {
  id: number
  kind: 'user' | 'guest' | 'link'
  role: string
  name: string
  username?: string
  userId?: number
  guestId?: number
  ip: string
  userAgent: string
  createdAt: number
  lastSeen: number
  expiresAt: number
  mediaCount: number
  online: boolean
  openTabs: number
}
interface Media {
  id: number
  webSessionId: number
  subjectType: string
  subjectId: number
  subjectName: string
  streamId: number
  streamName: string
  tab: string
  status: 'pending' | 'active' | 'ended'
  createdAt: number
  establishedAt: number | null
  lastSeen: number
  leaseUntil: number
  remoteAddr: string
  userAgent: string
  bytesSent: number
  endedAt?: number
  endReason?: string
}

const END_REASONS: Record<string, string> = {
  permission_revoked: 'ruxsat bekor qilindi',
  permission_expired: 'ruxsat muddati tugadi',
  kicked_by_admin: 'admin uzdi',
  user_blocked: 'hisob bloklandi',
  guest_ended: 'mehmon yakunlandi',
  session_ended: 'sessiya yakunlandi',
  stream_closed: 'stream yopildi',
  emergency_stop: 'favqulodda to‘xtatish',
  client_closed: 'tomoshabin yopdi',
  disconnected: 'aloqa uzildi',
  lease_expired: 'ijara tugadi (yangilandi)',
  auth_unavailable: 'ruxsat xizmati ishlamadi',
}

export default function Viewers() {
  const sess = useLoad(() => get<WebSess[]>('/api/admin/sessions'), [], 5000)
  const media = useLoad(() => get<{ live: Media[]; recent: Media[] }>('/api/admin/media'), [], 3000)
  const { busy, run } = useAction()
  useServerEvents((e) => {
    if (e.kind === 'media') media.reload()
    if (e.kind === 'sessions') sess.reload()
  })
  const reload = () => (sess.reload(), media.reload())
  const live = media.data?.live || []

  return (
    <div className="page">
      <h1>Faol sessiyalar</h1>
      <div className="alert info small">
        "Saytda online" — brauzer sahifani ochiq tutib turibdi. "Videoga ulangan" — server shu sessiyaga video yuboryapti. Bularning hech biri ekran
        qarshisida inson tomosha qilayotganini isbotlamaydi. IP manzil faqat diagnostika uchun; u shaxsni tasdiqlamaydi.
      </div>

      <h2>Videoga ulanishlar ({live.length})</h2>
      <div className="card scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Kim</th>
              <th>Stream</th>
              <th>Holat</th>
              <th>Ulangan</th>
              <th>Oxirgi faol</th>
              <th>Ijara</th>
              <th>Uzatilgan</th>
              <th>Manzil (ICE)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {live.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.subjectType === 'guest' && <span className="guest-badge">Mehmon</span>} {m.subjectType === 'link' && <span className="guest-badge">Havola</span>} {m.subjectName}
                  <div className="muted small">sessiya #{m.webSessionId} · tab {m.tab}</div>
                </td>
                <td>{m.streamName}</td>
                <td>{m.status === 'active' ? <><Dot on /> videoga ulangan</> : 'ulanmoqda'}</td>
                <td>{fmtTime(m.establishedAt || m.createdAt)}</td>
                <td>{fmtAgo(m.lastSeen)}</td>
                <td>{fmtTime(m.leaseUntil)}</td>
                <td>{fmtBytes(m.bytesSent)}</td>
                <td className="small">{m.remoteAddr}</td>
                <td>
                  <button disabled={busy} onClick={() => run(() => post(`/api/admin/media/${m.id}/kick`).then(reload), { ok: 'Uzildi (ruxsat saqlanadi — butunlay to‘xtatish uchun ruxsatni olib tashlang)' })}>
                    Uzish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Sessiyalar (login va mehmon)</h2>
      <div className="card scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Kim</th>
              <th>Saytda</th>
              <th>Video</th>
              <th>Kirgan</th>
              <th>Oxirgi faol</th>
              <th>IP / brauzer</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sess.data?.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.kind === 'guest' ? <span className="guest-badge">Mehmon</span> : s.kind === 'link' ? <span className="guest-badge">Maxsus havola</span> : <span className="tag">{s.role}</span>} {s.name}
                  {s.username && <span className="muted small"> ({s.username})</span>}
                  <div className="muted small">sessiya #{s.id}</div>
                </td>
                <td>
                  <Dot on={s.online} /> {s.online ? `online (${s.openTabs} tab)` : 'yo‘q'}
                </td>
                <td>{s.mediaCount > 0 ? `${s.mediaCount} ta ulanish` : '—'}</td>
                <td>{fmtTime(s.createdAt)}</td>
                <td>{fmtAgo(s.lastSeen)}</td>
                <td className="small">
                  {s.ip}
                  <div className="ua muted">{s.userAgent}</div>
                </td>
                <td>
                  <button className="danger" disabled={busy} onClick={() => run(() => post(`/api/admin/sessions/${s.id}/revoke`).then(reload), { confirm: 'Bu sessiya yakunlansinmi? (videolari ham uziladi)', ok: 'Sessiya yakunlandi' })}>
                    Yakunlash
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Oxirgi uzilgan ulanishlar</h2>
      <div className="card scroll-x">
        <table className="table small">
          <tbody>
            {media.data?.recent.map((m) => (
              <tr key={m.id}>
                <td>{fmtTime(m.endedAt)}</td>
                <td>
                  {m.subjectType === 'guest' && 'Mehmon: '}
                  {m.subjectName}
                </td>
                <td>{m.streamName}</td>
                <td>{END_REASONS[m.endReason || ''] || m.endReason}</td>
                <td>{fmtBytes(m.bytesSent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
