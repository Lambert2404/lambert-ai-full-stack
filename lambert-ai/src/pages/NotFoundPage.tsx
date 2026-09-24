import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper-50 px-4 text-center">
      <p className="font-serif text-5xl text-ink-950">404</p>
      <h1 className="text-xl">This page doesn't exist</h1>
      <p className="max-w-sm text-sm text-ink-500">The page you're looking for may have moved or was never here.</p>
      <Link to="/">
        <Button className="mt-2">Back to home</Button>
      </Link>
    </div>
  )
}
