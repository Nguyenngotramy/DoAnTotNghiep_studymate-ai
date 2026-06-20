import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi, userApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import {
  Eye, EyeOff, Loader2, ArrowRight, ArrowLeft,
  GraduationCap, BookOpen, School, Users2, Check
} from 'lucide-react'
import clsx from 'clsx'
import AcademicSelect from '@/components/AcademicSelect'
import { useAcademicCatalog } from '@/hooks/useAcademicCatalog'

const step1Schema = z.object({
  fullName: z.string().min(2, 'Nhập họ tên đầy đủ'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirm: z.string(),
  agreeTerms: z.boolean().refine(v => v === true, 'Bạn phải đồng ý điều khoản để tiếp tục'),
}).refine(d => d.password === d.confirm, {
  message: 'Mật khẩu xác nhận không khớp', path: ['confirm'],
})
type Step1Data = z.infer<typeof step1Schema>

const SUBJECTS = [
  'Toán', 'Tiếng Anh', 'Lập trình', 'Vật lý', 'Hóa học',
  'Sinh học', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'IELTS', 'TOEIC', 'AI/ML'
]

const GOALS = [
  'Cải thiện GPA học kỳ này',
  'Đạt chứng chỉ tiếng Anh (IELTS/TOEIC)',
  'Chuẩn bị thi đại học',
  'Học thêm kỹ năng mới',
  'Ôn thi tốt nghiệp',
]

const USER_TYPES = [
  { id: 'STUDENT', icon: GraduationCap, label: 'Sinh viên ĐH', color: '#6366f1' },
  { id: 'HIGHSCHOOL', icon: School, label: 'Học sinh THPT', color: '#14b8a6' },
  { id: 'OTHER', icon: Users2, label: 'Khác', color: '#8b5cf6' },
]

const DAYS = [
  { key: 'MON', label: 'T2' },
  { key: 'TUE', label: 'T3' },
  { key: 'WED', label: 'T4' },
  { key: 'THU', label: 'T5' },
  { key: 'FRI', label: 'T6' },
  { key: 'SAT', label: 'T7' },
  { key: 'SUN', label: 'CN' },
]

const DEFAULT_TIME_SLOTS = [
  { start: '06:00', end: '08:00', label: '6h-8h' },
  { start: '08:00', end: '10:00', label: '8h-10h' },
  { start: '13:00', end: '15:00', label: '13h-15h' },
  { start: '15:00', end: '17:00', label: '15h-17h' },
  { start: '17:00', end: '19:00', label: '17h-19h' },
  { start: '19:00', end: '21:00', label: '19h-21h' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
          <path
            d="M10 2.5L17 6.25V13.75L10 17.5L3 13.75V6.25L10 2.5Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 7.5v5M7.5 10h5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <div className="text-[15px] font-bold leading-none" style={{ color: 'var(--text)' }}>
          StudyMate AI
        </div>
        <div
          className="text-[9px] uppercase tracking-[.12em] mt-0.5"
          style={{ color: 'var(--text3)' }}
        >
          Học nhóm thông minh
        </div>
      </div>
    </div>
  )
}

function CloudWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 800 160" fill="none" className="w-full" style={{ marginBottom: -2 }}>
        <path
          d="M0 110 C120 60 240 130 400 80 C560 30 680 110 800 70 L800 160 L0 160 Z"
          fill="rgba(99,102,241,0.07)"
        />
      </svg>
      <svg viewBox="0 0 800 120" fill="none" className="w-full absolute bottom-0" style={{ marginBottom: -1 }}>
        <path
          d="M0 80 C150 40 300 100 500 55 C680 15 760 75 800 50 L800 120 L0 120 Z"
          fill="rgba(139,92,246,0.09)"
        />
      </svg>
      <svg viewBox="0 0 800 90" fill="none" className="w-full absolute bottom-0">
        <path
          d="M0 55 C100 25 220 70 400 40 C580 10 700 55 800 30 L800 90 L0 90 Z"
          fill="rgba(99,102,241,0.11)"
        />
      </svg>
      <div
        className="absolute bottom-6 left-12 w-20 h-10 rounded-full opacity-15"
        style={{ background: 'radial-gradient(ellipse,#6366f1,transparent)', filter: 'blur(10px)' }}
      />
      <div
        className="absolute bottom-10 right-16 w-24 h-12 rounded-full opacity-10"
        style={{ background: 'radial-gradient(ellipse,#8b5cf6,transparent)', filter: 'blur(12px)' }}
      />
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)

  const [step1, setStep1] = useState<Step1Data | null>(null)
  const [userType, setUserType] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [strong, setStrong] = useState<string[]>([])
  const [weak, setWeak] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState('')
  const [goal, setGoal] = useState('')
  const [schoolOptions, setSchoolOptions] = useState<string[]>([])
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [subjectOptions, setSubjectOptions] = useState<string[]>(SUBJECTS)
  const [goalOptions, setGoalOptions] = useState<string[]>(GOALS)
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS)
  const [schedule, setSchedule] = useState<{ day: string; start: string; end: string }[]>([])
  const academicCatalog = useAcademicCatalog(userType === 'STUDENT' ? school : '')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { agreeTerms: false },
  })

  const agreed = watch('agreeTerms')

  useEffect(() => {
    userApi.onboardingOptions({ userType: userType || undefined, major: major || undefined })
      .then(data => {
        if (data.schools) setSchoolOptions(data.schools)
        if (data.interestFields) setFieldOptions(data.interestFields)
        if (data.subjects?.length) setSubjectOptions(data.subjects)
        if (data.goals?.length) setGoalOptions(data.goals)
        if (data.timeSlots?.length) setTimeSlots(data.timeSlots)
      })
      .catch(() => {})
  }, [userType, major])

  const selectSchool = (value: string) => {
    if (value !== school) setMajor('')
    setSchool(value)
  }

  const toggleSubject = (sub: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(sub)) setList(list.filter(s => s !== sub))
    else if (list.length < 4) setList([...list, sub])
    else toast('Chọn tối đa 4 môn!')
  }

  const toggleInterest = (tag: string) => {
    setInterests(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const addCustomInterest = () => {
    const value = customInterest.trim()
    if (!value) return
    setInterests(prev => prev.includes(value) ? prev : [...prev, value])
    setCustomInterest('')
  }

  const applySchedulePreset = (preset: 'EVENING' | 'WEEKEND' | 'MORNING') => {
    const next =
      preset === 'EVENING'
        ? ['MON', 'WED', 'FRI'].map(day => ({ day, start: '19:00', end: '21:00' }))
        : preset === 'WEEKEND'
          ? [
              { day: 'SAT', start: '08:00', end: '10:00' },
              { day: 'SUN', start: '08:00', end: '10:00' },
              { day: 'SAT', start: '15:00', end: '17:00' },
            ]
          : ['TUE', 'THU', 'SAT'].map(day => ({ day, start: '06:00', end: '08:00' }))
    setSchedule(next)
  }

  const toggleSlot = (day: string, start: string, end: string) => {
    setSchedule(prev => {
      const exists = prev.some(s => s.day === day && s.start === start)
      return exists
        ? prev.filter(s => !(s.day === day && s.start === start))
        : [...prev, { day, start, end }]
    })
  }

  const isSlotSelected = (day: string, start: string) =>
    schedule.some(s => s.day === day && s.start === start)

  const onStep1 = (data: Step1Data) => {
    setStep1(data)
    setStep(2)
  }

  const handleGoogle = () => {
    toast('Google OAuth sẽ được tích hợp sớm!', { icon: '🔧' })
  }

  const onFinish = async () => {
    if (!step1) return
    setLoading(true)
    try {
      const res = await authApi.register({
        fullName: step1.fullName,
        email: step1.email,
        password: step1.password,
        userType,
        school,
        major,
        interestedFields: interests,
        strongSubjects: strong,
        weakSubjects: weak,
        interests: [...new Set([major, ...strong, ...weak, ...interests].filter(Boolean))],
        availableSchedule: schedule.map(s => ({
          dayOfWeek: s.day,
          startTime: s.start,
          endTime: s.end,
        })),
        goal,
      })
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      toast.success('Chào mừng bạn đến với StudyMate AI! 🎉')
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Email đã được sử dụng')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const inp = (err?: boolean) =>
    `w-full h-11 px-4 rounded-xl text-[13px] outline-none transition-all`

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg2) 80%, #6366f1 20%) 0%, var(--bg2) 50%, color-mix(in srgb, var(--bg2) 88%, #8b5cf6 12%) 100%)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 30%,rgba(99,102,241,.25) 0%,transparent 50%),radial-gradient(circle at 70% 70%,rgba(139,92,246,.2) 0%,transparent 50%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <CloudWaves />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-[28px] font-bold leading-tight mb-2" style={{ color: 'var(--text)' }}>
              Tham gia cộng đồng
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                học tập thông minh
              </span>
            </h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text2)' }}>
              Chỉ mất 2 phút để tạo tài khoản và bắt đầu hành trình học tập được cá nhân hóa.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { n: 1, label: 'Tạo tài khoản', desc: 'Email & mật khẩu' },
              { n: 2, label: 'Bạn là ai?', desc: 'Học sinh · SV · Khác' },
              { n: 3, label: 'Môn học & Mục tiêu', desc: 'Cá nhân hóa trải nghiệm' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-all',
                  )}
                  style={
                    step > s.n
                      ? { background: '#22c55e', color: 'white' }
                      : step === s.n
                        ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }
                        : { background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }
                  }
                >
                  {step > s.n ? <Check size={14} /> : s.n}
                </div>
                <div>
                  <p
                    className="text-[12px] font-medium"
                    style={{ color: step >= s.n ? 'var(--text)' : 'var(--text3)' }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium" style={{ color: '#818cf8' }}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>

      <div
        className="hidden lg:block w-px self-stretch"
        style={{ background: 'linear-gradient(to bottom,transparent,var(--border),transparent)' }}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -bottom-8 -left-8 w-64 h-64 rounded-full opacity-[.04]"
            style={{ background: 'radial-gradient(circle,#6366f1,transparent)', filter: 'blur(50px)' }}
          />
          <svg className="absolute bottom-0 left-0 right-0 w-full opacity-20" viewBox="0 0 800 100" fill="none">
            <path
              d="M0 70 C150 30 300 90 500 50 C700 10 780 60 800 40 L800 100 L0 100 Z"
              fill="rgba(99,102,241,0.1)"
            />
          </svg>
        </div>

        <div className="lg:hidden mb-8 relative z-10">
          <Logo />
        </div>

        <div className="w-full max-w-[400px] mb-4 relative z-10 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
              Bước {step}/3
            </span>
            <span className="text-[11px] font-medium" style={{ color: '#818cf8' }}>
              {step === 1 ? 'Thông tin tài khoản' : step === 2 ? 'Loại người dùng' : 'Môn học & Mục tiêu'}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
            />
          </div>
        </div>

        <div className="w-full max-w-[400px] relative z-10 max-h-[calc(100vh-130px)] overflow-y-auto pr-1 overscroll-contain">
          {step === 1 && (
            <div>
              <h1 className="text-[24px] font-bold mb-1" style={{ color: 'var(--text)' }}>
                Tạo tài khoản
              </h1>
              <p className="text-[13px] mb-5" style={{ color: 'var(--text3)' }}>
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-medium" style={{ color: '#818cf8' }}>
                  Đăng nhập
                </Link>
              </p>

              <button
                onClick={handleGoogle}
                className="w-full h-11 flex items-center justify-center gap-3 rounded-xl text-[13px] font-medium mb-4 transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text2)',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Tiếp tục với Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  hoặc
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleSubmit(onStep1)} className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Họ và tên
                  </label>
                  <input
                    {...register('fullName')}
                    placeholder="Nguyễn Văn A"
                    className={inp(!!errors.fullName)}
                    style={{
                      background: errors.fullName ? 'rgba(239,68,68,.08)' : 'var(--bg2)',
                      border: `1px solid ${errors.fullName ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className={inp(!!errors.email)}
                    style={{
                      background: errors.email ? 'rgba(239,68,68,.08)' : 'var(--bg2)',
                      border: `1px solid ${errors.email ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                  />
                  {errors.email && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Tối thiểu 6 ký tự"
                      className={inp(!!errors.password) + ' pr-10'}
                      style={{
                        background: errors.password ? 'rgba(239,68,68,.08)' : 'var(--bg2)',
                        border: `1px solid ${errors.password ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
                        color: 'var(--text)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text3)' }}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirm')}
                      type={showCf ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      className={inp(!!errors.confirm) + ' pr-10'}
                      style={{
                        background: errors.confirm ? 'rgba(239,68,68,.08)' : 'var(--bg2)',
                        border: `1px solid ${errors.confirm ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
                        color: 'var(--text)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text3)' }}
                    >
                      {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {errors.confirm.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setValue('agreeTerms', !agreed, { shouldValidate: true })}
                    className="w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                    style={{
                      background: agreed ? '#6366f1' : 'transparent',
                      borderColor: agreed ? '#6366f1' : 'var(--border)',
                    }}
                  >
                    {agreed && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>

                  <input type="checkbox" className="hidden" {...register('agreeTerms')} />

                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text2)' }}>
                    Tôi đồng ý với{' '}
                    <span className="cursor-pointer" style={{ color: '#818cf8' }}>
                      Điều khoản dịch vụ
                    </span>{' '}
                    và{' '}
                    <span className="cursor-pointer" style={{ color: '#818cf8' }}>
                      Chính sách bảo mật
                    </span>
                  </p>
                </div>

                {errors.agreeTerms && (
                  <p className="text-[11px]" style={{ color: '#f87171' }}>
                    {errors.agreeTerms.message}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 mt-1"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  Tiếp theo <ArrowRight size={15} />
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-[24px] font-bold mb-1" style={{ color: 'var(--text)' }}>
                Bạn là ai? 🎓
              </h1>
              <p className="text-[13px] mb-5" style={{ color: 'var(--text3)' }}>
                Giúp chúng mình cá nhân hóa trải nghiệm cho bạn
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {USER_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setUserType(t.id)}
                    className="p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5"
                    style={
                      userType === t.id
                        ? {
                            borderColor: `${t.color}99`,
                            background: `${t.color}12`,
                          }
                        : {
                            borderColor: 'var(--border)',
                            background: 'var(--bg2)',
                          }
                    }
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5"
                      style={{ background: t.color + '20' }}
                    >
                      <t.icon size={16} style={{ color: t.color }} />
                    </div>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                      {t.label}
                    </p>
                    {userType === t.id && (
                      <div
                        className="mt-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: t.color }}
                      >
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                  Trường học / Tổ chức <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(tuỳ chọn)</span>
                </label>
                <AcademicSelect
                  value={school}
                  onChange={selectSchool}
                  options={userType === 'STUDENT' ? academicCatalog.schools : schoolOptions}
                  placeholder={userType === 'STUDENT' ? 'Chọn trường đại học' : 'Chọn trường học / tổ chức'}
                  type="school"
                  loading={userType === 'STUDENT' && academicCatalog.loading}
                  helperText="Bấm để chọn từ danh sách, không cần nhập tên."
                />
              </div>

              {userType === 'STUDENT' && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Chuy?n ng?nh ?ang h?c
                  </label>
                  <AcademicSelect
                    value={major}
                    onChange={setMajor}
                    options={academicCatalog.majors}
                    placeholder={school ? 'Chọn ngành trường đang đào tạo' : 'Chọn ngành học hoặc hướng nghề'}
                    type="major"
                    loading={academicCatalog.loading}
                    helperText={school
                      ? `Danh sách được lọc theo ${school}.`
                      : 'Có thể chọn ngành trước; danh mục bao phủ nhiều nhóm ngành và hướng nghề.'}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="h-11 px-4 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-all"
                  style={{
                    color: 'var(--text2)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg2)',
                  }}
                >
                  <ArrowLeft size={14} /> Quay lại
                </button>

                <button
                  onClick={() => userType ? setStep(3) : toast('Hãy chọn loại người dùng!')}
                  className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  Tiếp theo <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-[24px] font-bold mb-1" style={{ color: 'var(--text)' }}>
                {userType === 'STUDENT' ? 'Chuyên ngành, môn học & mục tiêu' : 'Môn học & Mục tiêu 🎯'}
              </h1>
              <p className="text-[13px] mb-4" style={{ color: 'var(--text3)' }}>
                AI sẽ gợi ý bạn học và lập kế hoạch tối ưu cho bạn
              </p>

              <div className="mb-4">
                <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  {userType === 'STUDENT' ? 'Môn/kỹ năng trong chuyên ngành bạn học tốt?' : 'Bạn giỏi môn gì?'} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({strong.length}/4)</span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {subjectOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s, strong, setStrong)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all"
                      style={
                        strong.includes(s)
                          ? {
                              borderColor: 'rgba(34,197,94,.45)',
                              background: 'rgba(34,197,94,.12)',
                              color: '#4ade80',
                            }
                          : {
                              borderColor: 'var(--border)',
                              background: 'var(--bg2)',
                              color: 'var(--text2)',
                            }
                      }
                    >
                      {strong.includes(s) && '✓ '}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  {userType === 'STUDENT' ? 'Môn/kỹ năng bạn muốn học hoặc cần cải thiện?' : 'Cần cải thiện môn gì?'} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({weak.length}/4)</span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {subjectOptions.filter(s => !strong.includes(s)).map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s, weak, setWeak)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all"
                      style={
                        weak.includes(s)
                          ? {
                              borderColor: 'rgba(245,158,11,.45)',
                              background: 'rgba(245,158,11,.12)',
                              color: '#fbbf24',
                            }
                          : {
                              borderColor: 'var(--border)',
                              background: 'var(--bg2)',
                              color: 'var(--text2)',
                            }
                      }
                    >
                      {weak.includes(s) && '📚 '}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  {userType === 'STUDENT' ? 'Ngành/mảng quan tâm khác' : 'Tag quan tâm khác'}
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {(fieldOptions.length ? fieldOptions : subjectOptions).filter(s => !strong.includes(s) && !weak.includes(s)).slice(0, 16).map(s => (
                    <button
                      key={s}
                      onClick={() => toggleInterest(s)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all"
                      style={
                        interests.includes(s)
                          ? {
                              borderColor: 'rgba(99,102,241,.45)',
                              background: 'rgba(99,102,241,.12)',
                              color: '#a5b4fc',
                            }
                          : {
                              borderColor: 'var(--border)',
                              background: 'var(--bg2)',
                              color: 'var(--text2)',
                            }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={customInterest}
                    onChange={e => setCustomInterest(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomInterest()
                      }
                    }}
                    placeholder="Thêm ngành/môn quan tâm riêng"
                    className="flex-1 h-9 px-3 rounded-lg text-[12px] outline-none"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                  <button
                    type="button"
                    onClick={addCustomInterest}
                    className="h-9 px-3 rounded-lg text-[12px] font-medium"
                    style={{ background: 'rgba(99,102,241,.14)', color: '#a5b4fc' }}
                  >
                    Thêm
                  </button>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[12px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  Mục tiêu học tập?
                </p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {goalOptions.map(g => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border text-[12px] transition-all"
                      style={
                        goal === g
                          ? {
                              borderColor: 'rgba(99,102,241,.45)',
                              background: 'rgba(99,102,241,.10)',
                              color: '#a5b4fc',
                            }
                          : {
                              borderColor: 'var(--border)',
                              background: 'var(--bg2)',
                              color: 'var(--text2)',
                            }
                      }
                    >
                      {goal === g && '✓ '}
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  Gợi ý thời khóa biểu học tập
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => applySchedulePreset('EVENING')} className="px-2.5 py-1.5 rounded-lg text-[11px]" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                    Tối T2-T4-T6
                  </button>
                  <button type="button" onClick={() => applySchedulePreset('WEEKEND')} className="px-2.5 py-1.5 rounded-lg text-[11px]" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                    Cuối tuần
                  </button>
                  <button type="button" onClick={() => applySchedulePreset('MORNING')} className="px-2.5 py-1.5 rounded-lg text-[11px]" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                    Sáng sớm
                  </button>
                </div>
                <div className="overflow-auto max-h-56">
                  <table className="w-full min-w-[360px] text-[11px]">
                    <thead>
                      <tr>
                        <th className="py-1 pr-2 text-left font-medium" style={{ color: 'var(--text3)' }}>Giờ</th>
                        {DAYS.map(d => (
                          <th key={d.key} className="py-1 px-0.5 font-medium" style={{ color: 'var(--text3)' }}>
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(slot => (
                        <tr key={slot.start}>
                          <td className="py-1 pr-2 whitespace-nowrap" style={{ color: 'var(--text3)' }}>{slot.label}</td>
                          {DAYS.map(d => (
                            <td key={d.key} className="py-1 px-0.5 text-center">
                              <button
                                onClick={() => toggleSlot(d.key, slot.start, slot.end)}
                                className="w-8 h-7 rounded-md border transition-all"
                                style={{
                                  background: isSlotSelected(d.key, slot.start) ? 'rgba(99,102,241,.75)' : 'var(--bg2)',
                                  borderColor: isSlotSelected(d.key, slot.start) ? '#6366f1' : 'var(--border)',
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] mt-2" style={{ color: 'var(--text3)' }}>
                  Đã chọn {schedule.length} khung giờ. Hệ thống dùng lịch này để gợi ý bạn học trùng thời gian và tạo lịch ôn môn cần cải thiện.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="h-11 px-4 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-all"
                  style={{
                    color: 'var(--text2)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg2)',
                  }}
                >
                  <ArrowLeft size={14} /> Quay lại
                </button>

                <button
                  onClick={onFinish}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Đang tạo...
                    </>
                  ) : (
                    <>
                      <span>Bắt đầu học!</span> 🚀
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text3)' }}>
                Bạn có thể thay đổi thông tin này sau trong Cài đặt
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
