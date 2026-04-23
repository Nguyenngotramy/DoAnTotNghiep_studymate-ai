import { useState } from 'react'
import { Search, Users, KanbanSquare, FileText, User2 } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import clsx from 'clsx'

const MOCK_RESULTS = {
  groups:    [{ id:1, name:'Nhóm CNTT K22', subject:'Đồ án TN', memberCount:5, coverColor:'#6366f1' }],
  tasks:     [{ id:1, title:'Thiết kế database schema', status:'IN_PROGRESS', groupName:'Nhóm CNTT K22' }],
  documents: [{ id:1, name:'Slides ML Chương 5.pdf', type:'PDF', groupName:'Nhóm CNTT K22' }],
  users:     [{ id:2, fullName:'Trần Thị Bé', email:'b@demo.com', role:'STUDENT' }],
}

type Tab = 'all'|'groups'|'tasks'|'documents'|'users'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const showResults = query.length >= 2

  const TABS: {id:Tab;label:string;icon:React.ElementType}[] = [
    {id:'all',       label:'Tất cả',    icon:Search},
    {id:'groups',    label:'Nhóm',      icon:Users},
    {id:'tasks',     label:'Task',      icon:KanbanSquare},
    {id:'documents', label:'Tài liệu',  icon:FileText},
    {id:'users',     label:'Thành viên',icon:User2},
  ]

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-[18px] font-semibold text-[#f0f0f5] flex items-center gap-2">
        <Search size={18} className="text-indigo-400" /> Tìm kiếm
      </h1>

      {/* Search input */}
      <div className="flex items-center gap-3 bg-[#16161d] border border-white/[.07] focus-within:border-indigo-500/60 rounded-xl px-4 h-12 transition-colors">
        <Search size={16} className="text-[#5a5a6e] flex-shrink-0"/>
        <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
          placeholder="Tìm nhóm, task, tài liệu, thành viên..."
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#f0f0f5] placeholder-[#5a5a6e] font-[DM_Sans]"/>
        {query && (
          <button onClick={() => setQuery('')} className="text-[#5a5a6e] hover:text-[#f0f0f5] text-[18px] leading-none">×</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1e1e28] border border-white/[.07] rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-[11px] font-medium transition-all',
              tab===t.id ? 'bg-[#16161d] text-[#f0f0f5] border border-white/[.07]' : 'text-[#5a5a6e] hover:text-[#8b8b9e]')}>
            <t.icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!showResults ? (
        <div className="text-center py-16">
          <Search size={40} className="text-[#252532] mx-auto mb-3"/>
          <p className="text-[13px] text-[#8b8b9e]">Nhập từ khoá để tìm kiếm</p>
          <p className="text-[12px] text-[#5a5a6e] mt-1">Tìm nhóm, task, tài liệu, thành viên trong hệ thống</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Groups */}
          {(tab==='all'||tab==='groups') && (
            <div>
              <p className="text-[11px] font-medium text-[#5a5a6e] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users size={11}/> Nhóm học
              </p>
              {MOCK_RESULTS.groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase())).map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-[#16161d] border border-white/[.07] hover:border-white/[.15] rounded-xl cursor-pointer transition-all mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${g.coverColor}20`}}>
                    <Users size={16} style={{color:g.coverColor}}/>
                  </div>
                  <div><p className="text-[13px] font-medium text-[#f0f0f5]">{g.name}</p>
                  <p className="text-[11px] text-[#5a5a6e]">{g.subject} · {g.memberCount} thành viên</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          {(tab==='all'||tab==='tasks') && (
            <div>
              <p className="text-[11px] font-medium text-[#5a5a6e] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <KanbanSquare size={11}/> Task
              </p>
              {MOCK_RESULTS.tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-[#16161d] border border-white/[.07] hover:border-white/[.15] rounded-xl cursor-pointer transition-all mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500/15">
                    <KanbanSquare size={16} className="text-amber-400"/>
                  </div>
                  <div><p className="text-[13px] font-medium text-[#f0f0f5]">{t.title}</p>
                  <p className="text-[11px] text-[#5a5a6e]">{t.groupName} · {t.status}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          {(tab==='all'||tab==='documents') && (
            <div>
              <p className="text-[11px] font-medium text-[#5a5a6e] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText size={11}/> Tài liệu
              </p>
              {MOCK_RESULTS.documents.filter(d => d.name.toLowerCase().includes(query.toLowerCase())).map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-[#16161d] border border-white/[.07] hover:border-white/[.15] rounded-xl cursor-pointer transition-all mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/15">
                    <FileText size={16} className="text-red-400"/>
                  </div>
                  <div><p className="text-[13px] font-medium text-[#f0f0f5]">{d.name}</p>
                  <p className="text-[11px] text-[#5a5a6e]">{d.groupName} · {d.type}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
