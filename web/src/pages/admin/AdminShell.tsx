import { useEffect, useState } from 'react'
import { get, type SessionInfo } from '../../api'
import { useServerEvents } from '../../events'
import { navigate } from '../../router'
import { beep, toast, Toasts } from '../../components/ui'
import Dashboard from './Dashboard'
import Streams from './Streams'
import Requests from './Requests'
import Users from './Users'
import Viewers from './Viewers'
import Audit from './Audit'
import System from './System'

const NAV = [
  { p: '/', l: 'Bosh sahifa' },
  { p: '/streams', l: 'Streamlar' },
  { p: '/requests', l: "Kirish so'rovlari" },
  { p: '/users', l: 'Foydalanuvchilar va ruxsatlar' },
  { p: '/viewers', l: 'Faol tomoshabinlar' },
  { p: '/audit', l: 'Audit' },
  { p: '/system', l: 'Tarmoq va tizim' },
]

export default function AdminShell({ info, route, onLogout }: { info: SessionInfo; route: string; onLogout: () => void }) {
  const [pending, setPending] = useState(0)
  const [sound, setSound] = useState(() => localStorage.getItem('ds-sound') === '1')
  const [menu, setMenu] = useState(false)
  const [instance, setInstance] = useState('active')

  const refreshCounts = async () => {
    try {
      const o = await get<any>('/api/admin/overview')
      setPending(o.pendingGuests)
      setInstance(o.state.instanceState)
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    refreshCounts()
  }, [route])
  useEffect(() => localStorage.setItem('ds-sound', sound ? '1' : '0'), [sound])
  useEffect(() => {
    document.title = pending > 0 ? `(${pending}) DronStream admin` : 'DronStream admin'
  }, [pending])

  useServerEvents((e) => {
    if (e.kind === 'guest_request') {
      toast(`Yangi kirish so'rovi: ${e.data?.name ?? ''} (mehmon)`, 'info')
      if (sound) beep()
      refreshCounts()
    }
    if (e.kind === 'guests' || e.kind === 'state') refreshCounts()
    if (e.kind === 'alert' && e.data?.kind === 'publish_busy') toast(`Diqqat: "${e.data.stream}" ga ikkinchi manba ulanmoqchi bo'ldi — rad etildi`, 'error')
  })

  const page = route.split('?')[0]
  let body
  switch (page) {
    case '/streams':
      body = <Streams />
      break
    case '/requests':
      body = <Requests />
      break
    case '/users':
      body = <Users />
      break
    case '/viewers':
      body = <Viewers />
      break
    case '/audit':
      body = <Audit />
      break
    case '/system':
      body = <System />
      break
    default:
      body = <Dashboard />
  }

  return (
    <div className="admin">
      <aside className={menu ? 'open' : ''}>
        <div className="brand-small">
          <img src="/favicon.svg" alt="" width={24} height={24} /> DronStream
        </div>
        <nav>
          {NAV.map((n) => (
            <a
              key={n.p}
              href={'#' + n.p}
              className={page === n.p || (n.p === '/' && !NAV.some((x) => x.p === page)) ? 'active' : ''}
              onClick={() => setMenu(false)}
            >
              {n.l}
              {n.p === '/requests' && pending > 0 && <span className="badge">{pending}</span>}
            </a>
          ))}
          <a href="#/watch">▶ Tomosha qilish</a>
        </nav>
        <div className="aside-foot">
          <label className="switch">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Yangi so'rovda tovush
          </label>
          <div className="muted small">{info.session?.name} (admin)</div>
          <div className="row gap">
            <button onClick={() => navigate('/system')}>Parol</button>
            <button onClick={onLogout}>Chiqish</button>
          </div>
        </div>
      </aside>
      <main>
        <button className="menu-btn" onClick={() => setMenu(!menu)}>
          ☰ Menyu
        </button>
        {instance !== 'active' && (
          <div className="alert error">
            {instance === 'standby'
              ? "Server KUTISH rejimida (backupdan tiklangan). Publish va tomosha rad etiladi. Eski server o'chirilganini tekshirib, Tarmoq va tizim bo'limida faollashtiring."
              : "Bu server boshqa kompyuterga KO'CHIRILGAN deb belgilangan: publish va tomosha rad etiladi."}
          </div>
        )}
        {body}
      </main>
      <Toasts />
    </div>
  )
}
