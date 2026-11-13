import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, get, getCsrf, post } from '../api'
import { useServerEvents } from '../events'

interface TicketResp {
  ticket: string
  ticketExpiresAt: number
  leaseUntil: number
  serverNow?: number
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
  epoch: number
  connected: boolean
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
  rate: 'Juda ko‘p so‘rov',
  instance_standby: 'Server kutish rejimida',
  instance_migrated: 'Server ko‘chirilgan',
  auth_unavailable: 'Ruxsat xizmati ishlamayapti',
}

// Ended-reasons that are part of normal operation and must not be shown as a refusal.
const QUIET_END = ['lease_expired', 'disconnected', 'client_closed', 'superseded', 'connect_failed']
const RETRYABLE_DENY = ['too_many_sessions', 'auth_unavailable', 'rate']
const BACKOFF = [1000, 2000, 4000, 8000, 15000]
// The page loaded (HTTPS works) but the separate WebRTC media path did not.
const MEDIA_PATH_HINT =
  'Sahifa ochildi, lekin video kanali (WebRTC) ulanmadi. Server UDP porti, firewall yoki qurilmadagi lokal tarmoq ruxsatini tekshiring. Qayta urinilmoqda…'

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

// Closes the peer connection and tells the server, so the media session does
// not linger until a timeout. keepalive lets the request finish while the
// page is being closed or reloaded.
function closeConn(c: Conn | null) {
  if (!c) return
  try {
    c.pc.close()
  } catch {
    /* ignore */
  }
  if (c.resource) {
    fetch(c.resource, { method: 'DELETE', credentials: 'same-origin', keepalive: true, headers: { 'X-DS-Request': '1', 'X-CSRF-Token': getCsrf() } }).catch(() => {})
    c.resource = ''
  }
}

