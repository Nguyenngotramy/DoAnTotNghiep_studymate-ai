import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { groupApi, projectApi, taskApi } from '@/api/services'
import { ArrowLeft, Plus, Calendar, BarChart3, FolderOpen, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  name: string
  description?: string
  startDate?: string
  endDate?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  memberIds?: string[]
  createdAt?: string
}

interface ProjectProgress {
  project: Project
  summary: {
    totalTasks: number
    doneTasks: number
    inProgressTasks: number
    todoTasks: number
    completionPercent: number
  }
  timeline: {
    totalDays: number
    daysLeft: number
    elapsedPercent: number
  }
}

function unwrapProjects(response: any): Project[] {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.projects)) return response.projects
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.projects)) return response.data.projects
  return []
}

function unwrapProgress(response: any): ProjectProgress | null {
  return response?.data ?? response ?? null
}

function groupTaskSummary(tasks: any[]) {
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'DONE').length
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const todoTasks = tasks.filter(t => t.status === 'TODO').length
  const completionPercent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  return { totalTasks, doneTasks, inProgressTasks, todoTasks, completionPercent }
}

export default function ProjectListPage() {
  const { groupId = '' } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupApi.get(groupId as any),
    enabled: !!groupId,
  })

  const { data: groupTasks = [], isLoading: groupTasksLoading } = useQuery({
    queryKey: ['group-board-summary', groupId],
    queryFn: () => taskApi.list(groupId as any),
    enabled: !!groupId,
  })

  const groupSummary = groupTaskSummary(Array.isArray(groupTasks) ? groupTasks : [])
  const hasGroupBoard = groupSummary.totalTasks > 0
  const groupBoardName = (group as any)?.name || 'Board task nhóm'

  const { data: projectsWithProgress = [], isLoading } = useQuery({
    queryKey: ['group-projects-with-progress', groupId],
    queryFn: async () => {
      const projectResponse = await projectApi.getProjects(groupId as any)
      const projectList = unwrapProjects(projectResponse)

      const progressPromises = projectList.map(async (project: Project) => {
        try {
          const progressResponse = await projectApi.getProjectProgress(groupId as any, project.id)
          return { project, progress: unwrapProgress(progressResponse) }
        } catch {
          return { project, progress: null }
        }
      })

      return Promise.all(progressPromises) as Promise<
        { project: Project; progress: ProjectProgress | null }[]
      >
    },
    enabled: !!groupId,
  })

  const resetCreateForm = () => {
    setProjectName('')
    setProjectDescription('')
    setStartDate('')
    setEndDate('')
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectName.trim()) {
      toast.error('Vui lòng nhập tên dự án')
      return
    }

    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu')
      return
    }

    try {
      await projectApi.create(groupId as any, {
        name: projectName.trim(),
        description: projectDescription.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        memberIds: [],
      })

      toast.success('Tạo dự án thành công')
      setShowCreateModal(false)
      resetCreateForm()

      qc.invalidateQueries({ queryKey: ['group-projects', groupId] })
      qc.invalidateQueries({ queryKey: ['group-projects-with-progress', groupId] })
      qc.invalidateQueries({ queryKey: ['group-board-summary', groupId] })
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Tạo dự án thất bại')
    }
  }

  const openProjectBoard = (projectId: string) => {
    navigate(`/groups/${groupId}/projects/${projectId}/kanban`)
  }

  const openGroupBoard = () => {
    navigate(`/groups/${groupId}/kanban`)
  }

  const getCountdownText = (timeline: any, status: string) => {
    if (status === 'COMPLETED') return 'Đã hoàn thành'
    if (status === 'CANCELLED') return 'Đã hủy'

    const daysLeft = timeline?.daysLeft
    if (typeof daysLeft !== 'number') return 'Chưa có thời hạn'
    if (daysLeft > 0) return `Còn ${daysLeft} ngày`
    if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`
    return 'Hết hạn hôm nay'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'rgba(99,102,241,.14)'
      case 'IN_PROGRESS': return 'rgba(245,158,11,.14)'
      case 'COMPLETED': return 'rgba(34,197,94,.14)'
      case 'CANCELLED': return 'rgba(239,68,68,.14)'
      default: return 'var(--bg3)'
    }
  }

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return '#a5b4fc'
      case 'IN_PROGRESS': return '#fcd34d'
      case 'COMPLETED': return '#86efac'
      case 'CANCELLED': return '#fca5a5'
      default: return 'var(--text3)'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'Đang lập kế hoạch'
      case 'IN_PROGRESS': return 'Đang thực hiện'
      case 'COMPLETED': return 'Đã hoàn thành'
      case 'CANCELLED': return 'Đã hủy'
      default: return status || 'Đang lập kế hoạch'
    }
  }

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: 'var(--bg1)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/groups/${groupId}`)}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                Dự án và Task
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
                Tạo dự án trước, sau đó bấm vào dự án để mở bảng công việc.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-sm font-medium text-white transition-colors"
          >
            <Plus size={16} />
            Tạo dự án
          </button>
        </div>

        {isLoading || groupTasksLoading ? (
          <div className="text-center py-12" style={{ color: 'var(--text2)' }}>
            Đang tải dự án...
          </div>
        ) : projectsWithProgress.length > 0 || hasGroupBoard ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasGroupBoard && (
              <div
                className="p-5 rounded-2xl border cursor-pointer hover:border-indigo-500/50 transition-all"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                onClick={openGroupBoard}
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 truncate" style={{ color: 'var(--text)' }}>
                      {groupBoardName}
                    </h3>
                    <p className="text-sm line-clamp-2" style={{ color: 'var(--text2)' }}>
                      Board task nhóm đang có dữ liệu, mở để tiếp tục quản lý công việc.
                    </p>
                  </div>

                  <div
                    className="px-2 py-1 rounded-lg text-xs font-medium shrink-0"
                    style={{ background: 'rgba(99,102,241,.14)', color: '#a5b4fc' }}
                  >
                    Kanban nhóm
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 text-xs" style={{ color: 'var(--text2)' }}>
                    <span>Tiến độ</span>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>
                      {groupSummary.completionPercent}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: String(Math.min(groupSummary.completionPercent, 100)) + '%',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs" style={{ color: 'var(--text3)' }}>
                    <span>{groupSummary.todoTasks} chờ làm</span>
                    <span>{groupSummary.inProgressTasks} đang làm</span>
                    <span>{groupSummary.doneTasks}/{groupSummary.totalTasks} xong</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openGroupBoard()
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                  >
                    <FolderOpen size={14} />
                    Mở Kanban
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openGroupBoard()
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                  >
                    <BarChart3 size={14} />
                    Xem tiến độ
                  </button>
                </div>
              </div>
            )}
            {projectsWithProgress.map(({ project, progress }) => (
              <div
                key={project.id}
                className="p-5 rounded-2xl border cursor-pointer hover:border-indigo-500/50 transition-all"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                onClick={() => openProjectBoard(project.id)}
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 truncate" style={{ color: 'var(--text)' }}>
                      {project.name}
                    </h3>
                    <p className="text-sm line-clamp-2" style={{ color: 'var(--text2)' }}>
                      {project.description || 'Không có mô tả'}
                    </p>
                  </div>

                  <div
                    className="px-2 py-1 rounded-lg text-xs font-medium shrink-0"
                    style={{
                      background: getStatusColor(project.status),
                      color: getStatusTextColor(project.status),
                    }}
                  >
                    {getStatusLabel(project.status)}
                  </div>
                </div>

                {project.startDate && project.endDate && (
                  <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'var(--text3)' }}>
                    <Calendar size={14} />
                    <span>
                      {new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}

                {progress && (
                  <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'var(--text3)' }}>
                    <Clock size={14} />
                    <span>{getCountdownText(progress.timeline, project.status)}</span>
                  </div>
                )}

                {progress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 text-xs" style={{ color: 'var(--text2)' }}>
                      <span>Tiến độ</span>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>
                        {Number(progress.summary?.completionPercent ?? 0).toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(Number(progress.summary?.completionPercent ?? 0), 100)}%`,
                          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        }}
                      />
                    </div>

                    <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text3)' }}>
                      <span>{progress.summary?.doneTasks ?? 0} task hoàn thành</span>
                      <span>/ {progress.summary?.totalTasks ?? 0} tổng</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openProjectBoard(project.id)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                  >
                    <FolderOpen size={14} />
                    Mở dự án
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/groups/${groupId}/projects/${project.id}/progress`)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                  >
                    <BarChart3 size={14} />
                    Tiến độ
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen size={64} style={{ color: 'var(--text3)' }} />
            <p className="mt-4 text-lg" style={{ color: 'var(--text)' }}>
              Chưa có dự án nào
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text2)' }}>
              Tạo dự án đầu tiên để bắt đầu quản lý task theo từng dự án.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              <Plus size={16} />
              Tạo dự án đầu tiên
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Tạo dự án mới
              </h2>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: 'var(--text2)' }}
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Tên dự án *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="VD: Hoàn thiện module nhóm học"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Mô tả
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Nhập mô tả dự án"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
