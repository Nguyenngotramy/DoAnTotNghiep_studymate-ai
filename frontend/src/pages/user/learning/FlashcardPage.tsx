import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  Plus,
  RotateCcw,
  ChevronLeft,
  X,
  Check,
  ArrowLeft,
  Search,
  FolderPlus,
  Folder,
  Trash2,
  BookOpen,
  Sparkles,
  GripVertical,
  MoveRight,
  FolderOpen,
  Inbox,
  MoreVertical,
  Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { flashcardApi } from '@/api/services'
import type { Flashcard, FlashcardDeck, FlashcardFolder } from '@/types'

type DeckFormBody = {
  title: string
  description?: string
  folderId?: string
  cards: { question: string; answer: string }[]
}

function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <div className="w-full cursor-pointer select-none" style={{ perspective: 1200 }} onClick={onFlip}>
      <div
        className="relative w-full transition-all duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          height: 340,
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[28px] border shadow-sm"
          style={{
            backfaceVisibility: 'hidden',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 94%, #6366f1 6%), var(--bg2))',
            borderColor: 'color-mix(in srgb, var(--border) 82%, #6366f1 18%)',
            boxShadow: '0 18px 40px rgba(0,0,0,.06)',
          }}
        >
          <div
            className="mb-4 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-[0.18em]"
            style={{
              background: 'rgba(99,102,241,.10)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,.18)',
            }}
          >
            CÂU HỎI
          </div>

          <p
            className="text-center leading-relaxed font-semibold"
            style={{
              color: 'var(--text)',
              fontSize: 'clamp(20px,2.2vw,28px)',
              maxWidth: 760,
            }}
          >
            {card.question}
          </p>

          <div className="mt-8 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text3)' }}>
            <RotateCcw size={13} />
            Chạm để lật thẻ
          </div>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[28px] border shadow-sm"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg3) 92%, #6366f1 8%), var(--bg3))',
            borderColor: 'rgba(99,102,241,.24)',
            boxShadow: '0 18px 40px rgba(0,0,0,.06)',
          }}
        >
          <div
            className="mb-4 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-[0.18em]"
            style={{
              background: 'rgba(99,102,241,.12)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,.20)',
            }}
          >
            ĐÁP ÁN
          </div>

          <p
            className="text-center whitespace-pre-line leading-relaxed"
            style={{
              color: 'var(--text)',
              fontSize: 'clamp(15px,1.8vw,20px)',
              maxWidth: 760,
            }}
          >
            {card.answer}
          </p>
        </div>
      </div>
    </div>
  )
}

function CreateFolderModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void
  onSubmit: (body: { name: string; color: string }) => void
  loading: boolean
}) {
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

function CreateDeckModal({
  folders,
  onClose,
  onSubmit,
  loading,
  initialData,
  submitLabel,
}: {
  folders: FlashcardFolder[]
  onClose: () => void
  onSubmit: (body: DeckFormBody) => void
  loading: boolean
  initialData?: FlashcardDeck | null
  submitLabel?: string
}) {
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
      {isPersonal ? <BookOpen size={12} /> : <Sparkles size={12} />}
      {isPersonal ? 'Cá nhân ' : 'AI từ tài liệu'}
    </span>
  )
}

