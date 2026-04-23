import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/api/axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, Loader2, KeyRound, Eye, EyeOff, Check, ArrowRight } from 'lucide-react'

const emailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'Mã OTP gồm 6 chữ số'),
})

const resetSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm'],
})

type Step = 'email' | 'otp' | 'reset' | 'done'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
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

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = (value + '      ').slice(0, 6).split('')

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const inputs = document.querySelectorAll<HTMLInputElement>('.otp-input')
    if (e.key === 'Backspace' && !digits[idx].trim() && idx > 0) {
      inputs[idx - 1]?.focus()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.replace(/\D/, '').slice(-1)
    const arr = (value + '      ').slice(0, 6).split('')
    arr[idx] = char || ' '
    const next = arr.join('').trimEnd()
    onChange(next)
    if (char) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.otp-input')
      inputs[idx + 1]?.focus()
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKey(e, i)}
          className="otp-input w-11 text-center text-[20px] font-bold rounded-xl border-2 outline-none transition-all"
          style={{
            height: 52,
            color: 'var(--text)',
            background: d.trim() ? 'rgba(99,102,241,.12)' : 'var(--bg2)',
            borderColor: d.trim() ? '#6366f1' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const emailForm = useForm({ resolver: zodResolver(emailSchema) })
  const resetForm = useForm({ resolver: zodResolver(resetSchema) })

  const startCountdown = () => {
    setCountdown(60)
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const onSendOtp = async (data: { email: string }) => {
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setEmail(data.email)
      setStep('otp')
      startCountdown()
      toast.success(`Mã OTP đã được gửi đến ${data.email}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Email không tồn tại trong hệ thống')
    } finally {
      setLoading(false)
    }
  }

  const onVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      toast.error('Vui lòng nhập đủ 6 chữ số')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { email, otp: otp.trim() })
      setStep('reset')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Mã OTP không đúng hoặc đã hết hạn')
    } finally {
      setLoading(false)
    }
  }

  const onResetPassword = async (data: { newPassword: string; confirm: string }) => {
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: otp.trim(),
        newPassword: data.newPassword,
      })
      setStep('done')
      toast.success('Đặt lại mật khẩu thành công!')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  const inp = (err?: boolean) =>
    'w-full h-11 px-4 rounded-xl text-[13px] outline-none transition-all'

  const STEPS: Step[] = ['email', 'otp', 'reset', 'done']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{ background: 'var(--bg)' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[.06]"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[.04]"
          style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)', filter: 'blur(50px)' }}
        />
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 160" fill="none">
          <path
            d="M0 100 C200 50 400 130 700 70 C1000 10 1250 100 1440 60 L1440 160 L0 160 Z"
            fill="rgba(99,102,241,0.05)"
          />
          <path
            d="M0 120 C300 70 600 140 900 90 C1150 50 1350 110 1440 80 L1440 160 L0 160 Z"
            fill="rgba(139,92,246,0.04)"
          />
        </svg>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-[12px] transition-colors"
            style={{ color: 'var(--text3)' }}
          >
            <ArrowLeft size={13} /> Quay lại
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {['email', 'otp', 'reset'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                style={{
                  background:
                    stepIdx > i
                      ? '#22c55e'
                      : stepIdx === i
                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                        : 'var(--bg3)',
                  color: stepIdx >= i ? 'white' : 'var(--text3)',
                  border: stepIdx < i ? '1px solid var(--border)' : 'none',
                }}
              >
                {stepIdx > i ? <Check size={12} /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className="flex-1 h-px w-12"
                  style={{ background: stepIdx > i ? '#22c55e50' : 'var(--border)' }}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-[11px]" style={{ color: 'var(--text3)' }}>
            {step === 'email'
              ? 'Nhập email'
              : step === 'otp'
                ? 'Xác minh OTP'
                : step === 'reset'
                  ? 'Đặt lại mật khẩu'
                  : 'Hoàn thành'}
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          {step === 'email' && (
            <div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(99,102,241,.15)' }}
              >
                <Mail size={24} className="text-indigo-400" />
              </div>
              <h1 className="text-[22px] font-bold text-center mb-1" style={{ color: 'var(--text)' }}>
                Quên mật khẩu?
              </h1>
              <p className="text-[13px] text-center mb-6" style={{ color: 'var(--text3)' }}>
                Nhập email bạn đã đăng ký. Chúng mình sẽ gửi mã OTP 6 chữ số để xác minh.
              </p>

              <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Email đã đăng ký
                  </label>
                  <input
                    {...emailForm.register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className={inp(!!emailForm.formState.errors.email)}
                    style={{
                      background: emailForm.formState.errors.email ? 'rgba(239,68,68,.08)' : 'var(--bg3)',
                      border: `1px solid ${emailForm.formState.errors.email ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {String(emailForm.formState.errors.email.message)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <Mail size={14} /> Gửi mã OTP
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(99,102,241,.15)' }}
              >
                <KeyRound size={24} className="text-indigo-400" />
              </div>
              <h1 className="text-[22px] font-bold text-center mb-1" style={{ color: 'var(--text)' }}>
                Nhập mã OTP
              </h1>
              <p className="text-[13px] text-center mb-1" style={{ color: 'var(--text3)' }}>
                Mã 6 chữ số đã được gửi đến
              </p>
              <p className="text-[13px] font-semibold text-center mb-6" style={{ color: '#818cf8' }}>
                {email}
              </p>

              <div className="mb-6">
                <OtpInput value={otp} onChange={setOtp} />
              </div>

              <button
                onClick={onVerifyOtp}
                disabled={loading || otp.trim().length !== 6}
                className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:-translate-y-0.5 mb-4"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Đang xác minh...
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} /> Xác minh
                  </>
                )}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Gửi lại sau <span style={{ color: '#818cf8', fontWeight: 600 }}>{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      setOtp('')
                      onSendOtp({ email })
                    }}
                    className="text-[12px] transition-colors"
                    style={{ color: '#818cf8' }}
                  >
                    Không nhận được mã? Gửi lại
                  </button>
                )}
              </div>

              <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text3)' }}>
                Mã OTP có hiệu lực trong <span style={{ color: '#fbbf24' }}>15 phút</span>
              </p>
            </div>
          )}

          {step === 'reset' && (
            <div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(99,102,241,.15)' }}
              >
                <KeyRound size={24} className="text-indigo-400" />
              </div>
              <h1 className="text-[22px] font-bold text-center mb-1" style={{ color: 'var(--text)' }}>
                Đặt lại mật khẩu
              </h1>
              <p className="text-[13px] text-center mb-6" style={{ color: 'var(--text3)' }}>
                Tạo mật khẩu mới mạnh cho tài khoản của bạn
              </p>

              <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      {...resetForm.register('newPassword')}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Tối thiểu 6 ký tự"
                      className={inp(!!resetForm.formState.errors.newPassword) + ' pr-10'}
                      style={{
                        background: resetForm.formState.errors.newPassword ? 'rgba(239,68,68,.08)' : 'var(--bg3)',
                        border: `1px solid ${resetForm.formState.errors.newPassword ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
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
                  {resetForm.formState.errors.newPassword && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {String(resetForm.formState.errors.newPassword.message)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      {...resetForm.register('confirm')}
                      type={showCf ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      className={inp(!!resetForm.formState.errors.confirm) + ' pr-10'}
                      style={{
                        background: resetForm.formState.errors.confirm ? 'rgba(239,68,68,.08)' : 'var(--bg3)',
                        border: `1px solid ${resetForm.formState.errors.confirm ? 'rgba(239,68,68,.4)' : 'var(--border)'}`,
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
                  {resetForm.formState.errors.confirm && (
                    <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>
                      {String(resetForm.formState.errors.confirm.message)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Xác nhận mật khẩu mới
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(34,197,94,.15)' }}
              >
                <Check size={28} className="text-green-400" />
              </div>
              <h1 className="text-[22px] font-bold mb-2" style={{ color: 'var(--text)' }}>
                Hoàn tất! 🎉
              </h1>
              <p className="text-[13px] mb-6" style={{ color: 'var(--text2)' }}>
                Mật khẩu của bạn đã được cập nhật thành công.
                Hãy đăng nhập với mật khẩu mới nhé!
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                Đăng nhập ngay <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}