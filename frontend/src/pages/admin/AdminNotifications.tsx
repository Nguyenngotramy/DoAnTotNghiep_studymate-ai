import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  Bell,
  Send,
  Users,
  ShieldAlert,
  UserCheck,
  BrainCircuit,
  History,
  RefreshCw,
} from 'lucide-react'

type TargetType = 'ALL' | 'SELECTED_USERS' | 'WEAK_USERS' | 'LOCKED_USERS' | 'UNLOCKED_USERS'

type UserRow = {
  id: string
  fullName?: string
  email?: string
  locked?: boolean
  isLocked?: boolean
}

type BroadcastLog = {
  id: string
  target: string
  title: string
  message: string
  count: number
  createdAt: string
}

const templates = [
  {
    label: 'Nhắc nhở học tập',
    title: 'Hỗ trợ học tập từ StudyMate AI',
    message: 'Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp nhé.',
  },
  {
    label: 'Thông báo hệ thống',
    title: 'Thông báo từ StudyMate AI',
    message: 'Hệ thống có cập nhật mới. Vui lòng kiểm tra lại thông tin và hoạt động học tập của bạn.',
  },
  {
    label: 'Tài khoản đã mở khóa',
    title: 'Tài khoản của bạn đã được mở khóa',
    message: 'Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập và tiếp tục sử dụng StudyMate AI.',
  },
  {
    label: 'Cảnh báo học lực yếu',
    title: 'Cảnh báo hỗ trợ học tập',
    message: 'Hệ thống ghi nhận kết quả học tập của bạn đang có dấu hiệu giảm. Hãy ôn tập thêm và tham gia nhóm học phù hợp.',
  },
]

