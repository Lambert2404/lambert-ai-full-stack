import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/layout/Logo'

const links = [
  { label: 'My materials', to: '/teacher/materials', icon: 'M6 2h9l5 5v15H6z', description: 'Study materials you have published' },
  { label: 'My quizzes', to: '/teacher/quizzes', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2 8 12.7l-4-3.9L9.5 8z', description: 'Quizzes and question banks you own' },
]

export function TeacherOverviewPage() {
  return (
    <div>
      <PageHeader title="Teacher workspace" description="Manage the materials, topics, and quizzes you publish to students." />
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            <Card className="flex h-full items-start gap-3 hover:border-ink-900/30">
              <Icon path={l.icon} className="h-5 w-5 shrink-0 text-gold-600" />
              <div>
                <p className="font-medium text-ink-950">{l.label}</p>
                <p className="mt-0.5 text-sm text-ink-500">{l.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
