import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Public
import { LandingPage } from '@/pages/public/LandingPage'

// Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

// Student
import { DashboardPage } from '@/pages/student/DashboardPage'
import { SubjectsPage } from '@/pages/student/SubjectsPage'
import { SubjectDetailPage } from '@/pages/student/SubjectDetailPage'
import { TopicDetailPage } from '@/pages/student/TopicDetailPage'
import { StudyPlannerPage } from '@/pages/student/StudyPlannerPage'
import { ProgressPage } from '@/pages/student/ProgressPage'
import { RecommendationsPage } from '@/pages/student/RecommendationsPage'
import { BookmarksPage } from '@/pages/student/BookmarksPage'
import { NotificationsPage } from '@/pages/student/NotificationsPage'
import { ConversationsPage } from '@/pages/student/ConversationsPage'
import { ProfilePage } from '@/pages/student/ProfilePage'
import { SettingsPage } from '@/pages/student/SettingsPage'

// Tutor
import { TutorPage } from '@/pages/tutor/TutorPage'

// Materials
import { MaterialsPage } from '@/pages/materials/MaterialsPage'
import { MaterialDetailPage } from '@/pages/materials/MaterialDetailPage'

// Past papers
import { PastPapersPage } from '@/pages/pastpapers/PastPapersPage'
import { PastPaperDetailPage } from '@/pages/pastpapers/PastPaperDetailPage'

// Quizzes
import { QuizLibraryPage } from '@/pages/quizzes/QuizLibraryPage'
import { QuizDetailPage } from '@/pages/quizzes/QuizDetailPage'
import { QuizAttemptPage } from '@/pages/quizzes/QuizAttemptPage'

// Teacher
import { TeacherOverviewPage } from '@/pages/teacher/TeacherOverviewPage'
import { TeacherMaterialsPage } from '@/pages/teacher/TeacherMaterialsPage'
import { TeacherQuizzesPage } from '@/pages/teacher/TeacherQuizzesPage'

// Admin
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminAiProvidersPage } from '@/pages/admin/AdminAiProvidersPage'
import { AdminSubjectsPage, AdminMaterialsPage, AdminQuizzesPage, AdminAnalyticsPage } from '@/pages/admin/AdminScaffoldPages'

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Public marketing site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Authenticated student app */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tutor" element={<TutorPage />} />
            <Route path="/tutor/:conversationId" element={<TutorPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
            <Route path="/topics/:topicId" element={<TopicDetailPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/materials/:materialId" element={<MaterialDetailPage />} />
            <Route path="/past-papers" element={<PastPapersPage />} />
            <Route path="/past-papers/:paperId" element={<PastPaperDetailPage />} />
            <Route path="/quizzes" element={<QuizLibraryPage />} />
            <Route path="/quizzes/:quizId" element={<QuizDetailPage />} />
            <Route path="/quiz/:attemptId" element={<QuizAttemptPage />} />
            <Route path="/study-planner" element={<StudyPlannerPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Teacher workspace */}
          <Route
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <WorkspaceLayout variant="teacher" />
              </RequireAuth>
            }
          >
            <Route path="/teacher" element={<TeacherOverviewPage />} />
            <Route path="/teacher/materials" element={<TeacherMaterialsPage />} />
            <Route path="/teacher/quizzes" element={<TeacherQuizzesPage />} />
          </Route>

          {/* Admin workspace */}
          <Route
            element={
              <RequireAuth roles={['admin']}>
                <WorkspaceLayout variant="admin" />
              </RequireAuth>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
            <Route path="/admin/materials" element={<AdminMaterialsPage />} />
            <Route path="/admin/quizzes" element={<AdminQuizzesPage />} />
            <Route path="/admin/ai-providers" element={<AdminAiProvidersPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
