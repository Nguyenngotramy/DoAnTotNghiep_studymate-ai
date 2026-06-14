import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi, flashcardApi, quizApi, postApi, groupApi } from '@/api/services'
import type { Document, Flashcard, QuizQuestion, FlashcardFolder, QuizFolder, Post } from '@/types'
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
  Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { withAiConfig } from '@/utils/aiConfig'
import { addNote } from '@/utils/notesStorage'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const BACKEND_URL = '/ai-agent'

const DOC_ICON: Record<string, { label: string; bg: string; color: string }> = {
  PDF:   { label: 'PDF',  bg: 'rgba(239,68,68,.12)',   color: '#ef4444' },
  DOCX:  { label: 'DOC',  bg: 'rgba(59,130,246,.12)',  color: '#3b82f6' },
  PPTX:  { label: 'PPT',  bg: 'rgba(249,115,22,.12)',  color: '#f97316' },
  EXCEL: { label: 'XLS',  bg: 'rgba(34,197,94,.12)',   color: '#22c55e' },
  IMAGE: { label: 'IMG',  bg: 'rgba(168,85,247,.12)',  color: '#a855f7' },
  TEXT:  { label: 'TXT',  bg: 'rgba(14,165,233,.12)',  color: '#0ea5e9' },
  OTHER: { label: 'FILE', bg: 'rgba(99,102,241,.12)',  color: '#6366f1' },
}

const DOC_TYPES   = ['ALL', 'PDF', 'DOCX', 'PPTX', 'EXCEL', 'IMAGE', 'TEXT', 'OTHER'] as const
const SOURCE_TABS = ['ALL', 'PAGE', 'CHAT'] as const

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const fmtSize = (kb: number) => {
  if (!kb && kb !== 0) return '—'
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
}

const resolveDocUrl = (fileUrl?: string) => {
  if (!fileUrl) return '#'
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  return `/api${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`
}

// ─────────────────────────────────────────
// BACKEND AI CALLS
// Tất cả đều truyền file_url để backend fetch nội dung file thực.
// Không còn dùng extractMarkdown() ở frontend nữa.
// ─────────────────────────────────────────

async function backendSummary(
  doc: Document,
  style: string,
  length: string,
  subject?: string,
  docTopic?: string,
  blogContext?: string,
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withAiConfig({
      topic:     docTopic || doc.name,
      filename:  doc.name,
      file_url: doc.fileUrl,
      subject,
      doc_topic: docTopic,
      style,
      length,
      blog_context: blogContext || undefined,
    })),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.summary as string
}

async function fetchBlogContext(tag?: string): Promise<{ text: string; titles: string[]; appendix: string }> {
  try {
    const page = await postApi.feed(0, tag?.trim() || undefined)
    const posts: Post[] = page.content?.slice(0, 5) ?? []
    if (!posts.length) return { text: '', titles: [], appendix: '' }
    const titles = posts.map(p => p.title).filter(Boolean)
    const text = posts.map(p => {
      const body = (p.summary || p.content || '').slice(0, 1200)
      return `### ${p.title}\n${body}`
    }).join('\n\n---\n\n')
    return { text, titles, appendix: text }
  } catch {
    return { text: '', titles: [], appendix: '' }
  }
}

async function backendFlashcard(
  doc: Document,
  card_type: string,
  num_cards: number,
  subject?: string,
  docTopic?: string,
): Promise<Flashcard[]> {
  const res = await fetch(`${BACKEND_URL}/flashcard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withAiConfig({
      topic:     docTopic || doc.name,
      filename:  doc.name,
      file_url: doc.fileUrl,
      subject,
      doc_topic: docTopic,
      card_type,
      num_cards,
      format: 'qa',
    })),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  if (data.pipeline === 'vocabulary_json' && data.vocabulary?.vocabulary?.length) {
    toast.success(`Đã trích ${data.vocabulary.vocabulary.length} từ → tạo ${data.num_cards} flashcard`)
  }
  return (data.flashcards as { question: string; answer: string }[]).map((c, i) => ({
    id: String(i),
    question: c.question,
    answer: c.answer,
  })) as unknown as Flashcard[]
}

async function backendQuiz(
  doc: Document,
  bloom_level: string,
  num_questions: number,
  subject?: string,
  docTopic?: string,
): Promise<QuizQuestion[]> {
  const res = await fetch(`${BACKEND_URL}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withAiConfig({
      topic:     docTopic || doc.name,
      filename:  doc.name,
      file_url: doc.fileUrl,
      subject,
      doc_topic: docTopic,
      bloom_level,
      num_questions,
    })),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  if (data.pipeline === 'vocabulary_json' && data.vocabulary?.vocabulary?.length) {
    toast.success(`Quiz từ ${data.vocabulary.vocabulary.length} từ vựng JSON`)
  }
  if (Number(data.num_questions) < num_questions) {
    toast(`AI tạo được ${data.num_questions}/${num_questions} câu hợp lệ; câu trùng hoặc lỗi đã được loại bỏ.`)
  }
  return (data.questions as Record<string, unknown>[]).map((q, i) => ({
    id: String(i),
    question: String(q.question ?? ''),
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    correctIndex: Number(q.correctIndex ?? q.correct_index ?? 0),
    explanation: String(q.explanation ?? ''),
  })) as QuizQuestion[]
}

