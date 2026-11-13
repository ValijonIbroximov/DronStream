import { useState } from 'react'
import { get, fmtTime } from '../../api'
import { useLoad } from '../../components/ui'

interface Rec {
  id: number
  ts: number
  actorType: string
  actorName: string
  action: string
  target: string
  details: string
  ip: string
}

const LABELS: Record<string, string> = {
  login: 'Kirish',
  login_failed: 'Kirish xatosi',
  logout: 'Chiqish',
  guest_request: "Mehmon so'rovi",
  guest_approve: 'Mehmon tasdiqlandi',
  guest_reject: 'Mehmon rad etildi',
  guest_end: 'Mehmon yakunlandi',
  permission_grant: 'Ruxsat berildi',
  permission_revoke: 'Ruxsat olindi',
  view_connect: "Ko'rishga ulandi",
  view_disconnect: 'Ko‘rish uzildi',
  view_denied: 'Ko‘rish rad etildi',
  publish_start: 'Pult ulandi',
  publish_denied: 'Publish rad etildi',
  publish_rejected_busy: 'Ikkinchi manba rad etildi',
  publish_kicked: 'Pult uzildi',
  stream_key_rotate: 'Kalit almashtirildi',
  stream_key_revoke: 'Kalit bekor qilindi',
  stream_key_view: "Kalit ko'rildi",
  user_block: 'Bloklandi',
  emergency_stop_on: "FAVQULODDA TO'XTATISH",
  backup_create: 'Backup',
}

export default function Audit() {
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(200)
  const { data, err, reload } = useLoad(() => get<{ items: Rec[]; retentionDays: number }>(`/api/admin/audit?limit=${limit}&action=${encodeURIComponent(filter)}`), [filter, limit], 10000)
  return (
    <div className="page">
      <h1>Audit</h1>
      <p className="muted small">Yozuvlar {data?.retentionDays ?? '…'} kun saqlanadi, so'ng avtomatik o'chiriladi (config: security.audit_retention_days). Sirlar yozilmaydi.</p>
      <div className="row gap wrap">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Hammasi</option>
          <option value="login">Kirishlar</option>
          <option value="guest_">Mehmon so'rovlari</option>
          <option value="permission_">Ruxsatlar</option>
          <option value="view_">Ko'rish ulanishlari</option>
          <option value="publish_">Pult (publish)</option>
          <option value="stream_">Streamlar va kalitlar</option>
          <option value="user_">Foydalanuvchilar</option>
          <option value="emergency">Favqulodda</option>
          <option value="backup">Backup</option>
        </select>
        <button onClick={reload}>Yangilash</button>
      </div>
      {err && <div className="alert error">{err}</div>}
      <div className="card scroll-x">
        <table className="table small">
          <thead>
            <tr>
              <th>Vaqt</th>
              <th>Kim</th>
              <th>Amal</th>
              <th>Obyekt</th>
              <th>Tafsilot</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">{fmtTime(r.ts)}</td>
                <td>
                  {r.actorType === 'guest' ? 'Mehmon: ' : ''}
                  {r.actorName || r.actorType}
                </td>
                <td>{LABELS[r.action] || r.action}</td>
                <td>{r.target}</td>
                <td className="details">{r.details}</td>
                <td>{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length >= limit && <button onClick={() => setLimit(limit + 200)}>Ko'proq</button>}
      </div>
    </div>
  )
}