export default function AdminNotifications() {
  const [targetType, setTargetType] = useState<TargetType>('ALL')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [weakUsers, setWeakUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<BroadcastLog[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)

      const usersRes: any = await adminApi.getUsers(0)
      const alertRes: any = await adminApi.getAlertCenter()

      const userList = Array.isArray(usersRes)
        ? usersRes
        : usersRes?.content || []

      setUsers(userList)
      setWeakUsers(alertRes?.weakLearners || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tải dữ liệu thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const lockedUsers = useMemo(() => {
    return users.filter(u => u.locked === true || u.isLocked === true)
  }, [users])

  const unlockedUsers = useMemo(() => {
    return users.filter(u => !(u.locked === true || u.isLocked === true))
  }, [users])

  const targetUsers = useMemo(() => {
    if (targetType === 'SELECTED_USERS') {
      return users.filter(u => selectedUsers.includes(u.id))
    }

    if (targetType === 'WEAK_USERS') {
      return weakUsers.map(w => ({
        id: w.userId,
        fullName: w.name,
      }))
    }

    if (targetType === 'LOCKED_USERS') {
      return lockedUsers
    }

    if (targetType === 'UNLOCKED_USERS') {
      return unlockedUsers
    }

    return users
  }, [targetType, users, selectedUsers, weakUsers, lockedUsers, unlockedUsers])

  const applyTemplate = (template: typeof templates[number]) => {
    setTitle(template.title)
    setMessage(template.message)
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề thông báo')
      return
    }

    if (!message.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo')
      return
    }

    if (targetType !== 'ALL' && targetUsers.length === 0) {
      toast.error('Không có user phù hợp để gửi')
      return
    }

    try {
      setSending(true)

      if (targetType === 'ALL') {
        await adminApi.broadcast(title.trim(), message.trim())
      } else {
        for (const user of targetUsers) {
          await adminApi.sendSupportReminder(user.id, message.trim())
        }
      }

      const log: BroadcastLog = {
        id: crypto.randomUUID(),
        target: targetType,
        title: title.trim(),
        message: message.trim(),
        count: targetType === 'ALL' ? users.length : targetUsers.length,
        createdAt: new Date().toISOString(),
      }

      setHistory(prev => [log, ...prev])
      toast.success('Đã gửi thông báo thành công')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi thông báo')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-[#f0f0f5] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold flex items-center gap-2">
            <Bell size={22} className="text-red-400" />
            Gửi thông báo
          </h1>
          <p className="text-[13px] text-[#8b8b9e] mt-1">
            Gửi thông báo toàn hệ thống, theo nhóm user, user học lực yếu hoặc user bị khóa/mới mở khóa.
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
          <p className="text-[12px] text-[#8b8b9e]">Tổng user</p>
          <h2 className="text-2xl font-semibold mt-2">{users.length}</h2>
        </div>

        <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4">
          <p className="text-[12px] text-yellow-300">User học lực yếu</p>
          <h2 className="text-2xl font-semibold mt-2">{weakUsers.length}</h2>
        </div>

        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
          <p className="text-[12px] text-red-300">User bị khóa</p>
          <h2 className="text-2xl font-semibold mt-2">{lockedUsers.length}</h2>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <p className="text-[12px] text-emerald-300">User đang hoạt động</p>
          <h2 className="text-2xl font-semibold mt-2">{unlockedUsers.length}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold mb-4 flex items-center gap-2">
            <Send size={18} className="text-red-400" />
            Soạn thông báo
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-[#8b8b9e]">Đối tượng nhận</label>
              <select
                value={targetType}
                onChange={e => setTargetType(e.target.value as TargetType)}
                className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
              >
                <option value="ALL">Toàn hệ thống</option>
                <option value="SELECTED_USERS">Chọn user cụ thể</option>
                <option value="WEAK_USERS">User học lực yếu</option>
                <option value="LOCKED_USERS">User bị khóa</option>
                <option value="UNLOCKED_USERS">User đang hoạt động / mới mở khóa</option>
              </select>
            </div>

            {targetType === 'SELECTED_USERS' && (
              <div className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-3 max-h-[220px] overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-[13px] text-[#8b8b9e]">Không có user.</p>
                ) : (
                  users.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 py-2 text-[13px] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                      />
                      <span>
                        {user.fullName || user.email || user.id}
                        <span className="text-[#6b6b7c] ml-2">{user.email}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            <div>
              <label className="text-[12px] text-[#8b8b9e]">Tiêu đề</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề thông báo..."
                className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-red-500/50"
              />
            </div>

            <div>
              <label className="text-[12px] text-[#8b8b9e]">Nội dung</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Nhập nội dung thông báo..."
                rows={5}
                className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-red-500/50 resize-none"
              />
            </div>

            <div className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-3">
              <p className="text-[12px] text-[#8b8b9e] mb-2">Mẫu thông báo có sẵn</p>

              <div className="flex flex-wrap gap-2">
                {templates.map(template => (
                  <button
                    key={template.label}
                    onClick={() => applyTemplate(template)}
                    className="px-3 py-1.5 rounded-lg bg-white/[.04] hover:bg-white/[.08] border border-white/[.08] text-[12px]"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-[14px] font-medium"
            >
              <Send size={16} />
              {sending ? 'Đang gửi...' : `Gửi thông báo (${targetType === 'ALL' ? users.length : targetUsers.length} user)`}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
            <h2 className="text-[16px] font-semibold mb-4">Nhóm nhận nhanh</h2>

            <div className="space-y-3">
              <button
                onClick={() => setTargetType('ALL')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[.03] hover:bg-white/[.06] border border-white/[.08] text-left"
              >
                <Users size={17} className="text-blue-400" />
                <div>
                  <p className="text-[13px]">Toàn hệ thống</p>
                  <p className="text-[11px] text-[#8b8b9e]">{users.length} user</p>
                </div>
              </button>

              <button
                onClick={() => setTargetType('WEAK_USERS')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[.03] hover:bg-white/[.06] border border-white/[.08] text-left"
              >
                <BrainCircuit size={17} className="text-yellow-400" />
                <div>
                  <p className="text-[13px]">User học lực yếu</p>
                  <p className="text-[11px] text-[#8b8b9e]">{weakUsers.length} user</p>
                </div>
              </button>

              <button
                onClick={() => setTargetType('LOCKED_USERS')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[.03] hover:bg-white/[.06] border border-white/[.08] text-left"
              >
                <ShieldAlert size={17} className="text-red-400" />
                <div>
                  <p className="text-[13px]">User bị khóa</p>
                  <p className="text-[11px] text-[#8b8b9e]">{lockedUsers.length} user</p>
                </div>
              </button>

              <button
                onClick={() => setTargetType('UNLOCKED_USERS')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[.03] hover:bg-white/[.06] border border-white/[.08] text-left"
              >
                <UserCheck size={17} className="text-emerald-400" />
                <div>
                  <p className="text-[13px]">User đang hoạt động</p>
                  <p className="text-[11px] text-[#8b8b9e]">{unlockedUsers.length} user</p>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
            <h2 className="text-[16px] font-semibold mb-4 flex items-center gap-2">
              <History size={17} className="text-red-400" />
              Lịch sử broadcast
            </h2>

            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-[13px] text-[#8b8b9e]">
                  Chưa có lịch sử trong phiên hiện tại.
                </p>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-3"
                  >
                    <p className="text-[13px] font-medium">{item.title}</p>
                    <p className="text-[11px] text-[#8b8b9e] mt-1">
                      {item.target} · {item.count} user
                    </p>
                    <p className="text-[11px] text-[#6b6b7c] mt-1">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}