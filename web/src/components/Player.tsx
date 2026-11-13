import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, get, getCsrf, post } from '../api'
import { useServerEvents } from '../events'

interface TicketResp {
  ticket: string
  ticketExpiresAt: number
  leaseUntil: number
  iceServers: RTCIceServer[]
  watermark: string
}
interface StatusResp {
  ok: boolean
  code: string
  message: string
  online?: boolean
}

type State =
  | { kind: 'connecting' }
  | { kind: 'playing' }
  | { kind: 'reconnecting'; message: string }
  | { kind: 'offline' }
  | { kind: 'denied'; code: string; message: string }
  | { kind: 'paused' }
  | { kind: 'error'; message: string }

interface Conn {
  pc: RTCPeerConnection
  resource: string
  stream: MediaStream
}

const DENY_TITLES: Record<string, string> = {
  permission_revoked: 'Ruxsat bekor qilindi',
  permission_expired: 'Ruxsat muddati tugadi',
  guest_expired: 'Ruxsat muddati tugadi',
  kicked_by_admin: 'Administrator uzdi',
  session_ended: 'Sessiya yakunlandi',
  user_blocked: 'Hisob bloklandi',
  guest_ended: 'Mehmon sessiyasi yakunlandi',
  stream_closed: 'Stream yopildi',
  emergency_stop: 'Favqulodda to‘xtatildi',
  no_permission: 'Ruxsat yo‘q',
  too_many_sessions: 'Juda ko‘p ulanish',
  instance_standby: 'Server kutish rejimida',
  instance_migrated: 'Server ko‘chirilgan',
  auth_unavailable: 'Ruxsat xizmati ishlamayapti',
}

function waitGathering(pc: RTCPeerConnection, ms: number) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve()
    const t = setTimeout(resolve, ms)
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t)
        resolve()
      }
    })
  })
}

async function whepOffer(streamId: number, ticket: string, sdp: string) {
  const res = await fetch(`/api/whep/${streamId}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${ticket}`, 'X-DS-Request': '1', 'X-CSRF-Token': getCsrf() },
    body: sdp,
  })
  if (res.status !== 201) {
    const j = await res.json().catch(() => ({}))
    throw new ApiError(res.status, j.code || 'whep', j.message || 'Ulanib bo‘lmadi')
  }
  return { answer: await res.text(), location: res.headers.get('Location') || '' }
}

function closeConn(c: Conn | null) {
  if (!c) return
  try {
    c.pc.close()
  } catch {
    /* ignore */
  }
  if (c.resource) {
    fetch(c.resource, { method: 'DELETE', credentials: 'same-origin', keepalive: true, headers: { 'X-DS-Request': '1', 'X-CSRF-Token': getCsrf() } }).catch(() => {})
  }
}

