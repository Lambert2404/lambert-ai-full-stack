import { useState } from 'react'
import { cn } from '@/lib/cn'

interface TooltipProps {
  label: string
  children: React.ReactNode
  side?: 'top' | 'bottom'
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-30 w-max max-w-[14rem] -translate-x-1/2 rounded-md bg-ink-950 px-2.5 py-1.5 text-xs text-white shadow-lg',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}