type ChatApiResult = {
  response: string
  session_id?: string
  agent?: string
  structured?: { type: 'quiz' | 'flashcard'; items: Record<string, unknown>[] }
}

async function backendChat(
  doc: Document,
  question: string,
  subject?: string,
  docTopic?: string,
  sessionId?: string,
): Promise<ChatApiResult> {
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withAiConfig({
      text: `[Tài liệu: ${doc.name}]\nFile URL: ${doc.fileUrl ?? ''}\n\nCâu hỏi: ${question}`,
      session_id: sessionId,
      subject,
      doc_topic: docTopic,
    })),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

type DocChatMessage = {
  role: 'user' | 'assistant'
  text: string
  agent?: string
  structured?: ChatApiResult['structured']
  autoSaved?: boolean
}

const DOC_CHAT_PROMPTS = [
  { label: 'Giải thích', text: 'Giải thích nội dung chính của tài liệu này' },
  { label: 'Phân tích KT', text: 'Phân tích vấn đề trong tài liệu theo Kepner-Tregoe (IS/IS NOT)' },
  { label: 'Tạo quiz', text: 'Tạo 20 câu quiz trắc nghiệm từ tài liệu mức understand' },
  { label: 'Flashcard', text: 'Tạo 6 flashcard từ khái niệm trong tài liệu' },
]

function parseApiError(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Backend AI lỗi, thử lại sau'
}

// ─────────────────────────────────────────
// DOC LABEL MODAL — bắt buộc trước khi AI đọc tài liệu
// ─────────────────────────────────────────

const LABEL_SUGGESTIONS = [
  'Chương 1 — Giới thiệu',
  'Chương 2 — Lý thuyết',
  'Chương 3 — Bài tập',
  'Ôn tập',
  'Đề thi',
  'Từ vựng',
]

