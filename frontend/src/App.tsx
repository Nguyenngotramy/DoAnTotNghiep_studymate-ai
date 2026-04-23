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
import ProfilePage from '@/pages/user/social/ProfilePage'
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

// Admin
import AdminDashboard from '@/pages/admin/DashboardPage'
import AdminUsers from '@/pages/admin/UsersPage'
import AdminGroups from '@/pages/admin/GroupsPage'
import AdminML from '@/pages/admin/MLResultsPage'
import AdminAlerts from '@/pages/admin/AlertsPage'
import AdminSettings from '@/pages/admin/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.accessToken)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'ADMIN'
    ? <>{children}</>
    : <Navigate to="/dashboard" replace />
}

function RedirectByRole() {
  const { user, accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return user?.role === 'ADMIN'
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />
        <Route path="/onboarding" element={<GoogleOnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RedirectByRole />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
          <Route path="/kanban/personal/:taskId" element={<PersonalTaskDetailPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/kanban" element={<MyTasksPage />} />
          <Route path="/kanban/progress" element={<TaskProgressPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/groups/:groupId/kanban" element={<KanbanPage />} />
          <Route path="/groups/:groupId/kanban/:taskId" element={<TaskDetailPage />} />
          <Route path="/groups/:groupId/chat" element={<ChatPage />} />
          <Route path="/groups/:groupId/docs" element={<DocsPage />} />
          <Route path="/study-drive" element={<MyStudyDrivePage />} />
          <Route path="/flashcard" element={<FlashcardPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/predict" element={<PredictPage />} />
        </Route>

        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/groups" element={<AdminGroups />} />
          <Route path="/admin/ml" element={<AdminML />} />
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<RedirectByRole />} />
      </Routes>
    </BrowserRouter>
  )
}