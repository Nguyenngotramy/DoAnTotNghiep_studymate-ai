import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  AlertTriangle,
  TrendingUp,
  Flag,
  KanbanSquare,
  FolderOpen,
  RefreshCcw,
} from 'lucide-react'
import { taskApi } from '@/api/services'
import type { TaskPriority, TaskStatus } from '@/types'

type ProgressResponse = {
  summary: {
    total: number
    todo: number
    inProgress: number
    done: number
    overdue: number
  }
  byMonth: Record<string, number>
  roadmap: Array<{
    id: string
    title: string
    groupId: string
    personal: boolean
    status: TaskStatus
    priority: TaskPriority
    deadline?: string
    label?: string
  }>
}

const PRIORITY_STYLE: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  HIGH: { label: 'Cao', color: '#ef4444', bg: 'rgba(239,68,68,.10)' },
  MEDIUM: { label: 'Trung bình', color: '#f59e0b', bg: 'rgba(245,158,11,.10)' },
  LOW: { label: 'Thấp', color: '#22c55e', bg: 'rgba(34,197,94,.10)' },
}

const STATUS_STYLE: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO: { label: 'Cần làm', color: '#8b8b9e', bg: 'rgba(139,139,158,.10)' },
  IN_PROGRESS: { label: 'Đang làm', color: '#f59e0b', bg: 'rgba(245,158,11,.10)' },
  DONE: { label: 'Hoàn thành', color: '#22c55e', bg: 'rgba(34,197,94,.10)' },
}