export default function Player({ streamId, name, tab, isDemo, compact }: { streamId: number; name: string; tab: string; isDemo?: boolean; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const cur = useRef<Conn | null>(null)
  const alive = useRef(true)
  const timers = useRef<number[]>([])
  const attempt = useRef(0)
  const [state, setState] = useState<State>({ kind: 'connecting' })
  const [watermark, setWatermark] = useState('')
  const [kbps, setKbps] = useState<number | null>(null)
  const [res, setRes] = useState('')

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  const deny = useCallback((code: string, message: string) => {
    clearTimers()
    closeConn(cur.current)
    cur.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setState({ kind: 'denied', code, message })
  }, [])

  // Decide what to show after a connection dropped.
  const onDrop = useCallback(async (dropped: Conn) => {
    if (!alive.current || cur.current !== dropped) return
    closeConn(dropped)
    cur.current = null
    try {
      const st = await get<StatusResp>(`/api/watch/${streamId}/status`)
      if (!alive.current) return
      if (!st.ok) return deny(st.code, st.message)
      if (st.online === false) {
        setState({ kind: 'offline' })
        later(() => connect(false), 5000)
        return
      }
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return deny('session_ended', 'Sessiya yakunlandi')
    }
    const n = Math.min(attempt.current++, 4)
    setState({ kind: 'reconnecting', message: 'Ulanish uzildi — qayta ulanmoqda…' })
    later(() => connect(false), [1000, 2000, 4000, 8000, 15000][n])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId])

  const connect = useCallback(
    async (renewal: boolean) => {
      if (!alive.current) return
      if (!renewal) setState((s) => (s.kind === 'reconnecting' || s.kind === 'offline' ? s : { kind: 'connecting' }))
      let pc: RTCPeerConnection | null = null
      try {
        const t = await post<TicketResp>(`/api/watch/${streamId}/ticket`, { tab })
        setWatermark(t.watermark)
        pc = new RTCPeerConnection({ iceServers: t.iceServers || [] })
        pc.addTransceiver('video', { direction: 'recvonly' })
        pc.addTransceiver('audio', { direction: 'recvonly' })
        const ms = new MediaStream()
        const conn: Conn = { pc, resource: '', stream: ms }
        pc.ontrack = (e) => {
          ms.addTrack(e.track)
          if (!renewal || !cur.current || cur.current === conn) {
            if (videoRef.current && videoRef.current.srcObject !== ms) videoRef.current.srcObject = ms
          }
        }
        let downTimer = 0
        pc.onconnectionstatechange = () => {
          const s = pc!.connectionState
          if (s === 'connected') {
            clearTimeout(downTimer)
            if (cur.current !== conn) {
              // make-before-break: switch to the renewed session, then close the old one
              const old = cur.current
              cur.current = conn
              if (videoRef.current) videoRef.current.srcObject = ms
              closeConn(old)
            }
            attempt.current = 0
            setState({ kind: 'playing' })
          } else if (s === 'failed' || s === 'closed') {
            onDrop(conn)
          } else if (s === 'disconnected') {
            downTimer = window.setTimeout(() => onDrop(conn), 3000)
          }
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await waitGathering(pc, 2500)
        const { answer, location } = await whepOffer(streamId, t.ticket, pc.localDescription!.sdp)
        conn.resource = location
        await pc.setRemoteDescription({ type: 'answer', sdp: answer })
        if (!alive.current) return closeConn(conn)
        if (!cur.current) cur.current = conn
        // Renew before the lease ends (the server closes the session at lease end).
        const renewIn = t.leaseUntil - Date.now() - 15000
        if (renewIn > 5000) later(() => connect(true), renewIn)
      } catch (e: any) {
        if (pc) pc.close()
        if (!alive.current) return
        if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
          if (renewal && cur.current) return // keep playing; the server will end it when access really ends
          if (e.code === 'stream_offline') {
            setState({ kind: 'offline' })
            later(() => connect(false), 5000)
            return
          }
          if (e.code === 'connect_denied' || e.code === 'bad_ticket') {
            setState({ kind: 'reconnecting', message: e.message })
            later(() => connect(false), 3000)
            return
          }
          return deny(e.code, e.message)
        }
        if (e instanceof ApiError && e.status === 429) {
          return deny(e.code, e.message)
        }
        if (renewal && cur.current) return
        const n = Math.min(attempt.current++, 4)
        setState({ kind: 'reconnecting', message: e.message || 'Ulanib bo‘lmadi' })
        later(() => connect(false), [1000, 2000, 4000, 8000, 15000][n])
      }
    },
    [streamId, tab, deny, onDrop],
  )

  // lifecycle
  useEffect(() => {
    alive.current = true
    connect(false)
    return () => {
      alive.current = false
      clearTimers()
      closeConn(cur.current)
      cur.current = null
    }
  }, [connect])

  // Don't keep video running in a hidden tab for long (bandwidth/CPU).
  useEffect(() => {
    let hiddenTimer = 0
    const fn = () => {
      if (document.hidden) {
        hiddenTimer = window.setTimeout(() => {
          clearTimers()
          closeConn(cur.current)
          cur.current = null
          setState({ kind: 'paused' })
        }, 60000)
      } else {
        clearTimeout(hiddenTimer)
        setState((s) => {
          if (s.kind === 'paused') later(() => connect(false), 0)
          return s
        })
      }
    }
    document.addEventListener('visibilitychange', fn)
    return () => {
      clearTimeout(hiddenTimer)
      document.removeEventListener('visibilitychange', fn)
    }
  }, [connect])

  // server push: precise reason when the server cut this session
  useServerEvents((e) => {
    if (e.kind === 'media_ended' && e.data?.streamId === streamId && e.data?.tab === tab) {
      const r = e.data.reason as string
      if (r === 'lease_expired' || r === 'disconnected' || r === 'client_closed') return
      deny(r, e.data.message)
    }
    if (e.kind === 'permissions') {
      setState((s) => {
        if (s.kind === 'denied') later(() => connect(false), 300)
        return s
      })
    }
  })

  // bitrate / resolution readout (real browser stats)
  useEffect(() => {
    let lastBytes = 0
    let lastTs = 0
    const id = window.setInterval(async () => {
      const c = cur.current
      if (!c) return setKbps(null)
      const stats = await c.pc.getStats()
      stats.forEach((r: any) => {
        if (r.type === 'inbound-rtp' && r.kind === 'video') {
          if (lastTs && r.timestamp > lastTs) setKbps(((r.bytesReceived - lastBytes) * 8) / (r.timestamp - lastTs))
          lastBytes = r.bytesReceived
          lastTs = r.timestamp
          if (r.frameWidth) setRes(`${r.frameWidth}×${r.frameHeight}${r.framesPerSecond ? ' ' + Math.round(r.framesPerSecond) + 'fps' : ''}`)
        }
      })
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const fullscreen = () => {
    const el = boxRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  return (
    <div className={`player ${compact ? 'compact' : ''}`} ref={boxRef}>
      <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture controlsList="nodownload noremoteplayback" onDoubleClick={fullscreen} />
      {state.kind === 'playing' && watermark && <Watermark text={watermark} />}
      <div className="player-top">
        <span className="player-name">
          {name}
          {isDemo && <span className="tag demo">DEMO</span>}
        </span>
        <span className="player-meta">
          {state.kind === 'playing' && kbps !== null && `${(kbps / 1000).toFixed(2)} Mbit/s`} {state.kind === 'playing' && res}
        </span>
        <button className="icon" title="To'liq ekran" onClick={fullscreen}>
          ⛶
        </button>
      </div>
      {state.kind !== 'playing' && (
        <div className={`player-overlay ${state.kind}`}>
          {state.kind === 'connecting' && (
            <>
              <div className="spinner" /> Ulanmoqda…
            </>
          )}
          {state.kind === 'reconnecting' && (
            <>
              <div className="spinner" /> {state.message}
            </>
          )}
          {state.kind === 'offline' && <>Manba efirda emas (pult ulanmagan). Kutilmoqda…</>}
          {state.kind === 'paused' && (
            <>
              Yashirin oynada video to'xtatildi (trafikni tejash).
              <button onClick={() => connect(false)}>Davom ettirish</button>
            </>
          )}
          {state.kind === 'denied' && (
            <>
              <strong>{DENY_TITLES[state.code] || 'Ulanish to‘xtatildi'}</strong>
              <span>{state.message}</span>
              {['too_many_sessions', 'auth_unavailable'].includes(state.code) && <button onClick={() => connect(false)}>Qayta urinish</button>}
            </>
          )}
          {state.kind === 'error' && <>{state.message}</>}
        </div>
      )}
    </div>
  )
}

function Watermark({ text }: { text: string }) {
  const [now, setNow] = useState(Date.now())
  const [pos, setPos] = useState(0)
  useEffect(() => {
    const a = setInterval(() => setNow(Date.now()), 1000)
    const b = setInterval(() => setPos((p) => (p + 1) % 4), 20000)
    return () => {
      clearInterval(a)
      clearInterval(b)
    }
  }, [])
  return (
    <div className={`watermark pos${pos}`} aria-hidden>
      {text}
      <br />
      {new Date(now).toLocaleString('uz-UZ', { hour12: false })}
    </div>
  )
}
