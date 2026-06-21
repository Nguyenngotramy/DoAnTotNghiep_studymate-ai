import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  Plus,
  RotateCcw,
  X,
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
  Target,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { flashcardApi } from '@/api/services'
import type { Flashcard, FlashcardDeck, FlashcardFolder } from '@/types'
import VocabularyToolkit from '@/components/VocabularyToolkit'
import FlashcardStudySession from '@/components/learning/FlashcardStudySession'
import { BookMarked, CalendarClock } from 'lucide-react'

type DeckFormBody = {
  title: string
  description?: string
  folderId?: string
  cards: { question: string; answer: string }[]
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
          <button type="button"
            aria-label="Đóng hộp thoại" onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            id="flashcard-folder-name" name="flashcardFolderName" autoComplete="off" value={name}
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
              id="flashcard-folder-color" name="flashcardFolderColor" type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full h-10 rounded-xl px-1"
              style={{ background: 'transparent' }}
            />
          </div>
        </div>

        <button type="button"
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
          <button type="button"
            aria-label="Đóng hộp thoại" onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 mb-4">
          <input
            id="flashcard-deck-title" name="flashcardDeckTitle" autoComplete="off" value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tên bộ thẻ"
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <input
            id="flashcard-deck-description" name="flashcardDeckDescription" autoComplete="off" value={description}
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
                <button type="button" onClick={() => removeCard(index)} className="text-[12px]" style={{ color: '#ef4444' }}>
                  Xoá
                </button>
              </div>

              <div className="grid gap-3">
                <textarea
                  id={`flashcard-question-${index}`} name={`flashcardQuestion${index}`} value={card.question}
                  onChange={e => updateCard(index, 'question', e.target.value)}
                  placeholder="Câu hỏi"
                  className="w-full min-h-[90px] rounded-2xl px-4 py-3 outline-none resize-none"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <textarea
                  id={`flashcard-answer-${index}`} name={`flashcardAnswer${index}`} value={card.answer}
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
          <button type="button"
            onClick={addCard}
            className="px-4 h-12 rounded-2xl text-[13px] font-medium border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            + Thêm thẻ
          </button>
          <button type="button"
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
  const [studyMode, setStudyMode] = useState<'DUE' | 'ALL'>('DUE')
  const [idx, setIdx] = useState(0)

  // Local Quiz Practice from Flashcards state
  const [quizMode, setQuizMode] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<{
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }[]>([])
  const [selectedAns, setSelectedAns] = useState<number | null>(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)
  const [answeredQuiz, setAnsweredQuiz] = useState(false)

  const startQuizFromFlashcards = (deck: FlashcardDeck) => {
    const cards = deck.cards || []
    if (cards.length < 2) {
      toast.error('Cần tối thiểu 2 thẻ flashcard để tạo bài Quiz ôn tập')
      return
    }

    const questionsList = cards.map((card, currentIdx) => {
      const correctAnswer = card.answer
      
      // Get all other answers as distractors
      const otherAnswers = cards
        .filter((_, idx) => idx !== currentIdx)
        .map(c => c.answer)
        .filter((value, index, self) => self.indexOf(value) === index)

      // Randomly shuffle and select up to 3 distractors
      const shuffledOther = [...otherAnswers].sort(() => Math.random() - 0.5)
      const distractors = shuffledOther.slice(0, Math.min(3, shuffledOther.length))

      // If less than 3, pad with placeholder answers
      while (distractors.length < Math.min(3, cards.length - 1)) {
        distractors.push(`Đáp án gây nhiễu ${distractors.length + 1}`)
      }

      // Merge and shuffle options
      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5)
      const correctIndex = options.indexOf(correctAnswer)

      return {
        question: card.question,
        options,
        correctIndex,
        explanation: `Khái niệm: ${card.question}\nĐáp án chính xác: ${correctAnswer}`
      }
    })

    setQuizQuestions(questionsList)
    setIdx(0)
    setSelectedAns(null)
    setAnsweredQuiz(false)
    setQuizScore(0)
    setQuizDone(false)
    setQuizMode(true)
    setActiveDeck(deck)
  }

  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [showVocabToolkit, setShowVocabToolkit] = useState(false)
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

  const startDeck = (deck: FlashcardDeck, mode: 'DUE' | 'ALL' = 'DUE') => {
    setStudyMode(mode)
    setActiveDeck(deck)
    setQuizMode(false)
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
      <div className="mx-auto max-w-7xl space-y-5 overflow-x-hidden pb-24 lg:pb-6">
        <div
          className="rounded-3xl border p-5 sm:p-6"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 94%, #6366f1 6%), var(--bg2))',
            borderColor: 'color-mix(in srgb, var(--border) 84%, #6366f1 16%)',
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

              <h1 className="text-2xl font-bold leading-tight sm:text-[28px] sm:font-semibold" style={{ color: 'var(--text)' }}>
                Học thông minh bằng flashcard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text3)' }}>
                Tạo bộ thẻ cá nhân, lưu flashcard từ tài liệu nhóm và kéo thả bộ thẻ vào folder để quản lý gọn hơn.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:grid-cols-3">
              <button type="button"
                onClick={() => setShowFolderModal(true)}
                className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 text-[12px] font-medium sm:px-4 sm:text-[13px]"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                <FolderPlus size={15} />
                Tạo folder
              </button>

              <button type="button"
                onClick={() => setShowVocabToolkit(true)}
                className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 text-[12px] font-medium sm:px-4 sm:text-[13px]"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <BookMarked size={15} />
                Dán từ vựng
              </button>

              <button type="button"
                onClick={() => {
                setEditingDeck(null)
                setShowDeckModal(true)
              }}
                className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-[13px] font-medium shadow-sm lg:col-span-1"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                <Plus size={15} />
                Tạo bộ thẻ
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              { label: 'Tổng bộ thẻ', value: decks.length, color: '#818cf8' },
              { label: 'Tổng số thẻ', value: totalCards, color: '#10b981' },
              { label: 'AI / Cá nhân', value: `${aiDeckCount} / ${personalDeckCount}`, color: '#f59e0b' },
            ].map(item => (
              <div
                key={item.label}
                className="min-h-[110px] rounded-3xl border p-4"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  {item.label}
                </div>
                <div className="mt-1 text-2xl font-bold sm:text-[28px] sm:font-semibold" style={{ color: item.color }}>
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
                id="flashcard-search" name="flashcardSearch" autoComplete="off" value={search}
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
                <button type="button"
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
              <button type="button"
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
                <button type="button"
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
                      <button type="button"
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
                          <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenuId(null)} />
                          <div
                            className="absolute right-0 top-11 z-20 w-40 rounded-2xl border p-1.5 shadow-xl"
                            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button type="button"
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

                            <button type="button"
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

                  <div className="flex flex-col gap-2 mt-4">
                    <button type="button"
                      onClick={() => startDeck(deck, 'DUE')}
                      className="w-full h-11 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
                      style={{ background: '#6366f1', color: '#fff' }}
                    >
                      <CalendarClock size={13} />
                      Ôn thẻ đến hạn (SM-2)
                    </button>
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => startDeck(deck, 'ALL')}
                        className="flex-1 h-11 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5 border"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                      >
                        {deck.aiGenerated ? <Sparkles size={13} /> : <Layers size={13} />}
                        Học tất cả
                      </button>
                      <button type="button"
                        onClick={() => startQuizFromFlashcards(deck)}
                        className="flex-1 h-11 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5 border"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                      >
                        <Target size={13} className="text-indigo-400" />
                        Luyện Quiz
                      </button>
                    </div>
                  </div>
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

        {showVocabToolkit && (
          <VocabularyToolkit
            defaultTitle="Bộ từ vựng của tôi"
            onClose={() => setShowVocabToolkit(false)}
            onStudyNow={deck => {
              setQuizMode(false)
              startDeck(deck)
              setShowVocabToolkit(false)
            }}
            onQuiz={questions => {
              setActiveDeck({
                id: 'vocab-quiz-temp',
                title: 'Quiz từ vựng',
                createdById: '',
                aiGenerated: false,
                sourceType: 'PERSONAL',
                cards: [],
              })
              setQuizQuestions(questions)
              setIdx(0)
              setSelectedAns(null)
              setAnsweredQuiz(false)
              setQuizScore(0)
              setQuizDone(false)
              setQuizMode(true)
              setShowVocabToolkit(false)
            }}
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

  if (activeDeck && !quizMode) {
    const currentFolder = activeDeck.folderId ? folderMap.get(activeDeck.folderId) : null
    return (
      <FlashcardStudySession
        deck={activeDeck}
        mode={studyMode}
        folder={currentFolder ?? null}
        sourceBadge={<SourceBadge deck={activeDeck} />}
        onExit={() => {
          setActiveDeck(null)
          qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
        }}
        onQuiz={() => startQuizFromFlashcards(activeDeck)}
      />
    )
  }

  if (quizMode && quizQuestions.length > 0) {
    const total = quizQuestions.length
    const pct = Math.round((quizScore / total) * 100)
    const currentQ = quizQuestions[idx]

    const handleQuizChoose = (optIdx: number) => {
      if (answeredQuiz) return
      setSelectedAns(optIdx)
      setAnsweredQuiz(true)
      if (optIdx === currentQ.correctIndex) {
        setQuizScore(s => s + 1)
      }
    }

    const handleQuizNext = () => {
      if (idx + 1 >= total) {
        setQuizDone(true)
        return
      }
      setIdx(idx + 1)
      setSelectedAns(null)
      setAnsweredQuiz(false)
    }

    const handleQuizRestart = () => {
      setIdx(0)
      setSelectedAns(null)
      setAnsweredQuiz(false)
      setQuizScore(0)
      setQuizDone(false)
    }

    if (quizDone) {
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
            <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
            <h2 className="text-[26px] font-bold mb-2" style={{ color: 'var(--text)' }}>
              {pct >= 80 ? 'Xuất sắc!' : pct >= 60 ? 'Khá tốt!' : 'Cần ôn thêm!'}
            </h2>
            <p className="text-[14px] mb-7" style={{ color: 'var(--text2)' }}>
              Luyện Quiz: {activeDeck?.title ?? 'Từ vựng'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Đúng', val: quizScore, color: '#22c55e', icon: '✅' },
                { label: 'Sai', val: total - quizScore, color: '#ef4444', icon: '❌' },
                { label: 'Điểm', val: `${pct}%`, color: '#6366f1', icon: '⭐' },
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
              <button type="button"
                onClick={handleQuizRestart}
                className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: '#6366f1' }}
              >
                <RotateCcw size={14} />
                Làm lại Quiz
              </button>
              <button type="button"
                onClick={() => {
                  setQuizMode(false)
                  startDeck(activeDeck)
                }}
                className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: '#10b981' }}
              >
                <Layers size={14} />
                Học thẻ flashcard
              </button>
              <button type="button"
                onClick={() => {
                  setQuizMode(false)
                  setActiveDeck(null)
                }}
                className="flex-1 py-3.5 rounded-2xl border text-[13px] font-medium flex items-center justify-center gap-2"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
              >
                <ArrowLeft size={14} />
                Danh sách bộ thẻ
              </button>
            </div>
          </div>
        </div>
      )
    }

    const LABELS = ['A', 'B', 'C', 'D']

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
              <button type="button"
                onClick={() => {
                  setQuizMode(false)
                  setActiveDeck(null)
                }}
                className="flex items-center gap-1.5 text-[12px] transition-colors mb-2"
                style={{ color: 'var(--text3)' }}
              >
                <ArrowLeft size={14} />
                Quay lại danh sách
              </button>

              <h2 className="text-2xl font-bold leading-tight sm:text-[28px] sm:font-semibold" style={{ color: 'var(--text)' }}>
                Luyện Quiz: {activeDeck?.title ?? 'Từ vựng'}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <SourceBadge deck={activeDeck} />
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] border flex items-center gap-1.5"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  <Target size={12} className="text-indigo-400" />
                  Quiz Mode thuật toán
                </span>
              </div>
            </div>

            <div
              className="rounded-2xl px-4 py-2 border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <span className="text-[12px]">Đúng: </span>
              <span className="font-semibold text-green-500">{quizScore}</span>
            </div>
          </div>
        </div>

        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(idx / total) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>

        <div
          className="rounded-[28px] border p-6"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Câu {idx + 1}/{total}
            </span>
            <span className="text-[12px] font-semibold text-indigo-400 flex items-center gap-1">
              <Target size={13} />
              Chọn đáp án chính xác
            </span>
          </div>

          <p className="text-[18px] font-semibold leading-relaxed mb-6" style={{ color: 'var(--text)' }}>
            {currentQ.question}
          </p>

          <div className="space-y-3">
            {currentQ.options.map((opt, i) => {
              const isCorrect = i === currentQ.correctIndex
              const isSelected = i === selectedAns

              let bg = 'var(--bg3)'
              let border = 'var(--border)'
              let color = 'var(--text)'
              let labelBg = 'rgba(255,255,255,.08)'

              if (answeredQuiz) {
                if (isCorrect) {
                  bg = 'rgba(34,197,94,.10)'
                  border = 'rgba(34,197,94,.38)'
                  color = '#22c55e'
                  labelBg = 'rgba(34,197,94,.18)'
                } else if (isSelected) {
                  bg = 'rgba(239,68,68,.10)'
                  border = 'rgba(239,68,68,.38)'
                  color = '#ef4444'
                  labelBg = 'rgba(239,68,68,.18)'
                }
              } else if (isSelected) {
                bg = 'rgba(99,102,241,.12)'
                border = 'rgba(99,102,241,.40)'
                color = '#818cf8'
                labelBg = 'rgba(99,102,241,.20)'
              }

              return (
                <button type="button"
                  key={i}
                  onClick={() => handleQuizChoose(i)}
                  disabled={answeredQuiz}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: labelBg, color }}
                  >
                    {LABELS[i]}
                  </div>

                  <span className="text-[13px] font-medium flex-1" style={{ color }}>
                    {opt}
                  </span>

                  {answeredQuiz && isCorrect && <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />}
                  {answeredQuiz && isSelected && !isCorrect && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {answeredQuiz && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: selectedAns === currentQ.correctIndex ? 'rgba(34,197,94,.07)' : 'rgba(239,68,68,.07)',
              border: `1px solid ${
                selectedAns === currentQ.correctIndex ? 'rgba(34,197,94,.22)' : 'rgba(239,68,68,.22)'
              }`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {selectedAns === currentQ.correctIndex ? (
                <>
                  <CheckCircle2 size={14} className="text-green-400" />
                  <span className="text-[12px] font-semibold text-green-400">Chính xác! 🎉</span>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-red-400" />
                  <span className="text-[12px] font-semibold text-red-400">Chưa đúng!</span>
                </>
              )}
            </div>

            <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--text2)' }}>
              {currentQ.explanation}
            </p>
          </div>
        )}

        {answeredQuiz && (
          <button type="button"
            onClick={handleQuizNext}
            className="w-full py-3.5 rounded-2xl text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{ background: '#6366f1' }}
          >
            {idx + 1 >= total ? (
              <>
                <Trophy size={15} />
                Xem kết quả
              </>
            ) : (
              <>
                Câu tiếp theo
                <ChevronRight size={15} />
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  return null
}