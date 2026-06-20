import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Image,
  Video,
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
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Flag,
  Filter,
  AlertCircle,
  Eye
} from 'lucide-react'
import { postApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import type { Post, PostAiCheckResult } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import UserAvatar from '@/components/UserAvatar'

const SUBJECTS = [
  'Tất cả',
  'Toán',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lập trình',
  'AI/ML',
  'IELTS',
  'TOEIC'
]

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
  const cleanUrl = String(url).trim().replaceAll('\\', '/')
  if (!cleanUrl) return ''
  if (
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl
  }
  const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/, '')
  if (cleanUrl.startsWith('http://localhost:8080/api')) {
    return cleanUrl.replace('http://localhost:8080/api', API_BASE_URL)
  }
  if (cleanUrl.startsWith('http://localhost:8080')) {
    return cleanUrl.replace('http://localhost:8080', BACKEND_ORIGIN)
  }
  if (cleanUrl.startsWith('http://')) {
    return cleanUrl
  }
  if (cleanUrl.startsWith('/api/')) {
    return cleanUrl.replace('/api', API_BASE_URL)
  }
  if (cleanUrl.startsWith('/uploads/')) {
    return `${API_BASE_URL}${cleanUrl}`
  }
  if (cleanUrl.startsWith('uploads/')) {
    return `${API_BASE_URL}/${cleanUrl}`
  }
  return `${API_BASE_URL}/uploads/${cleanUrl}`
}

function normalizeUploadedUrl(url?: string) {
  if (!url) return ''
  const cleanUrl = String(url).trim().replaceAll('\\', '/')
  if (!cleanUrl) return ''
  if (
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl
  }
  const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/, '')
  if (cleanUrl.startsWith('http://localhost:8080/api')) {
    return cleanUrl.replace('http://localhost:8080/api', API_BASE_URL)
  }
  if (cleanUrl.startsWith('http://localhost:8080')) {
    return cleanUrl.replace('http://localhost:8080', BACKEND_ORIGIN)
  }
  if (cleanUrl.startsWith('http://')) {
    return cleanUrl
  }
  if (cleanUrl.startsWith('/')) {
    return cleanUrl
  }
  return `/uploads/${cleanUrl}`
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

function getCommentId(c: any): string {
  return gid(c?.id ?? c?._id ?? c?.commentId)
}

function normalizeComment(c: any) {
  if (!c) return c
  return {
    ...c,
    id: getCommentId(c),
    authorId: gid(c.authorId),
    parentId: c.parentId ? gid(c.parentId) : undefined,
  }
}

function normalizePost(p: any): Post {
  return {
    ...p,
    id: gid(p.id ?? p._id),
    authorId: gid(p.authorId),
    comments: Array.isArray(p.comments) ? p.comments.map(normalizeComment) : p.comments,
  }
}

const SHORT_AI_SUMMARY = 'Nội dung bài viết chưa đủ để tóm tắt rõ ràng.'

