import api from './axios'
import type {
  User, Group, GroupMember, Task, TaskStatus, TaskPriority, TaskComment,
  ChatMessage, Document, Flashcard, QuizQuestion, PredictInput,
  Post, PostAiCheckResult, PostReport, UserWarning, DirectMessage, Conversation, Notification, Friendship,
  PageResponse, ApiResponse, TaskAttachment,
  FlashcardDeck, FlashcardFolder, FlashcardRating, FlashcardStudySummary, FlashcardCardProgressView,
  QuizSet, QuizFolder,
  SavedSummary,
  VocabularyItem,
  VocabularyPayload,
  VocabularySet,
  StudyProfile, StudyTermRecord, StudySubjectRecord, StudyPrediction
} from '@/types'
import { getAiRequestHeaders, withAiConfig } from '@/utils/aiConfig'

const AI_AGENT_URL = '/ai-agent'

const d = <T = any>(r: { data: ApiResponse<T> }) => r.data.data

const asArray = <T>(value: any): T[] => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.members)) return value.members
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.data)) return value.data
  return []
}

export const userApi = {
  updateInterests: (tags: string[]) =>
    api.put('/users/interests', { tags }).then(r => r.data),

  getInterests: () =>
    api.get('/users/interests').then(r => d<{ tags: string[] }>(r)),

  getById: (id: string) =>
    api.get(`/auth/users/${id}`).then(r => d<User>(r)),

  updateProfile: (body: {
    fullName?: string
    bio?: string
    studentCode?: string
    location?: string
    school?: string
    avatar?: string
    coverImage?: string
    userType?: string
    goal?: string
    major?: string
    interestedFields?: string[]
    onboardingDone?: boolean
    strongSubjects?: string[]
    weakSubjects?: string[]
    availableSchedule?: {
      dayOfWeek: string
      startTime: string
      endTime: string
    }[]
    skills?: {
      subject: string
      level: number
      color?: string
    }[]
  }) => api.put('/auth/me', body).then(r => d<User>(r)),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/me/password', body).then(r => r.data),

  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/auth/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string }>(r))
  },

  uploadCover: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/auth/me/cover', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string }>(r))
  },

  onboardingOptions: (params?: { userType?: string; major?: string; q?: string }) =>
    api.get('/users/onboarding-options', { params }).then(r => d<{
      schools: string[]
      subjects: string[]
      majors: string[]
      interestFields: string[]
      interestTags: string[]
      goals: string[]
      timeSlots: { start: string; end: string; label: string }[]
    }>(r)),
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),

  register: (body: {
    fullName: string
    email: string
    password: string
    studentCode?: string
    userType?: string
    school?: string
    major?: string
    interestedFields?: string[]
    strongSubjects?: string[]
    weakSubjects?: string[]
    interests?: string[]
    availableSchedule?: {
      dayOfWeek: string
      startTime: string
      endTime: string
    }[]
    goal?: string
  }) => api.post('/auth/register', body).then(r => r.data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then(r => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get('/auth/me').then(r => d<User>(r)),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then(r => d(r)),
  getActivity: () => api.get('/dashboard/activity').then(r => d<any[]>(r)),
  getFeed: () => api.get('/dashboard/feed').then(r => d<Post[]>(r)),
}

export const projectApi = {
  create: (groupId: string, body: { name: string; description: string; startDate?: string; endDate?: string; memberIds?: string[] }) =>
    api.post(`/groups/${groupId}/projects`, body).then(r => r.data),

  getProjects: (groupId: string) =>
    api.get(`/groups/${groupId}/projects`).then(r => r.data),

  getActive: (groupId: string) =>
    api.get(`/groups/${groupId}/projects/active`).then(r => r.data),

  getProject: (groupId: string, projectId: string) =>
    api.get(`/groups/${groupId}/projects/${projectId}`).then(r => r.data),

  update: (groupId: string, projectId: string, body: any) =>
    api.patch(`/groups/${groupId}/projects/${projectId}`, body).then(r => r.data),

  delete: (groupId: string, projectId: string) =>
    api.delete(`/groups/${groupId}/projects/${projectId}`).then(r => r.data),

  complete: (groupId: string, projectId: string) =>
    api.post(`/groups/${groupId}/projects/${projectId}/complete`).then(r => r.data),

  cancel: (groupId: string, projectId: string) =>
    api.post(`/groups/${groupId}/projects/${projectId}/cancel`).then(r => r.data),

  getProjectProgress: (groupId: string, projectId: string) =>
    api.get(`/groups/${groupId}/projects/${projectId}/progress`).then(r => r.data),

  exportProjectProgress: (groupId: string, projectId: string) =>
    api.get(`/groups/${groupId}/projects/${projectId}/progress/export`, { responseType: 'blob' }).then(r => r.data),

  getProjectTasks: (groupId: string, projectId: string) =>
    api.get(`/groups/${groupId}/projects/${projectId}/tasks`).then(r => r.data),

  createProjectTask: (groupId: string, projectId: string, data: any) =>
    api.post(`/groups/${groupId}/projects/${projectId}/tasks`, data).then(r => r.data),

  updateProjectTask: (groupId: string, projectId: string, taskId: string, data: any) =>
    api.put(`/groups/${groupId}/projects/${projectId}/tasks/${taskId}`, data).then(r => r.data),

  updateProjectTaskStatus: (groupId: string, projectId: string, taskId: string, status: string) =>
    api.patch(`/groups/${groupId}/projects/${projectId}/tasks/${taskId}/status`, { status }).then(r => r.data),

  deleteProjectTask: (groupId: string, projectId: string, taskId: string) =>
    api.delete(`/groups/${groupId}/projects/${projectId}/tasks/${taskId}`).then(r => r.data),

  recordTaskProgress: (groupId: string, projectId: string, taskId: string) =>
    api.post(`/groups/${groupId}/projects/${projectId}/tasks/${taskId}/progress`).then(r => r.data),
}

export const postApi = {
  feed: (page = 0, tag?: string) =>
    api.get('/posts/feed', { params: { page, ...(tag ? { tag } : {}) } }).then(r => d<PageResponse<Post>>(r)),

  list: (page = 0, tag?: string) =>
    api.get('/posts', { params: { page, tag } }).then(r => d<PageResponse<Post>>(r)),

  getByUser: (authorId: string) =>
    api.get(`/posts/user/${authorId}`).then(r => d<Post[]>(r)),

  trending: () =>
    api.get('/posts/trending').then(r => d<Post[]>(r)),

  trendingTags: () =>
    api.get('/posts/trending-tags').then(r => d<{ tag: string; count: number }[]>(r)),

  searchTags: (search = '') =>
    api.get('/posts/tags', { params: { search } }).then(r => d<{ tag: string; count: number }[]>(r)),

  aiCheck: (body: {
    title: string
    content: string
    subject: string
    tags: string[]
  }) =>
    api.post('/posts/ai-check', body).then(r => {
      if (!r.data.success) {
        throw new Error(r.data.message || 'AI dang ban, ban van co the dang bai de he thong kiem duyet sau')
      }
      return d<PostAiCheckResult>(r)
    }),

  saved: (page = 0) =>
    api.get('/posts/saved', { params: { page } }).then(r => d<PageResponse<Post>>(r)),

  hidden: () =>
    api.get('/posts/hidden').then(r => d<string[]>(r)),

  hide: (id: string) =>
    api.post(`/posts/${id}/hide`).then(r => r.data),

  unhide: (id: string) =>
    api.post(`/posts/${id}/unhide`).then(r => r.data),

  get: (id: string) =>
    api.get(`/posts/${id}`).then(r => d<Post>(r)),

  create: (body: {
    title: string
    content: string
    subject?: string
    tags: string[]
    imageUrls?: string[]
    videoUrl?: string
    coverImage?: string
    summary?: string
  }) => api.post('/posts', body, { timeout: 120_000 }).then(r => d<Post>(r)),

  update: (id: string, body: {
    title: string
    content: string
    subject?: string
    tags: string[]
    imageUrls?: string[]
    videoUrl?: string
    coverImage?: string
    summary?: string
  }) => api.put(`/posts/${id}`, body).then(r => d<Post>(r)),

  delete: (id: string) =>
    api.delete(`/posts/${id}`),

  like: (id: string) =>
    api.post(`/posts/${id}/like`).then(r => d<Post>(r)),

  save: (id: string) =>
    api.post(`/posts/${id}/save`).then(r => d<Post>(r)),

  report: (id: string, reason?: string) =>
    api.post(`/posts/${id}/report`, {
      reason: reason || 'Nội dung cần được xem xét',
    }).then(r => d<Post>(r)),

  share: (id: string, body?: { friendIds?: string[]; groupIds?: string[] }) =>
    api.post(`/posts/${id}/share`, body || {}).then(r => d<Post>(r)),

  addComment: (id: string, content: string) =>
    api.post(`/posts/${id}/comments`, { content }).then(r => d(r)),

  replyComment: (id: string, commentId: string, content: string) =>
    api.post(`/posts/${id}/comments/${commentId}/reply`, { content }).then(r => d(r)),

  deleteComment: (id: string, commentId: string) =>
    api.delete(`/posts/${id}/comments/${commentId}`).then(r => d(r)),

  editComment: (id: string, commentId: string, content: string) =>
    api.patch(`/posts/${id}/comments/${commentId}`, { content }).then(r => d(r)),

  sharePost: (id: string, payload: { targetType: 'FRIEND' | 'GROUP'; targetUserId?: string; targetGroupId?: string; message?: string }) =>
    api.post(`/posts/${id}/share`, payload).then(r => d(r)),

  reportPost: (postId: string, reasonType: string, reasonText: string) =>
    api.post(`/posts/${postId}/report`, { reasonType, reasonText }).then(r => d<any>(r)),

  resubmitPost: (postId: string) =>
    api.post(`/posts/${postId}/resubmit`).then(r => d<Post>(r)),

  getMyPending: () =>
    api.get('/posts/my-pending').then(r => d<Post[]>(r)),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string }>(r))
  },

  uploadVideo: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/video', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string }>(r))
  },
}

