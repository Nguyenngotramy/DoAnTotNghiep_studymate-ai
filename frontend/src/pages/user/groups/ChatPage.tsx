import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  ChevronRight,
  FileText,
  Hash,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pin,
  Send,
  Smile,
  Wifi,
  WifiOff,
  X,
  Reply,
  CheckSquare,
  Calendar,
  User2,
  Plus,
  Circle,
  Clock3,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { chatApi, groupApi, taskApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { ChatAttachment, ChatMessage, ChatReplyPreview, GroupMember, Task, TaskStatus } from '@/types'

const API_BASE = 'http://localhost:8080/api'
const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#22c55e', '#ec4899', '#f97316', '#3b82f6', '#8b5cf6']
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']
const EXTRA_EMOJIS = ['😀', '🥹', '😍', '😎', '🔥', '👏', '🎉', '📚', '📝', '✅']

const STATUS_META: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  TODO: { label: 'Chờ làm', color: '#94a3b8', icon: Circle },
  IN_PROGRESS: { label: 'Đang làm', color: '#f59e0b', icon: Clock3 },
  DONE: { label: 'Hoàn thành', color: '#22c55e', icon: CheckCircle2 },
}

function normalizeId(id: any): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  if (id._id) return normalizeId(id._id)
  if (id.id) return normalizeId(id.id)
  return String(id)
}

function initials(name?: string) {
  return (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(-2)
    .toUpperCase()
}

function nameColor(name: string) {
  return COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
}

function timeAgo(d?: string) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

function resolveUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}

function isImageAttachment(att: ChatAttachment) {
  const type = (att.type || '').toUpperCase()
  return type === 'IMAGE' || type === 'PNG' || type === 'JPG' || type === 'JPEG' || type === 'WEBP'
}

function fmtDate(v?: string) {
  if (!v) return 'Chưa có'
  try {
    return new Date(v).toLocaleDateString('vi-VN')
  } catch {
    return v
  }
}

function isOverdue(deadline?: string, status?: TaskStatus) {
  if (!deadline || status === 'DONE') return false
  return new Date(deadline).getTime() < Date.now()
}

function Avatar({
  name,
  avatar,
  size = 34,
}: {
  name?: string
  avatar?: string | null
  size?: number
}) {
  const [error, setError] = useState(false)
  const url = resolveUrl(avatar)

  if (url && !error) {
    return (
      <img
        src={url}
        alt={name ?? 'avatar'}
        onError={() => setError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size <= 28 ? 10 : 12,
        background: name ? nameColor(name) : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      }}
    >
      {initials(name)}
    </div>
  )
}

