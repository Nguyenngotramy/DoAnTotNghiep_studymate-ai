import { GripVertical, MoreVertical, Pencil, Trash2, Layers, Target, Folder, Inbox } from 'lucide-react'
import type { FlashcardDeck, FlashcardFolder } from '@/types'

interface FlashcardCardProps {
  deck: FlashcardDeck
  folder: FlashcardFolder | null
  isDragging: boolean
  onStart: (deck: FlashcardDeck, mode: 'DUE' | 'NEW' | 'ALL') => void
  onStartQuiz: (deck: FlashcardDeck) => void
  onEdit: (deck: FlashcardDeck) => void
  onDelete: (deck: FlashcardDeck) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  openMenuId: string | null
  onMenuToggle: (id: string) => void
  onMenuClose: () => void
}

function SourceBadge({ deck }: { deck: FlashcardDeck }) {
  const isPersonal = deck.sourceType === 'PERSONAL'
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[11px] border inline-flex items-center gap-1.5"
      style={{
        background: isPersonal ? 'rgba(16,185,129,.10)' : 'rgba(99,102,241,.10)',
        borderColor: isPersonal ? 'rgba(16,185,129,.18)' : 'rgba(99,102,241,.18)',
        color: isPersonal ? '#10b981' : '#818cf8',
      }}
    >
      {isPersonal ? <Folder size={12} /> : <Layers size={12} />}
      {isPersonal ? 'Cá nhân ' : 'AI từ tài liệu'}
    </span>
  )
}

export default function FlashcardCard({
  deck,
  folder,
  isDragging,
  onStart,
  onStartQuiz,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  openMenuId,
  onMenuToggle,
  onMenuClose,
}: FlashcardCardProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, deck.id)}
      onDragEnd={onDragEnd}
      className="rounded-[28px] border p-5 transition-all cursor-grab active:cursor-grabbing"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 96%, #6366f1 4%), var(--bg2))',
        borderColor: isDragging ? '#818cf8' : 'var(--border)',
        opacity: isDragging ? 0.55 : 1,
        boxShadow: isDragging ? '0 18px 44px rgba(99,102,241,.18)' : '0 10px 28px rgba(0,0,0,.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center border"
            style={{
              background: 'rgba(99,102,241,.10)',
              borderColor: 'rgba(99,102,241,.16)',
              color: '#818cf8',
            }}
          >
            <GripVertical size={16} />
          </div>

          <div className="min-w-0">
            <h3 className="text-[18px] font-semibold truncate" style={{ color: 'var(--text)' }}>
              {deck.title}
            </h3>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              {deck.cards?.length || 0} thẻ
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation()
              onMenuToggle(deck.id)
            }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <MoreVertical size={15} />
          </button>

          {openMenuId === deck.id && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={onMenuClose} />
              <div
                className="absolute right-0 top-11 z-20 w-40 rounded-2xl border p-1.5 shadow-xl"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => onEdit(deck)}
                  className="w-full h-10 px-3 rounded-xl flex items-center gap-2 text-[13px]"
                  style={{ color: 'var(--text)', background: 'transparent' }}
                >
                  <Pencil size={14} />
                  Sửa
                </button>

                <button
                  onClick={() => onDelete(deck)}
                  className="w-full h-10 px-3 rounded-xl flex items-center gap-2 text-[13px]"
                  style={{ color: '#ef4444', background: 'transparent' }}
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <SourceBadge deck={deck} />

        {folder ? (
          <span
            className="px-2.5 py-1 rounded-full text-[11px] border flex items-center gap-1.5"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
              color: 'var(--text2)',
            }}
          >
            <Folder size={12} style={{ color: folder.color || '#6366f1' }} />
            {folder.name}
          </span>
        ) : (
          <span
            className="px-2.5 py-1 rounded-full text-[11px] border flex items-center gap-1.5"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
              color: 'var(--text3)',
            }}
          >
            <Inbox size={12} />
            Chưa vào folder
          </span>
        )}
      </div>

      <div
        className="rounded-2xl p-4 mt-4 text-[12px] leading-6"
        style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
      >
        {deck.sourceType === 'PERSONAL' ? (
          <span>Cá nhân tạo</span>
        ) : (
          <span>
            Tạo từ nhóm <strong>{deck.sourceGroupName || '—'}</strong>
            <br />
            Tài liệu: <strong>{deck.sourceDocumentName || '—'}</strong>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={() => onStart(deck, 'DUE')}
          className="w-full h-12 rounded-2xl text-[13px] font-medium flex items-center justify-center gap-2"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          <Layers size={14} />
          Bắt đầu học
        </button>
        <button
          onClick={() => onStartQuiz(deck)}
          className="w-full h-10 rounded-2xl text-[12px] border flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
        >
          <Target size={13} className="text-orange-400" />
          Luyện Quiz
        </button>
      </div>
    </div>
  )
}
