import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  ImagePlus,
  Upload,
  Trash2,
  Save,
  FolderOpen,
  BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { taskApi } from '@/api/services'
import type { Task, TaskAttachment, TaskPriority, TaskStatus } from '@/types'

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; icon: any }> = {
  TODO: { label: 'Cần làm', color: '#64748b', bg: 'rgba(100,116,139,.10)', icon: Circle },
  IN_PROGRESS: { label: 'Đang làm', color: '#f59e0b', bg: 'rgba(245,158,11,.10)', icon: Clock3 },
  DONE: { label: 'Hoàn thành', color: '#22c55e', bg: 'rgba(34,197,94,.10)', icon: CheckCircle2 },
}

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Thấp', color: '#22c55e', bg: 'rgba(34,197,94,.10)' },
  MEDIUM: { label: 'Trung bình', color: '#f59e0b', bg: 'rgba(245,158,11,.10)' },
  HIGH: { label: 'Cao', color: '#ef4444', bg: 'rgba(239,68,68,.10)' },
}

function rid(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    if ((v as any).$oid) return String((v as any).$oid)
    if ((v as any).id) return String((v as any).id)
    if ((v as any)._id) return String((v as any)._id)
  }
  return String(v)
}

function toDatetimeLocal(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PersonalTaskDetailPage() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: task, isLoading } = useQuery({
    queryKey: ['personal-task', taskId],
    queryFn: () => taskApi.getPersonal(taskId),
    enabled: !!taskId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const [answerText, setAnswerText] = useState('')
  const [files, setFiles] = useState<TaskAttachment[]>([])
  const [images, setImages] = useState<TaskAttachment[]>([])

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftStatus, setDraftStatus] = useState<TaskStatus>('TODO')
  const [draftPriority, setDraftPriority] = useState<TaskPriority>('MEDIUM')
  const [draftDeadline, setDraftDeadline] = useState('')

  const syncFromTask = (t: Task) => {
    setDraftTitle(t.title ?? '')
    setDraftDescription(t.description ?? '')
    setDraftStatus((t.status ?? 'TODO') as TaskStatus)
    setDraftPriority((t.priority ?? 'MEDIUM') as TaskPriority)
    setDraftDeadline(toDatetimeLocal(t.deadline))
    setAnswerText(t.submission?.answerText ?? '')
    setFiles((t.submission?.files as TaskAttachment[]) ?? [])
    setImages((t.submission?.images as TaskAttachment[]) ?? [])
  }

  useMemo(() => {
    if (task) syncFromTask(task)
  }, [task])

  const updateMut = useMutation({
    mutationFn: () =>
      taskApi.updatePersonal(taskId, {
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        status: draftStatus,
        priority: draftPriority,
        deadline: draftDeadline ? new Date(draftDeadline).toISOString() : undefined,
      }),
    onSuccess: data => {
      toast.success('Đã cập nhật task cá nhân')
      qc.invalidateQueries({ queryKey: ['personal-task', taskId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
      syncFromTask(data)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật task')
    },
  })

  const statusMut = useMutation({
    mutationFn: (status: TaskStatus) => taskApi.updatePersonalStatus(taskId, status),
    onSuccess: data => {
      toast.success('Đã cập nhật trạng thái')
      qc.invalidateQueries({ queryKey: ['personal-task', taskId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
      syncFromTask(data)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật trạng thái')
    },
  })

  const submitMut = useMutation({
    mutationFn: () =>
      taskApi.submitPersonal(taskId, {
        answerText,
        files,
        images,
      }),
    onSuccess: data => {
      toast.success('Đã nộp bài')
      qc.invalidateQueries({ queryKey: ['personal-task', taskId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
      syncFromTask(data)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể nộp bài')
    },
  })

  const clearSubmitMut = useMutation({
    mutationFn: () => taskApi.clearPersonalSubmission(taskId),
    onSuccess: data => {
      toast.success('Đã xoá bài nộp')
      qc.invalidateQueries({ queryKey: ['personal-task', taskId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
      syncFromTask(data)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá bài nộp')
    },
  })

  const uploadFileMut = useMutation({
    mutationFn: (file: File) => taskApi.uploadFile(file),
    onSuccess: data => {
      setFiles(prev => [
        ...prev,
        {
          name: data.name,
          url: data.url,
          type: data.type,
          size: typeof data.size === 'number' ? data.size : data.sizeKb,
        } as TaskAttachment,
      ])
      toast.success('Đã upload file')
    },
    onError: () => toast.error('Upload file thất bại'),
  })

  const uploadImageMut = useMutation({
    mutationFn: (file: File) => taskApi.uploadImage(file),
    onSuccess: data => {
      setImages(prev => [
        ...prev,
        {
          name: data.name,
          url: data.url,
          type: data.type,
          size: typeof data.size === 'number' ? data.size : data.sizeKb,
        } as TaskAttachment,
      ])
      toast.success('Đã upload ảnh')
    },
    onError: () => toast.error('Upload ảnh thất bại'),
  })

  const currentStatus = STATUS_META[(task?.status ?? draftStatus) as TaskStatus]
  const currentPriority = PRIORITY_META[(task?.priority ?? draftPriority) as TaskPriority]
  const submitted = !!task?.submission?.submitted

  if (isLoading || !task) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.55fr] gap-4">
        <div className="h-96 rounded-[24px] animate-pulse" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }} />
        <div className="h-96 rounded-[24px] animate-pulse" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[24px] border p-4 sm:p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] mb-2" style={{ color: 'var(--text3)' }}>
              <Link to="/kanban" className="hover:underline">Nhiệm vụ</Link>
              <span> / </span>
              <span>Task cá nhân</span>
              <span> / </span>
              <span>Chi tiết</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/kanban')}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-[24px] font-semibold" style={{ color: 'var(--text)' }}>
                  {task.title}
                </h1>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                  Task ID: {rid(task.id)} • loại: Task cá nhân
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateMut.mutate()}
              className="h-9 px-4 rounded-xl text-[12px] font-medium flex items-center gap-2"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              <PencilIcon />
              Chỉnh sửa
            </button>
            <button
              onClick={() => navigate('/kanban/progress')}
              className="h-9 px-4 rounded-xl text-[12px] font-medium flex items-center gap-2"
              style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
            >
              <BarChart3 size={14} />
              Xem tiến độ
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.55fr] gap-4">
        <div className="space-y-4">
          <section
            className="rounded-[24px] border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Chi tiết nhiệm vụ
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] block mb-1.5" style={{ color: 'var(--text2)' }}>Tiêu đề</label>
                <input
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="w-full h-11 rounded-xl px-4 text-[13px] outline-none"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label className="text-[12px] block mb-1.5" style={{ color: 'var(--text2)' }}>Mô tả</label>
                <textarea
                  value={draftDescription}
                  onChange={e => setDraftDescription(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none resize-none"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>
          </section>

          <section
            className="rounded-[24px] border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Trạng thái công việc
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(STATUS_META) as TaskStatus[]).map(status => {
                const meta = STATUS_META[status]
                const active = draftStatus === status
                const Icon = meta.icon
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setDraftStatus(status)
                      statusMut.mutate(status)
                    }}
                    className="text-left rounded-2xl border p-4 transition-all"
                    style={{
                      background: active ? meta.bg : 'var(--bg3)',
                      borderColor: active ? meta.color : 'var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: meta.color }} />
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-[11px] mt-2" style={{ color: 'var(--text3)' }}>
                      {status === 'TODO' && 'Task mới được tạo hoặc chưa bắt đầu'}
                      {status === 'IN_PROGRESS' && 'Task đang được thực hiện'}
                      {status === 'DONE' && 'Task đã hoàn thành'}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section
            className="rounded-[24px] border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Nộp bài / Submission
            </div>

            <div
              className="rounded-xl border p-3 mb-4"
              style={{
                background: submitted ? 'rgba(34,197,94,.08)' : 'var(--bg3)',
                borderColor: submitted ? 'rgba(34,197,94,.35)' : 'var(--border)',
              }}
            >
              <div className="text-[13px] font-medium" style={{ color: submitted ? '#16a34a' : 'var(--text2)' }}>
                {submitted ? 'Đã nộp' : 'Chưa nộp'}
              </div>
              {submitted && task.submission?.submittedAt && (
                <div className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                  Đã nộp lúc {new Date(task.submission.submittedAt).toLocaleString('vi-VN')}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] block mb-1.5" style={{ color: 'var(--text2)' }}>
                  Câu trả lời / đáp án
                </label>
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="Nhập đáp án, mô tả cách làm, hoặc nội dung bài nộp..."
                  rows={5}
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none resize-none"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <div className="text-[12px] mb-1.5" style={{ color: 'var(--text2)' }}>File đã nộp</div>
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={`${file.url}-${idx}`}
                      className="rounded-xl border p-3 flex items-center justify-between gap-3"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text3)' }}>{file.type || 'FILE'}</div>
                      </div>
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,.10)', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[12px] mb-1.5" style={{ color: 'var(--text2)' }}>Ảnh đã nộp</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={`${img.url}-${idx}`}
                      className="rounded-xl border p-2"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(239,68,68,.10)', color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className="h-11 rounded-xl border flex items-center justify-center gap-2 text-[12px] font-medium cursor-pointer"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  <Upload size={14} />
                  Upload file bài làm
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) uploadFileMut.mutate(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>

                <label
                  className="h-11 rounded-xl border flex items-center justify-center gap-2 text-[12px] font-medium cursor-pointer"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  <ImagePlus size={14} />
                  Upload ảnh bài làm
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) uploadImageMut.mutate(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => submitMut.mutate()}
                  className="h-10 px-4 rounded-xl text-[12px] font-medium flex items-center gap-2"
                  style={{ background: '#6366f1', color: '#fff' }}
                >
                  <Save size={14} />
                  Cập nhật bài nộp
                </button>

                <button
                  onClick={() => clearSubmitMut.mutate()}
                  className="h-10 px-4 rounded-xl text-[12px] font-medium flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,.10)', color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  Xoá bài nộp
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section
            className="rounded-[24px] border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Thuộc tính task
            </div>

            <div className="space-y-3">
              <InfoBox label="Trạng thái hiện tại">
                <span
                  className="inline-flex px-3 py-1 rounded-xl text-[12px] font-medium"
                  style={{ background: currentStatus.bg, color: currentStatus.color }}
                >
                  {currentStatus.label}
                </span>
              </InfoBox>

              <InfoBox label="Độ ưu tiên">
                <span
                  className="inline-flex px-3 py-1 rounded-xl text-[12px] font-medium"
                  style={{ background: currentPriority.bg, color: currentPriority.color }}
                >
                  {currentPriority.label}
                </span>
              </InfoBox>

              <InfoBox label="Deadline">
                <div className="text-[12px]" style={{ color: 'var(--text)' }}>
                  {task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : 'Chưa có'}
                </div>
              </InfoBox>
            </div>
          </section>

          <section
            className="rounded-[24px] border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Thông tin bổ sung
            </div>

            <div className="space-y-3">
              <InfoBox label="Loại">
                <div className="text-[12px]" style={{ color: '#10b981' }}>Task cá nhân</div>
              </InfoBox>

              <InfoBox label="Ngày tạo">
                <div className="text-[12px]" style={{ color: 'var(--text)' }}>
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString('vi-VN') : '—'}
                </div>
              </InfoBox>

              <InfoBox label="Cập nhật gần nhất">
                <div className="text-[12px]" style={{ color: 'var(--text)' }}>
                  {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('vi-VN') : '—'}
                </div>
              </InfoBox>
            </div>
          </section>

          <section
            className="rounded-[24px] border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Điều hướng nhanh
            </div>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/kanban')}
                className="w-full h-10 rounded-xl text-left px-3 text-[12px]"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                Về board task cá nhân
              </button>
              <button
                onClick={() => navigate('/kanban/progress')}
                className="w-full h-10 rounded-xl text-left px-3 text-[12px]"
                style={{ background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.25)', color: '#6366f1' }}
              >
                Về trang tiến độ
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div className="text-[11px] mb-1.5" style={{ color: 'var(--text3)' }}>{label}</div>
      {children}
    </div>
  )
}

function PencilIcon() {
  return <span style={{ fontSize: 12 }}>✏️</span>
}