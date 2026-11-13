import { useState } from 'react'
import { get, post, put, fmtTime } from '../../api'
import { useServerEvents } from '../../events'
import { Modal, durationOptions, useAction, useLoad } from '../../components/ui'
import type { AdminStream } from './Dashboard'
import type { Guest } from './Requests'

interface User {
  id: number
  username: string
  displayName: string
  role: 'admin' | 'user'
  status: 'active' | 'blocked'
  mustChangePassword: boolean
  createdAt: number
  lockedUntil: number
}
interface Perm {
  id: number
  subjectType: 'user' | 'guest'
  subjectId: number
  subjectName: string
  streamId: number
  streamName: string
  grantedAt: number
  grantedBy: string
  expiresAt: number | null
}

export default function Users() {
  const users = useLoad(() => get<User[]>('/api/admin/users'), [])
  const perms = useLoad(() => get<Perm[]>('/api/admin/permissions'), [], 10000)
  const streams = useLoad(() => get<AdminStream[]>('/api/admin/streams'), [])
  const guests = useLoad(() => get<Guest[]>('/api/admin/guests?status=approved'), [])
  const [creating, setCreating] = useState(false)
  const [granting, setGranting] = useState<{ type: 'user' | 'guest'; id: number; name: string } | null>(null)
  const { busy, run } = useAction()
  useServerEvents((e) => e.kind === 'guests' && guests.reload())
  const reloadAll = () => (users.reload(), perms.reload(), guests.reload())

  return (
    <div className="page">
      <div className="row between">
        <h1>Foydalanuvchilar va ruxsatlar</h1>
        <button className="primary" onClick={() => setCreating(true)}>
          + Foydalanuvchi
        </button>
      </div>
      <p className="muted small">Standart holatda hech kimda ruxsat yo'q. Admin barcha streamlarni ko'ra oladi. Ruxsat bekor qilinganda avval bazaga yoziladi, so'ng ochiq videolar serverda uziladi.</p>
      {users.err && <div className="alert error">{users.err}</div>}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Login</th>
              <th>Ism</th>
              <th>Rol</th>
              <th>Holat</th>
              <th>Ruxsatlar</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className={u.status === 'blocked' ? 'dim' : ''}>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{u.role}</td>
                <td>
                  {u.status === 'blocked' ? <b className="bad">bloklangan</b> : 'faol'}
                  {u.mustChangePassword && <span className="tag">parol almashtirilishi kerak</span>}
                  {u.lockedUntil > Date.now() && <span className="tag">vaqtincha qulflangan</span>}
                </td>
                <td className="small">
                  {u.role === 'admin'
                    ? 'barchasi'
                    : perms.data
                        ?.filter((p) => p.subjectType === 'user' && p.subjectId === u.id)
                        .map((p) => (
                          <span className="chip" key={p.id}>
                            {p.streamName}
                            {p.expiresAt && ` (${fmtTime(p.expiresAt)} gacha)`}
                            <button
                              className="chip-x"
                              title="Ruxsatni olib tashlash"
                              disabled={busy}
                              onClick={() => run(() => post('/api/admin/permissions/revoke', { subjectType: 'user', subjectId: u.id, streamId: p.streamId }).then(reloadAll), { ok: 'Ruxsat olib tashlandi' })}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                </td>
                <td>
                  <div className="row gap wrap">
                    {u.role !== 'admin' && <button onClick={() => setGranting({ type: 'user', id: u.id, name: u.displayName })}>Ruxsat berish</button>}
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => post(`/api/admin/users/${u.id}/block`, { blocked: u.status !== 'blocked' }).then(reloadAll), {
                          confirm: u.status === 'blocked' ? undefined : `${u.username} bloklansinmi? Barcha sessiyalari va videolari darhol uziladi.`,
                        })
                      }
                    >
                      {u.status === 'blocked' ? 'Blokdan chiqarish' : 'Bloklash'}
                    </button>
                    <button disabled={busy} onClick={() => run(() => post(`/api/admin/users/${u.id}/logout-all`), { confirm: `${u.username} barcha qurilmalardan chiqarilsinmi?`, ok: 'Chiqarildi' })}>
                      Hamma joydan chiqarish
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const pw = window.prompt('Yangi vaqtinchalik parol (kamida 10 belgi). Foydalanuvchi birinchi kirishda almashtiradi:')
                        if (pw) run(() => post(`/api/admin/users/${u.id}/reset-password`, { password: pw }).then(reloadAll), { ok: 'Parol tiklandi; sessiyalar yakunlandi' })
                      }}
                    >
                      Parolni tiklash
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => run(() => put(`/api/admin/users/${u.id}`, { displayName: u.displayName, role: u.role === 'admin' ? 'user' : 'admin' }).then(reloadAll), { confirm: `${u.username} roli ${u.role === 'admin' ? 'user' : 'admin'} ga o'zgartirilsinmi?` })}
                    >
                      {u.role === 'admin' ? 'Userga aylantirish' : 'Admin qilish'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Mehmonlar ruxsatlari</h2>
      <div className="card">
        {guests.data?.length === 0 && <p className="muted">Tasdiqlangan mehmon yo'q.</p>}
        <table className="table">
          <tbody>
            {guests.data?.map((g) => (
              <tr key={g.id}>
                <td>
                  <span className="guest-badge">Mehmon</span> {g.displayName}
                </td>
                <td className="small">
                  {perms.data
                    ?.filter((p) => p.subjectType === 'guest' && p.subjectId === g.id)
                    .map((p) => (
                      <span className="chip" key={p.id}>
                        {p.streamName}
                        {p.expiresAt && ` (${fmtTime(p.expiresAt)} gacha)`}
                        <button className="chip-x" disabled={busy} onClick={() => run(() => post('/api/admin/permissions/revoke', { subjectType: 'guest', subjectId: g.id, streamId: p.streamId }).then(reloadAll))}>
                          ✕
                        </button>
                      </span>
                    ))}
                </td>
                <td>
                  <button onClick={() => setGranting({ type: 'guest', id: g.id, name: g.displayName })}>Ruxsat qo'shish</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <CreateUser onClose={() => setCreating(false)} onDone={() => (setCreating(false), reloadAll())} />}
      {granting && streams.data && <GrantModal subject={granting} streams={streams.data} onClose={() => setGranting(null)} onDone={() => (setGranting(null), reloadAll())} />}
    </div>
  )
}

function CreateUser({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ username: '', displayName: '', password: '', role: 'user' })
  const { busy, run } = useAction()
  return (
    <Modal title="Yangi foydalanuvchi" onClose={onClose}>
      <form className="form" onSubmit={(e) => (e.preventDefault(), run(() => post('/api/admin/users', f).then(onDone), { ok: 'Yaratildi' }))}>
        <label>
          Login
          <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoComplete="off" />
        </label>
        <label>
          Ism
          <input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
        </label>
        <label>
          Vaqtinchalik parol (kamida 10 belgi; birinchi kirishda almashtiriladi)
          <input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={10} autoComplete="new-password" />
        </label>
        <label>
          Rol
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="user">user (tomoshabin)</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button className="primary" disabled={busy}>
          Yaratish
        </button>
      </form>
    </Modal>
  )
}

function GrantModal({ subject, streams, onClose, onDone }: { subject: { type: 'user' | 'guest'; id: number; name: string }; streams: AdminStream[]; onClose: () => void; onDone: () => void }) {
  const [sel, setSel] = useState<number[]>([])
  const [minutes, setMinutes] = useState<number>(subject.type === 'guest' ? 120 : 0)
  const { busy, run } = useAction()
  return (
    <Modal title={`Ruxsat: ${subject.name}`} onClose={onClose}>
      <div className="checks">
        {streams.map((s) => (
          <label key={s.id}>
            <input type="checkbox" checked={sel.includes(s.id)} onChange={() => setSel(sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id])} /> {s.name}
          </label>
        ))}
      </div>
      <label className="form">
        Muddat
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {subject.type === 'user' && <option value={0}>Cheksiz (admin olib tashlaguncha)</option>}
          {durationOptions().map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>
      <button
        className="primary"
        disabled={busy || sel.length === 0 || (subject.type === 'guest' && minutes === 0)}
        onClick={() =>
          run(
            () =>
              post('/api/admin/permissions', {
                subjectType: subject.type,
                subjectId: subject.id,
                streamIds: sel,
                expiresAt: minutes ? Date.now() + minutes * 60_000 : null,
              }).then(onDone),
            { ok: 'Ruxsat berildi' },
          )
        }
      >
        Ruxsat berish
      </button>
    </Modal>
  )
}