export default function FlashcardPage() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [folderId, setFolderId] = useState('ALL')
  const [sourceType, setSourceType] = useState<'ALL' | 'PERSONAL' | 'DOCUMENT_AI'>('ALL')

  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<number>>(new Set())
  const [review, setReview] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)

  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null)
  const [dropFolderId, setDropFolderId] = useState<string | null>(null)

  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['flashcard-decks', search, folderId, sourceType],
    queryFn: () =>
      flashcardApi.listDecks({
        search: search || undefined,
        folderId: folderId === 'ALL' ? undefined : folderId,
        sourceType,
      }),
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['flashcard-folders'],
    queryFn: flashcardApi.listFolders,
  })

  const folderMut = useMutation({
    mutationFn: flashcardApi.createFolder,
    onSuccess: () => {
      toast.success('Tạo folder thành công')
      qc.invalidateQueries({ queryKey: ['flashcard-folders'] })
      setShowFolderModal(false)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể tạo folder')
    },
  })

  const createDeckMut = useMutation({
    mutationFn: flashcardApi.createPersonalDeck,
    onSuccess: () => {
      toast.success('Đã tạo bộ flashcard')
      qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
      setShowDeckModal(false)
      setEditingDeck(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể tạo bộ flashcard')
    },
  })

  const updateDeckMut = useMutation({
    mutationFn: ({ deckId, body }: { deckId: string; body: DeckFormBody }) =>
      flashcardApi.updatePersonalDeck(deckId, body),
    onSuccess: () => {
      toast.success('Đã cập nhật bộ flashcard')
      qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
      setShowDeckModal(false)
      setEditingDeck(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật bộ flashcard')
    },
  })

  const deleteDeckMut = useMutation({
    mutationFn: flashcardApi.deleteDeck,
    onSuccess: () => {
      toast.success('Đã xoá bộ flashcard')
      qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá bộ flashcard')
    },
  })

  const moveDeckMut = useMutation({
    mutationFn: ({ deckId, folderId }: { deckId: string; folderId?: string | null }) =>
      flashcardApi.moveDeckToFolder(deckId, folderId ?? undefined),
    onSuccess: () => {
      toast.success('Đã chuyển bộ thẻ vào folder')
      qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể chuyển folder')
    },
    onSettled: () => {
      setDraggingDeckId(null)
      setDropFolderId(null)
    },
  })

  const activeCards = activeDeck?.cards ?? []
  const currentCard = activeCards[idx]
  const progress = activeCards.length ? Math.round(((known.size + review.size) / activeCards.length) * 100) : 0

  const startDeck = (deck: FlashcardDeck) => {
    setActiveDeck(deck)
    setIdx(0)
    setFlipped(false)
    setKnown(new Set())
    setReview(new Set())
    setDone(false)
  }

  const next = (remember: boolean) => {
    if (!activeDeck) return
    if (remember) setKnown(prev => new Set(prev).add(idx))
    else setReview(prev => new Set(prev).add(idx))

    if (idx + 1 >= activeCards.length) {
      setDone(true)
      return
    }

    setIdx(prev => prev + 1)
    setFlipped(false)
  }

  const restart = () => {
    setIdx(0)
    setFlipped(false)
    setKnown(new Set())
    setReview(new Set())
    setDone(false)
  }

  const folderMap = useMemo(() => {
    const map = new Map<string, FlashcardFolder>()
    folders.forEach(folder => map.set(folder.id, folder))
    return map
  }, [folders])

  const totalCards = decks.reduce((sum, deck) => sum + (deck.cards?.length || 0), 0)
  const aiDeckCount = decks.filter(deck => deck.sourceType === 'DOCUMENT_AI').length
  const personalDeckCount = decks.filter(deck => deck.sourceType === 'PERSONAL').length

  if (!activeDeck) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div
          className="rounded-[32px] border p-6"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 94%, #6366f1 6%), var(--bg2))',
            borderColor: 'color-mix(in srgb, var(--border) 84%, #6366f1 16%)',
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full border"
                style={{
                  background: 'rgba(99,102,241,.10)',
                  borderColor: 'rgba(99,102,241,.16)',
                  color: '#818cf8',
                }}>
                <Layers size={15} />
                Flashcard Workspace
              </div>

              <h1 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                Học thông minh bằng flashcard
              </h1>
              <p className="text-[13px] mt-2 max-w-2xl leading-6" style={{ color: 'var(--text3)' }}>
                Tạo bộ thẻ cá nhân, lưu flashcard từ tài liệu nhóm và kéo thả bộ thẻ vào folder để quản lý gọn hơn.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFolderModal(true)}
                className="h-11 px-4 rounded-2xl border text-[13px] font-medium flex items-center gap-2"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                <FolderPlus size={15} />
                Tạo folder
              </button>

              <button
                onClick={() => {
                setEditingDeck(null)
                setShowDeckModal(true)
              }}
                className="h-11 px-5 rounded-2xl text-[13px] font-medium flex items-center gap-2 shadow-sm"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                <Plus size={15} />
                Tạo bộ thẻ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Tổng bộ thẻ', value: decks.length, color: '#818cf8' },
              { label: 'Tổng số thẻ', value: totalCards, color: '#10b981' },
              { label: 'AI / Cá nhân', value: `${aiDeckCount} / ${personalDeckCount}`, color: '#f59e0b' },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-2xl border p-4"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  {item.label}
                </div>
                <div className="text-[28px] font-semibold mt-1" style={{ color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4 mt-5">
            <div
              className="h-12 rounded-2xl border flex items-center px-4 gap-2"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <Search size={16} style={{ color: 'var(--text3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên bộ thẻ, tài liệu hoặc nhóm..."
                className="bg-transparent outline-none w-full text-[13px]"
                style={{ color: 'var(--text)' }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'PERSONAL', label: 'Cá nhân ' },
                { key: 'DOCUMENT_AI', label: 'AI từ tài liệu' },
              ].map(type => (
                <button
                  key={type.key}
                  onClick={() => setSourceType(type.key as any)}
                  className="px-4 h-11 rounded-2xl text-[12px] font-medium border"
                  style={{
                    background: sourceType === type.key ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                    borderColor: sourceType === type.key ? 'rgba(99,102,241,.24)' : 'var(--border)',
                    color: sourceType === type.key ? '#818cf8' : 'var(--text2)',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen size={15} style={{ color: 'var(--text3)' }} />
              <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                Kéo thả bộ thẻ vào folder để phân loại
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFolderId('ALL')}
                className="px-4 h-10 rounded-2xl text-[12px] font-medium border"
                style={{
                  background: folderId === 'ALL' ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                  borderColor: folderId === 'ALL' ? 'rgba(99,102,241,.24)' : 'var(--border)',
                  color: folderId === 'ALL' ? '#818cf8' : 'var(--text2)',
                }}
                onDragOver={e => {
                  e.preventDefault()
                  setDropFolderId('ALL')
                }}
                onDragLeave={() => setDropFolderId(null)}
                onDrop={e => {
                  e.preventDefault()
                  const deckId = e.dataTransfer.getData('deckId')
                  if (deckId) moveDeckMut.mutate({ deckId, folderId: null })
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Inbox size={13} />
                  Tất cả folder
                </span>
              </button>

              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setFolderId(folder.id)}
                  className="px-4 h-10 rounded-2xl text-[12px] font-medium border flex items-center gap-1.5 transition-all"
                  style={{
                    background:
                      dropFolderId === folder.id
                        ? 'rgba(99,102,241,.14)'
                        : folderId === folder.id
                          ? 'rgba(99,102,241,.12)'
                          : 'var(--bg3)',
                    borderColor:
                      dropFolderId === folder.id
                        ? '#818cf8'
                        : folderId === folder.id
                          ? 'rgba(99,102,241,.24)'
                          : 'var(--border)',
                    color: folderId === folder.id || dropFolderId === folder.id ? '#818cf8' : 'var(--text2)',
                    transform: dropFolderId === folder.id ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                  onDragOver={e => {
                    e.preventDefault()
                    setDropFolderId(folder.id)
                  }}
                  onDragLeave={() => setDropFolderId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    const deckId = e.dataTransfer.getData('deckId')
                    if (deckId) moveDeckMut.mutate({ deckId, folderId: folder.id })
                  }}
                >
                  <Folder size={13} style={{ color: folder.color || '#6366f1' }} />
                  {folder.name}
                  {dropFolderId === folder.id && <MoveRight size={13} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-[28px] animate-pulse" style={{ background: 'var(--bg2)' }} />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div
            className="rounded-[30px] border p-12 text-center"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <BookOpen size={30} className="mx-auto mb-3" style={{ color: 'var(--text3)' }} />
            <p className="text-[15px]" style={{ color: 'var(--text2)' }}>
              Chưa có bộ flashcard nào
            </p>
            <p className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
              Bạn có thể tự tạo bộ thẻ hoặc lưu từ tài liệu nhóm sau khi AI generate
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {decks.map(deck => {
              const folder = deck.folderId ? folderMap.get(deck.folderId) : null
              const isDragging = draggingDeckId === deck.id

              return (
                <div
                  key={deck.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('deckId', deck.id)
                    setDraggingDeckId(deck.id)
                  }}
                  onDragEnd={() => {
                    setDraggingDeckId(null)
                    setDropFolderId(null)
                  }}
                  className="rounded-[28px] border p-5 transition-all cursor-grab active:cursor-grabbing"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 96%, #6366f1 4%), var(--bg2))',
                    borderColor: isDragging ? '#818cf8' : 'var(--border)',
                    transform: isDragging ? 'scale(.985)' : 'scale(1)',
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
                          setOpenMenuId(prev => (prev === deck.id ? null : deck.id))
                        }}
                        className="w-9 h-9 rounded-2xl flex items-center justify-center"
                        style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                      >
                        <MoreVertical size={15} />
                      </button>

                      {openMenuId === deck.id && (
                        <>
                          <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenuId(null)} />
                          <div
                            className="absolute right-0 top-11 z-20 w-40 rounded-2xl border p-1.5 shadow-xl"
                            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setEditingDeck(deck)
                                setShowDeckModal(true)
                                setOpenMenuId(null)
                              }}
                              className="w-full h-10 px-3 rounded-xl flex items-center gap-2 text-[13px]"
                              style={{ color: 'var(--text)', background: 'transparent' }}
                            >
                              <Pencil size={14} />
                              Sửa
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuId(null)
                                if (window.confirm(`Xoá bộ thẻ "${deck.title}"?`)) {
                                  deleteDeckMut.mutate(deck.id)
                                }
                              }}
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
                      <span>Cá nhân </span>
                    ) : (
                      <span>
                        Tạo từ nhóm <strong>{deck.sourceGroupName || '—'}</strong>
                        <br />
                        Tài liệu: <strong>{deck.sourceDocumentName || '—'}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => startDeck(deck)}
                    className="w-full h-12 rounded-2xl mt-4 text-[13px] font-medium flex items-center justify-center gap-2"
                    style={{ background: '#6366f1', color: '#fff' }}
                  >
                    {deck.aiGenerated ? <Sparkles size={14} /> : <Layers size={14} />}
                    Bắt đầu học
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {showFolderModal && (
          <CreateFolderModal
            loading={folderMut.isPending}
            onClose={() => setShowFolderModal(false)}
            onSubmit={body => folderMut.mutate(body)}
          />
        )}

        {showDeckModal && (
          <CreateDeckModal
            folders={folders}
            initialData={editingDeck}
            loading={createDeckMut.isPending || updateDeckMut.isPending}
            submitLabel={editingDeck ? 'Lưu thay đổi' : 'Lưu bộ flashcard'}
            onClose={() => {
              setShowDeckModal(false)
              setEditingDeck(null)
            }}
            onSubmit={body => {
              if (editingDeck) {
                updateDeckMut.mutate({ deckId: editingDeck.id, body })
              } else {
                createDeckMut.mutate(body)
              }
            }}
          />
        )}
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-[30px] border p-8 text-center"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 95%, #6366f1 5%), var(--bg2))',
            borderColor: 'color-mix(in srgb, var(--border) 84%, #6366f1 16%)',
          }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-[26px] font-bold mb-2" style={{ color: 'var(--text)' }}>
            Hoàn thành bộ thẻ!
          </h2>
          <p className="text-[14px] mb-7" style={{ color: 'var(--text2)' }}>
            {activeDeck.title}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Đã nhớ', val: known.size, color: '#22c55e', icon: '✅' },
              { label: 'Cần ôn', val: review.size, color: '#f59e0b', icon: '📖' },
              { label: 'Tổng', val: activeCards.length, color: '#6366f1', icon: '🃏' },
            ].map(s => (
              <div
                key={s.label}
                className="p-5 rounded-[24px] border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-[28px] font-bold" style={{ color: s.color }}>
                  {s.val}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#6366f1' }}
            >
              <RotateCcw size={14} />
              Ôn lại từ đầu
            </button>
            <button
              onClick={() => setActiveDeck(null)}
              className="flex-1 py-3.5 rounded-2xl border text-[13px] font-medium flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
            >
              <ArrowLeft size={14} />
              Chọn bộ khác
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentFolder = activeDeck.folderId ? folderMap.get(activeDeck.folderId) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div
        className="rounded-[30px] border p-6"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 96%, #6366f1 4%), var(--bg2))',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => setActiveDeck(null)}
              className="flex items-center gap-1.5 text-[12px] transition-colors mb-2"
              style={{ color: 'var(--text3)' }}
            >
              <ArrowLeft size={14} />
              Quay lại danh sách
            </button>

            <h2 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              {activeDeck.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <SourceBadge deck={activeDeck} />
              {currentFolder && (
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] border flex items-center gap-1.5"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  <Folder size={12} style={{ color: currentFolder.color || '#6366f1' }} />
                  {currentFolder.name}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={restart}
            className="flex items-center gap-2 text-[12px] px-4 h-11 rounded-2xl border"
            style={{ color: 'var(--text2)', borderColor: 'var(--border)', background: 'var(--bg3)' }}
          >
            <RotateCcw size={14} />
            Làm lại
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Tổng', val: activeCards.length, color: '#8b8b9e' },
            { label: 'Đã nhớ', val: known.size, color: '#22c55e' },
            { label: 'Cần ôn', val: review.size, color: '#f59e0b' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-[24px] p-4 text-center border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <div className="text-[28px] font-bold font-mono" style={{ color: s.color }}>
                {s.val}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
          <span>
            Thẻ {idx + 1}/{activeCards.length}
          </span>
          <span style={{ color: '#818cf8' }}>{progress}%</span>
        </div>

        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((idx + 1) / Math.max(activeCards.length, 1)) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>

        <div className="flex gap-2 justify-center mt-4">
          {activeCards.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                background: known.has(i)
                  ? '#22c55e'
                  : review.has(i)
                    ? '#f59e0b'
                    : i === idx
                      ? '#6366f1'
                      : 'rgba(120,120,140,.25)',
                transform: i === idx ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {currentCard && <FlipCard card={currentCard} flipped={flipped} onFlip={() => setFlipped(v => !v)} />}

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (idx > 0) {
              setIdx(idx - 1)
              setFlipped(false)
            }
          }}
          disabled={idx === 0}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border text-[12px] disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
        >
          <ChevronLeft size={14} />
          Trước
        </button>

        <button
          onClick={() => next(false)}
          className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
          style={{
            background: 'rgba(239,68,68,.12)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,.25)',
          }}
        >
          <X size={15} />
          Cần ôn
        </button>

        <button
          onClick={() => next(true)}
          className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
          style={{
            background: 'rgba(34,197,94,.12)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,.25)',
          }}
        >
          <Check size={15} />
          Đã nhớ
        </button>
      </div>

      {!flipped && (
        <p className="text-center text-[12px]" style={{ color: 'var(--text3)' }}>
          Click vào thẻ để xem đáp án trước khi đánh giá
        </p>
      )}
    </div>
  )
}