export default function Player({ streamId, name, tab, isDemo, compact }: { streamId: number; name: string; tab: string; isDemo?: boolean; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const cur = useRef<Conn | null>(null)
  // every connection that is not closed yet: the live one, a renewal, one still connecting
  const open = useRef<Set<Conn>>(new Set())
  // bumped whenever this player is torn down or re-targeted; older async work must stop
  const epoch = useRef(0)
  const timers = useRef<number[]>([])
  const attempt = useRef(0)
  const mediaFails = useRef(0)
  const limitRetries = useRef(0)
  const renewTries = useRef(0)
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
  const release = (c: Conn | null) => {
    if (!c) return
    open.current.delete(c)
    closeConn(c)
  }
  const releaseAll = () => {
    Array.from(open.current).forEach(release)
    cur.current = null
  }

  const deny = useCallback((code: string, message: string) => {
    epoch.current++ // anything still connecting must not start playing after a refusal
    clearTimers()
    releaseAll()
    if (videoRef.current) videoRef.current.srcObject = null
    setState({ kind: 'denied', code, message })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Decide what to show after a connection dropped.
  const onDrop = useCallback(async (dropped: Conn) => {
    if (dropped.epoch !== epoch.current || !open.current.has(dropped)) return
    const wasLive = cur.current === dropped
    release(dropped)
    if (!wasLive) {
      // a lease renewal failed while the live connection keeps playing: try again a few times
      if (cur.current && renewTries.current++ < 3) later(() => connect(true), 4000)
      return
    }
    cur.current = null
    if (!dropped.connected) mediaFails.current++
    try {
      const st = await get<StatusResp>(`/api/watch/${streamId}/status`)
      if (dropped.epoch !== epoch.current) return
      if (!st.ok) return deny(st.code, st.message)
      if (st.online === false) {
        setState({ kind: 'offline' })
        later(() => connect(false), 5000)
        return
      }
    } catch (e: any) {
      if (dropped.epoch !== epoch.current) return
      if (e instanceof ApiError && e.status === 401) return deny('session_ended', 'Sessiya yakunlandi')
    }
    const n = Math.min(attempt.current++, 4)
    setState({ kind: 'reconnecting', message: mediaFails.current >= 2 ? MEDIA_PATH_HINT : 'Ulanish uzildi — qayta ulanmoqda…' })
    later(() => connect(false), BACKOFF[n])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId])

  const connect = useCallback(
    async (renewal: boolean) => {
      const my = epoch.current
      const stale = () => my !== epoch.current
      if (!renewal) setState((s) => (s.kind === 'reconnecting' || s.kind === 'offline' ? s : { kind: 'connecting' }))
      let conn: Conn | null = null
      try {
        const t = await post<TicketResp>(`/api/watch/${streamId}/ticket`, { tab })
        if (stale()) return
        limitRetries.current = 0
        setWatermark(t.watermark)
        const pc = new RTCPeerConnection({ iceServers: t.iceServers || [] })
        const ms = new MediaStream()
        const c: Conn = { pc, resource: '', stream: ms, epoch: my, connected: false }
        conn = c
        open.current.add(c)
        pc.addTransceiver('video', { direction: 'recvonly' })
        pc.addTransceiver('audio', { direction: 'recvonly' })
        pc.ontrack = (e) => {
          ms.addTrack(e.track)
          if (!renewal || !cur.current || cur.current === c) {
            if (videoRef.current && videoRef.current.srcObject !== ms) videoRef.current.srcObject = ms
          }
        }
        let downTimer = 0
        pc.onconnectionstatechange = () => {
          if (stale()) return
          const s = pc.connectionState
          if (s === 'connected') {
            clearTimeout(downTimer)
            c.connected = true
            mediaFails.current = 0
            renewTries.current = 0
            if (cur.current !== c) {
              // make-before-break: switch to the renewed session, then close the old one
              const old = cur.current
              cur.current = c
              if (videoRef.current) videoRef.current.srcObject = ms
              release(old)
            }
            attempt.current = 0
            setState({ kind: 'playing' })
          } else if (s === 'failed' || s === 'closed') {
            onDrop(c)
          } else if (s === 'disconnected') {
            downTimer = window.setTimeout(() => onDrop(c), 3000)
          }
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await waitGathering(pc, 2500)
        if (stale()) return release(c)
        const { answer, location } = await whepOffer(streamId, t.ticket, pc.localDescription!.sdp)
        c.resource = location
        if (stale()) return release(c)
        await pc.setRemoteDescription({ type: 'answer', sdp: answer })
        if (stale()) return release(c)
        if (!cur.current) cur.current = c
        // Renew before the lease ends (the server closes the session at lease end).
        // The lease length is taken relative to the server clock, so a wrong
        // clock on the viewer's device cannot shift the renewal.
        const leaseMs = t.leaseUntil - (t.serverNow || Date.now())
        const renewIn = leaseMs - 15000
        if (renewIn > 5000) later(() => connect(true), renewIn)
      } catch (e: any) {
        release(conn)
        if (stale()) return
        const live = renewal && !!cur.current
        if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
          if (live) return // keep playing; the server will end it when access really ends
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
        if (live) {
          // A refused or failed renewal must never stop a video that is playing.
          if (renewTries.current++ < 3) later(() => connect(true), 4000)
          return
        }
        if (e instanceof ApiError && e.status === 429) {
          // Older connections of this player may still be closing: retry briefly, then explain.
          if (e.code === 'too_many_sessions' && limitRetries.current < 2) {
            limitRetries.current++
            setState({ kind: 'reconnecting', message: 'Ulanishlar chegarasi tekshirilmoqda…' })
            later(() => connect(false), 3000 * limitRetries.current)
            return
          }
          return deny(e.code, e.message)
        }
        const n = Math.min(attempt.current++, 4)
        setState({ kind: 'reconnecting', message: e.message || 'Ulanib bo‘lmadi' })
        later(() => connect(false), BACKOFF[n])
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamId, tab, deny, onDrop],
  )

  // lifecycle
  useEffect(() => {
    epoch.current++
    connect(false)
    return () => {
      epoch.current++
      clearTimers()
      releaseAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect])

  // Reload, tab close and navigation do not run React cleanup: close the media
  // sessions explicitly so they do not stay registered on the server.
  useEffect(() => {
    const hide = () => {
      epoch.current++
      clearTimers()
      releaseAll()
    }
    const show = (e: PageTransitionEvent) => {
      if (e.persisted) connect(false) // restored from the back/forward cache
    }
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', show)
    return () => {
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', show)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect])

  // Don't keep video running in a hidden tab for long (bandwidth/CPU).
  useEffect(() => {
    let hiddenTimer = 0
    const fn = () => {
      if (document.hidden) {
        hiddenTimer = window.setTimeout(() => {
          epoch.current++
          clearTimers()
          releaseAll()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect])

  // server push: precise reason when the server cut this session
  useServerEvents((e) => {
    if (e.kind === 'media_ended' && e.data?.streamId === streamId && e.data?.tab === tab) {
      const r = e.data.reason as string
      if (QUIET_END.includes(r)) return
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
  const retry = () => {
    limitRetries.current = 0
    connect(false)
  }

  return (
    <div className={`player ${compact ? 'compact' : ''}`} ref={boxRef} data-state={state.kind}>
      <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture controlsList="nodownload noremoteplayback" onDoubleClick={fullscreen} />
      {state.kind === 'playing' && watermark && <Watermark text={watermark} />}
      <div className="player-top">
        <span className="player-name" title={name}>
          {name}
        </span>
        {isDemo && <span className="tag demo">DEMO</span>}
        <button className="icon" title="To'liq ekran" aria-label="To'liq ekran" onClick={fullscreen}>
          ⛶
        </button>
      </div>
      {state.kind === 'playing' && (kbps !== null || res) && (
        <div className="player-stats" aria-hidden>
          {kbps !== null && <span>{(kbps / 1000).toFixed(2)} Mbit/s</span>}
          {res && <span className="res">{res}</span>}
        </div>
      )}
      {state.kind !== 'playing' && (
        <div className={`player-overlay ${state.kind}`} role="status">
          {state.kind === 'connecting' && (
            <>
              <div className="spinner" /> Ulanmoqda…
            </>
          )}
          {state.kind === 'reconnecting' && (
            <>
              <div className="spinner" /> <span>{state.message}</span>
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
              {RETRYABLE_DENY.includes(state.code) && <button onClick={retry}>Qayta urinish</button>}
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
