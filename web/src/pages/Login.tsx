import { useState, type FormEvent } from 'react'
import { post, setCsrf, type SessionInfo } from '../api'

export default function LoginPage({ info, onDone, notice }: { info: SessionInfo; onDone: () => void; notice?: string }) {
  const [tab, setTab] = useState<'login' | 'guest'>('login')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<SessionInfo>) => {
    setErr('')
    setBusy(true)
    try {
      const s = await fn()
      setCsrf(s.csrf)
      onDone()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (info.setupNeeded) return <Setup run={run} busy={busy} err={err} />

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <Brand />
        {notice && <div className="alert warn">{notice}</div>}
        <div className="tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>
            Kirish
          </button>
          {info.guestEnabled && (
            <button className={tab === 'guest' ? 'active' : ''} onClick={() => setTab('guest')}>
              Mehmon sifatida kirish
            </button>
          )}
        </div>
        {tab === 'login' ? (
          <LoginForm busy={busy} onSubmit={(u, p, otp) => run(() => post<SessionInfo>('/api/login', { username: u, password: p, otp }))} needOtp={/ikkinchi bosqich/i.test(err)} />
        ) : (
          <GuestForm busy={busy} onSubmit={(n, r) => run(() => post<SessionInfo>('/api/guest', { name: n, reason: r }))} />
        )}
        {err && <div className="alert error">{err}</div>}
      </div>
    </div>
  )
}

export function Brand() {
  return (
    <div className="brand">
      <img src="/favicon.svg" alt="" width={36} height={36} />
      <div>
        <div className="brand-name">DronStream</div>
        <div className="muted small">Jonli dron videolari — faqat ruxsat bilan</div>
      </div>
    </div>
  )
}

function LoginForm({ onSubmit, busy, needOtp }: { onSubmit: (u: string, p: string, otp: string) => void; busy: boolean; needOtp: boolean }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [otp, setOtp] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(u, p, otp)
  }
  return (
    <form onSubmit={submit} className="form">
      <label>
        Login
        <input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} required autoFocus />
      </label>
      <label>
        Parol
        <input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} required />
      </label>
      {needOtp && (
        <label>
          Autentifikator kodi (yoki tiklash kodi)
          <input inputMode="text" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} required autoFocus />
        </label>
      )}
      <button className="primary" disabled={busy}>
        Kirish
      </button>
    </form>
  )
}

function GuestForm({ onSubmit, busy }: { onSubmit: (n: string, r: string) => void; busy: boolean }) {
  const [n, setN] = useState('')
  const [r, setR] = useState('')
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(n, r)
      }}
    >
      <p className="muted small">
        So'rovingiz administratorga yuboriladi. U tasdiqlamaguncha hech qanday video ko'rsatilmaydi. Kiritgan ismingiz tasdiqlangan shaxs
        sifatida qabul qilinmaydi.
      </p>
      <label>
        Ismingiz
        <input value={n} maxLength={60} onChange={(e) => setN(e.target.value)} required />
      </label>
      <label>
        Kimligingiz / kirish sababi
        <textarea value={r} maxLength={1000} rows={4} onChange={(e) => setR(e.target.value)} required />
      </label>
      <button className="primary" disabled={busy}>
        So'rov yuborish
      </button>
    </form>
  )
}

function Setup({ run, busy, err }: { run: (fn: () => Promise<SessionInfo>) => void; busy: boolean; err: string }) {
  const [f, setF] = useState({ setupToken: '', username: '', displayName: '', password: '', password2: '' })
  const [local, setLocal] = useState('')
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="center-screen">
      <div className="card auth-card">
        <Brand />
        <h2>Birinchi administratorni yaratish</h2>
        <p className="muted small">
          Bir martalik o'rnatish kodi server konsolida va <code>data\runtime\setup-token.txt</code> faylida. Kod ishlatilgach o'chadi. Standart
          admin hisobi yo'q.
        </p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            if (f.password !== f.password2) return setLocal('Parollar mos emas')
            setLocal('')
            run(() => post<SessionInfo>('/api/setup', f))
          }}
        >
          <label>
            O'rnatish kodi
            <input value={f.setupToken} onChange={set('setupToken')} required autoComplete="off" />
          </label>
          <label>
            Login
            <input value={f.username} onChange={set('username')} required autoComplete="username" />
          </label>
          <label>
            Ko'rinadigan ism
            <input value={f.displayName} onChange={set('displayName')} />
          </label>
          <label>
            Parol (kamida 10 belgi)
            <input type="password" value={f.password} onChange={set('password')} required minLength={10} autoComplete="new-password" />
          </label>
          <label>
            Parolni takrorlang
            <input type="password" value={f.password2} onChange={set('password2')} required autoComplete="new-password" />
          </label>
          <button className="primary" disabled={busy}>
            Yaratish
          </button>
        </form>
        {(local || err) && <div className="alert error">{local || err}</div>}
      </div>
    </div>
  )
}
