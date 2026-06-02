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
  CalendarDays,
  Wrench,
  AlertTriangle,
} from 'lucide-react'

type TargetType =
  | 'ALL'
  | 'SELECTED_USERS'
  | 'WEAK_USERS'
  | 'LOCKED_USERS'
  | 'UNLOCKED_USERS'

type NotificationType =
  | 'GENERAL'
  | 'EVENT'
  | 'MAINTENANCE'
  | 'WARNING'
  | 'SUPPORT'

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

type UserRow = {
  id?: string
  _id?: string
  userId?: string
  fullName?: string
  name?: string
  email?: string
  locked?: boolean
  isLocked?: boolean
}

type WeakUserRow = {
  id?: string
  userId?: string
  fullName?: string
  name?: string
  email?: string
}

type BroadcastLog = {
  id: string
  title: string
  message: string
  type: NotificationType
  priority: Priority
  targetType: TargetType
  recipientIds?: string[]
  recipientCount: number
  createdBy?: string
  createdAt: string
}

const templates = [
  {
    label: 'Nhắc nhở học tập',
    type: 'SUPPORT' as NotificationType,
    priority: 'NORMAL' as Priority,
    title: 'Hỗ trợ học tập từ StudyMate AI',
    message:
      'Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp nhé.',
  },
  {
    label: 'Thông báo sự kiện',
    type: 'EVENT' as NotificationType,
    priority: 'NORMAL' as Priority,
    title: 'Sự kiện học tập mới trên StudyMate AI',
    message:
      'StudyMate AI vừa có sự kiện học tập mới. Hãy kiểm tra thông tin và tham gia để cải thiện tiến độ học tập của bạn.',
  },
  {
    label: 'Thông báo bảo trì',
    type: 'MAINTENANCE' as NotificationType,
    priority: 'HIGH' as Priority,
    title: 'Thông báo bảo trì hệ thống',
    message:
      'StudyMate AI sẽ tiến hành bảo trì hệ thống trong thời gian sắp tới. Một số tính năng có thể tạm thời không khả dụng.',
  },
  {
    label: 'Cảnh báo học lực yếu',
    type: 'WARNING' as NotificationType,
    priority: 'HIGH' as Priority,
    title: 'Cảnh báo hỗ trợ học tập',
    message:
      'Hệ thống ghi nhận kết quả học tập của bạn đang có dấu hiệu giảm. Hãy ôn tập thêm và tham gia nhóm học phù hợp.',
  },
  {
    label: 'Tài khoản đã mở khóa',
    type: 'GENERAL' as NotificationType,
    priority: 'NORMAL' as Priority,
    title: 'Tài khoản của bạn đã được mở khóa',
    message:
      'Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập và tiếp tục sử dụng StudyMate AI.',
  },
]

function getUserId(user: UserRow | WeakUserRow) {
  return user.id || user.userId || user._id || ''
}

function getUserName(user: UserRow | WeakUserRow) {
  return user.fullName || user.name || user.email || getUserId(user) || 'Người dùng'
}

function targetLabel(targetType: TargetType) {
  switch (targetType) {
    case 'ALL':
      return 'Toàn hệ thống'
    case 'SELECTED_USERS':
      return 'User được chọn'
    case 'WEAK_USERS':
      return 'User học lực yếu'
    case 'LOCKED_USERS':
      return 'User bị khóa'
    case 'UNLOCKED_USERS':
      return 'User đang hoạt động'
    default:
      return targetType
  }
}

function notificationTypeLabel(type: NotificationType) {
  switch (type) {
    case 'EVENT':
      return 'Sự kiện'
    case 'MAINTENANCE':
      return 'Bảo trì'
    case 'WARNING':
      return 'Cảnh báo'
    case 'SUPPORT':
      return 'Hỗ trợ học tập'
    default:
      return 'Thông báo chung'
  }
}