export const friendApi = {
  suggestions: (search = '', size = 10000) =>
    api.get('/friends/suggestions', { params: { search, size } }).then(r => asArray<User>(d<any>(r))),
  pending: (size = 10000) =>
    api.get('/friends/pending', { params: { size } }).then(r => asArray<Friendship>(d<any>(r))),
  list: (search = '', size = 10000) =>
    api.get('/friends', { params: { search, size } }).then(r => asArray<User>(d<any>(r))),
  send: (userId: string) => api.post(`/friends/${userId}/request`),
  accept: (userId: string) => api.post(`/friends/${userId}/accept`),
  reject: (userId: string) => api.post(`/friends/${userId}/reject`),
  remove: (userId: string) => api.delete(`/friends/${userId}`),
  status: (userId: string) =>
    api.get(`/friends/${userId}/status`).then(r => d<{
      status: 'NONE' | 'PENDING' | 'ACCEPTED' | 'BLOCKED'
      direction: 'NONE' | 'INCOMING' | 'OUTGOING'
      requesterId?: string
      receiverId?: string
    }>(r)),
}

export const dmApi = {
  conversations: () =>
    api.get('/dm/conversations').then(r => d<Conversation[]>(r)),

  messages: (userId: string, page = 0) =>
    api.get(`/dm/${userId}`, { params: { page } }).then(r => d<PageResponse<DirectMessage>>(r)),

  pinned: (userId: string) =>
    api.get(`/dm/${userId}/pinned`).then(r => d<DirectMessage[]>(r)),

  send: (
    userId: string,
    content: string,
    type = 'TEXT',
    attachments?: {
      name: string
      url: string
      type: string
      sizeKb: number
    }[],
    replyTo?: {
      messageId: string
      senderId?: string
      senderName?: string
      content?: string
      type?: string
      attachments?: {
        name: string
        url: string
        type: string
        sizeKb: number
      }[]
    } | null
  ) =>
    api.post(`/dm/${userId}`, {
      content,
      type,
      attachments: attachments ?? [],
      replyTo: replyTo ?? null,
    }).then(r => d<DirectMessage>(r)),

  askAI: (userId: string, question: string) =>
    api.post(`/dm/${userId}/ai`, withAiConfig({ question })).then(r => d<DirectMessage>(r)),

  markRead: (userId: string) =>
    api.post(`/dm/${userId}/read`),

  pin: (messageId: string) =>
    api.post(`/dm/messages/${messageId}/pin`).then(r => d<DirectMessage>(r)),

  unpin: (messageId: string) =>
    api.post(`/dm/messages/${messageId}/unpin`).then(r => d<DirectMessage>(r)),

  react: (messageId: string, emoji: string) =>
    api.post(`/dm/messages/${messageId}/react`, { emoji }).then(r => d<DirectMessage>(r)),

  recall: (messageId: string) =>
    api.post(`/dm/messages/${messageId}/recall`).then(r => d<DirectMessage>(r)),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/chat-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; name: string; type: string; sizeKb: number }>(r))
  },

  uploadFile: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/chat-file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; name: string; type: string; sizeKb: number }>(r))
  },
}

