import { useEffect, useRef } from 'react'

export interface ServerEvent {
  kind: string
  data?: any
}

type Handler = (e: ServerEvent) => void
const handlers = new Set<Handler>()
let es: EventSource | null = null
let connected = false
const stateListeners = new Set<(c: boolean) => void>()

function ensure() {
  if (es) return
  es = new EventSource('/api/events', { withCredentials: true })
  es.onopen = () => {
    connected = true
    stateListeners.forEach((l) => l(true))
    handlers.forEach((h) => h({ kind: 'reconnected' }))
  }
  es.onerror = () => {
    connected = false
    stateListeners.forEach((l) => l(false))
  }
  es.onmessage = (m) => {
    try {
      const e = JSON.parse(m.data) as ServerEvent
      handlers.forEach((h) => h(e))
    } catch {
      /* ignore */
    }
  }
}

export function closeEvents() {
  es?.close()
  es = null
  connected = false
}

/** Subscribe to server-sent events while the component is mounted. */
export function useServerEvents(h: Handler, enabled = true) {
  const ref = useRef(h)
  ref.current = h
  useEffect(() => {
    if (!enabled) return
    ensure()
    const fn: Handler = (e) => ref.current(e)
    handlers.add(fn)
    return () => {
      handlers.delete(fn)
    }
  }, [enabled])
}

export function eventsConnected() {
  return connected
}
