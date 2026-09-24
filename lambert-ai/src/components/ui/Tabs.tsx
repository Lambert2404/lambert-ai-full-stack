import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-ink-300/30', className)}>
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-ink-900 text-ink-950'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-paper-100 px-1.5 py-0.5 text-xs text-ink-500">{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
