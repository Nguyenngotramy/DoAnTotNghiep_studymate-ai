import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  FileText,
  Hash,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pin,
  RefreshCw,
  Reply,
  Search,
  Send,
  Smile,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { chatApi, dmApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import type {
  ChatAttachment,
  ChatMessage,
  Conversation,
  DirectMessage,
  DirectMessageAttachment,
  DirectMessageReaction,
  DirectMessageReplyPreview,
} from '@/types'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6']
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']
const EXTRA_EMOJIS = ['😀', '🥹', '😍', '😎', '🔥', '👏', '🎉', '📚', '📝', '✅']
const BACKEND = 'http://localhost:8080/api'

type InboxTab = 'dm' | 'group'
type DmSideTab = 'pinned' | 'files' | 'media'
type GroupSideTab = 'pinned' | 'files' | 'media'

type DmTargetState = {
  userId: string
  fullName?: string
  avatar?: string | null
}

const toAbsUrl = (url?: string | null): string => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BACKEND + url
}

function rid(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'object') {
    if ((v as any).$oid) return String((v as any).$oid).trim()
    if ((v as any)._id) return rid((v as any)._id)
    if ((v as any).id) return rid((v as any).id)
  }
  return String(v).trim()
}

function ini(n: string) {
  return (n ?? 'ND')
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(-2)
    .toUpperCase() || 'ND'
}

function nameColor(name: string) {
  return COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
}

function ago(d: string | null | undefined) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

function isOnline5m(lastActiveAt?: string | null) {
  if (!lastActiveAt) return false
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  return diff <= 5 * 60 * 1000
}

function isImageAttachment(att: DirectMessageAttachment | ChatAttachment) {
  const t = (att.type || '').toUpperCase()
  return t === 'IMAGE' || t === 'JPG' || t === 'JPEG' || t === 'PNG' || t === 'WEBP'
}

function sameIds(a: any[], b: any[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (rid(a[i]?.id) !== rid(b[i]?.id)) return false
    if (Boolean(a[i]?.pinned) !== Boolean(b[i]?.pinned)) return false
    if (Boolean(a[i]?.recalled) !== Boolean(b[i]?.recalled)) return false
  }
  return true
}

function Avatar({
  name,
  avatar,
  size = 36,
  bg,
}: {
  name: string
  avatar?: string | null
  size?: number
  bg?: string
}) {
  const url = toAbsUrl(avatar)

  if (url) {
    return (
      <img
        src={url}
        alt={name}
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
        background: bg || nameColor(name),
      }}
    >
      {ini(name)}
    </div>
  )
}

