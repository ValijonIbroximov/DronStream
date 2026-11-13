import { useEffect, useState } from 'react'
import { get, post, fmtTime, tashkentInputToUTC, utcToTashkentInput } from '../api'
import ObjectPicker, { type CollectionLite, type ContentLite, type Pick, TYPE_LABEL } from './ObjectPicker'
import ShareDialog, { type Share } from './ShareDialog'
import { Modal, toast } from './ui'

export interface WizardPreset {
  mode?: 'users' | 'link'
  userIds?: number[]
  preset?: 'once' | 'multi' | 'timed'
  name?: string
  objects?: Pick[]
  maxUses?: number
  maxParallel?: number
  sessionMinutes?: number
}

interface UserLite {
  id: number
  username: string
  displayName: string
  role: string
  status: string
}

const PRESETS = {
  once: { l: 'Bir martalik havola', d: 'Faqat bitta brauzer ochadi. Boshqa brauzerda rad etiladi.' },
  multi: { l: 'Bir necha martalik havola', d: 'N ta yangi brauzer sessiyasi. Refresh, tab va qayta ulanish hisoblanmaydi.' },
  timed: { l: 'Vaqtinchalik havola', d: 'Boshlanish–tugash oralig‘ida kirish; tugashi bilan ochiq sessiyalar ham yopiladi.' },
}

