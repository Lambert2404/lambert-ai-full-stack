import { EmptyState } from '@/components/ui/StateViews'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * Consistent placeholder for a route that has its layout/navigation wired up
 * but whose full feature build is still in progress. Never shows invented data.
 */
export function ScaffoldPage({ title, description, note }: { title: string; description: string; note?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="This screen is being built"
        description={note ?? 'The layout, routing and data contract for this page are ready. Full functionality is next in the build queue.'}
      />
    </div>
  )
}
