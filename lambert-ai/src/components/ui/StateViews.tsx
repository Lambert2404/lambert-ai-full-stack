import { Button } from './Button'

interface StateProps {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  icon?: React.ReactNode
}

function StateShell({ title, description, action, icon }: StateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-300/50 bg-paper-0 px-6 py-12 text-center">
      {icon}
      <div>
        <p className="text-base font-semibold text-ink-950">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function EmptyState(props: StateProps) {
  return <StateShell {...props} />
}

export function ErrorState({
  description = "Lambert AI couldn't process your request right now. Please try again.",
  onRetry,
}: {
  description?: string
  onRetry?: () => void
}) {
  return (
    <StateShell
      title="Something went wrong"
      description={description}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  )
}

export function UnauthorizedState() {
  return (
    <StateShell
      title="You don't have access to this page"
      description="Sign in with an account that has permission to view this content."
    />
  )
}

/**
 * Shown when a page's data depends on a backend endpoint that hasn't been
 * implemented yet. This is an honest development state — never fabricated data.
 */
export function BackendPendingState({ endpoint }: { endpoint: string }) {
  return (
    <StateShell
      title="Not connected to the backend yet"
      description={`This screen is ready for the Lambert AI backend. Once ${endpoint} is live, this view will populate automatically.`}
    />
  )
}
