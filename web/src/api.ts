// Minimal API client. Every state-changing request carries the per-session
// CSRF token and a custom header (forces CORS preflight for cross-site pages).

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let csrf = ''
export function setCsrf(t: string | undefined) {
  csrf = t || ''
}
export function getCsrf() {
  return csrf
}

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()
export function onUnauthorized(l: Listener) {
  unauthorizedListeners.add(l)
  return () => {
    unauthorizedListeners.delete(l)
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown, raw?: { contentType: string; data: string; headers?: Record<string, string> }): Promise<T> {
  const headers: Record<string, string> = { 'X-DS-Request': '1' }
  if (csrf) headers['X-CSRF-Token'] = csrf
  let payload: BodyInit | undefined
  if (raw) {
    headers['Content-Type'] = raw.contentType
    Object.assign(headers, raw.headers || {})
    payload = raw.data
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let res: Response
  try {
    res = await fetch(path, { method, headers, body: payload, credentials: 'same-origin', cache: 'no-store' })
  } catch {
    throw new ApiError(0, 'network', "Server bilan aloqa yo'q")
  }
  if (res.status === 401 && path !== '/api/login' && path !== '/api/session') {
    unauthorizedListeners.forEach((l) => l())
  }
  const ct = res.headers.get('Content-Type') || ''
  if (!res.ok) {
    let code = 'error'
    let message = `Xatolik (${res.status})`
    if (ct.includes('json')) {
      const j = await res.json().catch(() => ({}))
      code = j.code || code
      message = j.message || message
    }
    throw new ApiError(res.status, code, message)
  }
  if (ct.includes('json')) return (await res.json()) as T
  return (await res.text()) as unknown as T
}

export const get = <T,>(p: string) => api<T>('GET', p)
export const post = <T,>(p: string, b?: unknown) => api<T>('POST', p, b ?? {})
export const put = <T,>(p: string, b?: unknown) => api<T>('PUT', p, b ?? {})
export const del = <T,>(p: string) => api<T>('DELETE', p)

// ---- types shared with the backend ----
export interface Session {
  id: number
  kind: 'user' | 'guest'
  role: 'admin' | 'user' | 'guest'
  name: string
  username?: string
  guestStatus?: string
  mustChangePassword?: boolean
  ip: string
  userAgent: string
  createdAt: number
  lastSeen: number
  expiresAt: number
}
export interface SessionInfo {
  authenticated: boolean
  setupNeeded: boolean
  csrf?: string
  session?: Session
  guestEnabled: boolean
  guest?: { status: string; accessUntil: number | null; note: string; name: string }
}
export interface ViewerStream {
  id: number
  name: string
  description: string
  isDemo: boolean
  online: boolean
  until: number
}

export function fmtTime(ms?: number | null) {
  if (!ms) return '—'
  const d = new Date(ms)
  return d.toLocaleString('uz-UZ', { hour12: false })
}
export function fmtAgo(ms?: number | null) {
  if (!ms) return '—'
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 5) return 'hozir'
  if (s < 60) return `${s} s oldin`
  if (s < 3600) return `${Math.round(s / 60)} daq oldin`
  if (s < 86400) return `${Math.round(s / 3600)} soat oldin`
  return `${Math.round(s / 86400)} kun oldin`
}
export function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1 << 20) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1 << 30) return `${(b / (1 << 20)).toFixed(1)} MB`
  return `${(b / (1 << 30)).toFixed(2)} GB`
}
