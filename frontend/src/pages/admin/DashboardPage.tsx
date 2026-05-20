import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import {
  Users,
  Users2,
  FileText,
  AlertTriangle,
  TrendingUp,
  Brain,
  ShieldAlert,
  CheckSquare,
  ArrowRight,
  Activity,
  Sparkles,
  FolderKanban,
  UserPlus,
  BarChart3,
  Siren,
  ShieldCheck,
} from 'lucide-react'

type SystemStats = {
  totalUsers: number
  totalGroups: number
  totalDocs: number
  totalTasks: number
  totalPredicts: number
  lockedUsers: number
  adminCount: number
  newUsers7d: number
}

type GradeItem = {
  key: string
  label: string
  count: number
  pct: number
  color: string
}

type WeakAlert = {
  id: string
  name: string
  gpa: number
  issue: string
}

type ActivityItem = {
  id: string
  title: string
  subtitle: string
  createdAt?: string
  type?: string
}

type TrendItem = {
  key: string
  label: string
  current: number
  previous: number
  delta: number
  up: boolean
}

type ActionRequiredItem = {
  id: string
  level: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  createdAt?: string
}

type DashboardPayload = {
  stats: SystemStats
  gradeDistribution: GradeItem[]
  weakAlerts: WeakAlert[]
  recentActivities: ActivityItem[]
  trends: TrendItem[]
  actionRequired: ActionRequiredItem[]
  systemHealth: {
    status: 'HEALTHY' | 'WARNING' | 'ERROR'
    db: string
    ml: string
    message: string
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: any
  color: string
  sub?: string
}) {
  return (
    <div
      className="rounded-2xl border p-4 relative overflow-hidden"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div
        className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-[.06em]" style={{ color: 'var(--text3)' }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>

      <div className="text-[28px] font-semibold font-mono leading-none" style={{ color }}>
        {value}
      </div>

      {sub && (
        <div className="text-[11px] mt-2" style={{ color: 'var(--text3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  right,
}: {
  icon: any
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,.12)' }}
        >
          <Icon size={14} style={{ color: '#818cf8' }} />
        </div>
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  )
}

function timeAgo(v?: string) {
  if (!v) return 'vừa xong'
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

function trendText(item: TrendItem) {
  if (item.previous === 0) {
    return item.current > 0 ? 'mới phát sinh' : 'không đổi'
  }
  const abs = Math.abs(item.delta)
  return `${item.up ? '+' : '-'}${abs}% so với kỳ trước`
}

function levelColor(level: ActionRequiredItem['level']) {
  switch (level) {
    case 'critical':
      return '#ef4444'
    case 'warning':
      return '#f59e0b'
    case 'success':
      return '#22c55e'
    default:
      return '#6366f1'
  }
}

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardPayload>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const safeStats: SystemStats = data?.stats ?? {
    totalUsers: 0,
    totalGroups: 0,
    totalDocs: 0,
    totalTasks: 0,
    totalPredicts: 0,
    lockedUsers: 0,
    adminCount: 0,
    newUsers7d: 0,
  }

  const gradeDist = useMemo(() => data?.gradeDistribution ?? [], [data])
  const weakAlerts = useMemo(() => data?.weakAlerts ?? [], [data])
  const recentActivities = useMemo(() => data?.recentActivities ?? [], [data])
  const trends = useMemo(() => data?.trends ?? [], [data])
  const actionRequired = useMemo(() => data?.actionRequired ?? [], [data])
  const systemHealth = data?.systemHealth

  if (isLoading) {
    return (
      <div className="space-y-5">
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
          Dashboard Quản trị
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[108px] rounded-2xl border animate-pulse"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div
            className="h-[280px] rounded-2xl border animate-pulse"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          />
          <div
            className="h-[280px] rounded-2xl border animate-pulse"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="rounded-2xl border p-8 text-center"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <ShieldAlert size={28} className="mx-auto mb-3" style={{ color: '#ef4444' }} />
        <h1 className="text-[16px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Không tải được dashboard admin
        </h1>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text3)' }}>
          Kiểm tra backend admin rồi thử tải lại.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl text-[13px] font-medium text-white"
          style={{ background: '#6366f1' }}
        >
          Tải lại
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
            Dashboard Quản trị
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
            Tổng quan hệ thống, xu hướng, cảnh báo và việc cần xử lý ngay.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/admin/users"
            className="px-3 py-2 rounded-xl border text-[12px] font-medium"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            Quản lý user
          </Link>
          <Link
            to="/admin/alerts"
            className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
            style={{ background: '#6366f1' }}
          >
            Xem cảnh báo
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Tổng người dùng"
          value={safeStats.totalUsers}
          icon={Users}
          color="#6366f1"
          sub={`${safeStats.newUsers7d} user mới / 7 ngày`}
        />
        <StatCard
          label="Nhóm hoạt động"
          value={safeStats.totalGroups}
          icon={Users2}
          color="#14b8a6"
          sub="tổng số nhóm trong hệ thống"
        />
        <StatCard
          label="Tài liệu upload"
          value={safeStats.totalDocs}
          icon={FileText}
          color="#f59e0b"
          sub="tài liệu học tập đã lưu"
        />
        <StatCard
          label="Tổng task"
          value={safeStats.totalTasks}
          icon={CheckSquare}
          color="#22c55e"
          sub="bao gồm task nhóm và cá nhân"
        />
        <StatCard
          label="Lượt dự đoán"
          value={safeStats.totalPredicts}
          icon={Brain}
          color="#8b5cf6"
          sub="số lần dùng tính năng dự đoán"
        />
        <StatCard
          label="Tài khoản khóa"
          value={safeStats.lockedUsers}
          icon={AlertTriangle}
          color="#ef4444"
          sub={`${safeStats.adminCount} tài khoản admin`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          className="rounded-2xl border p-4"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <SectionTitle icon={BarChart3} title="Xu hướng hệ thống" />
          {trends.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Chưa có dữ liệu xu hướng.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trends.map(item => (
                <div
                  key={item.key}
                  className="rounded-xl border p-3"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text2)' }}>
                      {item.label}
                    </span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: item.up ? '#22c55e' : item.delta < 0 ? '#ef4444' : 'var(--text3)' }}
                    >
                      {trendText(item)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[24px] font-mono font-semibold" style={{ color: 'var(--text)' }}>
                        {item.current}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        kỳ hiện tại
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-mono" style={{ color: 'var(--text2)' }}>
                        {item.previous}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        kỳ trước
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <SectionTitle
            icon={Siren}
            title="Cần xử lý ngay hôm nay"
            right={
              <Link to="/admin/alerts" className="text-[11px]" style={{ color: '#818cf8' }}>
                Mở trung tâm cảnh báo
              </Link>
            }
          />
          {actionRequired.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Hôm nay chưa có việc khẩn cần xử lý.
            </p>
          ) : (
            <div className="space-y-2">
              {actionRequired.map(item => {
                const color = levelColor(item.level)
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border p-3"
                    style={{
                      background: `${color}10`,
                      borderColor: `${color}30`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                          {item.title}
                        </div>
                        <div className="text-[11px] mt-1" style={{ color: 'var(--text2)' }}>
                          {item.message}
                        </div>
                      </div>
                      <span
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold uppercase"
                        style={{ background: `${color}18`, color }}
                      >
                        {item.level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 gap-3">
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        {timeAgo(item.createdAt)}
                      </span>
                      {item.actionUrl ? (
                        <Link
                          to={item.actionUrl}
                          className="text-[11px] font-medium"
                          style={{ color }}
                        >
                          {item.actionLabel || 'Xem chi tiết'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          className="rounded-2xl border p-4"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <SectionTitle icon={TrendingUp} title="Phân bố học lực toàn hệ thống" />
          {gradeDist.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Chưa có dữ liệu học lực.
            </p>
          ) : (
            <div className="space-y-3">
              {gradeDist.map(g => (
                <div key={g.key} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium w-20" style={{ color: g.color }}>
                    {g.label}
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg3)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${g.pct}%`, background: g.color }}
                    />
                  </div>
                  <span className="text-[10px] font-mono w-16 text-right" style={{ color: 'var(--text3)' }}>
                    {g.count} ({g.pct}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <SectionTitle
            icon={AlertTriangle}
            title="Cảnh báo học lực yếu"
            right={
              <Link to="/admin/alerts" className="text-[11px]" style={{ color: '#818cf8' }}>
                Xem thêm
              </Link>
            }
          />
          {weakAlerts.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Chưa có cảnh báo học lực.
            </p>
          ) : (
            <div className="space-y-2">
              {weakAlerts.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 p-3 rounded-xl border"
                  style={{
                    background: 'rgba(239,68,68,.05)',
                    borderColor: 'rgba(239,68,68,.14)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-[12px] font-medium min-w-0 truncate" style={{ color: 'var(--text)' }}>
                    {a.name}
                  </span>
                  <span className="text-[11px] font-mono text-red-400 ml-auto">
                    {a.gpa.toFixed(1)}
                  </span>
                  <span className="text-[10px] hidden md:inline" style={{ color: 'var(--text3)' }}>
                    {a.issue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_.7fr] gap-4">
        <div
          className="rounded-2xl border p-4"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <SectionTitle
            icon={Activity}
            title="Hoạt động gần đây"
            right={
              <Link to="/admin/ml" className="text-[11px]" style={{ color: '#818cf8' }}>
                Logs & ML
              </Link>
            }
          />

          {recentActivities.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Chưa có hoạt động nào.
            </p>
          ) : (
            <div className="space-y-2">
              {recentActivities.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl border p-3 flex items-start gap-3"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,.12)' }}
                  >
                    <Sparkles size={14} style={{ color: '#818cf8' }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                      {item.title}
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                      {item.subtitle}
                    </div>
                  </div>

                  <div className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text3)' }}>
                    {timeAgo(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <SectionTitle icon={ShieldCheck} title="Tình trạng hệ thống" />
            <div className="space-y-2">
              <div
                className="rounded-xl border p-3"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--text2)' }}>
                    Trạng thái tổng
                  </span>
                  <span
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                    style={{
                      background:
                        systemHealth?.status === 'ERROR'
                          ? 'rgba(239,68,68,.12)'
                          : systemHealth?.status === 'WARNING'
                            ? 'rgba(245,158,11,.12)'
                            : 'rgba(34,197,94,.12)',
                      color:
                        systemHealth?.status === 'ERROR'
                          ? '#ef4444'
                          : systemHealth?.status === 'WARNING'
                            ? '#f59e0b'
                            : '#22c55e',
                    }}
                  >
                    {systemHealth?.status || 'HEALTHY'}
                  </span>
                </div>
                <div className="text-[11px] mt-2" style={{ color: 'var(--text3)' }}>
                  {systemHealth?.message || 'Hệ thống đang hoạt động bình thường'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div
                  className="rounded-xl border p-3"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                    Database
                  </div>
                  <div className="text-[12px] font-semibold mt-1" style={{ color: 'var(--text)' }}>
                    {systemHealth?.db || 'UP'}
                  </div>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                    ML Service
                  </div>
                  <div className="text-[12px] font-semibold mt-1" style={{ color: 'var(--text)' }}>
                    {systemHealth?.ml || 'UP'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <SectionTitle icon={ArrowRight} title="Quick actions" />
            <div className="grid grid-cols-1 gap-2">
              {[
                { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
                { to: '/admin/groups', label: 'Quản lý nhóm', icon: FolderKanban },
                { to: '/admin/alerts', label: 'Xem cảnh báo hệ thống', icon: AlertTriangle },
                { to: '/admin/ml', label: 'Kết quả ML / dự đoán', icon: Brain },
                { to: '/admin/settings', label: 'Cài đặt admin', icon: CheckSquare },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-xl border px-3 py-3 text-[12px] font-medium"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  <div className="flex items-center gap-2">
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </div>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}