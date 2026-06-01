import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import { Search, Lock, Unlock, Users, Eye, KeyRound } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import toast from 'react-hot-toast'

type FilterKey = 'ALL' | 'ACTIVE' | 'LOCKED' | 'WEAK'

export default function AdminUsers() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<FilterKey>('ALL')

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.getUsers(page, search),
  })

  const { data: alertCenter } = useQuery({
    queryKey: ['admin-alert-center-mini'],
    queryFn: () => adminApi.getAlertCenter(),
  })

  const lockMut = useMutation({
    mutationFn: (id: string) => adminApi.lockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
      toast.success('Đã khoá tài khoản')
    },
  })

  const unlockMut = useMutation({
    mutationFn: (id: string) => adminApi.unlockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
      toast.success('Đã mở khoá')
    },
  })

  const resetMut = useMutation({
    mutationFn: (id: string) => adminApi.resetPassword(id),
    onSuccess: () => {
      toast.success('Đã gửi yêu cầu reset mật khẩu')
    },
  })

  const weakIds = useMemo(
    () => new Set((alertCenter?.weakLearners ?? []).map((x: any) => x.userId)),
    [alertCenter],
  )

  const allUsers = usersRes?.content ?? []

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u: any) => {
      if (filter === 'ACTIVE') return !u.locked && !u.permanentlyBanned
      if (filter === 'LOCKED') return !!u.locked || !!u.permanentlyBanned
      if (filter === 'WEAK') return weakIds.has(u.id)
      return true
    })
  }, [allUsers, filter, weakIds])

  const totalPages = usersRes?.totalPages ?? 1

  const userTypeLabel = (type?: string) => {
    switch (type) {
      case 'HIGHSCHOOL':
        return 'Học sinh'
      case 'STUDENT':
        return 'Sinh viên'
      case 'TEACHER':
        return 'Giáo viên'
      default:
        return 'Khác'
    }
  }

  const WarningCountsCell = ({ u }: { u: any }) => {
    const r = u.warningReminderCount ?? 0
    const w = u.warningLevelCount ?? 0
    const s = u.warningSevereCount ?? 0
    const total = r + w + s
    const weak = weakIds.has(u.id)

    const pill = (label: string, count: number, max: number, color: string) => (
      <span
        key={label}
        className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${color}`}
        title={`${label}: ${count}/${max} lần cảnh cáo`}
      >
        {label} {count}/{max}
      </span>
    )

    return (
      <div className="flex flex-col gap-1 min-w-[88px]">
        {weak && (
          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 w-fit">
            Học yếu
          </span>
        )}
        {pill('Nhẹ', r, 5, r >= 5 ? 'bg-red-500/20 text-red-400' : r > 0 ? 'bg-zinc-500/15 text-zinc-400' : 'bg-white/5 text-[#5a5a6e]')}
        {pill('TB', w, 3, w >= 3 ? 'bg-red-500/20 text-red-400' : w > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-[#5a5a6e]')}
        {pill('Nặng', s, 2, s >= 2 ? 'bg-red-500/20 text-red-400' : s > 0 ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-[#5a5a6e]')}
        <span className="text-[9px] text-[#5a5a6e]">Tổng: {total} lần</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[18px] font-semibold text-[#f0f0f5] flex items-center gap-2">
          <Users size={18} className="text-red-400" />
          Quản lý người dùng
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            ['ALL', 'Tất cả'],
            ['ACTIVE', 'Hoạt động'],
            ['LOCKED', 'Đã khóa'],
            ['WEAK', 'Cần hỗ trợ'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key as FilterKey)}
              className={`h-9 px-3 rounded-lg border text-[12px] font-medium transition ${
                filter === key
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-white/[.08] bg-[#1e1e28] text-[#8b8b9e] hover:text-[#f0f0f5]'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-2 bg-[#1e1e28] border border-white/[.07] rounded-lg px-3 h-9">
            <Search size={13} className="text-[#5a5a6e]" />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Tìm kiếm..."
              className="bg-transparent border-none outline-none text-[12px] text-[#f0f0f5] placeholder-[#5a5a6e] w-48"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[.06]">
              {['Người dùng', 'Mã SV', 'Loại', 'Role', 'Trạng thái', 'Cảnh báo', 'Thao tác'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[10px] font-medium text-[#5a5a6e] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u: any) => (
              <tr key={u.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={u.fullName} avatar={u.avatar} size={32} tier={u.membershipTier} />
                    <div>
                      <p className="text-[12px] font-medium text-[#f0f0f5]">{u.fullName}</p>
                      <p className="text-[10px] text-[#5a5a6e]">{u.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-[11px] font-mono text-[#8b8b9e]">{u.studentCode || '—'}</td>

                <td className="px-4 py-3">
                  <span className="text-[11px] text-[#f0f0f5]">{userTypeLabel(u.userType)}</span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: u.role === 'ADMIN' ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.06)',
                      color: u.role === 'ADMIN' ? '#818cf8' : '#8b8b9e',
                    }}
                  >
                    {u.role === 'ADMIN' ? 'Admin' : 'User'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {u.permanentlyBanned ? (
                    <span className="text-[11px] font-medium text-red-400">Khóa vĩnh viễn</span>
                  ) : u.locked ? (
                    <span className="text-[11px] font-medium text-red-400">Đã khóa</span>
                  ) : (
                    <span className="text-[11px] font-medium text-green-400">Hoạt động</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <WarningCountsCell u={u} />
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-all"
                    >
                      <Eye size={11} />
                      Chi tiết
                    </button>

                    {u.role !== 'ADMIN' && (
                      <>
                        <button
                          onClick={() => (u.locked ? unlockMut.mutate(u.id) : lockMut.mutate(u.id))}
                          className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                            u.locked
                              ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                              : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          }`}
                        >
                          {u.locked ? (
                            <>
                              <Unlock size={11} />
                              Mở khoá
                            </>
                          ) : (
                            <>
                              <Lock size={11} />
                              Khoá
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => resetMut.mutate(u.id)}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-white/[.12] text-[#c7c7d1] hover:bg-white/[.04] transition-all"
                        >
                          <KeyRound size={11} />
                          Reset mật khẩu
                        </button>

                        <button
                          onClick={() => {
                            const tier = prompt('Set membership tier (MEMBER/SILVER/GOLD):', u.membershipTier || 'MEMBER')
                            if (tier && ['MEMBER', 'SILVER', 'GOLD'].includes(tier.toUpperCase())) {
                              fetch(`${import.meta.env.VITE_API_URL}/admin/users/${u.id}/set-membership`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                                },
                                body: JSON.stringify({ tier: tier.toUpperCase(), period: 'MONTH' }),
                              })
                                .then(res => res.json())
                                .then(() => {
                                  toast.success('Đã cập nhật gói hội viên')
                                  qc.invalidateQueries({ queryKey: ['admin-users'] })
                                })
                                .catch(() => toast.error('Lỗi khi cập nhật'))
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all"
                        >
                          Set gói
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-[#6b6b80]">
                  Không có người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          disabled={page <= 0}
          onClick={() => setPage(p => Math.max(0, p - 1))}
          className="h-9 px-3 rounded-lg border border-white/[.08] bg-[#1e1e28] text-[#c7c7d1] disabled:opacity-40"
        >
          Trước
        </button>
        <span className="text-[12px] text-[#8b8b9e]">
          Trang {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(p => p + 1)}
          className="h-9 px-3 rounded-lg border border-white/[.08] bg-[#1e1e28] text-[#c7c7d1] disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  )
}