export const groupApi = {
  list: () => api.get('/groups').then(r => d<Group[]>(r)),
  get: (id: string) => api.get(`/groups/${id}`).then(r => d<Group>(r)),
  publicGroups: () => api.get('/groups/public').then(r => d<Group[]>(r)),

  create: (body: {
    name: string
    description: string
    subject: string
    coverColor: string
    publicVisible: boolean
    requireApproval: boolean
    requirePostApproval?: boolean
  }) => api.post('/groups', body).then(r => d<Group>(r)),

  update: (id: string, body: Partial<Group>) =>
    api.put(`/groups/${id}`, body).then(r => d<Group>(r)),

  delete: (id: string) => api.delete(`/groups/${id}`),

  join: (inviteCode: string) =>
    api.post('/groups/join', { inviteCode }).then(r => d<any>(r)),

  leave: (id: string) => api.post(`/groups/${id}/leave`),

  getMembers: async (id: string) => {
    const r = await api.get(`/groups/${id}/members`)
    return asArray<GroupMember>(d<any>(r))
  },

  getJoinRequests: async (id: string) => {
    const r = await api.get(`/groups/${id}/join-requests`)
    return asArray<any>(d<any>(r))
  },

  approveJoinRequest: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/join-requests/${userId}/approve`).then(r => d<Group>(r)),

  rejectJoinRequest: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/join-requests/${userId}/reject`).then(r => d<Group>(r)),

  removeMember: (id: string, userId: string) =>
    api.delete(`/groups/${id}/members/${userId}`),

  changeRole: (id: string, userId: string, role: string) =>
    api.patch(`/groups/${id}/members/${userId}/role`, { role }).then(r => d<any>(r)),
}

export const taskApi = {
  list: (groupId: string) =>
    api.get(`/groups/${groupId}/tasks`).then(r => d<Task[]>(r)),

  get: (groupId: string, taskId: string) =>
    api.get(`/groups/${groupId}/tasks/${taskId}`).then(r => d<Task>(r)),

  create: (groupId: string, body: Partial<Task>) =>
    api.post(`/groups/${groupId}/tasks`, body).then(r => d<Task>(r)),

  update: (groupId: string, taskId: string, body: Partial<Task>) =>
    api.put(`/groups/${groupId}/tasks/${taskId}`, body).then(r => d<Task>(r)),

  updateStatus: (groupId: string, taskId: string, status: TaskStatus) =>
    api.patch(`/groups/${groupId}/tasks/${taskId}/status`, { status }).then(r => d<Task>(r)),

  delete: (groupId: string, taskId: string) =>
    api.delete(`/groups/${groupId}/tasks/${taskId}`),

  // task cá nhân
  listPersonal: () =>
    api.get('/tasks/personal').then(r => d<Task[]>(r)),

  getPersonal: (taskId: string) =>
    api.get(`/tasks/personal/${taskId}`).then(r => d<Task>(r)),

  createPersonal: (body: Partial<Task>) =>
    api.post('/tasks/personal', body).then(r => d<Task>(r)),

  updatePersonal: (taskId: string, body: Partial<Task>) =>
    api.put(`/tasks/personal/${taskId}`, body).then(r => d<Task>(r)),

  updatePersonalStatus: (taskId: string, status: TaskStatus) =>
    api.patch(`/tasks/personal/${taskId}/status`, { status }).then(r => d<Task>(r)),

  deletePersonal: (taskId: string) =>
    api.delete(`/tasks/personal/${taskId}`),

  submitPersonal: (
    taskId: string,
    body: {
      answerText?: string
      files?: TaskAttachment[]
      images?: TaskAttachment[]
    }
  ) => api.post(`/tasks/personal/${taskId}/submit`, body).then(r => d<Task>(r)),

  clearPersonalSubmission: (taskId: string) =>
    api.delete(`/tasks/personal/${taskId}/submit`).then(r => d<Task>(r)),

  // trang nhiệm vụ của tôi
  myList: (params?: { mode?: 'ALL' | 'PERSONAL' | 'GROUP'; groupId?: string }) =>
    api.get('/tasks/my', { params }).then(r => d<Task[]>(r)),

  myGroups: () =>
    api.get('/tasks/my/groups').then(r => d<Array<{
      id: string
      name: string
      subject?: string
      coverColor?: string
    }>>(r)),

  myProgress: () =>
    api.get('/tasks/my/progress').then(r => d<{
      summary: {
        total: number
        todo: number
        inProgress: number
        done: number
        overdue: number
      }
      byMonth: Record<string, number>
      roadmap: Array<{
        id: string
        title: string
        groupId: string
        personal: boolean
        status: TaskStatus
        priority: TaskPriority
        deadline?: string
        label?: string
      }>
    }>(r)),

  addComment: (groupId: string, taskId: string, content: string, parentId?: string) =>
    api.post(`/groups/${groupId}/tasks/${taskId}/comments`, {
      content,
      parentId: parentId || '',
    }).then(r => d<Task>(r)),

  updateComment: (groupId: string, taskId: string, commentId: string, content: string) =>
    api.put(`/groups/${groupId}/tasks/${taskId}/comments/${commentId}`, { content }).then(r => d<Task>(r)),

  deleteComment: (groupId: string, taskId: string, commentId: string) =>
    api.delete(`/groups/${groupId}/tasks/${taskId}/comments/${commentId}`).then(r => d(r)),

  getComments: async (groupId: string, taskId: string) => {
    const task = await api.get(`/groups/${groupId}/tasks/${taskId}`).then(r => d<Task>(r))
    return (task.comments ?? []) as TaskComment[]
  },

  submit: (
    groupId: string,
    taskId: string,
    body: {
      answerText?: string
      files?: TaskAttachment[]
      images?: TaskAttachment[]
    }
  ) => api.post(`/groups/${groupId}/tasks/${taskId}/submit`, body).then(r => d<Task>(r)),

  clearSubmission: (groupId: string, taskId: string) =>
    api.delete(`/groups/${groupId}/tasks/${taskId}/submit`).then(r => d<Task>(r)),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/chat-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; name: string; type: string; sizeKb?: number; size?: number }>(r))
  },

  uploadFile: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/chat-file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; name: string; type: string; sizeKb?: number; size?: number }>(r))
  },
}