export default function AccessWizard({ initial, onClose, onDone }: { initial?: WizardPreset; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<'users' | 'link'>(initial?.mode || 'link')
  const [userIds, setUserIds] = useState<number[]>(initial?.userIds || [])
  const [preset, setPreset] = useState<'once' | 'multi' | 'timed'>(initial?.preset || 'once')
  const [name, setName] = useState(initial?.name || '')
  const [forUser, setForUser] = useState<number | ''>('')
  const [objects, setObjects] = useState<Pick[]>(initial?.objects || [])
  const now = Date.now()
  const [userExpiry, setUserExpiry] = useState('')
  const [sessionMinutes, setSessionMinutes] = useState(initial?.sessionMinutes || 120)
  const [maxUses, setMaxUses] = useState(initial?.maxUses || 3)
  const [maxParallel, setMaxParallel] = useState(initial?.maxParallel || 3)
  const [startsAt, setStartsAt] = useState(utcToTashkentInput(now))
  const [endsAt, setEndsAt] = useState(utcToTashkentInput(now + 24 * 3600_000))
  const [hasEnd, setHasEnd] = useState(true)
  const [contents, setContents] = useState<ContentLite[]>([])
  const [collections, setCollections] = useState<CollectionLite[]>([])
  const [users, setUsers] = useState<UserLite[]>([])
  const [copyFrom, setCopyFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [share, setShare] = useState<Share | null>(null)
  const [links, setLinks] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    get<ContentLite[]>('/api/admin/contents').then(setContents)
    get<CollectionLite[]>('/api/admin/collections').then(setCollections)
    get<UserLite[]>('/api/admin/users').then(setUsers)
    get<{ id: number; name: string }[]>('/api/admin/links').then(setLinks)
  }, [])

  const loadTemplate = async (v: string) => {
    setCopyFrom(v)
    if (!v) return
    const [t, id] = v.split(':')
    const gs = await get<{ objectType: 'content' | 'collection'; objectId: number; includeFuture: boolean }[]>(`/api/admin/grants?subjectType=${t}&subjectId=${id}`)
    setObjects(gs.map((g) => ({ type: g.objectType, id: g.objectId, includeFuture: g.includeFuture })))
    toast(`${gs.length} ta ruxsat shablondan olindi`, 'info')
  }

  const linkEnd = mode === 'link' && (preset === 'timed' || hasEnd) ? tashkentInputToUTC(endsAt) : null
  const linkStart = mode === 'link' && preset === 'timed' ? tashkentInputToUTC(startsAt) : null
  const valid1 = mode === 'users' ? userIds.length > 0 : name.trim().length > 0
  const valid2 = objects.length > 0
  const valid3 =
    mode === 'users'
      ? !userExpiry || (tashkentInputToUTC(userExpiry) || 0) > now
      : sessionMinutes >= 5 && maxParallel >= 1 && (preset !== 'multi' || maxUses >= 2) && (preset !== 'timed' || (linkStart !== null && linkEnd !== null && linkEnd > linkStart)) && (linkEnd === null || linkEnd > now) && (preset !== 'multi' || true)

  const objLabel = (p: Pick) =>
    p.type === 'collection'
      ? `To'plam: ${collections.find((c) => c.id === p.id)?.title ?? p.id} (${p.includeFuture ? 'dinamik — keyingi qo‘shilganlar ham' : 'faqat hozirgi elementlar'})`
      : `${TYPE_LABEL[contents.find((c) => c.id === p.id)?.type || 'text']}: ${contents.find((c) => c.id === p.id)?.title ?? p.id}`

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      if (mode === 'users') {
        await post('/api/admin/grants', { subjectType: 'user', subjectIds: userIds, objects, expiresAt: userExpiry ? tashkentInputToUTC(userExpiry) : null })
        toast('Ruxsatlar qo‘llandi', 'ok')
        const s = await get<Share>('/api/admin/login-share')
        setShare({ ...s, title: 'DronStream: umumiy kirish havolasi (login-parol bilan)' })
      } else {
        const body = {
          name,
          preset,
          maxUses: preset === 'once' ? 1 : preset === 'multi' ? maxUses : null,
          maxParallel: preset === 'once' ? 1 : maxParallel,
          startsAt: linkStart,
          endsAt: linkEnd,
          sessionMinutes,
          forUserId: forUser || null,
          objects,
        }
        const r = await post<{ share: Share }>('/api/admin/links', body)
        toast('Havola yaratildi', 'ok')
        setShare(r.share)
      }
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (share) {
    return (
      <ShareDialog
        share={share}
        heading={mode === 'users' ? 'Doimiy foydalanuvchiga umumiy kirish havolasi' : undefined}
        onClose={() => {
          setShare(null)
          onDone()
        }}
      />
    )
  }

  return (
    <Modal title="Ruxsat berish / Havola yaratish" onClose={onClose} wide>
      <div className="wizard-steps">
        <span className={step === 1 ? 'on' : ''}>1. Kimga va qanday</span>
        <span className={step === 2 ? 'on' : ''}>2. Nimaga</span>
        <span className={step === 3 ? 'on' : ''}>3. Cheklovlar</span>
        <span className={step === 4 ? 'on' : ''}>Tasdiq</span>
      </div>

      {step === 1 && (
        <div className="form">
          <div className="tabs">
            <button className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>
              Maxsus havola (login-parolsiz)
            </button>
            <button className={mode === 'users' ? 'active' : ''} onClick={() => setMode('users')}>
              Doimiy foydalanuvchi(lar)
            </button>
          </div>
          {mode === 'link' ? (
            <>
              <div className="checks">
                {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
                  <label key={k} className="pick-row">
                    <input type="radio" checked={preset === k} onChange={() => setPreset(k)} />
                    <span className="grow">
                      <b>{PRESETS[k].l}</b>
                      <br />
                      <span className="muted small">{PRESETS[k].d}</span>
                    </span>
                  </label>
                ))}
              </div>
              <label>
                Havola nomi (kimga yoki nima uchun — faqat admin uchun yorliq, shaxsni tasdiqlamaydi)
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="masalan: Hamkor tashkilot, 13-noyabr" />
              </label>
              <label>
                Doimiy hisobga bog'lash (ixtiyoriy: hisob bloklansa havola ham ishlamaydi)
                <select value={forUser} onChange={(e) => setForUser(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">— bog'lanmagan —</option>
                  {users.filter((u) => u.role !== 'admin').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.username})
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <p className="muted small">Doimiy foydalanuvchilar umumiy kirish havolasi orqali o'z login-paroli bilan kiradi; maxsus token kerak emas.</p>
              <div className="pick-list">
                {users.filter((u) => u.role !== 'admin').map((u) => (
                  <label key={u.id} className="pick-row">
                    <input type="checkbox" checked={userIds.includes(u.id)} onChange={() => setUserIds(userIds.includes(u.id) ? userIds.filter((x) => x !== u.id) : [...userIds, u.id])} />
                    <span className="grow">
                      {u.displayName} <span className="muted small">({u.username})</span> {u.status === 'blocked' && <span className="tag">bloklangan</span>}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <>
          <div className="row gap wrap small" style={{ marginBottom: 6 }}>
            Shablon:
            <select value={copyFrom} onChange={(e) => loadTemplate(e.target.value)}>
              <option value="">— mavjud sozlamadan nusxa olish —</option>
              {users.filter((u) => u.role !== 'admin').map((u) => (
                <option key={'u' + u.id} value={`user:${u.id}`}>
                  Foydalanuvchi: {u.displayName}
                </option>
              ))}
              {links.map((l) => (
                <option key={'l' + l.id} value={`link:${l.id}`}>
                  Havola: {l.name}
                </option>
              ))}
            </select>
          </div>
          <ObjectPicker contents={contents} collections={collections} value={objects} onChange={setObjects} />
        </>
      )}

      {step === 3 && (
        <div className="form">
          {mode === 'users' ? (
            <label>
              Ruxsat tugashi (ixtiyoriy, Toshkent vaqti)
              <input type="datetime-local" value={userExpiry} onChange={(e) => setUserExpiry(e.target.value)} />
            </label>
          ) : (
            <>
              <label>
                Har bir sessiya davomiyligi (daqiqa; muddatsiz sessiya yo'q)
                <input type="number" min={5} max={43200} value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} />
              </label>
              {preset === 'multi' && (
                <label>
                  Jami foydalanish soni (N ta yangi brauzer)
                  <input type="number" min={2} max={100000} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
                </label>
              )}
              {preset !== 'once' && (
                <label>
                  Bir vaqtdagi faol sessiyalar chegarasi
                  <input type="number" min={1} max={1000} value={maxParallel} onChange={(e) => setMaxParallel(Number(e.target.value))} />
                </label>
              )}
              {preset === 'timed' && (
                <label>
                  Boshlanish (Toshkent vaqti)
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </label>
              )}
              {preset !== 'timed' && (
                <label className="switch">
                  <input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} /> Havolaning o'zi ham muddat bilan tugasin
                </label>
              )}
              {(preset === 'timed' || hasEnd) && (
                <label>
                  Tugash (Toshkent vaqti) — shu paytda ochiq sessiyalar ham yopiladi
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </label>
              )}
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="summary">
          <ul>
            {mode === 'users' ? (
              <li>
                <b>Kimga:</b> {userIds.map((id) => users.find((u) => u.id === id)?.displayName).join(', ')} (doimiy hisob, login-parol bilan)
              </li>
            ) : (
              <>
                <li>
                  <b>Turi:</b> {PRESETS[preset].l} — "{name}"
                </li>
                <li>
                  <b>Foydalanish:</b> {preset === 'once' ? '1 marta (bitta brauzer)' : preset === 'multi' ? `${maxUses} marta` : 'vaqt oralig‘ida cheklanmagan'}; bir vaqtda {preset === 'once' ? 1 : maxParallel} sessiya
                </li>
                <li>
                  <b>Sessiya:</b> {sessionMinutes} daqiqa
                </li>
                {linkStart && (
                  <li>
                    <b>Boshlanadi:</b> {fmtTime(linkStart)}
                  </li>
                )}
                <li>
                  <b>Tugaydi:</b> {linkEnd ? fmtTime(linkEnd) + ' (Toshkent vaqti)' : 'foydalanish tugaguncha / admin bekor qilguncha'}
                </li>
              </>
            )}
            <li>
              <b>Ruxsat:</b>
              <ul>
                {objects.map((o) => (
                  <li key={o.type + o.id}>{objLabel(o)}</li>
                ))}
              </ul>
            </li>
            {mode === 'users' && (
              <li>
                <b>Muddat:</b> {userExpiry ? fmtTime(tashkentInputToUTC(userExpiry)) + ' gacha' : 'admin olib tashlaguncha'}
              </li>
            )}
          </ul>
        </div>
      )}

      {err && <div className="alert error">{err}</div>}
      <div className="row gap" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <button onClick={() => (step === 1 ? onClose() : setStep(step - 1))}>{step === 1 ? 'Bekor qilish' : 'Orqaga'}</button>
        {step < 4 ? (
          <button className="primary" disabled={(step === 1 && !valid1) || (step === 2 && !valid2) || (step === 3 && !valid3)} onClick={() => setStep(step + 1)}>
            Keyingi
          </button>
        ) : (
          <button className="primary" disabled={busy} onClick={submit}>
            {mode === 'users' ? 'Qo‘llash' : 'Yaratish va ulashish'}
          </button>
        )}
      </div>
    </Modal>
  )
}
