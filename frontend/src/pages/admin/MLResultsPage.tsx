import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  BrainCircuit,
  Search,
  RefreshCw,
  Activity,
  AlertTriangle,
  TrendingDown,
  BarChart3,
} from 'lucide-react'

type PredictRecord = {
  id: string
  userId: string
  userName?: string
  fullName?: string
  name?: string
  email?: string
  gpa?: number
  predictedGrade?: string
  classification?: string
  confidence?: number
  createdAt?: string
}

function getUserName(r: PredictRecord) {
  return r.userName || r.fullName || r.name || r.email || r.userId || 'Người dùng'
}

function getGrade(r: PredictRecord) {
  return r.predictedGrade || r.classification || 'UNKNOWN'
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

function confidenceText(value?: number) {
  if (value === undefined || value === null) return '—'
  if (value <= 1) return `${Math.round(value * 100)}%`
  return `${Math.round(value)}%`
}

function gradeBadge(grade: string) {
  const g = grade.toUpperCase()

  if (g.includes('EXCELLENT') || g.includes('XUAT') || g.includes('XUẤT')) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }

  if (g.includes('GOOD') || g.includes('GIOI') || g.includes('GIỎI')) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }

  if (g.includes('FAIR') || g.includes('KHA') || g.includes('KHÁ')) {
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  }

  if (g.includes('WEAK') || g.includes('YEU') || g.includes('YẾU')) {
    return 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  return 'bg-white/[.05] text-[#b9b9c8] border-white/[.08]'
}

