import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo, Icon } from './Logo'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'

interface Section {
  label: string
  path: string
  icon: string
}

const adminSections: Section[] = [
  { label: 'Overview', path: '/admin', icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { label: 'Users', path: '/admin/users', icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21c1-4 5-6 9-6s8 2 9 6' },
  { label: 'Subjects', path: '/admin/subjects', icon: 'M4 5h16M4 12h16M4 19h10' },
  { label: 'Materials', path: '/admin/materials', icon: 'M6 2h9l5 5v15H6z' },
  { label: 'Quizzes', path: '/admin/quizzes', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2 8 12.7l-4-3.9L9.5 8z' },
  { label: 'AI Providers', path: '/admin/ai-providers', icon: 'M4 7a8 8 0 0 1 16 0M4 17a8 8 0 0 0 16 0M2 7h4v4H2zM18 13h4v4h-4z' },
  { label: 'Analytics', path: '/admin/analytics', icon: 'M4 20V10m6 10V4m6 16v-7' },
]

const teacherSections: Section[] = [
  { label: 'Overview', path: '/teacher', icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { label: 'My materials', path: '/teacher/materials', icon: 'M6 2h9l5 5v15H6z' },
  { label: 'My quizzes', path: '/teacher/quizzes', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2 8 12.7l-4-3.9L9.5 8z' },
]

export function WorkspaceLayout({ variant }: { variant: 'admin' | 'teacher' }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sections = variant === 'admin' ? adminSections : teacherSections
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const links = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
      {sections.map((s) => (
        <NavLink
          key={s.path}
          to={s.path}
          end={s.path === '/admin' || s.path === '/teacher'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-paper-100'
            )
          }
        >
          <Icon path={s.icon} className="h-5 w-5 shrink-0" />
          {s.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-paper-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-300/25 bg-paper-0 md:flex">
        <div className="px-4 py-5">
          <Logo />
          <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
            {variant === 'admin' ? 'Admin workspace' : 'Teacher workspace'}
          </span>
        </div>
        {links()}
        <div className="border-t border-ink-300/25 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-ink-700 hover:bg-paper-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 text-sm font-semibold text-gold-600">
              {(user?.name ?? 'A').charAt(0).toUpperCase()}
            </span>
            <span className="truncate">Log out</span>
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="relative z-10 flex h-full w-72 flex-col bg-paper-0 shadow-xl">
            <div className="flex items-center justify-between px-4 py-5">
              <Logo />
              <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="rounded-md p-1.5 text-ink-500">
                <Icon path="M6 6l12 12M18 6 6 18" />
              </button>
            </div>
            {links(() => setDrawerOpen(false))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-300/25 bg-paper-0 px-4 py-3 md:px-8">
          <button aria-label="Open menu" onClick={() => setDrawerOpen(true)} className="rounded-md p-2 text-ink-700 hover:bg-paper-100 md:hidden">
            <Icon path="M4 7h16M4 12h16M4 17h16" />
          </button>
          <div />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
