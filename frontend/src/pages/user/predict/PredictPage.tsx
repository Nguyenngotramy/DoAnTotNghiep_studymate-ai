import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BrainCircuit,
  Sparkles,
  School,
  GraduationCap,
  Save,
  Plus,
  Trash2,
  ArrowRight,
  BookOpen,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  LineChart,
  ChevronRight,
  Flame,
  Star,
  CalendarDays,
  Clock3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { studyApi } from '@/api/services'
import type { StudyProfile, StudySubjectRecord, StudyTermRecord } from '@/types'

const createId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const nowIso = () => new Date().toISOString()
const round2 = (n: number) => Math.round(n * 100) / 100

const HIGHSCHOOL_DEFAULTS: Record<'10' | '11' | '12', string[]> = {
  '10': ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học'],
  '11': ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học'],
  '12': ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học'],
}

const UNIVERSITY_DEFAULTS = [
  { name: 'Toán cao cấp', credits: 3 },
  { name: 'Lập trình', credits: 3 },
  { name: 'Cơ sở dữ liệu', credits: 3 },
]

type TabKey = 'record' | 'forecast'

type ScheduleSlot = {
  time: string
  subject: string
  type: 'focus' | 'review' | 'maintain' | 'rest'
}

type ScheduleDay = {
  day: string
  slots: ScheduleSlot[]
}

const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

const inputCls =
  'h-11 rounded-xl px-3.5 w-full outline-none text-[13px] font-medium transition-all duration-150 ' +
  'bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] ' +
  'focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/10 placeholder:text-[var(--text3)]'

const scoreInputCls =
  'h-10 rounded-lg px-2.5 w-[76px] outline-none text-[13px] text-center font-semibold tabular-nums transition-all duration-150 ' +
  'bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] ' +
  'focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/10 ' +
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function ScoreChip({ value }: { value: number }) {
  const good = value >= 6.5
  const great = value >= 8
  return (
    <span
      className="inline-flex items-center justify-center h-8 min-w-[52px] px-3 rounded-lg text-[12px] font-bold tabular-nums"
      style={{
        background: great
          ? 'rgba(34,197,94,.13)'
          : good
            ? 'rgba(99,102,241,.12)'
            : 'rgba(239,68,68,.10)',
        color: great ? '#16a34a' : good ? '#818cf8' : '#ef4444',
      }}
    >
      {value.toFixed(2)}
    </span>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon,
  sub,
}: {
  label: string
  value: string
  accent: string
  icon?: ReactNode
  sub?: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-1"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, ${accent}18 0%, transparent 65%)` }}
      />
      <div className="relative flex items-center gap-2 mb-1">
        {icon && <span style={{ color: accent }}>{icon}</span>}
        <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--text3)' }}>
          {label}
        </span>
      </div>
      <span className="relative text-[28px] font-bold leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && (
        <span className="relative text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <div className="flex items-center gap-2.5">
        <span className="text-indigo-400">{icon}</span>
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}

function IconBtn({
  onClick,
  children,
  variant = 'ghost',
  danger,
  disabled,
}: {
  onClick?: () => void
  children: ReactNode
  variant?: 'ghost' | 'primary'
  danger?: boolean
  disabled?: boolean
}) {
  const base =
    'h-9 px-3.5 rounded-xl text-[12px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap disabled:opacity-50'
  if (variant === 'primary') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={base}
        style={{ background: '#6366f1', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,.3)' }}
      >
        {children}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={base}
      style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        color: danger ? '#ef4444' : 'var(--text2)',
      }}
    >
      {children}
    </button>
  )
}

