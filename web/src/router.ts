import { useEffect, useState } from 'react'

function current() {
  const h = window.location.hash.replace(/^#/, '')
  return h || '/'
}

export function useHashRoute() {
  const [r, setR] = useState(current())
  useEffect(() => {
    const fn = () => setR(current())
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  return r
}

export function navigate(p: string) {
  window.location.hash = p
}
