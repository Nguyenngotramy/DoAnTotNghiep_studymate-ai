import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { projectApi } from '@/api/services'
import { ArrowLeft, RefreshCw, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import ProjectProgressHeader from '@/components/ProjectProgressHeader'
import ProjectKpiCards from '@/components/ProjectKpiCards'
import ProjectProgressCharts from '@/components/ProjectProgressCharts'
import MemberProgressRow from '@/components/MemberProgressRow'
import UrgentTasksPanel from '@/components/UrgentTasksPanel'
import MemberProgressTable from '@/components/MemberProgressTable'

function unwrapProgress(response: any) {
  if (!response) return null
  return response.data ?? (response.project ? response : null)
}

export default function ProjectProgressPage() {
  const { groupId = '', projectId = '' } = useParams<{ groupId: string; projectId: string }>()
  const navigate = useNavigate()

  const { data: progress, isLoading, refetch } = useQuery({
    queryKey: ['project-progress', groupId, projectId],
    queryFn: () => projectApi.getProjectProgress(groupId, projectId),
    enabled: !!projectId,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 flex items-center justify-center" style={{ background: 'var(--bg1)' }}>
        <div style={{ color: 'var(--text2)' }}>Đang tải...</div>
      </div>
    )
  }

  const progressData = unwrapProgress(progress)

  if (!progressData) {
    return (
      <div className="min-h-screen p-3 sm:p-6 flex items-center justify-center" style={{ background: 'var(--bg1)' }}>
        <div style={{ color: 'var(--text2)' }}>Không tìm thấy dữ liệu tiến độ</div>
      </div>
    )
  }

  const { project, summary, timeline, members, urgentTasks, timeSeries } = progressData

  const handleExport = async () => {
    try {
      const blob = await projectApi.exportProjectProgress(groupId, projectId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bao_cao_tien_do_${project.name}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Đã xuất báo cáo')
    } catch (error) {
      toast.error('Xuất báo cáo thất bại')
    }
  }

  return (
    <div className="min-h-screen p-3 pb-24 sm:p-6 lg:pb-6" style={{ background: 'var(--bg1)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <ProjectProgressHeader
          project={project}
          timeline={timeline}
          summary={summary}
          onBack={() => navigate(`/groups/${groupId}/projects/${projectId}/kanban`)}
          onRefresh={() => refetch()}
          onExport={handleExport}
        />

        {/* KPI Cards */}
        <ProjectKpiCards summary={summary} timeline={timeline} />

        {/* Charts */}
        <ProjectProgressCharts timeSeries={timeSeries} summary={summary} members={members} />

        {/* Urgent Tasks */}
        {urgentTasks && urgentTasks.length > 0 && (
          <UrgentTasksPanel tasks={urgentTasks} projectId={projectId} groupId={groupId} />
        )}

        {/* Member Progress */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Tiến độ thành viên
          </h3>
          <div className="space-y-3">
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <MemberProgressRow
                  key={member.userId}
                  fullName={member.fullName}
                  avatar={member.avatar}
                  role={member.role}
                  totalTasks={member.totalTasks}
                  doneTasks={member.doneTasks}
                  inProgressTasks={member.inProgressTasks}
                  todoTasks={member.todoTasks}
                  overdueTasks={member.overdueTasks}
                  completionPercent={member.completionPercent}
                  statusLabel={member.statusLabel}
                />
              ))
            ) : (
              <div className="text-sm text-center py-4" style={{ color: 'var(--text2)' }}>
                Chưa có thành viên nào
              </div>
            )}
          </div>
        </div>

        {/* Member Progress Table */}
        <div className="mt-6">
          <MemberProgressTable members={members} />
        </div>
      </div>
    </div>
  )
}
