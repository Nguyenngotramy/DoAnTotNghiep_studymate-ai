import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import { ArrowLeft, Flag, Clock3, Users, Trash2, FileText, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

function fmtDate(v?: string) {
  if (!v) return '—'
  return new Date(v).toLocaleString()
}

export default function AdminGroupDetailPage() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-group-detail', groupId],
    queryFn: () => adminApi.getGroupDetail(groupId),
    enabled: !!groupId,
  })

  const approvePostMut = useMutation({
    mutationFn: (postId: string) => adminApi.approveGroupPost(postId),
    onSuccess: () => {
      toast.success('Đã duyệt bài đăng')
      qc.invalidateQueries({ queryKey: ['admin-group-detail', groupId] })
      qc.invalidateQueries({ queryKey: ['admin-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
    },
  })

  const rejectPostMut = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      adminApi.rejectGroupPost(postId, reason),
    onSuccess: () => {
      toast.success('Đã từ chối bài đăng')
      qc.invalidateQueries({ queryKey: ['admin-group-detail', groupId] })
      qc.invalidateQueries({ queryKey: ['admin-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
    },
  })

  const dissolveMut = useMutation({
    mutationFn: () => adminApi.forceDeleteGroup(groupId, 'Nhóm bị quản trị viên giải tán'),
    onSuccess: () => {
      toast.success('Đã giải tán nhóm')
      navigate('/admin/groups')
      qc.invalidateQueries({ queryKey: ['admin-groups'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
    },
  })

  const group = data?.group
  const pendingPosts = data?.pendingPosts ?? []
  const reportedPosts = data?.reportedPosts ?? []
  const overdueTasks = data?.overdueTasks ?? []
  const members = data?.members ?? []

  const summary = useMemo(() => ({
    memberCount: members.length,
    pendingPostsCount: pendingPosts.length,
    reportedPostsCount: reportedPosts.length,
    overdueTasksCount: overdueTasks.length,
  }), [members, pendingPosts, reportedPosts, overdueTasks])

  if (isLoading) {
    return <div className="text-[#c7c7d1]">Đang tải chi tiết nhóm...</div>
  }

  if (!group) {
    return <div className="text-red-400">Không tìm thấy nhóm.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/groups')}
          className="h-9 px-3 rounded-lg border border-white/[.08] bg-[#1e1e28] text-[#c7c7d1] flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Quay lại
        </button>
        <h1 className="text-[18px] font-semibold text-[#f0f0f5]">Chi tiết nhóm học</h1>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[20px] font-semibold text-[#f0f0f5]">{group.name}</h2>
            <p className="text-[12px] text-[#8b8b9e] mt-1">{group.subject || 'Chưa có môn học'}</p>
            <p className="text-[12px] text-[#c7c7d1] mt-3">{group.description || 'Không có mô tả'}</p>
          </div>

          <button
            onClick={() => {
              if (confirm(`Bạn chắc chắn muốn giải tán nhóm "${group.name}"?`)) {
                dissolveMut.mutate()
              }
            }}
            className="h-10 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Ép giải tán nhóm
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-4">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${group.publicVisible ? 'bg-green-500/15 text-green-400' : 'bg-orange-500/15 text-orange-400'}`}>
            {group.publicVisible ? 'Công khai' : 'Riêng tư'}
          </span>
          {group.requireApproval && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
              Duyệt vào nhóm
            </span>
          )}
          {group.requirePostApproval && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
              Duyệt bài đăng
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Thành viên', value: summary.memberCount, icon: Users, color: '#818cf8' },
          { label: 'Bài chờ duyệt', value: summary.pendingPostsCount, icon: Clock3, color: '#f59e0b' },
          { label: 'Bài bị report', value: summary.reportedPostsCount, icon: Flag, color: '#ef4444' },
          { label: 'Task quá hạn', value: summary.overdueTasksCount, icon: ShieldAlert, color: '#ec4899' },
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Thành viên nhóm</h3>
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-[12px] text-[#6b6b80]">Chưa có thành viên.</p>
            ) : (
              members.map((m: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-white/[.06] bg-[#111118] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-medium text-[#f0f0f5]">{m.fullName}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                      {m.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8b8b9e] mt-1">Tham gia: {fmtDate(m.joinedAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Task quá hạn</h3>
          <div className="space-y-3">
            {overdueTasks.length === 0 ? (
              <p className="text-[12px] text-[#6b6b80]">Không có task quá hạn.</p>
            ) : (
              overdueTasks.map((t: any) => (
                <div key={t.id} className="rounded-xl border border-white/[.06] bg-[#111118] p-3">
                  <div className="text-[13px] font-medium text-[#f0f0f5]">{t.title}</div>
                  <div className="text-[11px] text-[#8b8b9e] mt-1">
                    Deadline: {fmtDate(t.deadline)} • Trạng thái: {t.status}
                  </div>
                  {t.assigneeId && (
                    <div className="text-[11px] text-pink-400 mt-2">Assignee: {t.assigneeId}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 size={16} className="text-amber-400" />
          <h3 className="text-[14px] font-semibold text-[#f0f0f5]">Bài đăng chờ duyệt</h3>
        </div>

        <div className="space-y-3">
          {pendingPosts.length === 0 ? (
            <p className="text-[12px] text-[#6b6b80]">Không có bài chờ duyệt.</p>
          ) : (
            pendingPosts.map((post: any) => (
              <div key={post.id} className="rounded-xl border border-white/[.06] bg-[#111118] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#f0f0f5]">{post.authorName || 'Thành viên'}</div>
                    <div className="text-[11px] text-[#8b8b9e] mt-1">{fmtDate(post.createdAt)}</div>
                    <div className="text-[12px] text-[#c7c7d1] mt-3">{post.content || 'Không có nội dung'}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approvePostMut.mutate(post.id)}
                      className="h-9 px-3 rounded-lg bg-green-500/15 text-green-400 text-[12px]"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => rejectPostMut.mutate({ postId: post.id, reason: 'Bài đăng không phù hợp' })}
                      className="h-9 px-3 rounded-lg bg-red-500/15 text-red-400 text-[12px]"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flag size={16} className="text-red-400" />
          <h3 className="text-[14px] font-semibold text-[#f0f0f5]">Bài đăng bị report</h3>
        </div>

        <div className="space-y-3">
          {reportedPosts.length === 0 ? (
            <p className="text-[12px] text-[#6b6b80]">Không có bài bị report.</p>
          ) : (
            reportedPosts.map((post: any) => (
              <div key={post.id} className="rounded-xl border border-white/[.06] bg-[#111118] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#f0f0f5]">{post.authorName || 'Thành viên'}</div>
                    <div className="text-[11px] text-[#8b8b9e] mt-1">{fmtDate(post.createdAt)}</div>
                    <div className="text-[12px] text-[#c7c7d1] mt-3">{post.content || 'Không có nội dung'}</div>
                    <div className="text-[11px] text-red-400 mt-2">
                      Report: {post.reportsCount || 0} • {post.latestReason || 'Không có lý do'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approvePostMut.mutate(post.id)}
                      className="h-9 px-3 rounded-lg bg-green-500/15 text-green-400 text-[12px]"
                    >
                      Giữ bài
                    </button>
                    <button
                      onClick={() => rejectPostMut.mutate({ postId: post.id, reason: 'Bài đăng vi phạm nội dung' })}
                      className="h-9 px-3 rounded-lg bg-red-500/15 text-red-400 text-[12px]"
                    >
                      Gỡ bài
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-indigo-400" />
          <h3 className="text-[14px] font-semibold text-[#f0f0f5]">Tài liệu trong nhóm</h3>
        </div>

        <div className="space-y-3">
          {(data?.documents ?? []).length === 0 ? (
            <p className="text-[12px] text-[#6b6b80]">Không có tài liệu.</p>
          ) : (
            data.documents.map((doc: any) => (
              <div key={doc.id} className="rounded-xl border border-white/[.06] bg-[#111118] p-3">
                <div className="text-[13px] font-medium text-[#f0f0f5]">{doc.name}</div>
                <div className="text-[11px] text-[#8b8b9e] mt-1">
                  {doc.type || 'OTHER'} • {doc.uploaderName || '—'} • {fmtDate(doc.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}