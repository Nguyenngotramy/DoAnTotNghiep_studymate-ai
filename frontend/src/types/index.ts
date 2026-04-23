export type SystemRole = 'USER' | 'ADMIN'
export type GroupRole = 'LEADER' | 'MEMBER' | 'VIEWER' | 'DEPUTY'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskSubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED'

export interface AvailableSlot {
  dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
  startTime: string
  endTime: string
}

export type UserType = 'STUDENT' | 'HIGHSCHOOL' | 'TEACHER' | 'OTHER'

export interface User {
  id: string
  fullName: string
  email: string
  role: SystemRole
  studentCode?: string
  avatar?: string
  coverImage?: string
  bio?: string
  location?: string
  school?: string
  xp: number
  streak: number
  skills?: UserSkill[]
  interests?: string[]
  postCount?: number
  friendCount?: number
  locked?: boolean
  createdAt?: string
  updatedAt?: string
  lastActiveAt?: string
  onboardingDone?: boolean
  userType?: UserType
  strongSubjects?: string[]
  weakSubjects?: string[]
  goal?: string
  availableSchedule?: AvailableSlot[]
}

export interface UserSkill {
  subject: string
  level: 1 | 2 | 3
  color: string
}

export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED'

export interface Friendship {
  id: string
  requesterId: string
  receiverId: string
  status: FriendStatus
  requester?: User
  receiver?: User
  createdAt: string
}

export interface Post {
  id: string
  authorId: string
  authorName?: string
  author?: User
  title: string
  content: string
  summary?: string
  tags: string[]
  likesCount: number
  commentsCount: number
  views: number
  coverImage?: string
  imageUrls?: string[]
  videoUrl?: string
  likedBy?: string[]
  savedBy?: string[]
  comments?: PostComment[]
  published?: boolean
  isPublished?: boolean
  isLiked?: boolean
  isSaved?: boolean
  createdAt: string
  updatedAt?: string
}

export interface PostComment {
  id: string
  postId: string
  authorId: string
  authorName?: string
  author?: User
  content: string
  createdAt: string
}

export type MessageType = 'TEXT' | 'FILE' | 'IMAGE' | 'VIDEO' | 'AI' | 'SYSTEM'

export interface DirectMessageAttachment {
  name: string
  url: string
  type: string
  sizeKb: number
}

export interface DirectMessageReaction {
  emoji: string
  userIds: string[]
}

export interface DirectMessageReplyPreview {
  messageId: string
  senderId?: string
  senderName?: string
  content?: string
  type?: MessageType | string
  attachments?: DirectMessageAttachment[]
}

export interface DirectMessage {
  id: string
  senderId: string
  receiverId: string
  senderName?: string
  senderAvatar?: string | null
  content: string
  type: MessageType
  pinned?: boolean
  attachments?: DirectMessageAttachment[]
  reactions?: DirectMessageReaction[]
  replyTo?: DirectMessageReplyPreview | null
  recalled?: boolean
  recalledAt?: string
  recalledBy?: string
  readAt?: string
  sender?: User
  createdAt: string
  updatedAt?: string
}

export interface Conversation {
  userId?: string
  user?: User
  lastMessage?: DirectMessage
  unreadCount: number
  online?: boolean
  lastActiveAt?: string
  threadType: 'DM' | 'GROUP'
  routePath: string
  groupId?: string
  groupName?: string
  groupColor?: string
  groupDescription?: string
  title: string
  avatar?: string | null
}

export interface Group {
  id: string
  name: string
  description: string
  subject: string
  coverColor: string
  inviteCode: string
  memberCount: number
  members?: GroupMember[]
  taskCount?: number
  progress?: number
  myRole?: GroupRole
  publicVisible?: boolean
  requireApproval?: boolean
  requirePostApproval?: boolean
  createdAt?: string
}

export interface GroupMember {
  userId: string
  fullName: string
  role: 'LEADER' | 'MEMBER' | 'VIEWER' | 'DEPUTY'
  joinedAt: string
  user?: User
}

export interface TaskComment {
  id: string
  authorId: string
  authorName?: string
  content: string
  createdAt: string
  updatedAt?: string
  edited?: boolean
  replies?: TaskComment[]
}

export interface TaskAttachment {
  name: string
  url: string
  type: string
  sizeKb?: number
  size?: number
}

export interface TaskSubmission {
  submittedById?: string
  submittedByName?: string
  answerText?: string
  files?: TaskAttachment[]
  images?: TaskAttachment[]
  submitted?: boolean
  submittedAt?: string
  updatedAt?: string
}

export interface Task {
  id: string
  groupId?: string
  personal?: boolean
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  label?: string
  labelColor?: string
  assigneeId?: string
  assigneeName?: string
  createdById?: string
  createdByName?: string
  deadline?: string
  comments?: TaskComment[]
  submissionStatus?: TaskSubmissionStatus
  submission?: TaskSubmission | null
  createdAt?: string
  updatedAt?: string
}

export interface ChatAttachment {
  name: string
  url: string
  type: string
  sizeKb: number
}

export interface ChatReaction {
  emoji: string
  userIds: string[]
}

export interface ChatReplyPreview {
  messageId: string
  senderId?: string
  senderName?: string
  content?: string
  type?: string
  attachments?: ChatAttachment[]
}

export type ChatMessageType = 'USER' | 'AI' | 'SYSTEM'