function KpiCard({
  title,
  value,
  sub,
  color,
  icon,
}: {
  title: string
  value: number | string
  sub: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="rounded-[24px] border p-5 relative overflow-hidden"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div
        className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full"
        style={{ background: `${color}12` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
            {title}
          </p>
          <h3 className="text-[30px] font-semibold mt-1 leading-none" style={{ color }}>
            {value}
          </h3>
          <p className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
            {sub}
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}12`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
          {label}
        </span>
        <span className="text-[12px] font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function MonthBarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([, v]) => v), 1)

  if (!entries.length) {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
      >
        <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
          Chưa có dữ liệu deadline theo tháng.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {entries.map(([month, count]) => {
        const pct = (count / max) * 100
        return (
          <div key={month} className="grid grid-cols-[88px_1fr_44px] items-center gap-3">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text2)' }}>
              {month}
            </div>
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              />
            </div>
            <div className="text-[12px] font-semibold text-right" style={{ color: '#6366f1' }}>
              {count}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TaskProgressPage() {
  const navigate = useNavigate()

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ProgressResponse>({
    queryKey: ['my-task-progress'],
    queryFn: () => taskApi.myProgress(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  })

  if (isError) {
    return (
      <div className="h-full flex flex-col gap-5">
        <div
          className="rounded-[28px] border p-5 sm:p-6"
          style={{
            background: 'linear-gradient(160deg, color-mix(in srgb, var(--bg2) 92%, #6366f1 8%), var(--bg2))',
            borderColor: 'color-mix(in srgb, var(--border) 80%, #6366f1 20%)',
          }}
        >
          <button
            onClick={() => navigate('/kanban')}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-medium"
            style={{
              background: 'var(--bg3)',
              color: 'var(--text2)',
              border: '1px solid var(--border)',
            }}
          >
            <ArrowLeft size={14} />
            Quay lại nhiệm vụ
          </button>

          <h1 className="text-[22px] font-semibold mt-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <BarChart3 size={20} className="text-indigo-400" />
            Tiến độ nhiệm vụ
          </h1>
          <p className="text-[12px] mt-1.5" style={{ color: 'var(--text3)' }}>
            Không tải được dữ liệu tiến độ.
          </p>
        </div>

        <div
          className="rounded-[24px] border p-6"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[16px] font-semibold text-red-500">API tiến độ đang lỗi</div>
          <div className="text-[13px] mt-3" style={{ color: 'var(--text3)' }}>
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              'Lỗi không xác định'}
          </div>

          <button
            onClick={() => refetch()}
            className="mt-5 h-10 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <RefreshCcw size={14} />
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  const summary = data?.summary ?? {
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
  }

  const roadmap = data?.roadmap ?? []

  const completionPct = useMemo(() => {
    if (!summary.total) return 0
    return Math.round((summary.done / summary.total) * 100)
  }, [summary.done, summary.total])

  const upcomingRoadmap = useMemo(() => {
    return [...roadmap].sort((a, b) => {
      const ta = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
      const tb = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
      return ta - tb
    })
  }, [roadmap])

  return (
    <div className="h-full flex flex-col gap-5">
      <div
        className="rounded-[28px] border p-5 sm:p-6"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--bg2) 92%, #6366f1 8%), var(--bg2))',
          borderColor: 'color-mix(in srgb, var(--border) 80%, #6366f1 20%)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/kanban')}
              className="mb-3 inline-flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-medium"
              style={{
                background: 'var(--bg3)',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
              }}
            >
              <ArrowLeft size={14} />
              Quay lại nhiệm vụ
            </button>

            <h1 className="text-[22px] font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <BarChart3 size={20} className="text-indigo-400" />
              Tiến độ nhiệm vụ
            </h1>
            <p className="text-[12px] mt-1.5" style={{ color: 'var(--text3)' }}>
              Theo dõi tổng quan các task cá nhân và task từ nhóm bạn tạo hoặc được giao cho bạn.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="h-10 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2"
              style={{
                background: 'var(--bg3)',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
              }}
            >
              <RefreshCcw size={14} className={isFetching ? 'animate-spin' : ''} />
              Làm mới
            </button>

            <div
              className="rounded-[22px] px-5 py-4 min-w-[220px]"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
                Tỷ lệ hoàn thành
              </p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-[32px] font-semibold leading-none" style={{ color: '#22c55e' }}>
                  {completionPct}%
                </span>
                <span className="text-[12px] mb-1" style={{ color: 'var(--text3)' }}>
                  đã xong
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden mt-3"
                style={{ background: 'rgba(34,197,94,.12)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${completionPct}%`, background: '#22c55e' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-[24px] animate-pulse"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard title="Tổng task" value={summary.total} sub="Tất cả nhiệm vụ" color="#6366f1" icon={<KanbanSquare size={18} />} />
            <KpiCard title="Cần làm" value={summary.todo} sub="Chưa bắt đầu" color="#8b8b9e" icon={<CircleDashed size={18} />} />
            <KpiCard title="Đang làm" value={summary.inProgress} sub="Đang thực hiện" color="#f59e0b" icon={<Clock3 size={18} />} />
            <KpiCard title="Hoàn thành" value={summary.done} sub="Đã xử lý xong" color="#22c55e" icon={<CheckCircle2 size={18} />} />
            <KpiCard title="Quá hạn" value={summary.overdue} sub="Cần ưu tiên" color="#ef4444" icon={<AlertTriangle size={18} />} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4">
            <div className="rounded-[24px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={17} className="text-indigo-400" />
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                  Tổng quan tiến độ
                </h2>
              </div>

              <div className="space-y-4">
                <ProgressBar label="Cần làm" value={summary.todo} total={summary.total} color="#8b8b9e" />
                <ProgressBar label="Đang làm" value={summary.inProgress} total={summary.total} color="#f59e0b" />
                <ProgressBar label="Hoàn thành" value={summary.done} total={summary.total} color="#22c55e" />
                <ProgressBar label="Quá hạn" value={summary.overdue} total={summary.total} color="#ef4444" />
              </div>

              <div className="mt-5 rounded-2xl p-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <p className="text-[12px] font-medium" style={{ color: 'var(--text2)' }}>
                  Gợi ý
                </p>
                <p className="text-[12px] mt-1.5 leading-6" style={{ color: 'var(--text3)' }}>
                  {summary.overdue > 0
                    ? `Bạn đang có ${summary.overdue} task quá hạn. Nên ưu tiên xử lý các task deadline gần nhất trước.`
                    : summary.inProgress > 0
                      ? `Bạn đang có ${summary.inProgress} task đang làm. Hãy hoàn thành dứt điểm từng task để tăng hiệu quả.`
                      : `Tiến độ hiện tại khá ổn. Hãy tiếp tục duy trì nhịp độ học và làm task đều đặn.`}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <CalendarClock size={17} className="text-violet-400" />
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                  Task theo tháng
                </h2>
              </div>

              <MonthBarChart data={data?.byMonth ?? {}} />
            </div>
          </div>

          <div className="rounded-[24px] border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-5">
              <FolderOpen size={17} className="text-emerald-400" />
              <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                Lộ trình task theo deadline
              </h2>
            </div>

            {!upcomingRoadmap.length ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                  Chưa có task nào để hiển thị tiến độ.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingRoadmap.map((item, index) => {
                  const statusStyle = STATUS_STYLE[item.status]
                  const priorityStyle = PRIORITY_STYLE[item.priority]
                  const isOverdue =
                    !!item.deadline &&
                    new Date(item.deadline).getTime() < Date.now() &&
                    item.status !== 'DONE'

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border p-4"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                          style={{ background: 'rgba(99,102,241,.10)', color: '#6366f1' }}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                              {item.title}
                            </h3>

                            <span className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                              {statusStyle.label}
                            </span>

                            <span className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>
                              {priorityStyle.label}
                            </span>

                            {item.personal && (
                              <span className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(16,185,129,.10)', color: '#10b981' }}>
                                Cá nhân
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-3 mt-2">
                            {item.deadline ? (
                              <div className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: isOverdue ? '#ef4444' : 'var(--text3)' }}>
                                <CalendarClock size={12} />
                                {new Date(item.deadline).toLocaleString('vi-VN')}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text3)' }}>
                                <CalendarClock size={12} />
                                Chưa có deadline
                              </div>
                            )}

                            {item.label && (
                              <div className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: '#6366f1' }}>
                                <Flag size={12} />
                                {item.label}
                              </div>
                            )}
                          </div>
                        </div>

                        {isOverdue && (
                          <div className="px-3 py-2 rounded-xl text-[11px] font-medium self-start" style={{ background: 'rgba(239,68,68,.10)', color: '#ef4444' }}>
                            Quá hạn
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}