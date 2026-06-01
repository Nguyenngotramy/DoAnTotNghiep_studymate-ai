import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Users, Trophy,
  MessageCircle, Heart, UserPlus, ArrowRight, Flame,
  Target, Globe, Loader2, Copy, Check, Lock, Zap, Star
} from 'lucide-react'
import { postApi, friendApi, groupApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
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
  'AI/ML': '#8b5cf6',
  'IELTS': '#f59e0b',
}

const TABS = [
  { id: 'trending', label: '🔥 Trending', icon: TrendingUp },
  { id: 'leaderboard', label: '🏆 Bảng xếp hạng', icon: Trophy },
  { id: 'groups', label: '👥 Nhóm công khai', icon: Users },
  { id: 'people', label: '👤 Gợi ý bạn học', icon: UserPlus },
]

function gid(id: any): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return String(id)
}

function ini(n: string) {
  return (n ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(-2)
    .toUpperCase()
}

function ago(d?: string) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}p`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)} ngày`
}

function getOverlapMatch(me: any, other: any) {
  const weak = (me?.weakSubjects ?? []).map((x: string) => x.toLowerCase())
  const strong = [
    ...(other?.strongSubjects ?? []),
    ...((other?.skills ?? []).filter((s: any) => s.level >= 2).map((s: any) => s.subject) ?? []),
  ].map((x: string) => x.toLowerCase())

  if (!weak.length || !strong.length) return 68
  const overlap = weak.filter((w: string) => strong.includes(w)).length
  if (overlap >= 2) return 92
  if (overlap === 1) return 82
  return 72
}

function getMainSkill(u: any) {
  if (u?.strongSubjects?.length) return u.strongSubjects[0]
  if (u?.skills?.length) {
    const sorted = [...u.skills].sort((a: any, b: any) => (b.level ?? 0) - (a.level ?? 0))
    return sorted[0]?.subject ?? 'Học tập'
  }
  return 'Học tập'
}

function getSkillLevel(u: any, subject: string) {
  const skill = (u?.skills ?? []).find((s: any) => s.subject === subject)
  return skill?.level ?? 2
}

