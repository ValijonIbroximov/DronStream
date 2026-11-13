import { useEffect, useRef, useState } from 'react'
import { del, get, getCsrf, post, put, fmtBytes, fmtTime } from '../../api'
import { useServerEvents } from '../../events'
import { Modal, toast, useAction, useLoad } from '../../components/ui'
import { TYPE_LABEL } from '../../components/ObjectPicker'
import Streams from './Streams'

interface Item {
  id: number
  type: 'stream' | 'text' | 'image' | 'video'
  title: string
  description: string
  visible: boolean
  sortOrder: number
  streamId?: number
  streamSlug?: string
  body?: string
  mime?: string
  size?: number
  width?: number
  height?: number
  codec?: string
  hasThumb: boolean
  updatedAt: number
}

export default function Content() {
  const [tab, setTab] = useState<'library' | 'pults'>('library')
  return (
    <div className="page">
      <h1>Kontent</h1>
      <div className="tabs">
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
          Barcha kontent
        </button>
        <button className={tab === 'pults' ? 'active' : ''} onClick={() => setTab('pults')}>
          Dron pultlari (texnik: URL, kalit, statistika)
        </button>
      </div>
      {tab === 'library' ? <Library /> : <Streams />}
    </div>
  )
}

function Library() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const { data, err, reload } = useLoad(() => get<Item[]>(`/api/admin/contents?q=${encodeURIComponent(q)}&type=${type}`), [q, type])
  const [sel, setSel] = useState<number[]>([])
  const [bulk, setBulk] = useState(false)
  const [adding, setAdding] = useState<'' | 'text' | 'image' | 'video'>('')
  const { busy, run } = useAction()
  useServerEvents((e) => ['library', 'streams'].includes(e.kind) && reload())
  const items = data || []
  const move = (it: Item, dir: -1 | 1) => {
    const i = items.findIndex((x) => x.id === it.id)
    const other = items[i + dir]
    if (!other) return
    run(async () => {
      await put(`/api/admin/contents/${it.id}`, { sortOrder: other.sortOrder })
      await put(`/api/admin/contents/${other.id}`, { sortOrder: it.sortOrder })
      reload()
    })
  }
  return (
    <>
      <div className="row gap wrap">
        <button className="primary" onClick={() => setAdding('text')}>
          + Matn
        </button>
        <button className="primary" onClick={() => setAdding('image')}>
          + Rasm
        </button>
        <button className="primary" onClick={() => setAdding('video')}>
          + Video
        </button>
        <span className="muted small">Jonli dron streami "Dron pultlari" bo'limida pult qo'shilganda avtomatik paydo bo'ladi; sarlavhasini shu yerda o'zgartiring.</span>
      </div>
      <div className="filters">
        <input placeholder="Sarlavha, izoh yoki texnik yo'l bo'yicha qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Barcha turlar</option>
          <option value="stream">Jonli dron</option>
          <option value="text">Matn</option>
          <option value="image">Rasm</option>
          <option value="video">Video</option>
        </select>
      </div>
      {sel.length > 0 && (
        <div className="alert info row gap wrap">
          Tanlangan: {sel.length}
          <button onClick={() => setBulk(true)}>Bir xil sarlavha berish</button>
          <button disabled={busy} onClick={() => run(() => post('/api/admin/contents/bulk', { ids: sel, visible: false }).then(reload), { confirm: `${sel.length} ta element yashirilsinmi? Ularni ko‘rayotganlar darhol uziladi.`, ok: 'Yashirildi' })}>
            Yashirish
          </button>
          <button disabled={busy} onClick={() => run(() => post('/api/admin/contents/bulk', { ids: sel, visible: true }).then(reload), { ok: 'Faol qilindi' })}>
            Faol qilish
          </button>
          <button onClick={() => setSel([])}>Tanlovni bekor qilish</button>
        </div>
      )}
      {err && <div className="alert error">{err}</div>}
      <div className="card scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" aria-label="Hammasini tanlash" checked={items.length > 0 && sel.length === items.length} onChange={(e) => setSel(e.target.checked ? items.map((i) => i.id) : [])} />
              </th>
              <th>Tur</th>
              <th>Sarlavha (tomoshabin ko'radi)</th>
              <th>Holat</th>
              <th>Ma'lumot</th>
              <th>Tartib</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <Row key={it.id} it={it} checked={sel.includes(it.id)} onCheck={(c) => setSel(c ? [...sel, it.id] : sel.filter((x) => x !== it.id))} onMove={move} onChanged={reload} />
            ))}
          </tbody>
        </table>
      </div>
      {adding === 'text' && <AddText onClose={() => setAdding('')} onDone={() => (setAdding(''), reload())} />}
      {(adding === 'image' || adding === 'video') && <Upload kind={adding} onClose={() => setAdding('')} onDone={() => (setAdding(''), reload())} />}
      {bulk && (
        <BulkTitle
          count={sel.length}
          onClose={() => setBulk(false)}
          onApply={(t) =>
            run(() => post('/api/admin/contents/bulk', { ids: sel, title: t }).then(() => (setBulk(false), reload())), { ok: `${sel.length} ta elementga sarlavha qo‘llandi` })
          }
        />
      )}
    </>
  )
}