export const chatApi = {
  getHistory: (groupId: string, page = 0) =>
    api.get(`/groups/${groupId}/chat`, { params: { page } }).then(r => d<PageResponse<ChatMessage>>(r)),

  sendMessage: (
    groupId: string,
    body: {
      content: string
      attachments?: {
        name: string
        url: string
        type: string
        sizeKb: number
      }[]
      mentionUserIds?: string[]
      mentionAll?: boolean
      replyTo?: {
        messageId: string
        senderId?: string
        senderName?: string
        content?: string
        type?: string
        attachments?: {
          name: string
          url: string
          type: string
          sizeKb: number
        }[]
      } | null
    }
  ) => api.post(`/groups/${groupId}/chat`, body).then(r => d<ChatMessage>(r)),

  getPinned: async (groupId: string) => {
    const r = await api.get(`/groups/${groupId}/chat/pinned`)
    return asArray<ChatMessage>(d<any>(r))
  },

  markRead: (groupId: string) =>
    api.post(`/groups/${groupId}/chat/read`),

  pin: (groupId: string, messageId: string) =>
    api.post(`/groups/${groupId}/chat/${messageId}/pin`).then(r => d<ChatMessage>(r)),

  unpin: (groupId: string, messageId: string) =>
    api.post(`/groups/${groupId}/chat/${messageId}/unpin`).then(r => d<ChatMessage>(r)),

  react: (groupId: string, messageId: string, emoji: string) =>
    api.post(`/groups/${groupId}/chat/${messageId}/react`, { emoji }).then(r => d<ChatMessage>(r)),

  recall: (groupId: string, messageId: string) =>
    api.post(`/groups/${groupId}/chat/${messageId}/recall`).then(r => d<ChatMessage>(r)),

  askAI: (groupId: string, question: string) =>
    api.post(`/groups/${groupId}/chat/ai`, withAiConfig({ question })).then(r => d<ChatMessage>(r)),

  askGroupAgent: (groupId: string, question: string) =>
    api.post(`/groups/${groupId}/chat/group-agent`, withAiConfig({ question })).then(r => d<ChatMessage>(r)),

  approveGroupAgentTasks: (groupId: string, messageId: string) =>
    api.post(`/groups/${groupId}/chat/${messageId}/approve-tasks`).then(r => d<ChatMessage>(r)),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/chat-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; name: string; type: string; sizeKb: number }>(r))
  },

  uploadFile: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/chat-file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; name: string; type: string; sizeKb: number }>(r))
  },
}

export const documentApi = {
  list: (groupId: string) =>
    api.get(`/groups/${groupId}/documents`).then(r => d<Document[]>(r)),

  upload: (groupId: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/groups/${groupId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded / (e.total ?? 1)) * 100)),
    }).then(r => d<Document>(r))
  },

  report: (docId: string, reason?: string) =>
    api.post(`/documents/${docId}/report`, {
      reason: reason || 'Tài liệu cần được xem xét',
    }).then(r => d<Document>(r)),

  delete: (groupId: string, docId: string) =>
    api.delete(`/groups/${groupId}/documents/${docId}`),

  updateLabel: (groupId: string, docId: string, topicLabel: string) =>
    api.patch(`/groups/${groupId}/documents/${docId}/label`, { topicLabel }).then(r => d<Document>(r)),

  generateFlashcards: (docId: string) =>
    api.post(`/documents/${docId}/flashcards`).then(r => d<Flashcard[]>(r)),

  generateQuiz: (docId: string) =>
    api.post(`/documents/${docId}/quiz`).then(r => d<QuizQuestion[]>(r)),

  summarize: (docId: string) =>
    api.post(`/documents/${docId}/summarize`).then(r => d<{ summary: string }>(r)),

  chatWithDoc: (docId: string, question: string) =>
    api.post(`/documents/${docId}/chat`, { question }).then(r => d<{ answer: string }>(r)),
}

