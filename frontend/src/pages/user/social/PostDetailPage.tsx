import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Sparkles,
  PlayCircle,
} from 'lucide-react'
import { postApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

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

function ini(n: string) {
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

function gid(id: any): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return String(id)
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

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [commentInput, setCommentInput] = useState('')
  const [commenting, setCommenting] = useState(false)

  const loadPost = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await postApi.get(id)
      setPost(normalizePost(data))
    } catch {
      toast.error('Không tải được bài viết')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPost()
  }, [id])

  const isLiked = useMemo(
    () => Array.isArray(post?.likedBy) && post.likedBy.includes(user?.id),
    [post, user?.id],
  )

  const isSaved = useMemo(
    () => Array.isArray(post?.savedBy) && post.savedBy.includes(user?.id),
    [post, user?.id],
  )

  const likes = Array.isArray(post?.likedBy) ? post.likedBy.length : (post?.likesCount ?? 0)
  const comments = Array.isArray(post?.comments) ? post.comments.length : (post?.commentsCount ?? 0)
  const imageUrls: string[] = post?.imageUrls ?? []
  const embedVideo = extractVideoEmbed(post?.videoUrl)
  const authorColor = COLORS[post?.authorName] ?? '#6366f1'
  const authorAvatar = getAuthorAvatar(post, user)

  const handleLike = async () => {
    if (!post?._id) return
    try {
      await postApi.like(post._id)
      setPost((prev: any) => {
        if (!prev) return prev
        const liked = Array.isArray(prev.likedBy) && prev.likedBy.includes(user?.id)
        return {
          ...prev,
          likedBy: liked
            ? prev.likedBy.filter((x: string) => x !== user?.id)
            : [...(prev.likedBy ?? []), user?.id],
        }
      })
    } catch {
      toast.error('Lỗi khi thích bài viết')
    }
  }

  const handleSave = async () => {
    if (!post?._id) return
    try {
      await postApi.save(post._id)
      setPost((prev: any) => {
        if (!prev) return prev
        const saved = Array.isArray(prev.savedBy) && prev.savedBy.includes(user?.id)
        return {
          ...prev,
          savedBy: saved
            ? prev.savedBy.filter((x: string) => x !== user?.id)
            : [...(prev.savedBy ?? []), user?.id],
        }
      })
      toast.success('Đã cập nhật lưu bài')
    } catch {
      toast.error('Lỗi khi lưu bài')
    }
  }

  const handleComment = async () => {
    if (!post?._id || !commentInput.trim()) return
    setCommenting(true)
    try {
      await postApi.addComment(post._id, commentInput.trim())
      setCommentInput('')
      await loadPost()
      toast.success('Đã bình luận')
    } catch {
      toast.error('Không thể bình luận')
    } finally {
      setCommenting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20">
        <Loader2 size={24} className="animate-spin text-indigo-400 mb-3" />
        <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
          Đang tải bài viết...
        </p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-[16px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Không tìm thấy bài viết
        </p>
        <button
          onClick={() => navigate('/blog')}
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[12px] transition-colors"
        >
          Quay lại blog
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button
        onClick={() => navigate('/blog')}
        className="flex items-center gap-2 text-[13px] hover:text-[var(--text)] transition-colors"
        style={{ color: 'var(--text2)' }}
      >
        <ArrowLeft size={16} />
        Quay lại blog
      </button>

      <div
        className="border rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(`/u/${post.authorId}`)}
              className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-[var(--bg3)]"
            >
              {authorAvatar ? (
                <img src={authorAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[12px] font-semibold text-white"
                  style={{ background: authorColor }}
                >
                  {ini(post.authorName ?? 'U')}
                </div>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <button
                onClick={() => navigate(`/u/${post.authorId}`)}
                className="text-[14px] font-semibold hover:text-indigo-400 transition-colors"
                style={{ color: 'var(--text)' }}
              >
                {post.authorName}
              </button>

              <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text3)' }}>
                <span>{post.createdAt ? ago(post.createdAt) : ''}</span>
                <span>•</span>
                <span>{post.views ?? 0} lượt xem</span>
              </div>
            </div>
          </div>

          {post.tags?.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-4">
              {post.tags.map((t: string, i: number) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(99,102,241,.12)', color: '#818cf8' }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-[28px] font-bold leading-tight mt-4" style={{ color: 'var(--text)' }}>
            {post.title}
          </h1>

          {post.summary && (
            <div
              className="mt-4 p-4 rounded-2xl"
              style={{
                background: 'rgba(245,158,11,.07)',
                border: '0.5px solid rgba(245,158,11,.2)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1 text-amber-400 text-[12px] font-semibold">
                <Sparkles size={13} />
                AI tóm tắt
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text)' }}>
                {post.summary}
              </p>
            </div>
          )}

          <div className="mt-5 whitespace-pre-wrap leading-8 text-[16px]" style={{ color: 'var(--text2)' }}>
            {post.content}
          </div>
        </div>

        {imageUrls.length > 0 && (
          <div className={clsx('grid gap-[2px] bg-[var(--border)]', imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {imageUrls.map((img, i) => (
              <div key={i} className={clsx('overflow-hidden bg-[var(--bg3)]', imageUrls.length === 1 ? 'h-[420px]' : 'h-72')}>
                <img src={toMediaUrl(img)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {post.coverImage && imageUrls.length === 0 && (
          <div className="overflow-hidden bg-[var(--bg3)] h-[420px]">
            <img src={toMediaUrl(post.coverImage)} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {!imageUrls.length && !post.coverImage && embedVideo && (
          <div className="px-5 pb-5">
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <iframe
                src={embedVideo}
                className="w-full h-[420px]"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="video"
              />
            </div>
          </div>
        )}

        {!imageUrls.length && !post.coverImage && !embedVideo && post.videoUrl && (
          <div className="px-5 pb-5">
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {post.videoUrl.match(/\.(mp4|webm|ogg)$/i) || post.videoUrl.startsWith('/uploads/') ? (
                <video controls className="w-full h-[420px] bg-black">
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

        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-[12px] mb-3" style={{ color: 'var(--text3)' }}>
            <span>{likes} lượt thích</span>
            <span>{comments} bình luận</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleLike}
              className={clsx(
                'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                isLiked ? 'bg-red-500/10 text-red-400' : 'hover:bg-white/[.04]',
              )}
              style={!isLiked ? { color: 'var(--text2)' } : {}}
            >
              <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
              Thích
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('comment-box')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium hover:bg-white/[.04] transition-all"
              style={{ color: 'var(--text2)' }}
            >
              <MessageCircle size={15} />
              Bình luận
            </button>

            <button
              onClick={handleSave}
              className={clsx(
                'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                isSaved ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-white/[.04]',
              )}
              style={!isSaved ? { color: 'var(--text2)' } : {}}
            >
              <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? 'Đã lưu' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>

      <div
        id="comment-box"
        className="border rounded-2xl p-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <p className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Bình luận
        </p>

        <div className="flex gap-2.5 mb-4">
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg3)]">
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

          <input
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
            placeholder="Viết bình luận của bạn..."
            className="flex-1 h-11 px-4 rounded-xl border text-[13px] outline-none"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
          <button
            onClick={handleComment}
            disabled={commenting || !commentInput.trim()}
            className="w-11 h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            {commenting ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
          </button>
        </div>

        <div className="space-y-3">
          {(!post.comments || post.comments.length === 0) && (
            <p className="text-[12px] text-center py-6" style={{ color: 'var(--text3)' }}>
              Chưa có bình luận nào
            </p>
          )}

          {post.comments?.map((c: any, i: number) => (
            <div key={c.id ?? `comment-${i}`} className="flex gap-3">
              <button
                onClick={() => c.authorId && navigate(`/u/${c.authorId}`)}
                className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg3)]"
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

              <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'var(--bg3)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => c.authorId && navigate(`/u/${c.authorId}`)}
                    className="text-[12px] font-semibold hover:text-indigo-400 transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    {c.authorName}
                  </button>
                  <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                    {c.createdAt ? ago(c.createdAt) : ''}
                  </span>
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text2)' }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}