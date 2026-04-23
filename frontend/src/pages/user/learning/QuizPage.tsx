import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Search,
  FolderPlus,
  Folder,
  Trash2,
  Sparkles,
  GripVertical,
  MoveRight,
  FolderOpen,
  Inbox,
  Plus,
  BookOpen,
  Trophy,
  Target,
  MoreVertical,
  Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { quizApi } from '@/api/services'
import type { QuizFolder, QuizSet } from '@/types'

const LABELS = ['A', 'B', 'C', 'D']

type QuizFormBody = {
  title: string
  description?: string
  folderId?: string
  questions: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }[]
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
            Tạo folder quiz
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ví dụ: Java, IELTS, AI..."
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />

          <div
            className="rounded-2xl border p-3 flex items-center gap-3"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          >
            <div className="w-10 h-10 rounded-2xl" style={{ background: color }} />
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full h-10"
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

function CreateQuizModal({
  folders,
  onClose,
  onSubmit,
  loading,
  initialData,
  submitLabel,
}: {
  folders: QuizFolder[]
  onClose: () => void
  onSubmit: (body: QuizFormBody) => void
  loading: boolean
  initialData?: QuizSet | null
  submitLabel?: string
}) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [folderId, setFolderId] = useState(initialData?.folderId ?? '')
  const [questions, setQuestions] = useState(
    initialData?.questions?.length
      ? initialData.questions.map(q => ({
          question: q.question ?? '',
          options: [
            q.options?.[0] ?? '',
            q.options?.[1] ?? '',
            q.options?.[2] ?? '',
            q.options?.[3] ?? '',
          ],
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation ?? '',
        }))
      : [
          {
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            explanation: '',
          },
        ],
  )

  const updateQuestion = (index: number, key: 'question' | 'explanation', value: string) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [key]: value } : q)))
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((opt, j) => (j === optionIndex ? value : opt)),
            }
          : q,
      ),
    )
  }

  const updateCorrectIndex = (index: number, value: number) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, correctIndex: value } : q)))
  }

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-[28px] border p-5 max-h-[88vh] overflow-y-auto"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
            {initialData ? 'Chỉnh sửa bộ quiz' : 'Tạo bộ quiz cá nhân'}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        <div className="grid gap-3 mb-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tên bộ quiz"
            className="w-full h-12 rounded-2xl px-4 outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mô tả ngắn"
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

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div
              key={index}
              className="rounded-[24px] border p-4"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                  Câu hỏi {index + 1}
                </p>
                <button onClick={() => removeQuestion(index)} className="text-[12px]" style={{ color: '#ef4444' }}>
                  Xoá
                </button>
              </div>

              <div className="grid gap-3">
                <textarea
                  value={q.question}
                  onChange={e => updateQuestion(index, 'question', e.target.value)}
                  placeholder="Nội dung câu hỏi"
                  className="w-full min-h-[90px] rounded-2xl px-4 py-3 outline-none resize-none"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />

                <div className="grid md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIndex) => (
                    <input
                      key={optIndex}
                      value={opt}
                      onChange={e => updateOption(index, optIndex, e.target.value)}
                      placeholder={`Đáp án ${LABELS[optIndex]}`}
                      className="w-full h-11 rounded-2xl px-4 outline-none"
                      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  ))}
                </div>

                <select
                  value={q.correctIndex}
                  onChange={e => updateCorrectIndex(index, Number(e.target.value))}
                  className="w-full h-11 rounded-2xl px-4 outline-none"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {LABELS.map((label, i) => (
                    <option key={label} value={i}>
                      Đáp án đúng: {label}
                    </option>
                  ))}
                </select>

                <textarea
                  value={q.explanation}
                  onChange={e => updateQuestion(index, 'explanation', e.target.value)}
                  placeholder="Giải thích đáp án"
                  className="w-full min-h-[80px] rounded-2xl px-4 py-3 outline-none resize-none"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={addQuestion}
            className="px-4 h-12 rounded-2xl text-[13px] font-medium border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            + Thêm câu hỏi
          </button>
          <button
            onClick={() =>
              onSubmit({
                title: title.trim(),
                description: description.trim() || undefined,
                folderId: folderId || undefined,
                questions: questions.map(q => ({
                  question: q.question.trim(),
                  options: q.options.map(opt => opt.trim()),
                  correctIndex: q.correctIndex,
                  explanation: q.explanation.trim(),
                })),
              })
            }
            disabled={
              loading ||
              !title.trim() ||
              questions.some(q => !q.question.trim() || q.options.some(opt => !opt.trim()))
            }
            className="flex-1 h-12 rounded-2xl text-[13px] font-medium disabled:opacity-60"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            {loading ? 'Đang lưu...' : submitLabel || (initialData ? 'Lưu thay đổi' : 'Lưu bộ quiz')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SourceBadge({ quizSet }: { quizSet: QuizSet }) {
  const isPersonal = quizSet.sourceType === 'PERSONAL'
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
      {isPersonal ? 'Cá nhân tạo' : 'AI từ tài liệu'}
    </span>
  )
}

