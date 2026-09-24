import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { useI18n } from '@/i18n'
import { useAsync } from '@/hooks/useAsync'
import { aiService } from '@/services/aiService'
import { AsyncView } from '@/components/ui/AsyncView'
import { aiModes } from '@/pages/tutor/aiModeConfig'

const sections = [
  { id: 'account', label: 'Account' },
  { id: 'language', label: 'Language' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'ai', label: 'AI preferences' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'security', label: 'Security' },
]

export function SettingsPage() {
  const [tab, setTab] = useState('account')
  const { language, setLanguage } = useI18n()
  const providers = useAsync(() => aiService.listProviders(), [])

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, language, and AI preferences." />
      <Tabs items={sections} activeId={tab} onChange={setTab} className="mb-6" />

      {tab === 'account' && (
        <Card className="max-w-xl">
          <p className="text-sm text-ink-500">Account details are managed from your Profile page.</p>
        </Card>
      )}

      {tab === 'language' && (
        <Card className="max-w-xl">
          <p className="mb-3 text-sm font-medium text-ink-700">Interface language</p>
          <div className="flex gap-2">
            {(['en', 'sw'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${
                  language === l ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300/40 text-ink-700'
                }`}
              >
                {l === 'en' ? 'English' : 'Kiswahili'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {tab === 'appearance' && (
        <Card className="max-w-xl">
          <p className="text-sm text-ink-500">Lambert AI currently uses a single, accessible light theme. Dark mode is on the roadmap.</p>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card className="max-w-xl">
          <div className="flex flex-col divide-y divide-ink-300/20">
            {['Study reminders', 'Quiz results', 'Study plan updates', 'New material processed', 'Achievements'].map((n) => (
              <label key={n} className="flex items-center justify-between py-3 text-sm text-ink-900">
                {n}
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>
            ))}
          </div>
        </Card>
      )}

      {tab === 'ai' && (
        <Card className="max-w-xl">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
              Default AI mode
              <select className="rounded-md border border-ink-300/40 px-3 py-2.5 text-sm" defaultValue="tutor">
                {aiModes.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Default AI provider</p>
              <AsyncView
                status={providers.status}
                data={providers.data}
                errorMessage={providers.errorMessage}
                pendingEndpoint={providers.pendingEndpoint}
                onRetry={providers.reload}
                emptyTitle="No providers configured"
              >
                {(items) => (
                  <select className="w-full rounded-md border border-ink-300/40 px-3 py-2.5 text-sm">
                    {items.filter((p) => p.enabled).map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                )}
              </AsyncView>
              <p className="mt-1 text-xs text-ink-500">Only providers enabled by your administrator are shown here.</p>
            </div>
          </div>
        </Card>
      )}

      {tab === 'privacy' && (
        <Card className="max-w-xl">
          <p className="text-sm text-ink-500">
            Your conversations and uploaded documents are used only to answer your questions and personalize your
            study experience. You can delete any document or conversation at any time.
          </p>
        </Card>
      )}

      {tab === 'security' && (
        <Card className="max-w-xl">
          <p className="text-sm text-ink-500">Password and session management will appear here once connected to the backend.</p>
        </Card>
      )}
    </div>
  )
}
