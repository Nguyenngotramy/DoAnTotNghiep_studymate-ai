import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import {
  Search,
  Users,
  Globe,
  Lock,
  Flag,
  Clock3,
  Eye,
  Trash2,
  ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'

type FilterKey = 'ALL' | 'PUBLIC' | 'PRIVATE' | 'PENDING' | 'REPORTED' | 'OVERDUE'

type AdminGroupRow = {
  id: string
  name: string
  subject?: string
  description?: string
  publicVisible: boolean
  requireApproval: boolean
  requirePostApproval: boolean
  memberCount: number
  pendingPostsCount: number
  reportedPostsCount: number
  overdueTasksCount: number
  totalTasksCount: number
  totalDocumentsCount: number
  createdAt?: string
  updatedAt?: string
}

export default function AdminGroups() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups', page, search, filter],
    queryFn: () => adminApi.getGroups(page, search, filter),
  })

  const deleteMut = useMutation({
    mutationFn: (groupId: string) => adminApi.forceDeleteGroup(groupId, 'Nhóm bị quản trị viên giải tán'),
    onSuccess: () => {
      toast.success('Đã giải tán nhóm')
      qc.invalidateQueries({ queryKey: ['admin-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể giải tán nhóm')
    },
  })

  const groups: AdminGroupRow[] = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  const stats = useMemo(() => {
    return {
      total: groups.length,
      publicCount: groups.filter(g => g.publicVisible).length,
      privateCount: groups.filter(g => !g.publicVisible).length,
      pendingCount: groups.filter(g => g.pendingPostsCount > 0).length,
      reportedCount: groups.filter(g => g.reportedPostsCount > 0).length,
      overdueCount: groups.filter(g => g.overdueTasksCount > 0).length,
    }
  }, [groups])

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PUBLIC', label: 'Công khai' },
    { key: 'PRIVATE', label: 'Riêng tư' },
    { key: 'PENDING', label: 'Có bài chờ duyệt' },
    { key: 'REPORTED', label: 'Có bài bị report' },
    { key: 'OVERDUE', label: 'Có task quá hạn' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[18px] font-semibold text-[#f0f0f5]">Quản lý nhóm học</h1>
          <p className="text-[12px] text-[#8b8b9e] mt-1">
            Xem toàn bộ nhóm, theo dõi nhóm có vấn đề và có thể ép giải tán khi cần.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#1e1e28] border border-white/[.07] rounded-lg px-3 h-9">
          <Search size={13} className="text-[#5a5a6e]" />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Tìm tên nhóm..."
            className="bg-transparent border-none outline-none text-[12px] text-[#f0f0f5] placeholder-[#5a5a6e] w-52"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Nhóm hiển thị', value: stats.total, color: '#818cf8', icon: Users },
          { label: 'Công khai', value: stats.publicCount, color: '#22c55e', icon: Globe },
          { label: 'Riêng tư', value: stats.privateCount, color: '#f97316', icon: Lock },
          { label: 'Bài chờ duyệt', value: stats.pendingCount, color: '#f59e0b', icon: Clock3 },
          { label: 'Bị report', value: stats.reportedCount, color: '#ef4444', icon: Flag },
          { label: 'Task quá hạn', value: stats.overdueCount, color: '#ec4899', icon: ShieldAlert },
        ].map(item => (
          <div key={item.label} className="bg-[#1a1a24] border border-white/[.06] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#8b8b9e]">{item.label}</span>
              <item.icon size={14} style={{ color: item.color }} />
            </div>
            <div className="text-[24px] font-semibold font-mono" style={{ color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(item => (
          <button
            key={item.key}
            onClick={() => {
              setFilter(item.key)
              setPage(0)
            }}
            className={`h-9 px-3 rounded-lg border text-[12px] font-medium transition ${
              filter === item.key
                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : 'border-white/[.08] bg-[#1e1e28] text-[#8b8b9e] hover:text-[#f0f0f5]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[.06]">
              {[
                'Nhóm',
                'Loại',
                'Thành viên',
                'Bài chờ duyệt',
                'Bị report',
                'Task quá hạn',
                'Tài liệu',
                'Thao tác',
              ].map(h => (
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
            {groups.map(group => (
              <tr key={group.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-[12px] font-medium text-[#f0f0f5]">{group.name}</p>
                    <p className="text-[10px] text-[#5a5a6e]">
                      {group.subject || 'Chưa có môn học'}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${
                        group.publicVisible
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-orange-500/15 text-orange-400'
                      }`}
                    >
                      {group.publicVisible ? 'Công khai' : 'Riêng tư'}
                    </span>

                    {group.requireApproval && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full w-fit bg-indigo-500/15 text-indigo-400">
                        Duyệt vào nhóm
                      </span>
                    )}

                    {group.requirePostApproval && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full w-fit bg-amber-500/15 text-amber-400">
                        Duyệt bài đăng
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-[11px] font-mono text-[#c7c7d1]">
                  {group.memberCount}
                </td>

                <td className="px-4 py-3">
                  <span className={group.pendingPostsCount > 0 ? 'text-amber-400 text-[11px] font-medium' : 'text-[#6b6b80] text-[11px]'}>
                    {group.pendingPostsCount}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className={group.reportedPostsCount > 0 ? 'text-red-400 text-[11px] font-medium' : 'text-[#6b6b80] text-[11px]'}>
                    {group.reportedPostsCount}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className={group.overdueTasksCount > 0 ? 'text-pink-400 text-[11px] font-medium' : 'text-[#6b6b80] text-[11px]'}>
                    {group.overdueTasksCount}
                  </span>
                </td>

                <td className="px-4 py-3 text-[11px] font-mono text-[#8b8b9e]">
                  {group.totalDocumentsCount}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/admin/groups/${group.id}`)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-all"
                    >
                      <Eye size={11} />
                      Chi tiết
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Bạn chắc chắn muốn giải tán nhóm "${group.name}"?`)) {
                          deleteMut.mutate(group.id)
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={11} />
                      Giải tán
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && groups.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-[#6b6b80]">
                  Không có nhóm phù hợp.
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