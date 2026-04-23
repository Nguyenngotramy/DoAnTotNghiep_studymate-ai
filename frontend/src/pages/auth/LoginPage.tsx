import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import {
  Eye, EyeOff, Loader2, BookOpen, Brain, Users, Trophy, ArrowRight, Check
} from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  agreeTerms: z.boolean().refine(v => v === true, 'Bạn phải đồng ý điều khoản để tiếp tục'),
})
type FormData = z.infer<typeof schema>

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

const FEATURES = [
  { icon: Brain, text: 'AI dự đoán học lực & lập kế hoạch cá nhân', color: '#8b5cf6' },
  { icon: Users, text: 'Học nhóm thông minh với Kanban & Chat AI', color: '#14b8a6' },
  { icon: BookOpen, text: 'Flashcard, Quiz tự động từ tài liệu', color: '#f59e0b' },
  { icon: Trophy, text: 'Bảng xếp hạng XP & streak hàng ngày', color: '#ec4899' },
]

function CloudWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 1440 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ marginBottom: -2 }}>
        <path
          d="M0 160 C180 100 360 200 540 140 C720 80 900 180 1080 120 C1260 60 1380 140 1440 100 L1440 220 L0 220 Z"
          fill="rgba(99,102,241,0.06)"
        />
      </svg>

      <svg viewBox="0 0 1440 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full absolute bottom-0" style={{ marginBottom: -2 }}>
        <path
          d="M0 120 C200 60 400 150 600 90 C800 30 1000 130 1200 80 C1350 40 1420 100 1440 80 L1440 180 L0 180 Z"
          fill="rgba(139,92,246,0.08)"
        />
      </svg>

      <svg viewBox="0 0 1440 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full absolute bottom-0">
        <path
          d="M0 80 C150 40 300 110 500 60 C700 10 900 90 1100 50 C1280 15 1400 60 1440 40 L1440 140 L0 140 Z"
          fill="rgba(99,102,241,0.1)"
        />
      </svg>

      <div
        className="absolute bottom-8 left-8 w-24 h-12 rounded-full opacity-15"
        style={{ background: 'radial-gradient(ellipse,#6366f1,transparent)', filter: 'blur(12px)' }}
      />
      <div
        className="absolute bottom-16 left-1/3 w-32 h-14 rounded-full opacity-10"
        style={{ background: 'radial-gradient(ellipse,#8b5cf6,transparent)', filter: 'blur(16px)' }}
      />
      <div
        className="absolute bottom-4 right-16 w-28 h-12 rounded-full opacity-12"
        style={{ background: 'radial-gradient(ellipse,#6366f1,transparent)', filter: 'blur(14px)' }}
      />
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { agreeTerms: false },
  })

  const agreed = watch('agreeTerms')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.email, data.password)
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      toast.success(`Chào mừng trở lại, ${res.data.user.fullName}!`)
      navigate(res.data.user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = 'http://localhost:8080/api/oauth2/authorization/google'
  }

  const inp = (err?: boolean) =>
    `w-full h-11 px-4 rounded-xl text-[13px] placeholder:opacity-100 outline-none transition-all ${
      err ? '' : ''
    }`

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-10 relative overflow-hidden"
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
                'radial-gradient(circle at 20% 20%,rgba(99,102,241,.22) 0%,transparent 50%),radial-gradient(circle at 80% 80%,rgba(139,92,246,.16) 0%,transparent 50%)',
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
          <div
            className="absolute top-20 right-10 w-40 h-40 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle,#6366f1,transparent)', filter: 'blur(30px)' }}
          />
          <div
            className="absolute bottom-40 left-10 w-56 h-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)', filter: 'blur(40px)' }}
          />
        </div>

        <CloudWaves />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-[32px] font-bold leading-tight mb-3" style={{ color: 'var(--text)' }}>
              Nền tảng học tập
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                thông minh nhất
              </span>
            </h2>
            <p className="text-[14px] leading-relaxed max-w-xs" style={{ color: 'var(--text2)' }}>
              Kết hợp AI, học nhóm và gamification để nâng cao kết quả học tập của bạn.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'color-mix(in srgb, var(--bg3) 92%, white 8%)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: f.color + '20' }}
                >
                  <f.icon size={14} style={{ color: f.color }} />
                </div>
                <p className="text-[12px]" style={{ color: 'var(--text2)' }}>
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-6">
          {[
            { val: '500+', label: 'Người dùng' },
            { val: '50+', label: 'Nhóm học' },
            { val: '98%', label: 'Hài lòng' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[20px] font-bold" style={{ color: '#6366f1' }}>
                {s.val}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="hidden lg:block w-px self-stretch"
        style={{ background: 'linear-gradient(to bottom,transparent,var(--border),transparent)' }}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full opacity-[.04]"
            style={{ background: 'radial-gradient(circle,#6366f1,transparent)', filter: 'blur(50px)' }}
          />
          <div
            className="absolute -top-10 -right-10 w-60 h-60 rounded-full opacity-[.03]"
            style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)', filter: 'blur(40px)' }}
          />
          <svg className="absolute bottom-0 left-0 right-0 w-full opacity-30" viewBox="0 0 800 120" fill="none">
            <path
              d="M0 80 C100 40 200 100 350 60 C500 20 600 90 800 50 L800 120 L0 120 Z"
              fill="rgba(99,102,241,0.08)"
            />
          </svg>
        </div>

        <div className="lg:hidden mb-8 relative z-10">
          <Logo />
        </div>

        <div className="w-full max-w-[380px] space-y-5 relative z-10">
          <div>
            <h1 className="text-[26px] font-bold mb-1" style={{ color: 'var(--text)' }}>
              Chào mừng trở lại 👋
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-medium transition-colors" style={{ color: '#818cf8' }}>
                Đăng ký ngay
              </Link>
            </p>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl text-[13px] font-medium transition-all hover:-translate-y-0.5 active:translate-y-0"
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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
              hoặc đăng nhập bằng email
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium" style={{ color: 'var(--text2)' }}>
                  Mật khẩu
                </label>
                <Link to="/forgot-password" className="text-[11px] transition-colors" style={{ color: '#818cf8' }}>
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
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

            <div className="flex items-start gap-3">
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
                <span className="cursor-pointer transition-colors" style={{ color: '#818cf8' }}>
                  Điều khoản dịch vụ
                </span>{' '}
                và{' '}
                <span className="cursor-pointer transition-colors" style={{ color: '#818cf8' }}>
                  Chính sách bảo mật
                </span>{' '}
                của StudyMate AI
              </p>
            </div>

            {errors.agreeTerms && (
              <p className="text-[11px] -mt-2" style={{ color: '#f87171' }}>
                {errors.agreeTerms.message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Đang đăng nhập...
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}