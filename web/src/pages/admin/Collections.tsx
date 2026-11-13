import { useState } from 'react'
import { del, get, post, put } from '../../api'
import { Modal, useAction, useLoad } from '../../components/ui'
import { TYPE_LABEL } from '../../components/ObjectPicker'

interface Coll {
  id: number
  title: string
  description: string
  visible: boolean
  items: { contentId: number; itemTitle: string }[]
}
interface C {
  id: number
  type: string
  title: string
}

export default function Collections() {
  const cols = useLoad(() => get<Coll[]>('/api/admin/collections'), [])
  const contents = useLoad(() => get<C[]>('/api/admin/contents'), [])
  const [edit, setEdit] = useState<Coll | 'new' | null>(null)
  const { busy, run } = useAction()
  const titleOf = (id: number) => contents.data?.find((c) => c.id === id)
  return (
    <div className="page">
      <div className="row between">
        <h1>To'plamlar</h1>
        <button className="primary" onClick={() => setEdit('new')}>
          + To'plam
        </button>
      </div>
      <p className="muted small">
        To'plam bir nechta dron va medialarni birlashtiradi. Ruxsat berishda tanlanadi: <b>faqat hozirgi elementlar</b> yoki <b>dinamik</b> (keyin qo'shilganlar ham ochiladi).
        Yashirin to'plam orqali dinamik ruxsat ishlamaydi.
      </p>
      {cols.data?.length === 0 && <p className="muted">To'plam yo'q.</p>}
      <div className="stream-list">
        {cols.data?.map((c) => (
          <div className="card" key={c.id}>
            <div className="row between">
              <h3>
                To'plam: {c.title} {!c.visible && <span className="tag">yashirin</span>}
              </h3>
              <div className="row gap">
                <button onClick={() => setEdit(c)}>Tahrirlash</button>
                <button className="danger" disabled={busy} onClick={() => run(() => del(`/api/admin/collections/${c.id}`).then(cols.reload), { confirm: `"${c.title}" o'chirilsinmi? Unga berilgan dinamik ruxsatlar bekor bo'ladi (kontentning o'zi o'chmaydi).` })}>
                  O'chirish
                </button>
              </div>
            </div>
            {c.description && <p className="muted small pre">{c.description}</p>}
            <ol className="small">
              {c.items.map((it) => (
                <li key={it.contentId}>
                  <span className="tag">{TYPE_LABEL[titleOf(it.contentId)?.type || 'text']}</span> {it.itemTitle || titleOf(it.contentId)?.title}
                  {it.itemTitle && <span className="muted"> (asl sarlavha: {titleOf(it.contentId)?.title})</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {edit && contents.data && <EditColl c={edit === 'new' ? null : edit} contents={contents.data} onClose={() => setEdit(null)} onDone={() => (setEdit(null), cols.reload())} />}
    </div>
  )
}

function EditColl({ c, contents, onClose, onDone }: { c: Coll | null; contents: C[]; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(c?.title || '')
  const [desc, setDesc] = useState(c?.description || '')
  const [visible, setVisible] = useState(c?.visible ?? true)
  const [items, setItems] = useState(c?.items || [])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number[]>([])
  const [bulkTitle, setBulkTitle] = useState('')
  const { busy, run } = useAction()
  const has = (id: number) => items.some((i) => i.contentId === id)
  const move = (i: number, d: number) => {
    const n = [...items]
    const j = i + d
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    setItems(n)
  }
  const orig = JSON.stringify({ t: c?.title || '', d: c?.description || '', v: c?.visible ?? true, i: c?.items || [] })
  const dirty = JSON.stringify({ t: title, d: desc, v: visible, i: items }) !== orig
  return (
    <Modal title={c ? `To'plam: ${c.title}` : "Yangi to'plam"} onClose={() => (!dirty || window.confirm('Saqlanmagan o‘zgarishlar yo‘qolsinmi?')) && onClose()} wide>
      <div className="form">
        <label>
          To'plamning umumiy sarlavhasi
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </label>
        <label>
          Izoh
          <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} />
        </label>
        <label className="switch">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Faol (yashirin bo'lsa dinamik ruxsat ishlamaydi)
        </label>
      </div>
      <h4>Elementlar ({items.length}) — to'plam ichidagi alohida sarlavha ixtiyoriy</h4>
      {sel.length > 0 && (
        <div className="row gap wrap small">
          {sel.length} ta tanlangan:
          <input placeholder="bir xil element sarlavhasi" value={bulkTitle} onChange={(e) => setBulkTitle(e.target.value)} />
          <button onClick={() => (setItems(items.map((it) => (sel.includes(it.contentId) ? { ...it, itemTitle: bulkTitle } : it))), setSel([]))}>Qo'llash</button>
        </div>
      )}
      <div className="pick-list">
        {items.map((it, i) => {
          const ct = contents.find((x) => x.id === it.contentId)
          return (
            <div className="pick-row" key={it.contentId}>
              <input type="checkbox" checked={sel.includes(it.contentId)} onChange={() => setSel(sel.includes(it.contentId) ? sel.filter((x) => x !== it.contentId) : [...sel, it.contentId])} />
              <span className="tag">{TYPE_LABEL[ct?.type || 'text']}</span>
              <span className="grow">
                <input value={it.itemTitle} placeholder={ct?.title} onChange={(e) => setItems(items.map((x) => (x.contentId === it.contentId ? { ...x, itemTitle: e.target.value } : x)))} style={{ width: '100%' }} />
              </span>
              <button className="icon" onClick={() => move(i, -1)}>
                ▲
              </button>
              <button className="icon" onClick={() => move(i, 1)}>
                ▼
              </button>
              <button className="icon" title="Olib tashlash" onClick={() => setItems(items.filter((x) => x.contentId !== it.contentId))}>
                ✕
              </button>
            </div>
          )
        })}
      </div>
      <h4>Qo'shish</h4>
      <input placeholder="Kontent qidirish…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
      <div className="pick-list" style={{ maxHeight: '22vh' }}>
        {contents
          .filter((x) => !has(x.id) && (!q || x.title.toLowerCase().includes(q.toLowerCase())))
          .map((x) => (
            <div className="pick-row" key={x.id}>
              <span className="tag">{TYPE_LABEL[x.type]}</span>
              <span className="grow">{x.title}</span>
              <button onClick={() => setItems([...items, { contentId: x.id, itemTitle: '' }])}>+ Qo'shish</button>
            </div>
          ))}
      </div>
      <div className={`save-state ${dirty ? 'dirty' : 'saved'}`}>{dirty ? '● Saqlanmagan o‘zgarishlar bor' : '✓ Saqlangan'}</div>
      <p className="muted small">Saqlanganda: elementni olib tashlash dinamik ruxsat egalari uchun darhol kirishni yopadi; qo'shish faqat dinamik ruxsatlarni kengaytiradi.</p>
      <button
        className="primary"
        disabled={busy || !title.trim() || !dirty}
        onClick={() => run(() => (c ? put(`/api/admin/collections/${c.id}`, { title, description: desc, visible, items }) : post('/api/admin/collections', { title, description: desc, visible, items })).then(onDone), { ok: 'Saqlandi' })}
      >
        Saqlash
      </button>
    </Modal>
  )
}
