import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Logo, Icon } from './Logo'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'

const links = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'AI Tutor', href: '#ai-tutor' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'FAQ', href: '#faq' },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { language, setLanguage } = useI18n()

  return (
    <div className="flex min-h-screen flex-col bg-paper-50">
      <header className="sticky top-0 z-30 border-b border-ink-300/25 bg-paper-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-ink-700 hover:text-ink-950">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
              className="text-sm font-medium text-ink-500 hover:text-ink-900"
            >
              {language === 'en' ? 'Kiswahili' : 'English'}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">Start learning</Button>
            </Link>
          </div>
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-ink-700 hover:bg-paper-100 lg:hidden"
          >
            <Icon path="M4 7h16M4 12h16M4 17h16" />
          </button>
        </div>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="relative z-10 ml-auto flex h-full w-72 flex-col gap-1 bg-paper-0 p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-ink-500">
                  <Icon path="M6 6l12 12M18 6 6 18" />
                </button>
              </div>
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-sm font-medium text-ink-700">
                  {l.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" fullWidth>Sign in</Button>
                </Link>
                <Link to="/register" onClick={() => setOpen(false)}>
                  <Button variant="primary" fullWidth>Start learning</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-300/25 bg-paper-0">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4 md:px-8">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-500">
              Your intelligent study companion — for the classroom, the exam room, and everywhere in between.
            </p>
          </div>
          <FooterCol title="Product" items={['AI Tutor', 'Study Materials', 'Past Papers', 'Quiz Engine', 'Study Planner']} />
          <FooterCol title="Learn" items={['Subjects', 'Environmental Engineering', 'Progress Tracking', 'Recommendations']} />
          <FooterCol title="Company" items={['About', 'Contact', 'Privacy', 'Terms']} />
        </div>
        <div className="border-t border-ink-300/25 px-4 py-5 text-center text-xs text-ink-500 md:px-8">
          © {new Date().getFullYear()} Lambert AI. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-950">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((i) => (
          <li key={i} className="text-sm text-ink-500">
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}
