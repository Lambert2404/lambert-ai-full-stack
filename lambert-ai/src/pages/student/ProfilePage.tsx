import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { isBackendPending } from '@/services/apiClient'
import type { StudentProfile } from '@/types'

export function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState<Partial<StudentProfile>>({
    educationLevel: '',
    institution: '',
    program: '',
    preferredLanguage: 'en',
    subjects: [],
    learningGoals: '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'pending-backend'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    try {
      await authService.updateProfile(form)
      setStatus('saved')
    } catch (err) {
      setStatus(isBackendPending(err) ? 'pending-backend' : 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Profile" description="Keep your study details up to date." />
      <Card className="max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" value={user?.name ?? ''} disabled hint="Managed by your account settings." />
          <Input label="Email" value={user?.email ?? ''} disabled />
          <Input
            label="Education level"
            placeholder="e.g. Undergraduate, Year 3"
            value={form.educationLevel}
            onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value }))}
          />
          <Input
            label="Institution"
            value={form.institution}
            onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
          />
          <Input
            label="Program"
            value={form.program}
            onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            Preferred language
            <select
              value={form.preferredLanguage}
              onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value as 'en' | 'sw' }))}
              className="rounded-md border border-ink-300/40 px-3 py-2.5 text-sm"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </label>
          <Input
            label="Learning goals"
            placeholder="What are you working towards?"
            value={form.learningGoals}
            onChange={(e) => setForm((f) => ({ ...f, learningGoals: e.target.value }))}
          />

          {status === 'saved' && <Alert tone="success" title="Profile updated" />}
          {status === 'pending-backend' && (
            <Alert tone="info" title="Not connected yet" description="Saving is ready for the backend, but no server is connected in this preview." />
          )}
          {status === 'error' && <Alert tone="error" title="Lambert AI couldn't save your profile. Please try again." />}

          <Button type="submit" loading={status === 'saving'}>Save changes</Button>
        </form>
      </Card>
    </div>
  )
}
