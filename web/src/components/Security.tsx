import { useEffect, useState, type FormEvent } from 'react'
import { get, post, setReauthHandler } from '../api'
import { Modal, useLoad } from './ui'

// ---------- re-confirmation for sensitive admin actions ----------

type Pending = { resolve: (ok: boolean) => void; message: string }

// Mount once in the admin UI. Any API call that answers "reauth_required"
// opens this dialog; after a successful password(+TOTP) confirmation the
// original request is retried automatically (see api.ts).
export function ReauthHost() {
  const [pending, setPending] = useState<Pending | null>(null)
  const [pw, setPw] = useState('')
  const [otp, setOtp] = useState('')
  const [needOtp, setNeedOtp] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(
    () =>
      setReauthHandler(
        (message) =>
          new Promise<boolean>((resolve) => {
            setPw('')
            setOtp('')
            setErr('')
            setPending({ resolve, message })
          }),
      ),
    [],
  )
  if (!pending) return null
  const close = (ok: boolean) => {
    pending.resolve(ok)
    setPending(null)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await post('/api/me/reauth', { password: pw, otp })
      close(true)
    } catch (ex: any) {
      if (ex.code === 'mfa_required') setNeedOtp(true)
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Qayta tasdiqlash" onClose={() => close(false)}>
      <form className="form" onSubmit={submit}>
        <p className="muted small">{pending.message}. Tasdiq shu brauzer sessiyasi uchun 10 daqiqa amal qiladi.</p>
        <label>
          Parol
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
        </label>
        {needOtp && (
          <label>
            Autentifikator kodi yoki tiklash kodi
            <input inputMode="text" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </label>
        )}
        <div className="row gap">
          <button className="primary" disabled={busy}>
            Tasdiqlash
          </button>
          <button type="button" onClick={() => close(false)}>
            Bekor qilish
          </button>
        </div>
        {err && <div className="alert error small">{err}</div>}
      </form>
    </Modal>
  )
}

// ---------- QR from server-computed module rows (no external service) ----------

export function QRRows({ rows, size }: { rows: string[]; size: number }) {
  const cell = Math.max(3, Math.floor(220 / size))
  return (
    <svg width={size * cell} height={size * cell} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label="QR kod">
      <rect width={size} height={size} fill="#fff" />
      {rows.map((r, y) =>
        Array.from(r).map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" /> : null)),
      )}
    </svg>
  )
}

// ---------- TOTP enrolment / status ----------

interface MeSecurity {
  totpEnabled: boolean
  recoveryLeft: number
  reauthFresh: boolean
  mfaSetupRequired: boolean
  secureMode: boolean
}

