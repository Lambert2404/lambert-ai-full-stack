import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useI18n } from '@/i18n'
import { authService } from '@/services/authService'
import { isBackendPending } from '@/services/apiClient'

export function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error' | 'pending-backend'>('idle')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setStatus('sent')
    } catch (err) {
      setStatus(isBackendPending(err) ? 'pending-backend' : 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-500">
        Enter the email on your account and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label={t.auth.email}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {status === 'sent' && (
          <Alert tone="success" title="Check your inbox" description={`If an account exists for ${email}, a reset link is on its way.`} />
        )}
        {status === 'pending-backend' && (
          <Alert tone="info" title="Not connected yet" description="This flow is ready for the backend, but no server is connected in this preview." />
        )}
        {status === 'error' && <Alert tone="error" title={t.common.genericError} />}
        <Button type="submit" fullWidth loading={loading}>
          {t.auth.sendResetLink}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link to="/login" className="font-medium text-ink-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
