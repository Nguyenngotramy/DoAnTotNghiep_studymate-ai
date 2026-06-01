import { useState } from 'react'
import { X } from 'lucide-react'
import type { FlashcardFolder, FlashcardDeck } from '@/types'

type DeckFormBody = {
  title: string
  description?: string
  folderId?: string
  cards: { question: string; answer: string }[]
}

interface CreateFolderModalProps {
  onClose: () => void
  onSubmit: (body: { name: string; color: string }) => void
  loading: boolean
}

export function CreateFolderModal({ onClose, onSubmit, loading }: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[28px] border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
            Tạo folder
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ví dụ: Tiếng Anh, Java, AI..."
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />

          <div
            className="rounded-2xl border p-3 flex items-center gap-3"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-2xl border"
              style={{ background: color, borderColor: 'rgba(255,255,255,.18)' }}
            />
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full h-10 rounded-xl px-1"
              style={{ background: 'transparent' }}
            />
          </div>
        </div>

        <button
          onClick={() => onSubmit({ name, color })}
          disabled={loading || !name.trim()}
          className="w-full h-12 rounded-2xl mt-4 text-[13px] font-medium disabled:opacity-60"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          {loading ? 'Đang tạo...' : 'Tạo folder'}
        </button>
      </div>
    </div>
  )
}

interface CreateDeckModalProps {
  folders: FlashcardFolder[]
  onClose: () => void
  onSubmit: (body: DeckFormBody) => void
  loading: boolean
  initialData?: FlashcardDeck | null
  submitLabel?: string
}

export function CreateDeckModal({
  folders,
  onClose,
  onSubmit,
  loading,
  initialData,
  submitLabel,
}: CreateDeckModalProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [folderId, setFolderId] = useState(initialData?.folderId ?? '')
  const [cards, setCards] = useState(
    initialData?.cards?.length
      ? initialData.cards.map(card => ({
          question: card.question ?? '',
          answer: card.answer ?? '',
        }))
      : [{ question: '', answer: '' }],
  )

  const updateCard = (index: number, key: 'question' | 'answer', value: string) => {
    setCards(prev => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)))
  }

  const addCard = () => setCards(prev => [...prev, { question: '', answer: '' }])

  const removeCard = (index: number) => {
    setCards(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-[28px] border p-5 max-h-[88vh] overflow-y-auto"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
            {initialData ? 'Chỉnh sửa bộ flashcard' : 'Tạo bộ flashcard cá nhân'}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 mb-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tên bộ thẻ"
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mô tả ngắn (không bắt buộc)"
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <select
            value={folderId}
            onChange={e => setFolderId(e.target.value)}
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Không chọn folder</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {cards.map((card, index) => (
            <div
              key={index}
              className="rounded-[24px] border p-4"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                  Thẻ {index + 1}
                </p>
                <button onClick={() => removeCard(index)} className="text-[12px]" style={{ color: '#ef4444' }}>
                  Xoá
                </button>
              </div>

              <div className="grid gap-3">
                <textarea
                  value={card.question}
                  onChange={e => updateCard(index, 'question', e.target.value)}
                  placeholder="Câu hỏi"
                  className="w-full min-h-[90px] rounded-2xl px-4 py-3 outline-none resize-none"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <textarea
                  value={card.answer}
                  onChange={e => updateCard(index, 'answer', e.target.value)}
                  placeholder="Đáp án"
                  className="w-full min-h-[90px] rounded-2xl px-4 py-3 outline-none resize-none"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={addCard}
            className="px-4 h-12 rounded-2xl text-[13px] font-medium border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            + Thêm thẻ
          </button>
          <button
            onClick={() =>
              onSubmit({
                title: title.trim(),
                description: description.trim() || undefined,
                folderId: folderId || undefined,
                cards: cards.map(card => ({
                  question: card.question.trim(),
                  answer: card.answer.trim(),
                })),
              })
            }
            disabled={loading || !title.trim() || cards.some(card => !card.question.trim() || !card.answer.trim())}
            className="flex-1 h-12 rounded-2xl text-[13px] font-medium disabled:opacity-60"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            {loading ? 'Đang lưu...' : submitLabel || (initialData ? 'Lưu thay đổi' : 'Lưu bộ flashcard')}
          </button>
        </div>
      </div>
    </div>
  )
}
