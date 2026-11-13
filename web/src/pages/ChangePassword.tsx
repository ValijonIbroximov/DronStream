import { useState } from 'react'
import { post } from '../api'

export default function ChangePassword({ forced, onDone, onLogout }: { forced?: boolean; onDone: () => void; onLogout: () => void }) {
  const [f, setF] = useState({ old: '', new: '', new2: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  return (
    <div className="center-screen">
      <div className="card auth-card">
        <h2>Parolni almashtirish</h2>
        {forced && <div className="alert warn">Vaqtinchalik parol bilan kirdingiz. Davom etish uchun yangi parol o'rnating.</div>}
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault()
            if (f.new !== f.new2) return setErr('Yangi parollar mos emas')
            try {
              await post('/api/me/password', { old: f.old, new: f.new })
              setOk(true)
              setTimeout(onDone, 800)
            } catch (e: any) {
              setErr(e.message)
            }
          }}
        >
          <label>
            Joriy parol
            <input type="password" autoComplete="current-password" value={f.old} onChange={(e) => setF({ ...f, old: e.target.value })} required />
          </label>
          <label>
            Yangi parol (kamida 10 belgi)
            <input type="password" autoComplete="new-password" minLength={10} value={f.new} onChange={(e) => setF({ ...f, new: e.target.value })} required />
          </label>
          <label>
            Yangi parolni takrorlang
            <input type="password" autoComplete="new-password" value={f.new2} onChange={(e) => setF({ ...f, new2: e.target.value })} required />
          </label>
          <button className="primary">Saqlash</button>
        </form>
        {ok && <div className="alert ok">Parol almashtirildi. Boshqa qurilmalardagi sessiyalaringiz yakunlandi.</div>}
        {err && <div className="alert error">{err}</div>}
        <div className="row gap">
          {!forced && <button onClick={onDone}>Orqaga</button>}
          <button onClick={onLogout}>Chiqish</button>
        </div>
      </div>
    </div>
  )
}
