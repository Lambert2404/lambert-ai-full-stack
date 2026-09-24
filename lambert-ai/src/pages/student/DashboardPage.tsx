import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { progressService } from '@/services/progressService'
import { studyPlanService } from '@/services/studyPlanService'
import { conversationService } from '@/services/conversationService'
import { documentService } from '@/services/documentService'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AsyncView } from '@/components/ui/AsyncView'
import { Icon } from '@/components/layout/Logo'

function greetingKey(): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'greetingMorning'
  if (hour < 18) return 'greetingAfternoon'
  return 'greetingEvening'
}

const quickActions = [
  { label: 'Ask AI', to: '/tutor', icon: 'M8 10h8M8 14h4m-8 6 2.5-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h.5z' },
  { label: 'Upload material', to: '/materials', icon: 'M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3' },
  { label: 'Take quiz', to: '/quizzes', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2 8 12.7l-4-3.9L9.5 8z' },
  { label: 'Study plan', to: '/study-planner', icon: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4' },
  { label: 'Analyze past paper', to: '/past-papers', icon: 'M9 3h6l5 5v13H4V3h5zM9 12h6M9 16h6' },
]

export function DashboardPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const summary = useAsync(() => progressService.getSummary(), [], (d) => !d)
  const plan = useAsync(() => studyPlanService.getActivePlan(), [], (d) => !d || d.sessions.length === 0)
  const subjectProgress = useAsync(() => progressService.getSubjectProgress(), [])
  const weakTopics = useAsync(() => progressService.getWeakTopics(), [])
  const recommendations = useAsync(() => progressService.getRecommendations(), [])
  const conversations = useAsync(() => conversationService.list(), [])
  const materials = useAsync(() => documentService.listMaterials(), [])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl">
            {t.dashboard[greetingKey()]}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-500">Here's where your studying stands today.</p>
        </div>
      </div>

      {/* Primary AI input */}
      <Link
        to="/tutor"
        className="mb-6 flex items-center gap-3 rounded-lg border border-ink-300/30 bg-paper-0 px-4 py-4 text-ink-500 shadow-sm transition-colors hover:border-ink-900/30"
      >
        <Icon path="M8 10h8M8 14h4m-8 6 2.5-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h.5z" className="h-5 w-5 text-ink-300" />
        <span className="text-sm">{t.dashboard.askPlaceholder}</span>
      </Link>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {quickActions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="flex flex-col items-center gap-2 rounded-lg border border-ink-300/30 bg-paper-0 px-3 py-4 text-center text-xs font-medium text-ink-700 hover:border-ink-900/30 hover:bg-paper-100"
          >
            <Icon path={a.icon} className="h-5 w-5 text-gold-600" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AsyncView status={summary.status} data={summary.data} pendingEndpoint={summary.pendingEndpoint} errorMessage={summary.errorMessage} onRetry={summary.reload} emptyTitle="No study activity yet">
          {(d) => (
            <>
              <StatCard label={t.dashboard.studyStreak} value={`${d.streakDays} days`} />
              <StatCard label={t.dashboard.studyTimeToday} value={`${d.studyMinutesToday} min`} />
              <StatCard label={t.dashboard.quizAverage} value={`${d.quizAverage}%`} />
              <StatCard label={t.dashboard.completedTopics} value={`${d.completedTopics}/${d.totalTopics}`} />
            </>
          )}
        </AsyncView>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink-950">Today's study plan</h3>
              <Link to="/study-planner" className="text-sm font-medium text-ink-500 hover:text-ink-900">
                {t.common.seeAll}
              </Link>
            </div>
            <AsyncView
              status={plan.status}
              data={plan.data}
              pendingEndpoint={plan.pendingEndpoint}
              errorMessage={plan.errorMessage}
              onRetry={plan.reload}
              emptyTitle="No sessions planned for today"
              emptyDescription="Generate an AI study plan to fill in today's schedule."
            >
              {(d) => (
                <ul className="flex flex-col gap-2">
                  {d.sessions.slice(0, 4).map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-md border border-ink-300/20 px-3 py-2.5 text-sm">
                      <span className="text-ink-900">{s.title}</span>
                      <span className="text-ink-500">{s.durationMinutes} min</span>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncView>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink-950">Weak topics</h3>
              <Link to="/progress" className="text-sm font-medium text-ink-500 hover:text-ink-900">
                {t.common.seeAll}
              </Link>
            </div>
            <AsyncView
              status={weakTopics.status}
              data={weakTopics.data}
              pendingEndpoint={weakTopics.pendingEndpoint}
              errorMessage={weakTopics.errorMessage}
              onRetry={weakTopics.reload}
              emptyTitle="No weak topics detected"
              emptyDescription="Take a few quizzes so Lambert AI can identify topics worth reviewing."
            >
              {(d) => (
                <div className="flex flex-col gap-3">
                  {d.map((topic) => (
                    <div key={topic.topicId}>
                      <ProgressBar value={topic.masteryPercent} label={`${topic.topicName} · ${topic.subjectName}`} tone="gold" />
                    </div>
                  ))}
                </div>
              )}
            </AsyncView>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink-950">Recent conversations</h3>
              <Link to="/conversations" className="text-sm font-medium text-ink-500 hover:text-ink-900">
                {t.common.seeAll}
              </Link>
            </div>
            <AsyncView
              status={conversations.status}
              data={conversations.data}
              pendingEndpoint={conversations.pendingEndpoint}
              errorMessage={conversations.errorMessage}
              onRetry={conversations.reload}
              emptyTitle="No conversations yet"
              emptyDescription="Ask Lambert AI a question to start your first conversation."
            >
              {(d) => (
                <ul className="divide-y divide-ink-300/20">
                  {d.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link to={`/tutor/${c.id}`} className="block py-2.5 text-sm">
                        <p className="font-medium text-ink-900">{c.title}</p>
                        {c.lastMessagePreview && <p className="line-clamp-1 text-ink-500">{c.lastMessagePreview}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncView>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="mb-4 text-base font-semibold text-ink-950">Recommended next</h3>
            <AsyncView
              status={recommendations.status}
              data={recommendations.data}
              pendingEndpoint={recommendations.pendingEndpoint}
              errorMessage={recommendations.errorMessage}
              onRetry={recommendations.reload}
              emptyTitle="Nothing to recommend yet"
            >
              {(d) => (
                <div className="flex flex-col gap-3">
                  {d.slice(0, 3).map((r) => (
                    <div key={r.id} className="rounded-md border border-ink-300/20 p-3">
                      <p className="text-sm font-medium text-ink-950">{r.title}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{r.reason}</p>
                    </div>
                  ))}
                  <Link to="/recommendations">
                    <Button variant="outline" size="sm" fullWidth>{t.common.seeAll}</Button>
                  </Link>
                </div>
              )}
            </AsyncView>
          </Card>

          <Card>
            <h3 className="mb-4 text-base font-semibold text-ink-950">Subject progress</h3>
            <AsyncView
              status={subjectProgress.status}
              data={subjectProgress.data}
              pendingEndpoint={subjectProgress.pendingEndpoint}
              errorMessage={subjectProgress.errorMessage}
              onRetry={subjectProgress.reload}
              emptyTitle="No subjects tracked yet"
            >
              {(d) => (
                <div className="flex flex-col gap-4">
                  {d.map((s) => (
                    <ProgressBar key={s.subjectId} value={s.progressPercent} label={s.subjectName} />
                  ))}
                </div>
              )}
            </AsyncView>
          </Card>

          <Card>
            <h3 className="mb-4 text-base font-semibold text-ink-950">Recent materials</h3>
            <AsyncView
              status={materials.status}
              data={materials.data}
              pendingEndpoint={materials.pendingEndpoint}
              errorMessage={materials.errorMessage}
              onRetry={materials.reload}
              emptyTitle="No materials uploaded yet"
              emptyDescription="Upload a PDF or document to start asking questions about it."
            >
              {(d) => (
                <ul className="flex flex-col gap-2">
                  {d.slice(0, 4).map((m) => (
                    <li key={m.id} className="truncate text-sm text-ink-900">
                      {m.name}
                    </li>
                  ))}
                </ul>
              )}
            </AsyncView>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-ink-950">{value}</p>
    </Card>
  )
}
