import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi, groupApi } from '@/api/services'
import {
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Circle,
  BarChart3,
  Calendar,
  Clock as ClockIcon,
  FileCheck2,
  FolderOpen,
  ChevronRight,
  Users,
  LayoutDashboard,
  Flag,
  User2,
} from 'lucide-react'
import type { Task, TaskStatus } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  DragOverlay,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLUMNS: { id: TaskStatus; label: string; subtitle: string; color: string; bg: string; icon: any }[] = [
  {
    id: 'TODO',
    label: 'Chờ làm',
    subtitle: 'Task mới hoặc chưa bắt đầu',
    color: '#64748b',
    bg: 'rgba(100,116,139,.10)',
    icon: Circle,
  },
  {
    id: 'IN_PROGRESS',
    label: 'Đang làm',
    subtitle: 'Task đang được thực hiện',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,.10)',
    icon: Clock3,
  },
  {
    id: 'DONE',
    label: 'Hoàn thành',
    subtitle: 'Task đã hoàn thành',
    color: '#22c55e',
    bg: 'rgba(34,197,94,.10)',
    icon: CheckCircle2,
  },
]

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#64748b',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
}

function rid(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    if (v.$oid) return String(v.$oid)
    if (v.id) return String(v.id)
    if (v._id) return String(v._id)
  }
  return String(v)
}

function unwrapData<T = any>(value: any): T | undefined {
  if (!value) return undefined
  return (value.data ?? value.project ?? value) as T
}

function unwrapTaskList(value: any): Task[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.tasks)) return value.tasks
  if (Array.isArray(value?.content)) return value.content
  return []
}

function isTaskSubmitted(task: any) {
  return (
    !!task?.submission?.submitted ||
    !!task?.submitted ||
    task?.submissionStatus === 'SUBMITTED' ||
    task?.submitStatus === 'SUBMITTED'
  )
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('vi-VN')
}

function toInputDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

function toDeadlineInstant(value?: string) {
  if (!value?.trim()) return undefined
  return new Date(`${value}T23:59:00`).toISOString()
}

function Column({
  col,
  tasks,
  onAddTask,
  onOpenTask,
}: {
  col: (typeof COLUMNS)[number]
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
  onOpenTask: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const Icon = col.icon

  return (
    <section
      ref={setNodeRef}
      className="rounded-[24px] border p-4 transition-all min-h-[500px] flex flex-col"
      style={{
        background: isOver ? 'rgba(99,102,241,.08)' : 'var(--bg2)',
        borderColor: isOver ? 'rgba(99,102,241,.45)' : 'var(--border)',
        boxShadow: isOver ? '0 16px 40px rgba(99,102,241,.12)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: col.bg, color: col.color }}
          >
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
                {col.label}
              </h3>
              <span
                className="min-w-[24px] h-6 px-2 rounded-full text-[12px] font-bold inline-flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: col.color }}
              >
                {tasks.length}
              </span>
            </div>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text3)' }}>
              {col.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(col.id)}
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all hover:scale-105"
          style={{ background: col.bg, color: col.color }}
          title={`Thêm task vào ${col.label}`}
        >
          <Plus size={17} />
        </button>
      </div>

      <SortableContext items={tasks.map(t => rid(t.id))} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">
          {tasks.map(task => (
            <SortableTask key={rid(task.id)} task={task} onOpen={onOpenTask} />
          ))}

          {tasks.length === 0 && (
            <div
              className="h-28 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center px-4"
              style={{ borderColor: 'var(--border)', color: 'var(--text3)', background: 'var(--bg3)' }}
            >
              <FolderOpen size={20} className="mb-2 opacity-60" />
              <p className="text-[12px]">Chưa có task trong cột này</p>
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  )
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rid(task.id),
  })

  const submitted = isTaskSubmitted(task)
  const priority = task.priority || 'MEDIUM'
  const priorityColor = PRIORITY_COLOR[priority] || PRIORITY_COLOR.MEDIUM
  const deadlineText = formatDate(task.deadline)

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: 'var(--bg3)',
        borderColor: submitted ? 'rgba(34,197,94,.30)' : 'var(--border)',
        boxShadow: submitted ? '0 10px 24px rgba(34,197,94,.08)' : 'none',
      }}
      className={clsx(
        'group rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-[2px] hover:border-indigo-400/50',
        isDragging && 'opacity-50'
      )}
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="font-bold text-[14px] leading-snug truncate" style={{ color: 'var(--text)' }}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-[12px] mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--text2)' }}>
              {task.description}
            </p>
          )}
        </div>

        <span
          className="w-3 h-3 rounded-full mt-1 shrink-0 ring-4"
          style={{ background: priorityColor, boxShadow: `0 0 0 4px ${priorityColor}20` }}
          title={`Ưu tiên ${PRIORITY_LABEL[priority] ?? priority}`}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {submitted && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(34,197,94,.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,.22)' }}
          >
            <FileCheck2 size={12} />
            Đã nộp
          </span>
        )}

        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: `${priorityColor}14`, color: priorityColor }}
        >
          <Flag size={11} />
          {PRIORITY_LABEL[priority] ?? priority}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--text3)' }}>
        <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
          <User2 size={13} />
          <span className="truncate">{task.assigneeName || 'Chưa giao'}</span>
        </span>

        {deadlineText && (
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <ClockIcon size={13} />
            {deadlineText}
          </span>
        )}
      </div>
    </article>
  )
}

