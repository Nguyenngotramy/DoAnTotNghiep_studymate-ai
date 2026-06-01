import { useMemo, useState } from 'react'
import UserAvatar from '@/components/UserAvatar'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  MessageCircle,
  UserPlus,
  UserCheck,
  Clock,
  Star,
  Search,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { friendApi } from '@/api/services'
import type { User, Friendship } from '@/types'

type PendingFriendship = Friendship & {
  direction?: 'INCOMING' | 'OUTGOING'
  requester?: User
  receiver?: User
  otherUser?: User
  otherUserId?: string
}

const COLORS = [
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#8b5cf6',
]

const SKILL_COLORS: Record<string, string> = {
  Toán: '#6366f1',
  'Tiếng Anh': '#ec4899',
  'Lập trình': '#14b8a6',
  'Vật lý': '#3b82f6',
  'Hóa học': '#22c55e',
  'Sinh học': '#10b981',
  'Ngữ văn': '#f97316',
  'AI/ML': '#8b5cf6',
  IELTS: '#f59e0b',
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const toAbsUrl = (url?: string | null): string => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/api')) return `http://localhost:8080${url}`
  return `${API_BASE}${url}`
}

function ini(name?: string) {
  return (name || 'U')
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(-2)
    .toUpperCase()
}

function nameColor(name?: string) {
  return COLORS[((name || 'U').charCodeAt(0) || 0) % COLORS.length]
}

function safeText(value?: string | null, fallback = '') {
  return value && value.trim() ? value : fallback
}

function Stars({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={10}
          fill={i <= level ? 'currentColor' : 'none'}
          className={i <= level ? 'text-amber-400' : ''}
          style={i <= level ? {} : { color: 'var(--bg4)' }}
        />
      ))}
    </span>
  )
}