function DocLabelModal({
  doc,
  groupSubject,
  onClose,
  onSave,
  loading,
  isEdit = false,
}: {
  doc: Document
  groupSubject?: string
  onClose: () => void
  onSave: (label: string) => void
  loading: boolean
  isEdit?: boolean
}) {
  const [label, setLabel] = useState(doc.topicLabel || '')

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
              {isEdit ? 'Sửa nhãn tài liệu' : 'Gắn nhãn tài liệu'}
            </div>
            <div className="text-[15px] font-medium truncate" style={{ color: 'var(--text)' }}>{doc.name}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        {groupSubject && (
          <div
            className="mb-3 px-3 py-2 rounded-xl text-[12px] border"
            style={{ background: 'rgba(99,102,241,.08)', borderColor: 'rgba(99,102,241,.2)', color: '#818cf8' }}
          >
            Nhóm: {groupSubject}
          </div>
        )}

        <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
          {isEdit
            ? 'Chỉnh sửa hoặc thêm nhãn chủ đề/chương của tài liệu'
            : 'Nhập chủ đề/chương của tài liệu (bắt buộc trước khi dùng AI)'}
        </p>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="VD: Chương 3 — Đạo hàm"
          className="w-full h-11 px-4 rounded-xl outline-none text-[14px] mb-3"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />

        <div className="flex flex-wrap gap-1.5 mb-4">
          {LABEL_SUGGESTIONS.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setLabel(suggestion)}
              className="px-2.5 py-1 rounded-lg text-[11px] border transition-colors"
              style={{
                background: label === suggestion ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                borderColor: label === suggestion ? 'rgba(99,102,241,.25)' : 'var(--border)',
                color: label === suggestion ? '#818cf8' : 'var(--text3)',
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <button
          onClick={() => onSave(label.trim())}
          disabled={loading || !label.trim()}
          className="w-full h-10 rounded-xl text-[13px] font-medium disabled:opacity-60"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          {loading ? 'Đang lưu...' : isEdit ? 'Lưu nhãn' : 'Lưu nhãn & tiếp tục'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// AI OPTIONS MODAL
// ─────────────────────────────────────────

function AiOptionsModal({
  type,
  doc,
  onClose,
  onSubmit,
  loading,
}: {
  type: 'flashcard' | 'quiz' | 'summarize'
  doc: Document
  onClose: () => void
  onSubmit: (opts: Record<string, string | number>) => void
  loading: boolean
}) {
  const [style,     setStyle]     = useState('bullet')
  const [length,    setLength]    = useState('medium')
  const [cardType,  setCardType]  = useState('mixed')
  const [numCards,  setNumCards]  = useState(6)
  const [bloom,     setBloom]     = useState('understand')
  const [numQ,      setNumQ]      = useState(20)
  const [includeBlogs, setIncludeBlogs] = useState(false)
  const [blogTag,   setBlogTag]   = useState('')

  const handleSubmit = () => {
    if (type === 'summarize') onSubmit({ style, length, include_blogs: includeBlogs ? 1 : 0, blog_tag: blogTag })
    if (type === 'flashcard') onSubmit({ card_type: cardType, num_cards: numCards })
    if (type === 'quiz')      onSubmit({ bloom_level: bloom, num_questions: numQ })
  }

  const title = type === 'summarize' ? 'Tóm tắt tài liệu' : type === 'flashcard' ? 'Tạo Flashcard' : 'Tạo Quiz'

  return (
    <div
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>{title}</div>
            <div className="text-[15px] font-medium truncate" style={{ color: 'var(--text)' }}>
              {doc.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="grid gap-3 mb-4">
          {type === 'summarize' && (
            <>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Định dạng</p>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="bullet">Gạch đầu dòng</option>
                  <option value="paragraph">Văn xuôi</option>
                  <option value="outline">Dàn ý có cấp</option>
                  <option value="map">Sơ đồ text</option>
                </select>
              </div>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Độ dài</p>
                <select
                  value={length}
                  onChange={e => setLength(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="short">Ngắn (&lt;100 từ)</option>
                  <option value="medium">Trung bình</option>
                  <option value="long">Chi tiết (300+ từ)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text2)' }}>
                <input
                  type="checkbox"
                  checked={includeBlogs}
                  onChange={e => setIncludeBlogs(e.target.checked)}
                />
                Nối thêm kiến thức từ bài blog
              </label>
              {includeBlogs && (
                <div>
                  <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Tag blog (tuỳ chọn)</p>
                  <input
                    value={blogTag}
                    onChange={e => setBlogTag(e.target.value)}
                    placeholder="VD: toán, tiếng anh, lập trình..."
                    className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              )}
            </>
          )}

          {type === 'flashcard' && (
            <>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Loại thẻ</p>
                <select
                  value={cardType}
                  onChange={e => setCardType(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="definition">Định nghĩa</option>
                  <option value="formula">Công thức</option>
                  <option value="concept">Khái niệm</option>
                  <option value="mixed">Hỗn hợp</option>
                </select>
              </div>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Số thẻ</p>
                <select
                  value={numCards}
                  onChange={e => setNumCards(Number(e.target.value))}
                  className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {[4, 6, 8, 10, 12, 15].map(n => (
                    <option key={n} value={n}>{n} thẻ</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'quiz' && (
            <>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Mức độ Bloom's</p>
                <select
                  value={bloom}
                  onChange={e => setBloom(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="remember">Ghi nhớ</option>
                  <option value="understand">Hiểu</option>
                  <option value="apply">Áp dụng</option>
                  <option value="analyze">Phân tích</option>
                </select>
              </div>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: 'var(--text3)' }}>Số câu hỏi</p>
                <select
                  value={numQ}
                  onChange={e => setNumQ(Number(e.target.value))}
                  className="w-full h-10 rounded-xl px-3 outline-none text-[13px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {[5, 10, 15, 20, 25, 30].map(n => (
                    <option key={n} value={n}>{n} câu</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-[13px] font-medium"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-[13px] font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            {loading ? <><Loader2 size={13} className="animate-spin" /> Đang xử lý...</> : 'Bắt đầu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// SUMMARY MODAL
// ─────────────────────────────────────────

const isCloudinaryUrl = (url: string) => {
  return url.includes('res.cloudinary.com') && url.includes('/upload/')
}

const addCloudinaryFlag = (url: string, flag: string) => {
  if (!isCloudinaryUrl(url)) return url

  const uploadPart = '/upload/'

  if (!url.includes(uploadPart)) return url
  if (url.includes(`/upload/${flag}/`)) return url

  return url.replace(uploadPart, `/upload/${flag}/`)
}

const canPreviewDirectly = (type?: string) => {
  return ['IMAGE', 'TEXT'].includes(type || '')
}

const canPreviewWithGoogleDocs = (type?: string) => {
  return ['PDF', 'DOCX', 'PPTX', 'EXCEL'].includes(type || '')
}

const resolveDocViewUrl = (doc: Document) => {
  const url = resolveDocUrl(doc.fileUrl)

  if (!url || url === '#') return '#'

  if (canPreviewDirectly(doc.type)) {
    return url
  }

  if (canPreviewWithGoogleDocs(doc.type) && url.startsWith('http')) {
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`
  }

  return url
}

const resolveDocDownloadUrl = (doc: Document) => {
  const url = resolveDocUrl(doc.fileUrl)

  if (!url || url === '#') return '#'

  if (isCloudinaryUrl(url)) {
    return addCloudinaryFlag(url, 'fl_attachment')
  }

  return url
}

function SummaryModal({
  docName,
  summary,
  onClose,
  onSave,
  saving,
}: {
  docName: string
  summary: string
  onClose: () => void
  onSave?: () => void
  saving?: boolean
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
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>Tóm tắt tài liệu</div>
            <div className="text-[16px] font-semibold truncate" style={{ color: 'var(--text)' }}>{docName}</div>
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
          className="rounded-2xl border p-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap leading-7 text-[14px]"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {summary}
        </div>
        <div className="flex gap-2 mt-4">
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              <Save size={14} />
              {saving ? 'Đang lưu...' : 'Lưu vào Ghi chú'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-[13px] font-medium"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// SAVE FLASHCARD MODAL
// ─────────────────────────────────────────

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
  const [title,    setTitle]    = useState(`Flashcard - ${doc.name}`)
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
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>Lưu vào Flashcard</div>
            <div className="text-[16px] font-semibold truncate" style={{ color: 'var(--text)' }}>{doc.name}</div>
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
            <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>Tên bộ flashcard</p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full h-11 rounded-xl px-4 outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Nhập tên bộ thẻ"
            />
          </div>
          <div>
            <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>Folder</p>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full h-11 rounded-xl px-4 outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <option value="">Không chọn folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
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

// ─────────────────────────────────────────
// FLASHCARD MODAL
// ─────────────────────────────────────────

function FlashcardModal({
  cards,
  onClose,
  onSave,
}: {
  cards: Flashcard[]
  onClose: () => void
  onSave?: () => void
}) {
  const [idx,     setIdx]     = useState(0)
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
            onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false) }}
            disabled={idx === 0}
            className="flex-1 h-10 rounded-xl border text-[13px] disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
          >
            ← Trước
          </button>
          <button
            onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false) }}
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

function SaveQuizModal({
  doc,
  questions,
  folders,
  loading,
  onClose,
  onSubmit,
}: {
  doc: Document
  questions: QuizQuestion[]
  folders: QuizFolder[]
  loading: boolean
  onClose: () => void
  onSubmit: (payload: { title: string; folderId?: string }) => void
}) {
  const [title,    setTitle]    = useState(`Quiz - ${doc.name}`)
  const [folderId, setFolderId] = useState('')

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-3xl border p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>Lưu để luyện lại sau</div>
            <div className="text-[16px] font-semibold truncate" style={{ color: 'var(--text)' }}>{doc.name}</div>
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
            <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>Tên bộ quiz</p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full h-11 rounded-xl px-4 outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Nhập tên bộ quiz"
            />
          </div>
          <div>
            <p className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>Folder</p>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full h-11 rounded-xl px-4 outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <option value="">Không chọn folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div
            className="rounded-2xl border p-4 text-[13px]"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle size={14} className="text-indigo-400" />
              <span>Số câu sẽ lưu: <strong style={{ color: 'var(--text)' }}>{questions.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Folder size={14} style={{ color: 'var(--text3)' }} />
              <span>Ôn lại tại mục Quiz trên menu</span>
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
            {loading ? 'Đang lưu...' : 'Lưu bộ quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// QUIZ MODAL
// ─────────────────────────────────────────

function QuizModal({
  questions,
  onClose,
  onSave,
}: {
  questions: QuizQuestion[]
  onClose: () => void
  onSave?: () => void
}) {
  const [idx,      setIdx]      = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score,    setScore]    = useState(0)
  const [done,     setDone]     = useState(false)
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
              {score === questions.length
                ? 'Xuất sắc! Bạn trả lời đúng tất cả!'
                : `Bạn trả lời đúng ${score} câu`}
            </p>
            <div className="flex flex-col gap-2 mt-5">
              {onSave && (
                <button
                  onClick={onSave}
                  className="w-full h-10 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <Save size={14} />
                  Lưu để luyện lại
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full px-5 h-10 rounded-xl text-[13px] font-medium"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                Đóng
              </button>
            </div>
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
                    borderColor: selected === null ? 'var(--border)' : i === q.correctIndex ? '#22c55e' : selected === i ? '#ef4444' : 'var(--border)',
                    background:  selected === null ? 'var(--bg3)'    : i === q.correctIndex ? 'rgba(34,197,94,.10)' : selected === i ? 'rgba(239,68,68,.10)' : 'var(--bg3)',
                    color:       selected === null ? 'var(--text)'   : i === q.correctIndex ? '#22c55e' : selected === i ? '#ef4444' : 'var(--text3)',
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
            {onSave && (
              <button
                onClick={onSave}
                className="w-full h-10 rounded-xl text-[13px] font-medium mt-3 flex items-center justify-center gap-2"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                <Save size={14} />
                Lưu bộ quiz
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// CHAT DOC MODAL
// ─────────────────────────────────────────

function ChatDocModal({
  doc,
  messages,
  input,
  loading,
  onChangeInput,
  onSend,
  onClose,
  onSaveStructured,
}: {
  doc: Document
  messages: DocChatMessage[]
  input: string
  loading: boolean
  onChangeInput: (v: string) => void
  onSend: () => void
  onClose: () => void
  onSaveStructured: (msg: DocChatMessage) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border p-5 max-h-[88vh] flex flex-col"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-3 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>Hỏi đáp AI · đa lượt</p>
            <p className="text-[15px] font-medium truncate" style={{ color: 'var(--text)' }}>{doc.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
          {DOC_CHAT_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => onChangeInput(p.text)}
              className="px-2.5 py-1 rounded-lg text-[11px] border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-[120px]">
          {messages.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
              Hỏi về nội dung, phân tích KT, hoặc yêu cầu tạo quiz/flashcard từ tài liệu.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              {m.agent && m.role === 'assistant' && (
                <span className="text-[10px] mr-2" style={{ color: '#818cf8' }}>{m.agent}</span>
              )}
              <div
                className="inline-block max-w-[92%] text-left rounded-2xl px-3 py-2 text-[13px] leading-6 whitespace-pre-wrap"
                style={{
                  background: m.role === 'user' ? 'rgba(99,102,241,0.15)' : 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                {m.text}
              </div>
              {m.structured && !m.autoSaved && (
                <button
                  onClick={() => onSaveStructured(m)}
                  className="block mt-1.5 text-[11px] px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                >
                  💾 Lưu {m.structured.type === 'quiz' ? 'quiz' : 'flashcard'}
                </button>
              )}
              {m.structured?.type === 'quiz' && m.autoSaved && (
                <button
                  onClick={() => { window.location.href = '/quiz' }}
                  className="block mt-1.5 text-[11px] px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}
                >
                  ✓ Đã lưu · Mở Quiz
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-[12px] flex items-center gap-2" style={{ color: 'var(--text3)' }}>
              <Loader2 size={13} className="animate-spin" /> AI đang trả lời...
            </div>
          )}
        </div>

        <textarea
          value={input}
          onChange={e => onChangeInput(e.target.value)}
          placeholder="Nhập câu hỏi..."
          className="w-full min-h-[72px] px-4 py-3 rounded-2xl outline-none text-[14px] resize-none flex-shrink-0"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend()
          }}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="w-full h-10 rounded-xl text-[13px] font-medium disabled:opacity-60 flex items-center justify-center gap-2 mt-2 flex-shrink-0"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          Gửi (Ctrl+Enter)
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// DOC CARD
// ─────────────────────────────────────────

function DocCard({
  doc,
  onAction,
  onDelete,
  onEditLabel,
}: {
  doc: Document
  onAction: (type: string, doc: Document) => void
  onDelete: (doc: Document) => void
  onEditLabel: (doc: Document) => void
}) {
  const icon        = DOC_ICON[doc.type] ?? DOC_ICON.OTHER
  const uploader    = doc.uploaderName?.split(' ').pop() || 'Unknown'
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
          {doc.topicLabel ? (
            <button
              type="button"
              onClick={() => onEditLabel(doc)}
              className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border ml-0 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(34,197,94,.1)', borderColor: 'rgba(34,197,94,.25)', color: '#22c55e' }}
              title="Nhấn để sửa nhãn"
            >
              {doc.topicLabel}
              <Pencil size={10} />
            </button>
          ) : (
            <button
              onClick={() => onEditLabel(doc)}
              className="mt-1.5 block text-[10px] underline"
              style={{ color: '#f59e0b' }}
            >
              + Gắn nhãn trước khi dùng AI
            </button>
          )}
        </div>
        <button
          onClick={() => onDelete(doc)}
          className="p-1 rounded-lg transition-colors"
          style={{ color: '#ef4444' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Open / Download */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <a
          href={resolveDocViewUrl(doc)}
          target="_blank"
          rel="noreferrer"
          className="h-9 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-medium"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          <Eye size={13} />
          Mở file
        </a>
        <a
          href={resolveDocDownloadUrl(doc)}
          target="_blank"
          rel="noreferrer"
          download
          className="h-9 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-medium"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          <Download size={13} />
          Tải xuống
        </a>
      </div>

      {/* AI Actions */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { type: 'chat',      icon: MessageSquare, label: 'Hỏi đáp AI' },
          { type: 'flashcard', icon: Layers,        label: 'Flashcard'  },
          { type: 'quiz',      icon: HelpCircle,    label: 'Tạo Quiz'   },
          { type: 'summarize', icon: AlignLeft,     label: 'Tóm tắt'    },
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

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function DocsPage() {
  const { groupId = '' } = useParams<{ groupId: string }>()
  const qc        = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploadPct, setUploadPct] = useState<number | null>(null)

  // AI result state
  const [flashcards,        setFlashcards]        = useState<Flashcard[] | null>(null)
  const [flashcardDoc,      setFlashcardDoc]      = useState<Document | null>(null)
  const [showSaveFlashcard, setShowSaveFlashcard] = useState(false)
  const [quiz,              setQuiz]              = useState<QuizQuestion[] | null>(null)
  const [quizDoc,           setQuizDoc]           = useState<Document | null>(null)
  const [showSaveQuiz,      setShowSaveQuiz]      = useState(false)
  const [summaryDocName,    setSummaryDocName]    = useState('')
  const [summaryText,       setSummaryText]       = useState('')
  const [summarySourceDoc, setSummarySourceDoc]   = useState<Document | null>(null)
  const [summaryStyle,     setSummaryStyle]      = useState('bullet')
  const [summaryLength,    setSummaryLength]     = useState('medium')
  const [summaryBlogMeta,  setSummaryBlogMeta]   = useState<{ titles: string[]; appendix: string }>({ titles: [], appendix: '' })
  const [aiLoading,         setAiLoading]         = useState<string | null>(null)

  // Chat state
  const [chatDoc,       setChatDoc]       = useState<Document | null>(null)
  const [chatInput,     setChatInput]     = useState('')
  const [chatMessages,  setChatMessages]  = useState<DocChatMessage[]>([])
  const [chatSessionId, setChatSessionId] = useState<string | undefined>()

  // Filter state
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<typeof DOC_TYPES[number]>('ALL')
  const [sourceFilter, setSourceFilter] = useState<typeof SOURCE_TABS[number]>('ALL')

  // AI Options modal state
  const [aiOptionsDoc,  setAiOptionsDoc]  = useState<Document | null>(null)
  const [aiOptionsType, setAiOptionsType] = useState<'flashcard' | 'quiz' | 'summarize' | null>(null)
  const [labelModalDoc, setLabelModalDoc] = useState<Document | null>(null)
  const [pendingAction, setPendingAction] = useState<{ type: string; doc: Document } | null>(null)

  // ── Queries ─────────────────────────────────────────────────
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['docs', groupId],
    queryFn:  () => documentApi.list(groupId),
    enabled:  !!groupId,
  })

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn:  () => groupApi.get(groupId),
    enabled:  !!groupId,
  })

  const groupSubject = group?.subject || undefined

  const { data: folders = [] } = useQuery({
    queryKey: ['flashcard-folders'],
    queryFn:  () => flashcardApi.listFolders(),
  })

  const { data: quizFolders = [] } = useQuery({
    queryKey: ['quiz-folders'],
    queryFn:  () => quizApi.listFolders(),
  })

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(doc => {
      const okType   = typeFilter   === 'ALL' ? true : doc.type === typeFilter
      const okSource = sourceFilter === 'ALL' ? true : (doc.sourceType || 'PAGE') === sourceFilter
      const okSearch = !q || doc.name?.toLowerCase().includes(q) || doc.uploaderName?.toLowerCase().includes(q)
      return okType && okSource && okSearch
    })
  }, [docs, search, typeFilter, sourceFilter])

  // ── Mutations ────────────────────────────────────────────────
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể xoá tài liệu'),
  })

  const saveFlashcardMut = useMutation({
    mutationFn: (payload: {
      docId: string
      title: string
      folderId?: string
      cards: { question: string; answer: string }[]
    }) => flashcardApi.saveFromDocument(payload),
    onSuccess: () => {
      toast.success('Đã lưu sang Flashcard')
      qc.invalidateQueries({ queryKey: ['flashcard-decks'] })
      setShowSaveFlashcard(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể lưu flashcard'),
  })

  const saveQuizMut = useMutation({
    mutationFn: (payload: {
      docId: string
      title: string
      folderId?: string
      questions: {
        question: string
        options: string[]
        correctIndex: number
        explanation: string
      }[]
    }) => quizApi.saveFromDocument(payload),
    onSuccess: () => {
      toast.success('Đã lưu bộ quiz — mở mục Quiz để luyện lại')
      qc.invalidateQueries({ queryKey: ['quiz-sets'] })
      setShowSaveQuiz(false)
      setQuiz(null)
      setQuizDoc(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể lưu quiz'),
  })

  const labelMut = useMutation({
    mutationFn: ({ docId, topicLabel }: { docId: string; topicLabel: string }) =>
      documentApi.updateLabel(groupId, docId, topicLabel),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['docs', groupId] })
      toast.success(updated.topicLabel ? 'Đã cập nhật nhãn tài liệu' : 'Đã gắn nhãn tài liệu')
      setLabelModalDoc(null)
      if (pendingAction) {
        const { type, doc } = pendingAction
        setPendingAction(null)
        runAction(type, { ...doc, topicLabel: updated.topicLabel })
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể lưu nhãn'),
  })

  const ensureGroupSubject = () => {
    if (groupSubject?.trim()) return true
    toast.error('Nhóm chưa gắn nhãn môn học. Cập nhật trong cài đặt nhóm trước.')
    return false
  }

  const runAction = (type: string, doc: Document) => {
    if (type === 'chat') {
      setChatDoc(doc)
      setChatInput('')
      setChatMessages([])
      setChatSessionId(undefined)
      return
    }
    setAiOptionsDoc(doc)
    setAiOptionsType(type as 'flashcard' | 'quiz' | 'summarize')
  }

  const requireDocLabel = (type: string, doc: Document) => {
    if (!ensureGroupSubject()) return
    if (doc.topicLabel?.trim()) {
      runAction(type, doc)
      return
    }
    setPendingAction({ type, doc })
    setLabelModalDoc(doc)
  }

  // ── Handlers ─────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('File tối đa 50MB'); return }
    uploadMut.mutate(file)
    e.target.value = ''
  }

  const handleAction = (type: string, doc: Document) => {
    requireDocLabel(type, doc)
  }

  const handleEditLabel = (doc: Document) => {
    if (!ensureGroupSubject()) return
    setPendingAction(null)
    setLabelModalDoc(doc)
  }

  const handleAiSubmit = async (opts: Record<string, string | number>) => {
    if (!aiOptionsDoc || !aiOptionsType) return
    const doc = aiOptionsDoc
    const docTopic = doc.topicLabel?.trim()
    if (!docTopic) {
      toast.error('Tài liệu chưa có nhãn chủ đề')
      return
    }

    setAiLoading(`${aiOptionsType}-${doc.id}`)
    try {
      if (aiOptionsType === 'summarize') {
        let blogCtx = ''
        let blogMeta = { titles: [] as string[], appendix: '', text: '' }
        if (Number(opts.include_blogs)) {
          const tag = String(opts.blog_tag || doc.name.split('.')[0] || '')
          blogMeta = await fetchBlogContext(tag)
          blogCtx = blogMeta.text
        }
        const summary = await backendSummary(
          doc, String(opts.style), String(opts.length), groupSubject, docTopic, blogCtx || undefined,
        )
        setSummaryDocName(doc.name)
        setSummaryText(summary)
        setSummarySourceDoc(doc)
        setSummaryStyle(String(opts.style))
        setSummaryLength(String(opts.length))
        setSummaryBlogMeta({ titles: blogMeta.titles, appendix: blogCtx })
        setAiOptionsDoc(null)
        setAiOptionsType(null)

      } else if (aiOptionsType === 'flashcard') {
        const cards = await backendFlashcard(
          doc, String(opts.card_type), Number(opts.num_cards), groupSubject, docTopic,
        )
        setFlashcards(cards)
        setFlashcardDoc(doc)
        setAiOptionsDoc(null)
        setAiOptionsType(null)

      } else if (aiOptionsType === 'quiz') {
        const questions = await backendQuiz(
          doc, String(opts.bloom_level), Number(opts.num_questions), groupSubject, docTopic,
        )
        setQuiz(questions)
        setQuizDoc(doc)
        setAiOptionsDoc(null)
        setAiOptionsType(null)
      }
    } catch (e: unknown) {
      toast.error(parseApiError(e))
    } finally {
      setAiLoading(null)
    }
  }

  const sendChatQuestion = async () => {
    if (!chatDoc || !chatInput.trim()) return
    const docTopic = chatDoc.topicLabel?.trim()
    if (!docTopic) {
      toast.error('Gắn nhãn tài liệu trước khi hỏi AI')
      setLabelModalDoc(chatDoc)
      setPendingAction({ type: 'chat', doc: chatDoc })
      return
    }
    const question = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: question }])
    setAiLoading('chat')
    try {
      const data = await backendChat(chatDoc, question, groupSubject, docTopic, chatSessionId)
      if (data.session_id) setChatSessionId(data.session_id)
      let autoSaved = false
      if (data.structured) {
        try {
          autoSaved = await saveChatStructured({
            role: 'assistant',
            text: data.response,
            agent: data.agent,
            structured: data.structured,
          })
        } catch {
          autoSaved = false
        }
      }
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: data.response,
        agent: data.agent,
        structured: data.structured,
        autoSaved,
      }])
    } catch (e: unknown) {
      toast.error(parseApiError(e))
    } finally {
      setAiLoading(null)
    }
  }

  const saveChatStructured = async (msg: DocChatMessage): Promise<boolean> => {
    if (!chatDoc || !msg.structured) return false
    if (msg.structured.type === 'quiz') {
      const questions = msg.structured.items.map((item: Record<string, unknown>) => ({
        question: String(item.question ?? ''),
        options: (item.options as string[]) ?? [],
        correctIndex: Number(item.correct_index ?? item.correctIndex ?? 0),
        explanation: String(item.explanation ?? ''),
      }))
      await saveQuizMut.mutateAsync({
        docId: chatDoc.id,
        title: `Quiz chat - ${chatDoc.name}`,
        questions,
      })
    } else if (msg.structured.type === 'flashcard') {
      const cards = msg.structured.items.map((item: Record<string, unknown>) => ({
        question: String(item.front ?? item.question ?? ''),
        answer: String(item.back ?? item.answer ?? ''),
      }))
      await saveFlashcardMut.mutateAsync({
        docId: chatDoc.id,
        title: `Flashcard chat - ${chatDoc.name}`,
        cards,
      })
    }
    return true
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="page-enter max-w-6xl">
      {/* ── Header / Filters ── */}
      <div
        className="rounded-3xl border p-5 mb-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-[18px] font-semibold tracking-tight flex items-center gap-2"
              style={{ color: 'var(--text)' }}
            >
              <Files size={18} className="text-indigo-400" />
              Tài liệu nhóm
            </h1>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              Upload tài liệu — gắn nhãn chủ đề trước khi dùng AI
            </p>
            {groupSubject ? (
              <span
                className="inline-block mt-2 px-2.5 py-1 rounded-lg text-[11px] border"
                style={{ background: 'rgba(99,102,241,.1)', borderColor: 'rgba(99,102,241,.25)', color: '#818cf8' }}
              >
                Môn nhóm: {groupSubject}
              </span>
            ) : (
              <span className="inline-block mt-2 text-[11px]" style={{ color: '#f59e0b' }}>
                Nhóm chưa gắn môn học — cập nhật trong cài đặt nhóm
              </span>
            )}
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.csv,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploadMut.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-60"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              {uploadMut.isPending ? (
                <><Loader2 size={14} className="animate-spin" />{uploadPct ?? 0}%</>
              ) : (
                <><Upload size={14} />Upload tài liệu</>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
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

          {/* Type filter */}
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
                  background:   typeFilter === type ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                  borderColor:  typeFilter === type ? 'rgba(99,102,241,.25)' : 'var(--border)',
                  color:        typeFilter === type ? '#818cf8'              : 'var(--text2)',
                }}
              >
                {type === 'ALL' ? 'Tất cả' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Source filter */}
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
                background:  sourceFilter === tab ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                borderColor: sourceFilter === tab ? 'rgba(99,102,241,.25)' : 'var(--border)',
                color:       sourceFilter === tab ? '#818cf8'              : 'var(--text2)',
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

      {/* ── Doc Grid ── */}
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
                onEditLabel={handleEditLabel}
                onDelete={docItem => {
                  if (window.confirm(`Xoá tài liệu "${docItem.name}"?`)) deleteMut.mutate(docItem)
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Doc Label Modal ── */}
      {labelModalDoc && (
        <DocLabelModal
          doc={labelModalDoc}
          groupSubject={groupSubject}
          isEdit={!!labelModalDoc.topicLabel?.trim() && !pendingAction}
          loading={labelMut.isPending}
          onClose={() => { setLabelModalDoc(null); setPendingAction(null) }}
          onSave={(topicLabel) => labelMut.mutate({ docId: labelModalDoc.id, topicLabel })}
        />
      )}

      {/* ── AI Options Modal ── */}
      {aiOptionsDoc && aiOptionsType && (
        <AiOptionsModal
          type={aiOptionsType}
          doc={aiOptionsDoc}
          loading={!!aiLoading}
          onClose={() => { setAiOptionsDoc(null); setAiOptionsType(null) }}
          onSubmit={handleAiSubmit}
        />
      )}

      {/* ── Chat Modal ── */}
      {chatDoc && (
        <ChatDocModal
          doc={chatDoc}
          messages={chatMessages}
          input={chatInput}
          loading={aiLoading === 'chat'}
          onChangeInput={setChatInput}
          onSend={sendChatQuestion}
          onClose={() => { setChatDoc(null); setChatMessages([]); setChatInput('') }}
          onSaveStructured={saveChatStructured}
        />
      )}

      {/* ── Summary Modal ── */}
      {summaryText && (
        <SummaryModal
          docName={summaryDocName}
          summary={summaryText}
          saving={false}
          onSave={summarySourceDoc ? () => {
            addNote({
              title: `Tóm tắt - ${summarySourceDoc.name}`,
              content: summaryText,
            })
            toast.success('Đã lưu bản tóm tắt vào Ghi chú')
          } : undefined}
          onClose={() => {
            setSummaryDocName('')
            setSummaryText('')
            setSummarySourceDoc(null)
          }}
        />
      )}

      {/* ── Flashcard Modal ── */}
      {flashcards && (
        <FlashcardModal
          cards={flashcards}
          onClose={() => { setFlashcards(null); setFlashcardDoc(null) }}
          onSave={flashcardDoc ? () => setShowSaveFlashcard(true) : undefined}
        />
      )}

      {/* ── Save Flashcard Modal ── */}
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
              cards: flashcards.map(card => ({ question: card.question, answer: card.answer })),
            })
          }
        />
      )}

      {/* ── Quiz Modal ── */}
      {quiz && (
        <QuizModal
          questions={quiz}
          onClose={() => { setQuiz(null); setQuizDoc(null) }}
          onSave={quizDoc ? () => setShowSaveQuiz(true) : undefined}
        />
      )}

      {showSaveQuiz && quiz && quizDoc && (
        <SaveQuizModal
          doc={quizDoc}
          questions={quiz}
          folders={quizFolders}
          loading={saveQuizMut.isPending}
          onClose={() => setShowSaveQuiz(false)}
          onSubmit={({ title, folderId }) =>
            saveQuizMut.mutate({
              docId: quizDoc.id,
              title,
              folderId,
              questions: quiz.map(q => ({
                question: q.question,
                options: q.options,
                correctIndex: q.correctIndex ?? (q as { correct_index?: number }).correct_index ?? 0,
                explanation: q.explanation ?? '',
              })),
            })
          }
        />
      )}
    </div>
  )
}
