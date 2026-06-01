import { useState } from 'react'
import { X } from 'lucide-react'
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
            Tạo folder quiz
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

interface CreateQuizModalProps {
  folders: QuizFolder[]
  onClose: () => void
  onSubmit: (body: QuizFormBody) => void
  loading: boolean
  initialData?: QuizSet | null
  submitLabel?: string
}

export function CreateQuizModal({
  folders,
  onClose,
  onSubmit,
  loading,
  initialData,
  submitLabel,
}: CreateQuizModalProps) {
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
            <X size={16} />
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
