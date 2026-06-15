import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminMembershipApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  RefreshCw,
  Filter,
} from 'lucide-react'

type TimeMode = 'WEEK' | 'MONTH'
type RevenueSource = 'MEMBERSHIP' | 'ADVERTISEMENT' | 'ALL'

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
}

export default function AdminRevenuePage() {
  const [timeMode, setTimeMode] = useState<TimeMode>('MONTH')
  const [revenueSource, setRevenueSource] = useState<RevenueSource>('ALL')
  const [taxRate, setTaxRate] = useState(10) // Default 10% tax rate

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-revenue-stats', timeMode],
    queryFn: () => adminMembershipApi.getStats(),
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-revenue-orders'],
    queryFn: () => adminMembershipApi.getOrders(),
  })

  // Calculate revenue statistics from real APPROVED payments
  const revenueStats = useMemo(() => {
    const approvedOrders = orders.filter((o: any) => o.status === 'APPROVED')
    const totalRevenue = approvedOrders.reduce((sum: number, o: any) => sum + (o.amountVnd || 0), 0)

    // For now, ad revenue is 0 since there's no ads module
    const adRevenue = 0

    const grossRevenue = totalRevenue + adRevenue
    const taxAmount = (grossRevenue * taxRate) / 100
    const netRevenue = grossRevenue - taxAmount

    // Revenue by tier
    const revenueByTier = approvedOrders.reduce((acc: any, o: any) => {
      const tier = o.tier || 'MEMBER'
      acc[tier] = (acc[tier] || 0) + (o.amountVnd || 0)
      return acc
    }, {})

    // Revenue by period
    const revenueByPeriod = approvedOrders.reduce((acc: any, o: any) => {
      const period = o.period || 'MONTH'
      acc[period] = (acc[period] || 0) + (o.amountVnd || 0)
      return acc
    }, {})

    return {
      totalRevenue,
      adRevenue,
      grossRevenue,
      taxAmount,
      netRevenue,
      revenueByTier,
      revenueByPeriod,
      totalOrders: approvedOrders.length,
    }
  }, [orders, taxRate, timeMode])

  // Generate chart data based on real APPROVED payments
  const chartData = useMemo(() => {
    const approvedOrders = orders.filter((o: any) => o.status === 'APPROVED')
    const data = []
    const now = new Date()
    const count = timeMode === 'WEEK' ? 12 : 12 // Last 12 weeks or months

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now)
      let startDate: Date
      let endDate: Date
      let label: string

      if (timeMode === 'WEEK') {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - (i * 7))
        startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6) // End of week
        label = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`
      } else {
        date.setMonth(date.getMonth() - i)
        startDate = new Date(date.getFullYear(), date.getMonth(), 1)
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        label = `${startDate.getMonth() + 1}/${startDate.getFullYear()}`
      }

      // Filter orders within this period
      const periodOrders = approvedOrders.filter((o: any) => {
        if (!o.approvedAt) return false
        const approvedDate = new Date(o.approvedAt)
        return approvedDate >= startDate && approvedDate <= endDate
      })

      const value = periodOrders.reduce((sum: number, o: any) => sum + (o.amountVnd || 0), 0)

      data.push({
        label,
        value,
      })
    }
    return data
  }, [orders, timeMode])

  // Export to Excel functionality
  const handleExportExcel = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/admin/revenue/export?range=${timeMode.toLowerCase()}&taxRate=${taxRate}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to export Excel')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bao_cao_doanh_thu_${timeMode.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Đã xuất báo cáo Excel thành công')
    } catch (error) {
      toast.error('Không thể xuất báo cáo Excel')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-[#f0f0f5] flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-400" />
            Thống kê doanh thu
          </h1>
          <p className="text-[12px] text-[#8b8b9e] mt-1">
            Theo dõi doanh thu, thuế và xuất báo cáo chi tiết
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[12px] text-[#d8d8e2] border border-white/[.08]"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-semibold"
          >
            <FileSpreadsheet size={14} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg bg-[#12121a] border border-white/[.06] px-3 py-2">
          <Calendar size={14} className="text-[#8b8b9e]" />
          <select
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value as TimeMode)}
            className="bg-transparent text-[12px] text-[#f0f0f5] outline-none"
          >
            <option value="WEEK">Theo tuần</option>
            <option value="MONTH">Theo tháng</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#12121a] border border-white/[.06] px-3 py-2">
          <Filter size={14} className="text-[#8b8b9e]" />
          <select
            value={revenueSource}
            onChange={(e) => setRevenueSource(e.target.value as RevenueSource)}
            className="bg-transparent text-[12px] text-[#f0f0f5] outline-none"
          >
            <option value="ALL">Tất cả nguồn</option>
            <option value="MEMBERSHIP">Gói thành viên</option>
            <option value="ADVERTISEMENT">Quảng cáo</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#12121a] border border-white/[.06] px-3 py-2">
          <DollarSign size={14} className="text-[#8b8b9e]" />
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="bg-transparent text-[12px] text-[#f0f0f5] outline-none w-16"
            min="0"
            max="100"
          />
          <span className="text-[12px] text-[#8b8b9e]">% thuế</span>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RevenueCard
          label="Doanh thu gói thành viên"
          value={formatVnd(revenueStats.totalRevenue)}
          icon={TrendingUp}
          color="#6366f1"
          sub={`${revenueStats.totalOrders} đơn đã duyệt`}
        />
        <RevenueCard
          label="Doanh thu quảng cáo"
          value={formatVnd(revenueStats.adRevenue)}
          icon={PieChart}
          color="#f59e0b"
          sub="Ước tính từ quảng cáo"
        />
        <RevenueCard
          label="Tổng doanh thu trước thuế"
          value={formatVnd(revenueStats.grossRevenue)}
          icon={DollarSign}
          color="#10b981"
          sub="Tổng tất cả nguồn"
        />
        <RevenueCard
          label="Doanh thu sau thuế"
          value={formatVnd(revenueStats.netRevenue)}
          icon={BarChart3}
          color="#ec4899"
          sub={`Đã trừ ${taxRate}% thuế`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartPanel title={`Biểu đồ doanh thu theo ${timeMode === 'WEEK' ? 'tuần' : 'tháng'}`}>
          <SimpleBarChart data={chartData} />
        </ChartPanel>

        <ChartPanel title="Phân bố doanh thu theo gói">
          <PieDistribution
            data={[
              { label: 'SILVER', value: revenueStats.revenueByTier.SILVER || 0 },
              { label: 'GOLD', value: revenueStats.revenueByTier.GOLD || 0 },
              { label: 'MEMBER', value: revenueStats.revenueByTier.MEMBER || 0 },
            ]}
          />
        </ChartPanel>

        <ChartPanel title="Phân bố doanh thu theo kỳ hạn">
          <PieDistribution
            data={[
              { label: 'TUẦN', value: revenueStats.revenueByPeriod.WEEK || 0 },
              { label: 'THÁNG', value: revenueStats.revenueByPeriod.MONTH || 0 },
              { label: 'NĂM', value: revenueStats.revenueByPeriod.YEAR || 0 },
            ]}
          />
        </ChartPanel>

        <ChartPanel title="Chi tiết thuế">
          <TaxBreakdown
            grossRevenue={revenueStats.grossRevenue}
            taxRate={taxRate}
            taxAmount={revenueStats.taxAmount}
            netRevenue={revenueStats.netRevenue}
          />
        </ChartPanel>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-xl border border-white/[.06] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[.06] bg-[#0a0a0f]">
          <h2 className="text-[14px] font-semibold text-[#f0f0f5]">Đơn hàng gần đây</h2>
        </div>
        <table className="w-full text-[12px]">
          <thead className="bg-[#0a0a0f] text-[#5a5a6e] text-left">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Gói</th>
              <th className="px-4 py-3">Kỳ hạn</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((o: any) => (
              <tr key={o.id} className="border-t border-white/[.04] hover:bg-white/[.02]">
                <td className="px-4 py-3">
                  <p className="text-[#f0f0f5] font-medium">{o.userFullName}</p>
                  <p className="text-[10px] text-[#5a5a6e]">{o.userEmail}</p>
                </td>
                <td className="px-4 py-3 text-[#f0f0f5]">{o.tier}</td>
                <td className="px-4 py-3 text-[#f0f0f5]">{o.period}</td>
                <td className="px-4 py-3 text-emerald-400">{formatVnd(o.amountVnd)}</td>
                <td className="px-4 py-3 text-[#8b8b9e]">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      o.status === 'APPROVED'
                        ? 'bg-green-500/15 text-green-400'
                        : o.status === 'PENDING'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RevenueCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string
  icon: any
  color: string
  sub: string
}) {
  return (
    <div className="rounded-xl border border-white/[.06] bg-[#12121a] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-[#5a5a6e] uppercase">{label}</p>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-[18px] font-bold text-[#f0f0f5]">{value}</p>
      <p className="text-[10px] text-[#8b8b9e] mt-1">{sub}</p>
    </div>
  )
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/[.06] bg-[#12121a] p-5">
      <h2 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((i) => i.value), 1)

  if (data.length === 0) {
    return <p className="text-[13px] text-[#8b8b9e]">Chưa có dữ liệu.</p>
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-[12px] mb-1">
            <span className="text-[#b9b9c8]">{item.label}</span>
            <span className="text-[#8b8b9e]">{formatVnd(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[.06] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function PieDistribution({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return <p className="text-[13px] text-[#8b8b9e]">Chưa có dữ liệu.</p>
  }

  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899']

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const pct = Math.round((item.value / total) * 100)
        return (
          <div key={item.label}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#b9b9c8]">{item.label}</span>
              <span className="text-[#8b8b9e]">
                {formatVnd(item.value)} · {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[.06] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: colors[index % colors.length] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaxBreakdown({
  grossRevenue,
  taxRate,
  taxAmount,
  netRevenue,
}: {
  grossRevenue: number
  taxRate: number
  taxAmount: number
  netRevenue: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center py-2 border-b border-white/[.06]">
        <span className="text-[12px] text-[#b9b9c8]">Tổng doanh thu trước thuế</span>
        <span className="text-[14px] font-semibold text-[#f0f0f5]">{formatVnd(grossRevenue)}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-white/[.06]">
        <span className="text-[12px] text-[#b9b9c8]">Thuế ({taxRate}%)</span>
        <span className="text-[14px] font-semibold text-red-400">-{formatVnd(taxAmount)}</span>
      </div>
      <div className="flex justify-between items-center py-2">
        <span className="text-[12px] text-[#b9b9c8] font-semibold">Doanh thu sau thuế</span>
        <span className="text-[16px] font-bold text-emerald-400">{formatVnd(netRevenue)}</span>
      </div>
    </div>
  )
}
