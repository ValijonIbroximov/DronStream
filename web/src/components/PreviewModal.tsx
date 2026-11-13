import { get, fmtTime } from '../api'
import { Modal, useLoad } from './ui'
import { TYPE_LABEL } from './ObjectPicker'

// "Foydalanuvchi nimani ko'radi?" — computed on the server from the same
// grant rules, without creating a session or consuming a link use.
export default function PreviewModal({ subjectType, subjectId, title, onClose }: { subjectType: string; subjectId: number; title: string; onClose: () => void }) {
  const { data, err } = useLoad(() => get<{ items: { contentId: number; type: string; title: string; until: number }[]; note: string }>(`/api/admin/preview?subjectType=${subjectType}&subjectId=${subjectId}`), [])
  return (
    <Modal title={`Nimani ko'radi: ${title}`} onClose={onClose}>
      <p className="muted small">Bu ko'rinish sinov uchun: sessiya ochilmaydi, havola foydalanishi sarflanmaydi.</p>
      {err && <div className="alert error">{err}</div>}
      {data?.note && <div className="alert warn small">{data.note}</div>}
      {data && data.items.length === 0 && <p>Hech qanday kontent ko'rinmaydi.</p>}
      <ul>
        {data?.items.map((i) => (
          <li key={i.contentId}>
            <span className="tag">{TYPE_LABEL[i.type]}</span> {i.title} {i.until ? <span className="muted small">— {fmtTime(i.until)} gacha</span> : null}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
