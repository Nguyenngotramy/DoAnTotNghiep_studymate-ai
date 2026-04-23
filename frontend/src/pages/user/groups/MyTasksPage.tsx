import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  KanbanSquare,
  Calendar,
  User,
  Plus,
  BarChart3,
  ChevronDown,
  X,
  Flag,
  Pencil,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { taskApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import type { Task, TaskPriority, TaskStatus } from '@/types'

type FilterMode = 'ALL' | 'PERSONAL' | 'GROUP'

type GroupOption = {
  id: string
  name: string
  subject?: string
  coverColor?: string
}

type TaskForm = {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  deadline: string
  label: string
  labelColor: string
}

const COLS: { id: TaskStatus; label: string; color: string; bg: string; emptyIcon: string }[] = [
  { id: 'TODO', label: 'Cần làm', color: '#8b8b9e', bg: 'rgba(139,139,158,.1)', emptyIcon: '📋' },
  { id: 'IN_PROGRESS', label: 'Đang làm', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', emptyIcon: '⚡' },
  { id: 'DONE', label: 'Hoàn thành', color: '#22c55e', bg: 'rgba(34,197,94,.1)', emptyIcon: '✅' },
]

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  HIGH: { label: 'Cao', color: '#ef4444', icon: '🔴' },
  MEDIUM: { label: 'TB', color: '#f59e0b', icon: '🟡' },
  LOW: { label: 'Thấp', color: '#22c55e', icon: '🟢' },
}

const defaultForm: TaskForm = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  deadline: '',
  label: '',
  labelColor: '#6366f1',
}

