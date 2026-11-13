import { useState } from 'react'
import { del, get, post, put, fmtTime } from '../../api'
import { useServerEvents } from '../../events'
import { CopyField, Dot, Modal, useAction, useLoad } from '../../components/ui'
import type { AdminStream } from './Dashboard'

interface KeyInfo {
  key: string
  urls: Record<string, string>
}

export default function Streams() {
  const { data, err, reload } = useLoad(() => get<AdminStream[]>('/api/admin/streams'), [], 3000)
  const { busy, run } = useAction()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminStream | null>(null)
  const [keyInfo, setKeyInfo] = useState<{ s: AdminStream; k: KeyInfo; fresh?: boolean } | null>(null)
  useServerEvents((e) => ['streams', 'media'].includes(e.kind) && reload())

  return (
    <div className="page">
      <div className="row between">
        <h1>Streamlar (pultlar)</h1>
        <button className="primary" onClick={() => setCreating(true)}>
          + Yangi stream
        </button>
      </div>
      {err && <div className="alert error">{err}</div>}
      <p className="muted small">
        "Tomoshani yopish" — barcha tomoshabinlarni uzadi, pultdan qabul qilish davom etadi. "Publishni taqiqlash" — pultning video yuborishini rad
        etadi. Bu ikki alohida amal. Bir kalit bilan ikkinchi manba ulana olmaydi: birinchi ulangan manba ushlab turadi.
      </p>
      <div className="stream-list">
        {data?.map((s) => (
          <div key={s.id} className="card stream-card">
            <div className="row between">
              <h3>
                <Dot on={s.stats.online} /> {s.name} {s.isDemo && <span className="tag demo">DEMO — test tasvir</span>}
              </h3>
              <code className="muted">live/{s.slug}</code>
            </div>
            {s.description && <p className="pre muted small">{s.description}</p>}
            <div className="kv small">
              <span>Holat</span>
              <span>{s.stats.online ? `efirda (${s.stats.onlineSince ? fmtTime(Date.parse(s.stats.onlineSince)) : ''} dan)` : 'offline'}</span>
              {s.stats.online && (
                <>
                  <span>Manba</span>
                  <span>
                    {s.stats.sourceType || '—'} {s.stats.sourceAddr && <>· {s.stats.sourceAddr}</>}
                  </span>
                  <span>Kodek / o'lcham</span>
                  <span>
                    {(s.stats.codecs || []).join(', ') || '—'} {s.stats.width ? `· ${s.stats.width}×${s.stats.height}` : ''}
                  </span>
                  <span>Kiruvchi bitrate</span>
                  <span>{(s.stats.inboundKbps / 1000).toFixed(2)} Mbit/s</span>
                  <span>Chiquvchi (tomoshabinlarga)</span>
                  <span>{(s.stats.outboundKbps / 1000).toFixed(2)} Mbit/s</span>
                  <span>Xatoli kadrlar</span>
                  <span>{s.stats.framesInError}</span>
                </>
              )}
              <span>Faol video ulanishlar</span>
              <span>{s.viewers}</span>
              <span>Kalit</span>
              <span>{s.hasKey ? `v${s.keyVersion}, ${fmtTime(s.keySetAt)}` : <b className="bad">bekor qilingan</b>}</span>
              <span>URL turi</span>
              <span>{s.publishMode === 'query' ? '?key= (query)' : 'kalit yo‘lda (path)'}</span>
            </div>
            {s.isDemo && <p className="muted small">Statistika demo test oqimiga tegishli — haqiqiy pult ko'rsatkichi emas.</p>}
            <div className="row gap wrap">
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const k = await get<KeyInfo>(`/api/admin/streams/${s.id}/key`)
                    setKeyInfo({ s, k })
                  })
                }
              >
                Pult URL va kalit
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    async () => {
                      const k = await post<KeyInfo>(`/api/admin/streams/${s.id}/rotate-key`)
                      setKeyInfo({ s, k, fresh: true })
                      reload()
                    },
                    { confirm: 'Yangi kalit yaratilsinmi? Eski kalit darhol ishlamay qoladi va joriy pult uziladi.' },
                  )
                }
              >
                Kalitni almashtirish
              </button>
              {s.hasKey && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() => post(`/api/admin/streams/${s.id}/revoke-key`).then(reload), {
                      confirm: 'Kalit bekor qilinsinmi? Yangi kalit yaratilmaguncha pult ulana olmaydi.',
                      ok: 'Kalit bekor qilindi',
                    })
                  }
                >
                  Kalitni bekor qilish
                </button>
              )}
              <button
                className={s.viewingEnabled ? 'warn' : 'primary'}
                disabled={busy}
                onClick={() =>
                  run(() => post(`/api/admin/streams/${s.id}/viewing`, { enabled: !s.viewingEnabled }).then(reload), {
                    confirm: s.viewingEnabled ? 'Bu stream barcha tomoshabinlar uchun yopilsinmi?' : undefined,
                  })
                }
              >
                {s.viewingEnabled ? 'Tomoshani yopish' : 'Tomoshani ochish'}
              </button>
              <button
                className={s.publishEnabled ? 'warn' : 'primary'}
                disabled={busy}
                onClick={() =>
                  run(() => post(`/api/admin/streams/${s.id}/publish`, { enabled: !s.publishEnabled }).then(reload), {
                    confirm: s.publishEnabled ? 'Pultdan video qabul qilish taqiqlansinmi? (joriy manba uziladi)' : undefined,
                  })
                }
              >
                {s.publishEnabled ? 'Publishni taqiqlash' : 'Publishga ruxsat'}
              </button>
              {s.stats.online && (
                <button disabled={busy} onClick={() => run(() => post(`/api/admin/streams/${s.id}/kick-publisher`).then(reload), { confirm: 'Joriy manba uzilsinmi? (u qayta ulanishi mumkin)' })}>
                  Manbani uzish
                </button>
              )}
              <button onClick={() => setEditing(s)}>Tahrirlash</button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => run(() => del(`/api/admin/streams/${s.id}`).then(reload), { confirm: `"${s.name}" o'chirilsinmi? Ruxsatlar ham o'chadi.` })}
              >
                O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
      {creating && <StreamForm onClose={() => setCreating(false)} onSaved={(s, k) => (reload(), setCreating(false), setKeyInfo({ s, k, fresh: true }))} />}
      {editing && <StreamForm stream={editing} onClose={() => setEditing(null)} onSaved={() => (reload(), setEditing(null))} />}
      {keyInfo && <KeyModal {...keyInfo} onClose={() => setKeyInfo(null)} />}
    </div>
  )
}

