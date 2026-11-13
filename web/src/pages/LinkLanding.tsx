import { useEffect, useState } from 'react'
import { post, fmtTime } from '../api'
import { Brand } from './Login'

interface Info {
  status: string
  message: string
  sessionMinutes: number
  endsAt: number | null
  startsAt: number | null
  singleBrowser: boolean
}

// The token arrives in the URL fragment (#...), which browsers never send to
// the server, never put in Referer and link previews cannot see. We move it
// into this tab's memory/sessionStorage and remove it from the address bar
// immediately. Opening this page does NOT use the link; only the button does.
function takeToken(): string {
  const h = window.location.hash.replace(/^#/, '')
  if (h && /^[A-Za-z0-9_-]{20,100}$/.test(h)) {
    sessionStorage.setItem('ds-link-token', h)
    window.history.replaceState(null, '', '/link')
    return h
  }
  return sessionStorage.getItem('ds-link-token') || ''
}

function requestId(token: string) {
  // Same id for re-sends of the same attempt in this tab => no double use.
  const key = 'ds-link-req-' + token.slice(0, 12)
  let id = sessionStorage.getItem(key)
  if (!id) {
    const b = new Uint8Array(18)
    crypto.getRandomValues(b)
    id = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem(key, id)
  }
  return id
}

export default function LinkLanding() {
  const [token] = useState(takeToken)
  const [info, setInfo] = useState<Info | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) {
      setErr("Havola to'liq emas yoki noto'g'ri nusxalangan. Havolani to'liq ochib ko'ring.")
      return
    }
    post<{ info: Info; hasSession: boolean }>('/api/link/inspect', { token })
      .then((r) => {
        setInfo(r.info)
        setHasSession(r.hasSession)
      })
      .catch((e) => setErr(e.message))
  }, [token])

  const activate = async () => {
    setBusy(true)
    setErr('')
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await post('/api/link/activate', { token, requestId: requestId(token) })
        sessionStorage.removeItem('ds-link-token')
        window.location.replace('/#/')
        return
      } catch (e: any) {
        if (e.status === 0 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500)) // network: safe re-send (same request id)
          continue
        }
        setErr(e.message)
        break
      }
    }
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <Brand />
        <h2>Maxsus havola orqali tomosha</h2>
        {info && info.status !== 'active' && <div className="alert error">{info.message}</div>}
        {info && info.status === 'active' && (
          <>
            <p>
              Havola — faqat taklif. Tugmani bossangiz administratorga <b>kirish so'rovi</b> yuboriladi va ekranda tekshirish kodi chiqadi. Administrator aynan
              shu brauzerdagi so'rovni tasdiqlamaguncha hech qanday video yoki material ochilmaydi.
              {info.singleBrowser ? ' Tasdiqlangach havola ishlatilgan hisoblanadi.' : ''}
            </p>
            <ul className="small muted">
              <li>Sessiya davomiyligi: {Math.round(info.sessionMinutes / 60) >= 1 ? `${(info.sessionMinutes / 60).toFixed(info.sessionMinutes % 60 ? 1 : 0)} soat` : `${info.sessionMinutes} daqiqa`}</li>
              {info.endsAt && <li>Havola amal qiladi: {fmtTime(info.endsAt)} gacha (Toshkent vaqti)</li>}
              <li>Sahifani yangilash, yangi tab yoki qisqa uzilishdan keyin qayta ulanish qo'shimcha foydalanish hisoblanmaydi.</li>
              <li>Brauzer cookie fayllarini o'chirsangiz yoki boshqa brauzerga o'tsangiz, sessiyani tiklash kafolatlanmaydi.</li>
              <li>Login-parol talab qilinmaydi, lekin administrator tasdig'i va har bir kontentga ruxsat serverda tekshiriladi.</li>
              <li>Havolani boshqa odamga yuborish unga kirish bermaydi: uning so'rovi alohida tasdiqlanishi kerak.</li>
            </ul>
            {hasSession && <div className="alert info small">Bu brauzerda allaqachon havola sessiyasi bor. Davom etsangiz, yangi foydalanish faqat havola ruxsat bersa ochiladi.</div>}
            <div className="row gap wrap">
              <button className="primary big" disabled={busy} onClick={activate}>
                {busy ? 'Yuborilmoqda…' : "Kirish so'rovini yuborish"}
              </button>
              {hasSession && <button onClick={() => window.location.replace('/#/')}>Mavjud sessiyada davom etish</button>}
            </div>
          </>
        )}
        {!info && !err && <div className="spinner" />}
        {err && <div className="alert error">{err}</div>}
      </div>
    </div>
  )
}
