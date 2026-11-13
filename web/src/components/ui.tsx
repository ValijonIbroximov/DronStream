import { useCallback, useEffect, useState, type ReactNode } from 'react'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon" onClick={onClose} aria-label="Yopish">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Runs an action with confirm() and reports errors via the toast. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (fn: () => Promise<unknown>, opts?: { confirm?: string; ok?: string }) => {
    if (opts?.confirm && !window.confirm(opts.confirm)) return false
    setBusy(true)
    try {
      await fn()
      if (opts?.ok) toast(opts.ok, 'ok')
      return true
    } catch (e: any) {
      toast(e.message || 'Xatolik', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }, [])
  return { busy, run }
}

type ToastT = { id: number; text: string; kind: 'ok' | 'error' | 'info' }
let toasts: ToastT[] = []
const subs = new Set<(t: ToastT[]) => void>()
export function toast(text: string, kind: ToastT['kind'] = 'info') {
  const t = { id: Date.now() + Math.random(), text, kind }
  toasts = [...toasts, t]
  subs.forEach((s) => s(toasts))
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    subs.forEach((s) => s(toasts))
  }, 5000)
}
export function Toasts() {
  const [l, setL] = useState<ToastT[]>([])
  useEffect(() => {
    subs.add(setL)
    return () => {
      subs.delete(setL)
    }
  }, [])
  return (
    <div className="toasts" role="status">
      {l.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = [], intervalMs = 0) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState('')
  const reload = useCallback(async () => {
    try {
      setData(await fn())
      setErr('')
    } catch (e: any) {
      setErr(e.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    reload()
    if (!intervalMs) return
    const t = setInterval(reload, intervalMs)
    return () => clearInterval(t)
  }, [reload, intervalMs])
  return { data, err, reload }
}

export function Dot({ on, title }: { on: boolean; title?: string }) {
  return <span className={`dot ${on ? 'on' : 'off'}`} title={title} />
}

export function CopyField({ value, secret }: { value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret)
  return (
    <div className="copy-field">
      <code>{shown ? value : '•'.repeat(Math.min(value.length, 32))}</code>
      {secret && <button onClick={() => setShown(!shown)}>{shown ? 'Yashirish' : "Ko'rsatish"}</button>}
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value).then(
            () => toast('Nusxa olindi', 'ok'),
            () => toast('Nusxa olib bo‘lmadi — qo‘lda belgilang', 'error'),
          )
        }}
      >
        Nusxa
      </button>
    </div>
  )
}

/** Short beep via WebAudio (no external asset). */
export function beep() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.5)
  } catch {
    /* ignore */
  }
}

export function durationOptions() {
  return [
    { v: 30, l: '30 daqiqa' },
    { v: 60, l: '1 soat' },
    { v: 120, l: '2 soat' },
    { v: 240, l: '4 soat' },
    { v: 480, l: '8 soat' },
    { v: 1440, l: '24 soat' },
    { v: 10080, l: '7 kun' },
  ]
}

export { utcToTashkentInput as toLocalInput } from '../api'
