import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const HELP_URL = '/api/admin/help/'
const LABEL = 'Yordam va qo‘llanma'

// The "?" button of the admin interface. The guide opens in an overlay on top
// of the page instead of navigating away, so videos that are playing keep
// their connections. The guide itself is served only to administrators.
export function HelpButton() {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const close = useCallback(() => setOpen(false), [])
  // Give the focus back to the button once the dialog is really gone (an
  // effect runs after the overlay's cleanup has lifted "inert" from the page).
  useEffect(() => {
    if (!open && wasOpen.current) btn.current?.focus()
    wasOpen.current = open
  }, [open])
  return (
    <>
      <button ref={btn} type="button" className="help-btn" title={LABEL} aria-label={LABEL} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        ?
      </button>
      {open && <HelpOverlay onClose={close} />}
    </>
  )
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeBtn.current?.focus()
    const app = document.getElementById('root')
    app?.setAttribute('inert', '') // keyboard focus stays in the dialog; nothing behind it is unmounted
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // the guide (same origin, inside the frame) asks to be closed when Escape is pressed there
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data && e.data.type === 'ds-help-close') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('message', onMsg)
    return () => {
      app?.removeAttribute('inert')
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('message', onMsg)
    }
  }, [onClose])
  return createPortal(
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label={LABEL}>
      <div className="help-bar">
        <strong>{LABEL}</strong>
        <a href={HELP_URL} target="_blank" rel="noopener noreferrer">
          Yangi tabda ochish ↗
        </a>
        <button ref={closeBtn} type="button" onClick={onClose}>
          Yopish ✕
        </button>
      </div>
      <iframe src={HELP_URL} title="DronStream qo‘llanmasi" />
    </div>,
    document.body,
  )
}