export const flashcardApi = {
  listDecks: (params?: {
    search?: string
    folderId?: string
    sourceType?: 'ALL' | 'PERSONAL' | 'DOCUMENT_AI'
  }) =>
    api.get('/flashcards', { params }).then(r => d<FlashcardDeck[]>(r)),

  getDeck: (deckId: string) =>
    api.get(`/flashcards/${deckId}`).then(r => d<FlashcardDeck>(r)),

  deleteDeck: (deckId: string) =>
    api.delete(`/flashcards/${deckId}`),

  moveDeckToFolder: (deckId: string, folderId?: string) =>
    api.patch(`/flashcards/${deckId}/move-folder`, { folderId }).then(r => d<FlashcardDeck>(r)),

  listFolders: () =>
    api.get('/flashcard-folders').then(r => d<FlashcardFolder[]>(r)),

  createFolder: (body: { name: string; color?: string }) =>
    api.post('/flashcard-folders', body).then(r => d<FlashcardFolder>(r)),

  createPersonalDeck: (body: {
    title: string
    description?: string
    folderId?: string
    cards: { question: string; answer: string }[]
  }) =>
    api.post('/flashcards', body).then(r => d<FlashcardDeck>(r)),

  updatePersonalDeck: (
    deckId: string,
    body: {
      title: string
      description?: string
      folderId?: string
      cards: { question: string; answer: string }[]
    }
  ) =>
    api.put(`/flashcards/${deckId}`, body).then(r => d<FlashcardDeck>(r)),

  saveFromDocument: (body: {
    docId: string
    title: string
    folderId?: string
    cards: { question: string; answer: string }[]
  }) =>
    api.post('/flashcards/from-document', body).then(r => d<FlashcardDeck>(r)),

  getStudySummary: (deckId: string) =>
    api.get(`/flashcards/${deckId}/study-summary`).then(r => d<FlashcardStudySummary>(r)),

  recordReview: (deckId: string, cardId: string, rating: FlashcardRating) =>
    api.post(`/flashcards/${deckId}/cards/${cardId}/review`, { rating }).then(r => d<FlashcardCardProgressView>(r)),

  completeStudySession: (deckId: string, needReviewCount: number) =>
    api.post(`/flashcards/${deckId}/study-session-complete`, { needReviewCount }),
}

export const predictApi = {
  predict: (input: PredictInput) =>
    api.post('/predict', input).then(r => d(r)),
  getHistory: () => api.get('/predict/history').then(r => d(r)),
}

export const notificationApi = {
  list: (page = 0) =>
    api.get('/notifications', { params: { page } }).then(r => d<PageResponse<Notification>>(r)),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAll: () => api.post('/notifications/read-all'),
  count: () =>
    api.get('/notifications/unread-count').then(r => d<{ count: number }>(r)),
}

export const uploadApi = {
  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string; relativeUrl?: string }>(r))
  },
}

export const membershipApi = {
  getMy: () => api.get('/membership/me').then(r => d<any>(r)),
  getPlans: () => api.get('/membership/plans').then(r => d<any>(r)),
  getOrders: () => api.get('/membership/orders').then(r => d<any[]>(r)),
  createOrder: (payload: { tier: 'SILVER' | 'GOLD'; period: 'WEEK' | 'MONTH' | 'YEAR'; note?: string }) =>
    api.post('/membership/orders', payload).then(r => d<any>(r)),
  checkAiCredits: (action: string, personalApiKey = false) =>
    api.post('/membership/ai-credits/check', { action, personalApiKey }).then(r => d<any>(r)),
  consumeAiCredits: (action: string, personalApiKey = false) =>
    api.post('/membership/ai-credits/consume', { action, personalApiKey }).then(r => d<any>(r)),
  getAiTokenPackages: () => api.get('/membership/ai-token-packages').then(r => d<any>(r)),
  getAiTokenOrders: () => api.get('/membership/ai-token-orders').then(r => d<any[]>(r)),
  createAiTokenOrder: (payload: { packageCode: string; note?: string }) =>
    api.post('/membership/ai-token-orders', payload).then(r => d<any>(r)),
}