function hasValidAiSummary(post: Post): boolean {
  return post.aiSummaryStatus === 'DONE'
    && !!post.aiSummary?.trim()
    && post.aiSummary.trim() !== SHORT_AI_SUMMARY
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

function postAuthorAvatar(post: any, currentUser: any) {
  if (post?.authorAvatar) return post.authorAvatar
  if (String(post?.authorId) === String(currentUser?.id)) return currentUser?.avatar
  return null
}


function normalizeText(value?: any): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function postMatchesTag(post: any, tag: string): boolean {
  if (!tag || tag === 'Tất cả') return true
  const target = normalizeText(tag)
  const candidates = [
    post?.subject,
    ...(Array.isArray(post?.tags) ? post.tags : []),
  ].map(normalizeText)

  return candidates.some(item => item === target || item.includes(target) || target.includes(item))
}

function postMatchesSearch(post: any, query: string): boolean {
  const q = normalizeText(query)
  if (!q) return true

  const searchable = [
    post?.title,
    post?.content,
    post?.authorName,
    post?.subject,
    ...(Array.isArray(post?.tags) ? post.tags : []),
  ].map(normalizeText).join(' ')

  if (searchable.includes(q)) return true

  const tokens = q.split(/\s+/).filter(Boolean)
  return tokens.length > 0 && tokens.every(token => searchable.includes(token))
}

function inferSubjectFromTags(tags: string[], fallback = 'Khác'): string {
  const normalizedMap = new Map(SUBJECTS.filter(s => s !== 'Tất cả').map(s => [normalizeText(s), s]))
  for (const tag of tags) {
    const hit = normalizedMap.get(normalizeText(tag))
    if (hit) return hit
  }
  return fallback
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

  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const userId = gid(user?.id)

  const submit = async () => {
    if (!input.trim() || !post.id) return
    setLoading(true)
    try {
      await postApi.addComment(post.id, input.trim())
      toast.success('Đã bình luận')
      setInput('')
      onDone()
    } catch {
      toast.error('Lỗi khi bình luận')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (parentCommentId: string) => {
    if (!replyInput.trim() || !post.id || !parentCommentId) return
    setReplyLoading(true)
    try {
      await postApi.replyComment(post.id, parentCommentId, replyInput.trim())
      toast.success('Đã trả lời bình luận')
      setReplyInput('')
      setReplyToId(null)
      onDone()
    } catch {
      toast.error('Lỗi khi trả lời')
    } finally {
      setReplyLoading(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editInput.trim() || !post.id || !commentId) return
    setEditLoading(true)
    try {
      await postApi.editComment(post.id, commentId, editInput.trim())
      toast.success('Đã cập nhật bình luận')
      setEditInput('')
      setEditId(null)
      onDone()
    } catch {
      toast.error('Lỗi khi sửa bình luận')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!commentId || !window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return
    try {
      await postApi.deleteComment(post.id, commentId)
      toast.success('Đã xóa bình luận')
      onDone()
    } catch {
      toast.error('Lỗi khi xóa bình luận')
    }
  }

  const commentsList = (post.comments ?? []).map(normalizeComment)
  const rootComments = commentsList.filter((c: any) => !c.parentId)

  const renderCommentBubble = (c: any, isReply = false) => {
    const commentId = getCommentId(c)
    const isCommentAuthor = gid(c.authorId) === userId
    const isPostAuthor = gid(post.authorId) === userId
    const isAdmin = user?.role === 'ADMIN'
    const canDelete = !!commentId && (isCommentAuthor || isPostAuthor || isAdmin)
    const canEdit = !!commentId && isCommentAuthor && !c.deleted
    const isEditing = !!commentId && editId === commentId
    const isReplying = !!commentId && replyToId === commentId

    return (
      <div key={commentId || `${c.authorId}-${c.createdAt}`} className={clsx('flex gap-3', isReply && 'ml-10 mt-2')}>
        <button
          onClick={() => c.authorId && navigate(`/u/${gid(c.authorId)}`)}
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg3)]"
        >
          <UserAvatar name={c.authorName} avatar={c.authorAvatar} size={32} />
        </button>

        <div className="flex-1 space-y-1">
          <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--bg3)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mb-0.5">
                <button
                  onClick={() => c.authorId && navigate(`/u/${gid(c.authorId)}`)}
                  className="text-[11px] font-semibold hover:text-indigo-400 transition-colors text-left"
                  style={{ color: 'var(--text)' }}
                >
                  {c.authorName}
                </button>
                <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                  {c.createdAt ? ago(c.createdAt) : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && !isEditing && (
                  <button
                    onClick={() => {
                      setEditId(commentId)
                      setEditInput(c.content)
                      setReplyToId(null)
                    }}
                    className="text-[10px] hover:text-indigo-400 transition-colors"
                    style={{ color: 'var(--text3)' }}
                  >
                    Sửa
                  </button>
                )}
                {canDelete && !c.deleted && (
                  <button
                    onClick={() => handleDelete(commentId)}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-1 flex gap-2">
                <input
                  value={editInput}
                  onChange={e => setEditInput(e.target.value)}
                  className="flex-1 rounded-lg px-2 py-1 text-[11px] outline-none border"
                  style={{
                    background: 'var(--bg2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
                <button
                  onClick={() => handleEdit(commentId)}
                  disabled={editLoading || !editInput.trim()}
                  className="text-[10px] px-2 py-1 rounded text-white"
                  style={{ background: '#534AB7' }}
                >
                  Lưu
                </button>
                <button
                  onClick={() => {
                    setEditId(null)
                    setEditInput('')
                  }}
                  className="text-[10px] px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <p
                className={clsx('text-[12px]', c.deleted && 'italic')}
                style={{ color: c.deleted ? 'var(--text3)' : 'var(--text2)' }}
              >
                {c.content}
              </p>
            )}
          </div>

          {!isReply && !c.deleted && commentId && (
            <div className="flex gap-3 pl-2">
              <button
                onClick={() => {
                  setReplyToId(isReplying ? null : commentId)
                  setReplyInput('')
                  setEditId(null)
                }}
                className="text-[10px] font-medium hover:text-indigo-400 transition-colors"
                style={{ color: 'var(--text3)' }}
              >
                Phản hồi
              </button>
            </div>
          )}

          {isReplying && (
            <div className="flex gap-2 items-center mt-2 pl-2">
              <input
                value={replyInput}
                onChange={e => setReplyInput(e.target.value)}
                placeholder="Trả lời bình luận..."
                className="flex-1 rounded-xl px-3 py-1.5 text-[11px] outline-none border"
                style={{
                  background: 'var(--bg3)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />
              <button
                onClick={() => handleReply(commentId)}
                disabled={replyLoading || !replyInput.trim()}
                className="px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40 text-[11px] text-white font-medium transition-colors"
                style={{ background: '#534AB7' }}
              >
                Gửi
              </button>
              <button
                onClick={() => {
                  setReplyToId(null)
                  setReplyInput('')
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors border"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>
    )
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
            Bình luận · {commentsList.length}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text3)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-4">
          {rootComments.length === 0 && (
            <p className="text-[12px] text-center py-8" style={{ color: 'var(--text3)' }}>
              Chưa có bình luận nào
            </p>
          )}

          {rootComments.map((rc: any) => {
            const rootId = getCommentId(rc)
            const replies = commentsList.filter((x: any) => gid(x.parentId) === rootId)
            return (
              <div key={rootId || `${rc.authorId}-${rc.createdAt}`} className="space-y-2">
                {renderCommentBubble(rc, false)}
                {replies.map((rep: any) => renderCommentBubble(rep, true))}
              </div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t flex gap-2.5 items-center" style={{ borderColor: 'var(--border)' }}>
          <UserAvatar name={user?.fullName} avatar={user?.avatar} size={32} />

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
            className="w-10 h-10 rounded-xl hover:opacity-90 disabled:opacity-40 flex items-center justify-center transition-colors"
            style={{ background: '#534AB7' }}
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
  onReport,
}: {
  mine: boolean
  onDelete?: () => void
  onHide: () => void
  onReport: () => void
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

          {!mine && (
            <button
              onClick={() => {
                setOpen(false)
                onReport()
              }}
              className="w-full px-3 py-2.5 text-left text-[12px] flex items-center gap-2 hover:bg-white/[.04] text-amber-400"
            >
              <Flag size={13} />
              Báo cáo vi phạm
            </button>
          )}

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

function ReportModal({
  postId,
  onClose,
}: {
  postId: string
  onClose: () => void
}) {
  const [reasonType, setReasonType] = useState('SAI_TAG')
  const [reasonText, setReasonText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await postApi.reportPost(postId, reasonType, reasonText)
      toast.success('Đã gửi báo cáo. Cảm ơn bạn!')
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Không thể gửi báo cáo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-5 border shadow-2xl"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text)' }}>
          Báo cáo bài viết vi phạm
        </h3>

        <div className="space-y-2.5 mb-4">
          {[
            ['SAI_TAG', 'Sai tag môn học / category chính'],
            ['NOI_DUNG_KHONG_PHU_HOP', 'Nội dung không phù hợp môi trường học tập'],
            ['SPAM', 'Spam / Quảng cáo không mong muốn'],
            ['QUAY_ROI', 'Quấy rối / Xúc phạm người khác'],
            ['VI_PHAM_TIEU_CHUAN', 'Vi phạm tiêu chuẩn cộng đồng'],
            ['KHAC', 'Lý do khác'],
          ].map(([val, label]) => (
            <label key={val} className="flex items-center gap-2.5 text-[12px] cursor-pointer" style={{ color: 'var(--text2)' }}>
              <input
                type="radio"
                name="reasonType"
                value={val}
                checked={reasonType === val}
                onChange={() => setReasonType(val)}
                className="accent-[#534AB7]"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <textarea
          rows={3}
          value={reasonText}
          onChange={e => setReasonText(e.target.value)}
          placeholder="Mô tả chi tiết hơn (nếu có)..."
          className="w-full p-2.5 rounded-xl border text-[12px] outline-none"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        <div className="flex justify-end gap-2.5 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-[12px] font-medium text-white flex items-center gap-1.5"
            style={{ background: '#534AB7' }}
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Gửi báo cáo
          </button>
        </div>
      </div>
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
  onEdit,
  onResubmit,
  onReport,
}: {
  post: Post
  onLike: (id: string) => void
  onSave: (id: string) => void
  onComment: (p: any) => void
  onDelete: (id: string) => void
  onHide: (id: string) => void
  onEdit: (p: Post) => void
  onResubmit: (id: string) => void
  onReport: (id: string) => void
}) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const postId = post.id
  const mine = String(post.authorId) === String(user?.id)
  const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(user?.id ?? '')
  const isSaved = Array.isArray(post.savedBy) && post.savedBy.includes(user?.id ?? '')
  const color = COLORS[post.authorName ?? ''] ?? '#6366f1'
  const likes = Array.isArray(post.likedBy) ? post.likedBy.length : (post.likesCount ?? 0)
  const cmts = Array.isArray(post.comments) ? post.comments.length : (post.commentsCount ?? 0)
  const imageUrls: string[] = post.imageUrls ?? []
  const embedVideo = extractVideoEmbed(post.videoUrl)
  const authorAvatarSrc = postAuthorAvatar(post, user)

  // Moderation state styles
  const rawModerationStatus = post.moderationStatus ?? ''
  const moderationStatus = rawModerationStatus || 'APPROVED'
  const isPublicVisible = !!post.published && (rawModerationStatus === 'APPROVED' || rawModerationStatus === '')
  const isNeedsRevision = moderationStatus === 'NEEDS_REVISION'
  const isPendingReview = moderationStatus === 'PENDING_REVIEW'
  const isRejected = moderationStatus === 'REJECTED' || moderationStatus === 'REMOVED'
  const showAuthorOnlyHint = mine && !isPublicVisible && !isRejected && !isPendingReview && !isNeedsRevision

  // Card border dynamic
  let cardBorder = 'var(--border)'
  if (isNeedsRevision) cardBorder = '#FAEEDA' // Cảnh báo sai tag
  if (isPendingReview) cardBorder = 'rgba(99,102,241,.3)'
  if (isRejected) cardBorder = '#FCEBEB' // Vi phạm

  const contentPreview = useMemo(() => {
    if (!post.content) return ''
    if (expanded) return post.content
    return post.content.length > 250 ? post.content.substring(0, 250) + '...' : post.content
  }, [post.content, expanded])

  return (
    <div
      className="border rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--bg2)',
        borderColor: cardBorder,
        borderWidth: isNeedsRevision || isRejected ? '1.5px' : '1px'
      }}
    >
      {/* Moderation Banners */}
      {isNeedsRevision && (
        <div className="px-4 py-2 flex items-center justify-between text-[11px] font-medium" style={{ background: '#FAEEDA', color: '#633806' }}>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={13} />
            <span>AI cảnh báo: {post.revisionMessage || 'Môn học chính hoặc tag có thể chưa khớp với nội dung bài viết.'}</span>
          </div>
          {mine && (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(post)}
                className="px-2.5 py-0.5 rounded bg-[#633806]/10 hover:bg-[#633806]/20 transition-all font-semibold"
              >
                Sửa bài
              </button>
              <button
                onClick={() => onResubmit(postId)}
                className="px-2.5 py-0.5 rounded bg-[#534AB7] text-white hover:opacity-90 transition-all font-semibold"
              >
                Gửi lại
              </button>
            </div>
          )}
        </div>
      )}

      {showAuthorOnlyHint && (
        <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ background: 'rgba(99,102,241,.12)', color: 'var(--text)' }}>
          <Eye size={13} className="text-indigo-400" />
          <span>Chỉ bạn thấy bài này. Người khác chưa thấy cho đến khi bài được duyệt công khai (APPROVED).</span>
        </div>
      )}

      {isPendingReview && (
        <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ background: 'rgba(99,102,241,.15)', color: 'var(--text)' }}>
          <Sparkles size={13} className="animate-pulse text-indigo-400" />
          <span>
            {(post.moderationReason?.toLowerCase().includes('media') ||
              ((imageUrls.length > 0 || !!post.videoUrl) &&
                post.mediaSafetyStatus &&
                post.mediaSafetyStatus !== 'SAFE'))
              ? 'Bài viết có media đang chờ kiểm duyệt. Chỉ bạn nhìn thấy bài đăng này.'
              : 'Bài đăng đang chờ phê duyệt. Hiện tại chỉ có bạn nhìn thấy bài đăng này.'}
          </span>
        </div>
      )}

      {isRejected && (
        <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ background: '#FCEBEB', color: '#791F1F' }}>
          <AlertCircle size={13} />
          <span>Bài đăng bị từ chối / gỡ bỏ do vi phạm tiêu chuẩn cộng đồng: {post.moderationReason || 'Nội dung không phù hợp.'}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/u/${post.authorId}`)}
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-[var(--bg3)]"
          >
            <UserAvatar name={post.authorName} avatar={authorAvatarSrc} size={40} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/u/${post.authorId}`)}
                className="text-[13px] font-semibold hover:text-[#534AB7] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                {post.authorName}
              </button>
              {post.subject && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: '#EEEDFE', color: '#3C3489' }}
                >
                  {post.subject}
                </span>
              )}
            </div>

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
            onReport={() => postId && onReport(postId)}
          />
        </div>

        <h3
          className="text-[15px] font-bold leading-snug mt-3 cursor-pointer hover:text-[#534AB7] transition-colors"
          style={{ color: 'var(--text)' }}
          onClick={() => navigate(`/blog/${postId}`)}
        >
          {post.title}
        </h3>

        <div className="text-[13px] leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
          {contentPreview}
          {post.content && post.content.length > 250 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[#534AB7] ml-1.5 font-semibold hover:underline"
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>

        {/* AI Summary Box */}
        {hasValidAiSummary(post) && (
          <div
            className="mt-3.5 p-3 rounded-xl border"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold" style={{ color: 'var(--text)' }}>
              <Sparkles size={13} className="text-emerald-500" />
              Tóm tắt bởi AI
            </div>
            <div className="text-[12px] leading-relaxed space-y-1 font-medium whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
              {post.aiSummary}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3.5">
            {post.tags.slice(0, 3).map((t: string, ti: number) => {
              const isTagWrong = isNeedsRevision && post.aiSafetyStatus === 'WARNING';
              return (
                <span
                  key={`${postId}-tag-${ti}`}
                  className={clsx(
                    'text-[10px] font-semibold px-2.5 py-0.5 rounded-full border',
                    isTagWrong ? 'bg-red-50 text-red-500 line-through border-red-200' : 'bg-[#EEEDFE] text-[#3C3489] border-indigo-100'
                  )}
                >
                  #{t}
                </span>
              );
            })}
            {post.tags.length > 3 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/[.04] border border-white/[.08]" style={{ color: 'var(--text3)' }}>
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {imageUrls.length > 0 && (
        <div className={clsx('grid gap-[2px] bg-[var(--border)]', imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {imageUrls.slice(0, 4).map((img, i) => (
            <div key={i} className={clsx('overflow-hidden bg-[var(--bg3)]', imageUrls.length === 1 ? 'h-96' : 'h-52')}>
              <img
                src={toMediaUrl(img)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {post.coverImage && imageUrls.length === 0 && (
        <div className="overflow-hidden bg-[var(--bg3)] h-80">
          <img
            src={toMediaUrl(post.coverImage)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => postId && onLike(postId)}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all',
              isLiked ? 'bg-red-500/10 text-red-400' : 'hover:bg-white/[.04]',
            )}
            style={!isLiked ? { color: 'var(--text2)' } : {}}
          >
            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
            Thích
          </button>

          <button
            onClick={() => onComment(post)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold hover:bg-white/[.04] transition-all"
            style={{ color: 'var(--text2)' }}
          >
            <MessageCircle size={14} />
            Bình luận
          </button>

          <button
            onClick={() => postId && onSave(postId)}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all',
              isSaved ? 'bg-indigo-500/10 text-[#534AB7]' : 'hover:bg-white/[.04]',
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
      className="border rounded-2xl p-4 sticky top-4 space-y-4"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
        <TrendingUp size={15} className="text-[#534AB7]" />
        <p className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
          Đang thịnh hành
        </p>
      </div>

      <div className="space-y-1">
        {items.slice(0, 5).map((item, index) => (
          <button
            key={item.id ?? index}
            onClick={() => onOpenPost(item.id)}
            className="w-full text-left px-2 py-2 rounded-xl hover:bg-white/[.04] transition-colors"
          >
            <div className="flex items-start gap-3">
              <span
                className="text-[12px] font-bold w-4 flex-shrink-0 mt-0.5 text-indigo-400"
              >
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] font-semibold line-clamp-2 leading-5 hover:text-[#534AB7]"
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

  const [posts, setPosts] = useState<Post[]>([])
  const [trending, setTrending] = useState<Post[]>([])

  // Custom Filter State
  const [activeTag, setActiveTag] = useState('Tất cả')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'feed' | 'latest' | 'saved'>('feed')

  // API loading states
  const [loading, setLoading] = useState(true)
  const [commentPost, setCommentPost] = useState<any>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadMore, setLoadMore] = useState(false)
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([])
  const [reportPostId, setReportPostId] = useState<string | null>(null)

  // Tag Explorer Popover State
  const [showTagExplorer, setShowTagExplorer] = useState(false)
  const [tagSearchText, setTagSearchText] = useState('')
  const explorerRef = useRef<HTMLDivElement>(null)

  // Compose Box state
  const [composeExpanded, setComposeExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newSubject, setNewSubject] = useState('Khác')
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)

  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  // AI Pre-validate checking variables
  const [aiWarningText, setAiWarningText] = useState<string | null>(null)
  const [aiCheckLoading, setAiCheckLoading] = useState(false)
  const [aiCheckResult, setAiCheckResult] = useState<PostAiCheckResult | null>(null)
  const [trendingTagsList, setTrendingTagsList] = useState<{ tag: string; count: number }[]>([])
  const [explorerTags, setExplorerTags] = useState<{ tag: string; count: number }[]>([])

  // Image Upload state & helper functions
  const [images, setImages] = useState<{ file?: File; url: string; preview: string }[]>([])
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const wordCount = useMemo(
    () => newContent.trim().split(/\s+/).filter(Boolean).length,
    [newContent],
  )
  const readTime = Math.max(1, Math.round(wordCount / 200))

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || images.length >= 6) return
    const allowed = Array.from(files).slice(0, 6 - images.length)

    for (const file of allowed) {
      if (!file.type.startsWith('image/')) {
        toast.error('Chỉ hỗ trợ file ảnh')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Mỗi ảnh tối đa 10MB')
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      const tmpId = Date.now().toString() + Math.random().toString(36).slice(2)

      setImages(prev => [...prev, { file, url: tmpId, preview: previewUrl }])

      setUploadingImg(true)
      try {
        const res = await postApi.uploadImage(file)
        const safeUrl = normalizeUploadedUrl(res.url)
        setImages(prev => prev.map(img => (img.url === tmpId ? { ...img, url: safeUrl } : img)))
      } catch (e: any) {
        URL.revokeObjectURL(previewUrl)
        setImages(prev => prev.filter(img => img.url !== tmpId))
        toast.error(e?.response?.data?.message ?? 'Upload ảnh thất bại. Vui lòng thử lại.')
      } finally {
        setUploadingImg(false)
      }
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  // Horizontal Scroll Arrows Ref
  const filterRowRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const checkScrollArrows = () => {
    if (filterRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filterRowRef.current
      setShowLeftArrow(scrollLeft > 2)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 2)
    }
  }

  const scrollFilters = (dir: 'left' | 'right') => {
    if (filterRowRef.current) {
      const amount = dir === 'left' ? -200 : 200
      filterRowRef.current.scrollBy({ left: amount, behavior: 'smooth' })
      setTimeout(checkScrollArrows, 300)
    }
  }

  const popularTags = useMemo(() => {
    if (trendingTagsList.length > 0) {
      return trendingTagsList.slice(0, 10).map(item => item.tag)
    }
    const counts: Record<string, number> = {}
    posts.forEach(p => {
      p.tags?.forEach((t: string) => {
        counts[t] = (counts[t] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0])
      .slice(0, 10)
  }, [trendingTagsList, posts])

  const filteredExplorerTags = useMemo(() => {
    if (explorerTags.length > 0) {
      return explorerTags.map(item => item.tag)
    }
    const allTagsSet = new Set<string>()
    posts.forEach(p => p.tags?.forEach((t: string) => allTagsSet.add(t)))
    const list = Array.from(allTagsSet)
    if (!tagSearchText.trim()) return list.slice(0, 15)
    const q = normalizeText(tagSearchText)
    return list.filter((t: string) => normalizeText(t).includes(q)).slice(0, 15)
  }, [explorerTags, posts, tagSearchText])

  const handleAddTag = (tag: string) => {
    const normalized = tag.trim().replace(/#/g, '')
    if (!normalized) return
    if (selectedTags.some(t => normalizeText(t) === normalizeText(normalized))) {
      setTagInput('')
      return
    }
    if (selectedTags.length >= 8) {
      toast.error('Đã đạt giới hạn 8 tag')
      return
    }

    const nextTags = [...selectedTags, normalized]
    setSelectedTags(nextTags)

    const inferred = inferSubjectFromTags(nextTags, newSubject)
    if (inferred !== newSubject) setNewSubject(inferred)

    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (tagInput.trim()) {
        handleAddTag(tagInput)
      }
    }
  }

  const handleAiPrevalidate = async () => {
    if (!newContent.trim()) {
      toast.error('Nhập nội dung trước khi kiểm tra')
      return
    }

    setAiCheckLoading(true)
    setAiCheckResult(null)
    setAiWarningText(null)

    try {
      const subjectForCheck = inferSubjectFromTags(
        selectedTags,
        activeTag !== 'Tất cả' ? activeTag : newSubject || 'Khác',
      )

      const result = await postApi.aiCheck({
        title: newTitle.trim() || 'Không có tiêu đề',
        content: newContent.trim(),
        subject: subjectForCheck,
        tags: selectedTags,
      })

      setAiCheckResult(result)

      if (result.safetyStatus === 'VIOLATION' || result.safetyStatus === 'WARNING') {
        setAiWarningText(result.message)
      } else if (!result.tagMatch) {
        setAiWarningText(result.message)
      } else {
        toast.success(result.message || 'Kiểm duyệt AI: nội dung phù hợp để đăng.')
      }
    } catch (e: any) {
      const message = e?.message || 'AI đang bận, bạn vẫn có thể đăng bài để hệ thống kiểm duyệt sau'
      setAiWarningText(message)
      toast.error(message)
    } finally {
      setAiCheckLoading(false)
    }
  }

  const load = async (p = 0, tag = activeTag, reset = true) => {
    if (p === 0) setLoading(true)
    else setLoadMore(true)

    try {
      let items: Post[] = []
      let totalPages = 1
      const apiTag = tag !== 'Tất cả' ? tag : undefined

      if (activeTab === 'saved') {
        const res = await postApi.saved(p)
        items = (res.content ?? []).map(normalizePost)
        totalPages = res.totalPages ?? 1
      } else if (activeTab === 'latest') {
        const res = await postApi.list(p, apiTag)
        items = (res.content ?? []).map(normalizePost)
        totalPages = res.totalPages ?? 1
      } else {
        const res = user
          ? await postApi.feed(p, apiTag)
          : await postApi.list(p, apiTag)
        items = (res.content ?? []).map(normalizePost)
        totalPages = res.totalPages ?? 1
      }

      // Lọc ở frontend để bắt được cả subject và tag, không bị lỗi do backend chỉ filter exact tag.
      if (tag !== 'Tất cả') {
        items = items.filter(post => postMatchesTag(post, tag))
      }

      if (debouncedSearchQuery.trim()) {
        items = items.filter(post => postMatchesSearch(post, debouncedSearchQuery))
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

  const loadTrending = () => {
    postApi.trending().then((data: any[]) => setTrending(data.map(normalizePost))).catch(() => {})
  }

  useEffect(() => {
    postApi.trendingTags()
      .then(data => setTrendingTagsList(data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!showTagExplorer) return
    const timer = setTimeout(() => {
      postApi.searchTags(tagSearchText.trim())
        .then(data => setExplorerTags(data ?? []))
        .catch(() => setExplorerTags([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [showTagExplorer, tagSearchText])

  useEffect(() => {
    load(0, activeTag, true)
    loadTrending()
  }, [activeTag, activeTab, debouncedSearchQuery])

  useEffect(() => {
    postApi.hidden()
      .then((ids: string[]) => setHiddenPostIds(ids ?? []))
      .catch(() => {})

    // Add scroll listeners to Horizontal Row
    const el = filterRowRef.current
    if (el) {
      el.addEventListener('scroll', checkScrollArrows)
      window.addEventListener('resize', checkScrollArrows)
      checkScrollArrows()
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollArrows)
      window.removeEventListener('resize', checkScrollArrows)
    }
  }, [])

  // Close tag explorer when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (explorerRef.current && !explorerRef.current.contains(e.target as Node)) {
        setShowTagExplorer(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLike = async (id: string) => {
    if (!id) return
    try {
      await postApi.like(id)
      setPosts(prev =>
        prev.map(p => {
          if (p.id !== id) return p
          const liked = Array.isArray(p.likedBy) && p.likedBy.includes(user?.id ?? '')
          return {
            ...p,
            likedBy: liked ? p.likedBy!.filter((x: string) => x !== user?.id) : [...(p.likedBy ?? []), user?.id ?? ''],
          }
        }),
      )
      loadTrending()
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
          if (p.id !== id) return p
          const saved = Array.isArray(p.savedBy) && p.savedBy.includes(user?.id ?? '')
          return {
            ...p,
            savedBy: saved ? p.savedBy!.filter((x: string) => x !== user?.id) : [...(p.savedBy ?? []), user?.id ?? ''],
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
      setPosts(prev => prev.filter(p => p.id !== id))
      setTrending(prev => prev.filter(p => p.id !== id))
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

  const handleEditClick = (p: Post) => {
    setComposeExpanded(true)
    setEditingPostId(p.id)
    setNewTitle(p.title)
    setNewContent(p.content)
    setNewSubject(p.subject || inferSubjectFromTags(p.tags || [], 'Khác'))
    setSelectedTags(p.tags || [])
    setNewVideoUrl(p.videoUrl || '')
    if (p.imageUrls) {
      setImages(p.imageUrls.map(url => ({ url, preview: toMediaUrl(url) })))
    } else {
      setImages([])
    }
  }

  const handleCreatePost = async () => {
    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết')
      return
    }
    if (!newContent.trim()) {
      toast.error('Vui lòng nhập nội dung bài viết')
      return
    }
    if (uploadingImg) {
      toast.error('Vui lòng chờ ảnh upload xong')
      return
    }

    setSubmittingPost(true)
    try {
      const subjectForApi =
        inferSubjectFromTags(selectedTags, activeTag !== 'Tất cả' ? activeTag : newSubject || 'Khác')

      const payload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        subject: subjectForApi,
        tags: selectedTags,
        imageUrls: images
          .map(i => i.url)
          .filter(u => !!u && !u.startsWith('blob:')),
        videoUrl: newVideoUrl.trim() || undefined
      }

      const hasMedia =
        (payload.imageUrls?.length ?? 0) > 0 || !!(payload.videoUrl?.trim())

      if (editingPostId) {
        const updated = await postApi.update(editingPostId, payload)
        if (updated.moderationStatus === 'PENDING_REVIEW' && hasMedia) {
          toast.success('Bài viết có media cần được kiểm duyệt trước khi hiển thị.')
        } else if (updated.moderationStatus === 'REJECTED' || updated.moderationStatus === 'REMOVED') {
          toast.error(updated.moderationReason || 'Bài viết không được duyệt.')
        } else {
          toast.success('Cập nhật bài viết thành công!')
        }
      } else {
        const created = await postApi.create(payload)
        if (created.moderationStatus === 'PENDING_REVIEW' && hasMedia) {
          toast.success('Bài viết có media cần được kiểm duyệt trước khi hiển thị.')
        } else if (created.moderationStatus === 'REJECTED' || created.moderationStatus === 'REMOVED') {
          toast.error(created.moderationReason || 'Bài viết không được duyệt.')
        } else if (created.moderationStatus === 'APPROVED' && created.published) {
          toast.success('Đăng bài thành công!')
        } else if (created.moderationStatus === 'PENDING_REVIEW') {
          toast.success('Bài đăng đang chờ kiểm duyệt. Hiện chỉ bạn nhìn thấy bài này.')
        } else {
          toast.success('Đăng bài thành công!')
        }
      }

      setNewTitle('')
      setNewContent('')
      setNewSubject('Khác')
      setSelectedTags([])
      setNewVideoUrl('')
      setImages([])
      setComposeExpanded(false)
      setEditingPostId(null)

      // reload feed
      load(0, activeTag, true)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Có lỗi xảy ra khi lưu bài viết')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleCancelPost = () => {
    setNewTitle('')
    setNewContent('')
    setNewSubject('Khác')
    setSelectedTags([])
    setNewVideoUrl('')
    setImages([])
    setComposeExpanded(false)
    setEditingPostId(null)
    setAiWarningText(null)
    setAiCheckResult(null)
  }

  const handleCloseModal = () => {
    if (newTitle.trim() || newContent.trim()) {
      if (!window.confirm('Bạn có chắc muốn hủy? Các thay đổi sẽ không được lưu.')) {
        return
      }
    }
    handleCancelPost()
  }

  const handleResubmit = async (id: string) => {
    try {
      await postApi.resubmitPost(id)
      toast.success('Đã gửi lại bài viết! AI đang phân tích lại tags...')
      load(0, activeTag, true)
    } catch {
      toast.error('Lỗi khi gửi lại bài viết')
    }
  }

  const visiblePosts = useMemo(() => {
    return posts.filter(p => !hiddenPostIds.includes(p.id))
  }, [posts, hiddenPostIds])

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6">
      {commentPost?.id && (
        <CommentModal
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onDone={() => {
            postApi.get(commentPost.id).then((res: any) => {
              const norm = normalizePost(res)
              setPosts(prev => prev.map(p => (p.id === commentPost.id ? norm : p)))
              setCommentPost(norm)
            })
          }}
        />
      )}

      {reportPostId && (
        <ReportModal
          postId={reportPostId}
          onClose={() => setReportPostId(null)}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0 space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h1 className="text-[20px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Sparkles size={20} className="text-[#534AB7]" />
                Bài đăng học tập
              </h1>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
                Chia sẻ kiến thức, tài liệu và kinh nghiệm học tập chất lượng cao cùng StudyMate AI.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="relative border rounded-xl flex items-center px-3.5 h-10 w-full md:w-60"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <Search size={14} className="flex-shrink-0 mr-2" style={{ color: 'var(--text3)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài viết học tập..."
                  className="bg-transparent border-none outline-none text-[12px] w-full"
                  style={{ color: 'var(--text)' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text3)' }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setComposeExpanded(true)}
                className="h-10 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 transition-all duration-300 shadow-lg hover:opacity-95 flex-shrink-0"
                style={{ background: '#534AB7' }}
              >
                <PenSquare size={14} />
                Tạo bài viết
              </button>
            </div>
          </div>

          {/* Large Compose Modal */}
          {composeExpanded && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
              <div
                className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border flex flex-col max-h-[90vh]"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 rounded-xl hover:bg-[var(--bg3)] transition-colors"
                    style={{ color: 'var(--text3)' }}
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="flex-1">
                    <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
                      {editingPostId ? 'Sửa bài viết học tập' : 'Tạo bài viết'}
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
                      Chia sẻ kiến thức, kinh nghiệm học tập hoặc tài liệu hữu ích
                    </p>
                  </div>

                  <button
                    onClick={handleCreatePost}
                    disabled={submittingPost || uploadingImg || !newTitle.trim() || !newContent.trim()}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-semibold text-white transition-all duration-300 disabled:opacity-40"
                    style={{ background: '#534AB7' }}
                  >
                    {submittingPost ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {submittingPost
                      ? (images.length > 0 || newVideoUrl.trim()
                          ? 'AI đang quét media...'
                          : 'Đang đăng...')
                      : (editingPostId ? 'Cập nhật' : 'Đăng bài')}
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* User details */}
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user?.fullName} avatar={user?.avatar} size={40} />

                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                        {user?.fullName}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        {wordCount} từ · ~{readTime} phút đọc
                      </p>
                    </div>
                  </div>

                  {/* Title Input */}
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Tiêu đề bài viết..."
                    className="w-full bg-transparent text-[22px] font-bold outline-none border-b py-2 focus:border-[#534AB7] transition-colors"
                    style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                  />

                  {/* Content Textarea */}
                  <textarea
                    rows={8}
                    value={newContent}
                    onChange={e => setNewContent(e.target.value.substring(0, 2000))}
                    placeholder="Bạn muốn chia sẻ điều gì hôm nay?"
                    className="w-full bg-transparent outline-none text-[14px] leading-relaxed resize-none"
                    style={{ color: 'var(--text2)' }}
                  />

                  {/* Images Preview list */}
                  {images.length > 0 && (
                    <div className={clsx('grid gap-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                      {images.map((img, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'relative rounded-2xl overflow-hidden group',
                            images.length === 1 ? 'h-80' : 'h-48',
                          )}
                        >
                          <img
                            src={toMediaUrl(img.preview || img.url)}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Video Preview */}
                  {newVideoUrl && !images.length && (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                      {extractVideoEmbed(newVideoUrl) ? (
                        <iframe
                          src={extractVideoEmbed(newVideoUrl)!}
                          className="w-full h-72"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          title="video-preview"
                        />
                      ) : newVideoUrl.match(/\.(mp4|webm|ogg)$/i) || newVideoUrl.startsWith('/uploads/') ? (
                        <video controls className="w-full h-72 bg-black">
                          <source src={toMediaUrl(newVideoUrl)} />
                        </video>
                      ) : (
                        <a
                          href={toMediaUrl(newVideoUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="h-20 flex items-center justify-center gap-2 text-indigo-400"
                          style={{ background: 'var(--bg3)' }}
                        >
                          <PlayCircle size={18} />
                          Xem preview video
                        </a>
                      )}
                    </div>
                  )}

                  {/* Add attachments section */}
                  <div
                    className="rounded-2xl border p-4 space-y-4"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                        Thêm vào bài viết của bạn
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            fileRef.current?.click()
                          }}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] hover:bg-white/[.05] transition-colors"
                          style={{ color: 'var(--text2)' }}
                        >
                          <Image size={14} className="text-[#534AB7]" />
                          Ảnh
                        </button>

                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] hover:bg-white/[.05] transition-colors"
                          style={{ color: 'var(--text2)' }}
                        >
                          <Video size={14} className="text-[#14b8a6]" />
                          Video / Tag
                        </button>

                        {uploadingImg && <Loader2 size={14} className="animate-spin text-indigo-400" />}
                      </div>
                    </div>

                    <div className="pt-3 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
                      {/* Video link input */}
                      <div>
                        <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text2)' }}>
                          Dán link video (YouTube / Drive / TikTok...)
                        </label>
                        <input
                          value={newVideoUrl}
                          onChange={e => setNewVideoUrl(e.target.value)}
                          placeholder="Dán link video tại đây..."
                          className="w-full h-10 px-3 rounded-xl border text-[12px] outline-none"
                          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        />
                      </div>

                      {/* Tags input & chips */}
                      <div>
                        <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text2)' }}>
                          Tags phụ ({selectedTags.length}/8)
                        </label>

                        {selectedTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/[.02] border border-white/[.04] mb-3">
                            {selectedTags.map(t => (
                              <span
                                key={t}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                              >
                                #{t}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(t)}
                                  className="hover:text-red-400 transition-colors font-bold"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <input
                          disabled={selectedTags.length >= 8}
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder={selectedTags.length >= 8 ? 'Đã đạt giới hạn. Xoá bớt để thêm mới' : 'Nhập tag phụ rồi nhấn Enter...'}
                          className="w-full h-10 px-3 rounded-xl border text-[12px] outline-none disabled:opacity-40"
                          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        />

                        {/* Tag Suggestions list */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {[
                            'Toán', 'Tiếng Anh', 'Lập trình', 'Vật lý', 'Hóa học', 'Sinh học',
                            'Ngữ văn', 'IELTS', 'TOEIC', 'AI/ML', 'Python', 'Java'
                          ].filter(t => !selectedTags.some(st => normalizeText(st) === normalizeText(t)))
                            .map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleAddTag(t)}
                                className="text-[10px] px-2.5 py-1 rounded-full border hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/[.05] transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg2)' }}
                              >
                                + {t}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI check result */}
                  {(aiCheckResult || aiWarningText) && (
                    <div
                      className="p-3.5 rounded-xl border flex flex-col gap-2"
                      style={{
                        background: aiCheckResult?.safetyStatus === 'VIOLATION'
                          ? 'rgba(239,68,68,.08)'
                          : aiCheckResult?.safetyStatus === 'WARNING' || aiWarningText
                            ? 'rgba(245,158,11,.08)'
                            : 'rgba(16,185,129,.08)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-start gap-2 text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p>{aiWarningText || aiCheckResult?.message}</p>
                          {aiCheckResult && (
                            <p className="text-[11px]" style={{ color: 'var(--text2)' }}>
                              Môn AI phát hiện: <strong>{aiCheckResult.detectedSubject || 'Khác'}</strong>
                              {' · '}
                              Khớp tag: {aiCheckResult.tagMatch ? 'Có' : 'Không'}
                              {' · '}
                              An toàn: {aiCheckResult.safetyStatus}
                            </p>
                          )}
                          {aiCheckResult?.suggestedTags?.length ? (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {aiCheckResult.suggestedTags.slice(0, 5).map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleAddTag(tag)}
                                  className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                                >
                                  + {tag}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {aiCheckResult && !aiCheckResult.tagMatch && aiCheckResult.detectedSubject && (
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const detected = aiCheckResult.detectedSubject
                              if (SUBJECTS.includes(detected)) {
                                setNewSubject(detected)
                              }
                              handleAddTag(detected)
                              setAiWarningText(null)
                              toast.success(`Đã cập nhật gợi ý môn/tag: ${detected}`)
                            }}
                            className="px-3 py-1 rounded text-[10px] font-bold text-white"
                            style={{ background: '#534AB7' }}
                          >
                            Áp dụng gợi ý AI
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiWarningText(null)
                              setAiCheckResult(null)
                            }}
                            className="px-3 py-1 rounded text-[10px] font-bold border"
                            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                          >
                            Giữ nguyên
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={handleAiPrevalidate}
                    disabled={aiCheckLoading}
                    className="px-3.5 py-2 border rounded-xl text-[11px] font-bold border-emerald-500/20 hover:bg-emerald-500/10 flex items-center gap-1.5 transition-all duration-300 disabled:opacity-50"
                    style={{ color: 'var(--text2)' }}
                  >
                    {aiCheckLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-emerald-500" />}
                    AI kiểm duyệt trước
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 border rounded-xl text-[12px] font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={submittingPost || uploadingImg || !newTitle.trim() || !newContent.trim()}
                      className="px-5 py-2 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 shadow-lg"
                      style={{ background: '#534AB7' }}
                    >
                      {submittingPost && <Loader2 size={13} className="animate-spin" />}
                      {editingPostId ? 'Cập nhật bài viết' : 'Đăng bài viết'}
                    </button>
                  </div>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onClick={e => e.stopPropagation()}
                multiple
                className="hidden"
                onChange={e => {
                  handleImageFiles(e.target.files)
                  e.currentTarget.value = ''
                }}
              />
            </div>
          )}

          {/* Simple Inline Post trigger (Always visible, opens Modal) */}
          <div
            className="border rounded-2xl p-4 flex items-center gap-3.5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
              <UserAvatar name={user?.fullName} avatar={user?.avatar} size={40} />

              <button
                onClick={() => setComposeExpanded(true)}
                className="flex-1 h-11 px-4 rounded-xl flex items-center text-[12px] text-left transition-colors font-medium border"
                style={{ background: 'var(--bg3)', borderColor: 'transparent', color: 'var(--text3)' }}
              >
                Bạn đang muốn chia sẻ điều gì?
              </button>

              <button
                onClick={() => setComposeExpanded(true)}
                className="w-11 h-11 rounded-xl text-white flex items-center justify-center transition-colors shadow-md hover:scale-105"
                style={{ background: '#534AB7' }}
              >
                <PenSquare size={16} />
              </button>
            </div>

          {/* Tab Menu & Intelligent Tag Filter Row */}
          <div className="space-y-3">
            {/* Filter Tabs */}
            <div className="flex gap-2 border-b pb-2" style={{ borderColor: "var(--border)" }}>
              {([
                ['feed', 'Dành cho bạn'],
                ['latest', 'Mới nhất'],
                ['saved', 'Đã lưu'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all relative"
                  style={{
                    color: activeTab === id ? '#a5b4fc' : 'var(--text3)'
                  }}
                >
                  {label}
                  {activeTab === id && (
                    <div className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#534AB7] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Subject horizontal scrolling chips with arrows and fade gradients */}
            <div className="relative flex items-center">
              {/* Fade gradient left */}
              {showLeftArrow && (
                <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, var(--bg), transparent)" }} />
              )}
              {showLeftArrow && (
                <button
                  onClick={() => scrollFilters('left')}
                  className="absolute left-1 border p-1.5 rounded-full shadow z-20 transition-colors"
                  style={{ background: "var(--bg2)", borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  <ChevronLeft size={13} />
                </button>
              )}

              {/* Scroll Container */}
              <div
                ref={filterRowRef}
                className="flex gap-2 overflow-x-auto scroll-none scroll-smooth flex-1 py-1.5 px-2.5"
              >
                {SUBJECTS.map(t => {
                  const isActive = activeTag === t
                  return (
                    <button
                      key={t}
                      onClick={() => setActiveTag(t)}
                      className="px-4 py-1.5 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-all duration-300"
                      style={{
                        borderColor: isActive ? '#534AB7' : 'var(--border)',
                        background: isActive ? 'rgba(99,102,241,.15)' : 'transparent',
                        color: isActive ? '#818cf8' : 'var(--text2)',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>

              {/* Popover "Tất cả tag" Trigger */}
              <div className="relative flex-shrink-0 pl-2 pr-1" ref={explorerRef}>
                <button
                  onClick={() => setShowTagExplorer(v => !v)}
                  className="h-8 px-3 rounded-full border text-[11px] font-bold flex items-center gap-1 transition-all"
                  style={{ background: "var(--bg2)", borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  <Filter size={11} className="text-[#534AB7]" />
                  Tất cả tag
                  <ChevronDown size={11} className={clsx('transition-all', showTagExplorer && 'rotate-180')} />
                </button>

                {/* Intelligent Popover content */}
                {showTagExplorer && (
                  <div
                    className="absolute right-0 top-10 w-72 rounded-2xl p-4 border shadow-2xl z-30 space-y-3.5"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2 border rounded-lg px-2.5 h-8" style={{ background: "var(--bg3)", borderColor: "var(--border)" }}>
                      <Search size={12} className="flex-shrink-0" style={{ color: "var(--text3)" }} />
                      <input
                        value={tagSearchText}
                        onChange={e => setTagSearchText(e.target.value)}
                        placeholder="Tìm tag phụ học tập..."
                        className="bg-transparent border-none outline-none text-[11px] w-full"
                        style={{ color: 'var(--text)' }}
                      />
                    </div>

                    {/* Tag collections */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text3)' }}>
                          Gợi ý / Phổ biến
                        </div>
                        {activeTag !== 'Tất cả' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTag('Tất cả')
                              setShowTagExplorer(false)
                            }}
                            className="text-[10px] font-semibold text-red-400 hover:text-red-300"
                          >
                            Xóa bộ lọc
                          </button>
                        )}
                      </div>
                      {filteredExplorerTags.length === 0 ? (
                        <div className="text-[10px] py-1" style={{ color: 'var(--text3)' }}>Không tìm thấy tag nào</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                          {filteredExplorerTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setActiveTag(tag)
                                setShowTagExplorer(false)
                              }}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded border transition-all"
                              style={{
                                background: activeTag === tag ? 'rgba(99,102,241,.15)' : 'var(--bg3)',
                                borderColor: activeTag === tag ? '#534AB7' : 'var(--border)',
                                color: activeTag === tag ? '#818cf8' : 'var(--text2)',
                              }}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fade gradient right */}
              {showRightArrow && (
                <div className="absolute right-20 top-0 bottom-0 w-12 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, var(--bg), transparent)" }} />
              )}
              {showRightArrow && (
                <button
                  onClick={() => scrollFilters('right')}
                  className="absolute right-24 border p-1.5 rounded-full shadow z-20 transition-colors"
                  style={{ background: "var(--bg2)", borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  <ChevronRight size={13} />
                </button>
              )}
            </div>

            {/* Clear Filters bar */}
            {activeTag !== 'Tất cả' && (
              <div className="flex items-center justify-between border rounded-xl px-3 py-1.5 text-[11px]" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1" style={{ color: 'var(--text3)' }}>
                  Đang lọc theo tag:
                  <span className="font-bold text-indigo-400">#{activeTag}</span>
                </div>
                <button
                  onClick={() => setActiveTag('Tất cả')}
                  className="font-semibold text-red-400 hover:text-red-300"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* Main Feed Post List */}
          {loading ? (
            <div className="flex flex-col items-center py-20">
              <Loader2 size={24} className="animate-spin text-[#534AB7] mb-3" />
              <p className="text-[13px] text-zinc-400">Đang tải bài viết...</p>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div
              className="flex flex-col items-center py-20 border rounded-2xl"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <p className="text-3xl mb-3">📝</p>
              <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
                {activeTab === 'saved' ? 'Bạn chưa lưu bài viết nào' : 'Chưa có bài viết nào'}
              </p>
              <button
                onClick={() => setComposeExpanded(true)}
                className="mt-2 px-4 py-2 bg-[#534AB7] hover:opacity-90 rounded-xl text-[12px] text-white font-bold transition-all"
              >
                Viết bài đầu tiên
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {visiblePosts.map((p, idx) => (
                  <PostCard
                    key={p.id || `post-${idx}`}
                    post={p}
                    onLike={handleLike}
                    onSave={handleSave}
                    onComment={setCommentPost}
                    onDelete={handleDelete}
                    onHide={handleHide}
                    onEdit={handleEditClick}
                    onResubmit={handleResubmit}
                    onReport={setReportPostId}
                  />
                ))}
              </div>

              {hasMore && activeTab !== 'saved' && (
                <button
                  onClick={() => load(page + 1, activeTag, false)}
                  disabled={loadMore}
                  className="w-full py-3 rounded-2xl border text-[12px] font-bold transition-all flex items-center justify-center gap-2 hover:bg-white/[.03]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                >
                  {loadMore ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <ChevronDown size={13} />}
                  {loadMore ? 'Đang tải...' : 'Xem thêm'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block space-y-4">
          <TrendingSidebar
            items={trending.filter(p => !hiddenPostIds.includes(p.id))}
            onOpenPost={(id) => navigate(`/blog/${id}`)}
          />

          {/* Tag Sidebar box */}
          <div
            className="border rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              <Sparkles size={14} className="text-[#534AB7]" />
              <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Tags hay dùng nhất</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.length === 0 ? (
                <div className="text-[11px]" style={{ color: "var(--text3)" }}>Chưa có tag phụ nào</div>
              ) : (
                popularTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded transition-all border"
                    style={{
                      background: activeTag === tag ? 'rgba(99,102,241,.15)' : 'var(--bg3)',
                      borderColor: activeTag === tag ? '#534AB7' : 'var(--border)',
                      color: activeTag === tag ? '#818cf8' : 'var(--text2)',
                    }}
                  >
                    #{tag}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
