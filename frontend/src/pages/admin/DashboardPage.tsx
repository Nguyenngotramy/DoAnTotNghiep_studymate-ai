import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import { Users, Users2, FileText, AlertTriangle, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey:['admin-stats'], queryFn:adminApi.getSystemStats })
  const s = stats ?? { totalUsers:248, totalGroups:31, totalDocs:156, lockedUsers:3 }

  const GRADE_DIST = [
    {label:'Xuất sắc',pct:8,  n:20,  color:'#22c55e'},
    {label:'Giỏi',    pct:27, n:67,  color:'#6366f1'},
    {label:'Khá',     pct:42, n:104, color:'#f59e0b'},
    {label:'TB',      pct:18, n:45,  color:'#f97316'},
    {label:'Yếu',     pct:5,  n:12,  color:'#ef4444'},
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-[18px] font-semibold text-[#f0f0f5]">Dashboard Quản trị</h1>

      <div className="grid grid-cols-4 gap-3">
        {[
          {label:'Tổng người dùng',value:s.totalUsers,  icon:Users,         color:'#6366f1'},
          {label:'Nhóm hoạt động', value:s.totalGroups, icon:Users2,        color:'#14b8a6'},
          {label:'Tài liệu upload',value:s.totalDocs,   icon:FileText,      color:'#f59e0b'},
          {label:'Tài khoản khoá', value:s.lockedUsers??3, icon:AlertTriangle, color:'#ef4444'},
        ].map(c=>(
          <div key={c.label} className="bg-[#1a1a24] border border-white/[.06] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#8b8b9e]">{c.label}</span>
              <c.icon size={14} style={{color:c.color}}/>
            </div>
            <div className="text-[26px] font-semibold font-mono" style={{color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a24] border border-white/[.06] rounded-xl p-4">
          <p className="text-[12px] font-semibold text-[#f0f0f5] mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-red-400"/>Phân bố học lực toàn hệ thống
          </p>
          <div className="space-y-3">
            {GRADE_DIST.map(g=>(
              <div key={g.label} className="flex items-center gap-3">
                <span className="text-[11px] font-medium w-20" style={{color:g.color}}>{g.label}</span>
                <div className="flex-1 h-2 bg-white/[.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${g.pct}%`,background:g.color}}/>
                </div>
                <span className="text-[10px] font-mono text-[#8b8b9e] w-12 text-right">{g.n} người</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-white/[.06] rounded-xl p-4">
          <p className="text-[12px] font-semibold text-[#f0f0f5] mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400"/>Cảnh báo học lực yếu
          </p>
          <div className="space-y-2">
            {[
              {name:'Hoàng Văn E',gpa:4.8,issue:'GPA 4.8 — nguy cơ không TN'},
              {name:'Ngô Thị G',  gpa:5.2,issue:'Tiếng Anh 3.5 — cần can thiệp'},
              {name:'Lê Minh C',  gpa:5.5,issue:'Nhiều môn thi lại — cần tư vấn'},
            ].map((a,i)=>(
              <div key={i} className="flex items-center gap-2 p-2.5 bg-red-500/5 border border-red-500/10 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"/>
                <span className="text-[12px] font-medium text-[#f0f0f5]">{a.name}</span>
                <span className="text-[11px] font-mono text-red-400 ml-auto">{a.gpa}</span>
                <span className="text-[10px] text-[#5a5a6e]">{a.issue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