function toDatetimeLocal(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function TaskModal({
  title,
  loading,
  initialData,
  submitText,
  hintText,
  onClose,
  onSubmit,
}: {
  title: string
  loading: boolean
  initialData?: Partial<TaskForm>
  submitText: string
  hintText: string
  onClose: () => void
  onSubmit: (body: TaskForm) => void
}) {
  const [form, setForm] = useState<TaskForm>({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    priority: initialData?.priority ?? 'MEDIUM',
    status: initialData?.status ?? 'TODO',
    deadline: initialData?.deadline ?? '',
    label: initialData?.label ?? '',
    labelColor: initialData?.labelColor ?? '#6366f1',
  })

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-[28px] border p-5 sm:p-6"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
              {title}
            </h3>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              {hintText}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
              Tiêu đề
            </label>
            <input
              value={form.title}
              onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
              placeholder="Nhập tiêu đề task"
              className="w-full h-11 rounded-2xl px-4 text-[13px] outline-none"
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
              Mô tả
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
              placeholder="Mô tả ngắn về task"
              rows={4}
              className="w-full rounded-2xl px-4 py-3 text-[13px] outline-none resize-none"
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={e => setForm(s => ({ ...s, status: e.target.value as TaskStatus }))}
                className="w-full h-11 rounded-2xl px-4 text-[13px] outline-none"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                <option value="TODO">Cần làm</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="DONE">Hoàn thành</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
                Ưu tiên
              </label>
              <select
                value={form.priority}
                onChange={e => setForm(s => ({ ...s, priority: e.target.value as TaskPriority }))}
                className="w-full h-11 rounded-2xl px-4 text-[13px] outline-none"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
                Deadline
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => setForm(s => ({ ...s, deadline: e.target.value }))}
                className="w-full h-11 rounded-2xl px-4 text-[13px] outline-none"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div>
              <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
                Nhãn
              </label>
              <input
                value={form.label}
                onChange={e => setForm(s => ({ ...s, label: e.target.value }))}
                placeholder="VD: Tự học, Báo cáo..."
                className="w-full h-11 rounded-2xl px-4 text-[13px] outline-none"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
              Màu nhãn
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(s => ({ ...s, labelColor: color }))}
                  className={clsx(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    form.labelColor === color ? 'scale-110' : 'opacity-80',
                  )}
                  style={{
                    background: color,
                    borderColor: form.labelColor === color ? '#fff' : 'transparent',
                    boxShadow: form.labelColor === color ? `0 0 0 2px ${color}55` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl text-[13px] font-medium"
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
            }}
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.title.trim()}
            className="flex-1 h-11 rounded-2xl text-[13px] font-medium disabled:opacity-60"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            {loading ? 'Đang lưu...' : submitText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyTasksPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [dragId, setDragId] = useState<string | null>(null)
  const [mode, setMode] = useState<FilterMode>('ALL')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-task-groups'],
    queryFn: () => taskApi.myGroups(),
    enabled: !!user,
  })

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', mode, selectedGroupId],
    queryFn: () =>
      taskApi.myList({
        mode,
        groupId: mode === 'GROUP' ? selectedGroupId : undefined,
      }),
    enabled: !!user && (mode !== 'GROUP' || !!selectedGroupId),
  })

  const createPersonalMut = useMutation({
    mutationFn: (body: TaskForm) =>
      taskApi.createPersonal({
        title: body.title.trim(),
        description: body.description.trim(),
        status: body.status,
        priority: body.priority,
        deadline: body.deadline ? new Date(body.deadline).toISOString() : undefined,
        label: body.label.trim() || undefined,
        labelColor: body.labelColor,
      }),
    onSuccess: () => {
      toast.success('Đã tạo task cá nhân')
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
      setShowCreateModal(false)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể tạo task')
    },
  })

  const updatePersonalMut = useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: TaskForm }) =>
      taskApi.updatePersonal(taskId, {
        title: body.title.trim(),
        description: body.description.trim(),
        status: body.status,
        priority: body.priority,
        deadline: body.deadline ? new Date(body.deadline).toISOString() : undefined,
        label: body.label.trim() || undefined,
        labelColor: body.labelColor,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật task cá nhân')
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
      setEditingTask(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật task cá nhân')
    },
  })

  const updateStatusMut = useMutation({
    mutationFn: ({
      taskId,
      status,
      personal,
      groupId,
    }: {
      taskId: string
      status: TaskStatus
      personal?: boolean
      groupId?: string
    }) => {
      if (personal) return taskApi.updatePersonalStatus(taskId, status)
      if (!groupId) throw new Error('Thiếu groupId để cập nhật task nhóm')
      return taskApi.updateStatus(groupId, taskId, status)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-task-progress'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật trạng thái task')
    },
  })

  const move = (task: Task, status: TaskStatus) => {
    if (task.status === status) return
    updateStatusMut.mutate({
      taskId: task.id,
      status,
      personal: task.personal,
      groupId: task.groupId,
    })
  }

  const stats = useMemo(() => {
    return {
      todo: tasks.filter(t => t.status === 'TODO').length,
      doing: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      done: tasks.filter(t => t.status === 'DONE').length,
    }
  }, [tasks])

  const selectedGroupMeta = useMemo<GroupOption | null>(() => {
    return myGroups.find(g => g.id === selectedGroupId) ?? null
  }, [myGroups, selectedGroupId])

  const subtitle = useMemo(() => {
    if (mode === 'PERSONAL') return 'Các task cá nhân bạn tự tạo ngoài nhóm'
    if (mode === 'GROUP') {
      return selectedGroupMeta
        ? `Task trong nhóm ${selectedGroupMeta.name} mà bạn tạo hoặc được giao cho bạn`
        : 'Chọn một nhóm để xem task'
    }
    return 'Tất cả task từ nhóm bạn tạo / được giao cho bạn và task cá nhân'
  }, [mode, selectedGroupMeta])

  const openTask = (task: Task) => {
    if (task.personal) {
      navigate(`/kanban/personal/${task.id}`)
      return
    }

    if (task.groupId) {
      navigate(`/groups/${task.groupId}/kanban/${task.id}`)
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {showCreateModal && (
        <TaskModal
          title="Tạo task cá nhân"
          hintText="Task này sẽ nằm ở mục “Của tôi”, không thuộc nhóm nào."
          loading={createPersonalMut.isPending}
          submitText="OK"
          onClose={() => setShowCreateModal(false)}
          onSubmit={body => createPersonalMut.mutate(body)}
        />
      )}

      {editingTask && (
        <TaskModal
          title="Chỉnh sửa task cá nhân"
          hintText="Task cá nhân hiện có thể sửa nhanh ngay tại đây. Nếu bạn muốn giao diện nộp bài y hệt ảnh cho task cá nhân thì cần thêm backend submission riêng."
          loading={updatePersonalMut.isPending}
          submitText="Lưu thay đổi"
          initialData={{
            title: editingTask.title,
            description: editingTask.description ?? '',
            priority: editingTask.priority,
            status: editingTask.status,
            deadline: toDatetimeLocal(editingTask.deadline),
            label: editingTask.label ?? '',
            labelColor: editingTask.labelColor ?? '#6366f1',
          }}
          onClose={() => setEditingTask(null)}
          onSubmit={body => updatePersonalMut.mutate({ taskId: editingTask.id, body })}
        />
      )}

      <div
        className="rounded-[28px] border p-5 sm:p-6"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--bg2) 92%, #6366f1 8%), var(--bg2))',
          borderColor: 'color-mix(in srgb, var(--border) 80%, #6366f1 20%)',
        }}
      >
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <KanbanSquare size={19} className="text-indigo-400" />
              Nhiệm vụ của tôi
            </h1>
            <p className="text-[12px] mt-1.5" style={{ color: 'var(--text3)' }}>
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 rounded-2xl text-[13px] font-medium flex items-center gap-2"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              <Plus size={14} />
              Tạo task
            </button>

            <button
              onClick={() => navigate('/kanban/progress')}
              className="h-10 px-4 rounded-2xl text-[13px] font-medium flex items-center gap-2"
              style={{
                background: 'var(--bg3)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              <BarChart3 size={14} />
              Xem tiến độ
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mt-5">
          <div className="flex gap-2">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PERSONAL', label: 'Của tôi' },
              { key: 'GROUP', label: 'Theo nhóm' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => {
                  setMode(item.key as FilterMode)
                  if (item.key !== 'GROUP') setSelectedGroupId('')
                }}
                className="px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={
                  mode === item.key
                    ? {
                        background: 'var(--bg3)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--text3)',
                        border: '1px solid transparent',
                      }
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mode === 'GROUP' && (
              <div className="relative min-w-[230px]">
                <select
                  value={selectedGroupId}
                  onChange={e => setSelectedGroupId(e.target.value)}
                  className="appearance-none w-full h-10 rounded-2xl px-4 pr-10 text-[13px] outline-none"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <option value="">Chọn nhóm đã tham gia</option>
                  {myGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text3)' }}
                />
              </div>
            )}

            <div className="flex gap-1.5">
              {[
                { label: 'Cần làm', val: stats.todo, color: '#8b8b9e' },
                { label: 'Đang làm', val: stats.doing, color: '#f59e0b' },
                { label: 'Xong', val: stats.done, color: '#22c55e' },
              ].map(s => (
                <div
                  key={s.label}
                  className="px-3 py-1.5 rounded-xl text-center min-w-[64px]"
                  style={{
                    background: s.color + '12',
                    border: `1px solid ${s.color}25`,
                  }}
                >
                  <div className="text-[15px] font-semibold font-mono" style={{ color: s.color }}>
                    {s.val}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--text3)' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mode === 'GROUP' && !selectedGroupId ? (
        <div
          className="flex-1 rounded-[24px] border flex items-center justify-center text-center p-8"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div>
            <div className="text-3xl mb-3">👥</div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
              Hãy chọn một nhóm
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              Sau khi chọn nhóm, hệ thống sẽ hiện các task bạn tạo hoặc được giao trong nhóm đó.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0">
          {COLS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id)

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl border overflow-hidden min-h-[420px]"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (!dragId) return
                  const task = tasks.find(t => t.id === dragId)
                  if (!task) return
                  move(task, col.id)
                  setDragId(null)
                }}
              >
                <div
                  className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-semibold flex-1" style={{ color: 'var(--text)' }}>
                    {col.label}
                  </span>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                    style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-28 rounded-2xl animate-pulse"
                        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
                      />
                    ))
                  ) : colTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="text-2xl mb-2" style={{ opacity: 0.3 }}>
                        {col.emptyIcon}
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
                        Không có task
                      </p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const priorityCfg = PRIORITY_CFG[task.priority]
                      const isOverdue =
                        !!task.deadline &&
                        new Date(task.deadline).getTime() < Date.now() &&
                        task.status !== 'DONE'

                      const groupColor =
                        task.personal
                          ? '#10b981'
                          : myGroups.find(g => g.id === task.groupId)?.coverColor || '#6366f1'

                      const groupName =
                        task.personal
                          ? 'Task cá nhân'
                          : myGroups.find(g => g.id === task.groupId)?.name || 'Nhóm học tập'

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDragId(task.id)}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => openTask(task)}
                          className={clsx(
                            'p-3.5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg',
                            dragId === task.id ? 'opacity-40' : 'opacity-100',
                            task.personal ? 'cursor-pointer' : 'cursor-pointer'
                          )}
                          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: groupColor }} />
                            <span
                              className="text-[10px] font-medium truncate"
                              style={{ color: groupColor }}
                            >
                              {groupName}
                            </span>

                            <span
                              className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg"
                              style={{ background: priorityCfg.color + '12', color: priorityCfg.color }}
                            >
                              <span>{priorityCfg.icon}</span>
                              {priorityCfg.label}
                            </span>

                            {task.personal && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setEditingTask(task)
                                }}
                                className="w-7 h-7 rounded-xl flex items-center justify-center"
                                style={{
                                  background: 'var(--bg2)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text2)',
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                          </div>

                          <p className="text-[13px] font-medium leading-snug mb-2.5" style={{ color: 'var(--text)' }}>
                            {task.title}
                          </p>

                          {task.description && (
                            <div
                              className="text-[11px] leading-relaxed mb-3 line-clamp-2"
                              style={{ color: 'var(--text3)' }}
                            >
                              {task.description}
                            </div>
                          )}

                          <div className="flex items-center flex-wrap gap-2">
                            {task.deadline && (
                              <div
                                className="flex items-center gap-1 text-[10px]"
                                style={{ color: isOverdue ? '#ef4444' : 'var(--text3)' }}
                              >
                                <Calendar size={10} />
                                {new Date(task.deadline).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </div>
                            )}

                            {task.label && (
                              <div
                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                                style={{
                                  color: task.labelColor || '#6366f1',
                                  background: `${task.labelColor || '#6366f1'}14`,
                                }}
                              >
                                <Flag size={10} />
                                {task.label}
                              </div>
                            )}

                            <div className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: 'var(--text3)' }}>
                              <User size={10} />
                              <span className="truncate max-w-[90px]">
                                {task.assigneeName?.split(' ').pop() || 'Bạn'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                            {COLS.filter(c => c.id !== col.id).map(c => (
                              <button
                                key={c.id}
                                onClick={e => {
                                  e.stopPropagation()
                                  move(task, c.id)
                                }}
                                className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-100 opacity-70"
                                style={{ background: c.color + '15', color: c.color }}
                              >
                                → {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}