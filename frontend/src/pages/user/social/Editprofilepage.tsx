import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/api/services'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  ArrowLeft, Camera, Save, Loader2, Plus, X,
  User, BookOpen, MapPin, School,
  Target, Clock3
} from 'lucide-react'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6']

const HIGHSCHOOL_SUBJECTS = [
  'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học',
  'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Công nghệ'
]

const STUDENT_SUGGEST_SUBJECTS = [
  'Tiếng Anh', 'Lập trình', 'Cơ sở dữ liệu', 'Mạng máy tính',
  'AI/ML', 'Marketing', 'Kế toán', 'Kinh tế vi mô',
  'Kinh tế vĩ mô', 'Quản trị học', 'Thống kê', 'Xác suất'
]

const USER_TYPES = [
  { id: 'STUDENT', label: 'Sinh viên' },
  { id: 'HIGHSCHOOL', label: 'Học sinh' },
  { id: 'OTHER', label: 'Khác' },
]

const DAYS = [
  { id: 'MON', label: 'Thứ 2' },
  { id: 'TUE', label: 'Thứ 3' },
  { id: 'WED', label: 'Thứ 4' },
  { id: 'THU', label: 'Thứ 5' },
  { id: 'FRI', label: 'Thứ 6' },
  { id: 'SAT', label: 'Thứ 7' },
  { id: 'SUN', label: 'Chủ nhật' },
]

const SKILL_COLORS: Record<string, string> = {
  'Toán': '#6366f1',
  'Tiếng Anh': '#ec4899',
  'Lập trình': '#14b8a6',
  'Vật lý': '#3b82f6',
  'Hóa học': '#22c55e',
  'Sinh học': '#10b981',
  'Ngữ văn': '#f97316',
  'Lịch sử': '#f59e0b',
  'Địa lý': '#84cc16',
  'IELTS': '#06b6d4',
  'TOEIC': '#8b5cf6',
  'AI/ML': '#a855f7',
  'GDCD': '#f43f5e',
  'Tin học': '#0ea5e9',
  'Công nghệ': '#f59e0b',
  'Cơ sở dữ liệu': '#10b981',
  'Mạng máy tính': '#3b82f6',
  'Marketing': '#f97316',
  'Kế toán': '#6366f1',
  'Kinh tế vi mô': '#22c55e',
  'Kinh tế vĩ mô': '#eab308',
  'Quản trị học': '#8b5cf6',
  'Thống kê': '#14b8a6',
  'Xác suất': '#ec4899',
}

const BACKEND = 'http://localhost:8080/api'
const toAbsUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BACKEND + url
}

function nameColor(n?: string) {
  return COLORS[(n?.charCodeAt(0) ?? 0) % COLORS.length]
}

function ini(n?: string) {
  return (n ?? '?')
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(-2)
    .toUpperCase() || '?'
}

function normalizeUnique(arr: string[]) {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))]
}

function fieldClassName(extra = '') {
  return `w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${extra}`
}

type ProfileForm = {
  fullName: string
  bio?: string
  studentCode?: string
  location?: string
  school?: string
  userType?: string
  goal?: string
}

type Skill = {
  subject: string
  level: number
  color: string
}

type Slot = {
  dayOfWeek: string
  startTime: string
  endTime: string
}