function Row({ it, checked, onCheck, onMove, onChanged }: { it: Item; checked: boolean; onCheck: (c: boolean) => void; onMove: (it: Item, d: -1 | 1) => void; onChanged: () => void }) {
  const [title, setTitle] = useState(it.title)
  const [state, setState] = useState<'saved' | 'dirty' | 'saving' | ''>('')
  const [editText, setEditText] = useState(false)
  const { busy, run } = useAction()
  useEffect(() => {
    if (state !== 'dirty') setTitle(it.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it.title])
  const save = async () => {
    if (title === it.title) return setState('')
    setState('saving')
    try {
      await put(`/api/admin/contents/${it.id}`, { title })
      setState('saved')
      onChanged()
    } catch (e: any) {
      setState('dirty')
      toast(e.message, 'error')
    }
  }
  return (
    <tr className={it.visible ? '' : 'dim'}>
      <td>
        <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} aria-label={it.title} />
      </td>
      <td>
        <span className="tag">{TYPE_LABEL[it.type]}</span>
        {it.hasThumb && <img className="thumb-sm" src={`/api/content/${it.id}/thumb`} alt="" />}
      </td>
      <td>
        <input
          value={title}
          onChange={(e) => (setTitle(e.target.value), setState('dirty'))}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          maxLength={120}
          style={{ width: '100%' }}
          aria-label="Sarlavha"
        />
        <span className={`save-state ${state}`}>{{ dirty: '● saqlanmagan o‘zgarish', saving: 'Saqlanmoqda…', saved: '✓ Saqlandi', '': '' }[state]}</span>
        {it.streamSlug && <div className="muted small">texnik yo'l: live/{it.streamSlug} (o'zgarmaydi)</div>}
      </td>
      <td>
        <button disabled={busy} onClick={() => run(() => put(`/api/admin/contents/${it.id}`, { visible: !it.visible }).then(onChanged), { confirm: it.visible ? 'Yashirilsinmi? Ko‘rayotganlar darhol uziladi.' : undefined })}>
          {it.visible ? 'Faol' : 'Yashirin'}
        </button>
      </td>
      <td className="small">
        {it.type === 'text' && `${(it.body || '').length} belgi`}
        {(it.type === 'image' || it.type === 'video') && (
          <>
            {it.mime} {it.codec} · {fmtBytes(it.size || 0)}
            {it.width ? ` · ${it.width}×${it.height}` : ''}
          </>
        )}
        <div className="muted">yangilangan {fmtTime(it.updatedAt)}</div>
      </td>
      <td>
        <button className="icon" title="Yuqoriga" onClick={() => onMove(it, -1)}>
          ▲
        </button>
        <button className="icon" title="Pastga" onClick={() => onMove(it, 1)}>
          ▼
        </button>
      </td>
      <td>
        <div className="row gap">
          {it.type === 'text' && <button onClick={() => setEditText(true)}>Matn</button>}
          {it.type !== 'stream' && (
            <button className="danger" disabled={busy} onClick={() => run(() => del(`/api/admin/contents/${it.id}`).then(onChanged), { confirm: `"${it.title}" o'chirilsinmi? Fayl ham o'chadi.`, ok: 'O‘chirildi' })}>
              O'chirish
            </button>
          )}
        </div>
        {editText && <EditText it={it} onClose={() => setEditText(false)} onDone={() => (setEditText(false), onChanged())} />}
      </td>
    </tr>
  )
}

function AddText({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: '', description: '', body: '' })
  const { busy, run } = useAction()
  return (
    <Modal title="Yangi matn" onClose={onClose}>
      <div className="form">
        <label>
          Sarlavha
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
        </label>
        <label>
          Izoh (ixtiyoriy)
          <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={500} />
        </label>
        <label>
          Matn (oddiy matn; HTML/skript bajarilmaydi; {f.body.length}/20000)
          <textarea rows={10} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={20000} />
        </label>
        <button className="primary" disabled={busy} onClick={() => run(() => post('/api/admin/contents/text', f).then(onDone), { ok: 'Saqlandi' })}>
          Saqlash
        </button>
      </div>
    </Modal>
  )
}

