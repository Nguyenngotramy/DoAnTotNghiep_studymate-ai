import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BookOpen, Users, BarChart2, MessageCircle, UserPlus, UserCheck,
  Flame, Zap, Star, MapPin, Calendar, Edit2, Loader2,
  Heart, TrendingUp, Clock, Camera, AlertCircle, GraduationCap,
  School, Target, X, ChevronDown, ChevronUp
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { friendApi, postApi, groupApi, userApi } from '@/api/services'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6']
const SKILL_COLORS: Record<string, string> = {
  'Toán': '#6366f1',
  'Tiếng Anh': '#ec4899',
  'Lập trình': '#14b8a6',
  'Vật lý': '#3b82f6',
  'Hóa học': '#22c55e',
  'Sinh học': '#10b981',
  'Ngữ văn': '#f97316',
  'Lịch sử': '#f59e0b',
  'Địa lý': '#84cc16',
  'IELTS': '#06b6d4',
  'TOEIC': '#8b5cf6',
  'AI/ML': '#a855f7',
}

const BACKEND = 'http://localhost:8080/api'
const toAbsUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BACKEND + url
}

function ini(n: string) {
  return (n ?? '?')
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(-2)
    .toUpperCase() || '?'
}

function nameColor(n: string) {
  return COLORS[(n?.charCodeAt(0) ?? 0) % COLORS.length]
}

function ago(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}p`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)} ngày`
}

function formatUserType(userType?: string) {
  switch (userType) {
    case 'STUDENT':
      return 'Sinh viên'
    case 'HIGHSCHOOL':
      return 'Học sinh'
    case 'TEACHER':
      return 'Giáo viên'
    case 'OTHER':
      return 'Khác'
    default:
      return 'Chưa cập nhật'
  }
}

function formatDay(day?: string) {
  switch (day) {
    case 'MON':
      return 'Thứ 2'
    case 'TUE':
      return 'Thứ 3'
    case 'WED':
      return 'Thứ 4'
    case 'THU':
      return 'Thứ 5'
    case 'FRI':
      return 'Thứ 6'
    case 'SAT':
      return 'Thứ 7'
    case 'SUN':
      return 'Chủ nhật'
    default:
      return day ?? ''
  }
}

function Stars({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={9}
          fill={i <= level ? 'currentColor' : 'none'}
          className={i <= level ? 'text-amber-400' : ''}
          style={i <= level ? {} : { color: 'var(--bg4)' }}
        />
      ))}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div
      className="rounded-xl p-4 text-center border"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
        style={{ background: color + '18' }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-[20px] font-bold font-mono" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
    </div>
  )
}