export default function EditProfilePage() {
  const { user: me, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const [section, setSection] = useState<'basic' | 'study' | 'skills'>('basic')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [skills, setSkills] = useState<Skill[]>([])
  const [strongSubjects, setStrongSubjects] = useState<string[]>([])
  const [weakSubjects, setWeakSubjects] = useState<string[]>([])
  const [availableSchedule, setAvailableSchedule] = useState<Slot[]>([])

  const [newSkillSubject, setNewSkillSubject] = useState('')
  const [newSkillLevel, setNewSkillLevel] = useState(1)
  const [customStudySubject, setCustomStudySubject] = useState('')
  const [customSkillSubject, setCustomSkillSubject] = useState('')

  const [slotDay, setSlotDay] = useState('MON')
  const [slotStart, setSlotStart] = useState('08:00')
  const [slotEnd, setSlotEnd] = useState('10:00')

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      fullName: '',
      bio: '',
      studentCode: '',
      location: '',
      school: '',
      userType: 'STUDENT',
      goal: '',
    },
  })

  useEffect(() => {
    if (!me) return

    const userType = (me as any).userType ?? 'STUDENT'
    const strong = [...((me as any)?.strongSubjects ?? [])]
    const weak = [...((me as any)?.weakSubjects ?? [])]

    profileForm.reset({
      fullName: me.fullName ?? '',
      bio: (me as any).bio ?? '',
      studentCode: me.studentCode ?? '',
      location: (me as any).location ?? '',
      school: (me as any).school ?? '',
      userType,
      goal: (me as any).goal ?? '',
    })

    setAvatarUrl(toAbsUrl(me.avatar))
    setCoverUrl(toAbsUrl((me as any)?.coverImage))
    setSkills(((me?.skills as any[]) ?? []).map(s => ({ ...s })))
    setStrongSubjects(strong)
    setWeakSubjects(weak)
    setAvailableSchedule([...(me as any)?.availableSchedule ?? []])
  }, [me, profileForm])

  const watchedFullName = profileForm.watch('fullName')
  const watchedUserType = profileForm.watch('userType') || 'STUDENT'
  const color = useMemo(() => nameColor(watchedFullName || me?.fullName), [watchedFullName, me?.fullName])

  const baseSubjects = useMemo(() => {
    return watchedUserType === 'HIGHSCHOOL' ? HIGHSCHOOL_SUBJECTS : STUDENT_SUGGEST_SUBJECTS
  }, [watchedUserType])

  const allStudySubjects = useMemo(() => {
    return normalizeUnique([
      ...baseSubjects,
      ...strongSubjects,
      ...weakSubjects,
      ...skills.map(s => s.subject),
    ])
  }, [baseSubjects, strongSubjects, weakSubjects, skills])

  const availableSkillSubjects = useMemo(() => {
    return normalizeUnique([
      ...baseSubjects,
      ...strongSubjects,
      ...weakSubjects,
      ...skills.map(s => s.subject),
    ])
  }, [baseSubjects, strongSubjects, weakSubjects, skills])

  const toggleStrongSubject = (subject: string) => {
    if (strongSubjects.includes(subject)) {
      setStrongSubjects(prev => prev.filter(x => x !== subject))
      return
    }
    if (weakSubjects.includes(subject)) {
      toast.error('Môn này đang nằm trong danh sách cần cải thiện')
      return
    }
    setStrongSubjects(prev => normalizeUnique([...prev, subject]))
  }

  const toggleWeakSubject = (subject: string) => {
    if (weakSubjects.includes(subject)) {
      setWeakSubjects(prev => prev.filter(x => x !== subject))
      return
    }
    if (strongSubjects.includes(subject)) {
      toast.error('Môn này đang nằm trong danh sách thế mạnh')
      return
    }
    setWeakSubjects(prev => normalizeUnique([...prev, subject]))
  }

  const addCustomStudySubject = () => {
    const subject = customStudySubject.trim()
    if (!subject) {
      toast.error('Nhập tên môn trước')
      return
    }
    if (allStudySubjects.includes(subject)) {
      toast.error('Môn này đã tồn tại')
      return
    }
    setStrongSubjects(prev => normalizeUnique([...prev, subject]))
    setCustomStudySubject('')
    toast.success('Đã thêm môn mới vào danh sách')
  }

  const addSkill = () => {
    if (!newSkillSubject) {
      toast.error('Hãy chọn hoặc nhập môn học')
      return
    }
    if (skills.some(s => s.subject === newSkillSubject)) {
      toast.error('Môn học đã tồn tại')
      return
    }
    setSkills(prev => [
      ...prev,
      {
        subject: newSkillSubject,
        level: newSkillLevel,
        color: SKILL_COLORS[newSkillSubject] ?? '#6366f1',
      },
    ])
    setNewSkillSubject('')
    setNewSkillLevel(1)
  }

  const addCustomSkillSubject = () => {
    const subject = customSkillSubject.trim()
    if (!subject) {
      toast.error('Nhập tên môn trước')
      return
    }
    if (availableSkillSubjects.includes(subject) || skills.some(s => s.subject === subject)) {
      toast.error('Môn này đã tồn tại')
      return
    }
    setNewSkillSubject(subject)
    setCustomSkillSubject('')
    toast.success('Đã thêm môn để chọn')
  }

  const removeSkill = (subject: string) => {
    setSkills(prev => prev.filter(s => s.subject !== subject))
  }

  const updateSkillLevel = (subject: string, level: number) => {
    setSkills(prev => prev.map(s => (s.subject === subject ? { ...s, level } : s)))
  }

  const addSlot = () => {
    if (slotStart >= slotEnd) {
      toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc')
      return
    }
    const exists = availableSchedule.some(
      s => s.dayOfWeek === slotDay && s.startTime === slotStart && s.endTime === slotEnd,
    )
    if (exists) {
      toast.error('Khung giờ này đã tồn tại')
      return
    }
    setAvailableSchedule(prev => [...prev, { dayOfWeek: slotDay, startTime: slotStart, endTime: slotEnd }])
  }

  const removeSlot = (index: number) => {
    setAvailableSchedule(prev => prev.filter((_, i) => i !== index))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const res = await userApi.uploadAvatar(file)
      setAvatarUrl(toAbsUrl(res.url))
      updateUser({ avatar: res.url } as any)
      toast.success('Đã cập nhật ảnh đại diện')
    } catch {
      toast.error('Lỗi upload ảnh đại diện')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const res = await userApi.uploadCover(file)
      setCoverUrl(toAbsUrl(res.url))
      updateUser({ coverImage: res.url } as any)
      toast.success('Đã cập nhật ảnh bìa')
    } catch {
      toast.error('Lỗi upload ảnh bìa')
    } finally {
      setUploadingCover(false)
    }
  }

  const onSaveProfile = async (data: ProfileForm) => {
    if (!data.fullName?.trim()) {
      toast.error('Họ tên không được để trống')
      return
    }

    setSaving(true)
    try {
      const safeUserType = data.userType === 'TEACHER' ? 'OTHER' : data.userType

      const updated = await userApi.updateProfile({
        ...data,
        userType: safeUserType,
        skills,
        strongSubjects: normalizeUnique(strongSubjects),
        weakSubjects: normalizeUnique(weakSubjects),
        availableSchedule,
        avatar: (me as any)?.avatar || undefined,
        coverImage: (me as any)?.coverImage || undefined,
      } as any)

      updateUser(updated)
      toast.success('Đã lưu hồ sơ')
    } catch {
      toast.error('Lỗi lưu hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>Chỉnh sửa hồ sơ</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
            Cập nhật thông tin cá nhân, học tập và tài khoản
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden border"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="h-36 relative group">
          {coverUrl ? (
            <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${color}55, color-mix(in srgb, ${color} 20%, var(--bg3)))` }}
            />
          )}

          <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all">
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,.28)' }}
            />
            {uploadingCover ? (
              <Loader2 size={18} className="animate-spin text-white relative z-10" />
            ) : (
              <div className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white bg-black/45">
                <Camera size={14} />
                Đổi ảnh bìa
              </div>
            )}
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        </div>

        <div className="px-6 pb-5 -mt-8 flex items-center gap-4">
          <div className="relative group/av">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-16 h-16 rounded-2xl object-cover"
                style={{ boxShadow: '0 0 0 4px var(--bg2)' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${color}, #8b5cf6)`,
                  boxShadow: '0 0 0 4px var(--bg2)',
                }}
              >
                {ini(watchedFullName || me?.fullName)}
              </div>
            )}

            <label className="absolute inset-0 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover/av:opacity-100 transition-all">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'rgba(0,0,0,.35)' }}
              />
              {uploadingAvatar ? (
                <Loader2 size={14} className="animate-spin text-white relative z-10" />
              ) : (
                <Camera size={14} className="text-white relative z-10" />
              )}
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="pt-7">
            <p className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
              {watchedFullName || me?.fullName}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              {me?.email}
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex gap-1 p-1 rounded-xl border"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
      >
        {[
          { id: 'basic', label: 'Cá nhân', icon: User },
          { id: 'study', label: 'Học tập', icon: School },
          { id: 'skills', label: 'Môn học', icon: BookOpen },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setSection(item.id as any)}
            className={clsx(
              'flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-[12px] font-medium transition-all',
              section === item.id && 'shadow-sm'
            )}
            style={
              section === item.id
                ? {
                    background: 'var(--bg2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }
                : {
                    color: 'var(--text3)',
                  }
            }
          >
            <item.icon size={13} />
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl p-5 space-y-5 border"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        {section === 'basic' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                  Họ và tên
                </label>
                <input
                  {...profileForm.register('fullName')}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                  Mã sinh viên / học sinh
                </label>
                <input
                  {...profileForm.register('studentCode')}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="VD: 22521000"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                Giới thiệu bản thân
              </label>
              <textarea
                {...profileForm.register('bio')}
                rows={3}
                className={fieldClassName('resize-none')}
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Viết vài dòng giới thiệu ngắn..."
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                Địa điểm
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                <input
                  {...profileForm.register('location')}
                  className={fieldClassName('pl-9')}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Ví dụ: Đà Nẵng, Việt Nam"
                />
              </div>
            </div>
          </>
        )}

        {section === 'study' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                  Bạn là
                </label>
                <select
                  {...profileForm.register('userType')}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {USER_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                  Trường học / tổ chức
                </label>
                <input
                  {...profileForm.register('school')}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Ví dụ: Đại học Việt Hàn"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text3)' }}>
                Mục tiêu học tập
              </label>
              <div className="relative">
                <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
                <input
                  {...profileForm.register('goal')}
                  className={fieldClassName('pl-9')}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Ví dụ: Đạt IELTS 6.5 trong 6 tháng"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-[12px] font-medium" style={{ color: 'var(--text3)' }}>
                  Môn học thế mạnh
                </label>
                <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  {watchedUserType === 'HIGHSCHOOL' ? 'Bộ môn THPT' : 'Môn học đại học / chuyên ngành'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {allStudySubjects.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleStrongSubject(subject)}
                    className="px-3 py-1.5 rounded-full text-[11px] border transition-all"
                    style={
                      strongSubjects.includes(subject)
                        ? {
                            background: 'rgba(16,185,129,.12)',
                            color: '#34d399',
                            borderColor: 'rgba(16,185,129,.25)',
                          }
                        : {
                            background: 'var(--bg3)',
                            color: 'var(--text2)',
                            borderColor: 'var(--border)',
                          }
                    }
                  >
                    {subject}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={customStudySubject}
                  onChange={e => setCustomStudySubject(e.target.value)}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder={watchedUserType === 'HIGHSCHOOL' ? 'Thêm môn khác nếu cần' : 'Thêm môn chuyên ngành mới'}
                />
                <button
                  type="button"
                  onClick={addCustomStudySubject}
                  className="inline-flex items-center gap-2 px-4 rounded-xl text-[12px] font-medium text-white transition-colors"
                  style={{ background: '#6366f1' }}
                >
                  <Plus size={13} />
                  Thêm môn
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text3)' }}>
                Môn cần cải thiện
              </label>
              <div className="flex flex-wrap gap-2">
                {allStudySubjects.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleWeakSubject(subject)}
                    className="px-3 py-1.5 rounded-full text-[11px] border transition-all"
                    style={
                      weakSubjects.includes(subject)
                        ? {
                            background: 'rgba(244,63,94,.12)',
                            color: '#fb7185',
                            borderColor: 'rgba(244,63,94,.25)',
                          }
                        : {
                            background: 'var(--bg3)',
                            color: 'var(--text2)',
                            borderColor: 'var(--border)',
                          }
                    }
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text3)' }}>
                Thời gian rảnh
              </label>

              <div className="grid grid-cols-4 gap-2 mb-3">
                <select
                  value={slotDay}
                  onChange={e => setSlotDay(e.target.value)}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {DAYS.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>

                <input
                  type="time"
                  value={slotStart}
                  onChange={e => setSlotStart(e.target.value)}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <input
                  type="time"
                  value={slotEnd}
                  onChange={e => setSlotEnd(e.target.value)}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={addSlot}
                  className="rounded-xl text-[12px] font-medium text-white transition-colors"
                  style={{ background: '#6366f1' }}
                >
                  + Thêm
                </button>
              </div>

              <div className="space-y-2">
                {availableSchedule.length === 0 ? (
                  <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Chưa có khung giờ nào</p>
                ) : (
                  availableSchedule.map((slot, index) => {
                    const dayLabel = DAYS.find(d => d.id === slot.dayOfWeek)?.label || slot.dayOfWeek
                    return (
                      <div
                        key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${index}`}
                        className="flex items-center justify-between px-3 py-2 rounded-xl border"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text)' }}>
                          <Clock3 size={13} style={{ color: '#818cf8' }} />
                          {dayLabel}: {slot.startTime} - {slot.endTime}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSlot(index)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: 'var(--text3)' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}

        {section === 'skills' && (
          <>
            <div className="space-y-3">
              {skills.length === 0 && (
                <p className="text-[12px]" style={{ color: 'var(--text3)' }}>Chưa có môn học nào</p>
              )}

              {skills.map(skill => {
                const skillColor = SKILL_COLORS[skill.subject] ?? skill.color ?? '#6366f1'
                return (
                  <div
                    key={skill.subject}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: skillColor + '18' }}
                    >
                      <BookOpen size={13} style={{ color: skillColor }} />
                    </div>

                    <div className="flex-1">
                      <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {skill.subject}
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3].map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateSkillLevel(skill.subject, level)}
                            className="px-2.5 py-1 rounded-lg text-[10px] border transition-all"
                            style={
                              skill.level === level
                                ? { background: skillColor, color: '#fff', borderColor: 'transparent' }
                                : { color: 'var(--text2)', borderColor: 'var(--border)' }
                            }
                          >
                            {['Mới học', 'Khá', 'Giỏi'][level - 1]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSkill(skill.subject)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ color: 'var(--text3)' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <p className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                Thêm môn học mới
              </p>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newSkillSubject}
                  onChange={e => setNewSkillSubject(e.target.value)}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">-- Chọn môn học --</option>
                  {availableSkillSubjects
                    .filter(s => !skills.some(skill => skill.subject === s))
                    .map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <select
                  value={newSkillLevel}
                  onChange={e => setNewSkillLevel(Number(e.target.value))}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value={1}>Mới học</option>
                  <option value={2}>Khá</option>
                  <option value={3}>Giỏi</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  value={customSkillSubject}
                  onChange={e => setCustomSkillSubject(e.target.value)}
                  className={fieldClassName()}
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Tự thêm môn học mới"
                />
                <button
                  type="button"
                  onClick={addCustomSkillSubject}
                  className="inline-flex items-center gap-2 px-4 rounded-xl text-[12px] font-medium text-white transition-colors"
                  style={{ background: '#6366f1' }}
                >
                  <Plus size={13} />
                  Thêm
                </button>
              </div>

              <button
                type="button"
                onClick={addSkill}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-colors"
                style={{ background: '#6366f1' }}
              >
                <Plus size={13} />
                Thêm môn học
              </button>
            </div>
          </>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={profileForm.handleSubmit(onSaveProfile)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-60 text-[13px] font-semibold text-white transition-colors"
            style={{ background: '#6366f1' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}