export const adminMembershipApi = {
  getStats: () => api.get('/admin/membership/stats').then(r => d<any>(r)),
  getOrders: (status?: string) =>
    api.get('/admin/membership/orders', { params: status ? { status } : {} }).then(r => d<any[]>(r)),
  approve: (id: string, adminNote?: string) =>
    api.post(`/admin/membership/orders/${id}/approve`, { adminNote }).then(r => d<any>(r)),
  reject: (id: string, adminNote?: string) =>
    api.post(`/admin/membership/orders/${id}/reject`, { adminNote }).then(r => d<any>(r)),
  getAiTokenOrders: (status?: string) =>
    api.get('/admin/membership/ai-token-orders', { params: status ? { status } : {} }).then(r => d<any[]>(r)),
  approveAiToken: (id: string, adminNote?: string) =>
    api.post(`/admin/membership/ai-token-orders/${id}/approve`, { adminNote }).then(r => d<any>(r)),
  rejectAiToken: (id: string, adminNote?: string) =>
    api.post(`/admin/membership/ai-token-orders/${id}/reject`, { adminNote }).then(r => d<any>(r)),}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard').then(r => d(r)),
  getAlertCenter: () => api.get('/admin/alerts/center').then(r => d(r)),
  getSystemStats: () => api.get('/admin/stats').then(r => d(r)),

  getUsers: (page = 0, search?: string, size = 20) =>
    api.get('/admin/users', { params: { page, search, size } }).then(r => d(r)),

  getUserDetail: (userId: string) =>
    api.get(`/admin/users/${userId}`).then(r => d(r)),

  getUserActivity: (userId: string) =>
    api.get(`/admin/users/${userId}/activity`).then(r => d(r)),

  getUserPredictHistory: (userId: string) =>
    api.get(`/admin/users/${userId}/predict-history`).then(r => d(r)),

  getUserStudyTerms: (userId: string) =>
    api.get(`/admin/users/${userId}/study-terms`).then(r => d(r)),

  lockUser: (id: string) =>
    api.post(`/admin/users/${id}/lock`),

  unlockUser: (id: string) =>
    api.post(`/admin/users/${id}/unlock`),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),

  resetPassword: (id: string) =>
    api.post(`/admin/users/${id}/reset-password`),

  sendSupportReminder: (userId: string, message: string) =>
    api.post(`/admin/users/${userId}/support-reminder`, {
      title: 'Hỗ trợ học tập từ StudyMate AI',
      message,
    }),

  getGroups: (page = 0, search?: string, filter?: string) =>
    api.get('/admin/groups', {
      params: { page, search, filter },
    }).then(r => d(r)),

  getGroupDetail: (groupId: string) =>
    api.get(`/admin/groups/${groupId}`).then(r => d(r)),

  deleteGroup: (id: string) =>
    api.delete(`/admin/groups/${id}`),

  forceDeleteGroup: (groupId: string, reason?: string) =>
    api.delete(`/admin/groups/${groupId}/force`, {
      data: { reason },
    }),

  getMLResults: (page = 0) =>
    api.get('/admin/ml/results', {
      params: { page },
    }).then(r => d(r)),

  getAlerts: () =>
    api.get('/admin/alerts').then(r => d(r)),

  approveGroupPost: (postId: string) =>
    api.post(`/admin/group-posts/${postId}/approve`).then(r => d(r)),

  rejectGroupPost: (postId: string, reason: string) =>
    api.post(`/admin/group-posts/${postId}/reject`, { reason }).then(r => d(r)),

  getDocuments: (params?: {
    status?: string
    groupId?: string
    type?: string
    uploader?: string
  }) =>
    api.get('/admin/documents', { params }).then(r => d(r)),

  approveDocument: (docId: string) =>
    api.post(`/admin/documents/${docId}/approve`).then(r => d(r)),

  markDocumentUnderReview: (docId: string, reason: string) =>
    api.post(`/admin/documents/${docId}/under-review`, { reason }).then(r => d(r)),

  rejectDocument: (docId: string, reason: string) =>
    api.post(`/admin/documents/${docId}/reject`, { reason }).then(r => d(r)),

  removeDocument: (docId: string, reason: string) =>
    api.post(`/admin/documents/${docId}/remove`, { reason }).then(r => d(r)),

  broadcast: (title: string, body: string) =>
    api.post('/admin/notifications/broadcast', { title, body }),

  sendAdminNotification: (payload: {
    title: string
    message: string
    type: 'GENERAL' | 'EVENT' | 'MAINTENANCE' | 'WARNING' | 'SUPPORT'
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    targetType: 'ALL' | 'SELECTED_USERS' | 'WEAK_USERS' | 'LOCKED_USERS' | 'UNLOCKED_USERS'
    userIds: string[]
  }) =>
    api.post('/admin/notifications/send', payload).then(r => d(r)),

  getNotificationHistory: () =>
    api.get('/admin/notifications/history').then(r => d(r)),

  getAdminSettings: () =>
    api.get('/admin/settings/config').then(r => d<Record<string, any>>(r)),

  saveAdminSettings: (settings: Record<string, any>) =>
    api.put('/admin/settings/config', settings).then(r => d<Record<string, any>>(r)),

  getLogs: (page = 0) =>
    api.get('/admin/logs', {
      params: { page },
    }).then(r => d(r)),
}

export const adminPostApi = {
  listModerationPosts: (tab?: string, page = 0, status?: string) =>
    api.get('/admin/posts/moderation', { params: { tab, status, page } }).then(r => d<PageResponse<Post>>(r)),

  getModerationCounts: () =>
    api.get('/admin/posts/moderation/counts').then(r => d<{ pending: number; flagged: number; reported: number; processed: number }>(r)),

  getReports: () =>
    api.get('/admin/posts/reports').then(r => d<PostReport[]>(r)),

  approvePost: (postId: string) =>
    api.patch(`/admin/posts/${postId}/approve`).then(r => d<Post>(r)),

  rejectPost: (postId: string, reason: string) =>
    api.patch(`/admin/posts/${postId}/reject`, { reason }).then(r => d<Post>(r)),

  removePost: (postId: string, reason?: string) =>
    api.patch(`/admin/posts/${postId}/remove`, reason ? { reason } : {}).then(r => d<Post>(r)),

  requestRevision: (postId: string, message: string) =>
    api.patch(`/admin/posts/${postId}/request-revision`, { message }).then(r => d<Post>(r)),

  dismissReport: (reportId: string, reviewNote?: string) =>
    api.patch(`/admin/posts/reports/${reportId}/dismiss`, reviewNote ? { reviewNote } : {}).then(r => d<any>(r)),

  normalizeLegacy: () =>
    api.post('/admin/posts/normalize-legacy').then(r => d<{ fixed: number }>(r)),

  rescanMedia: (limit = 30) =>
    api.post('/admin/posts/rescan-media', null, { params: { limit } }).then(r => d<{ rescanned: number }>(r)),

  warnUser: (userId: string, postId: string, level: 'REMINDER' | 'WARNING' | 'SEVERE', reason: string, message: string) =>
    api.post(`/admin/posts/users/${userId}/warnings`, { postId, level, reason, message }).then(r => d<UserWarning>(r)),
}

