import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/services'
import {
  AlertTriangle,
  Brain,
  Clock3,
  FileText,
  Flag,
  Lock,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

type AlertCenterData = {
  summary: {
    reportedPosts: number
    pendingGroupPosts: number
    reviewDocuments: number
    lockedUsers: number
    weakLearners: number
    systemWarnings: number
  }
  reportedPosts: Array<{
    id: string
    groupId?: string
    groupName?: string
    authorName?: string
    content?: string
    reportsCount: number
    latestReason?: string
    createdAt?: string
  }>
  pendingGroupPosts: Array<{
    id: string
    groupId?: string
    groupName?: string
    authorName?: string
    content?: string
    createdAt?: string
  }>
  reviewDocuments: Array<{
    id: string
    groupId?: string
    groupName?: string
    name?: string
    uploaderName?: string
    type?: string
    reviewStatus?: string
    reportsCount?: number
    flagReason?: string
    createdAt?: string
  }>
  lockedUsers: Array<{
    id: string
    fullName?: string
    email?: string
    updatedAt?: string
  }>
  weakLearners: Array<{
    id: string
    userId?: string
    name?: string
    gpa: number
    issue?: string
    level?: 'INFO' | 'WARNING' | 'CRITICAL'
    createdAt?: string
  }>
  systemWarnings: Array<{
    id: string
    level: 'critical' | 'warning' | 'info' | 'success'
    title: string
    message: string
    createdAt?: string
  }>
}

type TabKey =
  | 'overview'
  | 'reported-posts'
  | 'pending-posts'
  | 'review-docs'
  | 'locked-users'
  | 'weak-learners'
  | 'system'

type FeedbackState = {
  type: 'success' | 'error'
  message: string
} | null

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'reported-posts', label: 'Bài bị report' },
  { key: 'pending-posts', label: 'Bài chờ duyệt' },
  { key: 'review-docs', label: 'Tài liệu cần xem xét' },
  { key: 'locked-users', label: 'User bị khóa' },
  { key: 'weak-learners', label: 'Học lực yếu' },
  { key: 'system', label: 'Hệ thống' },
]

function timeAgo(v?: string) {
  if (!v) return 'vừa xong'
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

function levelColor(level: string) {
  switch (level) {
    case 'critical':
    case 'CRITICAL':
      return '#ef4444'
    case 'warning':
    case 'WARNING':
      return '#f59e0b'
    case 'success':
      return '#22c55e'
    default:
      return '#818cf8'
  }
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-xl border text-[12px] font-medium transition"
      style={{
        background: active ? 'rgba(99,102,241,.14)' : 'var(--bg2)',
        borderColor: active ? 'rgba(99,102,241,.35)' : 'var(--border)',
        color: active ? '#a5b4fc' : 'var(--text2)',
      }}
    >
      {label}
    </button>
  )
}

function StatBox({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: any
  color: string
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
          {label}
        </span>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="text-[26px] font-semibold font-mono" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="rounded-2xl border p-8 text-center text-[13px]"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text3)' }}
    >
      {text}
    </div>
  )
}

