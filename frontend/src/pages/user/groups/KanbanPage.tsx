import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { taskApi, groupApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import type { Task, TaskStatus } from '@/types'
import {
  Plus,
  Calendar,
  User2,
  GripVertical,
  ArrowLeft,
  KanbanSquare,
  CheckCircle2,
  Clock3,
  Circle,
  Filter,
  FileCheck2,
} from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { vi } from 'date-fns/locale'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const COLUMNS: { id: TaskStatus; label: string; color: string; icon: any }[] = [
  { id: 'TODO', label: 'Chờ làm', color: '#64748b', icon: Circle },
  { id: 'IN_PROGRESS', label: 'Đang làm', color: '#f59e0b', icon: Clock3 },
  { id: 'DONE', label: 'Hoàn thành', color: '#22c55e', icon: CheckCircle2 },
]

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
}

type FilterMode = 'ALL' | 'MINE'

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

function TaskCard({
  task,
  isDragging = false,
  onClick,
}: {
  task: Task
  isDragging?: boolean
  onClick?: () => void
}) {
  const deadline = task.deadline ? new Date(task.deadline) : null
  const deadlineCls = deadline
    ? isPast(deadline) && task.status !== 'DONE'
      ? 'text-red-500 dark:text-red-400'
      : isToday(deadline)
        ? 'text-amber-500 dark:text-amber-400'
        : ''
    : ''

  const submitted = !!task.submission?.submitted

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-xl p-3 select-none border transition-all',
        isDragging ? 'shadow-xl opacity-90 rotate-1' : 'hover:-translate-y-[1px]'
      )}
      style={{
        background: 'var(--bg3)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start gap-2 justify-between mb-2">
        <div className="flex flex-wrap gap-2">
          {task.label && (
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide"
              style={{ background: `${task.labelColor}20`, color: task.labelColor }}
            >
              {task.label}
            </span>
          )}

          {submitted && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide"
              style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e' }}
            >
              <FileCheck2 size={11} />
              Đã nộp
            </span>
          )}
        </div>
      </div>

      <p className="text-[13px] font-medium leading-snug mb-2" style={{ color: 'var(--text)' }}>
        {task.title}
      </p>

      {task.description && (
        <p className="text-[11px] line-clamp-2 mb-3" style={{ color: 'var(--text3)' }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: PRIORITY_COLOR[task.priority] ?? '#5a5a6e' }}
        />

        {task.assigneeName && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text3)' }}>
            <User2 size={10} />
            {task.assigneeName.split(' ').pop()}
          </span>
        )}

        {deadline && (
          <span className={clsx('flex items-center gap-1 text-[10px] ml-auto font-mono', deadlineCls)}
            style={{ color: deadlineCls ? undefined : 'var(--text3)' }}
          >
            <Calendar size={10} />
            {format(deadline, 'dd/MM', { locale: vi })}
          </span>
        )}
      </div>
    </button>
  )
}

