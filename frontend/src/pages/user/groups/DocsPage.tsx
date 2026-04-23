import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi, flashcardApi } from '@/api/services'
import type { Document, Flashcard, QuizQuestion, FlashcardFolder } from '@/types'
import {
  Upload,
  Trash2,
  MessageSquare,
  Layers,
  HelpCircle,
  AlignLeft,
  X,
  Loader2,
  Search,
  Eye,
  Download,
  Filter,
  Files,
  FileText,
  Save,
  Folder,
} from 'lucide-react'
import toast from 'react-hot-toast'

const DOC_ICON: Record<string, { label: string; bg: string; color: string }> = {
  PDF: { label: 'PDF', bg: 'rgba(239,68,68,.12)', color: '#ef4444' },
  DOCX: { label: 'DOC', bg: 'rgba(59,130,246,.12)', color: '#3b82f6' },
  PPTX: { label: 'PPT', bg: 'rgba(249,115,22,.12)', color: '#f97316' },
  EXCEL: { label: 'XLS', bg: 'rgba(34,197,94,.12)', color: '#22c55e' },
  IMAGE: { label: 'IMG', bg: 'rgba(168,85,247,.12)', color: '#a855f7' },
  TEXT: { label: 'TXT', bg: 'rgba(14,165,233,.12)', color: '#0ea5e9' },
  OTHER: { label: 'FILE', bg: 'rgba(99,102,241,.12)', color: '#6366f1' },
}

const DOC_TYPES = ['ALL', 'PDF', 'DOCX', 'PPTX', 'EXCEL', 'IMAGE', 'TEXT', 'OTHER'] as const
const SOURCE_TABS = ['ALL', 'PAGE', 'CHAT'] as const

const fmtSize = (kb: number) => {
  if (!kb && kb !== 0) return '—'
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
}

const resolveDocUrl = (fileUrl?: string) => {
  if (!fileUrl) return '#'
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  return `http://localhost:8080/api${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`
}