export default function AdminAlerts() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>('overview')
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({})
  const [supportMap, setSupportMap] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const { data, isLoading, isError, refetch } = useQuery<AlertCenterData>({
    queryKey: ['admin-alert-center'],
    queryFn: adminApi.getAlertCenter,
    staleTime: 20_000,
    refetchInterval: 30_000,
  })

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-alert-center'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const approvePostMutation = useMutation({
    mutationFn: (postId: string) => adminApi.approveGroupPost(postId),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Đã duyệt hoặc bỏ qua report bài đăng.' })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể xử lý bài đăng.' })
    },
  })

  const rejectPostMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      adminApi.rejectGroupPost(postId, reason),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Đã từ chối hoặc gỡ bài đăng.' })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể từ chối bài đăng.' })
    },
  })

  const approveDocMutation = useMutation({
    mutationFn: (docId: string) => adminApi.approveDocument(docId),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Đã giữ lại tài liệu.' })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể duyệt tài liệu.' })
    },
  })

  const underReviewDocMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      adminApi.markDocumentUnderReview(docId, reason),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Đã chuyển tài liệu sang trạng thái xem xét.' })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể chuyển tài liệu sang xem xét.' })
    },
  })

  const rejectDocMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      adminApi.rejectDocument(docId, reason),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Đã gỡ hoặc từ chối tài liệu.' })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể từ chối tài liệu.' })
    },
  })

  const unlockUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unlockUser(userId),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Đã mở khóa tài khoản.' })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể mở khóa tài khoản.' })
    },
  })

  const supportMutation = useMutation({
    mutationFn: ({ userId, message }: { userId: string; message: string }) =>
      adminApi.sendSupportReminder(userId, message),
    onSuccess: (_res, vars) => {
      const learner = data?.weakLearners?.find(u => (u.userId || '') === vars.userId)
      const userName = learner?.name || 'người dùng'
      setSupportMap(prev => ({ ...prev, [vars.userId]: '' }))
      setFeedback({
        type: 'success',
        message: `Đã gửi nhắc nhở hỗ trợ cho ${userName}.`,
      })
      refreshAll()
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Không thể gửi nhắc nhở hỗ trợ học tập.' })
    },
  })

  const summary = data?.summary ?? {
    reportedPosts: 0,
    pendingGroupPosts: 0,
    reviewDocuments: 0,
    lockedUsers: 0,
    weakLearners: 0,
    systemWarnings: 0,
  }

  const reportedPosts = useMemo(() => data?.reportedPosts ?? [], [data])
  const pendingGroupPosts = useMemo(() => data?.pendingGroupPosts ?? [], [data])
  const reviewDocuments = useMemo(() => data?.reviewDocuments ?? [], [data])
  const lockedUsers = useMemo(() => data?.lockedUsers ?? [], [data])
  const weakLearners = useMemo(() => data?.weakLearners ?? [], [data])
  const systemWarnings = useMemo(() => data?.systemWarnings ?? [], [data])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
          Trung tâm cảnh báo quản trị
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[92px] rounded-2xl border animate-pulse"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
          Trung tâm cảnh báo quản trị
        </h1>
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <ShieldAlert size={28} className="mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--text)' }}>
            Không tải được dữ liệu cảnh báo
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-white"
            style={{ background: '#6366f1' }}
          >
            Tải lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
            Trung tâm cảnh báo quản trị
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
            Chỉ xử lý nội dung có vấn đề: bài bị report, bài chờ duyệt, tài liệu bị report/cần xem xét, user bị khóa và hỗ trợ học tập.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-xl border text-[12px] font-medium flex items-center gap-2"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {feedback && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center gap-3"
          style={{
            background: feedback.type === 'success' ? 'rgba(34,197,94,.10)' : 'rgba(239,68,68,.10)',
            borderColor: feedback.type === 'success' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)',
            color: 'var(--text)',
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
          ) : (
            <XCircle size={18} style={{ color: '#ef4444' }} />
          )}
          <span className="text-[13px] font-medium">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto text-[12px]"
            style={{ color: 'var(--text3)' }}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatBox label="Bài bị report" value={summary.reportedPosts} icon={Flag} color="#ef4444" />
        <StatBox label="Bài chờ duyệt" value={summary.pendingGroupPosts} icon={Clock3} color="#f59e0b" />
        <StatBox label="Tài liệu cần xem xét" value={summary.reviewDocuments} icon={FileText} color="#6366f1" />
        <StatBox label="User bị khóa" value={summary.lockedUsers} icon={Lock} color="#f97316" />
        <StatBox label="Học lực yếu" value={summary.weakLearners} icon={Brain} color="#ec4899" />
        <StatBox label="Cảnh báo hệ thống" value={summary.systemWarnings} icon={AlertTriangle} color="#14b8a6" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(item => (
          <TabButton
            key={item.key}
            active={tab === item.key}
            label={item.label}
            onClick={() => setTab(item.key)}
          />
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Việc cần ưu tiên
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Bài đăng bị report', value: summary.reportedPosts, color: '#ef4444' },
                { label: 'Bài đăng chờ duyệt', value: summary.pendingGroupPosts, color: '#f59e0b' },
                { label: 'Tài liệu cần xem xét', value: summary.reviewDocuments, color: '#6366f1' },
                { label: 'Tài khoản đang khóa', value: summary.lockedUsers, color: '#f97316' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--text2)' }}>
                    {item.label}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Khuyến nghị xử lý
            </h2>
            <div className="space-y-3 text-[13px]" style={{ color: 'var(--text2)' }}>
              <div>1. Ưu tiên xử lý bài bị report và task quá hạn trước.</div>
              <div>2. Tài liệu chỉ vào admin khi bị report hoặc cần xem xét, không duyệt đại trà.</div>
              <div>3. Với user học lực yếu, ưu tiên gửi hỗ trợ học tập trước khi can thiệp mạnh.</div>
              <div>4. Mở khóa user nếu đã kiểm tra xong và không còn vi phạm.</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'reported-posts' && (
        <div className="space-y-3">
          {reportedPosts.length === 0 ? (
            <EmptyState text="Chưa có bài đăng nào bị report." />
          ) : (
            reportedPosts.map(post => (
              <div
                key={post.id}
                className="rounded-2xl border p-4"
                style={{ background: 'var(--bg2)', borderColor: 'rgba(239,68,68,.2)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                      {post.authorName || 'Thành viên'}
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                      {post.groupName || 'Nhóm'} • {post.reportsCount} report • {timeAgo(post.createdAt)}
                    </div>
                    <div className="text-[13px] mt-3" style={{ color: 'var(--text2)' }}>
                      {post.content || 'Không có nội dung'}
                    </div>
                    {post.latestReason && (
                      <div className="text-[12px] mt-2" style={{ color: '#fca5a5' }}>
                        Lý do gần nhất: {post.latestReason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <button
                      onClick={() => approvePostMutation.mutate(post.id)}
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#22c55e' }}
                    >
                      Giữ bài / bỏ report
                    </button>
                    <button
                      onClick={() =>
                        rejectPostMutation.mutate({
                          postId: post.id,
                          reason: reasonMap[post.id] || 'Bài đăng vi phạm nội dung',
                        })
                      }
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#ef4444' }}
                    >
                      Gỡ bài
                    </button>
                    <input
                      value={reasonMap[post.id] || ''}
                      onChange={e => setReasonMap(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Lý do xử lý..."
                      className="px-3 py-2 rounded-xl border text-[12px] outline-none"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'pending-posts' && (
        <div className="space-y-3">
          {pendingGroupPosts.length === 0 ? (
            <EmptyState text="Không có bài đăng nhóm nào đang chờ duyệt." />
          ) : (
            pendingGroupPosts.map(post => (
              <div
                key={post.id}
                className="rounded-2xl border p-4"
                style={{ background: 'var(--bg2)', borderColor: 'rgba(245,158,11,.18)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                      {post.authorName || 'Thành viên'}
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                      {post.groupName || 'Nhóm'} • {timeAgo(post.createdAt)}
                    </div>
                    <div className="text-[13px] mt-3" style={{ color: 'var(--text2)' }}>
                      {post.content || 'Không có nội dung'}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <button
                      onClick={() => approvePostMutation.mutate(post.id)}
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#22c55e' }}
                    >
                      Duyệt bài
                    </button>
                    <button
                      onClick={() =>
                        rejectPostMutation.mutate({
                          postId: post.id,
                          reason: reasonMap[post.id] || 'Bài đăng không phù hợp',
                        })
                      }
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#ef4444' }}
                    >
                      Từ chối
                    </button>
                    <input
                      value={reasonMap[post.id] || ''}
                      onChange={e => setReasonMap(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Lý do từ chối..."
                      className="px-3 py-2 rounded-xl border text-[12px] outline-none"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'review-docs' && (
        <div className="space-y-3">
          {reviewDocuments.length === 0 ? (
            <EmptyState text="Không có tài liệu nào cần xem xét." />
          ) : (
            reviewDocuments.map(doc => (
              <div
                key={doc.id}
                className="rounded-2xl border p-4"
                style={{ background: 'var(--bg2)', borderColor: 'rgba(99,102,241,.2)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                      {doc.name || 'Tài liệu'}
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                      {doc.groupName || 'Nhóm'} • {doc.uploaderName || 'Người upload'} • {doc.type || 'OTHER'}
                    </div>
                    <div className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
                      Trạng thái: {doc.reviewStatus || 'REPORTED'} • {doc.reportsCount || 0} report • {timeAgo(doc.createdAt)}
                    </div>
                    {doc.flagReason && (
                      <div className="text-[12px] mt-2" style={{ color: '#a5b4fc' }}>
                        Lý do xem xét: {doc.flagReason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <button
                      onClick={() => approveDocMutation.mutate(doc.id)}
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#22c55e' }}
                    >
                      Giữ tài liệu
                    </button>
                    <button
                      onClick={() =>
                        underReviewDocMutation.mutate({
                          docId: doc.id,
                          reason: reasonMap[doc.id] || 'Đang xem xét thêm',
                        })
                      }
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#6366f1' }}
                    >
                      Chuyển xem xét
                    </button>
                    <button
                      onClick={() =>
                        rejectDocMutation.mutate({
                          docId: doc.id,
                          reason: reasonMap[doc.id] || 'Tài liệu chưa hợp lệ',
                        })
                      }
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                      style={{ background: '#ef4444' }}
                    >
                      Gỡ tài liệu
                    </button>
                    <input
                      value={reasonMap[doc.id] || ''}
                      onChange={e => setReasonMap(prev => ({ ...prev, [doc.id]: e.target.value }))}
                      placeholder="Ghi chú xử lý..."
                      className="px-3 py-2 rounded-xl border text-[12px] outline-none"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'locked-users' && (
        <div className="space-y-3">
          {lockedUsers.length === 0 ? (
            <EmptyState text="Không có user nào đang bị khóa." />
          ) : (
            lockedUsers.map(user => (
              <div
                key={user.id}
                className="rounded-2xl border p-4 flex items-center justify-between gap-4"
                style={{ background: 'var(--bg2)', borderColor: 'rgba(249,115,22,.22)' }}
              >
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                    {user.fullName || 'Người dùng'}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                    {user.email || 'Không có email'} • {timeAgo(user.updatedAt)}
                  </div>
                </div>

                <button
                  onClick={() => unlockUserMutation.mutate(user.id)}
                  className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                  style={{ background: '#22c55e' }}
                >
                  Mở khóa tài khoản
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'weak-learners' && (
        <div className="space-y-3">
          {weakLearners.length === 0 ? (
            <EmptyState text="Chưa có user nào nằm trong diện cần hỗ trợ học tập." />
          ) : (
            weakLearners.map(item => {
              const color = levelColor(item.level || 'INFO')
              const userKey = item.userId || item.id

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border p-4"
                  style={{ background: 'var(--bg2)', borderColor: `${color}40` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                          {item.name || 'Người dùng'}
                        </div>
                        <span
                          className="px-2 py-1 rounded-xl text-[10px] font-semibold"
                          style={{ background: `${color}18`, color }}
                        >
                          {item.level || 'INFO'}
                        </span>
                      </div>
                      <div className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                        {item.issue || 'Cần theo dõi thêm'} • {timeAgo(item.createdAt)}
                      </div>
                      <div className="text-[12px] mt-3" style={{ color: 'var(--text2)' }}>
                        Gợi ý: gửi nhắc nhở nhẹ nhàng, khuyến khích xem tài liệu, quiz và nhóm học phù hợp.
                      </div>
                    </div>

                    <div className="w-[320px] flex flex-col gap-2">
                      <div className="text-right">
                        <div className="text-[24px] font-mono font-semibold" style={{ color }}>
                          {item.gpa.toFixed(1)}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                          GPA
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={supportMap[userKey] || ''}
                        onChange={e =>
                          setSupportMap(prev => ({ ...prev, [userKey]: e.target.value }))
                        }
                        placeholder="Nhập lời nhắc hỗ trợ học tập..."
                        className="px-3 py-2 rounded-xl border text-[12px] outline-none resize-none"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      />

                      <button
                        onClick={() =>
                          supportMutation.mutate({
                            userId: item.userId || '',
                            message:
                              supportMap[userKey] ||
                              'Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp để cải thiện dần nhé.',
                          })
                        }
                        className="px-3 py-2 rounded-xl text-[12px] font-medium text-white"
                        style={{ background: '#6366f1' }}
                      >
                        Gửi nhắc nhở hỗ trợ
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-3">
          {systemWarnings.length === 0 ? (
            <EmptyState text="Chưa có cảnh báo hệ thống nào." />
          ) : (
            systemWarnings.map(item => {
              const color = levelColor(item.level)
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border p-4"
                  style={{ background: `${color}10`, borderColor: `${color}30` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                        {item.title}
                      </div>
                      <div className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
                        {item.message}
                      </div>
                    </div>

                    <div
                      className="px-3 py-1 rounded-xl text-[11px] font-semibold uppercase"
                      style={{ background: `${color}18`, color }}
                    >
                      {item.level}
                    </div>
                  </div>

                  <div className="text-[11px] mt-3" style={{ color: 'var(--text3)' }}>
                    {timeAgo(item.createdAt)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}