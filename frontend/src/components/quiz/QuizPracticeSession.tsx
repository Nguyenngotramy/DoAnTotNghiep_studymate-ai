import { useState } from 'react'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, Trophy, Target, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { QuizSet, QuizQuestion } from '@/types'

const LABELS = ['A', 'B', 'C', 'D']

interface QuizPracticeSessionProps {
  quizSet: QuizSet
  sessionQuestions: QuizQuestion[]
  practiceMode: 'ALL' | 'WEAK'
  onExit: () => void
  onRestart: (mode: 'ALL' | 'WEAK') => void
  onRecordAttempt: (quizId: string, questionId: string, correct: boolean) => void
  onSessionComplete: (count: number) => void
}

export default function QuizPracticeSession({
  quizSet,
  sessionQuestions,
  practiceMode,
  onExit,
  onRestart,
  onRecordAttempt,
  onSessionComplete,
}: QuizPracticeSessionProps) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = sessionQuestions[idx]
  const total = sessionQuestions.length
  const pct = Math.round((score / total) * 100)

  const choose = (optIdx: number) => {
    if (answered) return
    const correct = optIdx === q.correctIndex
    setSelected(optIdx)
    setAnswered(true)
    if (correct) setScore(s => s + 1)
    else toast('Đã lưu vào danh sách câu yếu')

    if (q.id) {
      onRecordAttempt(quizSet.id, q.id, correct)
    }

    if (idx + 1 >= sessionQuestions.length) {
      window.setTimeout(() => {
        setDone(true)
        if (sessionQuestions.length >= 3) onSessionComplete(sessionQuestions.length)
      }, 900)
    }
  }

  const next = () => {
    if (idx + 1 >= sessionQuestions.length) {
      setDone(true)
      if (sessionQuestions.length >= 3) {
        onSessionComplete(sessionQuestions.length)
      }
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

  if (done) {
    return (
      <div className="max-w-3xl mx-auto pb-4">
        <div
          className="rounded-[24px] border p-4 text-center sm:rounded-[30px] sm:p-8"
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
            {quizSet.title}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

          <div className="mt-6 text-left">
            <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Tổng kết từng câu</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {sessionQuestions.map((sq, i) => {
                return (
                  <div key={i} className="rounded-xl p-3 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-bold mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }}>#{i+1}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>{sq.question}</p>
                        <p className="text-[11px] mt-1" style={{ color: '#22c55e' }}>Đáp án: {sq.options?.[sq.correctIndex]}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => {
                restart()
                onRestart(practiceMode)
              }}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#6366f1' }}
            >
              <RotateCcw size={14} />
              Làm lại
            </button>
            <button
              onClick={() => {
                restart()
                onRestart('WEAK')
              }}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#f97316' }}
            >
              <Target size={14} />
              Luyện câu yếu
            </button>
            <button
              onClick={onExit}
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
              onClick={onExit}
              className="flex items-center gap-1.5 text-[12px] transition-colors mb-2"
              style={{ color: 'var(--text3)' }}
            >
              <ArrowLeft size={14} />
              Quay lại danh sách
            </button>

            <h2 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              {quizSet.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {practiceMode === 'WEAK' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] border text-orange-400" style={{ borderColor: 'rgba(249,115,22,.3)' }}>
                  Luyện câu yếu
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
            width: `${((idx + 1) / total) * 100}%`,
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
          {q.options?.map((opt, i) => {
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

      {answered && idx + 1 < total && (
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