function SortableTask({
  task,
  onOpen,
}: {
  task: Task
  onOpen: (task: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rid(task.id),
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx('mb-2 last:mb-0', isDragging && 'opacity-40')}
      {...attributes}
    >
      <div className="flex gap-1">
        <button
          {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing mt-2 flex-shrink-0"
          style={{ color: 'var(--text3)' }}
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1">
          <TaskCard task={task} onClick={() => onOpen(task)} />
        </div>
      </div>
    </div>
  )
}

function Column({
  col,
  tasks,
  onAddTask,
  onOpenTask,
}: {
  col: typeof COLUMNS[0]
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
  onOpenTask: (task: Task) => void
}) {
  const Icon = col.icon

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden min-h-[560px] border"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,.02)' }}
      >
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${col.color}20`, color: col.color }}
        >
          <Icon size={15} />
        </span>

        <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
          {col.label}
        </span>

        <span
          className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border"
          style={{
            background: 'var(--bg3)',
            color: 'var(--text3)',
            borderColor: 'var(--border)',
          }}
        >
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 p-2.5 overflow-y-auto">
        <SortableContext items={tasks.map(t => rid(t.id))} strategy={verticalListSortingStrategy}>
          {tasks.map(t => (
            <SortableTask key={rid(t.id)} task={t} onOpen={onOpenTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className="h-28 rounded-xl border border-dashed flex items-center justify-center text-[11px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
          >
            Chưa có task
          </div>
        )}
      </div>

      <button
        onClick={() => onAddTask(col.id)}
        className="mx-2.5 mb-2.5 py-2 flex items-center justify-center gap-1.5 border border-dashed rounded-lg text-[11px] transition-all"
        style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
      >
        <Plus size={13} />
        Thêm task
      </button>
    </div>
  )
}

function AddTaskModal({
  groupId,
  defaultStatus,
  onClose,
}: {
  groupId: string
  defaultStatus: TaskStatus
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'MEDIUM' as Task['priority'],
    label: '',
    labelColor: '#6366f1',
    deadline: '',
    assigneeId: '',
  })

  const mut = useMutation({
    mutationFn: () =>
      taskApi.create(groupId as any, {
        ...form,
        assigneeId: form.assigneeId || undefined,
        deadline: form.deadline || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      toast.success('Đã tạo task!')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Lỗi tạo task'),
  })

  const inp =
    'w-full h-10 px-3 rounded-xl outline-none text-[13px]'

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-3xl p-5 w-full max-w-md border"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Thêm task mới
        </h3>

        <div className="space-y-3">
          <input
            className={inp}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="Tiêu đề task *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />

          <textarea
            className={clsx(inp, '!h-20 py-2 resize-none')}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="Mô tả (tùy chọn)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              className={inp}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
            >
              <option value="TODO">Chờ làm</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="DONE">Hoàn thành</option>
            </select>

            <select
              className={inp}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
            >
              <option value="HIGH">Ưu tiên cao</option>
              <option value="MEDIUM">Ưu tiên vừa</option>
              <option value="LOW">Ưu tiên thấp</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              className={inp}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Nhãn (VD: Backend)"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />

            <div
              className="flex items-center gap-2 rounded-xl px-3 border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text3)' }}>Màu</span>
              <input
                type="color"
                value={form.labelColor}
                onChange={e => setForm(f => ({ ...f, labelColor: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
            </div>
          </div>

          <input
            type="date"
            className={inp}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border text-[12px] transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            Huỷ
          </button>
          <button
            onClick={() => {
              if (!form.title.trim()) {
                toast.error('Nhập tiêu đề task')
                return
              }
              mut.mutate()
            }}
            disabled={mut.isPending}
            className="flex-1 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-[12px] font-medium text-white transition-colors"
          >
            {mut.isPending ? 'Đang lưu...' : 'Tạo task'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const { groupId = '' } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [addModal, setAddModal] = useState<TaskStatus | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupApi.get(groupId as any),
    enabled: !!groupId,
  })

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', groupId],
    queryFn: () => taskApi.list(groupId as any),
    enabled: !!groupId,
  })

  const filteredTasks = useMemo(() => {
    if (filterMode === 'ALL') return tasks
    const myId = rid(user?.id)
    return tasks.filter(t => rid((t as any).assigneeId) === myId)
  }, [tasks, filterMode, user])

  const counts = useMemo(() => {
    return {
      total: filteredTasks.length,
      todo: filteredTasks.filter(t => t.status === 'TODO').length,
      progress: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
      done: filteredTasks.filter(t => t.status === 'DONE').length,
    }
  }, [filteredTasks])

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      taskApi.updateStatus(groupId as any, taskId as any, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', groupId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
    },
    onError: () => {
      toast.error('Không thể cập nhật trạng thái task')
    },
  })

  const byStatus = (s: TaskStatus) => filteredTasks.filter(t => t.status === s)

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(filteredTasks.find(t => rid(t.id) === rid(e.active.id)) ?? null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const task = filteredTasks.find(t => rid(t.id) === rid(active.id))
    if (!task) return

    const newStatus =
      COLUMNS.find(c => c.id === over.id)?.id ??
      filteredTasks.find(t => rid(t.id) === rid(over.id))?.status

    if (newStatus && newStatus !== task.status) {
      updateStatus.mutate({ taskId: rid(task.id), status: newStatus })
    }
  }

  const openTask = (task: Task) => {
    navigate(`/groups/${groupId}/kanban/${rid(task.id)}`)
  }

  if (isLoading) {
    return (
      <div className="page-enter flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-5">
      <div
        className="rounded-3xl border px-5 py-4"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <Link
            to={`/groups/${groupId}`}
            className="w-10 h-10 rounded-xl border flex items-center justify-center"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg3)' }}
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <KanbanSquare size={18} className="text-indigo-400" />
              <h1 className="text-[18px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                {group?.name ?? 'Kanban Board'}
              </h1>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Quản lý task nhóm theo kiểu Jira · bấm vào card để xem chi tiết
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/groups/${groupId}/chat`}
              className="px-3 h-10 rounded-xl border inline-flex items-center text-[12px]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              Về chat nhóm
            </Link>

            <button
              onClick={() => setAddModal('TODO')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-[12px] font-medium text-white transition-colors"
            >
              <Plus size={14} />
              Thêm task
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl px-4 py-3 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] mb-1" style={{ color: 'var(--text3)' }}>Tổng task</div>
            <div className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>{counts.total}</div>
          </div>
          <div className="rounded-2xl px-4 py-3 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] mb-1" style={{ color: 'var(--text3)' }}>Chờ làm</div>
            <div className="text-[20px] font-semibold" style={{ color: '#94a3b8' }}>{counts.todo}</div>
          </div>
          <div className="rounded-2xl px-4 py-3 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] mb-1" style={{ color: 'var(--text3)' }}>Đang làm</div>
            <div className="text-[20px] font-semibold" style={{ color: '#f59e0b' }}>{counts.progress}</div>
          </div>
          <div className="rounded-2xl px-4 py-3 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] mb-1" style={{ color: 'var(--text3)' }}>Hoàn thành</div>
            <div className="text-[20px] font-semibold" style={{ color: '#22c55e' }}>{counts.done}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 text-[12px]" style={{ color: 'var(--text3)' }}>
            <Filter size={14} />
            Lọc:
          </div>

          <button
            onClick={() => setFilterMode('ALL')}
            className="px-3 h-9 rounded-xl text-[12px] font-medium"
            style={{
              background: filterMode === 'ALL' ? 'rgba(99,102,241,.14)' : 'var(--bg3)',
              color: filterMode === 'ALL' ? '#a5b4fc' : 'var(--text3)',
              border: `1px solid ${filterMode === 'ALL' ? 'rgba(99,102,241,.25)' : 'var(--border)'}`,
            }}
          >
            Tất cả
          </button>

          <button
            onClick={() => setFilterMode('MINE')}
            className="px-3 h-9 rounded-xl text-[12px] font-medium"
            style={{
              background: filterMode === 'MINE' ? 'rgba(99,102,241,.14)' : 'var(--bg3)',
              color: filterMode === 'MINE' ? '#a5b4fc' : 'var(--text3)',
              border: `1px solid ${filterMode === 'MINE' ? 'rgba(99,102,241,.25)' : 'var(--border)'}`,
            }}
          >
            Giao cho tôi
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              tasks={byStatus(col.id)}
              onAddTask={setAddModal}
              onOpenTask={openTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {addModal && (
        <AddTaskModal
          groupId={groupId}
          defaultStatus={addModal}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  )
}