export default function AdminNotifications() {
  const [targetType, setTargetType] = useState<TargetType>('ALL')
  const [notificationType, setNotificationType] = useState<NotificationType>('GENERAL')
  const [priority, setPriority] = useState<Priority>('NORMAL')

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const [users, setUsers] = useState<UserRow[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [weakUsers, setWeakUsers] = useState<WeakUserRow[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<BroadcastLog[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [usersRes, alertRes, historyRes]: any = await Promise.all([
        adminApi.getUsers(0, undefined, 10000),
        adminApi.getAlertCenter(),
        adminApi.getNotificationHistory(),
      ])

      const userList = Array.isArray(usersRes)
        ? usersRes
        : usersRes?.content || usersRes?.data?.content || []

      const totalUserCount =
        usersRes?.totalElements ||
        usersRes?.data?.totalElements ||
        userList.length

      const weakLearnerList = Array.isArray(alertRes?.weakLearners)
        ? alertRes.weakLearners
        : alertRes?.data?.weakLearners || []

      const historyList = Array.isArray(historyRes)
        ? historyRes
        : historyRes?.content || historyRes?.data || []

      setUsers(userList)
      setTotalUsers(totalUserCount)
      setWeakUsers(weakLearnerList)
      setHistory(historyList)
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
      return users.filter(u => selectedUsers.includes(getUserId(u)))
    }

    if (targetType === 'WEAK_USERS') {
      return weakUsers.map(w => ({
        id: getUserId(w),
        fullName: getUserName(w),
        email: w.email,
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

  const targetUserIds = useMemo(() => {
    if (targetType === 'ALL') return []

    return targetUsers
      .map(user => getUserId(user))
      .filter(id => id && id.trim().length > 0)
  }, [targetType, targetUsers])

  const recipientCount = targetType === 'ALL' ? totalUsers : targetUserIds.length

  const applyTemplate = (template: typeof templates[number]) => {
    setNotificationType(template.type)
    setPriority(template.priority)
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

    if (targetType !== 'ALL' && targetUserIds.length === 0) {
      toast.error('Không có user phù hợp để gửi')
      return
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn gửi thông báo này cho ${recipientCount} user không?`
    )

    if (!confirmed) return

    try {
      setSending(true)

      await adminApi.sendAdminNotification({
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        priority,
        targetType,
        userIds: targetUserIds,
      })

      toast.success('Đã gửi thông báo thành công')

      setTitle('')
      setMessage('')
      setTargetType('ALL')
      setNotificationType('GENERAL')
      setPriority('NORMAL')
      setSelectedUsers([])

      await fetchData()
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
            Gửi thông báo sự kiện, bảo trì, cảnh báo hoặc hỗ trợ học tập cho user thật trong hệ thống.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] disabled:opacity-60 text-[13px] text-[#d8d8e2] border border-white/[.08]"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4">
          <p className="text-[12px] text-[#8b8b9e]">Tổng user</p>
          <h2 className="text-2xl font-semibold mt-2">{totalUsers}</h2>
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
                  users.map(user => {
                    const userId = getUserId(user)

                    return (
                      <label
                        key={userId}
                        className="flex items-center gap-3 py-2 text-[13px] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(userId)}
                          onChange={() => toggleUser(userId)}
                        />
                        <span>
                          {getUserName(user)}
                          <span className="text-[#6b6b7c] ml-2">{user.email}</span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-[#8b8b9e]">Loại thông báo</label>
                <select
                  value={notificationType}
                  onChange={e => setNotificationType(e.target.value as NotificationType)}
                  className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
                >
                  <option value="GENERAL">Thông báo chung</option>
                  <option value="EVENT">Sự kiện học tập</option>
                  <option value="MAINTENANCE">Bảo trì hệ thống</option>
                  <option value="WARNING">Cảnh báo</option>
                  <option value="SUPPORT">Hỗ trợ học tập</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] text-[#8b8b9e]">Mức độ ưu tiên</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
                >
                  <option value="LOW">Thấp</option>
                  <option value="NORMAL">Bình thường</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[12px] text-[#8b8b9e]">Tiêu đề</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ví dụ: Thông báo bảo trì hệ thống"
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
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="px-3 py-1.5 rounded-lg bg-white/[.04] hover:bg-white/[.08] border border-white/[.08] text-[12px]"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-3">
              <p className="text-[12px] text-[#8b8b9e] mb-1">Xem trước</p>
              <p className="text-[14px] font-semibold">{title || 'Tiêu đề thông báo'}</p>
              <p className="text-[13px] text-[#a5a5b8] mt-1 whitespace-pre-line">
                {message || 'Nội dung thông báo sẽ hiển thị tại đây.'}
              </p>
              <p className="text-[11px] text-[#6b6b7c] mt-3">
                {notificationTypeLabel(notificationType)} · {priority} · {targetLabel(targetType)} · {recipientCount} user
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-[14px] font-medium"
            >
              <Send size={16} />
              {sending ? 'Đang gửi...' : `Gửi thông báo (${recipientCount} user)`}
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
                  <p className="text-[11px] text-[#8b8b9e]">{totalUsers} user</p>
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

              <button
                onClick={() => {
                  setNotificationType('EVENT')
                  setPriority('NORMAL')
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[.03] hover:bg-white/[.06] border border-white/[.08] text-left"
              >
                <CalendarDays size={17} className="text-purple-400" />
                <div>
                  <p className="text-[13px]">Thông báo sự kiện</p>
                  <p className="text-[11px] text-[#8b8b9e]">Workshop, deadline, lịch học</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setNotificationType('MAINTENANCE')
                  setPriority('HIGH')
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[.03] hover:bg-white/[.06] border border-white/[.08] text-left"
              >
                <Wrench size={17} className="text-orange-400" />
                <div>
                  <p className="text-[13px]">Thông báo bảo trì</p>
                  <p className="text-[11px] text-[#8b8b9e]">Bảo trì server, cập nhật hệ thống</p>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
            <h2 className="text-[16px] font-semibold mb-4 flex items-center gap-2">
              <History size={17} className="text-red-400" />
              Lịch sử broadcast
            </h2>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-[13px] text-[#8b8b9e]">
                  Chưa có lịch sử gửi thông báo.
                </p>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium">{item.title}</p>
                      {item.priority === 'URGENT' || item.priority === 'HIGH' ? (
                        <AlertTriangle size={14} className="text-red-400 mt-0.5" />
                      ) : null}
                    </div>

                    <p className="text-[11px] text-[#8b8b9e] mt-1">
                      {targetLabel(item.targetType)} · {notificationTypeLabel(item.type)} · {item.recipientCount} user
                    </p>

                    <p className="text-[11px] text-[#6b6b7c] mt-1">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}
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
