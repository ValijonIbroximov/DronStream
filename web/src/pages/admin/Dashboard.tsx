import { post, get, fmtAgo } from '../../api'
import { useServerEvents } from '../../events'
import { Dot, useAction, useLoad } from '../../components/ui'

export interface StreamStats {
  online: boolean
  onlineSince?: string
  sourceType?: string
  sourceAddr?: string
  codecs?: string[]
  width?: number
  height?: number
  inboundKbps: number
  outboundKbps: number
  readers: number
  framesInError: number
  inboundBytes: number
  measuredAt: number
}
export interface AdminStream {
  id: number
  name: string
  slug: string
  description: string
  publishMode: 'query' | 'path'
  hasKey: boolean
  keyVersion: number
  keySetAt: number | null
  publishEnabled: boolean
  viewingEnabled: boolean
  isDemo: boolean
  createdAt: number
  stats: StreamStats
  viewers: number
}

export default function Dashboard() {
  const { data, err, reload } = useLoad(() => get<any>('/api/admin/overview'), [], 3000)
  const { busy, run } = useAction()
  useServerEvents((e) => {
    if (['media', 'streams', 'sessions', 'guests', 'state'].includes(e.kind)) reload()
  })
  if (!data) return <div>{err ? <div className="alert error">{err}</div> : <div className="spinner" />}</div>
  const st = data.state
  const streams: AdminStream[] = data.streams
  const h = data.health
  return (
    <div className="page">
      <h1>Bosh sahifa</h1>
      <div className="cards">
        <div className="stat">
          <div className="stat-n">
            {streams.filter((s) => s.stats.online).length}/{streams.length}
          </div>
          <div className="muted">Efirdagi manbalar</div>
        </div>
        <div className="stat">
          <div className="stat-n">{data.mediaSessions}</div>
          <div className="muted">Videoga ulanishlar</div>
        </div>
        <div className="stat">
          <div className="stat-n">
            {data.onlineSessions}/{data.webSessions}
          </div>
          <div className="muted">Saytda online / faol sessiyalar</div>
        </div>
        <a className="stat link" href="#/requests">
          <div className="stat-n">{data.pendingGuests}</div>
          <div className="muted">Kutilayotgan so'rovlar</div>
        </a>
      </div>

      <div className="card">
        <h2>Tizim holati</h2>
        <div className="kv">
          <span>Ruxsat xizmati (baza)</span>
          <span>
            <Dot on={h.auth} /> {h.auth ? 'ishlayapti' : 'ISHLAMAYAPTI — barcha tomoshalar uzilgan'}
          </span>
          <span>Media server (MediaMTX)</span>
          <span>
            <Dot on={h.media} /> {h.media ? 'ishlayapti' : 'javob bermayapti'}
          </span>
          <span>Oxirgi nazorat sikli</span>
          <span>{fmtAgo(h.lastReconcile)}</span>
          <span>Oxirgi majburiy uzish davomiyligi</span>
          <span>{h.lastEnforceMicros ? (h.lastEnforceMicros / 1000).toFixed(1) + ' ms' : '—'}</span>
        </div>
      </div>

      <div className={`card ${st.emergencyStop ? 'danger' : ''}`}>
        <h2>Favqulodda to'xtatish</h2>
        <p className="muted">Barcha tomoshabinlarning video ulanishlari darhol uziladi va yangilari rad etiladi. Pultlardan qabul qilish davom etadi.</p>
        {st.emergencyStop ? (
          <button className="primary" disabled={busy} onClick={() => run(() => post('/api/admin/emergency', { on: false }).then(reload), { ok: 'Tomosha qayta ochildi' })}>
            Tomoshani qayta ochish
          </button>
        ) : (
          <button
            className="danger"
            disabled={busy}
            onClick={() =>
              run(() => post('/api/admin/emergency', { on: true }).then(reload), { confirm: 'Barcha tomoshani hozir to‘xtatasizmi?', ok: 'Barcha tomosha to‘xtatildi' })
            }
          >
            BARCHA TOMOSHANI TO'XTATISH
          </button>
        )}
      </div>

      <div className="card">
        <h2>Manbalar</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nomi</th>
              <th>Holat</th>
              <th>Kirish</th>
              <th>Tomoshabin (media)</th>
              <th>Publish</th>
              <th>Tomosha</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.name} {s.isDemo && <span className="tag demo">DEMO</span>}
                </td>
                <td>
                  <Dot on={s.stats.online} /> {s.stats.online ? 'efirda' : 'offline'}
                </td>
                <td>{s.stats.online ? `${(s.stats.inboundKbps / 1000).toFixed(2)} Mbit/s` : '—'}</td>
                <td>{s.viewers}</td>
                <td>{s.publishEnabled ? (s.hasKey ? 'ruxsat' : 'kalit yo‘q') : <b className="bad">taqiqlangan</b>}</td>
                <td>{s.viewingEnabled ? 'ochiq' : <b className="bad">yopiq</b>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
