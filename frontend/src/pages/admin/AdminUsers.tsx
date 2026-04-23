import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import { Search, Lock, Unlock, Users } from 'lucide-react'
import { initials } from '@/utils/helpers'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.getUsers(page, search),
  })

  const lockMut = useMutation({
    mutationFn: (id:number) => adminApi.lockUser(id),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-users']}); toast.success('Đã khoá tài khoản') }
  })
  const unlockMut = useMutation({
    mutationFn: (id:number) => adminApi.unlockUser(id),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-users']}); toast.success('Đã mở khoá') }
  })

  const MOCK_USERS = [
    {id:1,fullName:'Nguyễn Văn A',email:'a@demo.com',role:'STUDENT',studentCode:'22521001',isLocked:false},
    {id:2,fullName:'Trần Thị B',  email:'b@demo.com',role:'STUDENT',studentCode:'22521002',isLocked:false},
    {id:3,fullName:'Lê Minh C',   email:'c@demo.com',role:'STUDENT',studentCode:'22521003',isLocked:false},
    {id:4,fullName:'Hoàng Văn E', email:'e@demo.com',role:'STUDENT',studentCode:'22521005',isLocked:true},
    {id:5,fullName:'Lê Thu',      email:'lt@demo.com',role:'TEACHER',studentCode:'',isLocked:false},
    {id:6,fullName:'Admin System',email:'admin@demo.com',role:'ADMIN',studentCode:'',isLocked:false},
  ].filter(u => !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search))

  const data = users?.content ?? MOCK_USERS

  const ROLE_CFG: Record<string,{label:string;bg:string;color:string}> = {
    ADMIN:   {label:'Admin',  bg:'rgba(99,102,241,.2)',color:'#818cf8'},
    TEACHER: {label:'GV',     bg:'rgba(20,184,166,.2)',color:'#14b8a6'},
    STUDENT: {label:'SV',     bg:'rgba(255,255,255,.06)',color:'#8b8b9e'},
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold text-[#f0f0f5] flex items-center gap-2">
          <Users size={18} className="text-red-400"/> Quản lý người dùng
        </h1>
        <div className="flex items-center gap-2 bg-[#1e1e28] border border-white/[.07] rounded-lg px-3 h-9">
          <Search size={13} className="text-[#5a5a6e]"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}
            placeholder="Tìm kiếm..." className="bg-transparent border-none outline-none text-[12px] text-[#f0f0f5] placeholder-[#5a5a6e] w-48"/>
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/[.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[.06]">
              {['Người dùng','Mã SV','Role','Trạng thái','Thao tác'].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-[10px] font-medium text-[#5a5a6e] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((u:any)=>(
              <tr key={u.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0">
                      {initials(u.fullName)}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#f0f0f5]">{u.fullName}</p>
                      <p className="text-[10px] text-[#5a5a6e]">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] font-mono text-[#8b8b9e]">{u.studentCode||'—'}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:ROLE_CFG[u.role]?.bg,color:ROLE_CFG[u.role]?.color}}>
                    {ROLE_CFG[u.role]?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-medium ${u.isLocked?'text-red-400':'text-green-400'}`}>
                    {u.isLocked?'Đã khoá':'Hoạt động'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.role !== 'ADMIN' && (
                    <button onClick={()=>u.isLocked?unlockMut.mutate(u.id):lockMut.mutate(u.id)}
                      className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border transition-all ${u.isLocked?'border-green-500/30 text-green-400 hover:bg-green-500/10':'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}>
                      {u.isLocked?<><Unlock size={11}/>Mở khoá</>:<><Lock size={11}/>Khoá</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
