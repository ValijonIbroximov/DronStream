import { useCallback, useEffect, useState } from 'react'
import { get, onUnauthorized, post, setCsrf, type SessionInfo } from './api'
import { closeEvents, useServerEvents } from './events'
import { useHashRoute, navigate } from './router'
import LoginPage from './pages/Login'
import WaitingPage from './pages/Waiting'
import ViewerPage from './pages/Viewer'
import ChangePassword from './pages/ChangePassword'
import AdminShell from './pages/admin/AdminShell'

export default function App() {
  const [info, setInfo] = useState<SessionInfo | null>(null)
  const [err, setErr] = useState('')
  const [logoutReason, setLogoutReason] = useState('')
  const route = useHashRoute()

  const refresh = useCallback(async () => {
    try {
      const s = await get<SessionInfo>('/api/session')
      setCsrf(s.csrf)
      setInfo(s)
      setErr('')
    } catch (e: any) {
      setErr(e.message)
    }
  }, [])

  useEffect(() => {
    refresh()
    return onUnauthorized(() => {
      closeEvents()
      refresh()
    })
  }, [refresh])

  useServerEvents(
    (e) => {
      if (e.kind === 'logout' || e.kind === 'closed') {
        const reasons: Record<string, string> = {
          user_blocked: 'Hisobingiz administrator tomonidan bloklandi.',
          guest_ended: 'Mehmon sessiyangiz administrator tomonidan yakunlandi.',
          session_ended: 'Sessiyangiz administrator tomonidan yakunlandi.',
          password_reset: 'Parolingiz tiklandi. Yangi parol bilan kiring.',
          admin_logout_all: 'Administrator sizni barcha qurilmalardan chiqardi.',
        }
        setLogoutReason(reasons[e.data?.reason] || 'Sessiya yakunlandi.')
        closeEvents()
        refresh()
      }
      if (e.kind === 'guest_status') refresh()
    },
    !!info?.authenticated,
  )

  if (!info) {
    return <div className="center-screen">{err ? <div className="alert error">{err}</div> : <div className="spinner" />}</div>
  }

  const logout = async () => {
    try {
      await post('/api/logout')
    } catch {
      /* ignore */
    }
    closeEvents()
    setLogoutReason('')
    navigate('/')
    refresh()
  }

  if (info.session?.role !== 'admin' && document.title !== 'DronStream') document.title = 'DronStream'
  if (!info.authenticated || !info.session) {
    return <LoginPage info={info} onDone={refresh} notice={logoutReason} />
  }
  const s = info.session
  if (s.kind === 'guest' && info.guest?.status !== 'approved') {
    return <WaitingPage info={info} onLogout={logout} />
  }
  if (s.mustChangePassword) {
    return <ChangePassword forced onDone={refresh} onLogout={logout} />
  }
  if (s.role === 'admin' && !route.startsWith('/watch')) {
    return <AdminShell info={info} route={route} onLogout={logout} />
  }
  if (route === '/password') {
    return <ChangePassword onDone={() => navigate('/')} onLogout={logout} />
  }
  return <ViewerPage info={info} onLogout={logout} />
}
