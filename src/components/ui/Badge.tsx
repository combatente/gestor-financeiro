import type { ReactNode } from 'react'

type BadgeVariant = 'green' | 'red' | 'blue' | 'purple' | 'amber' | 'neutral'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  )
}

export function TransactionBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    receita:     { label: 'Receita',      variant: 'green' },
    despesa:     { label: 'Despesa',      variant: 'red' },
    poupanca:    { label: 'Poupança',     variant: 'blue' },
    divida:      { label: 'Dívida',       variant: 'amber' },
    transferencia: { label: 'Transferência', variant: 'purple' },
  }
  const info = map[type] ?? { label: type, variant: 'neutral' as BadgeVariant }
  return <Badge variant={info.variant}>{info.label}</Badge>
}