export function TotpCard({ forced, onEnabled }: { forced?: boolean; onEnabled?: () => void }) {
  const me = useLoad(() => get<MeSecurity>('/api/me/security'), [])
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: { size: number; rows: string[] } } | null>(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setErr('')
    setBusy(true)
    try {
      setSetup(await post('/api/me/totp/setup'))
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  const enable = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const r = await post<{ recoveryCodes: string[] }>('/api/me/totp/enable', { code })
      setCodes(r.recoveryCodes)
      setSetup(null)
      me.reload()
    } catch (ex: any) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }
  const disable = async () => {
    if (!window.confirm("Ikkinchi bosqich o'chirilsinmi? Hisob faqat parol bilan himoyalanib qoladi.")) return
    setErr('')
    try {
      await post('/api/me/totp/disable')
      me.reload()
    } catch (e: any) {
      setErr(e.message)
    }
  }

  return (
    <div className="card">
      <h2>Ikkinchi bosqich (TOTP)</h2>
      {forced && (
        <div className="alert warn small">
          Server <b>secure</b> rejimida: administrator ikkinchi bosqichsiz ishlay olmaydi. Uni yoqmaguningizcha boshqa admin amallari bloklangan.
        </div>
      )}
      <p className="muted small">
        Telefondagi autentifikator ilovasi (vaqtga asoslangan 6 xonali kod, RFC 6238) parol o'g'irlansa ham hisobni himoya qiladi. Kod va maxfiy kalit
        serverdan tashqariga yuborilmaydi; QR kod shu server tomonidan yasaladi.
      </p>
      {me.data && !setup && !codes && (
        <div className="row gap wrap">
          <span>
            Holat: <b>{me.data.totpEnabled ? 'yoqilgan' : "o'chiq"}</b>
            {me.data.totpEnabled && ` · tiklash kodlari qoldi: ${me.data.recoveryLeft}`}
          </span>
          <button className={me.data.totpEnabled ? '' : 'primary'} disabled={busy} onClick={start}>
            {me.data.totpEnabled ? 'Yangi kalit yaratish' : 'Yoqish'}
          </button>
          {me.data.totpEnabled && !(me.data.secureMode && forced !== undefined) && (
            <button className="danger" onClick={disable}>
              O'chirish
            </button>
          )}
        </div>
      )}
      {setup && (
        <form className="form" onSubmit={enable}>
          <ol className="small">
            <li>Autentifikator ilovasida "QR skanerlash"ni tanlang va kodni skanerlang (yoki kalitni qo'lda kiriting).</li>
            <li>Ilova ko'rsatgan joriy 6 xonali kodni kiriting.</li>
          </ol>
          <div className="qr-box">
            <QRRows rows={setup.qr.rows} size={setup.qr.size} />
          </div>
          <label>
            Qo'lda kiritish uchun kalit
            <input readOnly value={setup.secret} onFocus={(e) => e.target.select()} className="mono" />
          </label>
          <label>
            Joriy kod
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
          </label>
          <button className="primary" disabled={busy}>
            Tasdiqlash va yoqish
          </button>
        </form>
      )}
      {codes && (
        <div>
          <div className="alert ok small">Ikkinchi bosqich yoqildi.</div>
          <p className="small">
            <b>Tiklash kodlari</b> — har biri bir marta ishlaydi. Telefon yo'qolsa shu kodlardan biri bilan kirasiz. Ularni hozir xavfsiz joyga yozib qo'ying:
            boshqa safar ko'rsatilmaydi.
          </p>
          <pre className="codes mono">{codes.join('\n')}</pre>
          <button
            className="primary"
            onClick={() => {
              setCodes(null)
              onEnabled?.()
            }}
          >
            Yozib oldim
          </button>
        </div>
      )}
      {err && <div className="alert error small">{err}</div>}
    </div>
  )
}

// ---------- security status (what is enforced, what is not verified) ----------

interface SecItem {
  id: string
  title: string
  status: 'ok' | 'warn' | 'fail' | 'unverified' | 'not_implemented'
  detail: string
}

const STATUS_LABEL: Record<SecItem['status'], string> = {
  ok: 'tekshirilgan',
  warn: 'zaif',
  fail: 'buzilgan',
  unverified: 'tasdiqlanmagan',
  not_implemented: 'mavjud emas',
}

export function SecurityStatus() {
  const st = useLoad(() => get<{ mode: string; summary?: { tone: string; text: string }[]; items: SecItem[] }>('/api/admin/security-status'), [], 30000)
  return (
    <div className="card">
      <h2>Xavfsizlik holati</h2>
      <p className="muted small">
        Har bir qator dastur hozir nimani amalda tekshirayotganini ko'rsatadi. "Tasdiqlanmagan" — dastur o'zi tekshira olmaydigan narsa (qurilma, tarmoq).
        "Mavjud emas" — bu versiyada yo'q himoya. Batafsil: SECURITY_MODEL.md.
      </p>
      {st.err && <div className="alert error small">{st.err}</div>}
      {st.data?.summary && (
        <ul className="sec-summary" aria-label="Joriy holat xulosasi">
          {st.data.summary.map((x, n) => (
            <li key={n} className={`t-${x.tone}`}>
              {x.text}
            </li>
          ))}
        </ul>
      )}
      <ul className="sec-list">
        {st.data?.items.map((i) => (
          <li key={i.id} className={`sec-item s-${i.status}`}>
            <span className="sec-badge">{STATUS_LABEL[i.status]}</span>
            <div>
              <b>{i.title}</b>
              <div className="small muted">{i.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
