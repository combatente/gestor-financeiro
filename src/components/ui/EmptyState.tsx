import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="p-4 rounded-2xl bg-[rgb(var(--surface-2))] mb-4">
        <Icon size={32} className="text-[rgb(var(--text-muted))]" />
      </div>
      <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[rgb(var(--text-muted))] max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
