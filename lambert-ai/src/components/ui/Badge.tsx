import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'gold' | 'emerald' | 'crimson' | 'sky'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-paper-100 text-ink-700',
  gold: 'bg-gold-100 text-gold-600',
  emerald: 'bg-emerald-100 text-emerald-700',
  crimson: 'bg-crimson-100 text-crimson-600',
  sky: 'bg-sky-100 text-sky-600',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}