function CardSkeleton() {
  return (
    <div
      className="border rounded-xl p-5 animate-pulse"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full"
          style={{ background: 'rgba(255,255,255,.06)' }}
        />
        <div className="flex-1 space-y-2">
          <div
            className="h-3.5 w-32 rounded"
            style={{ background: 'rgba(255,255,255,.06)' }}
          />
          <div
            className="h-2.5 w-24 rounded"
            style={{ background: 'rgba(255,255,255,.04)' }}
          />
        </div>
      </div>
      <div
        className="h-2 w-full rounded mb-2"
        style={{ background: 'rgba(255,255,255,.04)' }}
      />
      <div
        className="h-8 w-full rounded-xl"
        style={{ background: 'rgba(255,255,255,.04)' }}
      />
    </div>
  )
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'suggest' | 'pending' | 'friends'>('suggest')
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState<Set<string>>(new Set())

  const {
    data: suggestions = [],
    isLoading: loadSuggest,
    refetch: refetchSuggest,
  } = useQuery({
    queryKey: ['friends-suggestions-full'],
    queryFn: () => friendApi.suggestions('', 10000),
    staleTime: 60_000,
  })

  const {
    data: pending = [],
    isLoading: loadPending,
  } = useQuery({
    queryKey: ['friends-pending-full'],
    queryFn: () => friendApi.pending(10000),
    staleTime: 30_000,
  })

  const {
    data: friends = [],
    isLoading: loadFriends,
  } = useQuery({
    queryKey: ['friends-list-full'],
    queryFn: () => friendApi.list('', 10000),
    staleTime: 60_000,
  })

  const sendReq = useMutation({
    mutationFn: (uid: string) => friendApi.send(uid),
    onSuccess: (_, uid) => {
      setAdded(prev => {
        const next = new Set(prev)
        next.add(uid)
        return next
      })

      toast.success('Đã gửi lời mời kết bạn!')

      qc.invalidateQueries({ queryKey: ['friends-suggestions-full'] })
      qc.invalidateQueries({ queryKey: ['friends-pending-full'] })
      qc.invalidateQueries({ queryKey: ['friends-list-full'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể gửi lời mời!')
    },
  })

  const acceptReq = useMutation({
    mutationFn: (uid: string) => friendApi.accept(uid),
    onSuccess: () => {
      toast.success('Đã chấp nhận!')
      qc.invalidateQueries({ queryKey: ['friends-pending-full'] })
      qc.invalidateQueries({ queryKey: ['friends-list-full'] })
      qc.invalidateQueries({ queryKey: ['friends-suggestions-full'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể chấp nhận!')
    },
  })

  const rejectReq = useMutation({
    mutationFn: (uid: string) => friendApi.reject(uid),
    onSuccess: () => {
      toast.success('Đã từ chối')
      qc.invalidateQueries({ queryKey: ['friends-pending-full'] })
      qc.invalidateQueries({ queryKey: ['friends-suggestions-full'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể từ chối!')
    },
  })

  const removeF = useMutation({
    mutationFn: (uid: string) => friendApi.remove(uid),
    onSuccess: () => {
      toast.success('Đã hủy kết bạn/lời mời')
      qc.invalidateQueries({ queryKey: ['friends-list-full'] })
      qc.invalidateQueries({ queryKey: ['friends-suggestions-full'] })
      qc.invalidateQueries({ queryKey: ['friends-pending-full'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể hủy kết bạn/lời mời!')
    },
  })

  const q = search.trim().toLowerCase()

  const filtSuggest = useMemo(() => {
    return (suggestions as User[]).filter(user => {
      if (!q) return true

      const text = [
        user.fullName,
        user.email,
        user.bio,
        user.studentCode,
        user.school,
        ...(user.interests || []),
        ...(user.strongSubjects || []),
        ...(user.weakSubjects || []),
        ...(user.skills || []).map(skill => skill.subject),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return text.includes(q)
    })
  }, [suggestions, q])

  const filtFriends = useMemo(() => {
    return (friends as User[]).filter(user => {
      if (!q) return true

      const text = [
        user.fullName,
        user.email,
        user.bio,
        user.studentCode,
        user.school,
        ...(user.interests || []),
        ...(user.strongSubjects || []),
        ...(user.weakSubjects || []),
        ...(user.skills || []).map(skill => skill.subject),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return text.includes(q)
    })
  }, [friends, q])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-[18px] font-semibold flex items-center gap-2"
            style={{ color: 'var(--text)' }}
          >
            <Users size={18} className="text-indigo-400" />
            Kết bạn
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text3)' }}>
            Tìm bạn học phù hợp · Kết nối cộng đồng
          </p>
        </div>

        <div
          className="flex items-center gap-3 text-[11px]"
          style={{ color: 'var(--text3)' }}
        >
          <span className="flex items-center gap-1">
            <Users size={12} />
            {(friends as User[]).length} bạn bè
          </span>

          <span className="flex items-center gap-1">
            <Clock size={12} />
            {(pending as Friendship[]).length} lời mời
          </span>
        </div>
      </div>

      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
        }}
      >
        {[
          ['suggest', `Gợi ý (${(suggestions as User[]).length})`],
          ['pending', `Lời mời (${(pending as Friendship[]).length})`],
          ['friends', `Bạn bè (${(friends as User[]).length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as 'suggest' | 'pending' | 'friends')}
            className={clsx(
              'px-4 py-2 rounded-lg text-[12px] font-medium transition-all',
              tab === key ? '' : 'hover:text-[var(--text)]',
            )}
            style={
              tab === key
                ? {
                    background: 'var(--bg2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }
                : { color: 'var(--text3)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'suggest' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div
              className="flex items-center gap-2 flex-1 h-9 px-3 rounded-lg border"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
              }}
            >
              <Search
                size={13}
                className="flex-shrink-0"
                style={{ color: 'var(--text3)' }}
              />

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, kỹ năng, trường học..."
                className="flex-1 bg-transparent text-[12px] outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>

            <button
              onClick={() => refetchSuggest()}
              className="px-3 h-9 rounded-lg border transition-all"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text3)',
              }}
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {loadSuggest ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filtSuggest.length === 0 ? (
            <div
              className="text-center py-16 border rounded-xl"
              style={{
                background: 'var(--bg2)',
                borderColor: 'var(--border)',
              }}
            >
              <p className="text-3xl mb-3">🔍</p>
              <p
                className="text-[14px] font-medium"
                style={{ color: 'var(--text)' }}
              >
                Không tìm thấy ai phù hợp
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                Hoàn thiện hồ sơ học tập để nhận gợi ý tốt hơn
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtSuggest.map(user => {
                const isAdded = added.has(user.id)

                return (
                  <div
                    key={user.id}
                    className="border rounded-xl p-5 transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'var(--bg2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <button
                        type="button"
                        className="relative flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/u/${user.id}`)}
                      >
                        <UserAvatar name={user.fullName} avatar={user.avatar} size={48} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/u/${user.id}`)}
                          className="text-[14px] font-semibold hover:text-indigo-300 transition-colors block truncate text-left"
                          style={{ color: 'var(--text)' }}
                        >
                          {user.fullName}
                        </button>

                        <p
                          className="text-[11px] truncate"
                          style={{ color: 'var(--text2)' }}
                        >
                          {safeText(
                            user.bio || user.studentCode,
                            'Người dùng StudyMate',
                          )}
                        </p>

                        <div
                          className="flex items-center gap-2 mt-0.5 text-[10px]"
                          style={{ color: 'var(--text3)' }}
                        >
                          <span>{(user.xp || 0).toLocaleString()} XP</span>
                          {(user.streak || 0) > 0 && <span>{user.streak}🔥</span>}
                        </div>
                      </div>
                    </div>

                    {(user.skills || []).length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {(user.skills || []).slice(0, 3).map(skill => (
                          <div
                            key={skill.subject}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg"
                            style={{
                              background:
                                (SKILL_COLORS[skill.subject] || '#6366f1') +
                                '15',
                              border: `0.5px solid ${
                                (SKILL_COLORS[skill.subject] || '#6366f1') +
                                '25'
                              }`,
                            }}
                          >
                            <span
                              className="text-[10px] font-medium"
                              style={{
                                color:
                                  SKILL_COLORS[skill.subject] || '#818cf8',
                              }}
                            >
                              {skill.subject}
                            </span>
                            <Stars level={skill.level} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => sendReq.mutate(user.id)}
                        disabled={isAdded || sendReq.isPending}
                        className={clsx(
                          'flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5',
                          isAdded
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                            : 'bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-60',
                        )}
                      >
                        {isAdded ? (
                          <>
                            <UserCheck size={13} />
                            Đã gửi
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} />
                            Kết bạn
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => navigate(`/inbox/${user.id}`)}
                        className="px-4 py-2 rounded-xl text-[12px] border transition-all"
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--text2)',
                        }}
                      >
                        <MessageCircle size={13} />
                      </button>

                      <button
                        onClick={() => navigate(`/u/${user.id}`)}
                        className="px-4 py-2 rounded-xl text-[12px] border transition-all"
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--text2)',
                        }}
                      >
                        Trang
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'pending' && (
        <div className="space-y-3 max-w-2xl">
          {loadPending ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (pending as PendingFriendship[]).length === 0 ? (
            <div
              className="text-center py-16 border rounded-xl"
              style={{
                background: 'var(--bg2)',
                borderColor: 'var(--border)',
              }}
            >
              <p className="text-3xl mb-3">✅</p>
              <p className="text-[14px]" style={{ color: 'var(--text2)' }}>
                Không có lời mời nào đang chờ
              </p>
            </div>
          ) : (
            <>
              <p className="text-[13px]" style={{ color: 'var(--text2)' }}>
                {(pending as PendingFriendship[]).length} lời mời đang chờ
              </p>

              {(pending as PendingFriendship[]).map(friendship => {
                const isIncoming = friendship.direction === 'INCOMING'
                const targetUser =
                  friendship.otherUser ||
                  (isIncoming ? friendship.requester : friendship.receiver)

                const targetUserId =
                  friendship.otherUserId ||
                  (isIncoming ? friendship.requesterId : friendship.receiverId)

                return (
                  <div
                    key={friendship.id}
                    className="border rounded-xl p-4 flex items-center gap-4"
                    style={{
                      background: 'var(--bg2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <UserAvatar name={targetUser?.fullName} avatar={targetUser?.avatar} size={48} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/u/${targetUserId}`)}
                          className="text-[14px] font-semibold hover:text-indigo-300 transition-colors block text-left truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {targetUser?.fullName || 'Người dùng'}
                        </button>

                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: isIncoming
                              ? 'rgba(99,102,241,.12)'
                              : 'rgba(245,158,11,.12)',
                            color: isIncoming ? '#6366f1' : '#f59e0b',
                          }}
                        >
                          {isIncoming ? 'Họ gửi cho bạn' : 'Bạn đã gửi'}
                        </span>
                      </div>

                      <p
                        className="text-[11px] truncate mt-0.5"
                        style={{ color: 'var(--text2)' }}
                      >
                        {isIncoming
                          ? 'Người này đang chờ bạn chấp nhận lời mời.'
                          : 'Đang chờ người này chấp nhận lời mời của bạn.'}
                      </p>

                      {(targetUser?.skills || []).length > 0 && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {(targetUser?.skills || []).slice(0, 3).map(skill => (
                            <span
                              key={skill.subject}
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background:
                                  (SKILL_COLORS[skill.subject] || '#6366f1') +
                                  '15',
                                color:
                                  SKILL_COLORS[skill.subject] || '#818cf8',
                              }}
                            >
                              {skill.subject}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {isIncoming ? (
                        <>
                          <button
                            onClick={() => acceptReq.mutate(friendship.requesterId)}
                            disabled={acceptReq.isPending}
                            className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-all disabled:opacity-60"
                          >
                            {acceptReq.isPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              'Chấp nhận'
                            )}
                          </button>

                          <button
                            onClick={() => rejectReq.mutate(friendship.requesterId)}
                            disabled={rejectReq.isPending}
                            className="px-4 py-2 rounded-xl text-[12px] border transition-all disabled:opacity-60"
                            style={{
                              borderColor: 'var(--border)',
                              color: 'var(--text2)',
                            }}
                          >
                            Từ chối
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => removeF.mutate(friendship.receiverId)}
                          disabled={removeF.isPending}
                          className="px-4 py-2 rounded-xl text-[12px] border transition-all disabled:opacity-60"
                          style={{
                            borderColor: 'var(--border)',
                            color: 'var(--text2)',
                          }}
                        >
                          Hủy lời mời
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {tab === 'friends' && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 h-9 px-3 rounded-lg border max-w-xs"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
            }}
          >
            <Search size={13} style={{ color: 'var(--text3)' }} />

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="flex-1 bg-transparent text-[12px] outline-none"
              style={{ color: 'var(--text)' }}
            />
          </div>

          {loadFriends ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filtFriends.length === 0 ? (
            <div
              className="text-center py-16 border rounded-xl"
              style={{
                background: 'var(--bg2)',
                borderColor: 'var(--border)',
              }}
            >
              <p className="text-3xl mb-3">👥</p>
              <p className="text-[14px]" style={{ color: 'var(--text2)' }}>
                {search ? 'Không tìm thấy' : 'Bạn chưa có bạn bè nào'}
              </p>

              {!search && (
                <button
                  onClick={() => setTab('suggest')}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[12px] font-medium transition-all"
                >
                  Tìm bạn học ngay
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filtFriends.map(user => {
                return (
                  <div
                    key={user.id}
                    className="border rounded-xl p-4 transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'var(--bg2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        type="button"
                        className="cursor-pointer"
                        onClick={() => navigate(`/u/${user.id}`)}
                      >
                        <UserAvatar name={user.fullName} avatar={user.avatar} size={44} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/u/${user.id}`)}
                          className="text-[13px] font-semibold truncate block text-left"
                          style={{ color: 'var(--text)' }}
                        >
                          {user.fullName}
                        </button>

                        <p
                          className="text-[10px] truncate"
                          style={{ color: 'var(--text3)' }}
                        >
                          {user.bio || user.studentCode || ''}
                        </p>
                      </div>
                    </div>

                    {(user.skills || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {(user.skills || []).slice(0, 2).map(skill => (
                          <span
                            key={skill.subject}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                (SKILL_COLORS[skill.subject] || '#6366f1') +
                                '15',
                              color: SKILL_COLORS[skill.subject] || '#818cf8',
                            }}
                          >
                            {skill.subject}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className="flex gap-1.5 text-[10px] mb-3"
                      style={{ color: 'var(--text3)' }}
                    >
                      <span>{(user.xp || 0).toLocaleString()} XP</span>
                      {(user.streak || 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>{user.streak}🔥</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/inbox/${user.id}`)}
                        className="flex-1 py-2 rounded-xl border text-[11px] transition-all flex items-center justify-center gap-1.5"
                        style={{
                          background: 'var(--bg3)',
                          borderColor: 'var(--border)',
                          color: 'var(--text2)',
                        }}
                      >
                        <MessageCircle size={12} />
                        Nhắn tin
                      </button>

                      <button
                        onClick={() => navigate(`/u/${user.id}`)}
                        className="flex-1 py-2 rounded-xl border text-[11px] transition-all flex items-center justify-center gap-1.5"
                        style={{
                          background: 'var(--bg3)',
                          borderColor: 'var(--border)',
                          color: 'var(--text2)',
                        }}
                      >
                        <TrendingUp size={12} />
                        Hồ sơ
                      </button>
                    </div>

                    <button
                      onClick={() => removeF.mutate(user.id)}
                      disabled={removeF.isPending}
                      className="w-full mt-2 py-1.5 rounded-xl text-[10px] transition-all disabled:opacity-60"
                      style={{ color: 'var(--text3)' }}
                    >
                      Hủy kết bạn
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}