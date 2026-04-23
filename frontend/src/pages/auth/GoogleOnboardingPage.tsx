import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'
import toast from 'react-hot-toast'
import { ArrowRight, ArrowLeft, GraduationCap, BookOpen, School, Users2, Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const SUBJECTS = [
  'Toán','Tiếng Anh','Lập trình','Vật lý','Hóa học',
  'Sinh học','Ngữ văn','Lịch sử','Địa lý','IELTS','AI/ML'
]
const GOALS = [
  'Cải thiện GPA học kỳ này',
  'Đạt chứng chỉ tiếng Anh (IELTS/TOEIC)',
  'Chuẩn bị thi đại học',
  'Học thêm kỹ năng mới',
  'Ôn thi tốt nghiệp',
]
const USER_TYPES = [
  { id:'STUDENT',    icon: GraduationCap, label:'Sinh viên ĐH', color:'#6366f1' },
  { id:'HIGHSCHOOL', icon: School,        label:'Học sinh THPT', color:'#14b8a6' },
  { id:'TEACHER',    icon: BookOpen,      label:'Giáo viên',     color:'#f59e0b' },
  { id:'OTHER',      icon: Users2,        label:'Khác',          color:'#8b5cf6' },
]

const DAYS = [
  { key: 'MON', label: 'T2' }, { key: 'TUE', label: 'T3' },
  { key: 'WED', label: 'T4' }, { key: 'THU', label: 'T5' },
  { key: 'FRI', label: 'T6' }, { key: 'SAT', label: 'T7' },
  { key: 'SUN', label: 'CN' },
]
const TIME_SLOTS = [
  { start: '06:00', end: '08:00', label: '6h-8h' },
  { start: '08:00', end: '10:00', label: '8h-10h' },
  { start: '10:00', end: '12:00', label: '10h-12h' },
  { start: '13:00', end: '15:00', label: '13h-15h' },
  { start: '15:00', end: '17:00', label: '15h-17h' },
  { start: '17:00', end: '19:00', label: '17h-19h' },
  { start: '19:00', end: '21:00', label: '19h-21h' },
  { start: '21:00', end: '23:00', label: '21h-23h' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
          <path d="M10 2.5L17 6.25V13.75L10 17.5L3 13.75V6.25L10 2.5Z"
            stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M10 7.5v5M7.5 10h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <div className="text-[15px] font-bold text-[#f0f0f5] leading-none">StudyMate AI</div>
        <div className="text-[9px] text-[#5a5a6e] uppercase tracking-[.12em] mt-0.5">Học nhóm thông minh</div>
      </div>
    </div>
  )
}

export default function GoogleOnboardingPage() {
  const { user, updateUser } = useAuthStore()
  const navigate = useNavigate()

  const [step,     setStep]    = useState(1)
  const [loading,  setLoading] = useState(false)
  const [userType, setUserType]= useState('')
  const [school,   setSchool]  = useState('')
  const [strong,   setStrong]  = useState<string[]>([])
  const [weak,     setWeak]    = useState<string[]>([])
  const [goal,     setGoal]    = useState('')
  const [schedule, setSchedule]= useState<{day:string,start:string,end:string}[]>([])

  const toggleSlot = (day: string, start: string, end: string) => {
    const exists = schedule.find(s => s.day === day && s.start === start)
    if (exists) setSchedule(prev => prev.filter(s => !(s.day === day && s.start === start)))
    else setSchedule(prev => [...prev, { day, start, end }])
  }
  const isSelected = (day: string, start: string) =>
    schedule.some(s => s.day === day && s.start === start)

  const toggleSubject = (sub: string, list: string[], setList: (v:string[])=>void) => {
    if (list.includes(sub)) setList(list.filter(s => s !== sub))
    else if (list.length < 4) setList([...list, sub])
    else toast('Chọn tối đa 4 môn!')
  }

  const onFinish = async () => {
    setLoading(true)
    try {
      const availableSchedule = schedule.map(s => ({
        dayOfWeek: s.day,
        startTime: s.start,
        endTime:   s.end,
      }))

      const res = await api.put('/auth/me', {
        userType, school,
        strongSubjects: strong,
        weakSubjects:   weak,
        goal,
        availableSchedule,
        interests: [...strong, ...weak.filter(s => !strong.includes(s))],
        onboardingDone: true,
      })
      if (strong.length > 0 || weak.length > 0) {
        const skills = [
          ...strong.map(s => ({ subject: s, level: 3, color: '#6366f1' })),
          ...weak.filter(s => !strong.includes(s)).map(s => ({ subject: s, level: 1, color: '#6366f1' })),
        ]
        await api.put('/auth/me/skills', { skills })
      }
      updateUser({ ...res.data.data, onboardingDone: true })
      toast.success('Hồ sơ đã được thiết lập! Chào mừng đến với StudyMate AI 🎉')
      navigate('/dashboard', { replace: true })
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: '#0a0a0f' }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[.06]"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent)', filter: 'blur(60px)' }}/>
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 140" fill="none">
          <path d="M0 90 C200 40 500 120 800 60 C1100 10 1300 90 1440 50 L1440 140 L0 140 Z"
            fill="rgba(99,102,241,0.06)"/>
        </svg>
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Logo/>
          <div className="flex items-center gap-1.5 text-[12px] text-[#5a5a6e] px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(99,102,241,.1)', border: '0.5px solid rgba(99,102,241,.2)' }}>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng nhập qua Google
          </div>
        </div>

        {/* Welcome */}
        <div className="text-center mb-6">
          <p className="text-[13px] text-[#8b8b9e] mb-1">Chào mừng,</p>
          <h1 className="text-[22px] font-bold text-[#f0f0f5] mb-1">{user?.fullName} 👋</h1>
          <p className="text-[13px] text-[#5a5a6e]">
            Trả lời vài câu hỏi để cá nhân hóa trải nghiệm của bạn
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[#5a5a6e]">Bước {step}/3</span>
            <span className="text-[11px] text-indigo-400 font-medium">
              {step === 1 ? 'Bạn là ai?' : step === 2 ? 'Môn học & Mục tiêu' : 'Lịch rảnh'}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width:`${(step/3)*100}%`, background:'linear-gradient(90deg,#6366f1,#8b5cf6)' }}/>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#14141c', border: '0.5px solid rgba(255,255,255,.08)' }}>

          {/* ── STEP 1: User type ── */}
          {step === 1 && (
            <div>
              <h2 className="text-[18px] font-bold text-[#f0f0f5] mb-4">Bạn là ai? 🎓</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {USER_TYPES.map(t => (
                  <button key={t.id} onClick={() => setUserType(t.id)}
                    className={clsx('p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5',
                      userType===t.id ? 'border-indigo-500/60' : 'border-white/[.08] hover:border-white/[.15]')}
                    style={userType===t.id ? {background:t.color+'12'} : {background:'#1e1e2e'}}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5"
                      style={{background:t.color+'20'}}>
                      <t.icon size={16} style={{color:t.color}}/>
                    </div>
                    <p className="text-[12px] font-semibold text-[#f0f0f5]">{t.label}</p>
                    {userType===t.id && (
                      <div className="mt-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{background:t.color}}>
                        <Check size={10} className="text-white"/>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-[#8b8b9e] mb-1.5">
                  Trường học <span className="text-[#5a5a6e]">(tuỳ chọn)</span>
                </label>
                <input value={school} onChange={e => setSchool(e.target.value)}
                  placeholder="VD: ĐH Bách Khoa HCM..."
                  className="w-full h-11 px-4 rounded-xl text-[13px] text-[#f0f0f5] placeholder-[#5a5a6e] outline-none bg-[#1e1e2e] border border-white/[.08] focus:border-indigo-500/60 transition-all"/>
              </div>
              <button onClick={() => userType ? setStep(2) : toast('Hãy chọn loại người dùng!')}
                className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                Tiếp theo <ArrowRight size={15}/>
              </button>
            </div>
          )}

          {/* ── STEP 2: Subjects & Goal ── */}
          {step === 2 && (
            <div>
              <h2 className="text-[18px] font-bold text-[#f0f0f5] mb-4">Môn học & Mục tiêu 🎯</h2>

              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#f0f0f5] mb-1">
                  Bạn giỏi môn gì? <span className="text-[#5a5a6e]">({strong.length}/4)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => toggleSubject(s,strong,setStrong)}
                      className={clsx('text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                        strong.includes(s)
                          ? 'border-green-500/50 bg-green-500/15 text-green-400'
                          : 'border-white/[.08] text-[#8b8b9e] hover:border-white/[.2] bg-[#1e1e2e]')}>
                      {strong.includes(s) && '✓ '}{s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#f0f0f5] mb-1">
                  Cần cải thiện môn gì? <span className="text-[#5a5a6e]">({weak.length}/4)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.filter(s=>!strong.includes(s)).map(s => (
                    <button key={s} onClick={() => toggleSubject(s,weak,setWeak)}
                      className={clsx('text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                        weak.includes(s)
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                          : 'border-white/[.08] text-[#8b8b9e] hover:border-white/[.2] bg-[#1e1e2e]')}>
                      {weak.includes(s) && '📚 '}{s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[12px] font-semibold text-[#f0f0f5] mb-2">Mục tiêu học tập?</p>
                <div className="space-y-1.5">
                  {GOALS.map(g => (
                    <button key={g} onClick={() => setGoal(g)}
                      className={clsx('w-full text-left px-3 py-2.5 rounded-xl border text-[12px] transition-all',
                        goal===g
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/[.07] text-[#8b8b9e] hover:border-white/[.15] bg-[#1e1e2e]')}>
                      {goal===g && '✓ '}{g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="h-11 px-4 rounded-xl text-[13px] font-medium text-[#8b8b9e] border border-white/[.08] flex items-center gap-2 hover:bg-white/[.04] transition-all">
                  <ArrowLeft size={14}/> Quay lại
                </button>
                <button onClick={() => {
                    if (weak.length === 0) { toast('Chọn ít nhất 1 môn cần cải thiện!'); return }
                    setStep(3)
                  }}
                  className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                  Tiếp theo <ArrowRight size={15}/>
                </button>
              </div>

              <p className="text-center text-[11px] text-[#5a5a6e] mt-3">
                Có thể thay đổi sau trong Cài đặt · <button onClick={() => setStep(3)} className="text-indigo-400 hover:text-indigo-300">Bỏ qua</button>
              </p>
            </div>
          )}

          {/* ── STEP 3: Lịch rảnh ── */}
          {step === 3 && (
            <div>
              <h2 className="text-[18px] font-bold text-[#f0f0f5] mb-1">Lịch rảnh 📅</h2>
              <p className="text-[12px] text-[#8b8b9e] mb-4">
                Chọn khung giờ bạn thường rảnh — dùng để tìm bạn học phù hợp
              </p>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-[11px] min-w-[340px]">
                  <thead>
                    <tr>
                      <th className="text-[#8b8b9e] font-normal py-2 pr-2 text-left w-14">Giờ</th>
                      {DAYS.map(d => (
                        <th key={d.key} className="text-[#8b8b9e] font-normal py-2 px-0.5 text-center">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map(slot => (
                      <tr key={slot.start}>
                        <td className="text-[#5a5a6e] py-1 pr-2 whitespace-nowrap">{slot.label}</td>
                        {DAYS.map(d => (
                          <td key={d.key} className="py-1 px-0.5 text-center">
                            <button
                              onClick={() => toggleSlot(d.key, slot.start, slot.end)}
                              className="w-8 h-7 rounded-md transition-all"
                              style={{
                                background: isSelected(d.key, slot.start)
                                  ? 'rgba(99,102,241,0.75)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isSelected(d.key, slot.start) ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-[#8b8b9e] mt-3 mb-5">
                Đã chọn: <span className="text-indigo-400 font-medium">{schedule.length} khung giờ</span>
                {schedule.length === 0 && <span className="text-[#5a5a6e]"> — có thể bỏ qua</span>}
              </p>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="h-11 px-4 rounded-xl text-[13px] font-medium text-[#8b8b9e] border border-white/[.08] flex items-center gap-2 hover:bg-white/[.04] transition-all">
                  <ArrowLeft size={14}/> Quay lại
                </button>
                <button onClick={onFinish} disabled={loading}
                  className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                  {loading
                    ? <><Loader2 size={15} className="animate-spin"/> Đang lưu...</>
                    : <><span>Bắt đầu học!</span> 🚀</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}