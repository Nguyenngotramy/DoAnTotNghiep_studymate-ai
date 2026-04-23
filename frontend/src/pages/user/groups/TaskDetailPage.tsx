import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  KanbanSquare,
  Pencil,
  Save,
  Trash2,
  User,
  Users,
  AlertCircle,
  Flag,
  MessageSquare,
  Send,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  CheckCheck,
  CornerDownRight,
  Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { groupApi, taskApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import type {
  GroupMember,
  Task,
  TaskAttachment,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '@/types'

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; bg: string; icon: any }[] = [
  { value: 'TODO', label: 'Cần làm', color: '#94a3b8', bg: 'rgba(148,163,184,.10)', icon: Circle },
  { value: 'IN_PROGRESS', label: 'Đang làm', color: '#f59e0b', bg: 'rgba(245,158,11,.10)', icon: Clock3 },
  { value: 'DONE', label: 'Hoàn thành', color: '#22c55e', bg: 'rgba(34,197,94,.10)', icon: CheckCircle2 },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; bg: string }[] = [
  { value: 'LOW', label: 'Thấp', color: '#22c55e', bg: 'rgba(34,197,94,.10)' },
  { value: 'MEDIUM', label: 'Trung bình', color: '#f59e0b', bg: 'rgba(245,158,11,.10)' },
  { value: 'HIGH', label: 'Cao', color: '#ef4444', bg: 'rgba(239,68,68,.10)' },
]

const API_BASE = 'http://localhost:8080/api'

function fmtDate(v?: string) {
  if (!v) return 'Chưa có'
  try {
    return new Date(v).toLocaleDateString('vi-VN')
  } catch {
    return v
  }
}

function fmtDateTime(v?: string) {
  if (!v) return 'Chưa có'
  try {
    return new Date(v).toLocaleString('vi-VN')
  } catch {
    return v
  }
}

function toInputDate(v?: string) {
  if (!v) return ''
  try {
    return new Date(v).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

function isOverdue(deadline?: string, status?: TaskStatus) {
  if (!deadline || status === 'DONE') return false
  const end = new Date(deadline).getTime()
  return end < Date.now()
}

function statusMeta(status?: TaskStatus) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0]
}

function priorityMeta(priority?: TaskPriority) {
  return PRIORITY_OPTIONS.find(p => p.value === priority) ?? PRIORITY_OPTIONS[1]
}

function initials(name?: string) {
  return (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(-2)
    .toUpperCase()
}

function avatarColor(name?: string) {
  const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6']
  return colors[(name?.charCodeAt(0) ?? 0) % colors.length]
}

function resolveUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}

function renderTaggedText(text?: string) {
  if (!text) return null
  const parts = text.split(/(@[^\s]+)/g)
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} style={{ color: '#818cf8', fontWeight: 600 }}>
          {part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}

function buildCommentTree(comments?: TaskComment[]) {
  return (comments ?? []).slice().sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return ta - tb
  })
}