function EditText({ it, onClose, onDone }: { it: Item; onClose: () => void; onDone: () => void }) {
  const [body, setBody] = useState(it.body || '')
  const [desc, setDesc] = useState(it.description)
  const dirty = body !== (it.body || '') || desc !== it.description
  const { busy, run } = useAction()
  return (
    <Modal title={`Matnni tahrirlash: ${it.title}`} onClose={() => (!dirty || window.confirm('Saqlanmagan o‘zgarishlar yo‘qolsinmi?')) && onClose()}>
      <div className="form">
        <label>
          Izoh
          <input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <label>
          Matn
          <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} />
        </label>
        <div className={`save-state ${dirty ? 'dirty' : 'saved'}`}>{dirty ? '● Saqlanmagan o‘zgarishlar bor' : '✓ Saqlangan holat'}</div>
        <button className="primary" disabled={busy || !dirty} onClick={() => run(() => put(`/api/admin/contents/${it.id}`, { body, description: desc }).then(onDone), { ok: 'Saqlandi' })}>
          Saqlash
        </button>
      </div>
    </Modal>
  )
}

function Upload({ kind, onClose, onDone }: { kind: 'image' | 'video'; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pct, setPct] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const xhr = useRef<XMLHttpRequest | null>(null)
  const settings = useLoad(() => get<{ maxImageMb: number; maxVideoMb: number }>('/api/admin/settings'), [])
  const limit = kind === 'image' ? settings.data?.maxImageMb : settings.data?.maxVideoMb
  const send = () => {
    if (!file) return
    setErr('')
    const fd = new FormData()
    fd.append('kind', kind) // fields first, file last (streamed on the server)
    fd.append('title', title || file.name.replace(/\.[^.]+$/, ''))
    fd.append('description', desc)
    fd.append('file', file)
    const x = new XMLHttpRequest()
    xhr.current = x
    x.open('POST', '/api/admin/contents/upload')
    x.setRequestHeader('X-DS-Request', '1')
    x.setRequestHeader('X-CSRF-Token', getCsrf())
    x.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100))
    x.onload = () => {
      setPct(null)
      if (x.status === 200) {
        toast('Yuklandi', 'ok')
        onDone()
      } else {
        try {
          setErr(JSON.parse(x.responseText).message)
        } catch {
          setErr(`Xatolik (${x.status})`)
        }
      }
    }
    x.onerror = () => (setPct(null), setErr('Yuklash uzildi'))
    x.send(fd)
  }
  return (
    <Modal title={kind === 'image' ? 'Rasm yuklash' : 'Video yuklash'} onClose={() => (xhr.current?.abort(), onClose())}>
      <div className="form">
        <p className="muted small">
          {kind === 'image' ? 'PNG, JPEG, GIF yoki WebP. SVG va HTML qabul qilinmaydi.' : 'MP4 (H.264, AV1, VP9) yoki WebM (VP8, VP9, AV1). H.265/HEVC brauzerlarda ishlamaydi — avval H.264 ga o‘tkazing.'}{' '}
          Chegara: {limit ?? '…'} MB. Format fayl kengaytmasi bo'yicha emas, ichki tuzilishi bo'yicha tekshiriladi.
        </p>
        <label>
          Fayl
          <input type="file" accept={kind === 'image' ? 'image/png,image/jpeg,image/gif,image/webp' : 'video/mp4,video/webm'} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <label>
          Sarlavha
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name} maxLength={120} />
        </label>
        <label>
          Izoh (ixtiyoriy)
          <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} />
        </label>
        {pct !== null && (
          <div>
            Yuklanmoqda: {pct}% <progress value={pct} max={100} />
          </div>
        )}
        {err && <div className="alert error">{err}</div>}
        <button className="primary" disabled={!file || pct !== null} onClick={send}>
          Yuklash
        </button>
      </div>
    </Modal>
  )
}

function BulkTitle({ count, onClose, onApply }: { count: number; onClose: () => void; onApply: (t: string) => void }) {
  const [t, setT] = useState('')
  return (
    <Modal title={`${count} ta elementga bir xil sarlavha`} onClose={onClose}>
      <div className="form">
        <label>
          Sarlavha
          <input value={t} onChange={(e) => setT(e.target.value)} maxLength={120} autoFocus />
        </label>
        <p className="muted small">Texnik ID va publish yo'llari o'zgarmaydi — faqat tomoshabin ko'radigan sarlavha.</p>
        <button className="primary" disabled={!t.trim()} onClick={() => onApply(t)}>
          Qo'llash
        </button>
      </div>
    </Modal>
  )
}
