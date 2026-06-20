import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  ChevronLeft,
  Folder,
  Keyboard,
  Layers,
  RotateCcw,
  Target,
  CalendarClock,
  Check,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { flashcardApi, notificationApi } from '@/api/services'
import { useNotifStore } from '@/store/notifStore'
import type {
  Flashcard,
  FlashcardDeck,
  FlashcardFolder,
  FlashcardRating,
  FlashcardStudySummary,
} from '@/types'
import {
  cardSides,
  loadStudyPrefs,
  saveStudyActivity,
  saveStudyFace,
  spellingMatches,
  type StudyActivity,
  type StudyFace,
} from '@/utils/flashcardStudy'

type StudyMode = 'DUE' | 'ALL'

function FlipCard({
  prompt,
  hidden,
  promptLabel,
  hiddenLabel,
  flipped,
  onFlip,
}: {
  prompt: string
  hidden: string
  promptLabel: string
  hiddenLabel: string
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <div className="w-full flex justify-center">
      <button
        type="button"
        onClick={onFlip}
        className="w-full max-w-xl cursor-pointer select-none"
        style={{ perspective: 1200 }}
      >
        <div
          className="relative w-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: 300,
          }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[28px] border text-center"
            style={{
              backfaceVisibility: 'hidden',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 94%, #6366f1 6%), var(--bg2))',
              borderColor: 'color-mix(in srgb, var(--border) 82%, #6366f1 18%)',
            }}
          >
            <span
              className="mb-4 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide"
              style={{
                background: 'rgba(99,102,241,.10)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,.18)',
              }}
            >
              {promptLabel}
            </span>
            <p
              className="font-semibold leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text)', fontSize: 'clamp(18px, 2.5vw, 26px)' }}
            >
              {prompt}
            </p>
            <p className="mt-6 text-[12px] flex items-center gap-2" style={{ color: 'var(--text3)' }}>
              <RotateCcw size={13} />
              Chạm để lật
            </p>
          </div>

          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[28px] border text-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--bg3) 92%, #6366f1 8%), var(--bg3))',
              borderColor: 'rgba(99,102,241,.24)',
            }}
          >
            <span
              className="mb-4 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide"
              style={{
                background: 'rgba(99,102,241,.12)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,.20)',
              }}
            >
              {hiddenLabel}
            </span>
            <p
              className="leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text)', fontSize: 'clamp(16px, 2vw, 22px)' }}
            >
              {hidden}
            </p>
          </div>
        </div>
      </button>
    </div>
  )
}

const RATING_BUTTONS: {
  rating: FlashcardRating
  label: string
  sub: string
  color: string
  bg: string
  border: string
}[] = [
  { rating: 'AGAIN', label: 'Again', sub: '<1 ngày', color: '#ef4444', bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.25)' },
  { rating: 'HARD', label: 'Hard', sub: '~1 ngày', color: '#f97316', bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.25)' },
  { rating: 'GOOD', label: 'Good', sub: 'SM-2', color: '#22c55e', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.25)' },
  { rating: 'EASY', label: 'Easy', sub: 'Dài hơn', color: '#6366f1', bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.25)' },
]

