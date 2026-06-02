import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi, groupApi } from '@/api/services'
import { Plus, ArrowLeft, KanbanSquare, CheckCircle2, Clock3, Circle, BarChart3, FolderOpen, Calendar, Clock as ClockIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { Task, TaskStatus } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { DndContext, useSensors, useSensor, PointerSensor, DragOverlay, closestCorners, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLUMNS: { id: TaskStatus; label: string; color: string; icon: any }[] = [
  { id: 'TODO', label: 'Chờ làm', color: '#64748b', icon: Circle },
  { id: 'IN_PROGRESS', label: 'Đang làm', color: '#f59e0b', icon: Clock3 },
  { id: 'DONE', label: 'Hoàn thành', color: '#22c55e', icon: CheckCircle2 },
]

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#64748b',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
}

function Column({ col, tasks, onAddTask, onOpenTask }: any) {
  return (
    <div className="flex-1 min-w-[300px] rounded-2xl p-4" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <col.icon size={18} style={{ color: col.color }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{col.label}</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(col.id)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text2)' }}
        >
          <Plus size={16} />
        </button>
      </div>

      <SortableContext items={tasks.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task: Task) => (
            <SortableTask key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ ...style, background: 'var(--bg3)', borderColor: 'var(--border)' }}
      className={clsx('p-4 rounded-xl border cursor-pointer hover:border-indigo-500/50 transition-all', isDragging && 'opacity-50')}
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm" style={{ color: 'var(--text)' }}>{task.title}</h4>
        <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.MEDIUM }} />
      </div>
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text2)' }}>{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
          {task.assigneeName && <span>{task.assigneeName}</span>}
          {task.deadline && (
            <span className="flex items-center gap-1">
              <ClockIcon size={12} />
              {new Date(task.deadline).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, isDragging }: { task: Task; isDragging: boolean }) {
  return (
    <div className={clsx('p-4 rounded-xl border', isDragging && 'opacity-50')} style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm" style={{ color: 'var(--text)' }}>{task.title}</h4>
        <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.MEDIUM }} />
      </div>
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text2)' }}>{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
          {task.assigneeName && <span>{task.assigneeName}</span>}
          {task.deadline && (
            <span className="flex items-center gap-1">
              <ClockIcon size={12} />
              {new Date(task.deadline).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProjectKanbanPage() {
  const { groupId = '', projectId = '' } = useParams<{ groupId: string; projectId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [addModal, setAddModal] = useState<TaskStatus | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showProgressView, setShowProgressView] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupApi.get(groupId as any),
    enabled: !!groupId,
  })

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getProject(groupId as any, projectId as any),
    enabled: !!projectId,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', groupId, projectId],
    queryFn: () => projectApi.getProjectTasks(groupId as any, projectId as any),
    enabled: !!projectId,
  })

  const { data: projectProgress } = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: () => projectApi.getProjectProgress(groupId as any, projectId as any),
    enabled: !!projectId,
  })

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      projectApi.updateProjectTaskStatus(groupId as any, projectId as any, taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', groupId, projectId] })
      qc.invalidateQueries({ queryKey: ['project-progress', projectId] })
    },
  })

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks?.data.find((t: Task) => t.id === active.id)
    setActiveTask(task || null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const task = tasks?.data.find((t: Task) => t.id === active.id)
    if (!task) return

    const newStatus = over.id as TaskStatus
    if (task.status !== newStatus) {
      updateStatus.mutate({ taskId: task.id, status: newStatus })
    }
  }

  const byStatus = (status: TaskStatus) => {
    return tasks?.data.filter((t: Task) => t.status === status) || []
  }

  const counts = {
    total: tasks?.data.length || 0,
    todo: byStatus('TODO').length,
    progress: byStatus('IN_PROGRESS').length,
    done: byStatus('DONE').length,
  }

  const getCountdownText = () => {
    if (!projectProgress?.data?.timeline) return ''
    const { daysLeft } = projectProgress.data.timeline
    if (daysLeft > 0) return `Còn ${daysLeft} ngày`
    if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`
    return 'Hết hạn hôm nay'
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg1)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/groups/${groupId}/projects`)}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                {project?.data?.name || 'Loading...'}
              </h1>
              {group && (
                <p className="text-sm" style={{ color: 'var(--text2)' }}>
                  {group.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectProgress?.data?.timeline && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
                <ClockIcon size={14} />
                {getCountdownText()}
              </div>
            )}
            <button
              onClick={() => navigate(`/groups/${groupId}/chat`)}
              className="px-3 h-10 rounded-xl border inline-flex items-center text-[12px]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              Về chat nhóm
            </button>
            <button
              onClick={() => navigate(`/groups/${groupId}/projects/${projectId}/progress`)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
              style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
            >
              <BarChart3 size={14} />
              Tiến độ
            </button>
            <button
              onClick={() => setAddModal('TODO')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-[12px] font-medium text-white transition-colors"
            >
              <Plus size={14} />
              Thêm task
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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

        {/* Kanban Board */}
        {tasksLoading ? (
          <div className="text-center py-12" style={{ color: 'var(--text2)' }}>
            Đang tải...
          </div>
        ) : (
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
                  onOpenTask={setActiveTask}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add Task Modal */}
        {addModal && (
          <AddTaskModal
            groupId={groupId}
            projectId={projectId}
            defaultStatus={addModal}
            onClose={() => setAddModal(null)}
          />
        )}

        {/* Progress View Modal */}
        {showProgressView && (
          <ProgressView
            groupId={groupId}
            projectId={projectId}
            onClose={() => setShowProgressView(false)}
          />
        )}
      </div>
    </div>
  )
}

function AddTaskModal({ groupId, projectId, defaultStatus, onClose }: any) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [deadline, setDeadline] = useState('')

  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () =>
      projectApi.createProjectTask(groupId, projectId, {
        title,
        description,
        assigneeId,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
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
    onError: () => {
      toast.error('Tạo task thất bại')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề task')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Tạo task mới
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Tiêu đề *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Nhập tiêu đề task"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Nhập mô tả task"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-60"
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

function ProgressView({ groupId, projectId, onClose }: any) {
  const { data: progress } = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: () => projectApi.getProjectProgress(groupId, projectId),
    enabled: !!projectId,
  })

  if (!progress?.data) {
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

  const { project, summary, timeline, members } = progress.data

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              Tiến độ dự án
            </h2>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              {project.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text2)' }}
          >
            ✕
          </button>
        </div>

        {/* Timeline Info */}
        <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text2)' }}>Timeline</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {timeline.totalDays} ngày tổng
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
            <Calendar size={14} />
            <span>
              {new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1" style={{ color: timeline.daysLeft < 0 ? '#ef4444' : 'var(--text3)' }}>
            <ClockIcon size={14} />
            <span>
              {timeline.daysLeft > 0 ? `Còn ${timeline.daysLeft} ngày` : timeline.daysLeft < 0 ? `Quá hạn ${Math.abs(timeline.daysLeft)} ngày` : 'Hết hạn hôm nay'}
            </span>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Tổng quan
          </h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text2)' }}>
              Tổng số task hoàn thành
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {summary.doneTasks} / {summary.totalTasks}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(summary.completionPercent, 100)}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text3)' }}>
            <span>{summary.todoTasks} chờ làm</span>
            <span>{summary.inProgressTasks} đang làm</span>
            <span>{summary.doneTasks} hoàn thành</span>
          </div>
        </div>

        {/* Member Progress */}
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Tiến độ thành viên
          </h4>
          <div className="space-y-3">
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <div
                  key={member.userId}
                  className="p-3 rounded-xl border"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
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