function DirectAttachmentCard({ att }: { att: DirectMessageAttachment }) {
  if (isImageAttachment(att)) {
    return (
      <a href={toAbsUrl(att.url)} target="_blank" rel="noreferrer" className="block">
        <img
          src={toAbsUrl(att.url)}
          alt={att.name}
          className="mt-2 rounded-2xl max-h-[260px] object-cover border"
          style={{ borderColor: 'var(--border)' }}
        />
      </a>
    )
  }

  return (
    <a
      href={toAbsUrl(att.url)}
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

function GroupAttachmentCard({ att }: { att: ChatAttachment }) {
  if (isImageAttachment(att)) {
    return (
      <a href={toAbsUrl(att.url)} target="_blank" rel="noreferrer" className="block">
        <img
          src={toAbsUrl(att.url)}
          alt={att.name}
          className="mt-2 rounded-2xl max-h-[260px] object-cover border"
          style={{ borderColor: 'var(--border)' }}
        />
      </a>
    )
  }

  return (
    <a
      href={toAbsUrl(att.url)}
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
  reply?: DirectMessageReplyPreview | null
  mine?: boolean
  onClick?: () => void
}) {
  if (!reply) return null

  const hasAttachment = !!reply.attachments?.length
  const previewText = reply.content?.trim()
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

function GroupReplyPreviewBox({
  reply,
  mine,
  onClick,
}: {
  reply?: any | null
  mine?: boolean
  onClick?: () => void
}) {
  if (!reply) return null

  const hasAttachment = !!reply.attachments?.length
  const previewText = reply.content?.trim()
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

export default function InboxPage() {
  const { userId: paramUserId } = useParams<{ userId: string }>()
  const location = useLocation()
  const { user: me } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const myId = rid(me?.id)

  const bottomRef = useRef<HTMLDivElement>(null)
  const groupBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const groupInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const groupImageRef = useRef<HTMLInputElement>(null)
  const groupFileRef = useRef<HTMLInputElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const groupMessageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastMarkedDmRef = useRef('')
  const lastMarkedGroupRef = useRef('')

  const dmTargetState = (location.state as { dmTarget?: DmTargetState } | null)?.dmTarget

  const [activeTab, setActiveTab] = useState<InboxTab>('dm')
  const [activeId, setActiveId] = useState<string>(paramUserId ?? dmTargetState?.userId ?? '')
  const [selectedThread, setSelectedThread] = useState<Conversation | null>(null)

  const [input, setInput] = useState('')
  const [groupInput, setGroupInput] = useState('')
  const [sending, setSending] = useState(false)
  const [groupSending, setGroupSending] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  const [groupHoveredId, setGroupHoveredId] = useState<string | null>(null)
  const [groupMenuOpenId, setGroupMenuOpenId] = useState<string | null>(null)
  const [groupReactionPickerId, setGroupReactionPickerId] = useState<string | null>(null)
  const [groupShowEmoji, setGroupShowEmoji] = useState(false)

  const [pickedFiles, setPickedFiles] = useState<File[]>([])
  const [groupPickedFiles, setGroupPickedFiles] = useState<File[]>([])

  const [replyTo, setReplyTo] = useState<DirectMessageReplyPreview | null>(null)
  const [groupReplyTo, setGroupReplyTo] = useState<any | null>(null)

  const [dmSideOpen, setDmSideOpen] = useState(false)
  const [groupSideOpen, setGroupSideOpen] = useState(false)
  const [dmSideTab, setDmSideTab] = useState<DmSideTab>('pinned')
  const [groupSideTab, setGroupSideTab] = useState<GroupSideTab>('pinned')

  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([])
  const [groupPinned, setGroupPinned] = useState<ChatMessage[]>([])

  const { data: convRaw = [], isLoading: loadConvs, refetch: refetchConvs } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: dmApi.conversations,
    staleTime: 20_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  })

  const conversations = Array.isArray(convRaw) ? (convRaw as Conversation[]) : []

  const dmThreads = useMemo(
    () => conversations.filter(c => c.threadType === 'DM'),
    [conversations],
  )

  const groupThreads = useMemo(
    () => conversations.filter(c => c.threadType === 'GROUP'),
    [conversations],
  )

  useEffect(() => {
    const nextTargetId = paramUserId ?? dmTargetState?.userId
    if (!nextTargetId) return
    if (activeTab !== 'dm') return

    if (rid(nextTargetId) !== rid(activeId)) {
      setActiveId(nextTargetId)
    }
  }, [paramUserId, dmTargetState?.userId, activeId, activeTab])

  useEffect(() => {
    if (activeTab === 'dm') {
      const targetDmId = paramUserId ?? dmTargetState?.userId
      if (targetDmId) {
        const dm = dmThreads.find(c => rid(c.userId) === rid(targetDmId)) ?? null
        if (dm) {
          if (
            selectedThread?.threadType !== 'DM' ||
            rid(selectedThread?.userId) !== rid(dm.userId)
          ) {
            setSelectedThread(dm)
          }
        } else if (selectedThread?.threadType === 'DM' && rid(selectedThread?.userId) !== rid(targetDmId)) {
          setSelectedThread(null)
        }
        return
      }

      const currentDmValid =
        selectedThread?.threadType === 'DM' &&
        dmThreads.some(c => rid(c.userId) === rid(selectedThread?.userId))

      if (!currentDmValid) {
        if (dmThreads.length > 0) {
          const first = dmThreads[0]
          if (rid(activeId) !== rid(first.userId)) {
            setActiveId(rid(first.userId))
          }
          if (
            selectedThread?.threadType !== 'DM' ||
            rid(selectedThread?.userId) !== rid(first.userId)
          ) {
            setSelectedThread(first)
          }
        } else if (selectedThread !== null || activeId) {
          setSelectedThread(null)
          setActiveId('')
        }
      }
      return
    }

    if (activeTab === 'group') {
      const currentGroupValid =
        selectedThread?.threadType === 'GROUP' &&
        groupThreads.some(c => rid(c.groupId) === rid(selectedThread?.groupId))

      if (!currentGroupValid) {
        if (groupThreads.length > 0) {
          const firstGroup = groupThreads[0]
          if (
            selectedThread?.threadType !== 'GROUP' ||
            rid(selectedThread?.groupId) !== rid(firstGroup.groupId)
          ) {
            setSelectedThread(firstGroup)
          }
        } else if (selectedThread !== null) {
          setSelectedThread(null)
        }
      }
    }
  }, [paramUserId, activeTab, activeId, dmThreads, groupThreads, selectedThread])

  const selectedDmThread = useMemo(() => {
    if (selectedThread?.threadType === 'DM') return selectedThread

    const existingDm = dmThreads.find(c => rid(c.userId) === activeId) ?? null
    if (existingDm) return existingDm

    if (!activeId) return null

    return {
      threadType: 'DM',
      userId: activeId,
      title: dmTargetState?.fullName ?? 'Người dùng',
      avatar: dmTargetState?.avatar ?? null,
      user: {
        id: activeId,
        fullName: dmTargetState?.fullName ?? 'Người dùng',
        avatar: dmTargetState?.avatar ?? null,
      },
      unreadCount: 0,
    } as Conversation
  }, [selectedThread, dmThreads, activeId, dmTargetState])

  const selectedGroupThread = useMemo(() => {
    if (selectedThread?.threadType === 'GROUP') return selectedThread
    return null
  }, [selectedThread])

  const isSelectedDm = activeTab === 'dm' && !!activeId
  const isSelectedGroup = activeTab === 'group' && !!selectedGroupThread
  const selectedGroupId = isSelectedGroup ? rid(selectedGroupThread?.groupId) : ''

  const visibleThreads = useMemo(() => {
    const base = activeTab === 'dm' ? dmThreads : groupThreads
    const q = searchText.trim().toLowerCase()
    if (!q) return base

    return base.filter((conv: any) =>
      (conv?.title ?? conv?.user?.fullName ?? conv?.groupName ?? '').toLowerCase().includes(q),
    )
  }, [activeTab, dmThreads, groupThreads, searchText])

  const { connected: groupConnected } = useWebSocket(
    activeTab === 'group' ? selectedGroupId : '',
    useCallback((incoming: any) => {
      if (!selectedGroupId) return

      setGroupMessages(prev => {
        const exists = prev.some(m => rid(m.id) === rid(incoming.id))
        if (exists) {
          const next = prev.map(m => (rid(m.id) === rid(incoming.id) ? incoming : m))
          return sameIds(prev, next) ? prev : next
        }
        return [...prev, incoming]
      })

      setGroupPinned(prev => {
        const filtered = prev.filter(m => rid(m.id) !== rid(incoming.id))
        const next = incoming?.pinned ? [incoming, ...filtered] : filtered
        return sameIds(prev, next) ? prev : next
      })

      qc.invalidateQueries({ queryKey: ['dm-conversations'] })
      qc.invalidateQueries({ queryKey: ['group-messages', selectedGroupId] })
      qc.invalidateQueries({ queryKey: ['group-pinned', selectedGroupId] })
    }, [selectedGroupId, qc]),
  )

  const { data: msgRaw, isLoading: loadMsgs, refetch: refetchMsgs } = useQuery({
    queryKey: ['dm-messages', activeId],
    queryFn: () => dmApi.messages(activeId, 0),
    enabled: !!activeId && isSelectedDm,
    staleTime: 12_000,
    refetchInterval: 8_000,
  })

  const { data: pinnedRaw = [], refetch: refetchPinned } = useQuery({
    queryKey: ['dm-pinned', activeId],
    queryFn: () => dmApi.pinned(activeId),
    enabled: !!activeId && isSelectedDm,
    staleTime: 12_000,
    refetchInterval: 10_000,
  })

  const {
    data: groupHistoryRaw,
    isLoading: groupLoading,
  } = useQuery({
    queryKey: ['group-messages', selectedGroupId],
    queryFn: () => chatApi.getHistory(selectedGroupId, 0),
    enabled: !!selectedGroupId && isSelectedGroup,
    staleTime: 20_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  })

  const { data: groupPinnedRaw = [] } = useQuery({
    queryKey: ['group-pinned', selectedGroupId],
    queryFn: () => chatApi.getPinned(selectedGroupId),
    enabled: !!selectedGroupId && isSelectedGroup,
    staleTime: 20_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!selectedGroupId || !isSelectedGroup) {
      setGroupMessages(prev => (prev.length ? [] : prev))
      setGroupPinned(prev => (prev.length ? [] : prev))
      return
    }

    const arr = Array.isArray((groupHistoryRaw as any)?.content)
      ? [...(groupHistoryRaw as any).content].reverse()
      : []

    setGroupMessages(prev => (sameIds(prev, arr) ? prev : arr))
  }, [groupHistoryRaw, selectedGroupId, isSelectedGroup])

  useEffect(() => {
    if (!selectedGroupId || !isSelectedGroup) {
      setGroupPinned(prev => (prev.length ? [] : prev))
      return
    }

    const nextPinned = Array.isArray(groupPinnedRaw) ? groupPinnedRaw : []
    setGroupPinned(prev => (sameIds(prev, nextPinned) ? prev : nextPinned))
  }, [groupPinnedRaw, selectedGroupId, isSelectedGroup])

  const pinnedMessages: DirectMessage[] = Array.isArray(pinnedRaw) ? pinnedRaw : []

  const messages: DirectMessage[] = (() => {
    const raw = msgRaw as any
    if (!raw) return []
    const arr = Array.isArray(raw?.content)
      ? raw.content
      : Array.isArray(raw)
        ? raw
        : []
    return [...arr].reverse()
  })()

  useEffect(() => {
    if (isSelectedDm) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isSelectedDm])

  useEffect(() => {
    if (isSelectedGroup) {
      groupBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [groupMessages.length, isSelectedGroup])

  useEffect(() => {
    if (!activeId || !isSelectedDm) return
    if (lastMarkedDmRef.current === activeId) return

    lastMarkedDmRef.current = activeId
    dmApi.markRead(activeId).catch(() => {})

    qc.setQueryData(['dm-conversations'], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((item: any) =>
        rid(item?.userId) === rid(activeId)
          ? { ...item, unreadCount: 0 }
          : item
      )
    })
  }, [activeId, isSelectedDm, qc])

  useEffect(() => {
    if (!selectedGroupId || !isSelectedGroup) return
    if (lastMarkedGroupRef.current === selectedGroupId) return

    lastMarkedGroupRef.current = selectedGroupId
    chatApi.markRead(selectedGroupId).catch(() => {})

    qc.setQueryData(['dm-conversations'], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((item: any) =>
        rid(item?.groupId) === rid(selectedGroupId)
          ? { ...item, unreadCount: 0 }
          : item
      )
    })
  }, [selectedGroupId, isSelectedGroup, qc])

  const activeName =
    selectedDmThread?.title ??
    selectedDmThread?.user?.fullName ??
    dmTargetState?.fullName ??
    'Người dùng'

  const activeAvatar = toAbsUrl(
    selectedDmThread?.avatar ??
    selectedDmThread?.user?.avatar ??
    dmTargetState?.avatar ??
    null,
  )
  const activeColor = nameColor(activeName)

  function isMyMsg(msg: DirectMessage): boolean {
    const sid = rid(msg.senderId)
    if (myId && sid && myId === sid) return true
    if (myId && sid && myId !== sid) return false
    const sname = msg.senderName ?? ''
    if (sname && me?.fullName && sname === me.fullName) return true
    return false
  }

  function isMyGroupMsg(msg: ChatMessage): boolean {
    return rid(msg.senderId) === myId
  }

  const switchToDmTab = () => {
    if (activeTab !== 'dm') setActiveTab('dm')
    setSearchText('')
    setGroupSideOpen(false)

    if (selectedThread?.threadType === 'DM') return

    if (dmThreads.length > 0) {
      const first = dmThreads[0]
      if (rid(selectedThread?.userId) !== rid(first.userId)) setSelectedThread(first)
      if (rid(activeId) !== rid(first.userId)) setActiveId(rid(first.userId))
      navigate(`/inbox/${rid(first.userId)}`, { replace: true })
    } else {
      setSelectedThread(null)
      setActiveId('')
    }
  }

  const switchToGroupTab = () => {
    if (activeTab !== 'group') setActiveTab('group')
    setSearchText('')
    setDmSideOpen(false)

    navigate('/inbox', { replace: true })

    if (selectedThread?.threadType === 'GROUP') return

    if (groupThreads.length > 0) {
      const first = groupThreads[0]
      if (rid(selectedThread?.groupId) !== rid(first.groupId)) {
        setSelectedThread(first)
      }
    } else {
      setSelectedThread(null)
    }
  }

  const selectThread = useCallback((conv: Conversation) => {
    setSelectedThread(prev => {
      if (
        prev?.threadType === conv.threadType &&
        (
          (conv.threadType === 'GROUP' && rid(prev.groupId) === rid(conv.groupId)) ||
          (conv.threadType === 'DM' && rid(prev.userId) === rid(conv.userId))
        )
      ) {
        return prev
      }
      return conv
    })

    setHoveredId(null)
    setMenuOpenId(null)
    setReactionPickerId(null)
    setShowEmoji(false)
    setGroupHoveredId(null)
    setGroupMenuOpenId(null)
    setGroupReactionPickerId(null)
    setGroupShowEmoji(false)

    if (conv.threadType === 'GROUP') {
      setActiveTab('group')
      setActiveId('')
      setInput('')
      setPickedFiles([])
      setReplyTo(null)
      setDmSideOpen(false)
      setGroupSideOpen(false)
      navigate('/inbox', { replace: true })
    } else {
      const uid = rid(conv.userId)
      setActiveTab('dm')
      setActiveId(uid)
      setGroupInput('')
      setGroupPickedFiles([])
      setGroupReplyTo(null)
      setGroupSideOpen(false)
      setDmSideOpen(false)
      navigate(`/inbox/${uid}`, { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (selectedThread?.threadType === 'GROUP') {
      setDmSideOpen(false)
    } else if (selectedThread?.threadType === 'DM') {
      setGroupSideOpen(false)
    }
  }, [selectedThread])

  const handlePickImages = (files: FileList | null) => {
    if (!files) return
    setPickedFiles(prev => [...prev, ...Array.from(files)])
  }

  const handlePickFiles = (files: FileList | null) => {
    if (!files) return
    setPickedFiles(prev => [...prev, ...Array.from(files)])
  }

  const handleGroupPickImages = (files: FileList | null) => {
    if (!files) return
    setGroupPickedFiles(prev => [...prev, ...Array.from(files)])
  }

  const handleGroupPickFiles = (files: FileList | null) => {
    if (!files) return
    setGroupPickedFiles(prev => [...prev, ...Array.from(files)])
  }

  const removePicked = (index: number) => {
    setPickedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeGroupPicked = (index: number) => {
    setGroupPickedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const addGroupEmoji = (emoji: string) => {
    setGroupInput(prev => prev + emoji)
    setGroupShowEmoji(false)
    groupInputRef.current?.focus()
  }

  const uploadPickedFiles = async (): Promise<DirectMessageAttachment[]> => {
    if (pickedFiles.length === 0) return []

    const uploaded: DirectMessageAttachment[] = []

    for (const file of pickedFiles) {
      const isImage = file.type.startsWith('image/')
      const res = isImage
        ? await (dmApi as any).uploadImage?.(file)
        : await (dmApi as any).uploadFile?.(file)

      if (res) {
        uploaded.push({
          name: res.name,
          url: res.url,
          type: res.type,
          sizeKb: res.sizeKb,
        })
      }
    }

    return uploaded
  }

  const uploadGroupPickedFiles = async (): Promise<ChatAttachment[]> => {
    if (groupPickedFiles.length === 0) return []

    const uploaded: ChatAttachment[] = []

    for (const file of groupPickedFiles) {
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

  const doSend = useCallback(async () => {
    if (!isSelectedDm) return
    if ((!input.trim() && pickedFiles.length === 0) || !activeId || sending) return

    const text = input.trim()
    setInput('')
    setSending(true)

    try {
      let attachments: DirectMessageAttachment[] = []
      try {
        attachments = await uploadPickedFiles()
      } catch {
        attachments = []
      }

      const type =
        attachments.length > 0
          ? attachments.some(a => isImageAttachment(a)) ? 'IMAGE' : 'FILE'
          : 'TEXT'

      await dmApi.send(activeId, text, type, attachments, replyTo)
      setPickedFiles([])
      setReplyTo(null)
      await refetchMsgs()
      await refetchPinned()
      qc.invalidateQueries({ queryKey: ['dm-conversations'] })
    } catch {
      toast.error('Không thể gửi tin nhắn!')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, activeId, sending, pickedFiles, refetchMsgs, refetchPinned, qc, replyTo, isSelectedDm])

  const doSendGroup = useCallback(async () => {
    if (!isSelectedGroup || !selectedGroupId) return
    if ((!groupInput.trim() && groupPickedFiles.length === 0) || groupSending) return

    const text = groupInput.trim()
    setGroupInput('')
    setGroupSending(true)

    try {
      const attachments = await uploadGroupPickedFiles()
      const saved = await chatApi.sendMessage(selectedGroupId, {
        content: text,
        attachments,
        replyTo: groupReplyTo,
      })

      setGroupMessages(prev => {
        const exists = prev.some(m => rid(m.id) === rid((saved as any).id))
        if (exists) return prev
        return [...prev, saved as any]
      })

      if ((saved as any)?.pinned) {
        setGroupPinned(prev => {
          const exists = prev.some(m => rid(m.id) === rid((saved as any).id))
          if (exists) return prev
          return [saved as any, ...prev]
        })
      }

      setGroupPickedFiles([])
      setGroupReplyTo(null)
      qc.invalidateQueries({ queryKey: ['dm-conversations'] })
      qc.invalidateQueries({ queryKey: ['group-messages', selectedGroupId] })
      qc.invalidateQueries({ queryKey: ['group-pinned', selectedGroupId] })
    } catch {
      toast.error('Không thể gửi tin nhắn nhóm!')
    } finally {
      setGroupSending(false)
      groupInputRef.current?.focus()
    }
  }, [isSelectedGroup, selectedGroupId, groupInput, groupPickedFiles, groupSending, qc, groupReplyTo])

  const handlePin = async (messageId: string, pinnedNow: boolean) => {
    try {
      if (pinnedNow) {
        await dmApi.unpin(messageId)
        toast.success('Đã bỏ ghim')
      } else {
        await dmApi.pin(messageId)
        toast.success('Đã ghim tin nhắn')
      }
      setMenuOpenId(null)
      await refetchMsgs()
      await refetchPinned()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể ghim tin nhắn')
    }
  }

  const handleGroupPin = async (messageId: string, pinnedNow: boolean) => {
    if (!selectedGroupId) return
    try {
      const updated = pinnedNow
        ? await chatApi.unpin(selectedGroupId, messageId)
        : await chatApi.pin(selectedGroupId, messageId)

      setGroupMessages(prev => prev.map(m => (rid(m.id) === rid((updated as any).id) ? (updated as any) : m)))

      if (pinnedNow) {
        setGroupPinned(prev => prev.filter(m => rid(m.id) !== rid(messageId)))
        toast.success('Đã bỏ ghim')
      } else {
        setGroupPinned(prev => {
          const filtered = prev.filter(m => rid(m.id) !== rid((updated as any).id))
          return [updated as any, ...filtered]
        })
        toast.success('Đã ghim tin nhắn')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể ghim tin nhắn nhóm')
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await dmApi.react(messageId, emoji)
      setReactionPickerId(null)
      await refetchMsgs()
      await refetchPinned()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể thả cảm xúc')
    }
  }

  const handleGroupReact = async (messageId: string, emoji: string) => {
    if (!selectedGroupId) return
    try {
      const updated = await chatApi.react(selectedGroupId, messageId, emoji)
      setGroupMessages(prev => prev.map(m => (rid(m.id) === rid((updated as any).id) ? (updated as any) : m)))
      setGroupPinned(prev => prev.map(m => (rid(m.id) === rid((updated as any).id) ? (updated as any) : m)))
      setGroupReactionPickerId(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể thả cảm xúc')
    }
  }

  const handleRecall = async (messageId: string) => {
    try {
      await dmApi.recall(messageId)
      setMenuOpenId(null)
      await refetchMsgs()
      await refetchPinned()
      qc.invalidateQueries({ queryKey: ['dm-conversations'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể thu hồi tin nhắn')
    }
  }

  const handleGroupRecall = async (messageId: string) => {
    if (!selectedGroupId) return
    try {
      const updated = await chatApi.recall(selectedGroupId, messageId)
      setGroupMessages(prev => prev.map(m => (rid(m.id) === rid((updated as any).id) ? (updated as any) : m)))
      setGroupPinned(prev => prev.filter(m => rid(m.id) !== rid(messageId)))
      setGroupMenuOpenId(null)
      qc.invalidateQueries({ queryKey: ['dm-conversations'] })
      qc.invalidateQueries({ queryKey: ['group-messages', selectedGroupId] })
      qc.invalidateQueries({ queryKey: ['group-pinned', selectedGroupId] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không thể thu hồi tin nhắn')
    }
  }

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.animate(
        [
          { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          { boxShadow: '0 0 0 3px rgba(99,102,241,.35)' },
          { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        ],
        { duration: 1500 },
      )
    }
  }

  const scrollToGroupMessage = (messageId: string) => {
    const el = groupMessageRefs.current[messageId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.animate(
        [
          { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          { boxShadow: '0 0 0 3px rgba(99,102,241,.35)' },
          { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        ],
        { duration: 1500 },
      )
    }
  }

  const startReply = (msg: DirectMessage) => {
    if ((msg as any).recalled) return

    setReplyTo({
      messageId: (msg as any).id,
      senderId: (msg as any).senderId,
      senderName: isMyMsg(msg) ? (me?.fullName ?? 'Bạn') : ((msg as any).senderName ?? activeName),
      content: (msg as any).content,
      type: (msg as any).type,
      attachments: (msg as any).attachments ?? [],
    })
    setMenuOpenId(null)
    inputRef.current?.focus()
  }

  const startGroupReply = (msg: ChatMessage) => {
    if ((msg as any).recalled) return
    setGroupReplyTo({
      messageId: (msg as any).id,
      senderId: (msg as any).senderId,
      senderName: (msg as any).senderName,
      content: (msg as any).content,
      type: (msg as any).type,
      attachments: (msg as any).attachments ?? [],
    })
    setGroupMenuOpenId(null)
    groupInputRef.current?.focus()
  }

  const dmFiles = useMemo(() => {
    return messages.flatMap((m: DirectMessage) =>
      ((m as any).attachments || []).map((att: DirectMessageAttachment) => ({
        ...att,
        messageId: (m as any).id,
        createdAt: (m as any).createdAt,
        senderName: (m as any).senderName,
      })),
    )
  }, [messages])

  const dmMedia = useMemo(() => dmFiles.filter(f => isImageAttachment(f)), [dmFiles])

  const groupFiles = useMemo(() => {
    return groupMessages.flatMap((m: ChatMessage) =>
      ((m as any).attachments || []).map((att: ChatAttachment) => ({
        ...att,
        messageId: (m as any).id,
        createdAt: (m as any).createdAt,
        senderName: (m as any).senderName,
      })),
    )
  }, [groupMessages])

  const groupMedia = useMemo(() => groupFiles.filter(f => isImageAttachment(f)), [groupFiles])

  const totalUnreadDm = useMemo(
    () => dmThreads.reduce((sum, item) => sum + ((item as any).unreadCount ?? 0), 0),
    [dmThreads],
  )

  const totalUnreadGroup = useMemo(
    () => groupThreads.reduce((sum, item) => sum + ((item as any).unreadCount ?? 0), 0),
    [groupThreads],
  )

  return (
    <div
      className="flex h-[calc(100vh-80px)] rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <div className="w-80 border-r flex flex-col flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <MessageCircle size={15} className="text-indigo-400" />
              Đoạn chat
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchConvs()}
                className="transition-colors p-1"
                style={{ color: 'var(--text3)' }}
                title="Tải lại"
              >
                <RefreshCw size={13} />
              </button>

              <div
                className="w-7 h-7 rounded-lg border flex items-center justify-center"
                style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
                title="Tìm kiếm"
              >
                <Search size={13} />
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-2 px-3 h-10 rounded-xl border mb-3"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <Search size={14} style={{ color: 'var(--text3)' }} />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder={activeTab === 'dm' ? 'Tìm theo tên người dùng...' : 'Tìm theo tên nhóm...'}
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--text)' }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={switchToDmTab}
              className="px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-2"
              style={{
                background: activeTab === 'dm' ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                color: activeTab === 'dm' ? '#818cf8' : 'var(--text2)',
                border: `1px solid ${activeTab === 'dm' ? 'rgba(99,102,241,.25)' : 'var(--border)'}`,
              }}
            >
              Tin nhắn
              {totalUnreadDm > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">
                  {totalUnreadDm > 9 ? '9+' : totalUnreadDm}
                </span>
              )}
            </button>

            <button
              onClick={switchToGroupTab}
              className="px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-2"
              style={{
                background: activeTab === 'group' ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                color: activeTab === 'group' ? '#818cf8' : 'var(--text2)',
                border: `1px solid ${activeTab === 'group' ? 'rgba(99,102,241,.25)' : 'var(--border)'}`,
              }}
            >
              Nhóm
              {totalUnreadGroup > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">
                  {totalUnreadGroup > 9 ? '9+' : totalUnreadGroup}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadConvs ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-indigo-400" />
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--bg4)' }} />
              <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                {searchText
                  ? 'Không tìm thấy kết quả phù hợp'
                  : activeTab === 'dm'
                    ? 'Chưa có cuộc trò chuyện nào'
                    : 'Chưa có nhóm nào có tin nhắn'}
              </p>
            </div>
          ) : (
            visibleThreads.map((conv: Conversation, index: number) => {
              const isGroup = (conv as any).threadType === 'GROUP'
              const key = isGroup ? `g-${(conv as any).groupId ?? index}` : `u-${(conv as any).userId ?? index}`
              const uid = rid((conv as any).userId)
              const title = (conv as any).title ?? (conv as any).user?.fullName ?? (conv as any).groupName ?? 'Cuộc trò chuyện'
              const color = (conv as any).groupColor || nameColor(title)
              const isAct =
                (selectedThread as any)?.threadType === (conv as any).threadType &&
                (
                  (isGroup && rid((selectedThread as any)?.groupId) === rid((conv as any).groupId)) ||
                  (!isGroup && rid((selectedThread as any)?.userId) === uid)
                )

              const lm = (conv as any).lastMessage as any
              const lmSid = rid(lm?.senderId)
              const iMySent = lmSid === myId
              const preview = lm?.recalled
                ? (iMySent ? 'Bạn đã thu hồi một tin nhắn' : 'Tin nhắn đã được thu hồi')
                : lm?.content
                  ? `${isGroup ? `${lm.senderName ?? 'Ai đó'}: ` : (iMySent ? 'Bạn: ' : '')}${lm.content}`
                  : (lm?.attachments?.length ? '[Tệp đính kèm]' : '')

              const avatarUrl = toAbsUrl((conv as any).avatar ?? (conv as any).user?.avatar)

              return (
                <button
                  key={key}
                  onClick={() => selectThread(conv)}
                  className={clsx(
                    'w-full px-4 py-3 flex items-center gap-3 transition-all text-left border-l-2',
                    isAct ? 'bg-indigo-500/10 border-indigo-500' : 'hover:bg-white/[.03] border-transparent',
                  )}
                >
                  <div className="relative flex-shrink-0">
                    {isGroup ? (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ background: color }}
                      >
                        <Hash size={16} />
                      </div>
                    ) : avatarUrl ? (
                      <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" alt={title} />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                        style={{ background: color }}
                      >
                        {ini(title)}
                      </div>
                    )}

                    {!isGroup && isOnline5m((conv as any).lastActiveAt) && (
                      <div
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
                        style={{ background: '#22c55e', borderColor: 'var(--bg)' }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                        {title}
                      </span>
                      {(lm?.createdAt || (conv as any)?.lastActiveAt) && (
                        <span className="text-[10px] flex-shrink-0 ml-1" style={{ color: 'var(--text3)' }}>
                          {ago(lm?.createdAt || (conv as any)?.lastActiveAt)}
                        </span>
                      )}
                    </div>

                    <p className={clsx('text-[11px] truncate mb-0.5', lm?.recalled && 'italic')} style={{ color: 'var(--text3)' }}>
                      {preview || (isGroup ? 'Nhắn tin nhóm' : 'Nhắn tin mới')}
                    </p>

                    {!isGroup && !isOnline5m((conv as any).lastActiveAt) && (conv as any).lastActiveAt && (
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        Hoạt động {ago((conv as any).lastActiveAt)}
                      </p>
                    )}

                    {isGroup && (conv as any).groupDescription && (
                      <p className="text-[10px] truncate" style={{ color: 'var(--text3)' }}>
                        {(conv as any).groupDescription}
                      </p>
                    )}
                  </div>

                  {((conv as any).unreadCount ?? 0) > 0 && (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {(conv as any).unreadCount > 9 ? '9+' : (conv as any).unreadCount}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {(!selectedThread && !isSelectedDm) ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle size={48} style={{ color: 'var(--bg4)' }} className="mx-auto mb-4" />
            <p className="text-[14px]" style={{ color: 'var(--text3)' }}>
              Chọn cuộc trò chuyện để bắt đầu
            </p>
          </div>
        </div>
      ) : activeTab === 'group' && isSelectedGroup ? (
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className="px-5 h-16 flex items-center gap-3 border-b flex-shrink-0"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${(selectedGroupThread as any).groupColor || '#6366f1'}20`,
                  border: `1px solid ${((selectedGroupThread as any).groupColor || '#6366f1')}40`,
                }}
              >
                <Hash size={17} style={{ color: (selectedGroupThread as any).groupColor || '#6366f1' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {(selectedGroupThread as any).title ?? (selectedGroupThread as any).groupName ?? 'Chat nhóm'}
                </div>
                <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  {(selectedGroupThread as any).groupDescription || 'Nhóm học tập'}
                </div>
              </div>

              <button
                onClick={() => {
                  setDmSideOpen(false)
                  setGroupSideOpen(v => !v)
                }}
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
                  groupConnected
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
                {groupConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {groupConnected ? 'Realtime' : 'Offline'}
              </div>
            </div>

            {groupPinned.length > 0 && (
              <div className="px-5 py-3 border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Pin size={14} style={{ color: '#f59e0b' }} />
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                    Tin nhắn đã ghim ({groupPinned.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {groupPinned.slice(0, 4).map(msg => (
                    <div
                      key={(msg as any).id}
                      className="group px-3 py-2 rounded-2xl text-[12px] max-w-[280px] border flex items-center gap-2"
                      style={{
                        background: 'var(--bg3)',
                        borderColor: 'var(--border)',
                        color: 'var(--text2)',
                      }}
                    >
                      <button className="truncate text-left flex-1" onClick={() => scrollToGroupMessage((msg as any).id)}>
                        <span className="font-medium">{(msg as any).senderName}:</span>{' '}
                        {(msg as any).recalled ? 'Tin nhắn đã được thu hồi' : ((msg as any).content || '[Tệp đính kèm]')}
                      </button>

                      <button onClick={() => handleGroupPin((msg as any).id, true)} className="opacity-70 hover:opacity-100" title="Gỡ ghim">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: 'var(--bg)' }}>
              {groupLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-indigo-400" />
                </div>
              ) : groupMessages.length === 0 ? (
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
                  {groupMessages.map((msg, i) => {
                    const isMe = isMyGroupMsg(msg)
                    const prev = groupMessages[i - 1]
                    const sameUser = prev && rid((prev as any).senderId) === rid((msg as any).senderId)
                    const showMeta =
                      i === 0 ||
                      !sameUser ||
                      new Date((msg as any).createdAt).getTime() - new Date((prev as any).createdAt).getTime() > 5 * 60 * 1000

                    return (
                      <div
                        key={(msg as any).id ?? `gmsg-${i}`}
                        ref={el => {
                          if ((msg as any).id) groupMessageRefs.current[(msg as any).id] = el
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
                              {ago((msg as any).createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={clsx('flex gap-3 items-end', isMe ? 'flex-row-reverse' : 'flex-row')}
                          onMouseEnter={() => setGroupHoveredId((msg as any).id)}
                          onMouseLeave={() => {
                            setGroupHoveredId(null)
                            setGroupReactionPickerId(null)
                          }}
                        >
                          <div className={clsx(!showMeta && 'invisible')}>
                            <Avatar name={(msg as any).senderName || 'TV'} avatar={(msg as any).senderAvatar} size={36} />
                          </div>

                          <div className={clsx('max-w-[78%] flex flex-col relative', isMe ? 'items-end' : 'items-start')}>
                            {!isMe && showMeta && (
                              <span className="text-[11px] mb-1 px-1" style={{ color: 'var(--text3)' }}>
                                {(msg as any).senderName}
                              </span>
                            )}

                            <div className="relative">
                              {groupHoveredId === (msg as any).id && !(msg as any).recalled && (
                                <div
                                  className={clsx(
                                    'absolute -top-9 flex items-center gap-1 z-20',
                                    isMe ? 'right-0' : 'left-0',
                                  )}
                                >
                                  <button
                                    onClick={() => setGroupReactionPickerId(groupReactionPickerId === (msg as any).id ? null : (msg as any).id)}
                                    className="w-8 h-8 rounded-full border flex items-center justify-center"
                                    style={{
                                      background: 'var(--bg2)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--text2)',
                                    }}
                                  >
                                    <Smile size={14} />
                                  </button>

                                  <button
                                    onClick={() => handleGroupPin((msg as any).id, !!(msg as any).pinned)}
                                    className="w-8 h-8 rounded-full border flex items-center justify-center"
                                    style={{
                                      background: 'var(--bg2)',
                                      borderColor: 'var(--border)',
                                      color: (msg as any).pinned ? '#f59e0b' : 'var(--text2)',
                                    }}
                                  >
                                    <Pin size={14} />
                                  </button>

                                  <button
                                    onClick={() => setGroupMenuOpenId(groupMenuOpenId === (msg as any).id ? null : (msg as any).id)}
                                    className="w-8 h-8 rounded-full border flex items-center justify-center"
                                    style={{
                                      background: 'var(--bg2)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--text2)',
                                    }}
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                </div>
                              )}

                              {groupReactionPickerId === (msg as any).id && !(msg as any).recalled && (
                                <div
                                  className={clsx(
                                    'absolute -top-20 rounded-2xl border px-2 py-2 flex items-center gap-1 z-30',
                                    isMe ? 'right-0' : 'left-0',
                                  )}
                                  style={{
                                    background: 'var(--bg2)',
                                    borderColor: 'var(--border)',
                                  }}
                                >
                                  {EMOJIS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleGroupReact(rid((msg as any).id), emoji)}
                                      className="text-[18px] hover:scale-110 transition-transform"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {groupMenuOpenId === (msg as any).id && (
                                <div
                                  className={clsx(
                                    'absolute top-10 rounded-2xl border shadow-xl z-30 min-w-[170px] overflow-hidden',
                                    isMe ? 'right-0' : 'left-0',
                                  )}
                                  style={{
                                    background: 'var(--bg2)',
                                    borderColor: 'var(--border)',
                                  }}
                                >
                                  {!(msg as any).recalled && (
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText((msg as any).content || '')
                                        toast.success('Đã sao chép tin nhắn')
                                        setGroupMenuOpenId(null)
                                      }}
                                      className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04]"
                                      style={{ color: 'var(--text)' }}
                                    >
                                      Sao chép
                                    </button>
                                  )}

                                  {!(msg as any).recalled && (
                                    <button
                                      onClick={() => startGroupReply(msg)}
                                      className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04] flex items-center gap-2"
                                      style={{ color: 'var(--text)' }}
                                    >
                                      <Reply size={14} />
                                      Trả lời
                                    </button>
                                  )}

                                  {isMe && !(msg as any).recalled && (
                                    <button
                                      onClick={() => handleGroupRecall((msg as any).id)}
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
                                  'rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm',
                                  isMe ? 'bg-indigo-500 text-white rounded-tr-sm' : 'border rounded-tl-sm',
                                )}
                                style={
                                  !isMe
                                    ? {
                                        background: 'var(--bg3)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--text2)',
                                      }
                                    : {}
                                }
                              >
                                {(msg as any).recalled ? (
                                  <p className="italic opacity-70">
                                    {isMe ? 'Bạn đã thu hồi một tin nhắn' : 'Tin nhắn đã được thu hồi'}
                                  </p>
                                ) : (
                                  <>
                                    <GroupReplyPreviewBox
                                      reply={(msg as any).replyTo}
                                      mine={isMe}
                                      onClick={() => (msg as any).replyTo?.messageId && scrollToGroupMessage((msg as any).replyTo.messageId)}
                                    />

                                    {!!(msg as any).content && <p className="whitespace-pre-wrap break-words">{(msg as any).content}</p>}

                                    {!!(msg as any).attachments?.length && (
                                      <div className="space-y-2">
                                        {(msg as any).attachments.map((att: ChatAttachment, idx2: number) => (
                                          <GroupAttachmentCard key={idx2} att={att} />
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}

                                <p
                                  className={clsx('text-[10px] mt-2', isMe ? 'text-white/60 text-right' : '')}
                                  style={!isMe ? { color: 'var(--text3)' } : {}}
                                >
                                  {(msg as any).pinned ? '📌 ' : ''}
                                  {ago((msg as any).createdAt)}
                                </p>
                              </div>

                              {!!(msg as any).reactions?.length && !(msg as any).recalled && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(msg as any).reactions.map((r: any) => (
                                    <button
                                      key={r.emoji}
                                      onClick={() => handleGroupReact(rid((msg as any).id), r.emoji)}
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
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div ref={groupBottomRef} />
            </div>

            <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              {groupReplyTo && (
                <div
                  className="mb-3 rounded-2xl border px-3 py-3 flex items-start justify-between gap-3"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium" style={{ color: '#818cf8' }}>
                      Đang trả lời {groupReplyTo.senderName || 'tin nhắn'}
                    </div>
                    <div
                      className="text-[12px] truncate mt-1 px-3 py-2 rounded-xl border-l-[3px]"
                      style={{
                        color: 'var(--text2)',
                        background: 'rgba(99,102,241,.06)',
                        borderLeftColor: '#60a5fa',
                      }}
                    >
                      {groupReplyTo.content?.trim()
                        ? groupReplyTo.content
                        : groupReplyTo.attachments?.length
                          ? '[Tệp đính kèm]'
                          : '[Tin nhắn]'}
                    </div>
                  </div>

                  <button
                    onClick={() => setGroupReplyTo(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ color: 'var(--text3)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {groupPickedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {groupPickedFiles.map((file, idx) => (
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
                        onClick={() => removeGroupPicked(idx)}
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
                  ref={groupImageRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={e => handleGroupPickImages(e.target.files)}
                />
                <input
                  ref={groupFileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={e => handleGroupPickFiles(e.target.files)}
                />

                <button
                  onClick={() => groupImageRef.current?.click()}
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
                  onClick={() => groupFileRef.current?.click()}
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
                    onClick={() => setGroupShowEmoji(v => !v)}
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

                  {groupShowEmoji && (
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
                          onClick={() => addGroupEmoji(emoji)}
                          className="text-xl hover:scale-110 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-colors"
                style={{
                  background: 'var(--bg3)',
                  borderColor: 'var(--border)',
                }}
              >
                <input
                  ref={groupInputRef}
                  value={groupInput}
                  onChange={e => setGroupInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      doSendGroup()
                    }
                  }}
                  placeholder={`Nhắn tin trong ${(selectedGroupThread as any).title ?? 'nhóm'}...`}
                  className="flex-1 bg-transparent text-[13px] outline-none"
                  style={{ color: 'var(--text)' }}
                />

                <button
                  onClick={doSendGroup}
                  disabled={(!groupInput.trim() && groupPickedFiles.length === 0) || groupSending}
                  className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 transition-all flex items-center justify-center flex-shrink-0"
                >
                  {groupSending ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <Send size={14} className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {groupSideOpen && (
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
                <button onClick={() => setGroupSideOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 flex flex-wrap gap-2">
                {[
                  ['pinned', 'Ghim'],
                  ['files', 'File'],
                  ['media', 'Ảnh'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setGroupSideTab(key as GroupSideTab)}
                    className="px-3 py-2 rounded-xl text-[12px] border"
                    style={{
                      background: groupSideTab === key ? 'rgba(99,102,241,.14)' : 'var(--bg3)',
                      borderColor: groupSideTab === key ? 'rgba(99,102,241,.25)' : 'var(--border)',
                      color: groupSideTab === key ? '#818cf8' : 'var(--text2)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="px-3 pb-3 overflow-y-auto h-[calc(100%-112px)]">
                <div
                  className="rounded-2xl border p-4 mb-3"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                      style={{ background: (selectedGroupThread as any).groupColor || '#6366f1' }}
                    >
                      <Hash size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {(selectedGroupThread as any).title || (selectedGroupThread as any).groupName}
                      </div>
                      <div className="text-[12px] truncate" style={{ color: 'var(--text3)' }}>
                        {(selectedGroupThread as any).groupDescription || 'Nhóm học tập'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/groups/${selectedGroupId}/chat`)}
                    className="w-full px-3 py-2 rounded-xl text-[12px]"
                    style={{ background: '#6366f1', color: '#fff' }}
                  >
                    Mở chat nhóm đầy đủ
                  </button>
                </div>

                {groupSideTab === 'pinned' && (
                  <div className="space-y-2">
                    {groupPinned.length === 0 ? (
                      <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                        Chưa có tin nhắn ghim
                      </div>
                    ) : (
                      groupPinned.map(msg => (
                        <div
                          key={(msg as any).id}
                          className="rounded-2xl border p-3"
                          style={{
                            background: 'var(--bg3)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <button
                            onClick={() => {
                              scrollToGroupMessage((msg as any).id)
                              setGroupSideOpen(false)
                            }}
                            className="w-full text-left"
                          >
                            <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                              {(msg as any).senderName}
                            </div>
                            <div className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
                              {(msg as any).recalled ? 'Tin nhắn đã được thu hồi' : ((msg as any).content || '[Tệp đính kèm]')}
                            </div>
                          </button>

                          <button
                            onClick={() => handleGroupPin((msg as any).id, true)}
                            className="mt-2 text-[12px]"
                            style={{ color: '#ef4444' }}
                          >
                            Gỡ ghim
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {groupSideTab === 'files' && (
                  <div className="space-y-2">
                    {groupFiles.length === 0 ? (
                      <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                        Chưa có file nào
                      </div>
                    ) : (
                      groupFiles.map((f: any, idx) => (
                        <a
                          key={`${f.name}-${idx}`}
                          href={toAbsUrl(f.url)}
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
                                {f.senderName} · {ago(f.createdAt)}
                              </div>
                            </div>
                            <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                )}

                {groupSideTab === 'media' && (
                  <div className="grid grid-cols-2 gap-2">
                    {groupMedia.length === 0 ? (
                      <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                        Chưa có ảnh nào
                      </div>
                    ) : (
                      groupMedia.map((m: any, idx) => (
                        <a key={`${m.name}-${idx}`} href={toAbsUrl(m.url)} target="_blank" rel="noreferrer">
                          <img
                            src={toAbsUrl(m.url)}
                            alt={m.name}
                            className="w-full h-[120px] object-cover rounded-2xl border"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : isSelectedDm ? (
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <button onClick={() => navigate(-1)} className="md:hidden" style={{ color: 'var(--text3)' }}>
                <ArrowLeft size={16} />
              </button>

              <Avatar name={activeName} avatar={activeAvatar} size={36} bg={activeColor} />

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {activeName}
                </p>
                {isOnline5m((selectedDmThread as any)?.lastActiveAt) ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
                    <p className="text-[11px]" style={{ color: '#22c55e' }}>
                      Đang hoạt động
                    </p>
                  </div>
                ) : (selectedDmThread as any)?.lastActiveAt ? (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                    Hoạt động {ago((selectedDmThread as any).lastActiveAt)}
                  </p>
                ) : null}
              </div>

              <button
                onClick={() => {
                  setGroupSideOpen(false)
                  setDmSideOpen(v => !v)
                }}
                className="w-10 h-10 rounded-xl border flex items-center justify-center"
                style={{
                  background: 'var(--bg3)',
                  borderColor: 'var(--border)',
                  color: '#f59e0b',
                }}
                title="Chi tiết đoạn chat"
              >
                <AlertCircle size={18} />
              </button>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="px-4 py-3 border-b" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Pin size={14} style={{ color: '#f59e0b' }} />
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                    Tin nhắn đã ghim ({pinnedMessages.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pinnedMessages.slice(0, 3).map((msg: DirectMessage) => (
                    <div
                      key={(msg as any).id}
                      className="group px-3 py-2 rounded-2xl text-[12px] max-w-[260px] border flex items-center gap-2"
                      style={{
                        background: 'var(--bg3)',
                        borderColor: 'var(--border)',
                        color: 'var(--text2)',
                      }}
                    >
                      <button className="truncate text-left flex-1" onClick={() => scrollToMessage((msg as any).id)}>
                        <span className="font-medium">{(msg as any).senderName ?? activeName}:</span>{' '}
                        {(msg as any).recalled ? 'Tin nhắn đã được thu hồi' : ((msg as any).content || '[Tệp đính kèm]')}
                      </button>

                      <button onClick={() => handlePin((msg as any).id, true)} className="opacity-70 hover:opacity-100" title="Gỡ ghim">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadMsgs ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-indigo-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
                    Bắt đầu cuộc trò chuyện với {activeName}!
                  </p>
                </div>
              ) : (
                messages.map((msg: DirectMessage, idx: number) => {
                  const mine = isMyMsg(msg)
                  const sname = mine ? (me?.fullName ?? 'Bạn') : ((msg as any).senderName ?? activeName)
                  const myAvatarUrl = toAbsUrl((me as any)?.avatar)

                  return (
                    <div
                      key={(msg as any).id ?? `msg-${idx}`}
                      ref={el => {
                        messageRefs.current[(msg as any).id] = el
                      }}
                      className={clsx('flex gap-2 items-end', mine ? 'justify-end' : 'justify-start')}
                      onMouseEnter={() => setHoveredId((msg as any).id)}
                      onMouseLeave={() => {
                        setHoveredId(null)
                        setReactionPickerId(null)
                      }}
                    >
                      {!mine && <Avatar name={sname} avatar={activeAvatar} size={28} bg={activeColor} />}

                      <div className={clsx('max-w-[68%] flex flex-col', mine ? 'items-end' : 'items-start')}>
                        {!mine && (
                          <p className="text-[10px] mb-0.5 px-1" style={{ color: 'var(--text3)' }}>
                            {sname}
                          </p>
                        )}

                        <div className="relative">
                          {hoveredId === (msg as any).id && !(msg as any).recalled && (
                            <div
                              className={clsx(
                                'absolute -top-9 flex items-center gap-1 z-20',
                                mine ? 'right-0' : 'left-0',
                              )}
                            >
                              <button
                                onClick={() => setReactionPickerId(reactionPickerId === (msg as any).id ? null : (msg as any).id)}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{
                                  background: 'var(--bg2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text2)',
                                }}
                              >
                                <Smile size={14} />
                              </button>

                              <button
                                onClick={() => handlePin((msg as any).id, !!(msg as any).pinned)}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{
                                  background: 'var(--bg2)',
                                  borderColor: 'var(--border)',
                                  color: (msg as any).pinned ? '#f59e0b' : 'var(--text2)',
                                }}
                              >
                                <Pin size={14} />
                              </button>

                              <button
                                onClick={() => setMenuOpenId(menuOpenId === (msg as any).id ? null : (msg as any).id)}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{
                                  background: 'var(--bg2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text2)',
                                }}
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </div>
                          )}

                          {reactionPickerId === (msg as any).id && !(msg as any).recalled && (
                            <div
                              className={clsx(
                                'absolute -top-20 rounded-2xl border px-2 py-2 flex items-center gap-1 z-30',
                                mine ? 'right-0' : 'left-0',
                              )}
                              style={{
                                background: 'var(--bg2)',
                                borderColor: 'var(--border)',
                              }}
                            >
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact((msg as any).id, emoji)}
                                  className="text-[18px] hover:scale-110 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {menuOpenId === (msg as any).id && (
                            <div
                              className={clsx(
                                'absolute top-10 rounded-2xl border shadow-xl z-30 min-w-[170px] overflow-hidden',
                                mine ? 'right-0' : 'left-0',
                              )}
                              style={{
                                background: 'var(--bg2)',
                                borderColor: 'var(--border)',
                              }}
                            >
                              {!(msg as any).recalled && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText((msg as any).content || '')
                                    toast.success('Đã sao chép tin nhắn')
                                    setMenuOpenId(null)
                                  }}
                                  className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04]"
                                  style={{ color: 'var(--text)' }}
                                >
                                  Sao chép
                                </button>
                              )}

                              {!(msg as any).recalled && (
                                <button
                                  onClick={() => startReply(msg)}
                                  className="w-full px-3 py-3 text-left text-[13px] hover:bg-white/[.04] flex items-center gap-2"
                                  style={{ color: 'var(--text)' }}
                                >
                                  <Reply size={14} />
                                  Trả lời
                                </button>
                              )}

                              {mine && !(msg as any).recalled && (
                                <button
                                  onClick={() => handleRecall((msg as any).id)}
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
                              'rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed',
                              mine ? 'bg-indigo-500 text-white rounded-tr-sm' : 'border rounded-tl-sm',
                            )}
                            style={
                              !mine
                                ? {
                                    background: 'var(--bg3)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text2)',
                                  }
                                : {}
                            }
                          >
                            {(msg as any).recalled ? (
                              <p className="italic opacity-70">
                                {mine ? 'Bạn đã thu hồi một tin nhắn' : 'Tin nhắn đã được thu hồi'}
                              </p>
                            ) : (
                              <>
                                <ReplyPreviewBox
                                  reply={(msg as any).replyTo}
                                  mine={mine}
                                  onClick={() => (msg as any).replyTo?.messageId && scrollToMessage((msg as any).replyTo.messageId)}
                                />

                                {!!(msg as any).content && <p className="whitespace-pre-wrap break-words">{(msg as any).content}</p>}

                                {!!(msg as any).attachments?.length && (
                                  <div className="space-y-2">
                                    {(msg as any).attachments.map((att: DirectMessageAttachment, attIdx: number) => (
                                      <DirectAttachmentCard key={attIdx} att={att} />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}

                            <p
                              className={clsx('text-[9px] mt-1', mine ? 'text-white/50 text-right' : '')}
                              style={!mine ? { color: 'var(--text3)' } : {}}
                            >
                              {(msg as any).pinned ? '📌 ' : ''}
                              {ago((msg as any).createdAt)}
                              {mine && (msg as any).readAt ? ' · ✓✓' : ''}
                            </p>
                          </div>

                          {!!(msg as any).reactions?.length && !(msg as any).recalled && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(msg as any).reactions.map((r: DirectMessageReaction) => (
                                <button
                                  key={r.emoji}
                                  onClick={() => handleReact((msg as any).id, r.emoji)}
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
                      </div>

                      {mine && <Avatar name={me?.fullName ?? 'Tôi'} avatar={myAvatarUrl} size={28} bg={nameColor(me?.fullName ?? '')} />}
                    </div>
                  )
                })
              )}

              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
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
                  Ảnh
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
              </div>

              <div
                className="flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-colors"
                style={{
                  background: 'var(--bg3)',
                  borderColor: 'var(--border)',
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      doSend()
                    }
                  }}
                  placeholder={`Nhắn tin cho ${activeName}...`}
                  className="flex-1 bg-transparent text-[13px] outline-none"
                  style={{ color: 'var(--text)' }}
                />

                <button
                  onClick={doSend}
                  disabled={(!input.trim() && pickedFiles.length === 0) || sending}
                  className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 transition-all flex items-center justify-center flex-shrink-0"
                >
                  {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
                </button>
              </div>
            </div>
          </div>

          {dmSideOpen && (
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
                  Chi tiết đoạn chat
                </div>
                <button onClick={() => setDmSideOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 flex flex-wrap gap-2">
                {[
                  ['pinned', 'Ghim'],
                  ['files', 'File'],
                  ['media', 'Ảnh'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDmSideTab(key as DmSideTab)}
                    className="px-3 py-2 rounded-xl text-[12px] border"
                    style={{
                      background: dmSideTab === key ? 'rgba(99,102,241,.14)' : 'var(--bg3)',
                      borderColor: dmSideTab === key ? 'rgba(99,102,241,.25)' : 'var(--border)',
                      color: dmSideTab === key ? '#818cf8' : 'var(--text2)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="px-3 pb-3 overflow-y-auto h-[calc(100%-112px)]">
                <div
                  className="rounded-2xl border p-4 mb-3"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={activeName} avatar={activeAvatar} size={44} bg={activeColor} />
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {activeName}
                      </div>
                      {isOnline5m((selectedDmThread as any)?.lastActiveAt) ? (
                        <div className="text-[12px]" style={{ color: '#22c55e' }}>
                          Đang hoạt động
                        </div>
                      ) : (selectedDmThread as any)?.lastActiveAt ? (
                        <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
                          Hoạt động {ago((selectedDmThread as any).lastActiveAt)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {dmSideTab === 'pinned' && (
                  <div className="space-y-2">
                    {pinnedMessages.length === 0 ? (
                      <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                        Chưa có tin nhắn ghim
                      </div>
                    ) : (
                      pinnedMessages.map((msg: DirectMessage) => (
                        <div
                          key={(msg as any).id}
                          className="rounded-2xl border p-3"
                          style={{
                            background: 'var(--bg3)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <button
                            onClick={() => {
                              scrollToMessage((msg as any).id)
                              setDmSideOpen(false)
                            }}
                            className="w-full text-left"
                          >
                            <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                              {(msg as any).senderName || activeName}
                            </div>
                            <div className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
                              {(msg as any).recalled ? 'Tin nhắn đã được thu hồi' : ((msg as any).content || '[Tệp đính kèm]')}
                            </div>
                          </button>

                          <button
                            onClick={() => handlePin((msg as any).id, true)}
                            className="mt-2 text-[12px]"
                            style={{ color: '#ef4444' }}
                          >
                            Gỡ ghim
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {dmSideTab === 'files' && (
                  <div className="space-y-2">
                    {dmFiles.length === 0 ? (
                      <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                        Chưa có file nào
                      </div>
                    ) : (
                      dmFiles.map((f: any, idx) => (
                        <a
                          key={`${f.name}-${idx}`}
                          href={toAbsUrl(f.url)}
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
                                {f.senderName} · {ago(f.createdAt)}
                              </div>
                            </div>
                            <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                )}

                {dmSideTab === 'media' && (
                  <div className="grid grid-cols-2 gap-2">
                    {dmMedia.length === 0 ? (
                      <div className="text-[13px]" style={{ color: 'var(--text3)' }}>
                        Chưa có ảnh nào
                      </div>
                    ) : (
                      dmMedia.map((m: any, idx) => (
                        <a key={`${m.name}-${idx}`} href={toAbsUrl(m.url)} target="_blank" rel="noreferrer">
                          <img
                            src={toAbsUrl(m.url)}
                            alt={m.name}
                            className="w-full h-[120px] object-cover rounded-2xl border"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle size={48} style={{ color: 'var(--bg4)' }} className="mx-auto mb-4" />
            <p className="text-[14px]" style={{ color: 'var(--text3)' }}>
              Chọn cuộc trò chuyện để bắt đầu
            </p>
          </div>
        </div>
      )}
    </div>
  )
}