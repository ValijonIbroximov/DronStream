import { useEffect, useRef, useState } from 'react'
import { fmtBytes, type LibraryItem } from '../api'
import { Modal } from './ui'

// Text, images and uploaded videos the viewer may see. When access is
// revoked, the library reload removes the item: the component unmounts, the
// <video> source is detached (stopping any further download) and the text or
// image disappears from the screen. Bytes the browser already received cannot
// be recalled from the device.
export default function Materials({ items, watermark }: { items: LibraryItem[]; watermark: string }) {
  const [open, setOpen] = useState<LibraryItem | null>(null)
  useEffect(() => {
    if (open && !items.some((i) => i.id === open.id)) setOpen(null) // revoked while open
  }, [items, open])
  return (
    <section className="materials">
      <h2>Materiallar</h2>
      <div className="mat-grid">
        {items.map((it) => (
          <div key={it.id} className="card mat-card">
            <div className="mat-head">
              <span className="tag">{{ text: 'Matn', image: 'Rasm', video: 'Video', stream: 'Jonli' }[it.type]}</span>
              <h3>{it.title}</h3>
            </div>
            {it.description && <p className="muted small pre">{it.description}</p>}
            {it.type === 'text' && <div className="pre mat-text">{it.body}</div>}
            {it.type === 'image' && (
              <button className="img-btn" onClick={() => setOpen(it)} title="Kattalashtirish">
                <img src={`/api/content/${it.id}/${it.hasThumb ? 'thumb' : 'file'}`} alt={it.title} loading="lazy" draggable={false} />
              </button>
            )}
            {it.type === 'video' && <VideoBox item={it} watermark={watermark} />}
          </div>
        ))}
      </div>
      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)} wide>
          <div className="wm-wrap">
            <img className="full-img" src={`/api/content/${open.id}/file`} alt={open.title} draggable={false} />
            <div className="watermark pos0">{watermark}</div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function VideoBox({ item, watermark }: { item: LibraryItem; watermark: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    const v = ref.current
    return () => {
      // stop playback and abort the network request when access ends
      if (v) {
        v.pause()
        v.removeAttribute('src')
        v.load()
      }
    }
  }, [])
  return (
    <div className="wm-wrap">
      <video
        ref={ref}
        src={`/api/content/${item.id}/file`}
        controls
        preload="metadata"
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onError={() => setErr("Videoni ijro etib bo'lmadi (ruxsat tugagan yoki format brauzerga mos emas)")}
      />
      <div className="watermark pos1">{watermark}</div>
      <div className="muted small">
        {item.codec} · {fmtBytes(item.size || 0)}
      </div>
      {err && <div className="alert error small">{err}</div>}
    </div>
  )
}
