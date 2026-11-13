import type { SessionInfo } from '../api'
import { Brand } from './Login'

export default function WaitingPage({ info, onLogout }: { info: SessionInfo; onLogout: () => void }) {
  const isLink = info.session?.kind === 'link'
  const st = isLink ? info.session?.approval || 'pending' : info.guest?.status || info.session?.guestStatus || 'pending'
  const code = info.session?.verifyCode
  return (
    <div className="center-screen">
      <div className="card auth-card">
        <Brand />
        <div className="guest-badge">{isLink ? `Maxsus havola: ${info.session?.name}` : `Mehmon: ${info.session?.name} (ism tasdiqlanmagan)`}</div>
        {st === 'pending' && (
          <>
            <div className="pulse-dot" />
            <h2>So'rovingiz administrator tasdig'ini kutmoqda</h2>
            {code && (
              <div className="verify-code" aria-label="Tekshirish kodi">
                <span className="muted small">Tekshirish kodi</span>
                <b className="mono">{code}</b>
              </div>
            )}
            <p className="muted small">
              {isLink ? "Havolaning o'zi kirish huquqini bermaydi. " : ''}Administrator so'rasa, shu kodni unga ishonchli yo'l bilan (masalan telefon orqali)
              ayting — u aynan shu brauzerdagi so'rovni tasdiqlaydi. Bu sahifani ochiq qoldiring: tasdiqlangach avtomatik o'tasiz. Boshqa brauzer yoki qurilmada
              yangi so'rov va yangi tasdiq kerak bo'ladi.
            </p>
          </>
        )}
        {st === 'rejected' && (
          <>
            <h2>So'rovingiz rad etildi</h2>
            {isLink && <p className="muted small">Administrator bu brauzerdagi kirish so'rovini rad etdi.</p>}
            {info.guest?.note && <p className="pre">{info.guest.note}</p>}
          </>
        )}
        {st === 'ended' && <h2>Mehmon sessiyasi yakunlangan</h2>}
        <button onClick={onLogout}>Chiqish</button>
      </div>
    </div>
  )
}
