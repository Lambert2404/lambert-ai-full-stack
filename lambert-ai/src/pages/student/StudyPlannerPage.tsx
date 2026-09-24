import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { studyPlanService } from '@/services/studyPlanService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { isBackendPending } from '@/services/apiClient'
import type { StudySession } from '@/types'

const statusTone = { pending: 'neutral', completed: 'emerald', skipped: 'crimson' } as const

export function StudyPlannerPage() {
  const plan = useAsync(() => studyPlanService.getActivePlan(), [], (d) => !d || d.sessions.length === 0)
  const [generating, setGenerating] = useState(false)
  const { showToast } = useToast()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await studyPlanService.generatePlan()
      showToast('Study plan generated', 'success')
      plan.reload()
    } catch (err) {
      showToast(
        isBackendPending(err)
          ? 'AI plan generation is ready for the backend, but no server is connected in this preview yet.'
          : "Lambert AI couldn't generate a plan right now. Please try again.",
        'error'
      )
    } finally {
      setGenerating(false)
    }
  }

  const updateSession = async (session: StudySession, status: StudySession['status']) => {
    try {
      await studyPlanService.updateSession(session.id, { status })
      showToast('Session updated', 'success')
      plan.reload()
    } catch {
      showToast("Lambert AI couldn't update that session. Please try again.", 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Study Planner"
        description="Your day-by-day plan, built around your exam date and available hours."
        action={<Button onClick={handleGenerate} loading={generating}>AI generate plan</Button>}
      />

      <AsyncView
        status={plan.status}
        data={plan.data}
        errorMessage={plan.errorMessage}
        pendingEndpoint={plan.pendingEndpoint}
        onRetry={plan.reload}
        emptyTitle="No study plan yet"
        emptyDescription="Generate an AI study plan or add sessions manually."
      >
        {(p) => (
          <div>
            {p.examDate && (
              <Card className="mb-6">
                <p className="text-sm text-ink-500">Exam countdown</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink-950">
                  {Math.max(0, Math.ceil((new Date(p.examDate).getTime() - Date.now()) / 86_400_000))} days
                </p>
              </Card>
            )}
            <div className="flex flex-col gap-3">
              {p.sessions.map((s) => (
                <Card key={s.id} className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-ink-950">{s.title}</p>
                    <p className="text-sm text-ink-500">
                      {new Date(s.date).toLocaleDateString()} {s.startTime ? `· ${s.startTime}` : ''} · {s.durationMinutes} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[s.status]}>{s.status}</Badge>
                    {s.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateSession(s, 'completed')}>Complete</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateSession(s, 'skipped')}>Skip</Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </AsyncView>
    </div>
  )
}
