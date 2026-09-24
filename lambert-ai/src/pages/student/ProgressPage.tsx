import { useAsync } from '@/hooks/useAsync'
import { progressService } from '@/services/progressService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'

export function ProgressPage() {
  const summary = useAsync(() => progressService.getSummary(), [], (d) => !d)
  const subjectProgress = useAsync(() => progressService.getSubjectProgress(), [])
  const studyTime = useAsync(() => progressService.getStudyTime(), [])
  const weakTopics = useAsync(() => progressService.getWeakTopics(), [])

  return (
    <div>
      <PageHeader title="Progress" description="Your learning analytics across every subject." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AsyncView status={summary.status} data={summary.data} pendingEndpoint={summary.pendingEndpoint} errorMessage={summary.errorMessage} onRetry={summary.reload} emptyTitle="No activity yet">
          {(d) => (
            <>
              <Stat label="Streak" value={`${d.streakDays} days`} />
              <Stat label="Completed topics" value={`${d.completedTopics}/${d.totalTopics}`} />
              <Stat label="Quiz average" value={`${d.quizAverage}%`} />
              <Stat label="Study time today" value={`${d.studyMinutesToday} min`} />
            </>
          )}
        </AsyncView>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold text-ink-950">Subject performance</h3>
          <AsyncView status={subjectProgress.status} data={subjectProgress.data} pendingEndpoint={subjectProgress.pendingEndpoint} errorMessage={subjectProgress.errorMessage} onRetry={subjectProgress.reload} emptyTitle="No subject data yet">
            {(items) => (
              <div className="flex flex-col gap-4">
                {items.map((s) => (
                  <ProgressBar key={s.subjectId} value={s.progressPercent} label={s.subjectName} />
                ))}
              </div>
            )}
          </AsyncView>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-ink-950">Weak topics</h3>
          <AsyncView status={weakTopics.status} data={weakTopics.data} pendingEndpoint={weakTopics.pendingEndpoint} errorMessage={weakTopics.errorMessage} onRetry={weakTopics.reload} emptyTitle="No weak topics detected">
            {(items) => (
              <div className="flex flex-col gap-4">
                {items.map((t) => (
                  <ProgressBar key={t.topicId} value={t.masteryPercent} label={`${t.topicName} · ${t.subjectName}`} tone="gold" />
                ))}
              </div>
            )}
          </AsyncView>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-ink-950">Weekly study time</h3>
          <AsyncView status={studyTime.status} data={studyTime.data} pendingEndpoint={studyTime.pendingEndpoint} errorMessage={studyTime.errorMessage} onRetry={studyTime.reload} emptyTitle="No study time recorded yet">
            {(items) => (
              <div className="flex items-end gap-2" style={{ height: 140 }}>
                {items.map((pt) => (
                  <div key={pt.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full rounded-t bg-ink-900" style={{ height: `${Math.min(100, pt.minutes / 2)}%` }} />
                    <span className="text-[10px] text-ink-500">{new Date(pt.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </AsyncView>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-ink-950">{value}</p>
    </Card>
  )
}
