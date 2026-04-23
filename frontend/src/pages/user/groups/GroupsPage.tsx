import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { groupApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import {
  Users, Plus, X, Hash, KanbanSquare, MessageSquare, FileText,
  Globe, Lock, ShieldCheck, ShieldAlert, Check, Ban, Clock3, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import type { Group } from '@/types'

const COLORS = ['#6366f1', '#14b8a6', '#f97316', '#22c55e', '#ec4899', '#f59e0b', '#3b82f6', '#8b5cf6']

const inp = (err?: boolean) =>
  clsx(
    'w-full h-9 px-3 rounded-lg border text-[13px] outline-none transition-colors font-[DM_Sans]',
    err ? 'border-red-500/50' : 'focus:border-indigo-500/60',
  )

const createSchema = z.object({
  name: z.string().min(3, 'Tên nhóm tối thiểu 3 ký tự'),
  description: z.string().min(5, 'Mô tả tối thiểu 5 ký tự'),
  subject: z.string().min(2, 'Nhập tên môn học'),
  coverColor: z.string(),
  publicVisible: z.boolean(),
  requireApproval: z.boolean(),
})
type CreateForm = z.infer<typeof createSchema>

const joinSchema = z.object({
  inviteCode: z.string().length(6, 'Mã mời phải đúng 6 ký tự'),
})
type JoinForm = z.infer<typeof joinSchema>

function GroupCard({
  g,
  onApprove,
  onReject,
  approvingUserId,
  rejectingUserId,
}: {
  g: Group & { publicVisible?: boolean; inviteCode?: string; requireApproval?: boolean; joinRequests?: any[] }
  onApprove: (groupId: string, userId: string) => void
  onReject: (groupId: string, userId: string) => void
  approvingUserId?: string | null
  rejectingUserId?: string | null
}) {
  const { user } = useAuthStore()

  const progress = (g as any).progress ?? 0
  const memberCount = g.memberCount ?? (g as any).members?.length ?? 0
  const isPublic = !!(g as any).publicVisible
  const requireApproval = !!(g as any).requireApproval
  const inviteCode = (g as any).inviteCode ?? ''

  const members = (g as any).members ?? []
  const joinRequests = ((g as any).joinRequests ?? []).filter((r: any) => r.status === 'PENDING')

  const myMember = members.find((m: any) => String(m.userId) === String(user?.id))
  const isLeader = myMember?.role === 'LEADER'
  const isMember = !!myMember

  const canSeeCode = isPublic || isMember || isLeader

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!inviteCode || !canSeeCode) return

    try {
      await navigator.clipboard.writeText(inviteCode)
      toast.success('Đã sao chép mã nhóm')
    } catch {
      toast.error('Không sao chép được mã')
    }
  }

  return (
    <div
      className="border rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl group"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        boxShadow: `0 0 0 0 ${g.coverColor}`,
      }}
    >
      <Link
        to={`/groups/${g.id}`}
        className="block h-20 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${g.coverColor}30, ${g.coverColor}10)` }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${g.coverColor}25 0%, transparent 60%)` }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `${g.coverColor}40` }} />

        <div
          className="absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: g.coverColor + '25', border: `1px solid ${g.coverColor}40` }}
        >
          <Users size={16} style={{ color: g.coverColor }} />
        </div>

        <div
          className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
          style={{
            background: 'rgba(0,0,0,.4)',
            backdropFilter: 'blur(8px)',
            color: g.coverColor,
          }}
        >
          <Users size={10} /> {memberCount}
        </div>
      </Link>

      <div className="p-4">
        <div className="mb-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Link
              to={`/groups/${g.id}`}
              className="text-[14px] font-semibold group-hover:text-indigo-300 transition-colors line-clamp-1"
              style={{ color: 'var(--text)' }}
            >
              {g.name}
            </Link>

            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: isPublic ? 'rgba(34,197,94,.10)' : 'rgba(244,63,94,.10)',
                color: isPublic ? '#22c55e' : '#f43f5e',
                border: isPublic ? '1px solid rgba(34,197,94,.18)' : '1px solid rgba(244,63,94,.18)',
              }}
            >
              {isPublic ? <Globe size={10} /> : <Lock size={10} />}
              {isPublic ? 'Hiện mã' : 'Ẩn mã'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: g.coverColor + '15', color: g.coverColor }}
            >
              {g.subject}
            </span>

            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: requireApproval ? 'rgba(245,158,11,.10)' : 'rgba(99,102,241,.10)',
                color: requireApproval ? '#f59e0b' : '#818cf8',
                border: requireApproval ? '1px solid rgba(245,158,11,.18)' : '1px solid rgba(99,102,241,.18)',
              }}
            >
              {requireApproval ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
              {requireApproval ? 'Cần duyệt' : 'Vào ngay'}
            </span>
          </div>
        </div>

        <p className="text-[11px] mb-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--text2)' }}>
          {g.description}
        </p>

        <div
          className="mb-3 rounded-xl px-3 py-2.5 border"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px]" style={{ color: 'var(--text2)' }}>
              Mã nhóm
            </span>

            {canSeeCode ? (
              <button
                onClick={handleCopyCode}
                className="text-[11px] font-semibold hover:opacity-80 transition-opacity"
                style={{ color: g.coverColor }}
                title="Bấm để sao chép mã"
              >
                {inviteCode || '------'}
              </button>
            ) : (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text3)' }}>
                ••••••
              </span>
            )}
          </div>

          {!isPublic && canSeeCode && (
            <p className="mt-1 text-[10px]" style={{ color: 'var(--text3)' }}>
              Nhóm riêng tư — chỉ thành viên mới thấy mã.
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span style={{ color: 'var(--text3)' }}>Tiến độ nhóm</span>
            <span className="font-semibold" style={{ color: g.coverColor }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${g.coverColor}bb, ${g.coverColor})` }}
            />
          </div>
        </div>

        {isLeader && joinRequests.length > 0 && (
          <div
            className="mb-4 rounded-xl border p-3"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Clock3 size={13} className="text-amber-400" />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>
                Yêu cầu chờ duyệt ({joinRequests.length})
              </span>
            </div>

            <div className="space-y-2">
              {joinRequests.map((req: any) => (
                <div
                  key={req.userId}
                  className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
                  style={{ background: 'rgba(255,255,255,.02)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {req.fullName}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                      Chờ duyệt
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onApprove(String(g.id), req.userId)}
                      disabled={approvingUserId === req.userId}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium text-green-400 border border-green-500/20 bg-green-500/10 disabled:opacity-60"
                    >
                      {approvingUserId === req.userId ? '...' : (
                        <span className="inline-flex items-center gap-1"><Check size={10} /> Duyệt</span>
                      )}
                    </button>

                    <button
                      onClick={() => onReject(String(g.id), req.userId)}
                      disabled={rejectingUserId === req.userId}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium text-rose-400 border border-rose-500/20 bg-rose-500/10 disabled:opacity-60"
                    >
                      {rejectingUserId === req.userId ? '...' : (
                        <span className="inline-flex items-center gap-1"><Ban size={10} /> Từ chối</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <Link
            to={`/groups/${g.id}`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(99,102,241,.12)', border: '0.5px solid rgba(99,102,241,.25)' }}
          >
            <Eye size={14} style={{ color: '#818cf8' }} />
            <span className="text-[10px] font-medium" style={{ color: '#818cf8' }}>
              Xem nhóm
            </span>
          </Link>

          <Link
            to={`/groups/${g.id}/chat`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: g.coverColor + '12', border: `0.5px solid ${g.coverColor}25` }}
          >
            <MessageSquare size={14} style={{ color: g.coverColor }} />
            <span className="text-[10px] font-medium" style={{ color: g.coverColor }}>
              Chat
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Link
            to={`/groups/${g.id}/kanban`}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:scale-105"
            style={{ background: '#6366f112', border: '0.5px solid #6366f125' }}
          >
            <KanbanSquare size={14} style={{ color: '#6366f1' }} />
            <span className="text-[10px] font-medium" style={{ color: '#6366f1' }}>
              Task
            </span>
          </Link>

          <Link
            to={`/groups/${g.id}/docs`}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:scale-105"
            style={{ background: '#14b8a612', border: '0.5px solid #14b8a625' }}
          >
            <FileText size={14} style={{ color: '#14b8a6' }} />
            <span className="text-[10px] font-medium" style={{ color: '#14b8a6' }}>
              Tài liệu
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'join' | null>(null)
  const [pickedColor, setPickedColor] = useState(COLORS[0])
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupApi.list,
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      description: '',
      subject: '',
      coverColor: COLORS[0],
      publicVisible: true,
      requireApproval: false,
    },
  })

  const joinForm = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
    defaultValues: { inviteCode: '' },
  })

  const publicVisible = createForm.watch('publicVisible')
  const requireApproval = createForm.watch('requireApproval')

  const createMut = useMutation({
    mutationFn: (d: CreateForm) =>
      groupApi.create({
        ...d,
        coverColor: pickedColor,
        publicVisible: d.publicVisible,
        requireApproval: d.requireApproval,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['public-groups'] })
      toast.success('Tạo nhóm thành công!')
      setModal(null)
      createForm.reset({
        name: '',
        description: '',
        subject: '',
        coverColor: COLORS[0],
        publicVisible: true,
        requireApproval: false,
      })
      setPickedColor(COLORS[0])
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi tạo nhóm'),
  })

  const joinMut = useMutation({
    mutationFn: (d: JoinForm) => groupApi.join(d.inviteCode.toUpperCase()),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['public-groups'] })

      if (res?.pendingApproval) {
        toast.success(res?.message ?? 'Đã gửi yêu cầu tham gia, chờ trưởng nhóm duyệt')
      } else if (res?.joined) {
        toast.success(res?.message ?? 'Đã tham gia nhóm thành công!')
      } else {
        toast.success('Xử lý tham gia nhóm thành công')
      }

      setModal(null)
      joinForm.reset()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Mã mời không hợp lệ'),
  })

  const approveMut = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupApi.approveJoinRequest(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['public-groups'] })
      toast.success('Đã duyệt yêu cầu tham gia')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Không duyệt được yêu cầu'),
    onSettled: () => setApprovingUserId(null),
  })

  const rejectMut = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupApi.rejectJoinRequest(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['public-groups'] })
      toast.success('Đã từ chối yêu cầu')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Không từ chối được yêu cầu'),
    onSettled: () => setRejectingUserId(null),
  })

  const handleApprove = (groupId: string, userId: string) => {
    setApprovingUserId(userId)
    approveMut.mutate({ groupId, userId })
  }

  const handleReject = (groupId: string, userId: string) => {
    setRejectingUserId(userId)
    rejectMut.mutate({ groupId, userId })
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Users size={18} className="text-indigo-400" /> Nhóm học của tôi
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>
            {groups.length} nhóm
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModal('join')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <Hash size={13} /> Nhập mã nhóm
          </button>

          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-[12px] font-medium text-white transition-colors"
          >
            <Plus size={14} /> Tạo nhóm
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-52 rounded-xl border animate-pulse"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl"
          style={{ borderColor: 'var(--border)' }}
        >
          <Users size={40} className="mb-4" style={{ color: 'var(--bg4)' }} />
          <p className="text-[14px] mb-2" style={{ color: 'var(--text2)' }}>
            Chưa tham gia nhóm nào
          </p>
          <button
            onClick={() => setModal('create')}
            className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-[12px] font-medium text-white transition-colors"
          >
            Tạo nhóm đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              g={g as any}
              onApprove={handleApprove}
              onReject={handleReject}
              approvingUserId={approvingUserId}
              rejectingUserId={rejectingUserId}
            />
          ))}
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="border rounded-2xl p-6 w-full max-w-md"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {modal === 'create' ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    Tạo nhóm học mới
                  </h2>
                  <button onClick={() => setModal(null)} style={{ color: 'var(--text3)' }}>
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={createForm.handleSubmit(d => createMut.mutate(d))} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                      Tên nhóm
                    </label>
                    <input
                      {...createForm.register('name')}
                      className={inp(!!createForm.formState.errors.name)}
                      style={{
                        background: 'var(--bg3)',
                        borderColor: createForm.formState.errors.name ? undefined : 'var(--border)',
                        color: 'var(--text)',
                      }}
                      placeholder="VD: Nhóm CNTT K22"
                    />
                    {createForm.formState.errors.name && (
                      <p className="mt-1 text-[11px] text-red-400">{createForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                      Môn học
                    </label>
                    <input
                      {...createForm.register('subject')}
                      className={inp(!!createForm.formState.errors.subject)}
                      style={{
                        background: 'var(--bg3)',
                        borderColor: createForm.formState.errors.subject ? undefined : 'var(--border)',
                        color: 'var(--text)',
                      }}
                      placeholder="VD: Đồ án tốt nghiệp"
                    />
                    {createForm.formState.errors.subject && (
                      <p className="mt-1 text-[11px] text-red-400">{createForm.formState.errors.subject.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                      Mô tả
                    </label>
                    <textarea
                      {...createForm.register('description')}
                      rows={2}
                      className={clsx(inp(!!createForm.formState.errors.description), '!h-auto py-2 resize-none')}
                      style={{
                        background: 'var(--bg3)',
                        borderColor: createForm.formState.errors.description ? undefined : 'var(--border)',
                        color: 'var(--text)',
                      }}
                      placeholder="Mục tiêu của nhóm..."
                    />
                    {createForm.formState.errors.description && (
                      <p className="mt-1 text-[11px] text-red-400">{createForm.formState.errors.description.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-2" style={{ color: 'var(--text2)' }}>
                      Kiểu hiển thị mã nhóm
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => createForm.setValue('publicVisible', true)}
                        className={clsx(
                          'rounded-xl border px-3 py-3 text-left transition-all',
                          publicVisible ? 'ring-1 ring-indigo-500/50' : ''
                        )}
                        style={{
                          background: publicVisible ? 'rgba(99,102,241,.08)' : 'var(--bg3)',
                          borderColor: publicVisible ? 'rgba(99,102,241,.35)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Globe size={14} className="text-green-400" />
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                            Hiện mã
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                          Nhóm công khai. Mọi người có thể nhìn thấy mã để copy và tham gia.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => createForm.setValue('publicVisible', false)}
                        className={clsx(
                          'rounded-xl border px-3 py-3 text-left transition-all',
                          !publicVisible ? 'ring-1 ring-indigo-500/50' : ''
                        )}
                        style={{
                          background: !publicVisible ? 'rgba(99,102,241,.08)' : 'var(--bg3)',
                          borderColor: !publicVisible ? 'rgba(99,102,241,.35)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Lock size={14} className="text-rose-400" />
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                            Ẩn mã
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                          Nhóm riêng tư. Mã không hiện ra ngoài, chỉ ai được chia sẻ mới vào được.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-2" style={{ color: 'var(--text2)' }}>
                      Cách tham gia nhóm
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => createForm.setValue('requireApproval', false)}
                        className={clsx(
                          'rounded-xl border px-3 py-3 text-left transition-all',
                          !requireApproval ? 'ring-1 ring-indigo-500/50' : ''
                        )}
                        style={{
                          background: !requireApproval ? 'rgba(99,102,241,.08)' : 'var(--bg3)',
                          borderColor: !requireApproval ? 'rgba(99,102,241,.35)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck size={14} className="text-indigo-400" />
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                            Vào ngay
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                          Người nhập đúng mã sẽ vào nhóm luôn.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => createForm.setValue('requireApproval', true)}
                        className={clsx(
                          'rounded-xl border px-3 py-3 text-left transition-all',
                          requireApproval ? 'ring-1 ring-indigo-500/50' : ''
                        )}
                        style={{
                          background: requireApproval ? 'rgba(99,102,241,.08)' : 'var(--bg3)',
                          borderColor: requireApproval ? 'rgba(99,102,241,.35)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldAlert size={14} className="text-amber-400" />
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                            Chờ duyệt
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                          Người nhập đúng mã sẽ gửi yêu cầu để trưởng nhóm xét duyệt.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                      Màu nhóm
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPickedColor(c)}
                          className="w-7 h-7 rounded-full border-2 transition-all"
                          style={{ background: c, borderColor: pickedColor === c ? '#fff' : 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-xl px-3 py-2.5 border"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                      Mã nhóm sẽ luôn được tạo tự động
                    </p>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                      Bạn có thể chọn hiện/ẩn mã và vào ngay/chờ duyệt độc lập với nhau.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="flex-1 h-9 rounded-lg border text-[12px] transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                    >
                      Huỷ
                    </button>

                    <button
                      type="submit"
                      disabled={createMut.isPending}
                      className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 rounded-lg text-[12px] font-medium text-white transition-colors"
                    >
                      {createMut.isPending ? 'Đang tạo...' : 'Tạo nhóm'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    Tham gia nhóm
                  </h2>
                  <button onClick={() => setModal(null)} style={{ color: 'var(--text3)' }}>
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={joinForm.handleSubmit(d => joinMut.mutate(d))} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                      Mã nhóm (6 ký tự)
                    </label>
                    <input
                      {...joinForm.register('inviteCode')}
                      onChange={(e) => joinForm.setValue('inviteCode', e.target.value.toUpperCase())}
                      className={inp(!!joinForm.formState.errors.inviteCode)}
                      style={{
                        background: 'var(--bg3)',
                        borderColor: joinForm.formState.errors.inviteCode ? undefined : 'var(--border)',
                        color: 'var(--text)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        textAlign: 'center',
                        fontSize: '18px',
                      }}
                      placeholder="VD: AB12CD"
                      maxLength={6}
                    />
                    {joinForm.formState.errors.inviteCode && (
                      <p className="mt-1 text-[11px] text-red-400">{joinForm.formState.errors.inviteCode.message}</p>
                    )}
                  </div>

                  <div
                    className="rounded-xl px-3 py-2.5 border"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                      Sau khi nhập mã
                    </p>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                      Tuỳ cài đặt của trưởng nhóm, bạn sẽ vào nhóm luôn hoặc gửi yêu cầu chờ xét duyệt.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="flex-1 h-9 rounded-lg border text-[12px] transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                    >
                      Huỷ
                    </button>

                    <button
                      type="submit"
                      disabled={joinMut.isPending}
                      className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 rounded-lg text-[12px] font-medium text-white transition-colors"
                    >
                      {joinMut.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}