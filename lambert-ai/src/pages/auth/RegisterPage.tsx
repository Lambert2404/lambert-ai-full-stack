import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { isBackendPending } from '@/services/apiClient'

export function RegisterPage() {
  const { t } = useI18n()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      if (isBackendPending(err)) {
        setError('Account creation is ready for the backend, but no server is connected in this preview yet.')
      } else {
        setError((err as { message?: string })?.message ?? t.common.genericError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl">{t.auth.registerTitle}</h1>
      <p className="mt-1 text-sm text-ink-500">{t.auth.registerSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input label={t.auth.name} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
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
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <Alert tone="error" title={error} />}
        <Button type="submit" fullWidth loading={loading}>
          {t.auth.signUp}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        {t.auth.haveAccount}{' '}
        <Link to="/login" className="font-medium text-ink-900 hover:underline">
          {t.auth.signIn}
        </Link>
      </p>
    </div>
  )
}
