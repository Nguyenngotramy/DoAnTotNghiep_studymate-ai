import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  BarChart3,
  RefreshCw,
  Users,
  Users2,
  FileText,
  CheckSquare,
  BrainCircuit,
  GraduationCap,
} from 'lucide-react'

type TimeMode = 'DAY' | 'WEEK' | 'MONTH'

export default function AdminStats() {
  const [loading, setLoading] = useState(false)
  const [timeMode, setTimeMode] = useState<TimeMode>('DAY')
  const [stats, setStats] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [mlRecords, setMlRecords] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any>(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      const [statsRes, groupsRes, mlRes, alertsRes] = await Promise.all([
        adminApi.getSystemStats(),
        adminApi.getGroups(0),
        adminApi.getMLResults(0),
        adminApi.getAlertCenter(),
      ])

      setStats(statsRes)
      setGroups(groupsRes?.content || [])
      setMlRecords(Array.isArray(mlRes) ? mlRes : mlRes?.content || [])
      setAlerts(alertsRes)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tải thống kê hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const groupChart = useMemo(() => {
    return buildTimeStats(groups, 'createdAt', timeMode)
  }, [groups, timeMode])

  const mlChart = useMemo(() => {
    return buildTimeStats(mlRecords, 'createdAt', timeMode)
  }, [mlRecords, timeMode])

  const gradeDistribution = useMemo(() => {
    const map: Record<string, number> = {}

    mlRecords.forEach(record => {
      const grade =
        record.predictedGrade ||
        record.classification ||
        record.grade ||
        'UNKNOWN'

      map[grade] = (map[grade] || 0) + 1
    })

    return Object.entries(map).map(([label, value]) => ({ label, value }))
  }, [mlRecords])

  const userTypeDistribution = useMemo(() => {
    const raw = stats?.userTypeDistribution || stats?.usersByType || []

    if (Array.isArray(raw) && raw.length > 0) {
      return raw
    }

    return [
      { label: 'HIGHSCHOOL', value: stats?.highschoolUsers || 0 },
      { label: 'STUDENT', value: stats?.studentUsers || 0 },
      { label: 'OTHER', value: stats?.otherUsers || 0 },
    ]
  }, [stats])

  const taskStats = useMemo(() => {
    return {
      total: stats?.totalTasks || 0,
      done: stats?.doneTasks || stats?.completedTasks || 0,
      overdue: alerts?.summary?.systemWarnings || stats?.overdueTasks || 0,
    }
  }, [stats, alerts])

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-[#f0f0f5] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold flex items-center gap-2">
            <BarChart3 size={22} className="text-red-400" />
            Thống kê hệ thống
          </h1>
          <p className="text-[13px] text-[#8b8b9e] mt-1">
            Phân tích sâu về user, nhóm, tài liệu, task và lượt dùng ML.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[13px] text-[#d8d8e2] border border-white/[.08]"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        <StatCard icon={Users} label="Tổng user" value={stats?.totalUsers || 0} />
        <StatCard icon={Users2} label="Tổng nhóm" value={stats?.totalGroups || 0} />
        <StatCard icon={FileText} label="Tài liệu" value={stats?.totalDocs || 0} />
        <StatCard icon={CheckSquare} label="Task" value={taskStats.total} />
        <StatCard icon={BrainCircuit} label="Lượt dự đoán" value={stats?.totalPredicts || mlRecords.length} />
      </div>

      <div className="mb-5 flex gap-2">
        {(['DAY', 'WEEK', 'MONTH'] as TimeMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setTimeMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-[12px] border ${
              timeMode === mode
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-white/[.04] border-white/[.08] text-[#b9b9c8]'
            }`}
          >
            {mode === 'DAY' ? 'Theo ngày' : mode === 'WEEK' ? 'Theo tuần' : 'Theo tháng'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartPanel title="Nhóm mới tạo theo thời gian">
          <SimpleBarChart data={groupChart} />
        </ChartPanel>

        <ChartPanel title="Số lượt dùng dự đoán học lực">
          <SimpleBarChart data={mlChart} />
        </ChartPanel>

        <ChartPanel title="Số task tạo / hoàn thành / quá hạn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MiniBox label="Tạo" value={taskStats.total} />
            <MiniBox label="Hoàn thành" value={taskStats.done} />
            <MiniBox label="Quá hạn" value={taskStats.overdue} />
          </div>
        </ChartPanel>

        <ChartPanel title="Phân bố loại user">
          <SimpleDistribution data={userTypeDistribution} />
        </ChartPanel>

        <ChartPanel title="Phân bố predicted grade">
          <SimpleDistribution data={gradeDistribution} />
        </ChartPanel>

        <ChartPanel title="Phân bố kết quả học tập kỳ gần nhất">
          <div className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-4 text-[13px] text-[#8b8b9e]">
            Phần này cần backend trả thêm dữ liệu study term mới nhất theo user.
            Có thể dùng API riêng: <span className="text-[#f0f0f5]">/admin/stats/study-terms</span>
          </div>
        </ChartPanel>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#8b8b9e]">{label}</p>
        <Icon size={18} className="text-red-400" />
      </div>
      <h2 className="text-2xl font-semibold mt-2">{value}</h2>
    </div>
  )
}

function ChartPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
      <h2 className="text-[16px] font-semibold mb-4 flex items-center gap-2">
        <GraduationCap size={17} className="text-red-400" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(i => i.value), 1)

  if (data.length === 0) {
    return <p className="text-[13px] text-[#8b8b9e]">Chưa có dữ liệu.</p>
  }

  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.label}>
          <div className="flex justify-between text-[12px] mb-1">
            <span className="text-[#b9b9c8]">{item.label}</span>
            <span className="text-[#8b8b9e]">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[.06] overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SimpleDistribution({ data }: { data: any[] }) {
  const normalized = data.map(item => ({
    label: item.label || item.key || item.type || item.name || 'UNKNOWN',
    value: item.value || item.count || 0,
  }))

  const total = normalized.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return <p className="text-[13px] text-[#8b8b9e]">Chưa có dữ liệu.</p>
  }

  return (
    <div className="space-y-3">
      {normalized.map(item => {
        const pct = Math.round((item.value / total) * 100)

        return (
          <div key={item.label}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#b9b9c8]">{item.label}</span>
              <span className="text-[#8b8b9e]">
                {item.value} · {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[.06] overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MiniBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-4">
      <p className="text-[12px] text-[#8b8b9e]">{label}</p>
      <h3 className="text-2xl font-semibold mt-2">{value}</h3>
    </div>
  )
}

function buildTimeStats(items: any[], key: string, mode: TimeMode) {
  const map: Record<string, number> = {}

  items.forEach(item => {
    if (!item[key]) return

    const date = new Date(item[key])
    let label = ''

    if (mode === 'DAY') {
      label = date.toLocaleDateString('vi-VN')
    }

    if (mode === 'WEEK') {
      const firstDay = new Date(date.getFullYear(), 0, 1)
      const week = Math.ceil(
        ((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7
      )
      label = `Tuần ${week}/${date.getFullYear()}`
    }

    if (mode === 'MONTH') {
      label = `${date.getMonth() + 1}/${date.getFullYear()}`
    }

    map[label] = (map[label] || 0) + 1
  })

  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .slice(-12)
}