function calcAchievements(user: any, posts: any[], groups: any[]) {
  const earned: { icon: string; label: string; desc: string; color: string }[] = []

  if (posts.length >= 1) earned.push({ icon: '✍️', label: 'Người viết', desc: 'Viết bài đầu tiên', color: '#6366f1' })
  if (posts.length >= 10) earned.push({ icon: '🏆', label: 'Top Contributor', desc: 'Viết từ 10 bài trở lên', color: '#f59e0b' })
  if ((user?.xp ?? 0) >= 100) earned.push({ icon: '⚡', label: 'Năng động', desc: 'Đạt 100 XP', color: '#14b8a6' })
  if ((user?.xp ?? 0) >= 500) earned.push({ icon: '⭐', label: 'Xuất sắc', desc: 'Đạt 500 XP', color: '#f59e0b' })
  if ((user?.streak ?? 0) >= 7) earned.push({ icon: '🔥', label: 'Streak 7 ngày', desc: 'Học 7 ngày liên tục', color: '#f97316' })
  if ((user?.streak ?? 0) >= 30) earned.push({ icon: '💪', label: 'Streak Master', desc: 'Học 30 ngày liên tục', color: '#ef4444' })
  if (groups.length >= 1) earned.push({ icon: '👥', label: 'Team Player', desc: 'Tham gia nhóm học đầu tiên', color: '#22c55e' })
  if (groups.length >= 3) earned.push({ icon: '🌟', label: 'Connector', desc: 'Tham gia từ 3 nhóm trở lên', color: '#ec4899' })
  if ((user?.skills ?? []).length >= 2) earned.push({ icon: '📚', label: 'Đa tài', desc: 'Có từ 2 môn học trở lên', color: '#8b5cf6' })

  return earned
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: me, updateUser } = useAuthStore()
  const navigate = useNavigate()

  const isMyProfile = !userId || userId === 'me' || (!!me?.id && userId === me.id)

  const [profileUser, setProfileUser] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [friendStatus, setFriendStatus] = useState<'NONE' | 'PENDING' | 'ACCEPTED'>('NONE')
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'groups' | 'stats'>('posts')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverPos, setCoverPos] = useState(50)
  const [coverModal, setCoverModal] = useState<{ file: File; previewUrl: string } | null>(null)
  const [badgeModal, setBadgeModal] = useState<{ icon: string; label: string; desc: string; color: string } | null>(null)
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadErr(false)
      setProfileUser(null)
      setPosts([])
      setGroups([])

      try {
        if (isMyProfile) {
          setProfileUser(me)

          const [myGroups, postsRes] = await Promise.all([
            groupApi.list().catch(() => []),
            postApi.list(0).catch(() => ({ content: [] })),
          ])

          setGroups(myGroups as any[])

          const allPosts = (postsRes as any).content ?? []
          setPosts(
            allPosts.filter((p: any) => {
              const aid = p.authorId ?? p.author?.id
              return aid && me?.id && String(aid) === String(me.id)
            }),
          )
        } else {
          const userRes = await userApi.getById(userId!).catch(() => null)
          if (!userRes) {
            setLoadErr(true)
            setLoading(false)
            return
          }

          setProfileUser(userRes)

          const [statusRes, postsRes] = await Promise.all([
            friendApi.status(userId!).catch(() => ({ status: 'NONE' })),
            postApi.list(0).catch(() => ({ content: [] })),
          ])

          setFriendStatus((statusRes as any).status ?? 'NONE')

          const allPosts = (postsRes as any).content ?? []
          setPosts(
            allPosts.filter((p: any) => {
              const aid = p.authorId ?? p.author?.id
              return aid && String(aid) === String(userId)
            }),
          )

          setGroups([])
        }
      } catch (e) {
        console.error('[UserProfilePage] load error:', e)
        if (!isMyProfile) setLoadErr(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId, me?.id, isMyProfile]) // eslint-disable-line

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const res = await userApi.uploadAvatar(file)
      updateUser({ avatar: res.url })
      setProfileUser((p: any) => ({ ...p, avatar: res.url }))
      toast.success('Cập nhật ảnh đại diện thành công!')
    } catch {
      toast.error('Lỗi upload ảnh!')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setCoverModal({ file, previewUrl })
    setCoverPos(50)
    e.target.value = ''
  }

  const confirmCoverUpload = async () => {
    if (!coverModal) return

    setUploadingCover(true)
    try {
      const res = await userApi.uploadCover(coverModal.file)
      updateUser({ coverImage: res.url } as any)
      setProfileUser((p: any) => ({ ...p, coverImage: res.url }))
      URL.revokeObjectURL(coverModal.previewUrl)
      setCoverModal(null)
      toast.success('Cập nhật ảnh bìa thành công!')
    } catch {
      toast.error('Lỗi upload ảnh bìa!')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleAddFriend = async () => {
    if (!userId) return
    try {
      await friendApi.send(userId)
      setFriendStatus('PENDING')
      toast.success('Đã gửi lời mời kết bạn!')
    } catch {
      toast.error('Lỗi khi gửi lời mời')
    }
  }

  const togglePostExpand = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-indigo-400 mb-3" />
        <p className="text-[13px]" style={{ color: 'var(--text3)' }}>Đang tải hồ sơ...</p>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle size={40} className="mb-4" style={{ color: 'var(--bg4)' }} />
        <p className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text)' }}>Không tìm thấy người dùng</p>
        <p className="text-[13px] mb-5" style={{ color: 'var(--text3)' }}>Tài khoản này không tồn tại hoặc đã bị xóa</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[13px] text-white font-medium transition-colors"
        >
          Quay lại
        </button>
      </div>
    )
  }

  const displayUser = isMyProfile ? me ?? profileUser : profileUser
  if (!displayUser) return null

  const color = nameColor(displayUser.fullName ?? '')
  const joinDate = displayUser.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    : 'Không rõ'
  const achievements = calcAchievements(displayUser, posts, groups)

  const avatarUrl = toAbsUrl(displayUser.avatar)
  const coverUrl = toAbsUrl(displayUser.coverImage)

  return (
    <>
      {coverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="border rounded-2xl overflow-hidden w-full max-w-xl shadow-2xl"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Chỉnh vị trí ảnh bìa</p>
              <button
                onClick={() => {
                  URL.revokeObjectURL(coverModal.previewUrl)
                  setCoverModal(null)
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--text3)' }}
              >
                ×
              </button>
            </div>

            <div className="h-44 overflow-hidden relative">
              <img
                src={coverModal.previewUrl}
                alt="preview"
                className="w-full h-full object-cover transition-all"
                style={{ objectPosition: `center ${coverPos}%` }}
              />
            </div>

            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text2)' }}>
                <span>Trên</span>
                <span className="text-indigo-400 font-medium">Kéo để chỉnh vị trí</span>
                <span>Dưới</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={coverPos}
                onChange={e => setCoverPos(Number(e.target.value))}
                className="w-full h-1.5 accent-indigo-500 cursor-pointer rounded-full"
              />
            </div>

            <div className="px-5 pb-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  URL.revokeObjectURL(coverModal.previewUrl)
                  setCoverModal(null)
                }}
                className="px-4 py-2 rounded-xl border text-[12px] transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Hủy
              </button>
              <button
                onClick={confirmCoverUpload}
                disabled={uploadingCover}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-[12px] font-semibold text-white transition-colors"
              >
                {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : null}
                {uploadingCover ? 'Đang tải...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {badgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm border rounded-2xl p-5 shadow-2xl"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
                  style={{ background: badgeModal.color + '18' }}
                >
                  {badgeModal.icon}
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{badgeModal.label}</p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>{badgeModal.desc}</p>
                </div>
              </div>

              <button
                onClick={() => setBadgeModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text3)' }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-5">
        <div
          className="border rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div className="h-40 relative group">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="cover"
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${coverPos}%` }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg,${color}50,${COLORS[(COLORS.indexOf(color) + 3) % COLORS.length]}30,var(--bg3))`,
                }}
              />
            )}

            {isMyProfile && (
              <label className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-[11px] font-medium text-white cursor-pointer hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100">
                <Camera size={12} /> Đổi ảnh bìa
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </label>
            )}
          </div>

          <div className="px-6 pb-5">
            <div className="flex items-center gap-4 -mt-8 mb-4">
              <div className="relative flex-shrink-0 group/av">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayUser.fullName}
                    className="w-16 h-16 rounded-2xl object-cover ring-4"
                    style={{ boxShadow: `0 0 0 4px var(--bg2)` }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-bold text-white ring-4"
                    style={{
                      background: `linear-gradient(135deg,${color},${COLORS[(COLORS.indexOf(color) + 1) % COLORS.length]})`,
                      boxShadow: `0 0 0 4px var(--bg2)`,
                    }}
                  >
                    {ini(displayUser.fullName)}
                  </div>
                )}

                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2" style={{ borderColor: 'var(--bg2)' }} />

                {isMyProfile && (
                  <label className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover/av:opacity-100 transition-all">
                    {uploadingAvatar ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : (
                      <Camera size={16} className="text-white" />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                )}
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 mt-8">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[19px] font-bold truncate" style={{ color: 'var(--text)' }}>{displayUser.fullName}</h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {formatUserType(displayUser.userType)}
                    </span>
                  </div>

                  <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
                    {displayUser.bio || 'Thành viên StudyMate AI'}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {isMyProfile ? (
                    <button
                      onClick={() => navigate('/profile/edit')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[12px] font-medium text-white transition-colors"
                    >
                      <Edit2 size={13} /> Chỉnh sửa hồ sơ
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate(`/inbox/${userId}`, { state: { dmTarget: { userId: String(userId), fullName: displayUser.fullName, avatar: displayUser.avatar } } })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[12px] font-semibold text-white transition-colors"
                      >
                        <MessageCircle size={13} /> Nhắn tin
                      </button>

                      <button
                        onClick={friendStatus === 'NONE' ? handleAddFriend : undefined}
                        className={clsx(
                          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-colors border',
                          {
                            'border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20':
                              friendStatus === 'NONE',
                            'cursor-default': friendStatus === 'PENDING',
                            'border-green-500/30 text-green-400 cursor-default': friendStatus === 'ACCEPTED',
                          },
                        )}
                        style={friendStatus === 'PENDING' ? { borderColor: 'var(--border)', color: 'var(--text2)' } : {}}
                      >
                        {friendStatus === 'NONE' && (
                          <>
                            <UserPlus size={13} />
                            Kết bạn
                          </>
                        )}
                        {friendStatus === 'PENDING' && (
                          <>
                            <Clock size={13} />
                            Đã gửi lời mời
                          </>
                        )}
                        {friendStatus === 'ACCEPTED' && (
                          <>
                            <UserCheck size={13} />
                            Bạn bè
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-[12px]" style={{ color: 'var(--text2)' }}>
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-indigo-400" />
                {displayUser.location || displayUser.school || 'Chưa cập nhật'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-indigo-400" />
                Tham gia {joinDate}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-indigo-400" />
                {posts.length} bài viết
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={12} className="text-amber-400" />
                {(displayUser.xp ?? 0).toLocaleString()} XP
              </span>
              <span className="flex items-center gap-1.5">
                <Flame size={12} className="text-orange-400" />
                {displayUser.streak ?? 0} ngày streak
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-4">
            <div
              className="border rounded-xl p-4"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text)' }}>🎓 Thông tin học tập</p>

              <div className="space-y-3 text-[11px]" style={{ color: 'var(--text2)' }}>
                <div className="flex items-start gap-2">
                  <GraduationCap size={13} className="text-indigo-400 mt-0.5" />
                  <div>
                    <span style={{ color: 'var(--text)' }} className="font-medium">Bạn là:</span>{' '}
                    {formatUserType(displayUser.userType)}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <School size={13} className="text-indigo-400 mt-0.5" />
                  <div>
                    <span style={{ color: 'var(--text)' }} className="font-medium">Trường học:</span>{' '}
                    {displayUser.school || 'Chưa cập nhật'}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Target size={13} className="text-indigo-400 mt-0.5" />
                  <div>
                    <span style={{ color: 'var(--text)' }} className="font-medium">Mục tiêu:</span>{' '}
                    {displayUser.goal || 'Chưa cập nhật'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text)' }} className="font-medium">Môn học thế mạnh:</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {(displayUser.strongSubjects ?? []).length > 0 ? (
                      displayUser.strongSubjects.map((subject: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>Chưa cập nhật</span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text)' }} className="font-medium">Môn cần cải thiện:</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {(displayUser.weakSubjects ?? []).length > 0 ? (
                      displayUser.weakSubjects.map((subject: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>Chưa cập nhật</span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text)' }} className="font-medium">Thời gian rảnh:</span>
                  <div className="mt-1.5 space-y-1.5">
                    {(displayUser.availableSchedule ?? []).length > 0 ? (
                      displayUser.availableSchedule.map((slot: any, index: number) => (
                        <div
                          key={index}
                          className="px-2.5 py-2 rounded-lg text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        >
                          {formatDay(slot.dayOfWeek)}: {slot.startTime} - {slot.endTime}
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>Chưa cập nhật</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="border rounded-xl p-4"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text)' }}>📚 Môn học</p>

              {(displayUser.skills ?? []).length > 0 ? (
                <div className="space-y-2.5">
                  {(displayUser.skills ?? []).map((s: any, i: number) => {
                    const sc = SKILL_COLORS[s.subject] ?? s.color ?? '#6366f1'
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: sc + '15' }}
                        >
                          <BookOpen size={12} style={{ color: sc }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium" style={{ color: 'var(--text)' }}>{s.subject}</span>
                            <Stars level={s.level} />
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg4)' }}>
                            <div className="h-full rounded-full" style={{ width: `${s.level * 33.3}%`, background: sc }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Chưa cập nhật môn học</p>
              )}

              {isMyProfile && (
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="mt-3 w-full py-2 rounded-lg border text-[11px] transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  + Thêm môn học
                </button>
              )}
            </div>

            {achievements.length > 0 && (
              <div
                className="border rounded-xl p-4"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text)' }}>🏅 Huy hiệu</p>

                <div className="grid grid-cols-3 gap-2">
                  {achievements.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => setBadgeModal(a)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:scale-[1.03] transition-all"
                      style={{ background: a.color + '10', border: `0.5px solid ${a.color}25` }}
                    >
                      <span className="text-[18px]">{a.icon}</span>
                      <span className="text-[9px] font-medium text-center leading-tight" style={{ color: a.color }}>
                        {a.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groups.length > 0 && (
              <div
                className="border rounded-xl p-4"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text)' }}>👥 Nhóm tham gia</p>
                <div className="space-y-2">
                  {groups.slice(0, 4).map((g: any) => (
                    <button
                      key={g.id ?? g._id}
                      onClick={() => navigate(`/groups/${g.id ?? g._id}`)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[.04] transition-colors text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: (g.coverColor ?? '#6366f1') + '20',
                          border: `0.5px solid ${g.coverColor ?? '#6366f1'}35`,
                        }}
                      >
                        <Users size={12} style={{ color: g.coverColor ?? '#6366f1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>{g.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{g.memberCount ?? g.members?.length ?? 0} thành viên</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={BookOpen} label="Bài viết" value={posts.length} color="#6366f1" />
              <StatCard
                icon={Heart}
                label="Lượt thích"
                value={posts.reduce((a: number, p: any) => a + (p.likesCount ?? 0), 0)}
                color="#ef4444"
              />
              <StatCard icon={Zap} label="XP" value={(displayUser.xp ?? 0).toLocaleString()} color="#f59e0b" />
              <StatCard icon={Flame} label="Streak" value={`${displayUser.streak ?? 0}d`} color="#f97316" />
            </div>

            <div
              className="border rounded-xl overflow-hidden"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                {([
                  ['posts', 'Bài viết', BookOpen],
                  ['groups', 'Nhóm học', Users],
                  ['stats', 'Thống kê', BarChart2],
                ] as const).map(([t, l, I]) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium transition-all border-b-2',
                      activeTab === t
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent hover:text-[var(--text)]',
                    )}
                    style={activeTab === t ? {} : { color: 'var(--text3)' }}
                  >
                    <I size={13} />
                    {l}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === 'posts' && (
                  <div className="space-y-3">
                    {posts.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-3xl mb-3">📝</p>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
                          {isMyProfile ? 'Bạn chưa viết bài nào' : `${displayUser.fullName} chưa có bài viết nào`}
                        </p>
                        {isMyProfile && (
                          <button
                            onClick={() => navigate('/blog/create')}
                            className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-[12px] text-white transition-colors"
                          >
                            Viết bài đầu tiên
                          </button>
                        )}
                      </div>
                    ) : (
                      posts.map((p: any) => {
                        const postId = p.id ?? p._id
                        const expanded = !!expandedPosts[postId]
                        const contentText = p.content ?? ''
                        const shouldCollapse = contentText.length > 180 || contentText.includes('\n')

                        return (
                          <button
                            key={postId}
                            onClick={() => navigate(`/blog/${postId}`)}
                            className="w-full p-4 rounded-xl border hover:bg-white/[.03] transition-all text-left"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="flex gap-1.5 mb-2 flex-wrap">
                              {(p.tags ?? []).slice(0, 3).map((t: string) => (
                                <span
                                  key={t}
                                  className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                                  style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>

                            <p
                              className="text-[15px] font-semibold leading-snug mb-2"
                              style={{ color: 'var(--text)' }}
                            >
                              {p.title}
                            </p>

                            <div
                              className={clsx(
                                'text-[12px] leading-6 whitespace-pre-wrap transition-all',
                                !expanded && shouldCollapse && 'line-clamp-3'
                              )}
                              style={{ color: 'var(--text2)' }}
                            >
                              {contentText || 'Không có nội dung'}
                            </div>

                            {shouldCollapse && (
                              <button
                                onClick={(e) => togglePostExpand(postId, e)}
                                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                {expanded ? (
                                  <>
                                    <ChevronUp size={13} />
                                    Thu gọn
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={13} />
                                    Xem thêm
                                  </>
                                )}
                              </button>
                            )}

                            <div className="flex items-center gap-3 text-[11px] mt-3" style={{ color: 'var(--text3)' }}>
                              <span className="flex items-center gap-1">
                                <Heart size={11} className="text-red-400" />
                                {p.likesCount ?? 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle size={11} />
                                {p.commentsCount ?? 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp size={11} />
                                {p.views ?? 0} xem
                              </span>
                              <span className="ml-auto">{p.createdAt ? ago(p.createdAt) : ''}</span>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}

                {activeTab === 'groups' && (
                  <div className="grid grid-cols-2 gap-3">
                    {groups.length === 0 ? (
                      <div className="col-span-2 text-center py-10">
                        <p className="text-3xl mb-3">👥</p>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
                          {isMyProfile ? 'Chưa tham gia nhóm nào' : 'Không xem được nhóm của người khác'}
                        </p>
                        {isMyProfile && (
                          <button
                            onClick={() => navigate('/groups')}
                            className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-[12px] text-white transition-colors"
                          >
                            Khám phá nhóm học
                          </button>
                        )}
                      </div>
                    ) : (
                      groups.map((g: any) => (
                        <button
                          key={g.id ?? g._id}
                          onClick={() => navigate(`/groups/${g.id ?? g._id}`)}
                          className="p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center"
                            style={{
                              background: (g.coverColor ?? '#6366f1') + '20',
                              border: `0.5px solid ${g.coverColor ?? '#6366f1'}40`,
                            }}
                          >
                            <Users size={16} style={{ color: g.coverColor ?? '#6366f1' }} />
                          </div>
                          <p className="text-[12px] font-semibold mb-1 line-clamp-1" style={{ color: 'var(--text)' }}>{g.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{g.subject}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text3)' }}>{g.memberCount ?? g.members?.length ?? 0} thành viên</p>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    {posts.length === 0 && groups.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-3xl mb-3">📊</p>
                        <p className="text-[13px]" style={{ color: 'var(--text2)' }}>Chưa có hoạt động nào</p>
                        {isMyProfile && (
                          <p className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>Viết bài và tham gia nhóm để xem thống kê</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Bài viết', val: posts.length, icon: '📝', color: '#6366f1' },
                          {
                            label: 'Lượt thích nhận',
                            val: posts.reduce((a: number, p: any) => a + (p.likesCount ?? 0), 0),
                            icon: '❤️',
                            color: '#ef4444',
                          },
                          {
                            label: 'Bình luận nhận',
                            val: posts.reduce((a: number, p: any) => a + (p.commentsCount ?? 0), 0),
                            icon: '💬',
                            color: '#14b8a6',
                          },
                          { label: 'Nhóm tham gia', val: groups.length, icon: '👥', color: '#f59e0b' },
                          {
                            label: 'XP tích lũy',
                            val: (displayUser.xp ?? 0).toLocaleString(),
                            icon: '⚡',
                            color: '#8b5cf6',
                          },
                          {
                            label: 'Streak hiện tại',
                            val: `${displayUser.streak ?? 0} ngày`,
                            icon: '🔥',
                            color: '#f97316',
                          },
                        ].map(s => (
                          <div
                            key={s.label}
                            className="p-3.5 rounded-xl border"
                            style={{ background: s.color + '08', borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[16px]">{s.icon}</span>
                              <span className="text-[10px]" style={{ color: 'var(--text2)' }}>{s.label}</span>
                            </div>
                            <div className="text-[22px] font-bold font-mono" style={{ color: s.color }}>
                              {s.val}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}