export interface ChatMessage {
  id: string
  groupId: string
  senderId: string
  senderName: string
  senderAvatar?: string | null
  content: string
  type: ChatMessageType
  pinned?: boolean
  mentionUserIds?: string[]
  attachments?: ChatAttachment[]
  reactions?: ChatReaction[]
  replyTo?: ChatReplyPreview | null
  recalled?: boolean
  recalledAt?: string
  recalledBy?: string
  createdAt: string
}

export type DocType = 'PDF' | 'DOCX' | 'PPTX' | 'EXCEL' | 'IMAGE' | 'TEXT' | 'OTHER'
export type DocSourceType = 'PAGE' | 'CHAT'

export interface Document {
  id: string
  groupId: string
  name: string
  type: DocType
  sizeKb: number
  fileUrl: string
  uploaderId: string
  uploaderName?: string
  sourceType?: DocSourceType
  messageId?: string
  createdAt: string
}

export interface Flashcard {
  id?: string
  question: string
  answer: string
  docId?: string
  postId?: string
}

export interface QuizQuestion {
  id?: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  docId?: string
}

export interface PredictInput {
  mode: 'cap3' | 'sv'
  scores: Record<string, number>
  khoi?: string
  uuTienKV?: number
  uuTienDT?: number
  targetGrade?: string
  hoursPerWeek?: number
  weeksLeft?: number
  attendance?: number
  redoCount?: number
}

export interface StudyPlanItem {
  id: string
  name: string
  score: number
  gap: number
  hours: number
  status: 'urgent' | 'warn' | 'ok'
  weight: number
}

export interface PredictResult {
  mode: 'cap3' | 'sv'
  gpa: number
  gradeLabel: string
  gradeColor: string
  probability: number
  plan: StudyPlanItem[]
  advice: string
  universities?: UniversityMatch[]
  thptScore?: number
}

export interface UniversityMatch {
  name: string
  score: number
  delta: number
  status: 'safe' | 'match' | 'reach'
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  link?: string
  type?: string
  actorId?: string
  actorName?: string
  actorAvatar?: string
  groupId?: string
  sourceId?: string
  sourceType?: string
  read: boolean
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PageResponse<T> {
  content: T[]
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
  last?: boolean
}

export type FlashcardDeckSourceType = 'PERSONAL' | 'DOCUMENT_AI'

export interface FlashcardFolder {
  id: string
  name: string
  color?: string
  createdById: string
  createdByName?: string
  createdAt?: string
}

export interface FlashcardDeck {
  id: string
  title: string
  description?: string
  folderId?: string | null
  createdById: string
  createdByName?: string
  aiGenerated: boolean
  sourceType: FlashcardDeckSourceType
  sourceGroupId?: string
  sourceGroupName?: string
  sourceDocumentId?: string
  sourceDocumentName?: string
  cards: Flashcard[]
  createdAt?: string
  updatedAt?: string
}

export type QuizSetSourceType = 'PERSONAL' | 'DOCUMENT_AI'

export interface QuizFolder {
  id: string
  name: string
  color?: string
  createdById: string
  createdByName?: string
  createdAt?: string
}

export interface QuizSetItem {
  id?: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  orderIndex?: number
}

export interface QuizSet {
  id: string
  title: string
  description?: string
  folderId?: string | null
  createdById: string
  createdByName?: string
  aiGenerated: boolean
  sourceType: QuizSetSourceType
  sourceGroupId?: string
  sourceGroupName?: string
  sourceDocumentId?: string
  sourceDocumentName?: string
  questions: QuizSetItem[]
  createdAt?: string
  updatedAt?: string
}

export type StudyProfileUserType = 'HIGHSCHOOL' | 'STUDENT' | 'OTHER'
export type StudySemesterType = 'HK1' | 'HK2' | 'SUMMER' | 'OTHER'

export interface StudyProfile {
  id: string
  userId: string
  userType: StudyProfileUserType

  fullName: string
  schoolName?: string

  className?: string
  gradeLevel?: '10' | '11' | '12'

  faculty?: string
  major?: string
  specialization?: string
  courseYear?: string

  customProgramName?: string
  targetGoal?: string

  createdAt: string
  updatedAt: string
}

export interface StudyTermRecord {
  id: string
  userId: string
  userType: StudyProfileUserType

  academicYear: string
  semesterType: StudySemesterType
  semesterLabel: string
  isCurrent?: boolean

  fullName?: string
  schoolName?: string
  className?: string
  gradeLevel?: '10' | '11' | '12'

  faculty?: string
  major?: string
  specialization?: string
  courseYear?: string

  customProgramName?: string
  targetGoal?: string

  behaviorRating?: string
  note?: string

  averageScore?: number
  gpa10?: number
  gpa4?: number
  classification?: string

  createdAt: string
  updatedAt: string
}

export interface StudySubjectRecord {
  id: string
  termId: string
  userId: string
  userType: StudyProfileUserType

  subjectName: string
  credits?: number

  regularScores?: number[]
  midtermScore?: number
  finalScore?: number

  attendanceScore?: number
  assignmentScore?: number
  projectScore?: number

  customScores?: {
    label: string
    value: number
    weight?: number
  }[]

  averageScore?: number
  letterGrade?: string
  status?: 'pass' | 'fail' | 'in_progress'
  note?: string
}

export interface StudyPrediction {
  predictedAverage: number
  predictedClassification: string
  confidenceLevel: 'low' | 'medium' | 'high'
  weakSubjects: string[]
  strongSubjects: string[]
  suggestions: string[]
  warnings: string[]
}