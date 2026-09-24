import { Link, Outlet } from 'react-router-dom'
import { Logo } from './Logo'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="rounded-lg border border-ink-300/25 bg-paper-0 p-7 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
