import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  UserCircle, Mail, GraduationCap, MapPin, Target,
  BookOpen, Clock3, ShieldCheck, ChevronRight, Sparkles
} from 'lucide-react'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6']

function nameColor(n?: string) {
  return COLORS[(n?.charCodeAt(0) ?? 0) % COLORS.length]
}

function initials(name?: string) {
  return (name ?? '?')
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(-2)
    .toUpperCase() || '?'
}

function formatUserType(userType?: string) {
  switch (userType) {
    case 'STUDENT':
      return 'Sinh viên'
    case 'HIGHSCHOOL':
      return 'Học sinh'
    case 'TEACHER':
      return 'Giáo viên'
    case 'OTHER':
      return 'Khác'
    default:
      return 'Chưa cập nhật'
  }
}

function formatDay(day?: string) {
  switch (day) {
    case 'MON': return 'Thứ 2'
    case 'TUE': return 'Thứ 3'
    case 'WED': return 'Thứ 4'
    case 'THU': return 'Thứ 5'
    case 'FRI': return 'Thứ 6'
    case 'SAT': return 'Thứ 7'
    case 'SUN': return 'Chủ nhật'
    default: return day ?? ''
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const color = useMemo(() => nameColor(user?.fullName), [user?.fullName])

  const summaryItems = [
    {
      icon: GraduationCap,
      label: 'Bạn là',
      value: formatUserType((user as any)?.userType),
    },
    {
      icon: MapPin,
      label: 'Trường học',
      value: (user as any)?.school || 'Chưa cập nhật',
    },
    {
      icon: Target,
      label: 'Mục tiêu',
      value: (user as any)?.goal || 'Chưa cập nhật',
    },
    {
      icon: BookOpen,
      label: 'Môn thế mạnh',
      value:
        (user as any)?.strongSubjects?.length > 0
          ? (user as any).strongSubjects.join(', ')
          : 'Chưa cập nhật',
    },
    {
      icon: Clock3,
      label: 'Lịch rảnh',
      value:
        (user as any)?.availableSchedule?.length > 0
          ? `${(user as any).availableSchedule.length} khung giờ`
          : 'Chưa cập nhật',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[#f0f0f5]">Hồ sơ & tài khoản</h1>
          <p className="text-[12px] text-[#5a5a6e] mt-1">
            Xem nhanh thông tin cá nhân và chỉnh sửa hồ sơ của bạn
          </p>
        </div>

        <button
          onClick={() => navigate('/profile/edit')}
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[12px] font-medium text-white transition-colors"
        >
          Chỉnh sửa hồ sơ
        </button>
      </div>

      <div className="bg-[#16161d] border border-white/[.07] rounded-2xl overflow-hidden">
        <div
          className="h-28"
          style={{
            background: `linear-gradient(135deg, ${color}40, #1a1a24 70%, #0f0f16)`,
          }}
        />

        <div className="px-6 pb-6 -mt-8 flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl ring-4 ring-[#16161d] flex items-center justify-center text-[20px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${color}, #8b5cf6)` }}
          >
            {initials(user?.fullName)}
          </div>

          <div className="flex-1 min-w-0 pt-8">
            <div className="flex items-center gap-2">
              <p className="text-[18px] font-semibold text-[#f0f0f5] truncate">
                {user?.fullName || 'Người dùng'}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
              </span>
            </div>

            <p className="text-[12px] text-[#8b8b9e] mt-1">
              {(user as any)?.bio || 'Thành viên StudyMate AI'}
            </p>

            <div className="flex flex-wrap gap-4 mt-3 text-[12px] text-[#8b8b9e]">
              <span className="flex items-center gap-1.5">
                <Mail size={12} className="text-indigo-400" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                {(user?.xp ?? 0).toLocaleString()} XP
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-cyan-400" />
                {user?.streak ?? 0} ngày streak
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-[#16161d] border border-white/[.07] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCircle size={16} className="text-indigo-400" />
            <p className="text-[14px] font-semibold text-[#f0f0f5]">Tóm tắt hồ sơ</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[.06] bg-[#1e1e28] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <item.icon size={14} className="text-indigo-400" />
                  <span className="text-[11px] text-[#8b8b9e]">{item.label}</span>
                </div>
                <p className="text-[13px] font-medium text-[#f0f0f5] leading-relaxed">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/profile/edit')}
            className="w-full text-left bg-[#16161d] border border-white/[.07] rounded-2xl p-4 hover:border-indigo-500/30 hover:bg-white/[.02] transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#f0f0f5]">Chỉnh sửa hồ sơ</p>
                <p className="text-[11px] text-[#5a5a6e] mt-1">
                  Cập nhật thông tin cá nhân, học tập, kỹ năng
                </p>
              </div>
              <ChevronRight size={16} className="text-[#5a5a6e]" />
            </div>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="w-full text-left bg-[#16161d] border border-white/[.07] rounded-2xl p-4 hover:border-indigo-500/30 hover:bg-white/[.02] transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#f0f0f5]">Xem hồ sơ công khai</p>
                <p className="text-[11px] text-[#5a5a6e] mt-1">
                  Kiểm tra hồ sơ hiển thị với người khác
                </p>
              </div>
              <ChevronRight size={16} className="text-[#5a5a6e]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}