function SummaryModal({
  docName,
  summary,
  onClose,
}: {
  docName: string
  summary: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Tóm tắt tài liệu
            </div>
            <div className="text-[16px] font-semibold truncate" style={{ color: 'var(--text)' }}>
              {docName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="rounded-2xl border p-4 max-h-[65vh] overflow-y-auto whitespace-pre-wrap leading-7 text-[14px]"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {summary}
        </div>
      </div>
    </div>
  )
}

function SaveFlashcardModal({
  doc,
  cards,
  folders,
  loading,
  onClose,
  onSubmit,
}: {
  doc: Document
  cards: Flashcard[]
  folders: FlashcardFolder[]
  loading: boolean
  onClose: () => void
  onSubmit: (payload: { title: string; folderId?: string }) => void
}) {
  const [title, setTitle] = useState(`Flashcard - ${doc.name}`)
  const [folderId, setFolderId] = useState('')

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-3xl border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Lưu vào Flashcard
            </div>
            <div className="text-[16px] font-semibold truncate" style={{ color: 'var(--text)' }}>
              {doc.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3">
          <div>
            <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
              Tên bộ flashcard
            </p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full h-11 rounded-xl px-4 outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Nhập tên bộ thẻ"
            />
          </div>

          <div>
            <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
              Folder
            </p>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full h-11 rounded-xl px-4 outline-none"
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

          <div
            className="rounded-2xl border p-4 text-[13px]"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Layers size={14} className="text-indigo-400" />
              <span>Số thẻ sẽ lưu: <strong style={{ color: 'var(--text)' }}>{cards.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Folder size={14} style={{ color: 'var(--text3)' }} />
              <span>Nguồn: tạo từ tài liệu nhóm</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border text-[13px] font-medium"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            Huỷ
          </button>
          <button
            onClick={() => onSubmit({ title, folderId: folderId || undefined })}
            disabled={loading || !title.trim()}
            className="flex-1 h-11 rounded-xl text-[13px] font-medium disabled:opacity-60"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            {loading ? 'Đang lưu...' : 'Lưu vào Flashcard'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FlashcardModal({
  cards,
  onClose,
  onSave,
}: {
  cards: Flashcard[]
  onClose: () => void
  onSave?: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = cards[idx]

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border p-6"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px] font-mono" style={{ color: 'var(--text3)' }}>
            {idx + 1} / {cards.length}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="min-h-[200px] rounded-2xl border p-5 flex items-center justify-center cursor-pointer mb-4"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          onClick={() => setFlipped(f => !f)}
        >
          <div className="text-center">
            <p className="text-[11px] mb-3" style={{ color: 'var(--text3)' }}>
              {flipped ? 'Đáp án' : 'Câu hỏi'} — click để lật
            </p>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text)' }}>
              {flipped ? card.answer : card.question}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              setIdx(i => Math.max(0, i - 1))
              setFlipped(false)
            }}
            disabled={idx === 0}
            className="flex-1 h-10 rounded-xl border text-[13px] disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
          >
            ← Trước
          </button>
          <button
            onClick={() => {
              setIdx(i => Math.min(cards.length - 1, i + 1))
              setFlipped(false)
            }}
            disabled={idx === cards.length - 1}
            className="flex-1 h-10 rounded-xl border text-[13px] disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
          >
            Tiếp →
          </button>
        </div>

        {onSave && (
          <button
            onClick={onSave}
            className="w-full h-10 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <Save size={14} />
            Lưu vào Flashcard
          </button>
        )}
      </div>
    </div>
  )
}

function QuizModal({ questions, onClose }: { questions: QuizQuestion[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = questions[idx]

  const pick = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    if (i === q.correctIndex) setScore(s => s + 1)
  }

  const next = () => {
    if (idx < questions.length - 1) {
      setIdx(i => i + 1)
      setSelected(null)
    } else {
      setDone(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-3xl border p-6"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px] font-mono" style={{ color: 'var(--text3)' }}>
            {idx + 1} / {questions.length}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="text-[38px] font-bold font-mono mb-2" style={{ color: '#818cf8' }}>
              {score}/{questions.length}
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text2)' }}>
              {score === questions.length ? 'Xuất sắc! Bạn trả lời đúng tất cả!' : `Bạn trả lời đúng ${score} câu`}
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 h-10 rounded-xl text-[13px] font-medium"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <p className="text-[14px] leading-relaxed mb-4" style={{ color: 'var(--text)' }}>
              {q.question}
            </p>

            <div className="space-y-2 mb-4">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  className="w-full text-left px-3 py-3 rounded-xl text-[13px] border transition-all"
                  style={{
                    borderColor:
                      selected === null
                        ? 'var(--border)'
                        : i === q.correctIndex
                          ? '#22c55e'
                          : selected === i
                            ? '#ef4444'
                            : 'var(--border)',
                    background:
                      selected === null
                        ? 'var(--bg3)'
                        : i === q.correctIndex
                          ? 'rgba(34,197,94,.10)'
                          : selected === i
                            ? 'rgba(239,68,68,.10)'
                            : 'var(--bg3)',
                    color:
                      selected === null
                        ? 'var(--text)'
                        : i === q.correctIndex
                          ? '#22c55e'
                          : selected === i
                            ? '#ef4444'
                            : 'var(--text3)',
                  }}
                >
                  <span className="font-mono mr-2 text-[11px]">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>

            {selected !== null && (
              <div
                className="rounded-xl p-3 mb-3 text-[12px] leading-relaxed border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Giải thích: </span>
                {q.explanation}
              </div>
            )}

            {selected !== null && (
              <button
                onClick={next}
                className="w-full h-10 rounded-xl text-[13px] font-medium"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                {idx < questions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ChatDocModal({
  doc,
  input,
  answer,
  loading,
  onChangeInput,
  onSend,
  onClose,
}: {
  doc: Document
  input: string
  answer: string
  loading: boolean
  onChangeInput: (v: string) => void
  onSend: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Hỏi đáp với tài liệu
            </p>
            <p className="text-[15px] font-medium truncate" style={{ color: 'var(--text)' }}>
              {doc.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          value={input}
          onChange={e => onChangeInput(e.target.value)}
          placeholder="Nhập câu hỏi về tài liệu..."
          className="w-full min-h-[96px] px-4 py-3 rounded-2xl outline-none text-[14px] resize-none"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />

        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="w-full h-10 mt-3 rounded-xl text-[13px] font-medium disabled:opacity-60"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          {loading ? 'AI đang trả lời...' : 'Gửi câu hỏi'}
        </button>

        {answer && (
          <div
            className="rounded-2xl border p-4 mt-4 text-[14px] leading-7 whitespace-pre-wrap"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {answer}
          </div>
        )}
      </div>
    </div>
  )
}

function DocCard({
  doc,
  onAction,
  onDelete,
}: {
  doc: Document
  onAction: (type: string, doc: Document) => void
  onDelete: (doc: Document) => void
}) {
  const icon = DOC_ICON[doc.type] ?? DOC_ICON.OTHER
  const uploader = doc.uploaderName?.split(' ').pop() || 'Unknown'
  const sourceLabel = doc.sourceType === 'CHAT' ? 'Từ chat' : 'Trên page'

  return (
    <div
      className="rounded-2xl p-4 border transition-all"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-12 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ background: icon.bg, color: icon.color }}
        >
          {icon.label}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium leading-snug truncate" style={{ color: 'var(--text)' }}>
            {doc.name}
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
            {fmtSize(doc.sizeKb)} · {uploader}
          </p>
          <div
            className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text3)' }}
          >
            <FileText size={11} />
            {sourceLabel}
          </div>
        </div>

        <button onClick={() => onDelete(doc)} className="p-1 rounded-lg transition-colors" style={{ color: '#ef4444' }}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <a
          href={resolveDocUrl(doc.fileUrl)}
          target="_blank"
          rel="noreferrer"
          className="h-9 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-medium"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          <Eye size={13} />
          Mở file
        </a>

        <a
          href={resolveDocUrl(doc.fileUrl)}
          download
          className="h-9 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-medium"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          <Download size={13} />
          Tải xuống
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { type: 'chat', icon: MessageSquare, label: 'Hỏi đáp AI' },
          { type: 'flashcard', icon: Layers, label: 'Flashcard' },
          { type: 'quiz', icon: HelpCircle, label: 'Tạo Quiz' },
          { type: 'summarize', icon: AlignLeft, label: 'Tóm tắt' },
        ].map(a => (
          <button
            key={a.type}
            onClick={() => onAction(a.type, doc)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] transition-all border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <a.icon size={12} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DocsPage() {
  const { groupId = '' } = useParams<{ groupId: string }>()
  const qc = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null)
  const [flashcardDoc, setFlashcardDoc] = useState<Document | null>(null)
  const [showSaveFlashcard, setShowSaveFlashcard] = useState(false)
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null)
  const [summaryDocName, setSummaryDocName] = useState('')
  const [summaryText, setSummaryText] = useState('')
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [chatDoc, setChatDoc] = useState<Document | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof DOC_TYPES)[number]>('ALL')
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_TABS)[number]>('ALL')

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['docs', groupId],
    queryFn: () => documentApi.list(groupId),
    enabled: !!groupId,
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['flashcard-folders'],
    queryFn: () => flashcardApi.listFolders(),
  })

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()

    return docs.filter(doc => {
      const okType = typeFilter === 'ALL' ? true : doc.type === typeFilter
      const okSource = sourceFilter === 'ALL' ? true : (doc.sourceType || 'PAGE') === sourceFilter
      const okSearch = !q || doc.name?.toLowerCase().includes(q) || doc.uploaderName?.toLowerCase().includes(q)
      return okType && okSource && okSearch
    })
  }, [docs, search, typeFilter, sourceFilter])

  const uploadMut = useMutation({
    mutationFn: (file: File) => documentApi.upload(groupId, file, p => setUploadPct(p)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['docs', groupId] })
      toast.success('Upload thành công!')
      setUploadPct(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Lỗi upload')
      setUploadPct(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (doc: Document) => documentApi.delete(groupId, doc.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['docs', groupId] })
      toast.success('Đã xoá tài liệu')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá tài liệu')
    },
  })

  const saveFlashcardMut = useMutation({
    mutationFn: (payload: { docId: string; title: string; folderId?: string; cards: { question: string; answer: string }[] }) =>
      flashcardApi.saveFromDocument(payload),
    onSuccess: () => {
      toast.success('Đã lưu sang Flashcard')
      qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
      setShowSaveFlashcard(false)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể lưu flashcard')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File tối đa 50MB')
      return
    }
    uploadMut.mutate(file)
    e.target.value = ''
  }

  const handleAction = async (type: string, doc: Document) => {
    if (type === 'chat') {
      setChatDoc(doc)
      setChatAnswer('')
      setChatInput('')
      return
    }

    setAiLoading(`${type}-${doc.id}`)
    try {
      if (type === 'flashcard') {
        const cards = await documentApi.generateFlashcards(doc.id)
        setFlashcards(cards)
        setFlashcardDoc(doc)
      } else if (type === 'quiz') {
        const qs = await documentApi.generateQuiz(doc.id)
        setQuiz(qs)
      } else if (type === 'summarize') {
        const { summary } = await documentApi.summarize(doc.id)
        setSummaryDocName(doc.name)
        setSummaryText(summary)
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'AI đang bận, thử lại sau')
    } finally {
      setAiLoading(null)
    }
  }

  const sendChatQuestion = async () => {
    if (!chatDoc || !chatInput.trim()) return
    setAiLoading('chat')
    try {
      const { answer } = await documentApi.chatWithDoc(chatDoc.id, chatInput)
      setChatAnswer(answer)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết nối AI')
    } finally {
      setAiLoading(null)
    }
  }

  return (
    <div className="page-enter max-w-6xl">
      <div
        className="rounded-3xl border p-5 mb-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Files size={18} className="text-indigo-400" />
              Tài liệu nhóm
            </h1>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              Upload tài liệu để cả nhóm lưu trữ, đọc file và dùng AI học tập
            </p>
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.csv,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploadMut.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-60"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              {uploadMut.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {uploadPct ?? 0}%
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload tài liệu
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mt-4">
          <div
            className="h-11 rounded-2xl border flex items-center px-3 gap-2"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          >
            <Search size={15} style={{ color: 'var(--text3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên file hoặc người upload..."
              className="bg-transparent outline-none w-full text-[13px]"
              style={{ color: 'var(--text)' }}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--text3)' }}>
              <Filter size={14} />
              Loại file:
            </div>
            {DOC_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="px-3 h-9 rounded-xl text-[12px] font-medium border"
                style={{
                  background: typeFilter === type ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                  borderColor: typeFilter === type ? 'rgba(99,102,241,.25)' : 'var(--border)',
                  color: typeFilter === type ? '#818cf8' : 'var(--text2)',
                }}
              >
                {type === 'ALL' ? 'Tất cả' : type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-3">
          <div className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--text3)' }}>
            <FileText size={14} />
            Nguồn:
          </div>
          {SOURCE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setSourceFilter(tab)}
              className="px-3 h-9 rounded-xl text-[12px] font-medium border"
              style={{
                background: sourceFilter === tab ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                borderColor: sourceFilter === tab ? 'rgba(99,102,241,.25)' : 'var(--border)',
                color: sourceFilter === tab ? '#818cf8' : 'var(--text2)',
              }}
            >
              {tab === 'ALL' ? 'Tất cả' : tab === 'PAGE' ? 'Trên page' : 'Qua chat'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4 text-[12px]" style={{ color: 'var(--text3)' }}>
          <span>Tổng tài liệu: <strong style={{ color: 'var(--text)' }}>{docs.length}</strong></span>
          <span>Hiển thị: <strong style={{ color: 'var(--text)' }}>{filteredDocs.length}</strong></span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 rounded-2xl animate-pulse" style={{ background: 'var(--bg2)' }} />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl"
          style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}
        >
          <Upload size={32} style={{ color: 'var(--text3)' }} className="mb-3" />
          <p className="text-[14px] mb-1" style={{ color: 'var(--text2)' }}>
            {docs.length === 0 ? 'Chưa có tài liệu nào' : 'Không có tài liệu phù hợp'}
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
            {docs.length === 0
              ? 'Upload PDF, DOCX, PPTX, EXCEL, TXT... để dùng AI phân tích'
              : 'Thử đổi từ khoá tìm kiếm hoặc bộ lọc file'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="relative">
              {aiLoading?.includes(String(doc.id)) && (
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center z-10 bg-black/45">
                  <Loader2 size={22} className="animate-spin text-indigo-400" />
                </div>
              )}

              <DocCard
                doc={doc}
                onAction={handleAction}
                onDelete={docItem => {
                  if (window.confirm(`Xoá tài liệu "${docItem.name}"?`)) {
                    deleteMut.mutate(docItem)
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}

      {chatDoc && (
        <ChatDocModal
          doc={chatDoc}
          input={chatInput}
          answer={chatAnswer}
          loading={aiLoading === 'chat'}
          onChangeInput={setChatInput}
          onSend={sendChatQuestion}
          onClose={() => {
            setChatDoc(null)
            setChatAnswer('')
            setChatInput('')
          }}
        />
      )}

      {summaryText && (
        <SummaryModal
          docName={summaryDocName}
          summary={summaryText}
          onClose={() => {
            setSummaryDocName('')
            setSummaryText('')
          }}
        />
      )}

      {flashcards && (
        <FlashcardModal
          cards={flashcards}
          onClose={() => {
            setFlashcards(null)
            setFlashcardDoc(null)
          }}
          onSave={flashcardDoc ? () => setShowSaveFlashcard(true) : undefined}
        />
      )}

      {showSaveFlashcard && flashcards && flashcardDoc && (
        <SaveFlashcardModal
          doc={flashcardDoc}
          cards={flashcards}
          folders={folders}
          loading={saveFlashcardMut.isPending}
          onClose={() => setShowSaveFlashcard(false)}
          onSubmit={({ title, folderId }) =>
            saveFlashcardMut.mutate({
              docId: flashcardDoc.id,
              title,
              folderId,
              cards: flashcards.map(card => ({
                question: card.question,
                answer: card.answer,
              })),
            })
          }
        />
      )}

      {quiz && <QuizModal questions={quiz} onClose={() => setQuiz(null)} />}
    </div>
  )
}