function TermItem({
  term,
  selected,
  onClick,
}: {
  term: StudyTermRecord
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 border transition-all group"
      style={{
        background: selected ? 'rgba(99,102,241,.10)' : 'transparent',
        borderColor: selected ? 'rgba(99,102,241,.28)' : 'transparent',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
          {term.semesterLabel}
        </span>
        <ChevronRight
          size={13}
          className="transition-transform duration-150 group-hover:translate-x-0.5"
          style={{ color: selected ? '#818cf8' : 'var(--text3)' }}
        />
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
          {term.academicYear}
        </span>
        {term.classification && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
          >
            {term.classification}
          </span>
        )}
      </div>
    </button>
  )
}

function getScheduleSlotStyle(type: ScheduleSlot['type']) {
  if (type === 'focus') {
    return {
      background: 'rgba(239,68,68,.08)',
      border: '1px solid rgba(239,68,68,.15)',
      badgeBg: 'rgba(239,68,68,.12)',
      badgeColor: '#ef4444',
      label: 'Tập trung',
    }
  }
  if (type === 'maintain') {
    return {
      background: 'rgba(34,197,94,.08)',
      border: '1px solid rgba(34,197,94,.15)',
      badgeBg: 'rgba(34,197,94,.12)',
      badgeColor: '#16a34a',
      label: 'Duy trì',
    }
  }
  if (type === 'review') {
    return {
      background: 'rgba(99,102,241,.08)',
      border: '1px solid rgba(99,102,241,.15)',
      badgeBg: 'rgba(99,102,241,.12)',
      badgeColor: '#6366f1',
      label: 'Ôn tập',
    }
  }
  return {
    background: 'rgba(148,163,184,.08)',
    border: '1px solid rgba(148,163,184,.15)',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeColor: '#64748b',
    label: 'Thư giãn',
  }
}

export default function PredictPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const resolvedUserType: 'HIGHSCHOOL' | 'STUDENT' | 'OTHER' =
    user?.userType === 'HIGHSCHOOL' ? 'HIGHSCHOOL' : user?.userType === 'STUDENT' ? 'STUDENT' : 'OTHER'

  const [tab, setTab] = useState<TabKey>('record')

  const { data: profile } = useQuery({
    queryKey: ['study-profile'],
    queryFn: () => studyApi.getProfile(),
    enabled: !!user?.id,
  })

  const { data: terms = [] } = useQuery({
    queryKey: ['study-terms'],
    queryFn: () => studyApi.listTerms(),
    enabled: !!user?.id,
  })

  const { data: prediction, isLoading: predictionLoading } = useQuery({
    queryKey: ['study-prediction', terms.length],
    queryFn: () => studyApi.predictFromTerms(),
    enabled: !!user?.id,
  })

  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState<StudyProfile | null>(null)
  const [termForm, setTermForm] = useState<StudyTermRecord | null>(null)
  const [subjects, setSubjects] = useState<StudySubjectRecord[]>([])
  const [regularColumnCount, setRegularColumnCount] = useState(2)

  const selectedTerm = useMemo(() => terms.find(t => t.id === selectedTermId) ?? null, [terms, selectedTermId])

  useEffect(() => {
    if (!user) return
    const baseProfile: StudyProfile = {
      id: profile?.id ?? createId(),
      userId: user.id,
      userType: resolvedUserType,
      fullName: profile?.fullName ?? user.fullName ?? '',
      schoolName: profile?.schoolName ?? user.school ?? '',
      className: profile?.className ?? '',
      gradeLevel: profile?.gradeLevel ?? (resolvedUserType === 'HIGHSCHOOL' ? '12' : undefined),
      faculty: profile?.faculty ?? '',
      major: profile?.major ?? '',
      specialization: profile?.specialization ?? '',
      courseYear: profile?.courseYear ?? '',
      customProgramName: profile?.customProgramName ?? '',
      targetGoal: profile?.targetGoal ?? user.goal ?? '',
      createdAt: profile?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    }
    setProfileForm(baseProfile)
  }, [profile, user, resolvedUserType])

  useEffect(() => {
    if (!selectedTermId && terms.length) setSelectedTermId(terms[0].id)
  }, [terms, selectedTermId])

  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedTerm) {
        setTermForm(null)
        setSubjects([])
        return
      }
      setTermForm(selectedTerm)
      const rows = await studyApi.listSubjects(selectedTerm.id)
      setSubjects(rows)
      if (resolvedUserType === 'HIGHSCHOOL') {
        const maxRegular = rows.reduce((max, item) => Math.max(max, item.regularScores?.length ?? 0), 2)
        setRegularColumnCount(maxRegular)
      }
    }
    void loadSubjects()
  }, [selectedTerm, resolvedUserType])

  const profileMut = useMutation({
    mutationFn: (payload: StudyProfile) => studyApi.saveProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-profile'] })
    },
  })

  const termMut = useMutation({
    mutationFn: async (payload: { term: StudyTermRecord; subjects: StudySubjectRecord[] }) => {
      const isExisting = terms.some(t => t.id === payload.term.id)

      const savedTerm = isExisting
        ? await studyApi.saveTerm(payload.term)
        : await studyApi.createTerm(payload.term)

      const subjectsPayload = payload.subjects.map(s => ({
        ...s,
        termId: savedTerm.id,
      }))

      await studyApi.saveSubjects(savedTerm.id, subjectsPayload)
      const recomputed = await studyApi.recomputeTermSummary(savedTerm.id)

      return recomputed ?? savedTerm
    },
    onSuccess: savedTerm => {
      toast.success('Đã lưu hồ sơ học tập')
      qc.invalidateQueries({ queryKey: ['study-terms'] })
      qc.invalidateQueries({ queryKey: ['study-prediction'] })
      setSelectedTermId(savedTerm.id)
      setTermForm(savedTerm)
    },
  })

  const deleteTermMut = useMutation({
    mutationFn: (termId: string) => studyApi.deleteTerm(termId),
    onSuccess: () => {
      toast.success('Đã xoá học kỳ')
      qc.invalidateQueries({ queryKey: ['study-terms'] })
      qc.invalidateQueries({ queryKey: ['study-prediction'] })
      setSelectedTermId(null)
    },
  })

  const computeHighschoolAvg = (s: StudySubjectRecord) => {
    const regs = s.regularScores ?? []
    const regularAvg = regs.length ? regs.reduce((a, b) => a + b, 0) / regs.length : 0
    return round2((regularAvg + (s.midtermScore ?? 0) * 2 + (s.finalScore ?? 0) * 3) / 6)
  }

  const computeStudentAvg = (s: StudySubjectRecord) =>
    round2(
      (s.attendanceScore ?? 0) * 0.1 +
        (s.assignmentScore ?? 0) * 0.2 +
        (s.midtermScore ?? 0) * 0.2 +
        (s.finalScore ?? 0) * 0.5,
    )

  const computeOtherAvg = (s: StudySubjectRecord) => {
    const items = s.customScores ?? []
    if (!items.length) return 0
    const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0)
    const total = items.reduce((sum, item) => sum + item.value * (item.weight ?? 1), 0)
    return round2(total / Math.max(totalWeight, 1))
  }

  const subjectsWithAverage = useMemo(() => {
    return subjects.map(s => {
      let avg = 0
      if (resolvedUserType === 'HIGHSCHOOL') avg = computeHighschoolAvg(s)
      else if (resolvedUserType === 'STUDENT') avg = computeStudentAvg(s)
      else avg = computeOtherAvg(s)
      return { ...s, averageScore: avg }
    })
  }, [subjects, resolvedUserType])

  const summary = useMemo(() => {
    if (!subjectsWithAverage.length) return { avg: 0, gpa4: 0, classification: 'Chưa có dữ liệu' }

    if (resolvedUserType === 'STUDENT') {
      const totalCredits = subjectsWithAverage.reduce((sum, s) => sum + (s.credits ?? 0), 0)
      const avg10 = totalCredits
        ? subjectsWithAverage.reduce((sum, s) => sum + (s.averageScore ?? 0) * (s.credits ?? 0), 0) / totalCredits
        : 0
      const gpa4 = totalCredits
        ? subjectsWithAverage.reduce((sum, s) => {
            const x = s.averageScore ?? 0
            const gp = x >= 8.5 ? 4 : x >= 7 ? 3 : x >= 5.5 ? 2 : x >= 4 ? 1 : 0
            return sum + gp * (s.credits ?? 0)
          }, 0) / totalCredits
        : 0
      const classification =
        gpa4 >= 3.6 ? 'Xuất sắc' : gpa4 >= 3.2 ? 'Giỏi' : gpa4 >= 2.5 ? 'Khá' : gpa4 >= 2 ? 'Trung bình' : 'Cảnh báo'
      return { avg: round2(avg10), gpa4: round2(gpa4), classification }
    }

    const avg = subjectsWithAverage.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / subjectsWithAverage.length
    const classification =
      resolvedUserType === 'HIGHSCHOOL'
        ? avg >= 8 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5 ? 'Trung bình' : 'Yếu'
        : avg >= 8 ? 'Tốt' : avg >= 6.5 ? 'Ổn' : avg >= 5 ? 'Cần cải thiện' : 'Yếu'

    return { avg: round2(avg), gpa4: 0, classification }
  }, [subjectsWithAverage, resolvedUserType])

  const suggestedWeeklySchedule = useMemo<ScheduleDay[]>(() => {
    if (!prediction) return []

    const weak = prediction.weakSubjects?.length ? prediction.weakSubjects : ['Môn yếu cần ưu tiên']
    const strong = prediction.strongSubjects?.length ? prediction.strongSubjects : ['Môn đang ổn']
    const reviewSubject = weak[0] || strong[0] || 'Ôn tập chung'
    const restLabel = 'Nghỉ ngơi / đọc lại ngắn'

    const weakCycle = [weak[0], weak[1] || weak[0], weak[2] || weak[0], weak[0], weak[1] || weak[0], weak[2] || weak[0]]
    const strongCycle = [strong[0], strong[1] || strong[0], strong[0], strong[1] || strong[0], strong[0], strong[0]]

    return WEEK_DAYS.map((day, index) => {
      if (day === 'Chủ nhật') {
        return {
          day,
          slots: [
            { time: '08:00 - 09:00', subject: 'Tổng kết tuần & xem lại lỗi sai', type: 'review' },
            { time: '19:30 - 20:15', subject: restLabel, type: 'rest' },
          ],
        }
      }

      return {
        day,
        slots: [
          { time: '06:30 - 07:30', subject: weakCycle[index] || reviewSubject, type: 'focus' },
          { time: '19:00 - 20:30', subject: weakCycle[index] || reviewSubject, type: 'focus' },
          { time: '20:45 - 21:30', subject: strongCycle[index] || reviewSubject, type: index % 2 === 0 ? 'maintain' : 'review' },
        ],
      }
    })
  }, [prediction])

  const createNewTerm = () => {
    if (!user || !profileForm) return

    const id = createId()
    const term: StudyTermRecord = {
      id,
      userId: user.id,
      userType: resolvedUserType,
      academicYear: '2025-2026',
      semesterType: 'HK1',
      semesterLabel: 'Học kỳ 1',
      isCurrent: true,
      fullName: profileForm.fullName,
      schoolName: profileForm.schoolName,
      className: profileForm.className,
      gradeLevel: profileForm.gradeLevel,
      faculty: profileForm.faculty,
      major: profileForm.major,
      specialization: profileForm.specialization,
      courseYear: profileForm.courseYear,
      customProgramName: profileForm.customProgramName,
      targetGoal: profileForm.targetGoal,
      behaviorRating: '',
      note: '',
      averageScore: 0,
      gpa10: 0,
      gpa4: resolvedUserType === 'STUDENT' ? 0 : undefined,
      classification: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    setSelectedTermId(id)
    setTermForm(term)

    if (resolvedUserType === 'HIGHSCHOOL') {
      const grade = profileForm.gradeLevel ?? '12'
      const defaults = HIGHSCHOOL_DEFAULTS[grade]
      setRegularColumnCount(2)
      setSubjects(
        defaults.map(name => ({
          id: createId(),
          termId: id,
          userId: user.id,
          userType: 'HIGHSCHOOL',
          subjectName: name,
          regularScores: [0, 0],
          midtermScore: 0,
          finalScore: 0,
          averageScore: 0,
        })),
      )
    } else if (resolvedUserType === 'STUDENT') {
      setSubjects(
        UNIVERSITY_DEFAULTS.map(item => ({
          id: createId(),
          termId: id,
          userId: user.id,
          userType: 'STUDENT',
          subjectName: item.name,
          credits: item.credits,
          attendanceScore: 0,
          assignmentScore: 0,
          midtermScore: 0,
          finalScore: 0,
          averageScore: 0,
        })),
      )
    } else {
      setSubjects([
        {
          id: createId(),
          termId: id,
          userId: user.id,
          userType: 'OTHER',
          subjectName: 'Kỹ năng 1',
          customScores: [
            { label: 'Mốc 1', value: 0, weight: 1 },
            { label: 'Mốc 2', value: 0, weight: 1 },
          ],
          averageScore: 0,
        },
      ])
    }

    setTab('record')
  }

  const addRegularColumn = () => {
    setRegularColumnCount(prev => prev + 1)
    setSubjects(prev =>
      prev.map(s => ({
        ...s,
        regularScores: [...(s.regularScores ?? Array.from({ length: regularColumnCount }, () => 0)), 0],
      })),
    )
  }

  const removeRegularColumn = () => {
    if (regularColumnCount <= 1) return
    setRegularColumnCount(prev => prev - 1)
    setSubjects(prev =>
      prev.map(s => ({
        ...s,
        regularScores: (s.regularScores ?? []).slice(0, regularColumnCount - 1),
      })),
    )
  }

  const addSubject = () => {
    if (!termForm || !user) return

    if (resolvedUserType === 'HIGHSCHOOL') {
      setSubjects(prev => [
        ...prev,
        {
          id: createId(),
          termId: termForm.id,
          userId: user.id,
          userType: 'HIGHSCHOOL',
          subjectName: `Môn ${prev.length + 1}`,
          regularScores: Array.from({ length: regularColumnCount }, () => 0),
          midtermScore: 0,
          finalScore: 0,
          averageScore: 0,
        },
      ])
    } else if (resolvedUserType === 'STUDENT') {
      setSubjects(prev => [
        ...prev,
        {
          id: createId(),
          termId: termForm.id,
          userId: user.id,
          userType: 'STUDENT',
          subjectName: `Học phần ${prev.length + 1}`,
          credits: 3,
          attendanceScore: 0,
          assignmentScore: 0,
          midtermScore: 0,
          finalScore: 0,
          averageScore: 0,
        },
      ])
    } else {
      setSubjects(prev => [
        ...prev,
        {
          id: createId(),
          termId: termForm.id,
          userId: user.id,
          userType: 'OTHER',
          subjectName: `Kỹ năng ${prev.length + 1}`,
          customScores: [
            { label: 'Mốc 1', value: 0, weight: 1 },
            { label: 'Mốc 2', value: 0, weight: 1 },
          ],
          averageScore: 0,
        },
      ])
    }
  }

  const removeSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  const updateSubject = (id: string, patch: Partial<StudySubjectRecord>) => {
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }

  const saveAll = async () => {
    if (!user || !profileForm || !termForm) {
      toast.error('Hãy tạo học kỳ trước')
      return
    }

    const profilePayload: StudyProfile = {
      ...profileForm,
      userType: resolvedUserType,
      updatedAt: nowIso(),
    }

    const termPayload: StudyTermRecord = {
      ...termForm,
      userType: resolvedUserType,
      fullName: profileForm.fullName,
      schoolName: profileForm.schoolName,
      className: profileForm.className,
      gradeLevel: profileForm.gradeLevel,
      faculty: profileForm.faculty,
      major: profileForm.major,
      specialization: profileForm.specialization,
      courseYear: profileForm.courseYear,
      customProgramName: profileForm.customProgramName,
      targetGoal: profileForm.targetGoal,
      averageScore: summary.avg,
      gpa10: summary.avg,
      gpa4: resolvedUserType === 'STUDENT' ? summary.gpa4 : undefined,
      classification: summary.classification,
      updatedAt: nowIso(),
    }

    const subjectsPayload = subjectsWithAverage.map(s => ({
      ...s,
      termId: termPayload.id,
      userId: user.id,
      userType: resolvedUserType,
    }))

    await profileMut.mutateAsync(profilePayload)
    await termMut.mutateAsync({ term: termPayload, subjects: subjectsPayload })
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl border p-10 text-center" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <p style={{ color: 'var(--text2)' }}>Bạn cần đăng nhập để dùng dự đoán học lực.</p>
        </div>
      </div>
    )
  }

  const Icon =
    resolvedUserType === 'HIGHSCHOOL'
      ? School
      : resolvedUserType === 'STUDENT'
        ? GraduationCap
        : Sparkles

  const thCls = 'text-left py-2.5 px-2 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap'

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 px-1">
      <div
        className="rounded-3xl border p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg2) 88%, #6366f1 12%) 0%, var(--bg2) 100%)',
          borderColor: 'color-mix(in srgb, var(--border) 70%, #6366f1 30%)',
        }}
      >
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(99,102,241,.07)' }}
        />
        <div
          className="absolute right-32 bottom-0 w-32 h-32 rounded-full blur-2xl pointer-events-none"
          style={{ background: 'rgba(139,92,246,.05)' }}
        />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div
              className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wide uppercase"
              style={{ background: 'rgba(99,102,241,.10)', borderColor: 'rgba(99,102,241,.20)', color: '#818cf8' }}
            >
              <BrainCircuit size={13} />
              Academic Prediction Workspace
            </div>
            <h1 className="text-[26px] font-bold leading-tight flex items-center gap-3" style={{ color: 'var(--text)' }}>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/15">
                <Icon size={19} className="text-indigo-400" />
              </span>
              Dự đoán học lực
            </h1>
            <p className="text-[13px] mt-2 max-w-lg leading-relaxed" style={{ color: 'var(--text3)' }}>
              Quản lý hồ sơ học tập, lưu bảng điểm theo học kỳ và nhận phân tích kết quả cùng gợi ý cải thiện.
            </p>
          </div>

          <div className="flex gap-2.5 flex-wrap items-center">
            <button
              onClick={createNewTerm}
              className="h-10 px-5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all active:scale-[.97]"
              style={{ background: '#6366f1', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }}
            >
              <Plus size={14} />
              Học kỳ mới
            </button>
            <button
              onClick={() => setTab('forecast')}
              className="h-10 px-5 rounded-xl border text-[13px] font-medium flex items-center gap-2 transition-all"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <LineChart size={14} />
              Phân tích
            </button>
          </div>
        </div>

        <div
          className="relative flex items-center gap-1 mt-5 p-1 rounded-2xl w-fit"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          {[
            { key: 'record', label: 'Hồ sơ học tập', icon: <BookOpen size={13} /> },
            { key: 'forecast', label: 'Dự đoán & Phân tích', icon: <TrendingUp size={13} /> },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as TabKey)}
              className="h-9 px-4 rounded-xl text-[13px] font-medium flex items-center gap-1.5 transition-all duration-200"
              style={{
                background: tab === item.key ? 'var(--bg2)' : 'transparent',
                color: tab === item.key ? '#818cf8' : 'var(--text3)',
                boxShadow: tab === item.key ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                border: tab === item.key ? '1px solid rgba(99,102,241,.20)' : '1px solid transparent',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'record' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">
          <div className="space-y-4">
            <div className="rounded-2xl border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={14} className="text-indigo-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text3)' }}>
                  Học kỳ đã lưu
                </span>
              </div>

              <div className="space-y-1">
                {terms.length === 0 ? (
                  <div
                    className="rounded-xl border border-dashed p-4 text-center"
                    style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
                  >
                    <p className="text-[12px]">Chưa có học kỳ nào.</p>
                    <p className="text-[11px] mt-1">
                      Bấm <strong>"Học kỳ mới"</strong> để bắt đầu
                    </p>
                  </div>
                ) : (
                  terms.map(term => (
                    <TermItem
                      key={term.id}
                      term={term}
                      selected={selectedTermId === term.id}
                      onClick={() => setSelectedTermId(term.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)' }}>
                Loại hồ sơ
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold"
                  style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
                >
                  <Icon size={13} />
                  {resolvedUserType === 'HIGHSCHOOL' ? 'Học sinh' : resolvedUserType === 'STUDENT' ? 'Sinh viên' : 'Khác'}
                </span>
              </div>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--text3)' }}>
                Dữ liệu sẽ được dùng để dự đoán học lực ở tab bên.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <SectionHeader icon={<Star size={16} />} title="Thông tin học tập" />
              {profileForm && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <input value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} placeholder="Họ và tên" className={inputCls} />
                  <input value={profileForm.schoolName ?? ''} onChange={e => setProfileForm({ ...profileForm, schoolName: e.target.value })} placeholder="Trường" className={inputCls} />

                  {resolvedUserType === 'HIGHSCHOOL' && (
                    <>
                      <input value={profileForm.className ?? ''} onChange={e => setProfileForm({ ...profileForm, className: e.target.value })} placeholder="Lớp" className={inputCls} />
                      <select value={profileForm.gradeLevel ?? '12'} onChange={e => setProfileForm({ ...profileForm, gradeLevel: e.target.value as '10' | '11' | '12' })} className={inputCls}>
                        <option value="10">Lớp 10</option>
                        <option value="11">Lớp 11</option>
                        <option value="12">Lớp 12</option>
                      </select>
                    </>
                  )}

                  {resolvedUserType === 'STUDENT' && (
                    <>
                      <input value={profileForm.faculty ?? ''} onChange={e => setProfileForm({ ...profileForm, faculty: e.target.value })} placeholder="Khoa" className={inputCls} />
                      <input value={profileForm.major ?? ''} onChange={e => setProfileForm({ ...profileForm, major: e.target.value })} placeholder="Ngành" className={inputCls} />
                      <input value={profileForm.specialization ?? ''} onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })} placeholder="Chuyên ngành" className={inputCls} />
                    </>
                  )}

                  {resolvedUserType === 'OTHER' && (
                    <>
                      <input value={profileForm.customProgramName ?? ''} onChange={e => setProfileForm({ ...profileForm, customProgramName: e.target.value })} placeholder="Tên chương trình học" className={inputCls} />
                      <input value={profileForm.targetGoal ?? ''} onChange={e => setProfileForm({ ...profileForm, targetGoal: e.target.value })} placeholder="Mục tiêu" className={inputCls} />
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <SectionHeader icon={<BookOpen size={16} />} title="Bảng điểm học kỳ">
                {termForm && (
                  <>
                    {resolvedUserType === 'HIGHSCHOOL' && (
                      <>
                        <IconBtn onClick={addRegularColumn}>+ Cột TX</IconBtn>
                        <IconBtn onClick={removeRegularColumn}>− Cột TX</IconBtn>
                      </>
                    )}
                    <IconBtn onClick={addSubject}><Plus size={12} /> Thêm môn</IconBtn>
                    <IconBtn variant="primary" onClick={saveAll} disabled={profileMut.isPending || termMut.isPending}>
                      <Save size={12} /> Lưu hồ sơ
                    </IconBtn>
                    <IconBtn danger onClick={() => termForm?.id && deleteTermMut.mutate(termForm.id)}>
                      <Trash2 size={12} /> Xoá kỳ
                    </IconBtn>
                  </>
                )}
              </SectionHeader>

              {!termForm ? (
                <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                  <BrainCircuit size={32} className="text-indigo-400/50 mx-auto mb-3" />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>
                    Chưa có học kỳ nào được chọn
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                    Bấm <strong>Học kỳ mới</strong> để bắt đầu nhập dữ liệu học tập.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <input value={termForm.academicYear} onChange={e => setTermForm({ ...termForm, academicYear: e.target.value })} placeholder="Năm học" className={inputCls} />
                    <select
                      value={termForm.semesterType}
                      onChange={e => {
                        const v = e.target.value as StudyTermRecord['semesterType']
                        setTermForm({
                          ...termForm,
                          semesterType: v,
                          semesterLabel: v === 'HK1' ? 'Học kỳ 1' : v === 'HK2' ? 'Học kỳ 2' : v === 'SUMMER' ? 'Hè' : 'Khác',
                        })
                      }}
                      className={inputCls}
                    >
                      <option value="HK1">Học kỳ 1</option>
                      <option value="HK2">Học kỳ 2</option>
                      <option value="SUMMER">Hè</option>
                      <option value="OTHER">Khác</option>
                    </select>
                    <input value={termForm.semesterLabel} onChange={e => setTermForm({ ...termForm, semesterLabel: e.target.value })} placeholder="Tên học kỳ" className={inputCls} />
                    {resolvedUserType === 'HIGHSCHOOL' && (
                      <input value={termForm.behaviorRating ?? ''} onChange={e => setTermForm({ ...termForm, behaviorRating: e.target.value })} placeholder="Hạnh kiểm" className={inputCls} />
                    )}
                  </div>

                  <div className="overflow-x-auto -mx-5 px-5">
                    {resolvedUserType === 'HIGHSCHOOL' && (
                      <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className={thCls} style={{ color: 'var(--text3)', width: '30%' }}>Môn học</th>
                            {Array.from({ length: regularColumnCount }).map((_, idx) => (
                              <th key={idx} className={thCls} style={{ color: 'var(--text3)' }}>TX {idx + 1}</th>
                            ))}
                            <th className={thCls} style={{ color: 'var(--text3)' }}>Giữa kỳ</th>
                            <th className={thCls} style={{ color: 'var(--text3)' }}>Cuối kỳ</th>
                            <th className={thCls} style={{ color: 'var(--text3)' }}>TB</th>
                            <th className="py-2.5 px-2 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {subjectsWithAverage.map((s, i) => (
                            <tr key={s.id} className="group transition-colors duration-100" style={{ borderBottom: i < subjectsWithAverage.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <td className="py-2.5 px-2 pr-3">
                                <input value={s.subjectName} onChange={e => updateSubject(s.id, { subjectName: e.target.value })} className={`${inputCls} text-[13px]`} />
                              </td>

                              {Array.from({ length: regularColumnCount }).map((_, idx) => (
                                <td key={idx} className="py-2.5 px-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    step={0.1}
                                    value={s.regularScores?.[idx] ?? 0}
                                    onChange={e => {
                                      const arr = [...(s.regularScores ?? Array.from({ length: regularColumnCount }, () => 0))]
                                      while (arr.length < regularColumnCount) arr.push(0)
                                      arr[idx] = Number(e.target.value)
                                      updateSubject(s.id, { regularScores: arr })
                                    }}
                                    className={scoreInputCls}
                                  />
                                </td>
                              ))}

                              <td className="py-2.5 px-2">
                                <input type="number" min={0} max={10} step={0.1} value={s.midtermScore ?? 0} onChange={e => updateSubject(s.id, { midtermScore: Number(e.target.value) })} className={scoreInputCls} />
                              </td>
                              <td className="py-2.5 px-2">
                                <input type="number" min={0} max={10} step={0.1} value={s.finalScore ?? 0} onChange={e => updateSubject(s.id, { finalScore: Number(e.target.value) })} className={scoreInputCls} />
                              </td>
                              <td className="py-2.5 px-2"><ScoreChip value={s.averageScore ?? 0} /></td>
                              <td className="py-2.5 px-2">
                                <button onClick={() => removeSubject(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {resolvedUserType === 'STUDENT' && (
                      <table className="w-full min-w-[720px] border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Học phần', 'TC', 'Chuyên cần', 'Bài tập', 'Giữa kỳ', 'Cuối kỳ', 'TB', 'Chữ', ''].map((h, i) => (
                              <th key={i} className={thCls} style={{ color: 'var(--text3)', width: i === 0 ? '28%' : undefined }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {subjectsWithAverage.map((s, i) => {
                            const letter =
                              s.averageScore != null
                                ? s.averageScore >= 8.5 ? 'A'
                                  : s.averageScore >= 7 ? 'B'
                                    : s.averageScore >= 5.5 ? 'C'
                                      : s.averageScore >= 4 ? 'D'
                                        : 'F'
                                : '—'

                            return (
                              <tr key={s.id} className="group transition-colors duration-100" style={{ borderBottom: i < subjectsWithAverage.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <td className="py-2.5 px-2 pr-3">
                                  <input value={s.subjectName} onChange={e => updateSubject(s.id, { subjectName: e.target.value })} className={`${inputCls} text-[13px]`} />
                                </td>
                                <td className="py-2.5 px-2">
                                  <input type="number" min={1} max={10} value={s.credits ?? 3} onChange={e => updateSubject(s.id, { credits: Number(e.target.value) })} className={scoreInputCls} style={{ width: 56 }} />
                                </td>
                                {(['attendanceScore', 'assignmentScore', 'midtermScore', 'finalScore'] as const).map(key => (
                                  <td key={key} className="py-2.5 px-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={10}
                                      step={0.1}
                                      value={(s[key] as number | undefined) ?? 0}
                                      onChange={e => updateSubject(s.id, { [key]: Number(e.target.value) })}
                                      className={scoreInputCls}
                                    />
                                  </td>
                                ))}
                                <td className="py-2.5 px-2"><ScoreChip value={s.averageScore ?? 0} /></td>
                                <td className="py-2.5 px-2">
                                  <span
                                    className="inline-flex items-center justify-center h-8 min-w-[40px] px-2 rounded-lg text-[12px] font-bold"
                                    style={{
                                      color: letter === 'A' ? '#16a34a' : letter === 'B' ? '#818cf8' : letter === 'C' ? '#f59e0b' : '#ef4444',
                                      background:
                                        letter === 'A' ? 'rgba(34,197,94,.13)'
                                          : letter === 'B' ? 'rgba(99,102,241,.12)'
                                            : letter === 'C' ? 'rgba(245,158,11,.12)'
                                              : 'rgba(239,68,68,.10)',
                                    }}
                                  >
                                    {letter}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2">
                                  <button onClick={() => removeSubject(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}

                    {resolvedUserType === 'OTHER' && (
                      <table className="w-full min-w-[560px] border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className={thCls} style={{ color: 'var(--text3)', width: '35%' }}>Kỹ năng / môn</th>
                            <th className={thCls} style={{ color: 'var(--text3)' }}>Mốc 1</th>
                            <th className={thCls} style={{ color: 'var(--text3)' }}>Mốc 2</th>
                            <th className={thCls} style={{ color: 'var(--text3)' }}>TB</th>
                            <th className="py-2.5 px-2 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {subjectsWithAverage.map((s, i) => (
                            <tr key={s.id} className="group transition-colors duration-100" style={{ borderBottom: i < subjectsWithAverage.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <td className="py-2.5 px-2 pr-3">
                                <input value={s.subjectName} onChange={e => updateSubject(s.id, { subjectName: e.target.value })} className={`${inputCls} text-[13px]`} />
                              </td>

                              {[0, 1].map(idx => (
                                <td key={idx} className="py-2.5 px-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    step={0.1}
                                    value={s.customScores?.[idx]?.value ?? 0}
                                    onChange={e => {
                                      const arr = [...(s.customScores ?? [
                                        { label: 'Mốc 1', value: 0, weight: 1 },
                                        { label: 'Mốc 2', value: 0, weight: 1 },
                                      ])]
                                      arr[idx] = {
                                        ...(arr[idx] ?? { label: `Mốc ${idx + 1}`, weight: 1 }),
                                        value: Number(e.target.value),
                                      }
                                      updateSubject(s.id, { customScores: arr })
                                    }}
                                    className={scoreInputCls}
                                  />
                                </td>
                              ))}

                              <td className="py-2.5 px-2"><ScoreChip value={s.averageScore ?? 0} /></td>
                              <td className="py-2.5 px-2">
                                <button onClick={() => removeSubject(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label={resolvedUserType === 'STUDENT' ? 'GPA hệ 10' : 'Điểm trung bình'}
                value={summary.avg.toFixed(2)}
                accent="#6366f1"
                icon={<TrendingUp size={13} />}
              />
              <StatCard
                label={resolvedUserType === 'STUDENT' ? 'GPA hệ 4' : resolvedUserType === 'HIGHSCHOOL' ? 'Hạnh kiểm' : 'Mục tiêu'}
                value={
                  resolvedUserType === 'STUDENT'
                    ? summary.gpa4.toFixed(2)
                    : resolvedUserType === 'HIGHSCHOOL'
                      ? termForm?.behaviorRating || '—'
                      : profileForm?.targetGoal || '—'
                }
                accent="#14b8a6"
                icon={<Flame size={13} />}
              />
              <StatCard
                label="Xếp loại"
                value={summary.classification}
                accent="#22c55e"
                icon={<Star size={13} />}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTab('forecast')}
                className="h-10 px-5 rounded-xl text-[13px] font-semibold flex items-center gap-2"
                style={{ background: '#6366f1', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,.3)' }}
              >
                Xem dự đoán <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-5">
          <div className="space-y-5">
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <SectionHeader icon={<TrendingUp size={16} />} title="Kết quả dự đoán" />

              {predictionLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                    Đang phân tích dữ liệu...
                  </p>
                </div>
              ) : !prediction ? (
                <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: 'var(--border)' }}>
                  <LineChart size={28} className="text-indigo-400/40 mx-auto mb-3" />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>
                    Chưa đủ dữ liệu để dự đoán
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                    Hãy lưu ít nhất một học kỳ ở tab Hồ sơ học tập.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <StatCard
                      label="Điểm dự đoán kỳ tới"
                      value={prediction.predictedAverage.toFixed(2)}
                      accent="#6366f1"
                      icon={<TrendingUp size={13} />}
                    />
                    <StatCard
                      label="Xếp loại dự kiến"
                      value={prediction.predictedClassification}
                      accent="#22c55e"
                      icon={<Star size={13} />}
                    />
                    <StatCard
                      label="Độ tin cậy"
                      value={
                        prediction.confidenceLevel === 'high'
                          ? 'Cao'
                          : prediction.confidenceLevel === 'medium'
                            ? 'Trung bình'
                            : 'Thấp'
                      }
                      accent={
                        prediction.confidenceLevel === 'high'
                          ? '#22c55e'
                          : prediction.confidenceLevel === 'medium'
                            ? '#f59e0b'
                            : '#ef4444'
                      }
                      icon={<Flame size={13} />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border p-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={15} className="text-green-500" />
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                          Môn / kỹ năng mạnh
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(prediction.strongSubjects.length ? prediction.strongSubjects : ['Chưa có']).map(item => (
                          <span
                            key={item}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                            style={{ background: 'rgba(34,197,94,.12)', color: '#16a34a' }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={15} className="text-amber-500" />
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                          Môn / kỹ năng cần cải thiện
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(prediction.weakSubjects.length ? prediction.weakSubjects : ['Không có']).map(item => (
                          <span
                            key={item}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                            style={{ background: 'rgba(245,158,11,.12)', color: '#d97706' }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <SectionHeader icon={<CalendarDays size={16} />} title="Lịch học gợi ý trong tuần" />

              {!prediction ? (
                <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                  Chưa có dữ liệu để gợi ý lịch học.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {suggestedWeeklySchedule.map(day => (
                    <div
                      key={day.day}
                      className="rounded-2xl border p-4"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(99,102,241,.12)', color: '#6366f1' }}
                        >
                          <Clock3 size={14} />
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                            {day.day}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {day.slots.length} khung giờ gợi ý
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {day.slots.map((slot, idx) => {
                          const style = getScheduleSlotStyle(slot.type)
                          return (
                            <div
                              key={`${day.day}-${idx}`}
                              className="rounded-xl p-3"
                              style={{ background: style.background, border: style.border }}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                                  {slot.time}
                                </span>
                                <span
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                                  style={{ background: style.badgeBg, color: style.badgeColor }}
                                >
                                  {style.label}
                                </span>
                              </div>
                              <div className="text-[13px]" style={{ color: 'var(--text2)' }}>
                                {slot.subject}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <SectionHeader icon={<Target size={16} />} title="Lời khuyên tự học" />

              {!prediction ? (
                <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                  Chưa có gợi ý vì chưa đủ dữ liệu học tập.
                </p>
              ) : (
                <div className="space-y-3">
                  {prediction.suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-4 flex items-start gap-3"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold"
                        style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
                      >
                        {idx + 1}
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--text2)' }}>
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <SectionHeader icon={<Sparkles size={16} />} title="Cảnh báo & ghi chú" />

              {!prediction ? (
                <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                  Chưa có cảnh báo nào.
                </p>
              ) : (
                <div className="space-y-3">
                  {prediction.warnings.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-4"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-[13px]" style={{ color: 'var(--text2)' }}>
                          {item}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div
                    className="rounded-xl border p-4"
                    style={{ background: 'rgba(34,197,94,.08)', borderColor: 'rgba(34,197,94,.18)' }}
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="text-[13px]" style={{ color: 'var(--text2)' }}>
                        Sau khi học thêm 1-2 tuần, hãy quay lại tab <strong>Hồ sơ học tập</strong> và cập nhật điểm mới
                        để hệ thống phân tích chính xác hơn.
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl border p-4"
                    style={{ background: 'rgba(99,102,241,.08)', borderColor: 'rgba(99,102,241,.18)' }}
                  >
                    <div className="flex items-start gap-2">
                      <CalendarDays size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="text-[13px]" style={{ color: 'var(--text2)' }}>
                        Lịch học gợi ý bên trái là lịch tự động dựa trên các môn yếu và môn mạnh hiện tại. Bạn có thể dùng
                        như khung tham khảo để tự học mỗi tuần.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-start">
              <button
                onClick={() => setTab('record')}
                className="h-10 px-4 rounded-xl border text-[13px] font-medium"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Quay lại hồ sơ học tập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}