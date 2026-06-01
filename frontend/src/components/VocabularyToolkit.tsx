import { useRef, useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Upload, Download, Layers, HelpCircle, Save, ClipboardPaste, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { vocabularyApi, vocabularySetApi, flashcardApi } from '@/api/services'
import type { VocabularyItem, FlashcardDeck } from '@/types'
import {
  parseVocabularyPaste,
  vocabularyToFlashcards,
  vocabularyToQuiz,
  PASTE_FORMAT_HINT,
} from '@/utils/vocabularyPaste'

type Props = {
  onClose: () => void
  /** Học thẻ ngay (giống bấm Quiz — không cần lưu trước) */
  onStudyNow?: (deck: FlashcardDeck) => void
  onQuiz?: (questions: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }[]) => void
  initialPaste?: string
  defaultTitle?: string
}

export default function VocabularyToolkit({
  onClose,
  onStudyNow,
  onQuiz,
  initialPaste = '',
  defaultTitle = 'Bộ từ vựng đã dán',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasteText, setPasteText] = useState(initialPaste)
  const [title, setTitle] = useState(defaultTitle)
  const [showTable, setShowTable] = useState(false)

  const parsed = useMemo(() => parseVocabularyPaste(pasteText), [pasteText])
  const validCount = parsed.length

  const importMut = useMutation({
    mutationFn: (file: File) => vocabularyApi.importFile(file),
    onSuccess: data => {
      const list = data.vocabulary?.vocabulary ?? []
      if (!list.length) {
        toast.error('File không có từ vựng')
        return
      }
      setPasteText(rowsToPasteText(list))
      toast.success(`Đã đọc ${list.length} từ từ file`)
    },
    onError: (e: Error) => toast.error(e.message || 'Import thất bại'),
  })

  const saveDeckMut = useMutation({
    mutationFn: async () => {
      const cards = vocabularyToFlashcards(parsed)
      return flashcardApi.createPersonalDeck({
        title: title.trim() || defaultTitle,
        cards: cards.map(c => ({ question: c.question, answer: c.answer })),
      })
    },
    onSuccess: () => {
      toast.success('Đã lưu bộ flashcard')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể lưu'),
  })

  const saveVocabMut = useMutation({
    mutationFn: () =>
      vocabularySetApi.save({
        title: title.trim() || defaultTitle,
        sourceType: 'IMPORT',
        entries: parsed,
      }),
    onSuccess: () => toast.success('Đã lưu danh sách từ vựng'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Không thể lưu'),
  })

  const handleStudyNow = () => {
    if (validCount < 1) {
      toast.error('Dán ít nhất 1 dòng từ vựng (Tab: từ → nghĩa → ví dụ → phát âm)')
      return
    }
    const cards = vocabularyToFlashcards(parsed)
    const deck: FlashcardDeck = {
      id: `paste-${Date.now()}`,
      title: title.trim() || defaultTitle,
      createdById: '',
      aiGenerated: false,
      sourceType: 'PERSONAL',
      cards: cards.map((c, i) => ({
        id: String(i),
        question: c.question,
        answer: c.answer,
      })),
    }
    onStudyNow?.(deck)
    toast.success(`${validCount} thẻ — bắt đầu học`)
  }

  const handleQuiz = () => {
    if (validCount < 2) {
      toast.error('Cần ít nhất 2 từ để làm quiz')
      return
    }
    const questions = vocabularyToQuiz(parsed)
    onQuiz?.(questions)
    toast.success(`${questions.length} câu quiz từ từ vựng đã dán`)
  }

  const downloadJson = () => {
    const blob = new Blob(
      [JSON.stringify({ vocabulary: parsed }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'tu_vung').replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/65 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[28px] border p-5 max-h-[92vh] flex flex-col"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3 flex-shrink-0">
          <div>
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Dán từ Excel → tạo thẻ ngay (như Quiz)
            </p>
            <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
              Từ vựng: dán & học
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Tên bộ thẻ (tuỳ chọn)"
          className="w-full h-10 rounded-xl px-3 mb-2 text-[13px] outline-none flex-shrink-0"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />

        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder={PASTE_FORMAT_HINT}
          className="flex-1 min-h-[200px] w-full rounded-2xl px-4 py-3 text-[13px] leading-6 outline-none resize-none font-mono"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />

        <p className="text-[12px] mt-2 mb-3 flex-shrink-0" style={{ color: validCount > 0 ? '#10b981' : 'var(--text3)' }}>
          {validCount > 0
            ? `✓ Nhận ${validCount} từ — sẵn sàng tạo thẻ / quiz`
            : 'Chưa nhận từ nào — copy từ Excel (cột Tab) rồi dán vào ô trên'}
        </p>

        <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".xlsx,.csv,.txt,.docx,.json"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) importMut.mutate(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importMut.isPending}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <Upload size={14} />
            File Excel
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const t = await navigator.clipboard.readText()
                setPasteText(t)
                toast.success('Đã dán từ clipboard')
              } catch {
                toast.error('Không đọc được clipboard')
              }
            }}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <ClipboardPaste size={14} />
            Dán
          </button>
          {validCount > 0 && (
            <>
              <button
                type="button"
                onClick={downloadJson}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                <Download size={14} />
                JSON
              </button>
              <button
                type="button"
                onClick={() => setShowTable(s => !s)}
                className="px-3 h-9 rounded-xl text-[12px] border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                {showTable ? 'Ẩn bảng' : 'Xem bảng'}
              </button>
            </>
          )}
        </div>

        {showTable && validCount > 0 && (
          <div
            className="max-h-[140px] overflow-auto rounded-xl border mb-3 text-[11px] flex-shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                  <th className="p-2 text-left">Từ</th>
                  <th className="p-2 text-left">Nghĩa</th>
                  <th className="p-2 text-left">Ví dụ</th>
                  <th className="p-2 text-left">Phát âm</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 50).map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-2" style={{ color: 'var(--text)' }}>{row.tu_vung}</td>
                    <td className="p-2" style={{ color: 'var(--text)' }}>{row.nghia}</td>
                    <td className="p-2" style={{ color: 'var(--text2)' }}>{row.vi_du || '—'}</td>
                    <td className="p-2" style={{ color: 'var(--text2)' }}>{row.phat_am || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 50 && (
              <p className="p-2 text-center text-[11px]" style={{ color: 'var(--text3)' }}>
                +{parsed.length - 50} từ nữa...
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleStudyNow}
            disabled={validCount < 1}
            className="h-12 rounded-2xl text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <Play size={16} />
            Học thẻ ngay ({validCount || 0})
          </button>
          <button
            type="button"
            onClick={handleQuiz}
            disabled={validCount < 2}
            className="h-12 rounded-2xl text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <HelpCircle size={16} />
            Làm quiz ({validCount >= 2 ? validCount : 0} câu)
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => saveDeckMut.mutate()}
            disabled={saveDeckMut.isPending || validCount < 1}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] border disabled:opacity-50"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <Layers size={14} />
            {saveDeckMut.isPending ? '...' : 'Lưu bộ flashcard'}
          </button>
          <button
            type="button"
            onClick={() => saveVocabMut.mutate()}
            disabled={saveVocabMut.isPending || validCount < 1}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] border disabled:opacity-50"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <Save size={14} />
            Lưu danh sách từ
          </button>
        </div>
      </div>
    </div>
  )
}

function rowsToPasteText(items: VocabularyItem[]): string {
  const header = 'tu_vung\tnghia\tvi_du\tphat_am'
  const rows = items.map(
    i => `${i.tu_vung}\t${i.nghia}\t${i.vi_du || ''}\t${i.phat_am || ''}`,
  )
  return [header, ...rows].join('\n')
}
