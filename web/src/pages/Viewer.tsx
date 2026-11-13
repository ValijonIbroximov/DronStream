import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { get, type SessionInfo, type ViewerStream, fmtTime } from '../api'
import { useServerEvents } from '../events'
import Player from '../components/Player'
import { navigate } from '../router'

const LAYOUTS = [
  { n: 1, label: '1' },
  { n: 4, label: '2×2' },
  { n: 9, label: '3×3' },
]

function tabId() {
  let t = sessionStorage.getItem('ds-tab')
  if (!t) {
    t = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('ds-tab', t)
  }
  return t
}

export default function ViewerPage({ info, onLogout }: { info: SessionInfo; onLogout: () => void }) {
  const s = info.session!
  const [streams, setStreams] = useState<ViewerStream[] | null>(null)
  const [layout, setLayout] = useState<number>(() => Number(localStorage.getItem('ds-layout')) || 1)
  const [slots, setSlots] = useState<(number | null)[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ds-slots') || '[]')
    } catch {
      return []
    }
  })
  const [err, setErr] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)
  const tab = useMemo(tabId, [])

  const load = useCallback(async () => {
    try {
      setStreams(await get<ViewerStream[]>('/api/streams'))
      setErr('')
    } catch (e: any) {
      setErr(e.message)
    }
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])
  useServerEvents((e) => {
    if (e.kind === 'permissions' || e.kind === 'reconnected' || e.kind === 'media_ended') load()
  })

  useEffect(() => localStorage.setItem('ds-layout', String(layout)), [layout])
  useEffect(() => localStorage.setItem('ds-slots', JSON.stringify(slots)), [slots])

  const allowed = new Set((streams || []).map((x) => x.id))
  const seen = useRef(new Map<number, string>())
  useEffect(() => {
    streams?.forEach((x) => seen.current.set(x.id, x.name))
  }, [streams])
  // Auto-fill empty (never chosen) slots once, then keep assignments stable so
  // a revoked stream stays in place and shows why it stopped.
  useEffect(() => {
    if (!streams) return
    const n = [...slots]
    while (n.length < 9) n.push(undefined as any)
    const used = new Set(n.filter((x) => x != null))
    let changed = false
    for (let i = 0; i < layout; i++) {
      if (n[i] === undefined) {
        const next = streams.find((x) => !used.has(x.id))
        if (next) {
          n[i] = next.id
          used.add(next.id)
          changed = true
        }
      }
    }
    if (changed) setSlots(n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, layout])

  const choose = (i: number, id: number | null) => {
    const n = [...slots]
    while (n.length < 9) n.push(undefined as any)
    for (let k = 0; k < n.length; k++) if (n[k] === id && id !== null) n[k] = null
    n[i] = id
    setSlots(n)
  }
  const visible = Array.from({ length: layout }, (_, i) => slots[i] ?? null)

  const active = visible.filter((id) => id != null && allowed.has(id)).length
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else gridRef.current?.requestFullscreen?.()
  }

  return (
    <div className="viewer">
      <header className="topbar">
        <div className="brand-small">
          <img src="/favicon.svg" alt="" width={24} height={24} /> DronStream
        </div>
        <div className="layout-switch">
          {LAYOUTS.map((l) => (
            <button key={l.n} className={layout === l.n ? 'active' : ''} onClick={() => setLayout(l.n)} title={`${l.label} ko'rinish`}>
              {l.label}
            </button>
          ))}
          <button onClick={fullscreen} title="Butun panjara to'liq ekranda">
            ⛶
          </button>
        </div>
        <div className="who">
          {s.kind === 'guest' ? <span className="guest-badge">Mehmon: {s.name} (tasdiqlanmagan ism)</span> : <span>{s.name}</span>}
          {s.role === 'admin' && <button onClick={() => navigate('/')}>Admin panel</button>}
          {s.kind === 'user' && <button onClick={() => navigate('/password')}>Parol</button>}
          <button onClick={onLogout}>Chiqish</button>
        </div>
      </header>
      {err && <div className="alert error">{err}</div>}
      {streams && streams.length === 0 && (
        <div className="empty">
          <h2>Sizga ruxsat etilgan stream yo'q</h2>
          <p className="muted">Administrator ruxsat berganda bu yerda paydo bo'ladi.</p>
        </div>
      )}
      {streams && streams.length > 0 && (
        <>
          {layout === 9 && active > 4 && (
            <div className="alert warn small">
              {active} ta video bir vaqtda: kompyuter va internet yuklamasi ortadi (taxminan har biri 0.5–4 Mbit/s). Kerak bo'lmaganlarini "— bo'sh —" qilib qo'ying.
            </div>
          )}
          <div className={`grid g${layout}`} ref={gridRef}>
            {visible.map((v, i) => (
              <div className="slot" key={i}>
                <select value={v != null && allowed.has(v) ? v : ''} onChange={(e) => choose(i, e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— bo'sh —</option>
                  {streams.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.online ? '' : ' (efirda emas)'}
                    </option>
                  ))}
                </select>
                {v != null && allowed.has(v) ? (
                  (() => {
                    const st = streams.find((x) => x.id === v)!
                    return <Player key={`${v}-${i}`} streamId={v} name={st.name} isDemo={st.isDemo} tab={`${tab}-${i}`} compact={layout > 1} />
                  })()
                ) : v != null && seen.current.has(v) ? (
                  <Gone id={v} name={seen.current.get(v)!} onClear={() => choose(i, null)} />
                ) : (
                  <div className="player empty-slot">Bo'sh joy</div>
                )}
              </div>
            ))}
          </div>
          <div className="muted small footer-note">
            {streams.some((x) => x.until) &&
              'Kirish amal qiladi: ' +
                streams
                  .filter((x) => x.until)
                  .map((x) => `${x.name} — ${fmtTime(x.until)}`)
                  .join('; ')}
            <br />
            Video ustidagi ism va vaqt belgisi (watermark) ekran yozib olishni to'xtata olmaydi; u faqat manbani aniqlashga yordam beradi.
          </div>
        </>
      )}
    </div>
  )
}

function Gone({ id, name, onClear }: { id: number; name: string; onClear: () => void }) {
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null)
  useEffect(() => {
    get<{ ok: boolean; code: string; message: string }>(`/api/watch/${id}/status`)
      .then((r) => setMsg(r.ok ? null : r))
      .catch(() => setMsg({ code: 'error', message: "Holatni olib bo'lmadi" }))
  }, [id])
  return (
    <div className="player">
      <div className="player-top">
        <span className="player-name">{name}</span>
      </div>
      <div className="player-overlay denied">
        <strong>{msg?.code === 'permission_expired' || msg?.code === 'guest_expired' ? 'Ruxsat muddati tugadi' : msg?.code === 'stream_closed' ? 'Stream yopildi' : 'Ruxsat bekor qilindi'}</strong>
        <span>{msg?.message || 'Bu streamni ko‘rish endi mumkin emas'}</span>
        <button onClick={onClear}>Joyni bo'shatish</button>
      </div>
    </div>
  )
}