function StreamForm({ stream, onClose, onSaved }: { stream?: AdminStream; onClose: () => void; onSaved: (s: AdminStream, k: KeyInfo) => void }) {
  const [f, setF] = useState({ name: stream?.name || '', slug: stream?.slug || '', description: stream?.description || '', publishMode: stream?.publishMode || 'query' })
  const { busy, run } = useAction()
  return (
    <Modal title={stream ? 'Streamni tahrirlash' : 'Yangi stream (pult)'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            if (stream) {
              await put(`/api/admin/streams/${stream.id}`, f)
              onSaved(stream, { key: '', urls: {} })
            } else {
              const r = await post<{ stream: AdminStream; key: string; urls: Record<string, string> }>('/api/admin/streams', f)
              onSaved(r.stream, { key: r.key, urls: r.urls })
            }
          })
        }}
      >
        <label>
          Nomi
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} />
        </label>
        {!stream && (
          <label>
            Yo'l nomi (lotin kichik harf, raqam, - _)
            <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} required pattern="[a-z0-9][a-z0-9_-]{1,39}" />
          </label>
        )}
        <label>
          Izoh
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} maxLength={500} />
        </label>
        <label>
          Pult URL turi
          <select value={f.publishMode} onChange={(e) => setF({ ...f, publishMode: e.target.value as any })}>
            <option value="query">rtmp://…/live/nom?key=KALIT (tavsiya)</option>
            <option value="path">rtmp://…/live/nom/KALIT (pult "?" ni qabul qilmasa)</option>
          </select>
        </label>
        <button className="primary" disabled={busy}>
          Saqlash
        </button>
      </form>
    </Modal>
  )
}

function KeyModal({ s, k, fresh, onClose }: { s: AdminStream; k: KeyInfo; fresh?: boolean; onClose: () => void }) {
  return (
    <Modal title={`Pult sozlamasi: ${s.name}`} onClose={onClose} wide>
      {fresh && <div className="alert warn">Yangi kalit yaratildi. Uni pultga kiriting. Eski kalit endi ishlamaydi.</div>}
      {!k.key ? (
        <p>Kalit bekor qilingan. "Kalitni almashtirish" bilan yangisini yarating.</p>
      ) : (
        <>
          <p className="muted small">Bu ma'lumot faqat administratorga ko'rinadi. Kalitni ko'rish auditga yoziladi. Publish kaliti video ko'rish huquqini bermaydi.</p>
          {k.urls.rtmps && (
            <>
              <h4>RTMPS (shifrlangan; pult qo'llashi va sertifikatni tekshirishi tasdiqlanmagan)</h4>
              <CopyField value={k.urls.rtmps} secret />
            </>
          )}
          {k.urls.rtmp && (
            <>
              <h4>RTMP — SHIFRLANMAGAN: video va kalit yo'lda ochiq ketadi</h4>
              <p className="muted small">Xususiy IP yoki Wi-Fi paroli shifrlash o'rnini bosmaydi. Faqat laboratoriya sinovi yoki shu kompyuterdagi shifrlangan gateway (tunnel/TLS) orqali.</p>
              <CopyField value={k.urls.rtmp} secret />
            </>
          )}
          <h4>Faqat kalit</h4>
          <CopyField value={k.key} secret />
          <p className="muted small">Agar pult URL va "stream key" ni alohida so'rasa — DJI_SETUP_UZ.md ga qarang.</p>
        </>
      )}
    </Modal>
  )
}