function TaskCard({ task, isDragging }: { task: Task; isDragging: boolean }) {
  const submitted = isTaskSubmitted(task)
  const priority = task.priority || 'MEDIUM'
  const priorityColor = PRIORITY_COLOR[priority] || PRIORITY_COLOR.MEDIUM

  return (
    <div
      className={clsx('p-4 rounded-2xl border', isDragging && 'opacity-90 rotate-1')}
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
          {task.title}
        </h4>
        <span className="w-3 h-3 rounded-full mt-1" style={{ background: priorityColor }} />
      </div>

      {submitted && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(34,197,94,.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,.22)' }}
        >
          <FileCheck2 size={12} />
          Đã nộp
        </span>
      )}
    </div>
  )
}

export default function ProjectKanbanPage() {
  const { groupId = '', projectId = '' } = useParams<{ groupId: string; projectId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [addModal, setAddModal] = useState<TaskStatus | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showProgressView, setShowProgressView] = useState(false)
  const [showEditTimeline, setShowEditTimeline] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupApi.get(groupId as any),
    enabled: !!groupId,
  })

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', groupId, projectId],
    queryFn: () => projectApi.getProject(groupId as any, projectId as any),
    enabled: !!groupId && !!projectId,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', groupId, projectId],
    queryFn: () => projectApi.getProjectTasks(groupId as any, projectId as any),
    enabled: !!groupId && !!projectId,
  })

  const { data: projectProgress } = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: () => projectApi.getProjectProgress(groupId as any, projectId as any),
    enabled: !!groupId && !!projectId,
  })

  const groupData: any = unwrapData(group)
  const projectData: any = unwrapData(project)
  const progressData: any = unwrapData(projectProgress)
  const taskList = useMemo(() => unwrapTaskList(tasks), [tasks])

  const groupName = groupData?.name || 'Nhóm học tập'
  const projectName = projectData?.name || progressData?.project?.name || 'Dự án'
  const projectDescription = projectData?.description || progressData?.project?.description || ''
  const completionPercent = Number(progressData?.summary?.completionPercent ?? 0)

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      projectApi.updateProjectTaskStatus(groupId as any, projectId as any, taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', groupId, projectId] })
      qc.invalidateQueries({ queryKey: ['project-progress', projectId] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái task'),
  })

  const onDragStart = (event: DragStartEvent) => {
    const task = taskList.find(t => rid(t.id) === rid(event.active.id))
    setActiveTask(task || null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const task = taskList.find(t => rid(t.id) === rid(active.id))
    if (!task) return

    const overId = rid(over.id)
    const newStatus =
      COLUMNS.find(c => c.id === overId)?.id ??
      taskList.find(t => rid(t.id) === overId)?.status

    if (newStatus && task.status !== newStatus) {
      updateStatus.mutate({ taskId: rid(task.id), status: newStatus })
    }
  }

  const byStatus = (status: TaskStatus) => taskList.filter(t => t.status === status)

  const counts = {
    total: taskList.length,
    todo: byStatus('TODO').length,
    progress: byStatus('IN_PROGRESS').length,
    done: byStatus('DONE').length,
    submitted: taskList.filter(isTaskSubmitted).length,
  }

  const getCountdownText = () => {
    if (!progressData?.timeline) return ''
    const { daysLeft } = progressData.timeline
    if (daysLeft > 0) return `Còn ${daysLeft} ngày`
    if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`
    return 'Hết hạn hôm nay'
  }

  const openTask = (task: Task) => {
    navigate(`/groups/${groupId}/projects/${projectId}/kanban/${rid(task.id)}`)
  }

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-5 pb-10">
      <section
        className="rounded-[28px] border overflow-hidden"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-2 text-[12px] mb-4 flex-wrap" style={{ color: 'var(--text3)' }}>
            <button type="button" onClick={() => navigate('/groups')} className="hover:text-indigo-400 transition-colors">
              Nhóm
            </button>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}`)}
              className="hover:text-indigo-400 transition-colors"
            >
              {groupName}
            </button>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}/projects`)}
              className="hover:text-indigo-400 transition-colors"
            >
              Dự án
            </button>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text2)' }}>{projectName}</span>
            <ChevronRight size={14} />
            <span className="font-semibold" style={{ color: '#818cf8' }}>Board task</span>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/projects`)}
                className="w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-all hover:scale-105"
                style={{ borderColor: 'var(--border)', background: 'var(--bg3)', color: 'var(--text2)' }}
                title="Quay lại danh sách dự án"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-2"
                  style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
                >
                  <FolderOpen size={13} />
                  Dự án và Task
                </div>
                <h1 className="text-[26px] md:text-[30px] font-black tracking-tight truncate" style={{ color: 'var(--text)' }}>
                  {projectLoading && projectName === 'Dự án' ? 'Đang tải dự án...' : projectName}
                </h1>
                <p className="text-[14px] mt-1 line-clamp-2" style={{ color: 'var(--text2)' }}>
                  {projectDescription || `Board công việc của ${groupName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {progressData?.timeline && (
                <button
                  type="button"
                  onClick={() => setShowEditTimeline(true)}
                  className="h-10 px-3 rounded-xl border inline-flex items-center gap-2 text-[12px] font-semibold transition-all hover:scale-[1.02] hover:border-indigo-400/50"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                  title="Bấm để chỉnh ngày bắt đầu / kết thúc dự án"
                >
                  <ClockIcon size={14} />
                  {getCountdownText()}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/chat`)}
                className="h-10 px-4 rounded-xl border inline-flex items-center gap-2 text-[12px] font-semibold transition-all hover:scale-[1.02]"
                style={{ borderColor: 'var(--border)', background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                <Users size={14} />
                Chat nhóm
              </button>

              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/projects/${projectId}/progress`)}
                className="h-10 px-4 rounded-xl border inline-flex items-center gap-2 text-[12px] font-semibold transition-all hover:scale-[1.02]"
                style={{ borderColor: 'var(--border)', background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                <BarChart3 size={14} />
                Tiến độ
              </button>

              <button
                type="button"
                onClick={() => setAddModal('TODO')}
                className="h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[12px] font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                <Plus size={15} />
                Thêm task
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <SummaryItem label="Tổng task" value={counts.total} icon={LayoutDashboard} color="#6366f1" />
          <SummaryItem label="Chờ làm" value={counts.todo} icon={Circle} color="#64748b" />
          <SummaryItem label="Đang làm" value={counts.progress} icon={Clock3} color="#f59e0b" />
          <SummaryItem label="Hoàn thành" value={counts.done} icon={CheckCircle2} color="#22c55e" />
          <SummaryItem label="Đã nộp" value={counts.submitted} icon={FileCheck2} color="#16a34a" />
        </div>

        <div className="px-5 md:px-6 pb-5">
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(Math.max(completionPercent, 0), 100)}%`,
                background: 'linear-gradient(90deg,#6366f1,#22c55e)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px]" style={{ color: 'var(--text3)' }}>
            <span>Tiến độ dự án</span>
            <span>{completionPercent.toFixed(0)}%</span>
          </div>
        </div>
      </section>

      {tasksLoading ? (
        <div
          className="rounded-[24px] border py-16 text-center"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          Đang tải board task...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
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

          <DragOverlay>{activeTask ? <TaskCard task={activeTask} isDragging /> : null}</DragOverlay>
        </DndContext>
      )}

      {addModal && (
        <AddTaskModal
          groupId={groupId}
          projectId={projectId}
          defaultStatus={addModal}
          onClose={() => setAddModal(null)}
        />
      )}

      {showEditTimeline && (
        <EditProjectTimelineModal
          groupId={groupId}
          projectId={projectId}
          project={projectData || progressData?.project}
          onClose={() => setShowEditTimeline(false)}
        />
      )}

      {showProgressView && (
        <ProgressView
          groupId={groupId}
          projectId={projectId}
          onClose={() => setShowProgressView(false)}
        />
      )}
    </div>
  )
}