export default function TaskDetailPage() {
  const { groupId = '', taskId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [editing, setEditing] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('TODO')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [deadline, setDeadline] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  const [commentInput, setCommentInput] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [pickedFiles, setPickedFiles] = useState<File[]>([])
  const [pickedImages, setPickedImages] = useState<File[]>([])

  const [replyOpenMap, setReplyOpenMap] = useState<Record<string, boolean>>({})
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({})
  const [editOpenMap, setEditOpenMap] = useState<Record<string, boolean>>({})
  const [editInputMap, setEditInputMap] = useState<Record<string, string>>({})

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: () => groupApi.get(groupId),
    enabled: !!groupId,
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupApi.getMembers(groupId),
    enabled: !!groupId,
  })

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['group-task', groupId, taskId],
    queryFn: () => taskApi.get(groupId, taskId),
    enabled: !!groupId && !!taskId,
  })

  const myMember = useMemo(
    () => (members ?? []).find((m: GroupMember) => String(m.userId) === String(user?.id)),
    [members, user]
  )

  const canEdit =
    myMember?.role === 'LEADER' ||
    myMember?.role === 'DEPUTY' ||
    task?.createdById === user?.id

  const isAssignee = String(task?.assigneeId || '') === String(user?.id || '')
  const canSubmit = isAssignee || canEdit

  useEffect(() => {
    if (!task) return
    setTitle(task.title || '')
    setDescription(task.description || '')
    setStatus(task.status || 'TODO')
    setPriority(task.priority || 'MEDIUM')
    setDeadline(toInputDate(task.deadline))
    setAssigneeId(task.assigneeId || '')
    setAnswerText(task.submission?.answerText || '')
  }, [task])

  const comments = useMemo<TaskComment[]>(() => buildCommentTree(task?.comments), [task])

  const assigneeName = useMemo(() => {
    const found = (members ?? []).find((m: GroupMember) => String(m.userId) === String(assigneeId))
    return found?.fullName || task?.assigneeName || 'Chưa giao'
  }, [members, assigneeId, task])

  const updateMut = useMutation({
    mutationFn: async () => {
      return taskApi.update(groupId, taskId, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || undefined,
        deadline: deadline || undefined,
      } as Partial<Task>)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['group-tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      setEditing(false)
      toast.success('Đã cập nhật task')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật task')
    },
  })

  const updateStatusMut = useMutation({
    mutationFn: (newStatus: TaskStatus) => taskApi.updateStatus(groupId, taskId, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['group-tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      toast.success('Đã cập nhật trạng thái')
    },
    onError: () => {
      toast.error('Không thể cập nhật trạng thái')
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => taskApi.delete(groupId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['group-tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      toast.success('Đã xoá task')
      navigate(`/groups/${groupId}/kanban`)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá task')
    },
  })

  const addCommentMut = useMutation({
    mutationFn: (payload: { content: string; parentId?: string }) =>
      taskApi.addComment(groupId, taskId, payload.content, payload.parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      setCommentInput('')
      toast.success('Đã thêm bình luận')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể thêm bình luận')
    },
  })

  const updateCommentMut = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      taskApi.updateComment(groupId, taskId, commentId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      toast.success('Đã sửa bình luận')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể sửa bình luận')
    },
  })

  const deleteCommentMut = useMutation({
    mutationFn: (commentId: string) => taskApi.deleteComment(groupId, taskId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      toast.success('Đã xoá bình luận')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá bình luận')
    },
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      const uploadedFiles: TaskAttachment[] = []
      const uploadedImages: TaskAttachment[] = []

      for (const file of pickedFiles) {
        const res = await taskApi.uploadFile(file)
        uploadedFiles.push(res)
      }

      for (const file of pickedImages) {
        const res = await taskApi.uploadImage(file)
        uploadedImages.push(res)
      }

      const oldFiles = task?.submission?.files ?? []
      const oldImages = task?.submission?.images ?? []

      return taskApi.submit(groupId, taskId, {
        answerText: answerText.trim() || undefined,
        files: [...oldFiles, ...uploadedFiles],
        images: [...oldImages, ...uploadedImages],
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['group-tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      setPickedFiles([])
      setPickedImages([])
      toast.success('Đã nộp task')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể nộp task')
    },
  })

  const clearSubmissionMut = useMutation({
    mutationFn: () => taskApi.clearSubmission(groupId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-task', groupId, taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      setPickedFiles([])
      setPickedImages([])
      setAnswerText('')
      toast.success('Đã xoá bài nộp')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá bài nộp')
    },
  })

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Task phải có tiêu đề')
      return
    }
    updateMut.mutate()
  }

  const handleAddComment = () => {
    if (!commentInput.trim()) {
      toast.error('Nhập nội dung bình luận')
      return
    }
    addCommentMut.mutate({ content: commentInput.trim() })
  }

  const handleReply = (parentId: string) => {
    const content = (replyInputMap[parentId] || '').trim()
    if (!content) {
      toast.error('Nhập nội dung reply')
      return
    }
    addCommentMut.mutate(
      { content, parentId },
      {
        onSuccess: () => {
          setReplyInputMap(prev => ({ ...prev, [parentId]: '' }))
          setReplyOpenMap(prev => ({ ...prev, [parentId]: false }))
        },
      }
    )
  }

  const handleUpdateComment = (commentId: string) => {
    const content = (editInputMap[commentId] || '').trim()
    if (!content) {
      toast.error('Nội dung không được trống')
      return
    }
    updateCommentMut.mutate(
      { commentId, content },
      {
        onSuccess: () => {
          setEditOpenMap(prev => ({ ...prev, [commentId]: false }))
        },
      }
    )
  }

  const removePickedFile = (idx: number) => {
    setPickedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const removePickedImage = (idx: number) => {
    setPickedImages(prev => prev.filter((_, i) => i !== idx))
  }

  const canModifyComment = (comment: TaskComment) => {
    return comment.authorId === user?.id || canEdit
  }

  const renderCommentNode = (comment: TaskComment, level = 0): JSX.Element => {
    const replies = buildCommentTree(comment.replies)
    const isReplyOpen = !!replyOpenMap[comment.id]
    const isEditOpen = !!editOpenMap[comment.id]
    const hasReplies = replies.length > 0

    return (
      <div key={comment.id} className={level > 0 ? 'mt-3' : ''}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center self-stretch">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ background: avatarColor(comment.authorName) }}
            >
              {initials(comment.authorName)}
            </div>
            {(hasReplies || isReplyOpen) && (
              <div
                className="w-px flex-1 mt-2"
                style={{ background: 'var(--border)', minHeight: 24 }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="rounded-2xl border px-4 py-3"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                  {comment.authorName || 'Người dùng'}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  {fmtDateTime(comment.createdAt)}
                </span>
                {comment.edited && (
                  <span
                    className="px-2 py-[2px] rounded-full text-[10px]"
                    style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
                  >
                    đã sửa
                  </span>
                )}
              </div>

              {!isEditOpen ? (
                <div
                  className="text-[14px] mt-2 whitespace-pre-wrap break-words"
                  style={{ color: 'var(--text2)' }}
                >
                  {renderTaggedText(comment.content)}
                </div>
              ) : (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    value={editInputMap[comment.id] ?? comment.content}
                    onChange={e =>
                      setEditInputMap(prev => ({
                        ...prev,
                        [comment.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl px-4 py-3 resize-none outline-none text-[14px]"
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleUpdateComment(comment.id)}
                      className="px-3 h-9 rounded-xl text-[12px] font-medium"
                      style={{ background: '#6366f1', color: '#fff' }}
                    >
                      Lưu sửa
                    </button>
                    <button
                      onClick={() => setEditOpenMap(prev => ({ ...prev, [comment.id]: false }))}
                      className="px-3 h-9 rounded-xl text-[12px] font-medium"
                      style={{ background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap mt-2 ml-1">
              <button
                onClick={() =>
                  setReplyOpenMap(prev => ({
                    ...prev,
                    [comment.id]: !prev[comment.id],
                  }))
                }
                className="inline-flex items-center gap-1 text-[12px] font-medium"
                style={{ color: '#818cf8' }}
              >
                <CornerDownRight size={13} />
                Reply
              </button>

              {canModifyComment(comment) && (
                <>
                  <button
                    onClick={() => {
                      setEditOpenMap(prev => ({ ...prev, [comment.id]: true }))
                      setEditInputMap(prev => ({ ...prev, [comment.id]: comment.content }))
                    }}
                    className="inline-flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: 'var(--text2)' }}
                  >
                    <Edit3 size={13} />
                    Sửa
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn xoá comment/reply này không?')) {
                        deleteCommentMut.mutate(comment.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                    Xoá
                  </button>
                </>
              )}
            </div>

            {isReplyOpen && (
              <div className="mt-3 ml-2 pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1"
                    style={{ background: avatarColor(user?.fullName) }}
                  >
                    {initials(user?.fullName)}
                  </div>

                  <div className="flex-1">
                    <textarea
                      rows={3}
                      value={replyInputMap[comment.id] || ''}
                      onChange={e =>
                        setReplyInputMap(prev => ({
                          ...prev,
                          [comment.id]: e.target.value,
                        }))
                      }
                      placeholder={`Reply cho ${comment.authorName}... có thể tag @ten`}
                      className="w-full rounded-2xl px-4 py-3 resize-none outline-none text-[14px]"
                      style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() =>
                          setReplyOpenMap(prev => ({
                            ...prev,
                            [comment.id]: false,
                          }))
                        }
                        className="px-3 h-9 rounded-xl text-[12px] font-medium"
                        style={{ background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                      >
                        Huỷ
                      </button>
                      <button
                        onClick={() => handleReply(comment.id)}
                        className="px-3 h-9 rounded-xl text-[12px] font-medium"
                        style={{ background: '#6366f1', color: '#fff' }}
                      >
                        Gửi reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasReplies && (
              <div className="mt-3 ml-2 pl-4 border-l space-y-3" style={{ borderColor: 'var(--border)' }}>
                {replies.map(reply => renderCommentNode(reply, level + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (groupLoading || taskLoading || membersLoading) {
    return (
      <div className="page-enter max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded-2xl" style={{ background: 'var(--bg2)' }} />
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 h-[520px] rounded-3xl" style={{ background: 'var(--bg2)' }} />
            <div className="col-span-12 lg:col-span-4 h-[520px] rounded-3xl" style={{ background: 'var(--bg2)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!task || !group) {
    return (
      <div className="page-enter max-w-4xl mx-auto py-16 text-center">
        <div className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
          Không tìm thấy task
        </div>
        <button
          onClick={() => navigate(`/groups/${groupId}/kanban`)}
          className="mt-4 px-4 py-2 rounded-xl text-sm"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          Quay lại board
        </button>
      </div>
    )
  }

  const currentStatus = editing ? status : task.status
  const currentPriority = editing ? priority : task.priority
  const currentDeadline = editing ? deadline : task.deadline
  const sMeta = statusMeta(currentStatus)
  const pMeta = priorityMeta(currentPriority)
  const overdue = isOverdue(currentDeadline, currentStatus)
  const StatusIcon = sMeta.icon

  const submission = task.submission
  const submitted = !!task.submission?.submitted

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-5">
      <div
        className="rounded-2xl border px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] mb-1 flex-wrap" style={{ color: 'var(--text3)' }}>
            <Link to="/groups" style={{ color: 'inherit' }}>Nhóm</Link>
            <span>/</span>
            <Link to={`/groups/${groupId}`} style={{ color: 'inherit' }}>{group.name}</Link>
            <span>/</span>
            <Link to={`/groups/${groupId}/kanban`} style={{ color: 'inherit' }}>Board</Link>
            <span>/</span>
            <span>Task detail</span>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/groups/${groupId}/kanban`}
              className="w-9 h-9 rounded-xl border flex items-center justify-center"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
            >
              <ArrowLeft size={16} />
            </Link>

            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                {task.title}
              </h1>
              <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                Task ID: {task.id} · Nhóm: {group.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
              style={{ background: 'rgba(99,102,241,.16)', color: '#818cf8' }}
            >
              <Pencil size={15} />
              Chỉnh sửa
            </button>
          )}

          {canEdit && editing && (
            <button
              onClick={handleSave}
              disabled={updateMut.isPending}
              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              <Save size={15} />
              {updateMut.isPending ? 'Đang lưu...' : 'Lưu task'}
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn xoá task này không?')) {
                  deleteMut.mutate()
                }
              }}
              disabled={deleteMut.isPending}
              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
              style={{ background: 'rgba(239,68,68,.15)', color: '#ef4444' }}
            >
              <Trash2 size={15} />
              Xoá
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <KanbanSquare size={18} className="text-indigo-400" />
              <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Chi tiết nhiệm vụ
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium mb-2 block" style={{ color: 'var(--text3)' }}>
                  Tiêu đề
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={!editing}
                  className="w-full h-12 rounded-2xl px-4 outline-none text-[15px]"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label className="text-[12px] font-medium mb-2 block" style={{ color: 'var(--text3)' }}>
                  Mô tả
                </label>
                <textarea
                  rows={8}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!editing}
                  placeholder="Mô tả chi tiết công việc..."
                  className="w-full rounded-2xl px-4 py-3 resize-none outline-none text-[14px]"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
          </section>

          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Trạng thái công việc
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STATUS_OPTIONS.map(item => {
                const Icon = item.icon
                const active = currentStatus === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => canEdit && updateStatusMut.mutate(item.value)}
                    disabled={!canEdit || updateStatusMut.isPending}
                    className={clsx('rounded-2xl border p-4 text-left transition-all', active && 'ring-1')}
                    style={{
                      background: item.bg,
                      borderColor: active ? item.color : 'var(--border)',
                      color: active ? item.color : 'var(--text2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} />
                      <span className="text-[14px] font-semibold">{item.label}</span>
                    </div>
                    <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                      {item.value === 'TODO' && 'Task mới được tạo hoặc chưa bắt đầu'}
                      {item.value === 'IN_PROGRESS' && 'Task đang được thực hiện'}
                      {item.value === 'DONE' && 'Task đã hoàn thành'}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Upload size={18} className="text-indigo-400" />
              <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Nộp bài / Submission
              </h2>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-2xl border px-4 py-3"
                style={{
                  background: submitted ? 'rgba(34,197,94,.08)' : 'var(--bg3)',
                  borderColor: submitted ? 'rgba(34,197,94,.25)' : 'var(--border)',
                }}
              >
                <div
                  className="inline-flex items-center gap-2 text-[13px] font-medium"
                  style={{ color: submitted ? '#22c55e' : 'var(--text2)' }}
                >
                  <CheckCheck size={15} />
                  {submitted ? 'Đã nộp' : 'Chưa nộp'}
                </div>

                {submitted && submission?.submittedAt && (
                  <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                    {submission.submittedByName || 'Người dùng'} đã nộp lúc {fmtDateTime(submission.submittedAt)}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[12px] font-medium mb-2 block" style={{ color: 'var(--text3)' }}>
                  Câu trả lời / đáp án
                </label>
                <textarea
                  rows={6}
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  disabled={!canSubmit}
                  placeholder="Nhập đáp án, mô tả cách làm, hoặc nội dung bài nộp..."
                  className="w-full rounded-2xl px-4 py-3 resize-none outline-none text-[14px]"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              {!!submission?.files?.length && (
                <div>
                  <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text3)' }}>
                    File đã nộp
                  </div>
                  <div className="space-y-2">
                    {submission.files.map((att, idx) => (
                      <a
                        key={`${att.url}-${idx}`}
                        href={resolveUrl(att.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border"
                        style={{
                          background: 'var(--bg3)',
                          borderColor: 'var(--border)',
                          color: 'var(--text)',
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium truncate">{att.name}</div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {att.type} {att.size ? `· ${att.size} KB` : ''}
                          </div>
                        </div>
                        <FileText size={16} style={{ color: '#818cf8' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!!submission?.images?.length && (
                <div>
                  <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text3)' }}>
                    Ảnh đã nộp
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {submission.images.map((img, idx) => (
                      <a key={`${img.url}-${idx}`} href={resolveUrl(img.url)} target="_blank" rel="noreferrer">
                        <img
                          src={resolveUrl(img.url)}
                          alt={img.name}
                          className="w-full h-[130px] object-cover rounded-2xl border"
                          style={{ borderColor: 'var(--border)' }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {canSubmit && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className="rounded-2xl border px-4 py-4 cursor-pointer"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <div className="inline-flex items-center gap-2 text-[13px] font-medium">
                        <FileText size={15} />
                        Upload file bài làm
                      </div>
                      <input
                        type="file"
                        multiple
                        hidden
                        onChange={e => {
                          const files = Array.from(e.target.files || [])
                          setPickedFiles(prev => [...prev, ...files])
                        }}
                      />
                    </label>

                    <label
                      className="rounded-2xl border px-4 py-4 cursor-pointer"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <div className="inline-flex items-center gap-2 text-[13px] font-medium">
                        <ImageIcon size={15} />
                        Upload ảnh bài làm
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={e => {
                          const files = Array.from(e.target.files || [])
                          setPickedImages(prev => [...prev, ...files])
                        }}
                      />
                    </label>
                  </div>

                  {pickedFiles.length > 0 && (
                    <div>
                      <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text3)' }}>
                        File sắp tải lên
                      </div>
                      <div className="space-y-2">
                        {pickedFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border"
                            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                                {file.name}
                              </div>
                              <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                                {(file.size / 1024).toFixed(0)} KB
                              </div>
                            </div>
                            <button
                              onClick={() => removePickedFile(idx)}
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ color: 'var(--text3)' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pickedImages.length > 0 && (
                    <div>
                      <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text3)' }}>
                        Ảnh sắp tải lên
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {pickedImages.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="rounded-2xl border p-2"
                            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-[120px] object-cover rounded-xl"
                            />
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div className="text-[11px] truncate" style={{ color: 'var(--text)' }}>
                                {file.name}
                              </div>
                              <button
                                onClick={() => removePickedImage(idx)}
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ color: 'var(--text3)' }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => submitMut.mutate()}
                      disabled={
                        submitMut.isPending ||
                        (!answerText.trim() && pickedFiles.length === 0 && pickedImages.length === 0)
                      }
                      className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60"
                      style={{ background: '#6366f1', color: '#fff' }}
                    >
                      <Upload size={15} />
                      {submitMut.isPending ? 'Đang nộp...' : submitted ? 'Cập nhật bài nộp' : 'Nộp bài'}
                    </button>

                    {submitted && (
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn xoá bài nộp không?')) {
                            clearSubmissionMut.mutate()
                          }
                        }}
                        disabled={clearSubmissionMut.isPending}
                        className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60"
                        style={{ background: 'rgba(239,68,68,.15)', color: '#ef4444' }}
                      >
                        <Trash2 size={15} />
                        {clearSubmissionMut.isPending ? 'Đang xoá...' : 'Xoá bài nộp'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-indigo-400" />
              <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Bình luận task
              </h2>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-2xl border p-3"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <textarea
                  rows={3}
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  placeholder="Viết bình luận hoặc cập nhật tiến độ... có thể tag @tên"
                  className="w-full bg-transparent outline-none resize-none text-[14px]"
                  style={{ color: 'var(--text)' }}
                />

                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddComment}
                    disabled={addCommentMut.isPending || !commentInput.trim()}
                    className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium disabled:opacity-60"
                    style={{ background: '#6366f1', color: '#fff' }}
                  >
                    <Send size={14} />
                    {addCommentMut.isPending ? 'Đang gửi...' : 'Gửi bình luận'}
                  </button>
                </div>
              </div>

              {comments.length === 0 ? (
                <div
                  className="rounded-2xl border p-4 text-[13px]"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text3)' }}
                >
                  Chưa có bình luận nào cho task này
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => renderCommentNode(comment))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-5">
          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Thuộc tính task
            </h3>

            <div className="space-y-4">
              <div>
                <div className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
                  Trạng thái hiện tại
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border"
                  style={{ background: sMeta.bg, borderColor: `${sMeta.color}40`, color: sMeta.color }}
                >
                  <StatusIcon size={15} />
                  <span className="text-[13px] font-medium">{sMeta.label}</span>
                </div>
              </div>

              <div>
                <div className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
                  Độ ưu tiên
                </div>
                {editing ? (
                  <div className="grid grid-cols-1 gap-2">
                    {PRIORITY_OPTIONS.map(item => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setPriority(item.value)}
                        className="rounded-xl px-3 py-2 text-left border"
                        style={{
                          background: priority === item.value ? item.bg : 'var(--bg3)',
                          borderColor: priority === item.value ? `${item.color}40` : 'var(--border)',
                          color: priority === item.value ? item.color : 'var(--text2)',
                        }}
                      >
                        <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                          <Flag size={14} />
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border"
                    style={{ background: pMeta.bg, borderColor: `${pMeta.color}40`, color: pMeta.color }}
                  >
                    <Flag size={14} />
                    <span className="text-[13px] font-medium">{pMeta.label}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
                  Người được giao
                </div>
                {editing ? (
                  <select
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full h-11 rounded-xl px-3 outline-none text-[13px]"
                    style={{
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    <option value="">Chưa giao cho ai</option>
                    {(members ?? []).map((m: GroupMember) => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} ({m.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className="rounded-2xl border px-3 py-3"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                  >
                    <div className="inline-flex items-center gap-2 text-[13px]" style={{ color: 'var(--text)' }}>
                      <User size={14} />
                      {assigneeName}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[12px] mb-2" style={{ color: 'var(--text3)' }}>
                  Deadline
                </div>
                {editing ? (
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full h-11 rounded-xl px-3 outline-none text-[13px]"
                    style={{
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                ) : (
                  <div
                    className="rounded-2xl border px-3 py-3"
                    style={{
                      background: overdue ? 'rgba(239,68,68,.08)' : 'var(--bg3)',
                      borderColor: overdue ? 'rgba(239,68,68,.25)' : 'var(--border)',
                    }}
                  >
                    <div
                      className="inline-flex items-center gap-2 text-[13px]"
                      style={{ color: overdue ? '#ef4444' : 'var(--text)' }}
                    >
                      <Calendar size={14} />
                      {fmtDate(task.deadline || deadline)}
                    </div>
                    {overdue && (
                      <div className="text-[12px] mt-1 inline-flex items-center gap-1" style={{ color: '#ef4444' }}>
                        <AlertCircle size={12} />
                        Task đã quá hạn
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Thông tin bổ sung
            </h3>

            <div className="space-y-3 text-[13px]">
              <div
                className="rounded-2xl border px-3 py-3 flex items-start gap-3"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <Users size={15} className="mt-0.5 text-indigo-400" />
                <div>
                  <div style={{ color: 'var(--text3)' }}>Nhóm</div>
                  <div style={{ color: 'var(--text)' }}>{group.name}</div>
                </div>
              </div>

              <div
                className="rounded-2xl border px-3 py-3 flex items-start gap-3"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <Calendar size={15} className="mt-0.5 text-indigo-400" />
                <div>
                  <div style={{ color: 'var(--text3)' }}>Ngày tạo</div>
                  <div style={{ color: 'var(--text)' }}>{fmtDate(task.createdAt)}</div>
                </div>
              </div>

              <div
                className="rounded-2xl border px-3 py-3 flex items-start gap-3"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <Clock3 size={15} className="mt-0.5 text-indigo-400" />
                <div>
                  <div style={{ color: 'var(--text3)' }}>Cập nhật gần nhất</div>
                  <div style={{ color: 'var(--text)' }}>{fmtDate(task.updatedAt || task.createdAt)}</div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Điều hướng nhanh
            </h3>

            <div className="grid grid-cols-1 gap-2">
              <Link
                to={`/groups/${groupId}`}
                className="h-11 rounded-xl border inline-flex items-center px-3 text-[13px]"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Về trang nhóm
              </Link>
              <Link
                to={`/groups/${groupId}/kanban`}
                className="h-11 rounded-xl border inline-flex items-center px-3 text-[13px]"
                style={{ background: 'rgba(99,102,241,.12)', borderColor: 'rgba(99,102,241,.20)', color: '#818cf8' }}
              >
                Về board task
              </Link>
              <Link
                to={`/groups/${groupId}/chat`}
                className="h-11 rounded-xl border inline-flex items-center px-3 text-[13px]"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Về chat nhóm
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}