function formatNextReview(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function refreshNotifCount() {
  try {
    const { count } = await notificationApi.count()
    useNotifStore.getState().setUnreadCount(count)
  } catch {
    useNotifStore.getState().increment()
  }
}

interface Props {
  deck: FlashcardDeck
  mode: StudyMode
  folder: FlashcardFolder | null
  sourceBadge: React.ReactNode
  onExit: () => void
  onQuiz: () => void
}

export default function FlashcardStudySession({ deck, mode, folder, sourceBadge, onExit, onQuiz }: Props) {
  const qc = useQueryClient()
  const prefs = loadStudyPrefs(deck.id)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FlashcardStudySummary | null>(null)
  const [queue, setQueue] = useState<Flashcard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [studyFace, setStudyFace] = useState<StudyFace>(prefs.face)
  const [studyActivity, setStudyActivity] = useState<StudyActivity>(prefs.activity)
  const [ignoreCase, setIgnoreCase] = useState(true)
  const [typed, setTyped] = useState('')
  const [dictationChecked, setDictationChecked] = useState(false)
  const [dictationCorrect, setDictationCorrect] = useState(false)

  const [sessionCounts, setSessionCounts] = useState<Record<FlashcardRating, number>>({
    AGAIN: 0,
    HARD: 0,
    GOOD: 0,
    EASY: 0,
  })

  const buildQueue = useCallback(
    (cards: Flashcard[], studySummary: FlashcardStudySummary, studyMode: StudyMode) => {
      const progressMap = new Map(studySummary.cards.map(c => [c.cardId, c]))
      let filtered =
        studyMode === 'ALL'
          ? [...cards]
          : cards.filter(card => {
              if (!card.id) return true
              const p = progressMap.get(card.id)
              return !p || p.due
            })

      if (filtered.length === 0) filtered = [...cards]
      return filtered.sort(() => Math.random() - 0.5)
    },
    []
  )

  const resetCardUi = useCallback(() => {
    setFlipped(false)
    setTyped('')
    setDictationChecked(false)
    setDictationCorrect(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const studySummary = await flashcardApi.getStudySummary(deck.id)
        if (cancelled) return
        setSummary(studySummary)
        const initialQueue = buildQueue(deck.cards || [], studySummary, mode)
        if (initialQueue.length === 0) {
          toast.error('Bộ thẻ không có nội dung để học')
          onExit()
          return
        }
        if (mode === 'DUE' && studySummary.dueCount === 0) {
          toast('Không có thẻ đến hạn — đang mở học tất cả thẻ')
        }
        setQueue(initialQueue)
        setIdx(0)
        resetCardUi()
        setDone(false)
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Không tải được tiến độ ôn thẻ')
        onExit()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [deck.id, deck.cards, mode, buildQueue, onExit, resetCardUi])

  const currentCard = queue[idx]
  const sides = useMemo(
    () => (currentCard ? cardSides(currentCard, studyFace) : null),
    [currentCard, studyFace]
  )

  const cardProgress = useMemo(() => {
    if (!currentCard?.id || !summary) return null
    return summary.cards.find(c => c.cardId === currentCard.id) ?? null
  }, [currentCard?.id, summary])

  const toggleFace = () => {
    const next: StudyFace = studyFace === 'question' ? 'answer' : 'question'
    setStudyFace(next)
    saveStudyFace(deck.id, next)
    resetCardUi()
    toast('Đã đổi mặt học (phù hợp học ngôn ngữ hai chiều)')
  }

  const toggleActivity = () => {
    const next: StudyActivity = studyActivity === 'flip' ? 'dictation' : 'flip'
    setStudyActivity(next)
    saveStudyActivity(deck.id, next)
    resetCardUi()
    toast(next === 'dictation' ? 'Chế độ chép chính tả' : 'Chế độ lật thẻ')
  }

  const finishSession = async (needReview: number) => {
    if (needReview > 0) {
      try {
        await flashcardApi.completeStudySession(deck.id, needReview)
        await refreshNotifCount()
        toast(`Đã gửi nhắc: ${needReview} thẻ cần ôn lại`, { icon: '🔔' })
      } catch {
        /* optional */
      }
    }
    setDone(true)
  }

  const rate = async (rating: FlashcardRating) => {
    if (!currentCard?.id || submitting) return
    if (studyActivity === 'flip' && !flipped) return
    if (studyActivity === 'dictation' && !dictationChecked) return

    setSubmitting(true)
    try {
      const result = await flashcardApi.recordReview(deck.id, currentCard.id, rating)
      setSessionCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }))
      qc.invalidateQueries({ queryKey: ['flashcard-study-summary', deck.id] })
      qc.invalidateQueries({ queryKey: ['auth-me-sync'] })

      if (rating === 'AGAIN' || rating === 'HARD') {
        await refreshNotifCount()
        const when = formatNextReview(result.nextReviewAt)
        toast(
          rating === 'AGAIN'
            ? `Cần ôn lại — đã gửi thông báo. Ôn tiếp khoảng: ${when}`
            : `Khó nhớ — đã nhắc trong thông báo. Ôn tiếp: ${when}`,
          { icon: '🔔', duration: 4500 }
        )
      }

      if (rating === 'AGAIN') {
        setQueue(prev => [...prev.slice(0, idx + 1), currentCard, ...prev.slice(idx + 1)])
      }

      const nextCounts = {
        ...sessionCounts,
        [rating]: sessionCounts[rating] + 1,
      }
      const needReview = nextCounts.AGAIN + nextCounts.HARD

      if (idx + 1 >= queue.length) {
        await finishSession(needReview)
      } else {
        setIdx(i => i + 1)
        resetCardUi()
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không lưu được đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  const checkDictation = () => {
    if (!sides || !typed.trim()) {
      toast.error('Nhập nội dung cần chép')
      return
    }
    const ok = spellingMatches(typed, sides.hidden, ignoreCase)
    setDictationCorrect(ok)
    setDictationChecked(true)
    setFlipped(true)
    if (ok) {
      toast.success('Chính tả đúng!')
    } else {
      toast.error('Chưa khớp — xem đáp án và chọn mức nhớ')
    }
  }

  const restart = async () => {
    setLoading(true)
    try {
      const studySummary = await flashcardApi.getStudySummary(deck.id)
      setSummary(studySummary)
      setQueue(buildQueue(deck.cards || [], studySummary, mode))
      setIdx(0)
      resetCardUi()
      setDone(false)
      setSessionCounts({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không tải lại phiên học')
    } finally {
      setLoading(false)
    }
  }

  const shellClass = 'w-full max-w-2xl mx-auto flex flex-col items-center space-y-6 px-2'

  if (loading) {
    return (
      <div className={`${shellClass} py-20 text-center text-[14px]`} style={{ color: 'var(--text3)' }}>
        Đang tải lịch ôn thẻ (SM-2)...
      </div>
    )
  }

  if (done) {
    const needReview = sessionCounts.AGAIN + sessionCounts.HARD
    return (
      <div className={shellClass}>
        <div
          className="w-full rounded-[30px] border p-8 text-center"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 95%, #6366f1 5%), var(--bg2))',
            borderColor: 'color-mix(in srgb, var(--border) 84%, #6366f1 16%)',
          }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-[26px] font-bold mb-2" style={{ color: 'var(--text)' }}>
            Hoàn thành phiên ôn!
          </h2>
          <p className="text-[14px] mb-4" style={{ color: 'var(--text2)' }}>
            {deck.title}
          </p>
          {needReview > 0 && (
            <p
              className="text-[13px] mb-6 flex items-center justify-center gap-2"
              style={{ color: '#f59e0b' }}
            >
              <Bell size={14} />
              {needReview} thẻ cần ôn lại — đã nhắc trong mục Thông báo
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 w-full">
            {RATING_BUTTONS.map(btn => (
              <div
                key={btn.rating}
                className="p-4 rounded-[20px] border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="text-[22px] font-bold" style={{ color: btn.color }}>
                  {sessionCounts[btn.rating]}
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                  {btn.label}
                </div>
              </div>
            ))}
          </div>

          {summary && (
            <p className="text-[13px] mb-6" style={{ color: 'var(--text2)' }}>
              Còn <strong>{summary.dueCount}</strong> thẻ đến hạn / {summary.totalCards} thẻ
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              type="button"
              onClick={restart}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#6366f1' }}
            >
              <RotateCcw size={14} />
              Ôn tiếp
            </button>
            <button
              type="button"
              onClick={onQuiz}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: '#10b981' }}
            >
              <Target size={14} />
              Luyện Quiz
            </button>
            <button
              type="button"
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

  const showRating =
    studyActivity === 'flip' ? flipped : dictationChecked

  return (
    <div className={shellClass}>
      <div
        className="w-full rounded-[28px] border p-5 text-center sm:text-left"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 96%, #6366f1 4%), var(--bg2))',
          borderColor: 'var(--border)',
        }}
      >
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-[12px] mb-2"
          style={{ color: 'var(--text3)' }}
        >
          <ArrowLeft size={14} />
          Quay lại
        </button>
        <h2 className="text-[22px] sm:text-[26px] font-semibold" style={{ color: 'var(--text)' }}>
          {deck.title}
        </h2>
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
          {sourceBadge}
          {folder && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] border inline-flex items-center gap-1.5"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <Folder size={12} style={{ color: folder.color || '#6366f1' }} />
              {folder.name}
            </span>
          )}
          <span
            className="px-2.5 py-1 rounded-full text-[11px] border inline-flex items-center gap-1.5"
            style={{
              background: 'rgba(99,102,241,.10)',
              borderColor: 'rgba(99,102,241,.20)',
              color: '#818cf8',
            }}
          >
            <CalendarClock size={12} />
            {mode === 'DUE' ? 'Ôn đến hạn' : 'Tất cả'} · SM-2
          </span>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 w-full">
            {[
              { label: 'Đến hạn', val: summary.dueCount, color: '#f59e0b' },
              { label: 'Thẻ mới', val: summary.newCount, color: '#818cf8' },
              { label: 'Phiên', val: queue.length, color: '#22c55e' },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl p-3 border text-center"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="text-[20px] font-bold" style={{ color: s.color }}>
                  {s.val}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-xl flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={toggleFace}
          className="h-10 px-4 rounded-2xl text-[12px] font-medium border inline-flex items-center gap-2"
          style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
        >
          <ArrowLeftRight size={14} />
          {studyFace === 'question' ? 'Đang học: câu hỏi → đáp án' : 'Đang học: đáp án → câu hỏi'}
        </button>
        <button
          type="button"
          onClick={toggleActivity}
          className="h-10 px-4 rounded-2xl text-[12px] font-medium border inline-flex items-center gap-2"
          style={{
            borderColor: studyActivity === 'dictation' ? 'rgba(16,185,129,.35)' : 'var(--border)',
            color: studyActivity === 'dictation' ? '#10b981' : 'var(--text2)',
            background: studyActivity === 'dictation' ? 'rgba(16,185,129,.10)' : 'var(--bg3)',
          }}
        >
          {studyActivity === 'dictation' ? <Keyboard size={14} /> : <Layers size={14} />}
          {studyActivity === 'dictation' ? 'Chép chính tả' : 'Lật thẻ'}
        </button>
      </div>

      <div className="w-full max-w-xl text-center">
        <div className="flex justify-between text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
          <span>
            Thẻ {idx + 1}/{queue.length}
          </span>
          {cardProgress && !cardProgress.isNew && (
            <span>Ôn tiếp: {formatNextReview(cardProgress.nextReviewAt)}</span>
          )}
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((idx + 1) / Math.max(queue.length, 1)) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>
      </div>

      {sides && studyActivity === 'flip' && (
        <FlipCard
          prompt={sides.prompt}
          hidden={sides.hidden}
          promptLabel={sides.promptLabel}
          hiddenLabel={sides.hiddenLabel}
          flipped={flipped}
          onFlip={() => setFlipped(v => !v)}
        />
      )}

      {sides && studyActivity === 'dictation' && (
        <div
          className="w-full max-w-xl rounded-[28px] border p-6 space-y-4 text-center"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text3)' }}>
            {sides.promptLabel} — chép {sides.hiddenLabel.toLowerCase()}
          </p>
          <p
            className="text-[22px] font-semibold leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text)' }}
          >
            {sides.prompt}
          </p>

          {!dictationChecked ? (
            <>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') checkDictation()
                }}
                placeholder="Gõ chính tả / từ vựng..."
                className="w-full h-12 rounded-2xl px-4 text-center text-[15px] outline-none"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <label
                className="flex items-center justify-center gap-2 text-[12px] cursor-pointer"
                style={{ color: 'var(--text3)' }}
              >
                <input
                  type="checkbox"
                  checked={ignoreCase}
                  onChange={e => setIgnoreCase(e.target.checked)}
                  className="rounded"
                />
                Không phân biệt hoa thường
              </label>
              <button
                type="button"
                onClick={checkDictation}
                className="w-full h-12 rounded-2xl text-[13px] font-semibold text-white"
                style={{ background: '#6366f1' }}
              >
                Kiểm tra chính tả
              </button>
            </>
          ) : (
            <div
              className="rounded-2xl p-4 border text-left"
              style={{
                background: dictationCorrect ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
                borderColor: dictationCorrect ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-2 justify-center">
                {dictationCorrect ? (
                  <>
                    <Check size={16} className="text-green-500" />
                    <span className="text-[13px] font-semibold text-green-500">Đúng</span>
                  </>
                ) : (
                  <>
                    <X size={16} className="text-red-500" />
                    <span className="text-[13px] font-semibold text-red-500">Chưa khớp</span>
                  </>
                )}
              </div>
              <p className="text-[12px] text-center mb-1" style={{ color: 'var(--text3)' }}>
                Đáp án đúng:
              </p>
              <p className="text-[15px] font-medium text-center whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                {sides.hidden}
              </p>
              {typed.trim() && !dictationCorrect && (
                <p className="text-[12px] text-center mt-2" style={{ color: 'var(--text3)' }}>
                  Bạn gõ: {typed}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showRating ? (
        <div className="w-full max-w-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RATING_BUTTONS.map(btn => (
            <button
              key={btn.rating}
              type="button"
              disabled={submitting}
              onClick={() => rate(btn.rating)}
              className="py-3 rounded-2xl text-[12px] font-semibold flex flex-col items-center gap-0.5 disabled:opacity-50"
              style={{
                background: btn.bg,
                color: btn.color,
                border: `1px solid ${btn.border}`,
              }}
            >
              <span>{btn.label}</span>
              <span className="text-[10px] font-normal opacity-80">{btn.sub}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-xl flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (idx > 0) {
                setIdx(idx - 1)
                resetCardUi()
              }
            }}
            disabled={idx === 0}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border text-[12px] disabled:opacity-30"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
          >
            <ChevronLeft size={14} />
            Trước
          </button>
          <p className="text-[12px] text-center flex-1" style={{ color: 'var(--text3)' }}>
            {studyActivity === 'dictation'
              ? 'Gõ chính tả rồi kiểm tra'
              : 'Lật thẻ rồi chấm Again / Hard / Good / Easy'}
          </p>
        </div>
      )}
    </div>
  )
}