function SummaryItem({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="px-5 py-4 border-r last:border-r-0" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text3)' }}>
        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}14`, color }}>
          <Icon size={15} />
        </span>
        <span className="text-[12px] font-semibold">{label}</span>
      </div>
      <div className="text-[24px] font-black" style={{ color }}>
        {value}
      </div>
    </div>
  )
}


function EditProjectTimelineModal({
  groupId,
  projectId,
  project,
  onClose,
}: {
  groupId: string
  projectId: string
  project: any
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [startDate, setStartDate] = useState(toInputDate(project?.startDate))
  const [endDate, setEndDate] = useState(toInputDate(project?.endDate))

  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error('Vui lòng chọn ngày bắt đầu và ngày kết thúc')
      }

      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
      }

      const payload = {
        name: name.trim() || project?.name || 'Dự án',
        description: description.trim(),
        startDate,
        endDate,
      }

      const api = projectApi as any

      if (typeof api.updateProject === 'function') {
        return api.updateProject(groupId, projectId, payload)
      }

      if (typeof api.update === 'function') {
        return api.update(groupId, projectId, payload)
      }

      if (typeof api.updateProjectDates === 'function') {
        return api.updateProjectDates(groupId, projectId, {
          startDate,
          endDate,
        })
      }

      throw new Error('Chưa có hàm updateProject/update trong projectApi')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', groupId, projectId] })
      qc.invalidateQueries({ queryKey: ['group-projects', groupId] })
      qc.invalidateQueries({ queryKey: ['group-projects-with-progress', groupId] })
      qc.invalidateQueries({ queryKey: ['project-progress', projectId] })
      toast.success('Đã cập nhật thời gian dự án')
      onClose()
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Không thể cập nhật thời gian dự án')
    },
  })

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[10000] sm:inset-0 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[24px] p-4 sm:p-6 border shadow-2xl"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>
              Chỉnh thời gian dự án
            </h2>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              Dùng phần này khi muốn kéo dài hoặc rút ngắn deadline dự án.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            updateProjectMutation.mutate()
          }}
        >
          <Field label="Tên dự án">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 h-11 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Tên dự án"
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Mô tả dự án"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ngày bắt đầu">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 h-11 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </Field>

            <Field label="Ngày kết thúc">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 h-11 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </Field>
          </div>

          <div className="rounded-2xl border p-3 text-[12px] leading-relaxed" style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text3)' }}>
            Sau khi lưu, số ngày còn lại và tiến độ dự án sẽ được tính lại theo ngày kết thúc mới.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updateProjectMutation.isPending}
              className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              {updateProjectMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddTaskModal({
  groupId,
  projectId,
  defaultStatus,
  onClose,
}: {
  groupId: string
  projectId: string
  defaultStatus: TaskStatus
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [deadline, setDeadline] = useState('')

  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () =>
      projectApi.createProjectTask(groupId, projectId, {
        title: title.trim(),
        description: description.trim(),
        assigneeId: assigneeId || undefined,
        status: defaultStatus,
        priority,
        deadline: toDeadlineInstant(deadline),
      }),
    onSuccess: () => {
      toast.success('Tạo task thành công')
      qc.invalidateQueries({ queryKey: ['project-tasks', groupId, projectId] })
      qc.invalidateQueries({ queryKey: ['project-progress', projectId] })
      onClose()
      setTitle('')
      setDescription('')
      setAssigneeId('')
      setPriority('MEDIUM')
      setDeadline('')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Tạo task thất bại')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề task')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[10000] sm:inset-0 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[calc(100dvh-4.5rem)] w-full max-w-md overflow-y-auto rounded-t-3xl border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[24px] sm:p-6"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>
              Tạo task mới
            </h2>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
              Task sẽ được thêm vào cột {COLUMNS.find(c => c.id === defaultStatus)?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tiêu đề *">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 h-11 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Nhập tiêu đề task"
              required
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Nhập mô tả task"
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ưu tiên">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                className="w-full px-4 h-11 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
              </select>
            </Field>

            <Field label="Deadline">
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-4 h-11 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/40"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold mb-2" style={{ color: 'var(--text2)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ProgressView({ groupId, projectId, onClose }: any) {
  const { data: progress } = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: () => projectApi.getProjectProgress(groupId, projectId),
    enabled: !!projectId,
  })

  const progressData: any = unwrapData(progress)

  if (!progressData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-2xl rounded-2xl p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
          <div className="text-center py-8" style={{ color: 'var(--text2)' }}>
            Đang tải...
          </div>
        </div>
      </div>
    )
  }

  const { project, summary, timeline, members } = progressData

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              Tiến độ dự án
            </h2>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              {project?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text2)' }}>Timeline</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {timeline?.totalDays ?? 0} ngày tổng
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
            <Calendar size={14} />
            <span>
              {formatDate(project?.startDate)} - {formatDate(project?.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1" style={{ color: (timeline?.daysLeft ?? 0) < 0 ? '#ef4444' : 'var(--text3)' }}>
            <ClockIcon size={14} />
            <span>
              {(timeline?.daysLeft ?? 0) > 0
                ? `Còn ${timeline.daysLeft} ngày`
                : (timeline?.daysLeft ?? 0) < 0
                  ? `Quá hạn ${Math.abs(timeline.daysLeft)} ngày`
                  : 'Hết hạn hôm nay'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Tổng quan
          </h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text2)' }}>
              Tổng số task hoàn thành
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {summary?.doneTasks ?? 0} / {summary?.totalTasks ?? 0}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(summary?.completionPercent ?? 0, 100)}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text3)' }}>
            <span>{summary?.todoTasks ?? 0} chờ làm</span>
            <span>{summary?.inProgressTasks ?? 0} đang làm</span>
            <span>{summary?.doneTasks ?? 0} hoàn thành</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Tiến độ thành viên
          </h4>
          <div className="space-y-3">
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <div key={member.userId} className="p-3 rounded-xl border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {member.fullName}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text3)' }}>
                      {member.completionPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(member.completionPercent, 100)}%`,
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text3)' }}>
                    <span>{member.doneTasks} hoàn thành</span>
                    <span>/ {member.totalTasks} tổng</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-center py-4" style={{ color: 'var(--text2)' }}>
                Chưa có thành viên nào
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
