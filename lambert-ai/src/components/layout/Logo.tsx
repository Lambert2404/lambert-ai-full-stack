import { cn } from '@/lib/cn'

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-900 font-serif text-sm font-semibold text-gold-500">
        L
      </span>
      {withWordmark && <span className="font-serif text-lg font-semibold tracking-tight text-ink-950">Lambert AI</span>}
    </span>
  )
}

export function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={path} />
    </svg>
  )
}
