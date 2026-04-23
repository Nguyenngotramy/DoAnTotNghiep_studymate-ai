import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PenSquare,
  Bookmark,
  Heart,
  MessageCircle,
  Loader2,
  Send,
  X,
  MoreHorizontal,
  Trash2,
  EyeOff,
  ChevronDown,
  PlayCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { postApi, userApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const DEFAULT_TAGS = ['Tất cả', 'Toán', 'Tiếng Anh', 'Lập trình', 'Vật lý', 'Hóa học', 'IELTS', 'Sinh học', 'Tổng hợp']
const BACKEND_URL = 'http://localhost:8080/api'

const COLORS: Record<string, string> = {
  'Nguyễn Văn A': '#6366f1',
  'Trần Thị Hoa': '#14b8a6',
  'Lê Minh Tuấn': '#f59e0b',
  'Phạm Thu Hằng': '#ec4899',
  'Bảo Long': '#3b82f6',
  'Hoàng Văn Khoa': '#22c55e',
  'Trần Bích Trâm': '#8b5cf6',
}

function toMediaUrl(url?: string) {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url
  }
  if (url.startsWith('/')) {
    return `${BACKEND_URL}${url}`
  }
  return `${BACKEND_URL}/uploads/${url}`
}

function gid(id: any): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return String(id)
}

function ini(n: string): string {
  if (!n) return 'U'
  return n.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()
}

function ago(d?: string): string {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ`
  return `${Math.floor(s / 86400)} ngày`
}

function normalizePost(p: any) {
  return {
    ...p,
    _id: gid(p._id ?? p.id),
    id: gid(p.id ?? p._id),
    authorId: gid(p.authorId),
  }
}

function extractVideoEmbed(url?: string) {
  if (!url) return null

  try {
    const u = new URL(url)

    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }

    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (u.hostname.includes('drive.google.com')) {
      const match = url.match(/\/d\/([^/]+)/)
      if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`
    }

    return null
  } catch {
    return null
  }
}

function getAuthorAvatar(post: any, currentUser: any) {
  if (post?.authorAvatar) return toMediaUrl(post.authorAvatar)
  if (String(post?.authorId) === String(currentUser?.id) && currentUser?.avatar) {
    return toMediaUrl(currentUser.avatar)
  }
  return ''
}

