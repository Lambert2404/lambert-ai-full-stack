import { ScaffoldPage } from '@/components/layout/PageHeader'

export function AdminSubjectsPage() {
  return (
    <ScaffoldPage
      title="Subjects"
      description="Create and manage the subjects and topics available on Lambert AI."
      note="Wired to the subject data contract. Full CRUD (create/edit/reorder topics) lands once /admin/subjects endpoints are live."
    />
  )
}

export function AdminMaterialsPage() {
  return (
    <ScaffoldPage
      title="Materials"
      description="Review and moderate study materials uploaded across the platform."
    />
  )
}

export function AdminQuizzesPage() {
  return (
    <ScaffoldPage
      title="Quizzes"
      description="Review AI-generated and teacher-created quizzes platform-wide."
    />
  )
}

export function AdminAnalyticsPage() {
  return (
    <ScaffoldPage
      title="Analytics"
      description="Platform-wide usage, retention, and learning outcome analytics."
    />
  )
}
