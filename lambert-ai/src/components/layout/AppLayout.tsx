import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo, Icon } from './Logo'
import { studentNavItems } from '@/routes/navConfig'
import { useI18n } from '@/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { Dropdown } from '@/components/ui/Dropdown'

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
      {studentNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-paper-100'
            )
          }
        >
          <Icon path={item.icon} className="h-5 w-5 shrink-0" />
          {t.nav[item.labelKey]}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-paper-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-300/25 bg-paper-0 md:flex">
        <div className="px-4 py-5">
          <Logo />
        </div>
        <SidebarLinks />
        <div className="border-t border-ink-300/25 p-3">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-paper-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 text-sm font-semibold text-gold-600">
              {(user?.name ?? 'S').charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{user?.name ?? 'Student'}</span>
          </NavLink>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="relative z-10 flex h-full w-72 flex-col bg-paper-0 shadow-xl">
            <div className="flex items-center justify-between px-4 py-5">
              <Logo />
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 text-ink-500 hover:bg-paper-100"
              >
                <Icon path="M6 6l12 12M18 6 6 18" />
              </button>
            </div>
            <SidebarLinks onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-ink-300/25 bg-paper-0 px-4 py-3 md:px-8">
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-ink-700 hover:bg-paper-100 md:hidden"
          >
            <Icon path="M4 7h16M4 12h16M4 17h16" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <NavLink to="/notifications" aria-label={t.nav.notifications} className="rounded-md p-2 text-ink-700 hover:bg-paper-100">
              <Icon path="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8zM10 19a2 2 0 0 0 4 0" />
            </NavLink>
            <Dropdown
              align="right"
              trigger={
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 text-sm font-semibold text-gold-600">
                  {(user?.name ?? 'S').charAt(0).toUpperCase()}
                </span>
              }
              items={[
                { label: t.nav.profile, onSelect: () => navigate('/profile') },
                { label: t.nav.settings, onSelect: () => navigate('/settings') },
                { label: t.nav.logout, onSelect: handleLogout, destructive: true },
              ]}
            />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