export default function AdminML() {
  const [records, setRecords] = useState<PredictRecord[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [classification, setClassification] = useState('ALL')
  const [timeFilter, setTimeFilter] = useState('ALL')

  const fetchRecords = async () => {
    try {
      setLoading(true)

      const data: any = await adminApi.getMLResults(0)

      if (Array.isArray(data)) {
        setRecords(data)
      } else if (Array.isArray(data?.content)) {
        setRecords(data.content)
      } else if (Array.isArray(data?.items)) {
        setRecords(data.items)
      } else {
        setRecords([])
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tải kết quả ML')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date()

    return records.filter(r => {
      const userText = `${getUserName(r)} ${r.userId || ''} ${r.email || ''}`.toLowerCase()
      const grade = getGrade(r)

      const matchSearch = !q || userText.includes(q)
      const matchClass =
        classification === 'ALL' ||
        grade.toUpperCase() === classification.toUpperCase()

      let matchTime = true

      if (timeFilter !== 'ALL' && r.createdAt) {
        const created = new Date(r.createdAt)
        const diffDays =
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

        if (timeFilter === '7D') matchTime = diffDays <= 7
        if (timeFilter === '30D') matchTime = diffDays <= 30
      }

      return matchSearch && matchClass && matchTime
    })
  }, [records, search, classification, timeFilter])

  const gradeStats = useMemo(() => {
    const map: Record<string, number> = {}

    filteredRecords.forEach(r => {
      const grade = getGrade(r)
      map[grade] = (map[grade] || 0) + 1
    })

    return Object.entries(map)
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredRecords])

  const avgConfidence = useMemo(() => {
    const values = filteredRecords
      .map(r => r.confidence)
      .filter(v => typeof v === 'number') as number[]

    if (values.length === 0) return null

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    return avg <= 1 ? Math.round(avg * 100) : Math.round(avg)
  }, [filteredRecords])

  const repeatedWeakUsers = useMemo(() => {
    const grouped: Record<string, PredictRecord[]> = {}

    filteredRecords.forEach(r => {
      if (!r.userId) return
      grouped[r.userId] = grouped[r.userId] || []
      grouped[r.userId].push(r)
    })

    return Object.values(grouped)
      .map(list => {
        const sorted = [...list].sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return db - da
        })

        const latest = sorted[0]
        const previous = sorted[1]

        if (!latest || !previous) return null

        const latestGpa = latest.gpa ?? 0
        const previousGpa = previous.gpa ?? 0

        const notImproved = latestGpa <= previousGpa

        if (sorted.length >= 2 && notImproved) {
          return {
            userId: latest.userId,
            userName: getUserName(latest),
            attempts: sorted.length,
            latestGpa,
            previousGpa,
            latestGrade: getGrade(latest),
          }
        }

        return null
      })
      .filter(Boolean)
      .slice(0, 6) as any[]
  }, [filteredRecords])

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-[#f0f0f5] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold flex items-center gap-2">
            <BrainCircuit size={22} className="text-red-400" />
            Kết quả ML
          </h1>
          <p className="text-[13px] text-[#8b8b9e] mt-1">
            Theo dõi prediction records, confidence, predicted grade và người học chưa cải thiện.
          </p>
        </div>

        <button
          onClick={fetchRecords}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[13px] text-[#d8d8e2] border border-white/[.08]"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#8b8b9e]">Tổng prediction</p>
            <Activity size={18} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">{filteredRecords.length}</h2>
        </div>

        <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#8b8b9e]">Avg confidence</p>
            <BarChart3 size={18} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">
            {avgConfidence === null ? '—' : `${avgConfidence}%`}
          </h2>
        </div>

        <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#8b8b9e]">Chưa cải thiện</p>
            <TrendingDown size={18} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">{repeatedWeakUsers.length}</h2>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-emerald-300">ML service</p>
            <BrainCircuit size={18} className="text-emerald-400" />
          </div>
          <h2 className="text-[18px] font-semibold mt-2 text-emerald-400">
            ACTIVE
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b7c]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo user, email, userId..."
              className="w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-red-500/50"
            />
          </div>

          <select
            value={classification}
            onChange={e => setClassification(e.target.value)}
            className="bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            <option value="ALL">Tất cả classification</option>
            <option value="EXCELLENT">EXCELLENT</option>
            <option value="GOOD">GOOD</option>
            <option value="FAIR">FAIR</option>
            <option value="AVERAGE">AVERAGE</option>
            <option value="WEAK">WEAK</option>
          </select>

          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            <option value="ALL">Tất cả thời gian</option>
            <option value="7D">7 ngày gần nhất</option>
            <option value="30D">30 ngày gần nhất</option>
          </select>
        </div>
      </div>

      {repeatedWeakUsers.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={17} className="text-yellow-400" />
            <h2 className="text-[15px] font-semibold text-yellow-300">
              User dự đoán nhiều lần nhưng chưa cải thiện
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {repeatedWeakUsers.map(user => (
              <div
                key={user.userId}
                className="rounded-xl border border-white/[.08] bg-[#12121a] p-3"
              >
                <p className="text-[13px] font-medium">{user.userName}</p>
                <p className="text-[11px] text-[#8b8b9e] mt-1">
                  {user.attempts} lần dự đoán
                </p>
                <p className="text-[12px] text-yellow-300 mt-2">
                  GPA: {user.previousGpa} → {user.latestGpa}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/[.08] bg-[#12121a] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[.06]">
            <h2 className="text-[15px] font-semibold">Danh sách prediction records</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead className="bg-white/[.03] text-[#8b8b9e]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">GPA</th>
                  <th className="text-left px-4 py-3 font-medium">Predicted grade</th>
                  <th className="text-left px-4 py-3 font-medium">Confidence</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#8b8b9e]">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#8b8b9e]">
                      Không có prediction record phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(r => (
                    <tr
                      key={r.id}
                      className="border-t border-white/[.06] hover:bg-white/[.025]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#f0f0f5]">{getUserName(r)}</p>
                        <p className="text-[11px] text-[#6b6b7c]">{r.userId}</p>
                      </td>

                      <td className="px-4 py-3 text-[#d8d8e2]">
                        {r.gpa ?? '—'}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-medium ${gradeBadge(getGrade(r))}`}>
                          {getGrade(r)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#d8d8e2]">
                        {confidenceText(r.confidence)}
                      </td>

                      <td className="px-4 py-3 text-[#b9b9c8]">
                        {formatDate(r.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
          <h2 className="text-[15px] font-semibold mb-4">
            Thống kê predicted grade
          </h2>

          <div className="space-y-3">
            {gradeStats.length === 0 ? (
              <p className="text-[13px] text-[#8b8b9e]">Chưa có dữ liệu.</p>
            ) : (
              gradeStats.map(item => {
                const pct =
                  filteredRecords.length === 0
                    ? 0
                    : Math.round((item.count / filteredRecords.length) * 100)

                return (
                  <div key={item.grade}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-[#d8d8e2]">{item.grade}</span>
                      <span className="text-[#8b8b9e]">{item.count} records</span>
                    </div>

                    <div className="h-2 rounded-full bg-white/[.06] overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