export const groupPostApi = {
  list: async (groupId: string) => {
    const r = await api.get(`/groups/${groupId}/posts`)
    return asArray<any>(d<any>(r))
  },

  getPending: async (groupId: string) => {
    const r = await api.get(`/groups/${groupId}/posts/pending`)
    return asArray<any>(d<any>(r))
  },

  getReported: async (groupId: string) => {
    const r = await api.get(`/groups/${groupId}/posts/reported`)
    return asArray<any>(d<any>(r))
  },

  create: (
    groupId: string,
    body: {
      content: string
      imageUrls?: string[]
      videoUrl?: string
      attachments?: {
        name: string
        url: string
        type: string
        sizeKb: number
      }[]
    }
  ) => api.post(`/groups/${groupId}/posts`, body).then(r => d<any>(r)),

  approve: (groupId: string, postId: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/approve`).then(r => d<any>(r)),

  reject: (groupId: string, postId: string, reason?: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/reject`, {
      reason: reason || '',
    }).then(r => d<any>(r)),

  hide: (groupId: string, postId: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/hide`).then(r => d<any>(r)),

  report: (groupId: string, postId: string, reason?: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/report`, {
      reason: reason || 'Nội dung không phù hợp',
    }).then(r => d<any>(r)),

  like: (groupId: string, postId: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/like`).then(r => d<any>(r)),

  addComment: (groupId: string, postId: string, content: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/comments`, { content }).then(r => d<any>(r)),

  replyComment: (groupId: string, postId: string, commentId: string, content: string) =>
    api.post(`/groups/${groupId}/posts/${postId}/comments/${commentId}/reply`, { content }).then(r => d<any>(r)),

  delete: (groupId: string, postId: string) =>
    api.delete(`/groups/${groupId}/posts/${postId}`),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string }>(r))
  },

  uploadVideo: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post('/upload/video', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => d<{ url: string }>(r))
  },
}

export const studyDriveFolderApi = {
  list: async (parentFolderId?: string | null) => {
    const r = await api.get('/study-drive/folders', {
      params: parentFolderId ? { parentFolderId } : {},
    })
    return asArray<any>(d<any>(r))
  },

  create: (name: string, parentFolderId?: string | null) =>
    api.post('/study-drive/folders', {
      name,
      parentFolderId: parentFolderId || null,
    }).then(r => d<any>(r)),

  rename: (folderId: string, name: string) =>
    api.put(`/study-drive/folders/${folderId}`, { name }).then(r => d<any>(r)),

  delete: (folderId: string) =>
    api.delete(`/study-drive/folders/${folderId}`),

  moveItem: (itemId: string, targetFolderId?: string | null) =>
    api.post(`/study-drive/folders/move-item/${itemId}`, {
      targetFolderId: targetFolderId || null,
    }).then(r => d<any>(r)),

  moveFolder: (folderId: string, targetFolderId?: string | null) =>
    api.post(`/study-drive/folders/move-folder/${folderId}`, {
      targetFolderId: targetFolderId || null,
    }).then(r => d<any>(r)),
}

export const quizApi = {
  listQuizSets: (params?: {
    search?: string
    folderId?: string
    sourceType?: 'ALL' | 'PERSONAL' | 'DOCUMENT_AI'
  }) =>
    api.get('/quizzes', { params }).then(r => d<QuizSet[]>(r)),

  getQuizSet: (quizId: string) =>
    api.get(`/quizzes/${quizId}`).then(r => d<QuizSet>(r)),

  deleteQuizSet: (quizId: string) =>
    api.delete(`/quizzes/${quizId}`),

  moveQuizToFolder: (quizId: string, folderId?: string) =>
    api.patch(`/quizzes/${quizId}/move-folder`, { folderId }).then(r => d<QuizSet>(r)),

  listFolders: () =>
    api.get('/quiz-folders').then(r => d<QuizFolder[]>(r)),

  createFolder: (body: { name: string; color?: string }) =>
    api.post('/quiz-folders', body).then(r => d<QuizFolder>(r)),

  createPersonalQuizSet: (body: {
    title: string
    description?: string
    folderId?: string
    questions: {
      question: string
      options: string[]
      correctIndex: number
      explanation: string
    }[]
  }) =>
    api.post('/quizzes', body).then(r => d<QuizSet>(r)),

  saveFromChat: (body: {
    title: string
    description?: string
    questions: {
      question: string
      options: string[]
      correctIndex: number
      explanation: string
    }[]
  }) =>
    api.post('/quizzes/from-chat', body).then(r => d<QuizSet>(r)),

  updatePersonalQuizSet: (
    quizId: string,
    body: {
      title: string
      description?: string
      folderId?: string
      questions: {
        question: string
        options: string[]
        correctIndex: number
        explanation: string
      }[]
    }
  ) =>
    api.put(`/quizzes/${quizId}`, body).then(r => d<QuizSet>(r)),

  saveFromDocument: (body: {
    docId: string
    title: string
    folderId?: string
    questions: {
      question: string
      options: string[]
      correctIndex: number
      explanation: string
    }[]
  }) =>
    api.post('/quizzes/from-document', body).then(r => d<QuizSet>(r)),

  getWeakQuestionIds: (quizId: string) =>
    api.get(`/quizzes/${quizId}/weak-questions`).then(r => d<string[]>(r)),

  recordAttempt: (quizId: string, body: { questionId: string; correct: boolean }) =>
    api.post(`/quizzes/${quizId}/attempts`, body),
}

export const summaryApi = {
  list: (search?: string) =>
    api.get('/summaries', { params: search ? { search } : {} }).then(r => d<SavedSummary[]>(r)),

  get: (summaryId: string) =>
    api.get(`/summaries/${summaryId}`).then(r => d<SavedSummary>(r)),

  saveFromDocument: (body: {
    docId: string
    title: string
    content: string
    style?: string
    length?: string
    blogAppendix?: string
    relatedBlogTitles?: string[]
  }) =>
    api.post('/summaries/from-document', body).then(r => d<SavedSummary>(r)),

  savePersonal: (body: {
    title: string
    content: string
    style?: string
    length?: string
  }) =>
    api.post('/summaries', body).then(r => d<SavedSummary>(r)),

  delete: (summaryId: string) =>
    api.delete(`/summaries/${summaryId}`),
}

