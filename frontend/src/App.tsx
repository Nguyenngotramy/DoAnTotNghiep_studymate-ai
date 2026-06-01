import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import UserLayout from '@/layouts/user/UserLayout'
import AdminLayout from '@/layouts/admin/AdminLayout'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import OAuth2CallbackPage from '@/pages/auth/OAuth2CallbackPage'
import GoogleOnboardingPage from '@/pages/auth/GoogleOnboardingPage'

// User — Social
import DashboardPage from '@/pages/user/social/DashboardPage'
import BlogPage from '@/pages/user/social/BlogPage'
import CreatePostPage from '@/pages/user/social/CreatePostPage'
import PostDetailPage from '@/pages/user/social/PostDetailPage'
import DiscoverPage from '@/pages/user/social/DiscoverPage'
import NotificationsPage from '@/pages/user/social/NotificationsPage'
import UserProfilePage from '@/pages/user/social/UserProfilePage'
import EditProfilePage from '@/pages/user/social/EditProfilePage'
import SearchPage from '@/pages/user/social/SearchPage'
import SettingsPage from '@/pages/user/social/SettingsPage'
import InboxPage from '@/pages/user/social/InboxPage'
import FriendsPage from '@/pages/user/social/FriendsPage'

// User — Tasks
import MyTasksPage from '@/pages/user/groups/MyTasksPage'
import TaskProgressPage from '@/pages/user/groups/TaskProgressPage'

// User — Groups
import GroupsPage from '@/pages/user/groups/GroupsPage'
import GroupDetailPage from '@/pages/user/groups/GroupDetailPage'
import KanbanPage from '@/pages/user/groups/KanbanPage'
import ProjectListPage from '@/pages/user/groups/ProjectListPage'
import ProjectKanbanPage from '@/pages/user/groups/ProjectKanbanPage'
import ProjectProgressPage from '@/pages/user/groups/ProjectProgressPage'
import TaskDetailPage from '@/pages/user/groups/TaskDetailPage'
import ChatPage from '@/pages/user/groups/ChatPage'
import DocsPage from '@/pages/user/groups/DocsPage'
import MyStudyDrivePage from '@/pages/user/groups/MyStudyDrivePage'
import PersonalTaskDetailPage from '@/pages/user/groups/PersonalTaskDetailPage'

// User — Learning
import FlashcardPage from '@/pages/user/learning/FlashcardPage'
import QuizPage from '@/pages/user/learning/QuizPage'
import StatisticsPage from '@/pages/user/learning/StatisticsPage'

// User — Predict
import PredictPage from '@/pages/user/predict/PredictPage'
import MembershipPage from '@/pages/user/membership/MembershipPage'
import PaymentPage from '@/pages/user/payment/PaymentPage'
import PaymentResultPage from '@/pages/user/payment/PaymentResultPage'

// Admin
import AdminDashboard from '@/pages/admin/DashboardPage'
import AdminUsers from '@/pages/admin/UsersPage'
import AdminPosts from '@/pages/admin/AdminPostsPage'
import AdminGroups from '@/pages/admin/GroupsPage'
import AdminML from '@/pages/admin/MLResultsPage'
import AdminAlerts from '@/pages/admin/AlertsPage'
import AdminSettings from '@/pages/admin/SettingsPage'
import AdminMembershipPage from '@/pages/admin/AdminMembershipPage'
import AdminUserDetailPage from '@/pages/admin/UserDetailPage'
import AdminGroupDetailPage from '@/pages/admin/AdminGroupDetailPage'
import AdminDocuments from '@/pages/admin/AdminDocuments'
import AdminNotifications from '@/pages/admin/AdminNotifications'
import AdminStats from '@/pages/admin/AdminStats'
import AdminRevenuePage from '@/pages/admin/AdminRevenuePage'

function FullPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="text-[13px] text-[#8b8b9e]">
        Đang kiểm tra phiên đăng nhập...
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  const accessToken = useAuthStore(s => s.accessToken)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return <FullPageLoading />
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function RedirectByRole() {
  const user = useAuthStore(s => s.user)
  const accessToken = useAuthStore(s => s.accessToken)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return <FullPageLoading />
  }

  return user.role === 'ADMIN'
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />
        <Route path="/onboarding" element={<GoogleOnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Root redirect */}
        <Route path="/" element={<RedirectByRole />} />

        {/* User routes */}
        <Route
          element={
            <RequireAuth>
              <UserLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/create" element={<CreatePostPage />} />
          <Route path="/blog/:id" element={<PostDetailPage />} />

          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/friends" element={<FriendsPage />} />

          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/:userId" element={<InboxPage />} />

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />

          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/u/:userId" element={<UserProfilePage />} />

          <Route path="/settings" element={<SettingsPage />} />

          <Route
            path="/kanban/personal/:taskId"
            element={<PersonalTaskDetailPage />}
          />

          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/groups/:groupId/projects" element={<ProjectListPage />} />
          <Route path="/groups/:groupId/projects/:projectId/kanban" element={<ProjectKanbanPage />} />
          <Route path="/groups/:groupId/projects/:projectId/progress" element={<ProjectProgressPage />} />
          <Route path="/groups/:groupId/kanban" element={<KanbanPage />} />
          <Route
            path="/groups/:groupId/kanban/:taskId"
            element={<TaskDetailPage />}
          />
          <Route path="/groups/:groupId/chat" element={<ChatPage />} />
          <Route path="/groups/:groupId/docs" element={<DocsPage />} />

          <Route path="/kanban" element={<MyTasksPage />} />
          <Route path="/kanban/progress" element={<TaskProgressPage />} />

          <Route path="/study-drive" element={<MyStudyDrivePage />} />

          <Route path="/flashcard" element={<FlashcardPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />

          <Route path="/predict" element={<PredictPage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/result/momo" element={<PaymentResultPage />} />
          <Route path="/payment/result/vnpay" element={<PaymentResultPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />

          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />

          <Route path="/admin/groups" element={<AdminGroups />} />
          <Route
            path="/admin/groups/:groupId"
            element={<AdminGroupDetailPage />}
          />

          <Route path="/admin/ml" element={<AdminML />} />
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/admin/docs" element={<AdminDocuments />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/stats" element={<AdminStats />} />
          <Route path="/admin/revenue" element={<AdminRevenuePage />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/membership" element={<AdminMembershipPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<RedirectByRole />} />
      </Routes>
    </BrowserRouter>
  )
}