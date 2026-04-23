import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import { Shield, Search, Lock, Unlock, Users, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.getUsers(page, search),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getSystemStats,
  })

  const lockMut = useMutation({
    mutationFn: (id: number) => adminApi.lockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Đã khoá tài khoản') }
  })
  const unlockMut = useMutation({
    mutationFn: (id: number) => adminApi.unlockUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Đã mở khoá') }
  })

  const initials = (name: string) => name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="page-enter max-w-5xl">
      <h1 className="text-[18px] font-semibold text-[#f0f0f5] tracking-tight mb-5 flex items-center gap-2">
        <Shield size={18} className="text-indigo-400"/> Quản trị hệ thống
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Tổng người dùng', value: stats?.totalUsers ?? '—', icon: Users,    color: '#6366f1' },
          { label: 'Nhóm hoạt động',  value: stats?.totalGroups ?? '—', icon: Activity, color: '#14b8a6' },
          { label: 'Tài liệu upload', value: stats?.totalDocs ?? '—',   icon: Shield,   color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-[#16161d] border border-white/[.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#5a5a6e] uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} style={{ color: s.color }}/>
            </div>
            <div className="text-[24px] font-semibold font-mono" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="bg-[#16161d] border border-white/[.07] rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[.07]">
          <div className="flex items-center gap-2 bg-[#1e1e28] border border-white/[.07] rounded-lg px-3 h-8 flex-1 max-w-xs">
            <Search size={13} className="text-[#5a5a6e] flex-shrink-0"/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Tìm kiếm người dùng..."
              className="bg-transparent border-none outline-none text-[12px] text-[#f0f0f5] placeholder-[#5a5a6e] font-[DM_Sans] w-full"/>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[13px] text-[#5a5a6e]">Đang tải...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[.07]">
                {['Người dùng','Mã SV','Role','Trạng thái','Thao tác'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-medium text-[#5a5a6e] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users?.content ?? []).map((u: any) => (
                <tr key={u.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                        {initials(u.fullName)}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-[#f0f0f5]">{u.fullName}</p>
                        <p className="text-[10px] text-[#5a5a6e]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#8b8b9e]">{u.studentCode ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.role==='ADMIN'?'bg-indigo-500/20 text-indigo-300':'bg-white/[.05] text-[#8b8b9e]'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.isLocked?'bg-red-500/20 text-red-400':'bg-green-500/20 text-green-400'}`}>
                      {u.isLocked ? 'Đã khoá' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'ADMIN' && (
                      <button onClick={() => u.isLocked ? unlockMut.mutate(u.id) : lockMut.mutate(u.id)}
                        className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-all ${u.isLocked?'border-green-500/30 text-green-400 hover:bg-green-500/10':'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}>
                        {u.isLocked ? <><Unlock size={11}/> Mở khoá</> : <><Lock size={11}/> Khoá</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {users && users.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[.07]">
            <span className="text-[11px] text-[#5a5a6e]">
              Trang {page+1} / {users.totalPages} · {users.totalElements} người dùng
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}
                className="px-3 py-1 text-[11px] border border-white/[.07] rounded text-[#8b8b9e] hover:bg-white/[.04] disabled:opacity-30 transition-all">
                ← Trước
              </button>
              <button onClick={() => setPage(p => Math.min(users.totalPages-1, p+1))} disabled={page===users.totalPages-1}
                className="px-3 py-1 text-[11px] border border-white/[.07] rounded text-[#8b8b9e] hover:bg-white/[.04] disabled:opacity-30 transition-all">
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