export const vocabularyApi = {
  parsePaste: (text: string) =>
    fetch(`${AI_AGENT_URL}/vocabulary/parse-paste`, {
      method: 'POST',
      headers: getAiRequestHeaders(true),
      body: JSON.stringify({ text }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<{ count: number; vocabulary: VocabularyPayload }>
    }),

  importFile: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${AI_AGENT_URL}/vocabulary/import`, {
      method: 'POST',
      headers: getAiRequestHeaders(),
      body: fd,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json() as Promise<{ count: number; vocabulary: VocabularyPayload }>
  },

  extract: (body: { topic?: string; file_url?: string; text?: string; max_items?: number }) =>
    fetch(`${AI_AGENT_URL}/vocabulary/extract`, {
      method: 'POST',
      headers: getAiRequestHeaders(true),
      body: JSON.stringify(withAiConfig(body)),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<{ count: number; vocabulary: VocabularyPayload }>
    }),

  toFlashcards: (vocabulary: VocabularyItem[], num_cards = 10) =>
    fetch(`${AI_AGENT_URL}/vocabulary/to-flashcards`, {
      method: 'POST',
      headers: getAiRequestHeaders(true),
      body: JSON.stringify({ vocabulary, num_cards }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<{ flashcards: { question: string; answer: string }[]; vocabulary: VocabularyPayload }>
    }),

  toQuiz: (vocabulary: VocabularyItem[], num_questions = 20) =>
    fetch(`${AI_AGENT_URL}/vocabulary/to-quiz`, {
      method: 'POST',
      headers: getAiRequestHeaders(true),
      body: JSON.stringify({ vocabulary, num_questions }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<{
        questions: QuizQuestion[]
        vocabulary: VocabularyPayload
      }>
    }),
}

export const vocabularySetApi = {
  list: (search?: string) =>
    api.get('/vocabulary-sets', { params: search ? { search } : {} }).then(r => d<VocabularySet[]>(r)),

  get: (id: string) =>
    api.get(`/vocabulary-sets/${id}`).then(r => d<VocabularySet>(r)),

  save: (body: {
    title: string
    description?: string
    folderId?: string
    sourceType?: 'IMPORT' | 'AI' | 'MANUAL'
    entries: { tu_vung: string; nghia: string; vi_du?: string; phat_am?: string }[]
  }) =>
    api.post('/vocabulary-sets', {
      title: body.title,
      description: body.description,
      folderId: body.folderId,
      sourceType: body.sourceType ?? 'MANUAL',
      entries: body.entries.map(e => ({
        tuVung: e.tu_vung,
        nghia: e.nghia,
        viDu: e.vi_du,
        phatAm: e.phat_am,
      })),
    }).then(r => d<VocabularySet>(r)),

  delete: (id: string) => api.delete(`/vocabulary-sets/${id}`),
}

export const studyDriveApi = {
  list: async (folderId?: string | null) => {
    const r = await api.get('/study-drive', {
      params: folderId ? { folderId } : {},
    })
    return asArray<any>(d<any>(r))
  },

  savePost: (body: {
    sourceId: string
    sourceType: string
    title: string
    description?: string
    groupId?: string
    groupName?: string
    folderId?: string | null
    imageUrls?: string[]
    videoUrl?: string
    attachments?: {
      name: string
      url: string
      type: string
      sizeKb: number
    }[]
  }) => api.post('/study-drive/save-post', body).then(r => d<any>(r)),

  upload: (file: File, folderId?: string | null, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    if (folderId) form.append('folderId', folderId)
    return api.post('/study-drive/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded / (e.total ?? 1)) * 100)),
    }).then(r => d<any>(r))
  },

  delete: (id: string) => api.delete(`/study-drive/${id}`),
}

export const studyApi = {
  getProfile: () =>
    api.get('/study/profile/me').then(r => d<StudyProfile | null>(r)),

  saveProfile: (profile: StudyProfile) =>
    api.put('/study/profile/me', profile).then(r => d<StudyProfile>(r)),

  listTerms: () =>
    api.get('/study/terms').then(r => d<StudyTermRecord[]>(r)),

  getTerm: (termId: string) =>
    api.get(`/study/terms/${termId}`).then(r => d<StudyTermRecord | null>(r)),

  createTerm: (term: StudyTermRecord) =>
    api.post('/study/terms', term).then(r => d<StudyTermRecord>(r)),

  saveTerm: (term: StudyTermRecord) => {
    if (term.id) {
      return api.put(`/study/terms/${term.id}`, term).then(r => d<StudyTermRecord>(r))
    }
    return api.post('/study/terms', term).then(r => d<StudyTermRecord>(r))
  },

  deleteTerm: (termId: string) =>
    api.delete(`/study/terms/${termId}`).then(r => d<boolean | null>(r)),

  listSubjects: (termId: string) =>
    api.get(`/study/terms/${termId}/subjects`).then(r => d<StudySubjectRecord[]>(r)),

  saveSubjects: (termId: string, subjects: StudySubjectRecord[]) =>
    api.put(`/study/terms/${termId}/subjects`, subjects).then(r => d<StudySubjectRecord[]>(r)),

  recomputeTermSummary: (termId: string) =>
    api.post(`/study/terms/${termId}/recompute`).then(r => d<StudyTermRecord | null>(r)),

  predictFromTerms: () =>
    api.get('/study/predict').then(r => d<StudyPrediction | null>(r)),
}
