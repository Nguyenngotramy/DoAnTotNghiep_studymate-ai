import { AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface UrgentTasksPanelProps {
  tasks: any[]
  projectId: string
  groupId: string
}

export default function UrgentTasksPanel({ tasks, projectId, groupId }: UrgentTasksPanelProps) {
  const navigate = useNavigate()

  const getUrgencyColor = (urgency: string) => {
    return urgency === 'OVERDUE' ? '#ef4444' : '#f97316'
  }

  const getUrgencyLabel = (urgency: string) => {
    return urgency === 'OVERDUE' ? 'Quá hạn' : 'Sắp đến hạn'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444'
      case 'MEDIUM':
        return '#f59e0b'
      case 'LOW':
        return '#22c55e'
      default:
        return '#6b7280'
    }
  }

  return (
    <div className="p-5 rounded-2xl border mb-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} style={{ color: '#ef4444' }} />
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Cần chú ý
        </h3>
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#ef4444' }}>
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 rounded-xl border cursor-pointer hover:border-indigo-500/50 transition-all"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            onClick={() => navigate(`/groups/${groupId}/projects/${projectId}/kanban`)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>
                  {task.title}
                </h4>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
                  <Clock size={14} />
                  <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ background: 'rgba(239, 68, 68, 0.14)', color: getUrgencyColor(task.urgency) }}
                  >
                    {getUrgencyLabel(task.urgency)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ background: 'rgba(107, 114, 128, 0.14)', color: getPriorityColor(task.priority) }}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text3)' }} />
            </div>
            {task.assigneeName && (
              <div className="text-xs" style={{ color: 'var(--text3)' }}>
                Người phụ trách: {task.assigneeName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
