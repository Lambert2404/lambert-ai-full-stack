import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { BACKEND_READY, isBackendPending } from '@/services/apiClient'

export function LoginPage() {
  const { t } = useI18n()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
      navigate(from)
    } catch (err) {
      if (isBackendPending(err)) {
        setError('Sign-in is ready for the backend, but no server is connected in this preview yet.')
      } else {
        setError((err as { message?: string })?.message ?? t.common.genericError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl">{t.auth.loginTitle}</h1>
      <p className="mt-1 text-sm text-ink-500">{t.auth.loginSubtitle}</p>

      {!BACKEND_READY && (
        <Alert
          tone="info"
          title="Preview mode"
          description="The Lambert AI backend isn't connected yet, so sign-in will show a development state."
        />
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label={t.auth.email}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          label={t.auth.password}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <Alert tone="error" title={error} />}
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-ink-500 hover:text-ink-900">
            {t.auth.forgotPassword}
          </Link>
        </div>
        <Button type="submit" fullWidth loading={loading}>
          {t.auth.signIn}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        {t.auth.noAccount}{' '}
        <Link to="/register" className="font-medium text-ink-900 hover:underline">
          {t.auth.signUp}
        </Link>
      </p>
    </div>
  )
}
