import { useState, useMemo } from 'react'
import { ArrowLeft, RotateCcw, Check, X, Keyboard } from 'lucide-react'
import toast from 'react-hot-toast'
import type { VocabularySet } from '@/types'

interface Props {
  vocabularySet: VocabularySet
  onExit: () => void
}

export default function VocabularyPracticeSession({ vocabularySet, onExit }: Props) {
  const [idx, setIdx] = useState(0)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)

  const entries = vocabularySet.entries || []
  const currentEntry = entries[idx]

  const correctAnswer = currentEntry?.nghia || ''
  const question = currentEntry?.tuVung || ''

  const isCorrect = useMemo(() => {
    if (!checked || !typedAnswer.trim()) return false
    return typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase()
  }, [checked, typedAnswer, correctAnswer])

  const handleCheck = () => {
    if (!typedAnswer.trim()) {
      toast.error('Vui lòng nhập đáp án')
      return
    }
    setChecked(true)
    setTotal(t => t + 1)
    if (isCorrect) {
      setCorrect(c => c + 1)
    }
  }

  const handleNext = () => {
    if (idx + 1 >= entries.length) {
      toast.success(`Hoàn thành! Đúng ${correct}/${total}`)
      onExit()
      return
    }
    setIdx(i => i + 1)
    setTypedAnswer('')
    setChecked(false)
  }

  const handleRetry = () => {
    setTypedAnswer('')
    setChecked(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (checked) {
        handleNext()
      } else {
        handleCheck()
      }
    }
  }

  if (!currentEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[15px]" style={{ color: 'var(--text2)' }}>
            Không có từ vựng để luyện tập
          </p>
          <button
            onClick={onExit}
            className="mt-4 px-6 py-3 rounded-xl text-[13px] font-medium"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-2 rounded-xl border"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Phương pháp: Anki Spaced Repetition
            </span>
          </div>
          <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
            {idx + 1}/{entries.length}
          </div>
        </div>

        <div className="rounded-2xl border p-8 space-y-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="text-center space-y-4">
            <div className="px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-[0.18em] inline-block" style={{ color: '#818cf8', background: 'rgba(99,102,241,.1)' }}>
              TỪ VỰNG
            </div>
            <h2 className="text-[28px] font-bold" style={{ color: 'var(--text)' }}>
              {question}
            </h2>
            {currentEntry.phatAm && (
              <p className="text-[14px]" style={{ color: 'var(--text3)' }}>
                /{currentEntry.phatAm}/
              </p>
            )}
          </div>

          <div className="space-y-3">
            <input
              value={typedAnswer}
              onChange={e => setTypedAnswer(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập nghĩa của từ..."
              disabled={checked}
              className="w-full h-14 rounded-xl px-4 text-[16px] outline-none"
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />

            {!checked ? (
              <button
                onClick={handleCheck}
                className="w-full h-12 rounded-xl text-[15px] font-medium text-white flex items-center justify-center gap-2"
                style={{ background: '#6366f1' }}
              >
                <Keyboard size={18} />
                Kiểm tra
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isCorrect ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)' }}>
                  {isCorrect ? (
                    <Check size={20} style={{ color: '#22c55e' }} />
                  ) : (
                    <X size={20} style={{ color: '#ef4444' }} />
                  )}
                  <span className="text-[14px]" style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>
                    {isCorrect ? 'Chính xác!' : `Đáp án đúng: ${correctAnswer}`}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex-1 h-12 rounded-xl text-[15px] font-medium border flex items-center justify-center gap-2"
                    style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
                  >
                    <RotateCcw size={18} />
                    Thử lại
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 h-12 rounded-xl text-[15px] font-medium text-white flex items-center justify-center gap-2"
                    style={{ background: '#6366f1' }}
                  >
                    Tiếp theo
                    <ArrowLeft size={18} className="rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentEntry.viDu && (
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <p className="text-[12px] mb-1" style={{ color: 'var(--text3)' }}>
                Ví dụ:
              </p>
              <p className="text-[14px]" style={{ color: 'var(--text2)' }}>
                {currentEntry.viDu}
              </p>
            </div>
          )}
        </div>

        <div className="text-center text-[12px]" style={{ color: 'var(--text3)' }}>
          Đúng: {correct}/{total}
        </div>
      </div>
    </div>
  )
}
