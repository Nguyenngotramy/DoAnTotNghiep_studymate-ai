import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import {
  ArrowLeft,
  Mail,
  MapPin,
  School,
  GraduationCap,
  Users,
  Brain,
  Lock,
  Unlock,
  KeyRound,
  Send,
  BookOpen,
  CalendarDays,
  Sparkles,
  Activity,
} from 'lucide-react'
import toast from 'react-hot-toast'

function fmtDate(v?: string) {
  if (!v) return '—'
  return new Date(v).toLocaleString()
}

function levelColor(level?: string) {
  switch (level) {
    case 'CRITICAL':
      return '#ef4444'
    case 'WARNING':
      return '#f59e0b'
    case 'INFO':
      return '#818cf8'
    default:
      return '#22c55e'
  }
}

export default function AdminUserDetailPage() {
  const { userId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [message, setMessage] = useState('')

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => adminApi.getUserDetail(userId),
    enabled: !!userId,
  })

  const { data: predictHistory = [] } = useQuery({
    queryKey: ['admin-user-predict-history', userId],
    queryFn: () => adminApi.getUserPredictHistory(userId),
    enabled: !!userId,
  })

  const { data: studyTerms = [] } = useQuery({
    queryKey: ['admin-user-study-terms', userId],
    queryFn: () => adminApi.getUserStudyTerms(userId),
    enabled: !!userId,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['admin-user-activity', userId],
    queryFn: () => adminApi.getUserActivity(userId),
    enabled: !!userId,
  })

  const lockMut = useMutation({
    mutationFn: (id: string) => adminApi.lockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Đã khoá tài khoản')
    },
  })

  const unlockMut = useMutation({
    mutationFn: (id: string) => adminApi.unlockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Đã mở khoá tài khoản')
    },
  })

  const resetMut = useMutation({
    mutationFn: (id: string) => adminApi.resetPassword(id),
    onSuccess: () => toast.success('Đã gửi yêu cầu reset mật khẩu'),
  })

  const supportMut = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => adminApi.sendSupportReminder(id, text),
    onSuccess: () => {
      toast.success('Đã gửi nhắc nhở hỗ trợ học tập')
      setMessage('')
    },
  })

  const user = detail?.user
  const supportStatus = detail?.supportStatus
  const groups = detail?.groups ?? []

  const defaultMessage = useMemo(
    () =>
      'Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp để cải thiện dần nhé.',
    [],
  )

  if (isLoading) {
    return <div className="text-[#c7c7d1]">Đang tải chi tiết người dùng...</div>
  }

  if (!user) {
    return <div className="text-red-400">Không tìm thấy người dùng.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="h-9 px-3 rounded-lg border border-white/[.08] bg-[#1e1e28] text-[#c7c7d1] flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Quay lại
        </button>
        <h1 className="text-[18px] font-semibold text-[#f0f0f5]">Chi tiết người dùng</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4">
        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
              {(user.fullName || '?')
                .split(' ')
                .map((x: string) => x[0] || '')
                .join('')
                .slice(-2)
                .toUpperCase()}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-semibold text-[#f0f0f5]">{user.fullName}</h2>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: user.role === 'ADMIN' ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.06)',
                    color: user.role === 'ADMIN' ? '#818cf8' : '#8b8b9e',
                  }}
                >
                  {user.role === 'ADMIN' ? 'Admin' : 'User'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user.locked ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
                  }`}
                >
                  {user.locked ? 'Đã khóa' : 'Hoạt động'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-[13px] text-[#c7c7d1]">
                <div className="flex items-center gap-2"><Mail size={14} /> {user.email || '—'}</div>
                <div className="flex items-center gap-2"><MapPin size={14} /> {user.location || '—'}</div>
                <div className="flex items-center gap-2"><School size={14} /> {user.school || '—'}</div>
                <div className="flex items-center gap-2"><GraduationCap size={14} /> {user.userType || 'OTHER'}</div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-4">
                {user.role !== 'ADMIN' && (
                  <>
                    <button
                      onClick={() => (user.locked ? unlockMut.mutate(user.id) : lockMut.mutate(user.id))}
                      className={`h-9 px-3 rounded-lg border flex items-center gap-2 text-[12px] ${
                        user.locked
                          ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                          : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      {user.locked ? <Unlock size={13} /> : <Lock size={13} />}
                      {user.locked ? 'Mở khoá' : 'Khoá tài khoản'}
                    </button>

                    <button
                      onClick={() => resetMut.mutate(user.id)}
                      className="h-9 px-3 rounded-lg border border-white/[.08] bg-[#1e1e28] text-[#c7c7d1] flex items-center gap-2 text-[12px]"
                    >
                      <KeyRound size={13} />
                      Reset mật khẩu
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-amber-400" />
            <h3 className="text-[14px] font-semibold text-[#f0f0f5]">Trạng thái hỗ trợ học tập</h3>
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{
              background: `${levelColor(supportStatus?.level)}12`,
              borderColor: `${levelColor(supportStatus?.level)}33`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#c7c7d1]">Mức độ</span>
              <span style={{ color: levelColor(supportStatus?.level) }} className="text-[12px] font-semibold">
                {supportStatus?.level || 'NORMAL'}
              </span>
            </div>
            <div className="mt-2 text-[14px] font-medium text-[#f0f0f5]">{supportStatus?.message || 'Ổn định'}</div>
            <div className="mt-2 text-[12px] text-[#8b8b9e]">
              GPA hiệu lực: {supportStatus?.effectiveGpa ?? '—'} • Nguồn: {supportStatus?.source || '—'}
            </div>
          </div>

          <textarea
            rows={4}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={defaultMessage}
            className="w-full mt-4 rounded-xl border border-white/[.08] bg-[#111118] px-3 py-3 text-[12px] text-[#f0f0f5] outline-none resize-none"
          />

          <button
            onClick={() => supportMut.mutate({ id: user.id, text: message || defaultMessage })}
            className="mt-3 h-10 px-4 rounded-xl bg-indigo-500 text-white text-[12px] font-medium flex items-center gap-2"
          >
            <Send size={13} />
            Gửi nhắc nhở hỗ trợ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Số nhóm tham gia', value: detail?.groupCount ?? 0, icon: Users },
          { label: 'Số học kỳ đã lưu', value: detail?.studyTermCount ?? 0, icon: BookOpen },
          { label: 'Số lượt dự đoán', value: detail?.predictCount ?? 0, icon: Sparkles },
          { label: 'Hoạt động gần đây', value: activities.length, icon: Activity },
        ].map(item => (
          <div key={item.label} className="bg-[#1a1a24] border border-white/[.06] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#8b8b9e]">{item.label}</span>
              <item.icon size={14} className="text-indigo-400" />
            </div>
            <div className="text-[24px] font-semibold font-mono text-[#f0f0f5]">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Nhóm đang tham gia</h3>
          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-[12px] text-[#6b6b80]">Chưa tham gia nhóm nào.</p>
            ) : (
              groups.map((g: any) => (
                <div key={g.id} className="rounded-xl border border-white/[.06] bg-[#111118] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-[#f0f0f5]">{g.name}</div>
                      <div className="text-[11px] text-[#8b8b9e]">{g.subject || 'Chưa có môn học'}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                      {g.roleInGroup}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[#6b6b80]">
                    {g.memberCount} thành viên • Tham gia: {fmtDate(g.joinedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Hồ sơ học tập</h3>
          <div className="space-y-2 text-[12px]">
            <div className="text-[#c7c7d1]">Trường: <span className="text-[#f0f0f5]">{detail?.studyProfile?.schoolName || '—'}</span></div>
            <div className="text-[#c7c7d1]">Lớp: <span className="text-[#f0f0f5]">{detail?.studyProfile?.className || '—'}</span></div>
            <div className="text-[#c7c7d1]">Khối: <span className="text-[#f0f0f5]">{detail?.studyProfile?.gradeLevel || '—'}</span></div>
            <div className="text-[#c7c7d1]">Ngành: <span className="text-[#f0f0f5]">{detail?.studyProfile?.major || '—'}</span></div>
            <div className="text-[#c7c7d1]">Mục tiêu: <span className="text-[#f0f0f5]">{detail?.studyProfile?.targetGoal || '—'}</span></div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[.06] bg-[#111118] p-3">
            <div className="text-[12px] text-[#8b8b9e] mb-1">Học kỳ gần nhất</div>
            {detail?.latestStudyTerm ? (
              <>
                <div className="text-[13px] font-medium text-[#f0f0f5]">{detail.latestStudyTerm.semesterLabel}</div>
                <div className="text-[11px] text-[#8b8b9e] mt-1">
                  GPA10: {detail.latestStudyTerm.gpa10 ?? '—'} • Xếp loại: {detail.latestStudyTerm.classification || '—'}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-[#6b6b80]">Chưa có dữ liệu học kỳ.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={16} className="text-emerald-400" />
          <h3 className="text-[14px] font-semibold text-[#f0f0f5]">Các học kỳ đã lưu</h3>
        </div>

        <div className="space-y-4">
          {studyTerms.length === 0 ? (
            <p className="text-[12px] text-[#6b6b80]">Chưa có học kỳ nào.</p>
          ) : (
            studyTerms.map((item: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-white/[.06] bg-[#111118] p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-[13px] font-medium text-[#f0f0f5]">{item.term?.semesterLabel}</div>
                    <div className="text-[11px] text-[#8b8b9e]">
                      {item.term?.academicYear} • GPA10: {item.term?.gpa10 ?? '—'} • {item.term?.classification || '—'}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                    {item.subjectCount} môn
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="border-b border-white/[.06]">
                        {['Môn học', 'TB', 'Chữ', 'Trạng thái'].map(h => (
                          <th key={h} className="text-left py-2 text-[10px] uppercase tracking-wide text-[#5a5a6e]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(item.subjects ?? []).map((s: any) => (
                        <tr key={s.id} className="border-b border-white/[.04]">
                          <td className="py-2 text-[12px] text-[#f0f0f5]">{s.subjectName}</td>
                          <td className="py-2 text-[12px] text-[#c7c7d1]">{s.averageScore ?? '—'}</td>
                          <td className="py-2 text-[12px] text-[#c7c7d1]">{s.letterGrade || '—'}</td>
                          <td className="py-2 text-[12px] text-[#c7c7d1]">{s.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Lịch sử dự đoán</h3>
          <div className="space-y-3">
            {predictHistory.length === 0 ? (
              <p className="text-[12px] text-[#6b6b80]">Chưa có lịch sử dự đoán.</p>
            ) : (
              predictHistory.map((p: any) => (
                <div key={p.id} className="rounded-xl border border-white/[.06] bg-[#111118] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-[#f0f0f5]">{p.predictedGrade || 'UNKNOWN'}</div>
                    <div className="text-[11px] text-[#8b8b9e]">{fmtDate(p.createdAt)}</div>
                  </div>
                  <div className="text-[11px] text-[#8b8b9e] mt-1">
                    GPA: {p.gpa} • Xác suất: {p.probability}
                  </div>
                  <div className="text-[12px] text-[#c7c7d1] mt-2">{p.advice || '—'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Hoạt động gần đây</h3>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-[12px] text-[#6b6b80]">Chưa có hoạt động.</p>
            ) : (
              activities.map((a: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-white/[.06] bg-[#111118] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-[#f0f0f5]">{a.title}</div>
                    <div className="text-[11px] text-[#8b8b9e]">{fmtDate(a.createdAt)}</div>
                  </div>
                  <div className="text-[12px] text-[#c7c7d1] mt-2">{a.subtitle}</div>
                  <div className="text-[10px] text-[#6b6b80] mt-2">{a.type}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}