import { useMemo, useRef, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  MessageSquare,
  FileText,
  KanbanSquare,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Heart,
  Send,
  Paperclip,
  Info,
  UserPlus,
  Clock3,
  MoreHorizontal,
  Reply,
  UserMinus,
  LogOut,
  Bookmark,
  Flag,
  EyeOff,
  Trash2,
  Share2,
  FolderOpen,
  X,
  File,
  FileSpreadsheet,
  FileImage,
  Presentation,
  Check,
  Activity,
  Pencil,
  Save,
} from 'lucide-react'
import { dmApi, documentApi, groupApi, groupPostApi, studyDriveApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type PostAttachment = {
  name: string
  url: string
  type: string
  sizeKb: number
}

type PostReport = {
  id: string
  userId: string
  fullName: string
  reason: string
  createdAt: string
}

type GroupPost = {
  id: string
  groupId: string
  authorId: string
  authorName: string
  authorAvatar?: string | null
  content: string
  imageUrls?: string[]
  videoUrl?: string
  attachments?: PostAttachment[]
  likedBy?: string[]
  likesCount?: number
  commentsCount?: number
  createdAt: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  reports?: PostReport[]
  comments: {
    id: string
    authorId: string
    authorName: string
    authorAvatar?: string | null
    content: string
    createdAt: string
    replies?: {
      id: string
      authorId: string
      authorName: string
      authorAvatar?: string | null
      content: string
      createdAt: string
    }[]
  }[]
}

const BACKEND = 'http://localhost:8080/api'

function resolveAvatarUrl(avatar?: string | null) {
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar
  return `${BACKEND}${avatar.startsWith('/') ? avatar : `/${avatar}`}`
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${BACKEND}${url.startsWith('/') ? url : `/${url}`}`
}

function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatSize(sizeKb?: number) {
  if (!sizeKb || sizeKb <= 0) return '0 KB'
  if (sizeKb < 1024) return `${sizeKb} KB`
  return `${(sizeKb / 1024).toFixed(1)} MB`
}

function getAttachmentIcon(type?: string) {
  switch ((type || '').toUpperCase()) {
    case 'PDF':
      return <FileText size={16} />
    case 'DOC':
    case 'DOCX':
      return <File size={16} />
    case 'PPT':
    case 'PPTX':
      return <Presentation size={16} />
    case 'XLS':
    case 'XLSX':
    case 'EXCEL':
      return <FileSpreadsheet size={16} />
    case 'IMAGE':
      return <FileImage size={16} />
    default:
      return <FolderOpen size={16} />
  }
}

function Avatar({
  name,
  avatar,
  size = 40,
}: {
  name?: string
  avatar?: string | null
  size?: number
}) {
  const [imgError, setImgError] = useState(false)
  const url = resolveAvatarUrl(avatar)

  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      }}
    >
      {url && !imgError ? (
        <img
          src={url}
          alt={name ?? 'avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="text-white font-semibold"
          style={{ fontSize: size <= 32 ? '11px' : '13px' }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  )
}

function timeAgo(input?: string) {
  if (!input) return ''
  const diff = Date.now() - new Date(input).getTime()
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)

  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  if (hour < 24) return `${hour} giờ trước`
  return `${day} ngày trước`
}

export default function GroupDetailPage() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [tab, setTab] = useState<'posts' | 'pending' | 'reported' | 'members' | 'about'>('posts')
  const [postText, setPostText] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [openReplyBox, setOpenReplyBox] = useState<Record<string, boolean>>({})
  const [showMentionBox, setShowMentionBox] = useState(false)

  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<File[]>([])

  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null)
  const [hiddenPosts, setHiddenPosts] = useState<Record<string, boolean>>({})
  const [sharePost, setSharePost] = useState<GroupPost | null>(null)

  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editCoverColor, setEditCoverColor] = useState('#6366f1')
  const [editPublicVisible, setEditPublicVisible] = useState(true)
  const [editRequireApproval, setEditRequireApproval] = useState(false)
  const [editRequirePostApproval, setEditRequirePostApproval] = useState(false)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: () => groupApi.get(groupId),
    enabled: !!groupId,
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupApi.getMembers(groupId),
    enabled: !!groupId,
  })

  useEffect(() => {
    if (!group) return
    setEditName(group.name || '')
    setEditDescription(group.description || '')
    setEditSubject(group.subject || '')
    setEditCoverColor(group.coverColor || '#6366f1')
    setEditPublicVisible(!!group.publicVisible)
    setEditRequireApproval(!!group.requireApproval)
    setEditRequirePostApproval(!!group.requirePostApproval)
  }, [group])

  const memberSuggestions = useMemo(
    () =>
      (members ?? []).map((m: any) => ({
        id: m.userId,
        name: m.fullName,
      })),
    [members]
  )

  const myMember = useMemo(
    () => (members ?? []).find((m: any) => String(m.userId) === String(user?.id)),
    [members, user]
  )

  const isLeader = myMember?.role === 'LEADER'

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: () => groupPostApi.list(groupId),
    enabled: !!groupId,
  })

  const { data: pendingPosts = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['group-posts-pending', groupId],
    queryFn: () => groupPostApi.getPending(groupId),
    enabled: !!groupId && isLeader,
  })

  const { data: reportedPosts = [], isLoading: reportedLoading } = useQuery({
    queryKey: ['group-posts-reported', groupId],
    queryFn: () => groupPostApi.getReported(groupId),
    enabled: !!groupId && isLeader,
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: () => dmApi.conversations(),
    enabled: !!sharePost,
  })

  const visiblePosts = useMemo(
    () => (posts as GroupPost[]).filter(post => !hiddenPosts[post.id]),
    [posts, hiddenPosts]
  )

  const createPostMut = useMutation({
    mutationFn: async () => {
      const content = postText.trim()
      if (!content) throw new Error('Bạn chưa nhập nội dung bài viết')

      const imageUrls: string[] = []
      for (const file of selectedImages) {
        const res = await groupPostApi.uploadImage(file)
        imageUrls.push(res.url)
      }

      let videoUrl = ''
      if (selectedVideo) {
        const res = await groupPostApi.uploadVideo(selectedVideo)
        videoUrl = res.url
      }

      const attachments: PostAttachment[] = []
      if (selectedDocs.length > 0) {
        for (const file of selectedDocs) {
          const doc = await documentApi.upload(groupId, file)
          attachments.push({
            name: doc.name,
            url: doc.fileUrl,
            type: doc.type,
            sizeKb: doc.sizeKb,
          })
        }
      }

      return groupPostApi.create(groupId, {
        content,
        imageUrls,
        videoUrl,
        attachments,
      })
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-pending', groupId] })
      qc.invalidateQueries({ queryKey: ['documents', groupId] })
      setPostText('')
      setSelectedImages([])
      setSelectedVideo(null)
      setSelectedDocs([])
      setShowMentionBox(false)
      setShowAttachMenu(false)

      if (res?.status === 'PENDING') {
        toast.success('Bài viết đã được gửi và đang chờ trưởng nhóm duyệt')
      } else {
        toast.success('Đã đăng bài trong nhóm')
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || e?.response?.data?.message || 'Không đăng bài được')
    },
  })

  const updateGroupMut = useMutation({
    mutationFn: () =>
      groupApi.update(groupId, {
        name: editName.trim(),
        description: editDescription.trim(),
        subject: editSubject.trim(),
        coverColor: editCoverColor,
        publicVisible: editPublicVisible,
        requireApproval: editRequireApproval,
        requirePostApproval: editRequirePostApproval,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-detail', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
      setShowEditGroup(false)
      toast.success('Đã cập nhật thông tin nhóm')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể cập nhật nhóm')
    },
  })

  const likePostMut = useMutation({
    mutationFn: (postId: string) => groupPostApi.like(groupId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
    },
    onError: () => toast.error('Không thể thích bài viết'),
  })

  const addCommentMut = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      groupPostApi.addComment(groupId, postId, content),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      setCommentDrafts(prev => ({ ...prev, [vars.postId]: '' }))
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể bình luận')
    },
  })

  const replyCommentMut = useMutation({
    mutationFn: ({
      postId,
      commentId,
      content,
    }: {
      postId: string
      commentId: string
      content: string
    }) => groupPostApi.replyComment(groupId, postId, commentId, content),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      setReplyDrafts(prev => ({ ...prev, [vars.commentId]: '' }))
      setOpenReplyBox(prev => ({ ...prev, [vars.commentId]: false }))
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể trả lời bình luận')
    },
  })

  const deletePostMut = useMutation({
    mutationFn: (postId: string) => groupPostApi.delete(groupId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-pending', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-reported', groupId] })
      setPostMenuOpen(null)
      toast.success('Đã xoá bài viết')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể xoá bài viết')
    },
  })

  const approvePostMut = useMutation({
    mutationFn: (postId: string) => groupPostApi.approve(groupId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-pending', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-reported', groupId] })
      toast.success('Đã duyệt bài viết')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể duyệt bài viết')
    },
  })

  const rejectPostMut = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason?: string }) =>
      groupPostApi.reject(groupId, postId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-pending', groupId] })
      qc.invalidateQueries({ queryKey: ['group-posts-reported', groupId] })
      toast.success('Đã từ chối bài viết')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể từ chối bài viết')
    },
  })

  const hidePostMut = useMutation({
    mutationFn: (postId: string) => groupPostApi.hide(groupId, postId),
    onSuccess: (_, postId) => {
      setHiddenPosts(prev => ({ ...prev, [postId]: true }))
      setPostMenuOpen(null)
      qc.invalidateQueries({ queryKey: ['group-posts', groupId] })
      toast.success('Đã ẩn bài viết')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể ẩn bài viết')
    },
  })

  const reportPostMut = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason?: string }) =>
      groupPostApi.report(groupId, postId, reason),
    onSuccess: () => {
      setPostMenuOpen(null)
      qc.invalidateQueries({ queryKey: ['group-posts-reported', groupId] })
      toast.success('Đã gửi báo cáo tới trưởng nhóm')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể báo cáo bài viết')
    },
  })

  const leaveGroupMut = useMutation({
    mutationFn: () => groupApi.leave(groupId),
    onSuccess: () => {
      toast.success('Đã rời nhóm')
      navigate('/groups')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể rời nhóm')
    },
  })

  const removeMemberMut = useMutation({
    mutationFn: (userId: string) => groupApi.removeMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-members', groupId] })
      qc.invalidateQueries({ queryKey: ['group-detail', groupId] })
      toast.success('Đã đuổi thành viên khỏi nhóm')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Không thể đuổi thành viên')
    },
  })

  const saveStudyMut = useMutation({
    mutationFn: (post: GroupPost) =>
      studyDriveApi.savePost({
        sourceId: post.id,
        sourceType: 'GROUP_POST',
        title: post.content.slice(0, 80) || 'Bài viết nhóm',
        description: post.content,
        groupId,
        groupName: group?.name,
        imageUrls: post.imageUrls ?? [],
        videoUrl: post.videoUrl ?? '',
        attachments: post.attachments ?? [],
      }),
    onSuccess: () => {
      toast.success('Đã lưu vào học tập cá nhân')
      setPostMenuOpen(null)
    },
    onError: () => {
      toast.error('Không thể lưu vào học tập cá nhân')
    },
  })

  const shareMut = useMutation({
    mutationFn: async ({ userId, post }: { userId: string; post: GroupPost }) => {
      const preview = post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content
      const lines = [
        `📚 Chia sẻ từ nhóm: ${group?.name ?? 'Nhóm học tập'}`,
        `👤 Người đăng: ${post.authorName}`,
        '',
        preview || 'Bài viết nhóm',
        '',
        `Mở nhóm: http://localhost:5173/groups/${groupId}`,
      ]
      return dmApi.send(userId, lines.join('\n'), 'TEXT')
    },
    onSuccess: (_, vars) => {
      toast.success('Đã chia sẻ vào tin nhắn')
      setSharePost(null)
      navigate(`/inbox/${vars.userId}`)
    },
    onError: () => toast.error('Không thể chia sẻ bài viết'),
  })

  const handleCreatePost = () => {
    createPostMut.mutate()
  }

  const handleAddComment = (postId: string) => {
    const value = (commentDrafts[postId] ?? '').trim()
    if (!value) return
    addCommentMut.mutate({ postId, content: value })
  }

  const handleReplyComment = (postId: string, commentId: string) => {
    const value = (replyDrafts[commentId] ?? '').trim()
    if (!value) return
    replyCommentMut.mutate({ postId, commentId, content: value })
  }

  const openReplyForComment = (commentId: string, mentionName?: string) => {
    setOpenReplyBox(prev => ({ ...prev, [commentId]: true }))
    if (mentionName) {
      setReplyDrafts(prev => {
        const current = prev[commentId] ?? ''
        if (current.trim()) return prev
        return { ...prev, [commentId]: `@${mentionName} ` }
      })
    }
  }

  const handleMention = (name: string) => {
    setPostText(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@${name} `)
    setShowMentionBox(false)
  }

  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setSelectedVideo(null)
    setSelectedImages(files.slice(0, 6))
  }

  const handlePickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setSelectedImages([])
    setSelectedVideo(file)
  }

  const handlePickDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setSelectedDocs(prev => [...prev, ...files])
    toast.success(`Đã chọn ${files.length} tệp`)
  }

  const handleHidePost = (postId: string) => {
    hidePostMut.mutate(postId)
  }

  const handleSavePost = (post: GroupPost) => {
    saveStudyMut.mutate(post)
  }

  const handleSharePost = (post: GroupPost) => {
    setPostMenuOpen(null)
    setSharePost(post)
  }

  const handleReportPost = (postId: string) => {
    const reason = window.prompt('Lý do báo cáo bài viết:', 'Nội dung không phù hợp') || ''
    reportPostMut.mutate({ postId, reason })
  }

  if (groupLoading) {
    return (
      <div className="page-enter max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-40 rounded-3xl bg-white/[.04]" />
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-8 h-80 rounded-3xl bg-white/[.04]" />
            <div className="col-span-4 h-80 rounded-3xl bg-white/[.04]" />
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="page-enter max-w-4xl mx-auto py-16 text-center">
        <div className="text-[18px] font-semibold text-white">Không tìm thấy nhóm</div>
        <button
          onClick={() => navigate('/groups')}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm"
        >
          Quay lại nhóm
        </button>
      </div>
    )
  }

  const isPublic = !!group.publicVisible
  const requireApproval = !!group.requireApproval
  const requirePostApproval = !!group.requirePostApproval
  const pendingCount = (pendingPosts as any[]).length
  const reportedCount = (reportedPosts as any[]).length

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-5">
      <section
        className="rounded-[28px] overflow-hidden border"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div
          className="h-40 relative"
          style={{
            background: `linear-gradient(135deg, ${group.coverColor || '#6366f1'}55, #111827 85%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.12),transparent_35%)]" />

          <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
            <div className="flex items-end gap-4 min-w-0">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center border"
                style={{
                  background: `${group.coverColor || '#6366f1'}22`,
                  borderColor: `${group.coverColor || '#6366f1'}55`,
                }}
              >
                <Users size={34} style={{ color: group.coverColor || '#6366f1' }} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[28px] font-bold text-white truncate">{group.name}</h1>

                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{
                      background: isPublic ? 'rgba(34,197,94,.12)' : 'rgba(244,63,94,.12)',
                      color: isPublic ? '#22c55e' : '#f43f5e',
                      border: isPublic
                        ? '1px solid rgba(34,197,94,.24)'
                        : '1px solid rgba(244,63,94,.24)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                      {isPublic ? 'Công khai' : 'Riêng tư'}
                    </span>
                  </span>

                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{
                      background: requireApproval ? 'rgba(245,158,11,.12)' : 'rgba(99,102,241,.12)',
                      color: requireApproval ? '#f59e0b' : '#818cf8',
                      border: requireApproval
                        ? '1px solid rgba(245,158,11,.24)'
                        : '1px solid rgba(99,102,241,.24)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {requireApproval ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                      {requireApproval ? 'Tham gia cần duyệt' : 'Vào ngay'}
                    </span>
                  </span>

                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{
                      background: requirePostApproval ? 'rgba(245,158,11,.12)' : 'rgba(34,197,94,.12)',
                      color: requirePostApproval ? '#f59e0b' : '#22c55e',
                      border: requirePostApproval
                        ? '1px solid rgba(245,158,11,.24)'
                        : '1px solid rgba(34,197,94,.24)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {requirePostApproval ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                      {requirePostApproval ? 'Bài đăng cần duyệt' : 'Đăng bài tự do'}
                    </span>
                  </span>
                </div>

                <p className="mt-1 text-[14px]" style={{ color: 'rgba(255,255,255,.82)' }}>
                  {group.subject} · {(members ?? []).length} thành viên
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isLeader && (
                <button
                  onClick={() => {
                    if (window.confirm('Bạn có chắc muốn rời nhóm không?')) {
                      leaveGroupMut.mutate()
                    }
                  }}
                  className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium border"
                  style={{ borderColor: 'rgba(255,255,255,.16)', color: '#fff', background: 'rgba(239,68,68,.18)' }}
                >
                  <LogOut size={15} />
                  Rời nhóm
                </button>
              )}

              <Link
                to={`/groups/${groupId}/chat`}
                className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium border"
                style={{ borderColor: 'rgba(255,255,255,.16)', color: '#fff', background: 'rgba(255,255,255,.06)' }}
              >
                <MessageSquare size={15} />
                Chat
              </Link>

              <Link
                to={`/groups/${groupId}/kanban`}
                className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium border"
                style={{ borderColor: 'rgba(255,255,255,.16)', color: '#fff', background: 'rgba(255,255,255,.06)' }}
              >
                <KanbanSquare size={15} />
                Task
              </Link>

              <Link
                to={`/groups/${groupId}/docs`}
                className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium border"
                style={{ borderColor: 'rgba(255,255,255,.16)', color: '#fff', background: 'rgba(255,255,255,.06)' }}
              >
                <FileText size={15} />
                Tài liệu
              </Link>

              <Link
                to="/study-drive"
                className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium border"
                style={{ borderColor: 'rgba(255,255,255,.16)', color: '#fff', background: 'rgba(99,102,241,.20)' }}
              >
                <FolderOpen size={15} />
                Học tập cá nhân
              </Link>
            </div>
          </div>
        </div>

        <div
          className="px-5 py-4 border-t"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text2)' }}>
            {group.description}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <div
            className="rounded-2xl p-2 border flex items-center gap-2 flex-wrap"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            {[
              { key: 'posts', label: 'Bài viết', icon: FileText },
              ...(isLeader
                ? [
                    { key: 'pending', label: 'Chờ duyệt', icon: ShieldAlert },
                    { key: 'reported', label: 'Báo cáo', icon: Flag },
                  ]
                : []),
              { key: 'members', label: 'Thành viên', icon: Users },
              { key: 'about', label: 'Giới thiệu', icon: Info },
            ].map((t: any) => {
              const badgeCount =
                t.key === 'pending'
                  ? pendingCount
                  : t.key === 'reported'
                    ? reportedCount
                    : 0

              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={clsx(
                    'h-10 px-4 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-all relative',
                    tab === t.key ? 'text-white' : ''
                  )}
                  style={
                    tab === t.key
                      ? { background: 'rgba(99,102,241,.18)', color: '#a5b4fc' }
                      : { color: 'var(--text3)' }
                  }
                >
                  <t.icon size={15} />
                  {t.label}

                  {isLeader && badgeCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center"
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        lineHeight: 1,
                        boxShadow: '0 0 0 2px var(--bg2)',
                      }}
                    >
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {tab === 'posts' && (
            <>
              <div
                className="rounded-3xl border p-4"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={user?.fullName} avatar={user?.avatar} size={42} />

                  <div className="flex-1 relative">
                    <textarea
                      value={postText}
                      onChange={(e) => {
                        setPostText(e.target.value)
                        setShowMentionBox(e.target.value.includes('@'))
                      }}
                      rows={4}
                      placeholder={`Chia sẻ điều gì đó với nhóm ${group.name}...`}
                      className="w-full rounded-2xl px-4 py-3 resize-none outline-none text-[14px]"
                      style={{
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                    />

                    {showMentionBox && memberSuggestions.length > 0 && (
                      <div
                        className="absolute left-0 right-0 mt-2 rounded-2xl border shadow-xl overflow-hidden z-20"
                        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                      >
                        <div className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--text3)' }}>
                          Gợi ý nhắc thành viên
                        </div>
                        {memberSuggestions.slice(0, 6).map((m: any) => (
                          <button
                            key={m.id}
                            onClick={() => handleMention(m.name)}
                            className="w-full text-left px-3 py-2 hover:bg-white/[.04] text-sm"
                            style={{ color: 'var(--text)' }}
                          >
                            @{m.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {(selectedImages.length > 0 || selectedVideo || selectedDocs.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {selectedImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {selectedImages.map((file, idx) => (
                              <div key={idx} className="relative rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt="preview"
                                  className="w-full h-40 object-cover"
                                />
                                <button
                                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedVideo && (
                          <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                            <video
                              src={URL.createObjectURL(selectedVideo)}
                              controls
                              className="w-full max-h-[320px] bg-black"
                            />
                            <button
                              onClick={() => setSelectedVideo(null)}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {selectedDocs.length > 0 && (
                          <div className="space-y-2">
                            {selectedDocs.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-2xl px-3 py-2 border"
                                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderOpen size={16} style={{ color: '#818cf8' }} />
                                  <span className="text-[12px] truncate" style={{ color: 'var(--text)' }}>
                                    {file.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setSelectedDocs(prev => prev.filter((_, i) => i !== idx))}
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handlePickImages}
                    />

                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={handlePickVideo}
                    />

                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                      multiple
                      hidden
                      onChange={handlePickDocs}
                    />

                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      hidden
                      onChange={handlePickDocs}
                      {...({ webkitdirectory: 'true', directory: 'true' } as any)}
                    />

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="relative">
                        <button
                          type="button"
                          className="h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm"
                          style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                          onClick={() => setShowAttachMenu(prev => !prev)}
                        >
                          <Paperclip size={16} />
                          Đính kèm
                        </button>

                        {showAttachMenu && (
                          <div
                            className="absolute left-0 top-12 w-52 rounded-2xl border shadow-xl z-20 overflow-hidden"
                            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                          >
                            <button
                              onClick={() => {
                                imageInputRef.current?.click()
                                setShowAttachMenu(false)
                              }}
                              className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                              style={{ color: 'var(--text)' }}
                            >
                              Ảnh
                            </button>
                            <button
                              onClick={() => {
                                videoInputRef.current?.click()
                                setShowAttachMenu(false)
                              }}
                              className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                              style={{ color: 'var(--text)' }}
                            >
                              Video
                            </button>
                            <button
                              onClick={() => {
                                docInputRef.current?.click()
                                setShowAttachMenu(false)
                              }}
                              className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                              style={{ color: 'var(--text)' }}
                            >
                              Tài liệu
                            </button>
                            <button
                              onClick={() => {
                                folderInputRef.current?.click()
                                setShowAttachMenu(false)
                              }}
                              className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                              style={{ color: 'var(--text)' }}
                            >
                              Folder
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm"
                          style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                          onClick={() => setPostText(prev => `${prev}${prev ? ' ' : ''}@`)}
                        >
                          <UserPlus size={16} />
                          @ Nhắc
                        </button>

                        <button
                          onClick={handleCreatePost}
                          disabled={createPostMut.isPending}
                          className="h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-medium text-white disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                        >
                          <Send size={15} />
                          {createPostMut.isPending ? 'Đang đăng...' : 'Đăng bài'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {postsLoading ? (
                <div
                  className="rounded-3xl border p-8 text-center text-sm"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text3)' }}
                >
                  Đang tải bài viết...
                </div>
              ) : visiblePosts.length === 0 ? (
                <div
                  className="rounded-3xl border p-10 text-center"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                    Chưa có bài viết nào
                  </div>
                  <p className="mt-2 text-[13px]" style={{ color: 'var(--text3)' }}>
                    Hãy là người đầu tiên đăng bài trong nhóm này.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post: GroupPost) => {
                    const liked = Array.isArray(post.likedBy)
                      ? post.likedBy.includes(String(user?.id))
                      : false

                    const canDelete = String(post.authorId) === String(user?.id) || isLeader
                    const menuOpen = postMenuOpen === post.id

                    return (
                      <article
                        key={post.id}
                        className="rounded-3xl border overflow-hidden"
                        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar name={post.authorName} avatar={post.authorAvatar} size={42} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                                    {post.authorName}
                                  </div>
                                  <div className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text3)' }}>
                                    <span>{timeAgo(post.createdAt)}</span>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1">
                                      <Users size={12} />
                                      Trong nhóm {group.name}
                                    </span>
                                  </div>
                                </div>

                                <div className="relative">
                                  <button
                                    onClick={() => setPostMenuOpen(menuOpen ? null : post.id)}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
                                    title="Tùy chọn"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>

                                  {menuOpen && (
                                    <div
                                      className="absolute right-0 top-11 w-56 rounded-2xl border shadow-xl z-20 overflow-hidden"
                                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                                    >
                                      <button
                                        onClick={() => handleHidePost(post.id)}
                                        className="w-full px-3 py-3 text-left text-sm inline-flex items-center gap-2 hover:bg-white/[.04]"
                                        style={{ color: 'var(--text)' }}
                                      >
                                        <EyeOff size={15} />
                                        Ẩn bài viết
                                      </button>

                                      <button
                                        onClick={() => handleSavePost(post)}
                                        className="w-full px-3 py-3 text-left text-sm inline-flex items-center gap-2 hover:bg-white/[.04]"
                                        style={{ color: 'var(--text)' }}
                                      >
                                        <Bookmark size={15} />
                                        Lưu vào học tập cá nhân
                                      </button>

                                      <button
                                        onClick={() => handleSharePost(post)}
                                        className="w-full px-3 py-3 text-left text-sm inline-flex items-center gap-2 hover:bg-white/[.04]"
                                        style={{ color: 'var(--text)' }}
                                      >
                                        <Share2 size={15} />
                                        Chia sẻ qua tin nhắn
                                      </button>

                                      <button
                                        onClick={() => handleReportPost(post.id)}
                                        className="w-full px-3 py-3 text-left text-sm inline-flex items-center gap-2 hover:bg-white/[.04]"
                                        style={{ color: 'var(--text)' }}
                                      >
                                        <Flag size={15} />
                                        Báo cáo trưởng nhóm
                                      </button>

                                      {canDelete && (
                                        <button
                                          onClick={() => deletePostMut.mutate(post.id)}
                                          className="w-full px-3 py-3 text-left text-sm inline-flex items-center gap-2 hover:bg-white/[.04]"
                                          style={{ color: '#ef4444' }}
                                        >
                                          <Trash2 size={15} />
                                          Xóa bài viết
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div
                                className="mt-3 text-[14px] leading-7 whitespace-pre-wrap"
                                style={{ color: 'var(--text2)' }}
                              >
                                {post.content}
                              </div>

                              {!!post.imageUrls?.length && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {post.imageUrls.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={resolveMediaUrl(img)}
                                      alt="group-post"
                                      className="w-full h-48 object-cover rounded-2xl border"
                                      style={{ borderColor: 'var(--border)' }}
                                    />
                                  ))}
                                </div>
                              )}

                              {!!post.videoUrl && (
                                <div className="mt-3 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                                  <video
                                    src={resolveMediaUrl(post.videoUrl)}
                                    controls
                                    className="w-full max-h-[420px] bg-black"
                                  />
                                </div>
                              )}

                              {!!post.attachments?.length && (
                                <div className="mt-3 space-y-2">
                                  {post.attachments.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={resolveMediaUrl(file.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border hover:bg-white/[.03]"
                                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[.04]">
                                          {getAttachmentIcon(file.type)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-[13px] font-medium truncate">{file.name}</div>
                                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                                            {file.type} · {formatSize(file.sizeKb)}
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-[12px] font-medium" style={{ color: '#a5b4fc' }}>
                                        Mở
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="px-4 py-3 border-t flex items-center justify-between text-[12px]"
                          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
                        >
                          <span>{post.likesCount ?? post.likedBy?.length ?? 0} lượt thích</span>
                          <span>{post.comments?.length ?? 0} bình luận</span>
                        </div>

                        <div
                          className="px-3 py-2 border-t flex items-center gap-2"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <button
                            onClick={() => likePostMut.mutate(post.id)}
                            className="flex-1 h-11 rounded-2xl inline-flex items-center justify-center gap-2 text-sm font-medium"
                            style={{
                              background: liked ? 'rgba(236,72,153,.14)' : 'transparent',
                              color: liked ? '#ec4899' : 'var(--text2)',
                            }}
                          >
                            <Heart size={16} fill={liked ? '#ec4899' : 'none'} />
                            Thích
                          </button>

                          <button
                            className="flex-1 h-11 rounded-2xl inline-flex items-center justify-center gap-2 text-sm font-medium"
                            style={{ color: 'var(--text2)' }}
                          >
                            <MessageSquare size={16} />
                            Bình luận
                          </button>

                          <button
                            onClick={() => handleSharePost(post)}
                            className="h-11 px-4 rounded-2xl inline-flex items-center justify-center gap-2 text-sm font-medium"
                            style={{ color: 'var(--text2)' }}
                            title="Chia sẻ qua tin nhắn"
                          >
                            <Share2 size={16} />
                          </button>
                        </div>

                        <div className="px-4 pb-4 space-y-3">
                          {(post.comments ?? []).map(comment => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <Avatar name={comment.authorName} avatar={comment.authorAvatar} size={34} />
                              <div className="flex-1 space-y-2">
                                <div
                                  className="rounded-2xl px-3 py-2.5"
                                  style={{ background: 'var(--bg3)' }}
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                                      {comment.authorName}
                                    </span>
                                    <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                                      {timeAgo(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[13px]" style={{ color: 'var(--text2)' }}>
                                    {comment.content}
                                  </p>

                                  <button
                                    onClick={() => openReplyForComment(comment.id)}
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium"
                                    style={{ color: '#818cf8' }}
                                  >
                                    <Reply size={12} />
                                    Trả lời
                                  </button>
                                </div>

                                {(comment.replies ?? []).map(reply => (
                                  <div key={reply.id} className="flex items-start gap-2 ml-4">
                                    <Avatar name={reply.authorName} avatar={reply.authorAvatar} size={28} />
                                    <div
                                      className="rounded-2xl px-3 py-2 flex-1"
                                      style={{ background: 'rgba(255,255,255,.03)' }}
                                    >
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                                          {reply.authorName}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                                          {timeAgo(reply.createdAt)}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-[12px]" style={{ color: 'var(--text2)' }}>
                                        {reply.content}
                                      </p>

                                      <button
                                        onClick={() => openReplyForComment(comment.id, reply.authorName)}
                                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium"
                                        style={{ color: '#818cf8' }}
                                      >
                                        <Reply size={11} />
                                        Trả lời
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {openReplyBox[comment.id] && (
                                  <div className="flex items-center gap-2 ml-4">
                                    <input
                                      value={replyDrafts[comment.id] ?? ''}
                                      onChange={(e) =>
                                        setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          handleReplyComment(post.id, comment.id)
                                        }
                                      }}
                                      placeholder="Viết phản hồi..."
                                      className="flex-1 h-10 px-4 rounded-2xl outline-none text-[12px]"
                                      style={{
                                        background: 'var(--bg3)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text)',
                                      }}
                                    />
                                    <button
                                      onClick={() => handleReplyComment(post.id, comment.id)}
                                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                                    >
                                      <Send size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          <div className="flex items-start gap-3 pt-1">
                            <Avatar name={user?.fullName} avatar={user?.avatar} size={34} />
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                value={commentDrafts[post.id] ?? ''}
                                onChange={(e) =>
                                  setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddComment(post.id)
                                  }
                                }}
                                placeholder="Viết bình luận..."
                                className="flex-1 h-11 px-4 rounded-2xl outline-none text-[13px]"
                                style={{
                                  background: 'var(--bg3)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                              <button
                                onClick={() => handleAddComment(post.id)}
                                disabled={addCommentMut.isPending}
                                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                              >
                                <Send size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'pending' && isLeader && (
            <div
              className="rounded-3xl border p-5"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Bài viết chờ duyệt
                </h2>
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  {pendingCount} bài
                </span>
              </div>

              {pendingLoading ? (
                <div className="text-sm" style={{ color: 'var(--text3)' }}>
                  Đang tải bài chờ duyệt...
                </div>
              ) : pendingCount === 0 ? (
                <div className="text-sm" style={{ color: 'var(--text3)' }}>
                  Không có bài nào đang chờ duyệt
                </div>
              ) : (
                <div className="space-y-4">
                  {(pendingPosts as any[]).map((post: any) => (
                    <article
                      key={post.id}
                      className="rounded-2xl border p-4"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={post.authorName} avatar={post.authorAvatar} size={42} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                            {post.authorName}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {timeAgo(post.createdAt)}
                          </div>

                          <div className="mt-3 text-[14px] whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
                            {post.content}
                          </div>

                          {!!post.imageUrls?.length && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {post.imageUrls.map((img: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={resolveMediaUrl(img)}
                                  alt="pending-post"
                                  className="w-full h-44 object-cover rounded-2xl border"
                                  style={{ borderColor: 'var(--border)' }}
                                />
                              ))}
                            </div>
                          )}

                          {!!post.videoUrl && (
                            <div className="mt-3 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                              <video
                                src={resolveMediaUrl(post.videoUrl)}
                                controls
                                className="w-full max-h-[360px] bg-black"
                              />
                            </div>
                          )}

                          {!!post.attachments?.length && (
                            <div className="mt-3 space-y-2">
                              {post.attachments.map((file: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={resolveMediaUrl(file.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border"
                                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[.04]">
                                      {getAttachmentIcon(file.type)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[13px] font-medium truncate">{file.name}</div>
                                      <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                                        {file.type} · {formatSize(file.sizeKb)}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[12px] font-medium" style={{ color: '#a5b4fc' }}>
                                    Mở
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex items-center gap-2">
                            <button
                              onClick={() => approvePostMut.mutate(post.id)}
                              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
                              style={{ background: 'rgba(34,197,94,.15)', color: '#22c55e' }}
                            >
                              <Check size={15} />
                              Duyệt bài
                            </button>

                            <button
                              onClick={() => {
                                const reason = window.prompt('Lý do từ chối bài viết:', 'Nội dung chưa phù hợp') || ''
                                rejectPostMut.mutate({ postId: post.id, reason })
                              }}
                              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
                              style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444' }}
                            >
                              <X size={15} />
                              Từ chối
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'reported' && isLeader && (
            <div
              className="rounded-3xl border p-5"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Bài viết bị báo cáo
                </h2>
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  {reportedCount} bài
                </span>
              </div>

              {reportedLoading ? (
                <div className="text-sm" style={{ color: 'var(--text3)' }}>
                  Đang tải báo cáo...
                </div>
              ) : reportedCount === 0 ? (
                <div className="text-sm" style={{ color: 'var(--text3)' }}>
                  Chưa có bài nào bị báo cáo
                </div>
              ) : (
                <div className="space-y-4">
                  {(reportedPosts as any[]).map((post: any) => (
                    <article
                      key={post.id}
                      className="rounded-2xl border p-4"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={post.authorName} avatar={post.authorAvatar} size={42} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                            {post.authorName}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {timeAgo(post.createdAt)}
                          </div>

                          <div className="mt-3 text-[14px] whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
                            {post.content}
                          </div>

                          {!!post.reports?.length && (
                            <div className="mt-4 space-y-2">
                              <div className="text-[12px] font-medium" style={{ color: '#f59e0b' }}>
                                Lý do bị báo cáo:
                              </div>
                              {post.reports.map((r: any) => (
                                <div
                                  key={r.id}
                                  className="rounded-xl px-3 py-2 text-[12px]"
                                  style={{ background: 'rgba(245,158,11,.08)', color: 'var(--text2)' }}
                                >
                                  <span className="font-medium">{r.fullName}:</span> {r.reason}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex items-center gap-2">
                            <button
                              onClick={() => deletePostMut.mutate(post.id)}
                              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
                              style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444' }}
                            >
                              <Trash2 size={15} />
                              Xóa bài
                            </button>

                            <button
                              onClick={() => toast.success('Đã giữ bài viết này')}
                              className="px-4 h-10 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
                              style={{ background: 'rgba(99,102,241,.12)', color: '#a5b4fc' }}
                            >
                              <ShieldCheck size={15} />
                              Giữ bài
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div
              className="rounded-3xl border p-5"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Thành viên nhóm
                </h2>
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  {(members ?? []).length} người
                </span>
              </div>

              {membersLoading ? (
                <div className="text-sm" style={{ color: 'var(--text3)' }}>
                  Đang tải thành viên...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(members ?? []).map((m: any) => {
                    const isMe = String(m.userId) === String(user?.id)
                    const canKick = isLeader && !isMe

                    return (
                      <div
                        key={m.userId}
                        className="rounded-2xl border p-3 flex items-center gap-3"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                      >
                        <Avatar name={m.fullName} size={42} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {m.fullName}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {m.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Link
                            to={`/u/${m.userId}`}
                            className="px-3 h-9 rounded-xl text-[12px] font-medium inline-flex items-center justify-center"
                            style={{ background: 'rgba(99,102,241,.14)', color: '#a5b4fc' }}
                          >
                            Xem hồ sơ
                          </Link>

                          {isLeader && (
                            <button
                              onClick={() => toast.success(`Xem hoạt động của ${m.fullName} sẽ làm tiếp`)}
                              className="px-3 h-9 rounded-xl text-[12px] font-medium inline-flex items-center justify-center gap-1"
                              style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e' }}
                            >
                              <Activity size={13} />
                              Hoạt động
                            </button>
                          )}

                          {canKick && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Đuổi ${m.fullName} khỏi nhóm?`)) {
                                  removeMemberMut.mutate(m.userId)
                                }
                              }}
                              className="px-3 h-9 rounded-xl text-[12px] font-medium inline-flex items-center justify-center gap-1"
                              style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444' }}
                            >
                              <UserMinus size={13} />
                              Đuổi khỏi nhóm
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'about' && (
            <div
              className="rounded-3xl border p-5 space-y-4"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Giới thiệu nhóm
                </h2>

                {isLeader && (
                  <button
                    onClick={() => setShowEditGroup(true)}
                    className="px-4 h-10 rounded-xl text-sm font-medium inline-flex items-center gap-2"
                    style={{ background: 'rgba(99,102,241,.14)', color: '#a5b4fc' }}
                  >
                    <Pencil size={15} />
                    Chỉnh sửa
                  </button>
                )}
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ background: 'var(--bg3)' }}
              >
                <div className="text-[12px] mb-1" style={{ color: 'var(--text3)' }}>
                  Mô tả
                </div>
                <div className="text-[14px] leading-7" style={{ color: 'var(--text2)' }}>
                  {group.description}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg3)' }}
                >
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Môn học
                  </div>
                  <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    {group.subject}
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg3)' }}
                >
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Mã nhóm
                  </div>
                  <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    {group.inviteCode || '------'}
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg3)' }}
                >
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Vai trò của bạn
                  </div>
                  <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    {isLeader ? 'Trưởng nhóm' : 'Thành viên'}
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg3)' }}
                >
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Bài đăng
                  </div>
                  <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                    {requirePostApproval ? 'Cần duyệt trước khi hiển thị' : 'Đăng là hiện ngay'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-5">
          <div
            className="rounded-3xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-[16px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Thành viên nổi bật
            </h3>

            <div className="space-y-3">
              {(members ?? []).slice(0, 6).map((m: any) => (
                <Link key={m.userId} to={`/u/${m.userId}`} className="flex items-center gap-3 hover:opacity-90">
                  <Avatar name={m.fullName} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {m.fullName}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                      {m.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div
            className="rounded-3xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-[16px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Hoạt động nhanh
            </h3>

            <div className="space-y-2">
              <Link
                to={`/groups/${groupId}/chat`}
                className="h-11 rounded-2xl px-4 inline-flex items-center gap-3 w-full"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                <MessageSquare size={16} />
                Mở chat nhóm
              </Link>

              <Link
                to={`/groups/${groupId}/kanban`}
                className="h-11 rounded-2xl px-4 inline-flex items-center gap-3 w-full"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                <KanbanSquare size={16} />
                Xem bảng task
              </Link>

              <Link
                to={`/groups/${groupId}/docs`}
                className="h-11 rounded-2xl px-4 inline-flex items-center gap-3 w-full"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                <FileText size={16} />
                Tài liệu nhóm
              </Link>

              <Link
                to="/study-drive"
                className="h-11 rounded-2xl px-4 inline-flex items-center gap-3 w-full"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                <FolderOpen size={16} />
                Học tập cá nhân
              </Link>
            </div>
          </div>

          <div
            className="rounded-3xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-[16px] font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Thông tin nhóm
            </h3>

            <div className="space-y-3 text-[13px]">
              <div className="flex items-center gap-3" style={{ color: 'var(--text2)' }}>
                <Users size={15} />
                {(members ?? []).length} thành viên
              </div>

              <div className="flex items-center gap-3" style={{ color: 'var(--text2)' }}>
                <Clock3 size={15} />
                Hoạt động nội bộ trong nhóm
              </div>

              <div className="flex items-center gap-3" style={{ color: 'var(--text2)' }}>
                {isPublic ? <Globe size={15} /> : <Lock size={15} />}
                {isPublic ? 'Hiện mã tham gia' : 'Ẩn mã tham gia'}
              </div>

              <div className="flex items-center gap-3" style={{ color: 'var(--text2)' }}>
                {requireApproval ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
                {requireApproval ? 'Tham gia cần duyệt' : 'Nhập mã là vào ngay'}
              </div>

              <div className="flex items-center gap-3" style={{ color: 'var(--text2)' }}>
                {requirePostApproval ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
                {requirePostApproval ? 'Bài đăng cần leader duyệt' : 'Bài đăng hiển thị ngay'}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {sharePost && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center px-4">
          <div
            className="w-full max-w-lg rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Chia sẻ qua tin nhắn
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  Chọn người nhận để gửi bài viết này vào inbox
                </p>
              </div>
              <button
                onClick={() => setSharePost(null)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="mt-4 rounded-2xl p-3 border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                {sharePost.authorName}
              </div>
              <div className="mt-1 text-[13px] line-clamp-3" style={{ color: 'var(--text2)' }}>
                {sharePost.content}
              </div>
            </div>

            <div className="mt-4 max-h-[320px] overflow-y-auto space-y-2">
              {(conversations as any[]).length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text3)' }}>
                  Chưa có cuộc trò chuyện nào
                </div>
              ) : (
                (conversations as any[]).map((conv: any) => (
                  <button
                    key={conv.userId}
                    onClick={() => shareMut.mutate({ userId: conv.userId, post: sharePost })}
                    className="w-full rounded-2xl border px-3 py-3 flex items-center justify-between text-left hover:bg-white/[.03]"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={conv.user?.fullName} avatar={conv.user?.avatar} size={38} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                          {conv.user?.fullName ?? 'Người dùng'}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--text3)' }}>
                          {conv.lastMessage?.content ?? 'Nhắn tin mới'}
                        </div>
                      </div>
                    </div>

                    <div
                      className="px-3 h-9 rounded-xl inline-flex items-center justify-center gap-2 text-[12px] font-medium"
                      style={{ background: 'rgba(99,102,241,.16)', color: '#a5b4fc' }}
                    >
                      <Check size={13} />
                      Gửi
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showEditGroup && isLeader && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div
            className="w-full max-w-2xl rounded-3xl border p-5 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>
                  Chỉnh sửa giới thiệu nhóm
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  Cập nhật thông tin và chế độ hoạt động của nhóm
                </p>
              </div>
              <button
                onClick={() => setShowEditGroup(false)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Tên nhóm
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-2 w-full h-12 px-4 rounded-2xl outline-none text-[14px]"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Mô tả
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="mt-2 w-full px-4 py-3 rounded-2xl outline-none text-[14px] resize-none"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Môn học
                </label>
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="mt-2 w-full h-12 px-4 rounded-2xl outline-none text-[14px]"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Màu nhóm
                </label>
                <div
                  className="mt-2 h-12 px-3 rounded-2xl flex items-center gap-3"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <input
                    type="color"
                    value={editCoverColor}
                    onChange={(e) => setEditCoverColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[13px]" style={{ color: 'var(--text2)' }}>
                    {editCoverColor}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label
                className="rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <div>
                  <div className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                    Hiển thị mã nhóm ra ngoài
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Bật để nhóm công khai, tắt để nhóm riêng tư
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editPublicVisible}
                  onChange={(e) => setEditPublicVisible(e.target.checked)}
                />
              </label>

              <label
                className="rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <div>
                  <div className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                    Thành viên tham gia cần duyệt
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Bật để người nhập mã phải chờ trưởng nhóm duyệt
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editRequireApproval}
                  onChange={(e) => setEditRequireApproval(e.target.checked)}
                />
              </label>

              <label
                className="rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <div>
                  <div className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                    Bài đăng cần duyệt
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Bật để bài đăng mới vào tab Chờ duyệt trước khi hiện trong nhóm
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editRequirePostApproval}
                  onChange={(e) => setEditRequirePostApproval(e.target.checked)}
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowEditGroup(false)}
                className="h-10 px-4 rounded-xl text-sm font-medium"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                Hủy
              </button>

              <button
                onClick={() => updateGroupMut.mutate()}
                disabled={updateGroupMut.isPending}
                className="h-10 px-5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                <Save size={15} />
                {updateGroupMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}