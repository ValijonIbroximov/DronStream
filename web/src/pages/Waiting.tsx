import type { SessionInfo } from '../api'
import { Brand } from './Login'

export default function WaitingPage({ info, onLogout }: { info: SessionInfo; onLogout: () => void }) {
  const st = info.guest?.status || info.session?.guestStatus || 'pending'
  return (
    <div className="center-screen">
      <div className="card auth-card">
        <Brand />
        <div className="guest-badge">Mehmon: {info.session?.name} (ism tasdiqlanmagan)</div>
        {st === 'pending' && (
          <>
            <div className="pulse-dot" />
            <h2>So'rovingiz administrator tasdig'ini kutmoqda</h2>
            <p className="muted">Bu sahifani ochiq qoldiring — tasdiqlangach avtomatik o'tasiz. Boshqa brauzerda kirsangiz, yangi so'rov kerak bo'ladi.</p>
          </>
        )}
        {st === 'rejected' && (
          <>
            <h2>So'rovingiz rad etildi</h2>
            {info.guest?.note && <p className="pre">{info.guest.note}</p>}
          </>
        )}
        {st === 'ended' && <h2>Mehmon sessiyasi yakunlangan</h2>}
        <button onClick={onLogout}>Chiqish</button>
      </div>
    </div>
  )
}
