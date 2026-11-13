import { useMemo, useState } from 'react'

export interface ContentLite {
  id: number
  type: 'stream' | 'text' | 'image' | 'video'
  title: string
  visible: boolean
  streamSlug?: string
}
export interface CollectionLite {
  id: number
  title: string
  items: { contentId: number }[]
}
export interface Pick {
  type: 'content' | 'collection'
  id: number
  includeFuture: boolean
}

export const TYPE_LABEL: Record<string, string> = { stream: 'Jonli dron', text: 'Matn', image: 'Rasm', video: 'Video' }

// Multi-select of contents and collections with search and type filter.
// For collections the policy must be chosen explicitly — no hidden rights.
export default function ObjectPicker({ contents, collections, value, onChange }: { contents: ContentLite[]; collections: CollectionLite[]; value: Pick[]; onChange: (v: Pick[]) => void }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const has = (t: string, id: number) => value.find((p) => p.type === t && p.id === id)
  const toggle = (t: 'content' | 'collection', id: number) => {
    if (has(t, id)) onChange(value.filter((p) => !(p.type === t && p.id === id)))
    else onChange([...value, { type: t, id, includeFuture: false }])
  }
  const setFuture = (id: number, f: boolean) => onChange(value.map((p) => (p.type === 'collection' && p.id === id ? { ...p, includeFuture: f } : p)))
  const ql = q.toLowerCase()
  const cs = useMemo(() => contents.filter((c) => (!type || c.type === type) && (!ql || c.title.toLowerCase().includes(ql) || (c.streamSlug || '').includes(ql))), [contents, type, ql])
  const cols = collections.filter((c) => (!type || type === 'collection') && (!ql || c.title.toLowerCase().includes(ql)))
  const shownContents = type === 'collection' ? [] : cs
  return (
    <div>
      <div className="filters">
        <input placeholder="Qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Barcha turlar</option>
          <option value="collection">To'plamlar</option>
          <option value="stream">Jonli dronlar</option>
          <option value="text">Matn</option>
          <option value="image">Rasm</option>
          <option value="video">Video</option>
        </select>
        <button onClick={() => onChange([...value.filter((p) => p.type === 'collection'), ...shownContents.filter((c) => !has('content', c.id)).map((c) => ({ type: 'content' as const, id: c.id, includeFuture: false })), ...value.filter((p) => p.type === 'content')])}>
          Ko'rinayotganlarni tanlash
        </button>
        <button onClick={() => onChange([])}>Tozalash</button>
      </div>
      <div className="pick-list">
        {cols.map((c) => {
          const p = has('collection', c.id)
          return (
            <div className="pick-row" key={'c' + c.id}>
              <input type="checkbox" checked={!!p} onChange={() => toggle('collection', c.id)} aria-label={c.title} />
              <div className="grow">
                <b>To'plam: {c.title}</b> <span className="muted small">({c.items.length} element)</span>
                {p && (
                  <div className="small">
                    <label>
                      <input type="radio" checked={!p.includeFuture} onChange={() => setFuture(c.id, false)} /> Faqat hozirgi {c.items.length} element (keyin qo'shilganlar ochilmaydi)
                    </label>
                    <br />
                    <label>
                      <input type="radio" checked={p.includeFuture} onChange={() => setFuture(c.id, true)} /> Dinamik: to'plamga keyin qo'shiladigan kontent ham ochiladi
                    </label>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {shownContents.map((c) => (
          <label className="pick-row" key={'k' + c.id}>
            <input type="checkbox" checked={!!has('content', c.id)} onChange={() => toggle('content', c.id)} />
            <span className="tag">{TYPE_LABEL[c.type]}</span>
            <span className="grow">
              {c.title} {!c.visible && <span className="tag">yashirin</span>}
              {c.streamSlug && <span className="muted small"> · live/{c.streamSlug}</span>}
            </span>
          </label>
        ))}
        {cols.length + shownContents.length === 0 && <div className="muted small">Hech narsa topilmadi</div>}
      </div>
      <div className="muted small">Tanlangan: {value.length}</div>
    </div>
  )
}