function AttachmentCard({ att }: { att: ChatAttachment }) {
  if (isImageAttachment(att)) {
    return (
      <a href={resolveUrl(att.url)} target="_blank" rel="noreferrer" className="block">
        <img
          src={resolveUrl(att.url)}
          alt={att.name}
          className="mt-2 rounded-2xl max-h-[260px] object-cover border"
          style={{ borderColor: 'var(--border)' }}
        />
      </a>
    )
  }

  return (
    <a
      href={resolveUrl(att.url)}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border"
      style={{
        background: 'var(--bg3)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate">{att.name}</div>
        <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
          {att.type} · {att.sizeKb} KB
        </div>
      </div>
      <span className="text-[12px] font-medium" style={{ color: '#818cf8' }}>
        Mở
      </span>
    </a>
  )
}

function ReplyPreviewBox({
  reply,
  mine,
  onClick,
}: {
  reply?: ChatReplyPreview | null
  mine?: boolean
  onClick?: () => void
}) {
  if (!reply) return null

  const hasAttachment = !!reply.attachments?.length
  const previewText =
    reply.content?.trim()
      ? reply.content
      : hasAttachment
        ? '[Tệp đính kèm]'
        : '[Tin nhắn]'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mb-2 rounded-xl px-3 py-2 text-left border-l-[3px]"
      style={{
        background: mine ? 'rgba(0,0,0,.16)' : 'rgba(99,102,241,.08)',
        borderLeftColor: mine ? 'rgba(255,255,255,.75)' : '#60a5fa',
      }}
    >
      <div
        className="text-[11px] font-semibold mb-0.5 truncate"
        style={{ color: mine ? 'rgba(255,255,255,.92)' : 'var(--text)' }}
      >
        {reply.senderName || 'Tin nhắn'}
      </div>

      <div
        className="text-[12px] truncate"
        style={{ color: mine ? 'rgba(255,255,255,.75)' : 'var(--text3)' }}
      >
        {previewText}
      </div>
    </button>
  )
}

export default function ChatPage() {
  const { groupId = '' } = useParams<{ groupId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [pinned, setPinned] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMentionBox, setShowMentionBox] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null)
  const [pickedFiles, setPickedFiles] = useState<File[]>([])
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [sideTab, setSideTab] = useState<'pinned' | 'files' | 'media' | 'members' | 'task' | 'reminder'>('pinned')
  const [replyTo, setReplyTo] = useState<ChatReplyPreview | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const focusMessageId = searchParams.get('messageId')

  const {
    data: tasks = [],
    isLoading: taskLoading,
  } = useQuery({
    queryKey: ['tasks', groupId],
    queryFn: () => taskApi.list(groupId as any),
    enabled: !!groupId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  })

  const safeMembers = useMemo<GroupMember[]>(
    () => (Array.isArray(members) ? members : []),
    [members]
  )

  const myId = normalizeId(user?.id)

  const myTasks = useMemo(
    () => (tasks as Task[]).filter((t: any) => normalizeId(t.assigneeId) === myId && t.status !== 'DONE'),
    [tasks, myId]
  )

  const upcomingTasks = useMemo(() => {
    return [...(tasks as Task[])]
      .filter((t: Task) => t.status !== 'DONE')
      .sort((a: any, b: any) => {
        const ad = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
        const bd = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
        return ad - bd
      })
      .slice(0, 5)
  }, [tasks])

  const taskStats = useMemo(() => {
    const list = tasks as Task[]
    return {
      total: list.length,
      todo: list.filter(t => t.status === 'TODO').length,
      progress: list.filter(t => t.status === 'IN_PROGRESS').length,
      done: list.filter(t => t.status === 'DONE').length,
    }
  }, [tasks])

  const openTaskBoard = useCallback(() => {
    navigate(`/groups/${groupId}/kanban`)
  }, [navigate, groupId])

  const openTaskDetail = useCallback((taskId: any) => {
    navigate(`/groups/${groupId}/kanban/${normalizeId(taskId)}`)
  }, [navigate, groupId])

  const loadMembers = useCallback(async () => {
    try {
      const memberList = await groupApi.getMembers(groupId)
      setMembers(Array.isArray(memberList) ? memberList : [])
    } catch {
      setMembers([])
    }
  }, [groupId])

  const normalizeMessage = useCallback((raw: any): ChatMessage => ({
    ...raw,
    id: normalizeId(raw?._id ?? raw?.id),
    senderId: normalizeId(raw?.senderId),
    senderAvatar: raw?.senderAvatar ?? null,
    attachments: raw?.attachments ?? [],
    mentionUserIds: raw?.mentionUserIds ?? [],
    reactions: raw?.reactions ?? [],
    pinned: !!raw?.pinned,
    replyTo: raw?.replyTo ?? null,
    recalled: !!raw?.recalled,
    recalledAt: raw?.recalledAt ?? undefined,
    recalledBy: raw?.recalledBy ?? undefined,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
  }), [])

  const appendIncomingMessage = useCallback((raw: any) => {
    const msg = normalizeMessage(raw)

    setMessages(prev => {
      const exists = prev.some(m => m.id === msg.id)
      if (exists) return prev.map(m => (m.id === msg.id ? msg : m))
      return [...prev, msg]
    })

    setPinned(prev => {
      const filtered = prev.filter(m => m.id !== msg.id)
      return msg.pinned ? [msg, ...filtered] : filtered
    })
  }, [normalizeMessage])

  const { connected } = useWebSocket(groupId, appendIncomingMessage)

  const myRole = useMemo(() => {
    const me = safeMembers.find(m => normalizeId(m.userId) === normalizeId(user?.id))
    return me?.role
  }, [safeMembers, user])

  const canManagePins = myRole === 'LEADER' || myRole === 'DEPUTY'
  const isLeader = myRole === 'LEADER'
  const isLeaderOrDeputy = myRole === 'LEADER' || myRole === 'DEPUTY'

  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase()
    const base = safeMembers
      .filter(m => normalizeId(m.userId) !== normalizeId(user?.id))
      .map(m => ({
        id: normalizeId(m.userId),
        name: m.fullName,
      }))

    if (!q) return [{ id: '__all__', name: 'all' }, ...base].slice(0, 8)

    return [{ id: '__all__', name: 'all' }, ...base]
      .filter(x => x.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [safeMembers, mentionQuery, user])

  const allFiles = useMemo(() => {
    return messages.flatMap(m =>
      (m.attachments || []).map(att => ({
        ...att,
        messageId: m.id,
        senderName: m.senderName,
        createdAt: m.createdAt,
      }))
    )
  }, [messages])

  const allMedia = useMemo(() => {
    return allFiles.filter(f => isImageAttachment(f))
  }, [allFiles])

  const scrollToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current[messageId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightId(messageId)
      el.animate(
        [
          { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          { boxShadow: '0 0 0 3px rgba(99,102,241,.35)' },
          { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        ],
        { duration: 1500 }
      )
      window.setTimeout(() => {
        setHighlightId(curr => (curr === messageId ? null : curr))
      }, 2200)
    }
  }, [])

  useEffect(() => {
    if (!groupId) return

    const load = async () => {
      setLoading(true)
      try {
        const [g, memberList, hist, pinnedList] = await Promise.all([
          groupApi.get(groupId).catch(() => null),
          groupApi.getMembers(groupId).catch(() => []),
          chatApi.getHistory(groupId, 0).catch(() => ({ content: [] })),
          chatApi.getPinned(groupId).catch(() => []),
        ])

        setGroup(g)
        setMembers(Array.isArray(memberList) ? memberList : [])

        const content = Array.isArray((hist as any)?.content) ? (hist as any).content : []
        setMessages([...content].reverse().map(normalizeMessage))
        setPinned((Array.isArray(pinnedList) ? pinnedList : []).map(normalizeMessage))
      } catch {
        toast.error('Không tải được chat nhóm')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [groupId, normalizeMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!focusMessageId || messages.length === 0) return
    const timer = window.setTimeout(() => {
      scrollToMessage(focusMessageId)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [focusMessageId, messages, scrollToMessage])

  useEffect(() => {
    if (!focusMessageId || !highlightId || highlightId !== focusMessageId) return
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      next.delete('messageId')
      setSearchParams(next, { replace: true })
    }, 2400)

    return () => window.clearTimeout(timer)
  }, [focusMessageId, highlightId, searchParams, setSearchParams])

  const refreshPinned = async () => {
    try {
      const pinnedList = await chatApi.getPinned(groupId)
      setPinned((Array.isArray(pinnedList) ? pinnedList : []).map(normalizeMessage))
    } catch {
      //
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)

    const match = value.match(/@([^\s@]*)$/)
    if (match) {
      setMentionQuery(match[1] || '')
      setShowMentionBox(true)
    } else {
      setShowMentionBox(false)
      setMentionQuery('')
    }
  }

  const insertMention = (name: string) => {
    const next = input.replace(/@([^\s@]*)$/, `@${name} `)
    setInput(next)
    setShowMentionBox(false)
    setMentionQuery('')
    inputRef.current?.focus()
  }

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handlePickImages = (files: FileList | null) => {
    if (!files) return
    setPickedFiles(prev => [...prev, ...Array.from(files)])
  }

  const handlePickFiles = (files: FileList | null) => {
    if (!files) return
    setPickedFiles(prev => [...prev, ...Array.from(files)])
  }

  const removePicked = (index: number) => {
    setPickedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const buildMentionPayload = () => {
    const text = input
    const mentionAll = /(^|\s)@all(\s|$)/i.test(text)

    const mentionUserIds = safeMembers
      .filter(m => normalizeId(m.userId) !== normalizeId(user?.id))
      .filter(m => text.includes(`@${m.fullName}`))
      .map(m => normalizeId(m.userId))

    return {
      mentionAll,
      mentionUserIds: Array.from(new Set(mentionUserIds)),
    }
  }

  const uploadPickedFiles = async (): Promise<ChatAttachment[]> => {
    if (pickedFiles.length === 0) return []

    const uploaded: ChatAttachment[] = []

    for (const file of pickedFiles) {
      const isImage = file.type.startsWith('image/')
      const res = isImage
        ? await chatApi.uploadImage(file)
        : await chatApi.uploadFile(file)

      uploaded.push({
        name: res.name,
        url: res.url,
        type: res.type,
        sizeKb: res.sizeKb,
      })
    }

    return uploaded
  }

  const send = async () => {
    const content = input.trim()
    if ((!content && pickedFiles.length === 0) || !groupId || sending) return

    setSending(true)

    try {
      const attachments = await uploadPickedFiles()
      const { mentionAll, mentionUserIds } = buildMentionPayload()

      const sent = await chatApi.sendMessage(groupId, {
        content,
        attachments,
        mentionUserIds,
        mentionAll,
        replyTo,
      })

      const msg = normalizeMessage(sent)
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
      setInput('')
      setPickedFiles([])
      setShowEmoji(false)
      setShowMentionBox(false)
      setReplyTo(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Gửi tin nhắn thất bại')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handlePin = async (messageId: string, pinnedNow: boolean) => {
    try {
      if (pinnedNow) {
        await chatApi.unpin(groupId, messageId)
        toast.success('Đã bỏ ghim')
      } else {
        await chatApi.pin(groupId, messageId)
        toast.success('Đã ghim tin nhắn')
      }

      setMenuOpenId(null)
      await refreshPinned()

      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, pinned: !pinnedNow } : m))
      )
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể ghim tin nhắn')
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const updated = await chatApi.react(groupId, messageId, emoji)
      const msg = normalizeMessage(updated)

      setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)))
      setPinned(prev => prev.map(m => (m.id === msg.id ? msg : m)))
      setReactionPickerId(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể thả reaction')
    }
  }

  const handleRecall = async (messageId: string) => {
    try {
      const updated = await chatApi.recall(groupId, messageId)
      const msg = normalizeMessage(updated)

      setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)))
      setPinned(prev => prev.filter(m => m.id !== msg.id))
      setMenuOpenId(null)
      toast.success('Đã thu hồi tin nhắn')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể thu hồi tin nhắn')
    }
  }

  const startReply = (msg: ChatMessage) => {
    if (msg.recalled) return

    setReplyTo({
      messageId: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content,
      type: msg.type,
      attachments: msg.attachments ?? [],
    })
    setMenuOpenId(null)
    inputRef.current?.focus()
  }

  const memberCount = useMemo(
    () => group?.memberCount ?? group?.members?.length ?? safeMembers.length ?? 0,
    [group, safeMembers]
  )

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full rounded-[24px]"
        style={{ background: 'var(--bg2)' }}
      >
        <Loader2 size={28} className="animate-spin mb-3" style={{ color: '#818cf8' }} />
        <p style={{ color: 'var(--text3)' }}>Đang tải chat...</p>
      </div>
    )
  }

  const groupColor = group?.coverColor || '#6366f1'

  return (
    <div
      className="flex h-[calc(100vh-4rem)] -m-5 overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <div
          className="px-5 h-16 flex items-center gap-3 border-b flex-shrink-0"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--border)',
          }}
        >
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text3)', background: 'transparent' }}
          >
            <ArrowLeft size={18} />
          </button>

          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${groupColor}20`,
              border: `1px solid ${groupColor}40`,
            }}
          >
            <Hash size={17} style={{ color: groupColor }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold truncate" style={{ color: 'var(--text)' }}>
              {group?.name ?? 'Chat nhóm'}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
              {memberCount} thành viên · {messages.length} tin nhắn
            </div>
          </div>

          <button
            onClick={() => setShowSidePanel(v => !v)}
            className="w-10 h-10 rounded-xl border flex items-center justify-center"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--border)',
              color: '#f59e0b',
            }}
            title="Trợ năng nhóm"
          >
            <AlertCircle size={18} />
          </button>

          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] border"
            style={
              connected
                ? {
                    color: '#22c55e',
                    borderColor: 'rgba(34,197,94,.22)',
                    background: 'rgba(34,197,94,.08)',
                  }
                : {
                    color: 'var(--text3)',
                    borderColor: 'var(--border)',
                    background: 'var(--bg3)',
                  }
            }
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Realtime' : 'Offline'}
          </div>
        </div>

        {pinned.length > 0 && (
          <div
            className="px-5 py-3 border-b"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Pin size={14} style={{ color: '#f59e0b' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                Tin nhắn đã ghim ({pinned.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {pinned.slice(0, 4).map(msg => (
                <div
                  key={msg.id}
                  className="group px-3 py-2 rounded-2xl text-[12px] max-w-[280px] border flex items-center gap-2"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: 'var(--border)',
                    color: 'var(--text2)',
                  }}
                >
                  <button
                    className="truncate text-left flex-1"
                    onClick={() => scrollToMessage(msg.id)}
                  >
                    <span className="font-medium">{msg.senderName}:</span>{' '}
                    {msg.recalled ? 'Tin nhắn đã được thu hồi' : (msg.content || '[Tệp đính kèm]')}
                  </button>

                  {canManagePins && (
                    <button
                      onClick={() => handlePin(msg.id, true)}
                      className="opacity-70 hover:opacity-100"
                      title="Gỡ ghim"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ background: 'var(--bg)' }}
        >
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text)' }}>
                Chưa có tin nhắn nào
              </p>
              <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                Hãy gửi tin nhắn đầu tiên trong nhóm
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => {
                const isMe = normalizeId(msg.senderId) === normalizeId(user?.id)
                const prev = messages[i - 1]
                const sameUser = prev && prev.senderId === msg.senderId
                const showMeta =
                  i === 0 ||
                  !sameUser ||
                  new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000

                return (
                  <div
                    key={msg.id}
                    ref={el => {
                      messageRefs.current[msg.id] = el
                    }}
                  >
                    {showMeta && (
                      <div className="text-center my-4">
                        <span
                          className="px-3 py-1 rounded-full text-[10px]"
                          style={{
                            color: 'var(--text3)',
                            background: 'var(--bg3)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div
                      className={clsx(
                        'flex gap-3 items-end',
                        isMe ? 'flex-row-reverse' : 'flex-row'
                      )}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => {
                        setHoveredId(null)
                        setReactionPickerId(null)
                      }}
                    >
                      <div className={clsx(!showMeta && 'invisible')}>
                        <Avatar name={msg.senderName} avatar={msg.senderAvatar} size={36} />
                      </div>

                      <div
                        className={clsx(
                          'max-w-[78%] flex flex-col relative',
                          isMe ? 'items-end' : 'items-start'
                        )}
                      >
                        {!isMe && showMeta && (
                          <span
                            className="text-[11px] mb-1 px-1"
                            style={{ color: 'var(--text3)' }}
                          >
                            {msg.senderName}
                          </span>
                        )}

                        <div className="relative">
                          {hoveredId === msg.id && !msg.recalled && (
                            <div
                              className={clsx(
                                'absolute -top-9 flex items-center gap-1 z-20',
                                isMe ? 'right-0' : 'left-0'
                              )}
                            >
                              <button
                                onClick={() => setReactionPickerId(reactionPickerId === msg.id ? null : msg.id)}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{
                                  background: 'var(--bg2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text2)',
                                }}
                                title="Thả cảm xúc"
                              >
                                <Smile size={14} />
                              </button>

                              {canManagePins && (
                                <button
                                  onClick={() => handlePin(msg.id, !!msg.pinned)}
                                  className="w-8 h-8 rounded-full border flex items-center justify-center"
                                  style={{
                                    background: 'var(--bg2)',
                                    borderColor: 'var(--border)',
                                    color: msg.pinned ? '#f59e0b' : 'var(--text2)',
                                  }}
                                  title={msg.pinned ? 'Bỏ ghim' : 'Ghim'}
                                >
                                  <Pin size={14} />
                                </button>
                              )}

                              <button
                                onClick={() => setMenuOpenId(menuOpenId === msg.id ? null : msg.id)}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{
                                  background: 'var(--bg2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text2)',
                                }}
                                title="Khác"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </div>
                          )}

                          {reactionPickerId === msg.id && !msg.recalled && (
                            <div
                              className={clsx(
                                'absolute -top-20 rounded-2xl border px-2 py-2 flex items-center gap-1 z-30',
                                isMe ? 'right-0' : 'left-0'
                              )}
                              style={{
                                background: 'var(--bg2)',
                                borderColor: 'var(--border)',
                              }}
                            >
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className="text-[18px] hover:scale-110 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {menuOpenId === msg.id && (
                            <div
                              className={clsx(
                                'absolute top-10 rounded-2xl border shadow-xl z-30 min-w-[170px] overflow-hidden',
                                isMe ? 'right-0' : 'left-0'
                              )}
                              style={{
                                background: 'var(--bg2)',
                                borderColor: 'var(--border)',
                              }}
                            >
                              {!msg.recalled && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content || '')
                                    toast.success('Đã sao chép tin nhắn')
                                    setMenuOpenId(null)
                                  }}
                                  className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04]"
                                  style={{ color: 'var(--text)' }}
                                >
                                  Sao chép
                                </button>
                              )}

                              {!msg.recalled && (
                                <button
                                  onClick={() => startReply(msg)}
                                  className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04] flex items-center gap-2"
                                  style={{ color: 'var(--text)' }}
                                >
                                  <Reply size={14} />
                                  Trả lời
                                </button>
                              )}

                              {isMe && !msg.recalled && (
                                <button
                                  onClick={() => handleRecall(msg.id)}
                                  className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04]"
                                  style={{ color: '#ef4444' }}
                                >
                                  Thu hồi tin nhắn
                                </button>
                              )}
                            </div>
                          )}

                          <div
                            className={clsx(
                              'px-4 py-3 text-[14px] leading-relaxed shadow-sm transition-all',
                              highlightId === msg.id && 'ring-2 ring-indigo-400/60',
                            )}
                            style={
                              isMe
                                ? {
                                    color: '#fff',
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    borderRadius: '18px 18px 6px 18px',
                                  }
                                : {
                                    color: 'var(--text)',
                                    background: 'var(--bg2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '18px 18px 18px 6px',
                                  }
                            }
                          >
                            {msg.recalled ? (
                              <p className="italic opacity-70">
                                {isMe ? 'Bạn đã thu hồi một tin nhắn' : 'Tin nhắn đã được thu hồi'}
                              </p>
                            ) : (
                              <>
                                <ReplyPreviewBox
                                  reply={msg.replyTo}
                                  mine={isMe}
                                  onClick={() => msg.replyTo?.messageId && scrollToMessage(msg.replyTo.messageId)}
                                />

                                {!!msg.content && <div>{msg.content}</div>}

                                {!!msg.attachments?.length && (
                                  <div className="space-y-2">
                                    {msg.attachments.map((att, idx) => (
                                      <AttachmentCard key={idx} att={att} />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {!!msg.reactions?.length && !msg.recalled && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {msg.reactions.map(r => (
                                <button
                                  key={r.emoji}
                                  onClick={() => handleReact(msg.id, r.emoji)}
                                  className="px-2 py-0.5 rounded-full text-[12px] border"
                                  style={{
                                    background: 'var(--bg3)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text2)',
                                  }}
                                >
                                  {r.emoji} {r.userIds?.length || 0}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <span
                          className="text-[10px] mt-1 px-1"
                          style={{ color: 'var(--text3)' }}
                        >
                          {msg.pinned ? '📌 ' : ''}
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div
          className="px-5 py-4 border-t flex-shrink-0"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--border)',
          }}
        >
          {replyTo && (
            <div
              className="mb-3 rounded-2xl border px-3 py-3 flex items-start justify-between gap-3"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-medium" style={{ color: '#818cf8' }}>
                  Đang trả lời {replyTo.senderName || 'tin nhắn'}
                </div>
                <div
                  className="text-[12px] truncate mt-1 px-3 py-2 rounded-xl border-l-[3px]"
                  style={{
                    color: 'var(--text2)',
                    background: 'rgba(99,102,241,.06)',
                    borderLeftColor: '#60a5fa',
                  }}
                >
                  {replyTo.content?.trim()
                    ? replyTo.content
                    : replyTo.attachments?.length
                      ? '[Tệp đính kèm]'
                      : '[Tin nhắn]'}
                </div>
              </div>

              <button
                onClick={() => setReplyTo(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ color: 'var(--text3)' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {pickedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pickedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl border"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: 'var(--border)',
                    color: 'var(--text2)',
                  }}
                >
                  <span className="text-[12px] max-w-[180px] truncate">{file.name}</span>
                  <button
                    onClick={() => removePicked(idx)}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ color: 'var(--text3)' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center mb-3 flex-wrap">
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => handlePickImages(e.target.files)}
            />
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={e => handlePickFiles(e.target.files)}
            />

            <button
              onClick={() => imageRef.current?.click()}
              className="h-10 px-3 rounded-xl border inline-flex items-center gap-2 text-[12px]"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
                color: 'var(--text2)',
              }}
            >
              <ImageIcon size={14} />
              Ảnh / Meme
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="h-10 px-3 rounded-xl border inline-flex items-center gap-2 text-[12px]"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
                color: 'var(--text2)',
              }}
            >
              <Paperclip size={14} />
              Tài liệu
            </button>

            <div className="relative">
              <button
                onClick={() => setShowEmoji(v => !v)}
                className="h-10 px-3 rounded-xl border inline-flex items-center gap-2 text-[12px]"
                style={{
                  background: 'var(--bg3)',
                  borderColor: 'var(--border)',
                  color: 'var(--text2)',
                }}
              >
                <Smile size={14} />
                Emoji
              </button>

              {showEmoji && (
                <div
                  className="absolute bottom-12 left-0 rounded-2xl border p-3 grid grid-cols-5 gap-2 z-20"
                  style={{
                    background: 'var(--bg2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {[...EMOJIS, ...EXTRA_EMOJIS].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl hover:scale-110 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setInput(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@all `)
                inputRef.current?.focus()
              }}
              className="h-10 px-3 rounded-xl border inline-flex items-center gap-2 text-[12px]"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
                color: '#818cf8',
              }}
            >
              <AtSign size={14} />
              @all
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Nhắn tin nhóm... dùng @all hoặc @tên thành viên"
                className="flex-1 h-12 px-4 rounded-2xl text-[14px] outline-none transition-colors"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />

              <button
                onClick={send}
                disabled={(!input.trim() && pickedFiles.length === 0) || sending}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50"
                style={{
                  background: input.trim() || pickedFiles.length
                    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                    : 'var(--bg3)',
                  color: input.trim() || pickedFiles.length ? '#fff' : 'var(--text3)',
                  border: input.trim() || pickedFiles.length ? 'none' : '1px solid var(--border)',
                }}
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {showMentionBox && mentionCandidates.length > 0 && (
              <div
                className="absolute bottom-14 left-0 w-[280px] rounded-2xl border shadow-xl z-20 overflow-hidden"
                style={{
                  background: 'var(--bg2)',
                  borderColor: 'var(--border)',
                }}
              >
                {mentionCandidates.map(item => (
                  <button
                    key={item.id}
                    onClick={() => insertMention(item.name)}
                    className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04]"
                    style={{ color: 'var(--text)' }}
                  >
                    @{item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] mt-2" style={{ color: 'var(--text3)' }}>
            Enter để gửi · trưởng nhóm / nhóm phó có thể ghim · mọi thành viên có thể reply và thu hồi tin nhắn của chính mình
          </p>
        </div>
      </div>

      {showSidePanel && (
        <div
          className="w-[320px] border-l flex-shrink-0"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--border)',
          }}
        >
          <div
            className="h-16 px-4 flex items-center justify-between border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
              Trợ năng nhóm
            </div>
            <button onClick={() => setShowSidePanel(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="p-3 flex flex-wrap gap-2">
            {[
              ['pinned', 'Ghim'],
              ['files', 'File'],
              ['media', 'Ảnh'],
              ['members', 'Thành viên'],
              ['task', 'Task'],
              ['reminder', 'Nhắc'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSideTab(key as any)}
                className="px-3 py-2 rounded-xl text-[12px] border"
                style={{
                  background: sideTab === key ? 'rgba(99,102,241,.14)' : 'var(--bg3)',
                  borderColor: sideTab === key ? 'rgba(99,102,241,.25)' : 'var(--border)',
                  color: sideTab === key ? '#818cf8' : 'var(--text2)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-3 pb-3 overflow-y-auto h-[calc(100%-112px)]">
            {sideTab === 'pinned' && (
              <div className="space-y-2">
                {pinned.length === 0 ? (
                  <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                    Chưa có tin nhắn ghim
                  </div>
                ) : (
                  pinned.map(msg => (
                    <div
                      key={msg.id}
                      className="rounded-2xl border p-3"
                      style={{
                        background: 'var(--bg3)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <button
                        onClick={() => {
                          scrollToMessage(msg.id)
                          setShowSidePanel(false)
                        }}
                        className="w-full text-left"
                      >
                        <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                          {msg.senderName}
                        </div>
                        <div className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
                          {msg.recalled ? 'Tin nhắn đã được thu hồi' : (msg.content || '[Tệp đính kèm]')}
                        </div>
                      </button>

                      {canManagePins && (
                        <button
                          onClick={() => handlePin(msg.id, true)}
                          className="mt-2 text-[12px]"
                          style={{ color: '#ef4444' }}
                        >
                          Gỡ ghim
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {sideTab === 'files' && (
              <div className="space-y-2">
                {allFiles.length === 0 ? (
                  <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                    Chưa có file nào
                  </div>
                ) : (
                  allFiles.map((f, idx) => (
                    <a
                      key={`${f.name}-${idx}`}
                      href={resolveUrl(f.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border p-3"
                      style={{
                        background: 'var(--bg3)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={16} style={{ color: '#818cf8' }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] truncate" style={{ color: 'var(--text)' }}>
                            {f.name}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {f.senderName} · {timeAgo(f.createdAt)}
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}

            {sideTab === 'media' && (
              <div className="grid grid-cols-2 gap-2">
                {allMedia.length === 0 ? (
                  <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                    Chưa có ảnh nào
                  </div>
                ) : (
                  allMedia.map((m, idx) => (
                    <a
                      key={`${m.name}-${idx}`}
                      href={resolveUrl(m.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={resolveUrl(m.url)}
                        alt={m.name}
                        className="w-full h-[120px] object-cover rounded-2xl border"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    </a>
                  ))
                )}
              </div>
            )}

            {sideTab === 'members' && (
              <div className="space-y-3">
                {safeMembers.length === 0 ? (
                  <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                    Chưa có thành viên nào
                  </div>
                ) : (
                  safeMembers.map(member => {
                    const memberId = normalizeId(member.userId)
                    const isMe = memberId === normalizeId(user?.id)
                    const isDeputy = member.role === 'DEPUTY'

                    return (
                      <div
                        key={memberId}
                        className="rounded-2xl border p-3"
                        style={{
                          background: 'var(--bg3)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={member.fullName}
                            avatar={member.user?.avatar}
                            size={40}
                          />

                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[13px] font-medium truncate"
                              style={{ color: 'var(--text)' }}
                            >
                              {member.fullName}
                            </div>
                            <div
                              className="text-[11px]"
                              style={{ color: 'var(--text3)' }}
                            >
                              {member.role === 'LEADER'
                                ? 'Trưởng nhóm'
                                : member.role === 'DEPUTY'
                                ? 'Nhóm phó'
                                : member.role === 'VIEWER'
                                  ? 'Người xem'
                                  : 'Thành viên'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {!isMe && (
                            <button
                              onClick={() =>
                                navigate(`/inbox/${memberId}`, {
                                  state: {
                                    dmTarget: {
                                      userId: memberId,
                                      fullName: member.fullName,
                                      avatar: member.user?.avatar ?? null,
                                    },
                                  },
                                })
                              }
                              className="px-3 py-2 rounded-xl text-[12px] border"
                              style={{
                                background: 'var(--bg2)',
                                borderColor: 'var(--border)',
                                color: '#818cf8',
                              }}
                            >
                              Nhắn tin
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/u/${memberId}`)}
                            className="px-3 py-2 rounded-xl text-[12px] border"
                            style={{
                              background: 'var(--bg2)',
                              borderColor: 'var(--border)',
                              color: 'var(--text2)',
                            }}
                          >
                            Xem hồ sơ
                          </button>

                          {isLeader && !isMe && member.role !== 'LEADER' && (
                            <button
                              onClick={async () => {
                                try {
                                  await groupApi.changeRole(
                                    groupId,
                                    memberId,
                                    isDeputy ? 'MEMBER' : 'DEPUTY'
                                  )
                                  toast.success(
                                    isDeputy ? 'Đã gỡ nhóm phó' : 'Đã bổ nhiệm nhóm phó'
                                  )
                                  await loadMembers()
                                } catch (e: any) {
                                  toast.error(
                                    e?.response?.data?.message ?? 'Không thể cập nhật vai trò'
                                  )
                                }
                              }}
                              className="px-3 py-2 rounded-xl text-[12px] border"
                              style={{
                                background: isDeputy ? 'rgba(239,68,68,.08)' : 'rgba(34,197,94,.08)',
                                borderColor: isDeputy ? 'rgba(239,68,68,.18)' : 'rgba(34,197,94,.18)',
                                color: isDeputy ? '#ef4444' : '#22c55e',
                              }}
                            >
                              {isDeputy ? 'Gỡ nhóm phó' : 'Bổ nhiệm nhóm phó'}
                            </button>
                          )}

                          {isLeaderOrDeputy && !isMe && member.role !== 'LEADER' && (
                            <button
                              onClick={async () => {
                                const ok = window.confirm(`Đuổi ${member.fullName} khỏi nhóm?`)
                                if (!ok) return

                                try {
                                  await groupApi.removeMember(groupId, memberId)
                                  toast.success('Đã đuổi thành viên khỏi nhóm')
                                  await loadMembers()
                                } catch (e: any) {
                                  toast.error(
                                    e?.response?.data?.message ?? 'Không thể xoá thành viên'
                                  )
                                }
                              }}
                              className="px-3 py-2 rounded-xl text-[12px] border"
                              style={{
                                background: 'rgba(239,68,68,.08)',
                                borderColor: 'rgba(239,68,68,.18)',
                                color: '#ef4444',
                              }}
                            >
                              Đuổi khỏi nhóm
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {sideTab === 'task' && (
              <div className="space-y-4">
                <div
                  className="rounded-2xl border p-4"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare size={16} className="text-indigo-400" />
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                      Tổng quan task
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl border p-3"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                    >
                      <div className="text-[10px] mb-1" style={{ color: 'var(--text3)' }}>Tổng task</div>
                      <div className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                        {taskLoading ? '...' : taskStats.total}
                      </div>
                    </div>

                    <div
                      className="rounded-xl border p-3"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                    >
                      <div className="text-[10px] mb-1" style={{ color: 'var(--text3)' }}>Task của tôi</div>
                      <div className="text-[18px] font-semibold" style={{ color: '#818cf8' }}>
                        {taskLoading ? '...' : myTasks.length}
                      </div>
                    </div>

                    <div
                      className="rounded-xl border p-3"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                    >
                      <div className="text-[10px] mb-1" style={{ color: 'var(--text3)' }}>Chờ làm</div>
                      <div className="text-[18px] font-semibold" style={{ color: '#94a3b8' }}>
                        {taskLoading ? '...' : taskStats.todo}
                      </div>
                    </div>

                    <div
                      className="rounded-xl border p-3"
                      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                    >
                      <div className="text-[10px] mb-1" style={{ color: 'var(--text3)' }}>Đang làm</div>
                      <div className="text-[18px] font-semibold" style={{ color: '#f59e0b' }}>
                        {taskLoading ? '...' : taskStats.progress}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={openTaskBoard}
                      className="flex-1 h-10 rounded-xl text-[12px] font-medium"
                      style={{ background: '#6366f1', color: '#fff' }}
                    >
                      Mở board task
                    </button>

                    <button
                      onClick={openTaskBoard}
                      className="w-10 h-10 rounded-xl border flex items-center justify-center"
                      style={{
                        background: 'var(--bg2)',
                        borderColor: 'var(--border)',
                        color: '#818cf8',
                      }}
                      title="Tạo task"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                      Task gần deadline
                    </div>
                    <button
                      onClick={openTaskBoard}
                      className="text-[11px]"
                      style={{ color: '#818cf8' }}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {taskLoading ? (
                    <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                      Đang tải task...
                    </div>
                  ) : upcomingTasks.length === 0 ? (
                    <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                      Chưa có task nào
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingTasks.map((task: any) => {
                        const meta = STATUS_META[task.status || 'TODO']
                        const Icon = meta.icon
                        const overdue = isOverdue(task.deadline, task.status)

                        return (
                          <button
                            key={normalizeId(task.id)}
                            onClick={() => openTaskDetail(task.id)}
                            className="w-full text-left rounded-2xl border p-3 hover:bg-white/[.03] transition-all"
                            style={{
                              background: 'var(--bg2)',
                              borderColor: 'var(--border)',
                            }}
                          >
                            {task.label && (
                              <span
                                className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded mb-2 uppercase tracking-wide"
                                style={{ background: `${task.labelColor}20`, color: task.labelColor }}
                              >
                                {task.label}
                              </span>
                            )}

                            <div className="text-[13px] font-medium line-clamp-1" style={{ color: 'var(--text)' }}>
                              {task.title}
                            </div>

                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
                                style={{ color: meta.color, background: `${meta.color}15` }}
                              >
                                <Icon size={11} />
                                {meta.label}
                              </span>

                              {task.assigneeName && (
                                <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--text3)' }}>
                                  <User2 size={10} />
                                  {task.assigneeName}
                                </span>
                              )}

                              {task.deadline && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] ml-auto"
                                  style={{ color: overdue ? '#ef4444' : 'var(--text3)' }}
                                >
                                  <Calendar size={10} />
                                  {fmtDate(task.deadline)}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                      Task giao cho tôi
                    </div>
                    <button
                      onClick={openTaskBoard}
                      className="text-[11px]"
                      style={{ color: '#818cf8' }}
                    >
                      Mở board
                    </button>
                  </div>

                  {taskLoading ? (
                    <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                      Đang tải...
                    </div>
                  ) : myTasks.length === 0 ? (
                    <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                      Hiện chưa có task nào giao cho bạn
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myTasks.slice(0, 4).map((task: any) => {
                        const meta = STATUS_META[task.status || 'TODO']
                        return (
                          <button
                            key={normalizeId(task.id)}
                            onClick={() => openTaskDetail(task.id)}
                            className="w-full text-left rounded-2xl border p-3 hover:bg-white/[.03] transition-all"
                            style={{
                              background: 'var(--bg2)',
                              borderColor: 'var(--border)',
                            }}
                          >
                            <div className="text-[13px] font-medium line-clamp-1" style={{ color: 'var(--text)' }}>
                              {task.title}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <div className="text-[10px]" style={{ color: meta.color }}>
                                {meta.label}
                              </div>
                              <div className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--text3)' }}>
                                <ChevronRight size={12} />
                                Chi tiết
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {sideTab === 'reminder' && (
              <div className="space-y-3">
                <div className="rounded-2xl border p-3" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                    Nhắc hẹn
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                    Phần nhắc hẹn chi tiết sẽ ghép tiếp sau. Hiện tại bạn có thể mở task nhóm để theo deadline.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}