export default function QuizPage() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [folderId, setFolderId] = useState<'ALL' | 'NO_FOLDER' | string>('ALL')
  const [sourceType, setSourceType] = useState<'ALL' | 'PERSONAL' | 'DOCUMENT_AI'>('ALL')

  const [activeSet, setActiveSet] = useState<QuizSet | null>(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<QuizSet | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [draggingQuizId, setDraggingQuizId] = useState<string | null>(null)
  const [dropFolderId, setDropFolderId] = useState<string | null>(null)

  const { data: quizSets = [], isLoading } = useQuery({
    queryKey: ['quiz-sets', search, folderId, sourceType],
    queryFn: () =>
      quizApi.listQuizSets({
        search: search || undefined,
        folderId:
          folderId === 'ALL'
            ? undefined
            : folderId === 'NO_FOLDER'
              ? '__NO_FOLDER__'
              : folderId,
        sourceType,
      }),
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['quiz-folders'],
    queryFn: quizApi.listFolders,
  })

  const folderMut = useMutation({
    mutationFn: quizApi.createFolder,
    onSuccess: () => {
      toast.success('Tạo folder thành công')
      qc.invalidateQueries({ queryKey: ['quiz-folders'] })
      setShowFolderModal(false)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể tạo folder')
    },
  })

  const createQuizMut = useMutation({
    mutationFn: quizApi.createPersonalQuizSet,
    onSuccess: () => {
      toast.success('Đã tạo bộ quiz')
      qc.invalidateQueries({ queryKey: ['quiz-sets'] })
      setShowQuizModal(false)
      setEditingQuiz(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể tạo bộ quiz')
    },
  })

  const updateQuizMut = useMutation({
    mutationFn: ({ quizId, body }: { quizId: string; body: QuizFormBody }) =>
      quizApi.updatePersonalQuizSet(quizId, body),
    onSuccess: () => {
      toast.success('Đã cập nhật bộ quiz')
      qc.invalidateQueries({ queryKey: ['quiz-sets'] })
      setShowQuizModal(false)
      setEditingQuiz(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật bộ quiz')
    },
  })

  const deleteQuizMut = useMutation({
    mutationFn: quizApi.deleteQuizSet,
    onSuccess: () => {
      toast.success('Đã xoá bộ quiz')
      qc.invalidateQueries({ queryKey: ['quiz-sets'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá bộ quiz')
    },
  })

  const moveQuizMut = useMutation({
    mutationFn: ({ quizId, folderId }: { quizId: string; folderId?: string | null }) =>
      quizApi.moveQuizToFolder(quizId, folderId ?? undefined),
    onSuccess: () => {
      toast.success('Đã chuyển bộ quiz vào folder')
      qc.invalidateQueries({ queryKey: ['quiz-sets'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể chuyển folder')
    },
    onSettled: () => {
      setDraggingQuizId(null)
      setDropFolderId(null)
    },
  })

  const folderMap = useMemo(() => {
    const map = new Map<string, QuizFolder>()
    folders.forEach(folder => map.set(folder.id, folder))
    return map
  }, [folders])

  const totalQuestions = quizSets.reduce((sum, set) => sum + (set.questions?.length || 0), 0)
  const aiQuizCount = quizSets.filter(set => set.sourceType === 'DOCUMENT_AI').length
  const personalQuizCount = quizSets.filter(set => set.sourceType === 'PERSONAL').length

  const start = (set: QuizSet) => {
    setActiveSet(set)
    setIdx(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setDone(false)
  }

  const choose = (optIdx: number) => {
    if (answered || !activeSet) return
    setSelected(optIdx)
    setAnswered(true)
    if (optIdx === activeSet.questions[idx].correctIndex) {
      setScore(s => s + 1)
    }
  }

  const next = () => {
    if (!activeSet) return
    if (idx + 1 >= activeSet.questions.length) {
      setDone(true)
      return
    }
    setIdx(idx + 1)
    setSelected(null)
    setAnswered(false)
  }

  const restart = () => {
    setIdx(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setDone(false)
  }

  if (!activeSet) {
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
              <div
                className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full border"
                style={{
                  background: 'rgba(99,102,241,.10)',
                  borderColor: 'rgba(99,102,241,.16)',
                  color: '#818cf8',
                }}
              >
                <HelpCircle size={15} />
                Quiz Workspace
              </div>

              <h1 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                Kiểm tra kiến thức bằng quiz
              </h1>
              <p className="text-[13px] mt-2 max-w-2xl leading-6" style={{ color: 'var(--text3)' }}>
                Tạo bộ quiz cá nhân, lưu quiz từ tài liệu nhóm và kéo thả bộ quiz vào folder để quản lý gọn hơn.
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
                setEditingQuiz(null)
                setShowQuizModal(true)
              }}
                className="h-11 px-5 rounded-2xl text-[13px] font-medium flex items-center gap-2 shadow-sm"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                <Plus size={15} />
                Tạo bộ quiz
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Tổng bộ quiz', value: quizSets.length, color: '#818cf8' },
              { label: 'Tổng câu hỏi', value: totalQuestions, color: '#10b981' },
              { label: 'AI / Cá nhân', value: `${aiQuizCount} / ${personalQuizCount}`, color: '#f59e0b' },
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
                placeholder="Tìm theo tên bộ quiz, tài liệu hoặc nhóm..."
                className="bg-transparent outline-none w-full text-[13px]"
                style={{ color: 'var(--text)' }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'PERSONAL', label: 'Cá nhân tạo' },
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
                Kéo thả bộ quiz vào folder để phân loại
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
              >
                Tất cả folder
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
                  }}
                  onDragOver={e => {
                    e.preventDefault()
                    setDropFolderId(folder.id)
                  }}
                  onDragLeave={() => setDropFolderId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    const quizId = e.dataTransfer.getData('quizId')
                    if (quizId) moveQuizMut.mutate({ quizId, folderId: folder.id })
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
        ) : quizSets.length === 0 ? (
          <div
            className="rounded-[30px] border p-12 text-center"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <HelpCircle size={30} className="mx-auto mb-3" style={{ color: 'var(--text3)' }} />
            <p className="text-[15px]" style={{ color: 'var(--text2)' }}>
              Chưa có bộ quiz nào
            </p>
            <p className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
              Bạn có thể tự tạo bộ quiz hoặc lưu từ tài liệu nhóm sau khi AI generate
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {quizSets.map(set => {
              const folder = set.folderId ? folderMap.get(set.folderId) : null
              const isDragging = draggingQuizId === set.id

              return (
                <div
                  key={set.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('quizId', set.id)
                    setDraggingQuizId(set.id)
                  }}
                  onDragEnd={() => {
                    setDraggingQuizId(null)
                    setDropFolderId(null)
                  }}
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
                          {set.title}
                        </h3>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                          {set.questions?.length || 0} câu hỏi
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setOpenMenuId(prev => (prev === set.id ? null : set.id))
                        }}
                        className="w-9 h-9 rounded-2xl flex items-center justify-center"
                        style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                      >
                        <MoreVertical size={15} />
                      </button>

                      {openMenuId === set.id && (
                        <>
                          <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenuId(null)} />
                          <div
                            className="absolute right-0 top-11 z-20 w-40 rounded-2xl border p-1.5 shadow-xl"
                            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setEditingQuiz(set)
                                setShowQuizModal(true)
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
                                if (window.confirm(`Xoá bộ quiz "${set.title}"?`)) {
                                  deleteQuizMut.mutate(set.id)
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
                    <SourceBadge quizSet={set} />

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
                    {set.sourceType === 'PERSONAL' ? (
                      <span>Cá nhân tạo</span>
                    ) : (
                      <span>
                        Tạo từ nhóm <strong>{set.sourceGroupName || '—'}</strong>
                        <br />
                        Tài liệu: <strong>{set.sourceDocumentName || '—'}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => start(set)}
                    className="w-full h-12 rounded-2xl mt-4 text-[13px] font-medium flex items-center justify-center gap-2"
                    style={{ background: '#6366f1', color: '#fff' }}
                  >
                    <HelpCircle size={14} />
                    Bắt đầu làm quiz
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

        {showQuizModal && (
          <CreateQuizModal
            folders={folders}
            initialData={editingQuiz}
            loading={createQuizMut.isPending || updateQuizMut.isPending}
            submitLabel={editingQuiz ? 'Lưu thay đổi' : 'Lưu bộ quiz'}
            onClose={() => {
              setShowQuizModal(false)
              setEditingQuiz(null)
            }}
            onSubmit={body => {
              if (editingQuiz) {
                updateQuizMut.mutate({ quizId: editingQuiz.id, body })
              } else {
                createQuizMut.mutate(body)
              }
            }}
          />
        )}
      </div>
    )
  }

  const q = activeSet.questions[idx]
  const total = activeSet.questions.length
  const pct = Math.round((score / total) * 100)
  const currentFolder = activeSet.folderId ? folderMap.get(activeSet.folderId) : null

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
          <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
          <h2 className="text-[26px] font-bold mb-2" style={{ color: 'var(--text)' }}>
            {pct >= 80 ? 'Xuất sắc!' : pct >= 60 ? 'Khá tốt!' : 'Cần ôn thêm!'}
          </h2>
          <p className="text-[14px] mb-7" style={{ color: 'var(--text2)' }}>
            {activeSet.title}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Đúng', val: score, color: '#22c55e', icon: '✅' },
              { label: 'Sai', val: total - score, color: '#ef4444', icon: '❌' },
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
            <button
              onClick={restart}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#6366f1' }}
            >
              <RotateCcw size={14} />
              Làm lại
            </button>
            <button
              onClick={() => setActiveSet(null)}
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
              onClick={() => setActiveSet(null)}
              className="flex items-center gap-1.5 text-[12px] transition-colors mb-2"
              style={{ color: 'var(--text3)' }}
            >
              <ArrowLeft size={14} />
              Quay lại danh sách
            </button>

            <h2 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              {activeSet.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <SourceBadge quizSet={activeSet} />
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

          <div
            className="rounded-2xl px-4 py-2 border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <span className="text-[12px]">Điểm hiện tại: </span>
            <span className="font-semibold text-green-500">{score}</span>
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
          <span className="text-[12px] font-semibold text-indigo-400">
            <Target size={13} className="inline mr-1" />
            Quiz Mode
          </span>
        </div>

        <p className="text-[18px] font-semibold leading-relaxed mb-6" style={{ color: 'var(--text)' }}>
          {q.question}
        </p>

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex
            const isSelected = i === selected

            let bg = 'var(--bg3)'
            let border = 'var(--border)'
            let color = 'var(--text)'
            let labelBg = 'rgba(255,255,255,.08)'

            if (answered) {
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
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
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

                {answered && isCorrect && <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />}
                {answered && isSelected && !isCorrect && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {answered && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: selected === q.correctIndex ? 'rgba(34,197,94,.07)' : 'rgba(239,68,68,.07)',
            border: `1px solid ${
              selected === q.correctIndex ? 'rgba(34,197,94,.22)' : 'rgba(239,68,68,.22)'
            }`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {selected === q.correctIndex ? (
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
            {q.explanation}
          </p>
        </div>
      )}

      {answered && (
        <button
          onClick={next}
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