function CommentModal({
  post,
  onClose,
  onDone,
}: {
  post: any
  onClose: () => void
  onDone: () => void
}) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!input.trim() || !post._id) return
    setLoading(true)
    try {
      await postApi.addComment(post._id, input.trim())
      toast.success('Đã bình luận')
      setInput('')
      onDone()
    } catch {
      toast.error('Lỗi khi bình luận')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
            Bình luận · {post.comments?.length ?? 0}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text3)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-3">
          {(!post.comments || post.comments.length === 0) && (
            <p className="text-[12px] text-center py-8" style={{ color: 'var(--text3)' }}>
              Chưa có bình luận nào
            </p>
          )}

          {post.comments?.map((c: any, i: number) => (
            <div key={c.id ?? `cmt-${i}`} className="flex gap-3">
              <button
                onClick={() => c.authorId && navigate(`/u/${c.authorId}`)}
                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg3)]"
              >
                {c.authorAvatar ? (
                  <img
                    src={toMediaUrl(c.authorAvatar)}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{ background: COLORS[c.authorName] ?? '#6366f1' }}
                  >
                    {ini(c.authorName ?? 'U')}
                  </div>
                )}
              </button>

              <div className="flex-1 rounded-2xl px-3 py-2" style={{ background: 'var(--bg3)' }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <button
                    onClick={() => c.authorId && navigate(`/u/${c.authorId}`)}
                    className="text-[11px] font-semibold hover:text-indigo-400 transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    {c.authorName}
                  </button>
                  <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                    {c.createdAt ? ago(c.createdAt) : ''}
                  </span>
                </div>
                <p className="text-[12px]" style={{ color: 'var(--text2)' }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t flex gap-2.5 items-center" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg3)]">
            {user?.avatar ? (
              <img src={toMediaUrl(user.avatar)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ background: COLORS[user?.fullName ?? ''] ?? '#6366f1' }}
              >
                {user ? ini(user.fullName) : 'U'}
              </div>
            )}
          </div>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="Viết bình luận..."
            className="flex-1 h-10 px-3 rounded-xl border text-[12px] outline-none"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />

          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function PostMenu({
  mine,
  onDelete,
  onHide,
}: {
  mine: boolean
  onDelete?: () => void
  onHide: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[.05] transition-colors"
        style={{ color: 'var(--text3)' }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-44 rounded-xl border shadow-xl z-20 overflow-hidden"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => {
              setOpen(false)
              onHide()
            }}
            className="w-full px-3 py-2.5 text-left text-[12px] flex items-center gap-2 hover:bg-white/[.04]"
            style={{ color: 'var(--text2)' }}
          >
            <EyeOff size={13} />
            Ẩn bài viết
          </button>

          {mine && (
            <button
              onClick={() => {
                setOpen(false)
                onDelete?.()
              }}
              className="w-full px-3 py-2.5 text-left text-[12px] flex items-center gap-2 hover:bg-red-500/10 text-red-400"
            >
              <Trash2 size={13} />
              Xóa bài viết
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PostCard({
  post,
  onLike,
  onSave,
  onComment,
  onDelete,
  onHide,
}: {
  post: any
  onLike: (id: string) => void
  onSave: (id: string) => void
  onComment: (p: any) => void
  onDelete: (id: string) => void
  onHide: (id: string) => void
}) {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const postId = post._id
  const mine = String(post.authorId) === String(user?.id)
  const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(user?.id)
  const isSaved = Array.isArray(post.savedBy) && post.savedBy.includes(user?.id)
  const color = COLORS[post.authorName] ?? '#6366f1'
  const likes = Array.isArray(post.likedBy) ? post.likedBy.length : (post.likesCount ?? 0)
  const cmts = Array.isArray(post.comments) ? post.comments.length : (post.commentsCount ?? 0)
  const imageUrls: string[] = post.imageUrls ?? []
  const embedVideo = extractVideoEmbed(post.videoUrl)
  const authorAvatar = getAuthorAvatar(post, user)

  return (
    <div
      className="border rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/u/${post.authorId}`)}
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-[var(--bg3)]"
          >
            {authorAvatar ? (
              <img src={authorAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ background: color }}
              >
                {ini(post.authorName ?? 'U')}
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/u/${post.authorId}`)}
              className="text-[13px] font-semibold hover:text-indigo-400 transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {post.authorName}
            </button>

            <div className="text-[10px] flex items-center gap-2 mt-0.5" style={{ color: 'var(--text3)' }}>
              <span>{post.createdAt ? ago(post.createdAt) : ''}</span>
              <span>•</span>
              <span>{post.views ?? 0} lượt xem</span>
            </div>
          </div>

          <PostMenu
            mine={mine}
            onDelete={() => postId && onDelete(postId)}
            onHide={() => postId && onHide(postId)}
          />
        </div>

        {post.tags?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {post.tags.slice(0, 3).map((t: string, ti: number) => (
              <span
                key={`${postId}-tag-${ti}`}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <h3
          className="text-[15px] font-semibold leading-snug mt-3 cursor-pointer hover:text-indigo-300 transition-colors"
          style={{ color: 'var(--text)' }}
          onClick={() => navigate(`/blog/${postId}`)}
        >
          {post.title}
        </h3>

        <p className="text-[13px] leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
          {post.content}
        </p>

        {post.summary && (
          <div
            className="mt-3 p-3 rounded-xl"
            style={{
              background: 'rgba(245,158,11,.07)',
              border: '0.5px solid rgba(245,158,11,.2)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1 text-amber-400 text-[11px] font-semibold">
              <Sparkles size={12} />
              AI tóm tắt
            </div>
            <p className="text-[12px]" style={{ color: 'var(--text)' }}>
              {post.summary}
            </p>
          </div>
        )}
      </div>

      {imageUrls.length > 0 && (
        <div className={clsx('grid gap-[2px] bg-[var(--border)]', imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {imageUrls.slice(0, 4).map((img, i) => (
            <div key={i} className={clsx('overflow-hidden bg-[var(--bg3)]', imageUrls.length === 1 ? 'h-96' : 'h-52')}>
              <img src={toMediaUrl(img)} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {post.coverImage && imageUrls.length === 0 && (
        <div className="overflow-hidden bg-[var(--bg3)] h-80">
          <img src={toMediaUrl(post.coverImage)} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {!imageUrls.length && !post.coverImage && embedVideo && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <iframe
              src={embedVideo}
              className="w-full h-72"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="video"
            />
          </div>
        </div>
      )}

      {!imageUrls.length && !post.coverImage && !embedVideo && post.videoUrl && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {post.videoUrl.match(/\.(mp4|webm|ogg)$/i) || post.videoUrl.startsWith('/uploads/') ? (
              <video controls className="w-full h-72 bg-black">
                <source src={toMediaUrl(post.videoUrl)} />
              </video>
            ) : (
              <a
                href={toMediaUrl(post.videoUrl)}
                target="_blank"
                rel="noreferrer"
                className="h-28 flex items-center justify-center gap-2 text-indigo-400"
                style={{ background: 'var(--bg3)' }}
              >
                <PlayCircle size={18} />
                Xem video
              </a>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between text-[11px] mb-2" style={{ color: 'var(--text3)' }}>
          <span>{likes} lượt thích</span>
          <span>{cmts} bình luận</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => postId && onLike(postId)}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-all',
              isLiked ? 'bg-red-500/10 text-red-400' : 'hover:bg-white/[.04]',
            )}
            style={!isLiked ? { color: 'var(--text2)' } : {}}
          >
            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
            Thích
          </button>

          <button
            onClick={() => onComment(post)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium hover:bg-white/[.04] transition-all"
            style={{ color: 'var(--text2)' }}
          >
            <MessageCircle size={14} />
            Bình luận
          </button>

          <button
            onClick={() => postId && onSave(postId)}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-all',
              isSaved ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-white/[.04]',
            )}
            style={!isSaved ? { color: 'var(--text2)' } : {}}
          >
            <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
            {isSaved ? 'Đã lưu' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TrendingSidebar({
  items,
  onOpenPost,
}: {
  items: any[]
  onOpenPost: (id: string) => void
}) {
  if (!items.length) return null

  return (
    <div
      className="border rounded-2xl p-4 sticky top-4"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={15} className="text-indigo-400" />
        <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          Đang thịnh hành
        </p>
      </div>

      <div className="space-y-1">
        {items.slice(0, 5).map((item, index) => (
          <button
            key={item._id ?? index}
            onClick={() => onOpenPost(item._id)}
            className="w-full text-left px-2 py-2 rounded-xl hover:bg-white/[.04] transition-colors"
          >
            <div className="flex items-start gap-3">
              <span
                className="text-[12px] font-semibold w-4 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--text3)' }}
              >
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] font-medium line-clamp-2 leading-5"
                  style={{ color: 'var(--text)' }}
                >
                  {item.title}
                </p>

                <div
                  className="mt-1 flex items-center justify-between text-[10px]"
                  style={{ color: 'var(--text3)' }}
                >
                  <span>{item.authorName}</span>
                  <span>{item.likesCount ?? item.likedBy?.length ?? 0} thích</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BlogPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [posts, setPosts] = useState<any[]>([])
  const [trending, setTrending] = useState<any[]>([])
  const [activeTag, setActiveTag] = useState('Tất cả')
  const [dynamicTags, setDynamicTags] = useState<string[]>(DEFAULT_TAGS)
  const [activeTab, setActiveTab] = useState<'feed' | 'latest' | 'saved'>('feed')
  const [loading, setLoading] = useState(true)
  const [commentPost, setCommentPost] = useState<any>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadMore, setLoadMore] = useState(false)
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([])
  const interestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTagSelect = (tag: string) => {
    setActiveTag(tag)
    if (tag !== 'Tất cả' && user) {
      if (interestTimerRef.current) clearTimeout(interestTimerRef.current)
      interestTimerRef.current = setTimeout(() => {
        userApi.updateInterests([tag]).catch(() => {})
      }, 800)
    }
  }

  const load = async (p = 0, tag = activeTag, reset = true) => {
    if (p === 0) setLoading(true)
    else setLoadMore(true)

    try {
      let items: any[] = []
      let totalPages = 1

      if (activeTab === 'saved') {
        const res = await postApi.saved(p)
        items = (res.content ?? []).map(normalizePost)
        totalPages = res.totalPages ?? 1
      } else if (activeTab === 'latest') {
        const res = await postApi.list(p, tag === 'Tất cả' ? undefined : tag)
        items = (res.content ?? []).map(normalizePost)
        totalPages = res.totalPages ?? 1
      } else {
        const res = user
          ? await postApi.feed(p, tag === 'Tất cả' ? undefined : tag)
          : await postApi.list(p, tag === 'Tất cả' ? undefined : tag)

        items = (res.content ?? []).map(normalizePost)
        totalPages = res.totalPages ?? 1
      }

      setPosts(prev => (reset ? items : [...prev, ...items]))
      setHasMore(p + 1 < totalPages)
      setPage(p)
    } catch (e) {
      console.error('Load posts error:', e)
    } finally {
      setLoading(false)
      setLoadMore(false)
    }
  }

  useEffect(() => {
    postApi.hidden()
      .then(ids => setHiddenPostIds(ids ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load(0, activeTag, true)
    postApi.trending().then(data => setTrending(data.map(normalizePost))).catch(() => {})
    postApi.trendingTags().then(data => {
      if (data && data.length > 0) {
        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
        const names = data.slice(0, 12).map((t: any) => cap(t.tag))
        setDynamicTags(['Tất cả', ...Array.from(new Set(names)) as string[]])
      }
    }).catch(() => {})
  }, [activeTag, activeTab])

  const visiblePosts = useMemo(() => {
    return posts.filter(p => !hiddenPostIds.includes(p._id))
  }, [posts, hiddenPostIds])

  const handleLike = async (id: string) => {
    if (!id) return
    try {
      await postApi.like(id)

      setPosts(prev =>
        prev.map(p => {
          if (p._id !== id) return p
          const liked = Array.isArray(p.likedBy) && p.likedBy.includes(user?.id)
          return {
            ...p,
            likedBy: liked ? p.likedBy.filter((x: string) => x !== user?.id) : [...(p.likedBy ?? []), user?.id],
          }
        }),
      )

      const latestTrending = await postApi.trending()
      setTrending(latestTrending.map(normalizePost))
    } catch {
      toast.error('Lỗi khi thích bài viết')
    }
  }

  const handleSave = async (id: string) => {
    if (!id) return
    try {
      await postApi.save(id)
      setPosts(prev =>
        prev.map(p => {
          if (p._id !== id) return p
          const saved = Array.isArray(p.savedBy) && p.savedBy.includes(user?.id)
          return {
            ...p,
            savedBy: saved ? p.savedBy.filter((x: string) => x !== user?.id) : [...(p.savedBy ?? []), user?.id],
          }
        }),
      )
      toast.success('Đã cập nhật lưu bài')
    } catch {
      toast.error('Lỗi khi lưu bài')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này không?')) return
    try {
      await postApi.delete(id)
      setPosts(prev => prev.filter(p => p._id !== id))
      setTrending(prev => prev.filter(p => p._id !== id))
      toast.success('Đã xóa bài viết')
    } catch {
      toast.error('Không thể xóa bài viết')
    }
  }

  const handleHide = async (id: string) => {
    try {
      await postApi.hide(id)
      setHiddenPostIds(prev => [...prev, id])
      toast.success('Đã ẩn bài viết')
    } catch {
      toast.error('Không thể ẩn bài viết')
    }
  }

  const refreshPost = async (id: string) => {
    if (!id) return
    try {
      const updated = await postApi.get(id)
      const norm = normalizePost(updated)
      setPosts(prev => prev.map(p => (p._id === id ? norm : p)))
      setTrending(prev => prev.map(p => (p._id === id ? norm : p)))
      setCommentPost((prev: any) => (prev?._id === id ? norm : prev))
    } catch {}
  }

  return (
    <div className="max-w-7xl mx-auto">
      {commentPost?._id && (
        <CommentModal
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onDone={() => refreshPost(commentPost._id)}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Bài viết học tập
              </h1>
            </div>

            <div
              className="border rounded-2xl p-4"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg3)]">
                  {user?.avatar ? (
                    <img src={toMediaUrl(user.avatar)} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[11px] font-semibold text-white"
                      style={{ background: COLORS[user?.fullName ?? ''] ?? '#6366f1' }}
                    >
                      {user ? ini(user.fullName) : 'U'}
                    </div>
                  )}
                </div>

                <Link
                  to="/blog/create"
                  className="flex-1 h-11 px-4 rounded-full flex items-center text-[13px] hover:bg-white/[.04] transition-colors"
                  style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
                >
                  Bạn đang muốn chia sẻ điều gì?
                </Link>

                <Link
                  to="/blog/create"
                  className="w-11 h-11 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition-colors"
                >
                  <PenSquare size={18} />
                </Link>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {([
                ['feed', 'Dành cho bạn'],
                ['latest', 'Mới nhất'],
                ['saved', 'Đã lưu'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="px-3.5 py-2 rounded-full text-[12px] font-medium border whitespace-nowrap transition-all"
                  style={
                    activeTab === id
                      ? {
                          borderColor: 'var(--border)',
                          background: 'var(--bg2)',
                          color: 'var(--text)',
                        }
                      : {
                          borderColor: 'var(--border)',
                          color: 'var(--text2)',
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {dynamicTags.map(t => (
                <button
                  key={t}
                  onClick={() => handleTagSelect(t)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all"
                  style={{
                    borderColor: activeTag === t ? '#6366f1' : 'var(--border)',
                    background: activeTag === t ? 'rgba(99,102,241,.15)' : 'transparent',
                    color: activeTag === t ? '#818cf8' : 'var(--text2)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-20">
                <Loader2 size={24} className="animate-spin text-indigo-400 mb-3" />
                <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                  Đang tải bài viết...
                </p>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div
                className="flex flex-col items-center py-20 border rounded-2xl"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <p className="text-3xl mb-3">📝</p>
                <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                  {activeTab === 'saved' ? 'Bạn chưa lưu bài viết nào' : 'Chưa có bài viết nào'}
                </p>
                <Link
                  to="/blog/create"
                  className="mt-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-[12px] text-white transition-colors"
                >
                  Viết bài đầu tiên
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {visiblePosts.map((p, idx) => (
                    <PostCard
                      key={p._id || `post-${idx}`}
                      post={p}
                      onLike={handleLike}
                      onSave={handleSave}
                      onComment={setCommentPost}
                      onDelete={handleDelete}
                      onHide={handleHide}
                    />
                  ))}
                </div>

                {hasMore && activeTab !== 'saved' && (
                  <button
                    onClick={() => load(page + 1, activeTag, false)}
                    disabled={loadMore}
                    className="w-full py-3 rounded-2xl border text-[12px] transition-all flex items-center justify-center gap-2 hover:bg-white/[.03]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                  >
                    {loadMore ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                    {loadMore ? 'Đang tải...' : 'Xem thêm'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="hidden xl:block">
          <TrendingSidebar
            items={trending.filter(p => !hiddenPostIds.includes(p._id))}
            onOpenPost={(id) => navigate(`/blog/${id}`)}
          />
        </div>
      </div>
    </div>
  )
}