async function fetchLeaderboard(token?: string) {
  const res = await fetch('/api/users/leaderboard', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Không tải được leaderboard')
  const json = await res.json()
  return json?.data ?? []
}

export default function DiscoverPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState('trending')
  const [posts, setPosts] = useState<any[]>([])
  const [publicGroups, setPublicGroups] = useState<any[]>([])
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [added, setAdded] = useState<Set<string>>(new Set())
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [joiningCode, setJoiningCode] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        const token = useAuthStore.getState().accessToken

        const [postRes, groupRes, peopleRes, boardRes, myGroupsRes] = await Promise.allSettled([
          postApi.trending(),
          groupApi.publicGroups(),
          friendApi.suggestions(),
          fetchLeaderboard(token ?? undefined),
          groupApi.list(),
        ])

        if (postRes.status === 'fulfilled') {
          setPosts(postRes.value.map((p: any) => ({ ...p, _id: gid(p._id ?? p.id) })))
        }

        if (groupRes.status === 'fulfilled') {
          setPublicGroups((groupRes.value ?? []).map((g: any) => ({
            ...g,
            id: gid(g.id ?? g._id),
            memberCount: g.memberCount ?? g.members?.length ?? 0,
          })))
        }

        if (myGroupsRes.status === 'fulfilled') {
          setMyGroups((myGroupsRes.value ?? []).map((g: any) => ({
            ...g,
            id: gid(g.id ?? g._id),
            memberCount: g.memberCount ?? g.members?.length ?? 0,
          })))
        }

        if (peopleRes.status === 'fulfilled') {
          setPeople(peopleRes.value ?? [])
        }

        if (boardRes.status === 'fulfilled') {
          setLeaderboard(
            (boardRes.value ?? []).map((u: any, index: number) => ({
              ...u,
              id: gid(u.id ?? u._id),
              rank: index + 1,
              mainSkill: getMainSkill(u),
            })),
          )
        } else if (user) {
          setLeaderboard([
            {
              ...user,
              id: user.id,
              rank: 1,
              mainSkill: getMainSkill(user),
            },
          ])
        }
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [user])

  const isAlreadyInGroup = (group: any) => {
    const code = group?.inviteCode
    if (!code) return false
    return myGroups.some((g: any) => g.inviteCode === code)
  }

  const handleAddFriend = async (target: any) => {
    try {
      await friendApi.send(target.id ?? target._id)
      setAdded(s => new Set(s).add(String(target.id ?? target._id)))
      toast.success(`Đã gửi lời mời kết bạn đến ${target.fullName}!`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không gửi được lời mời')
    }
  }

  const handleJoinGroup = async (code: string, groupName: string) => {
    setJoiningCode(code)
    try {
      const joinedGroup = await groupApi.join(code)

      setJoined(s => {
        const n = new Set(s)
        n.add(code)
        return n
      })

      setMyGroups(prev => {
        const exists = prev.some((g: any) => g.inviteCode === code)
        if (exists) return prev
        return [
          ...prev,
          {
            ...joinedGroup,
            id: gid(joinedGroup.id ?? joinedGroup._id),
            memberCount: joinedGroup.memberCount ?? joinedGroup.members?.length ?? 0,
          },
        ]
      })

      toast.success(`Đã tham gia nhóm ${groupName}!`)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? ''

      if (msg.includes('đã là thành viên')) {
        setJoined(s => {
          const n = new Set(s)
          n.add(code)
          return n
        })

        try {
          const latestMyGroups = await groupApi.list()
          setMyGroups((latestMyGroups ?? []).map((g: any) => ({
            ...g,
            id: gid(g.id ?? g._id),
            memberCount: g.memberCount ?? g.members?.length ?? 0,
          })))
        } catch {}

        toast('Bạn đã là thành viên nhóm này!')
      } else {
        toast.error(msg || 'Không thể tham gia nhóm')
      }
    } finally {
      setJoiningCode(null)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success('Đã sao chép mã nhóm')
      setTimeout(() => setCopiedCode(null), 1200)
    } catch {
      toast.error('Không sao chép được mã nhóm')
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!postId) return
    const currentlyLiked = likedPosts.has(postId)

    try {
      await postApi.like(postId)

      setLikedPosts(s => {
        const n = new Set(s)
        if (currentlyLiked) n.delete(postId)
        else n.add(postId)
        return n
      })

      setPosts(prev =>
        prev.map(p =>
          p._id === postId
            ? {
                ...p,
                likedBy: currentlyLiked
                  ? (p.likedBy ?? []).filter((x: string) => x !== user?.id)
                  : [...(p.likedBy ?? []), user?.id],
              }
            : p,
        ),
      )
    } catch {
      toast.error('Lỗi')
    }
  }

  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const likesA = Array.isArray(a.likedBy) ? a.likedBy.length : (a.likesCount ?? 0)
      const likesB = Array.isArray(b.likedBy) ? b.likedBy.length : (b.likesCount ?? 0)
      if (likesB !== likesA) return likesB - likesA

      const commentsA = Array.isArray(a.comments) ? a.comments.length : (a.commentsCount ?? 0)
      const commentsB = Array.isArray(b.comments) ? b.comments.length : (b.commentsCount ?? 0)
      if (commentsB !== commentsA) return commentsB - commentsA

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [posts])

  const newestPosts = useMemo(() => {
    return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [posts])

  const myRank = useMemo(() => {
    if (!user?.id) return null
    return leaderboard.find((x: any) => String(x.id) === String(user.id)) ?? null
  }, [leaderboard, user?.id])

  const nextRank = useMemo(() => {
    if (!myRank) return null
    return leaderboard.find((x: any) => x.rank === myRank.rank - 1) ?? null
  }, [leaderboard, myRank])

  const heroStats = [
    { label: `${posts.length} bài viết`, icon: '📝', color: '#6366f1' },
    { label: `${publicGroups.length} nhóm công khai`, icon: '👥', color: '#14b8a6' },
    { label: `${people.length} bạn học gợi ý`, icon: '👤', color: '#f59e0b' },
    { label: `Top streak ${leaderboard[0]?.streak ?? 0} ngày`, icon: '🔥', color: '#f97316' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: 'linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.10),rgba(20,184,166,.06))',
          border: '0.5px solid rgba(99,102,241,.22)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(99,102,241,.15) 0%, transparent 60%)' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={16} className="text-indigo-400" />
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Cộng đồng học tập
            </span>
          </div>

          <h1 className="text-[22px] font-bold mb-1" style={{ color: 'var(--text)' }}>
            Khám phá StudyMate
          </h1>

          <p className="text-[13px] mb-4" style={{ color: 'var(--text2)' }}>
            Tìm bạn học phù hợp · Tham gia nhóm · Đọc bài hay · Leo bảng xếp hạng
          </p>

          <div className="flex gap-3 flex-wrap">
            {heroStats.map(s => (
              <div
                key={s.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{
                  background: s.color + '15',
                  border: `0.5px solid ${s.color}30`,
                  color: s.color,
                }}
              >
                {s.icon} {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap flex-shrink-0',
              tab === t.id ? '' : 'hover:text-[var(--text)]',
            )}
            style={
              tab === t.id
                ? { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }
                : { color: 'var(--text3)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'trending' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                🔥 Bài viết nổi bật nhất tuần
              </h2>
              <button
                onClick={() => navigate('/blog')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Xem tất cả <ArrowRight size={12} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
              </div>
            ) : (
              topPosts.slice(0, 5).map((p, i) => {
                const pid = p._id
                const likes = Array.isArray(p.likedBy) ? p.likedBy.length : (p.likesCount ?? 0)
                const cmts = Array.isArray(p.comments) ? p.comments.length : (p.commentsCount ?? 0)
                const color = COLORS[(p.authorName?.charCodeAt(0) ?? 0) % COLORS.length]

                return (
                  <div
                    key={pid || i}
                    className="border rounded-xl p-4 transition-all cursor-pointer group"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                    onClick={() => navigate(`/blog/${pid}`)}
                  >
                    <div className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[14px] flex-shrink-0"
                        style={{
                          background:
                            i === 0 ? 'rgba(245,158,11,.2)' :
                            i === 1 ? 'rgba(192,192,192,.15)' :
                            'rgba(255,255,255,.06)',
                          color: i === 0 ? '#f59e0b' : i === 1 ? '#b0b0b0' : 'var(--text3)',
                        }}
                      >
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex gap-1.5 mb-1.5 flex-wrap">
                          {p.tags?.slice(0, 2).map((t: string, ti: number) => (
                            <span
                              key={`${pid}-t-${ti}`}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{
                                background: (SKILL_COLORS[t] ?? '#6366f1') + '18',
                                color: SKILL_COLORS[t] ?? '#818cf8',
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        <h3
                          className="text-[13px] font-semibold leading-snug mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2"
                          style={{ color: 'var(--text)' }}
                        >
                          {p.title}
                        </h3>

                        <p className="text-[11px] line-clamp-1" style={{ color: 'var(--text2)' }}>
                          {p.content?.replace(/[#*`]/g, '').slice(0, 100)}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ background: color }}
                            >
                              {ini(p.authorName ?? 'U')}
                            </div>
                            <span className="text-[11px]" style={{ color: 'var(--text2)' }}>
                              {p.authorName}
                            </span>
                          </div>

                          <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                            {p.createdAt ? ago(p.createdAt) : ''}
                          </span>

                          <div className="ml-auto flex items-center gap-3">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleLikePost(pid)
                              }}
                              className={clsx(
                                'flex items-center gap-1 text-[11px] transition-colors',
                                likedPosts.has(pid) ? 'text-red-400' : 'hover:text-red-400',
                              )}
                              style={!likedPosts.has(pid) ? { color: 'var(--text3)' } : {}}
                            >
                              <Heart size={12} fill={likedPosts.has(pid) ? 'currentColor' : 'none'} /> {likes}
                            </button>

                            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text3)' }}>
                              <MessageCircle size={12} /> {cmts}
                            </span>
                            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text3)' }}>
                              <Zap size={12} /> {p.views ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            <div className="mt-6">
              <h2 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
                🆕 Mới nhất
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {newestPosts.slice(0, 4).map((p, i) => {
                  const color = COLORS[(p.authorName?.charCodeAt(0) ?? 0) % COLORS.length]
                  const likes = Array.isArray(p.likedBy) ? p.likedBy.length : (p.likesCount ?? 0)

                  return (
                    <div
                      key={p._id || `n${i}`}
                      onClick={() => navigate(`/blog/${p._id}`)}
                      className="border rounded-xl p-3.5 cursor-pointer transition-all hover:-translate-y-0.5"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex gap-1.5 mb-2 flex-wrap">
                        {p.tags?.slice(0, 1).map((t: string, ti: number) => (
                          <span
                            key={`${p._id}-nt-${ti}`}
                            className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: (SKILL_COLORS[t] ?? '#6366f1') + '18',
                              color: SKILL_COLORS[t] ?? '#818cf8',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <p className="text-[12px] font-semibold leading-snug line-clamp-2 mb-2" style={{ color: 'var(--text)' }}>
                        {p.title}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                          style={{ background: color }}
                        >
                          {ini(p.authorName ?? 'U')}
                        </div>
                        <span className="text-[10px] truncate" style={{ color: 'var(--text3)' }}>
                          {p.authorName}
                        </span>
                        <span className="text-[10px] text-red-400 ml-auto">{likes}❤</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-xl p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  🏆 Top tuần này
                </p>
                <button onClick={() => setTab('leaderboard')} className="text-[10px] text-indigo-400">
                  Xem thêm →
                </button>
              </div>

              {leaderboard.slice(0, 3).map((u: any, i: number) => (
                <div
                  key={u.id ?? u.fullName ?? i}
                  className="flex items-center gap-2.5 py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-[14px]">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: COLORS[(u.fullName?.charCodeAt(0) ?? 0) % COLORS.length] }}
                  >
                    {ini(u.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {u.fullName}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                      {u.mainSkill || 'Học tập'} · {u.streak ?? 0}🔥
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-400">
                    {(u.xp ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border rounded-xl p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  👥 Nhóm công khai
                </p>
                <button onClick={() => setTab('groups')} className="text-[10px] text-indigo-400">
                  Xem thêm →
                </button>
              </div>

              {publicGroups.slice(0, 3).map((g: any) => {
                const alreadyJoined = joined.has(g.inviteCode) || isAlreadyInGroup(g)

                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-2.5 py-2 border-b last:border-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: (g.coverColor ?? '#6366f1') + '20' }}
                    >
                      <Users size={12} style={{ color: g.coverColor ?? '#6366f1' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>
                        {g.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        {g.memberCount ?? 0} thành viên
                      </p>
                    </div>

                    <button
                      onClick={() => !alreadyJoined && handleJoinGroup(g.inviteCode, g.name)}
                      disabled={alreadyJoined || joiningCode === g.inviteCode}
                      className="text-[10px] px-2.5 py-1 rounded-lg flex-shrink-0 transition-all"
                      style={{
                        background: alreadyJoined ? 'rgba(34,197,94,.1)' : 'rgba(99,102,241,.15)',
                        color: alreadyJoined ? '#22c55e' : '#818cf8',
                        border: `0.5px solid ${alreadyJoined ? 'rgba(34,197,94,.2)' : 'rgba(99,102,241,.2)'}`,
                      }}
                    >
                      {alreadyJoined ? '✓ Đã vào' : joiningCode === g.inviteCode ? '...' : '+ Vào'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              🏆 Bảng xếp hạng tuần này
            </h2>

            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-6 h-32">
                {[leaderboard[1], leaderboard[0], leaderboard[2]].map((u: any, i: number) => {
                  const heights = ['h-24', 'h-32', 'h-20']
                  const medals = ['🥈', '🥇', '🥉']
                  const colors = ['rgba(192,192,192,.15)', 'rgba(245,158,11,.2)', 'rgba(205,127,50,.15)']

                  return (
                    <div
                      key={u.id ?? u.fullName}
                      className={clsx(
                        'flex flex-col items-center justify-end rounded-xl px-4 pb-3 relative transition-all hover:-translate-y-1',
                        heights[i],
                      )}
                      style={{ background: colors[i], border: `0.5px solid ${(SKILL_COLORS[u.mainSkill] ?? '#6366f1')}30`, minWidth: 100 }}
                    >
                      <div className="text-[20px] absolute -top-4">{medals[i]}</div>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white mb-1.5"
                        style={{ background: COLORS[(u.fullName?.charCodeAt(0) ?? 0) % COLORS.length] }}
                      >
                        {ini(u.fullName)}
                      </div>
                      <p className="text-[10px] font-semibold text-center leading-tight" style={{ color: 'var(--text)' }}>
                        {u.fullName?.split(' ').pop()}
                      </p>
                      <p className="text-[9px]" style={{ color: 'var(--text3)' }}>
                        {(u.xp ?? 0).toLocaleString()} XP
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-2">
              {leaderboard.map((u: any, i: number) => {
                const skill = u.mainSkill || 'Học tập'
                const skillColor = SKILL_COLORS[skill] ?? '#818cf8'

                return (
                  <div
                    key={u.id ?? u.fullName ?? i}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      background: i === 0 ? 'rgba(245,158,11,.05)' : 'var(--bg2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <span className="text-[14px] w-7 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>

                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: COLORS[(u.fullName?.charCodeAt(0) ?? 0) % COLORS.length] }}
                    >
                      {ini(u.fullName)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                          {u.fullName}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: skillColor + '18', color: skillColor }}
                        >
                          {skill}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text3)' }}>
                          <Flame size={11} className="text-orange-400" /> {u.streak ?? 0} ngày streak
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[16px] font-bold font-mono text-indigo-400">
                        {(u.xp ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        XP
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-xl p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
                📊 XP của bạn
              </p>

              <div className="text-center py-4">
                <div className="text-[32px] font-bold text-indigo-400 font-mono">
                  {(user?.xp ?? 0).toLocaleString()}
                </div>
                <div className="text-[12px] mb-4" style={{ color: 'var(--text3)' }}>
                  {myRank ? `Hạng #${myRank.rank}` : 'Chưa có thứ hạng'}
                </div>

                {myRank && nextRank ? (
                  <>
                    <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg4)' }}>
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{
                          width: `${Math.min(100, ((user?.xp ?? 0) / (nextRank.xp || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text2)' }}>
                      {Math.max(0, (nextRank.xp ?? 0) - (user?.xp ?? 0)).toLocaleString()} XP nữa để vượt hạng trên
                    </div>
                  </>
                ) : (
                  <div className="text-[11px]" style={{ color: 'var(--text2)' }}>
                    Tiếp tục hoạt động để tăng XP
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-xl p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
                ⚡ Cách kiếm XP
              </p>
              <div className="space-y-2 text-[11px]" style={{ color: 'var(--text2)' }}>
                {[
                  { xp: '+50', act: 'Viết bài blog' },
                  { xp: '+20', act: 'Bình luận' },
                  { xp: '+10', act: 'Đăng nhập hàng ngày' },
                  { xp: '+30', act: 'Hoàn thành task' },
                ].map(x => (
                  <div key={x.act} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-indigo-400 w-12 flex-shrink-0">{x.xp}</span>
                    <span>{x.act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'groups' && (
        <div>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            👥 Nhóm học công khai — Có hiện mã để tham gia
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {publicGroups.map((g: any) => {
              const alreadyJoined = joined.has(g.inviteCode) || isAlreadyInGroup(g)

              return (
                <div
                  key={g.id}
                  className="border rounded-xl p-5 transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: (g.coverColor ?? '#6366f1') + '20',
                        border: `0.5px solid ${(g.coverColor ?? '#6366f1')}30`,
                      }}
                    >
                      <Users size={18} style={{ color: g.coverColor ?? '#6366f1' }} />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                        {g.name}
                      </h3>
                      <p className="text-[11px]" style={{ color: (g.coverColor ?? '#6366f1') + 'cc' }}>
                        {g.subject}
                      </p>
                    </div>

                    <span
                      className="text-[10px] px-2 py-1 rounded-lg font-medium"
                      style={{
                        background: 'rgba(34,197,94,.1)',
                        color: '#22c55e',
                        border: '0.5px solid rgba(34,197,94,.2)',
                      }}
                    >
                      <Globe size={10} className="inline mr-1" />
                      Công khai
                    </span>
                  </div>

                  <p className="text-[12px] mb-4 leading-relaxed" style={{ color: 'var(--text2)' }}>
                    {g.description}
                  </p>

                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text3)' }}>
                      <Users size={12} /> {g.memberCount ?? 0} thành viên
                    </div>

                    <button
                      onClick={() => handleCopyCode(g.inviteCode)}
                      className="flex items-center gap-1.5 text-[11px]"
                      style={{ color: 'var(--text2)' }}
                    >
                      <Target size={12} />
                      Mã:
                      <code className="font-mono text-indigo-400">{g.inviteCode}</code>
                      {copiedCode === g.inviteCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>

                  <button
                    onClick={() => !alreadyJoined && handleJoinGroup(g.inviteCode, g.name)}
                    disabled={alreadyJoined || joiningCode === g.inviteCode}
                    className={clsx(
                      'w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-2',
                      alreadyJoined
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                        : 'text-white hover:opacity-90',
                    )}
                    style={!alreadyJoined ? { background: g.coverColor ?? '#6366f1' } : {}}
                  >
                    {joiningCode === g.inviteCode ? <Loader2 size={14} className="animate-spin" /> : null}
                    {alreadyJoined ? '✓ Đã tham gia' : '+ Tham gia nhóm'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
              👤 Gợi ý bạn học thông minh
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
              Dựa trên môn yếu và kỹ năng nổi bật
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {people.map((u: any) => {
              const skill = getMainSkill(u)
              const skillColor = SKILL_COLORS[skill] ?? '#818cf8'
              const match = getOverlapMatch(user, u)
              const level = getSkillLevel(u, skill)
              const id = gid(u.id ?? u._id)

              return (
                <div
                  key={id}
                  className="border rounded-xl p-5 transition-all"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                        style={{ background: COLORS[(u.fullName?.charCodeAt(0) ?? 0) % COLORS.length] }}
                      >
                        {ini(u.fullName)}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                          {u.fullName}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text2)' }}>
                          {u.school || u.bio || 'Thành viên StudyMate'}
                        </p>
                      </div>
                    </div>

                    <div
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0"
                      style={{
                        background: 'rgba(34,197,94,.15)',
                        color: '#22c55e',
                        border: '0.5px solid rgba(34,197,94,.25)',
                      }}
                    >
                      {match}% match
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 p-2.5 rounded-xl mb-3"
                    style={{
                      background: skillColor + '10',
                      border: `0.5px solid ${skillColor}20`,
                    }}
                  >
                    <Star size={13} style={{ color: skillColor }} />
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold" style={{ color: skillColor }}>
                        {skill} {'⭐'.repeat(Math.max(1, Math.min(3, level)))}
                      </span>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                        {(u.strongSubjects ?? []).length > 0
                          ? `Mạnh về ${u.strongSubjects.join(', ')}`
                          : 'Có thể phù hợp với nhu cầu học của bạn'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text3)' }}>
                      <span>Độ phù hợp với bạn</span>
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{match}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-green-500 transition-all duration-700"
                        style={{ width: `${match}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddFriend(u)}
                      className={clsx(
                        'flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all',
                        added.has(id)
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-indigo-500 hover:bg-indigo-400 text-white',
                      )}
                    >
                      {added.has(id) ? '✓ Đã gửi lời mời' : '+ Kết bạn'}
                    </button>

                    <button
                      onClick={() => navigate(`/u/${id}`)}
                      className="px-4 py-2 rounded-xl text-[12px] border hover:bg-white/[.04] transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                    >
                      Xem
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="mt-4 p-4 rounded-xl"
            style={{
              background: 'rgba(99,102,241,.06)',
              border: '0.5px solid rgba(99,102,241,.2)',
            }}
          >
            <p className="text-[12px] font-semibold text-indigo-300 mb-1">💡 Gợi ý UX/UI</p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text2)' }}>
              Mình thấy phần UX/UI nên tiếp tục tối giản hơn ở các card bên phải, giảm mock data, và ưu tiên dữ liệu thật
              như XP, nhóm công khai, top bài. Bản này đã đi theo hướng đó.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}