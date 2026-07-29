import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { GoalType } from '../../hooks/useFirestore'

export type AssetClass = 'CASH' | 'STOCKS' | 'ETFS' | 'CRYPTO' | 'RETIREMENT' | 'OTHER'

export const ASSET_CLASS_CONFIG: { [k in AssetClass]: { label: string; icon: string; color: string } } = {
  CASH:       { label: 'Conta Poupança',     icon: '💵', color: '#86efac' },
  STOCKS:     { label: 'Ações',              icon: '📈', color: '#93c5fd' },
  ETFS:       { label: 'ETFs / Fundos',      icon: '🧺', color: '#a78bfa' },
  CRYPTO:     { label: 'Criptomoedas',       icon: '₿',  color: '#fde68a' },
  RETIREMENT: { label: 'PPR / Reforma',      icon: '🏖️', color: '#f9a8d4' },
  OTHER:      { label: 'Outros',             icon: '📦', color: '#fb923c' },
}

export const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

export function normalizeDateInput(s: string): string | null {
  const n = s.replace(/\//g, '-')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null
  if (isNaN(new Date(n).getTime())) return null
  return n
}

export function calcMetrics(goal: GoalType) {
  const target  = goal.targetAmount  || 0
  const current = goal.currentAmount || 0
  const remaining = Math.max(0, target - current)
  const progress  = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const isCompleted = progress >= 100

  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null
  const startDate  = goal.startDate  ? new Date(goal.startDate)  : new Date()

  const daysRemaining = targetDate
    ? Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000))
    : null

  const totalMs   = targetDate ? targetDate.getTime() - startDate.getTime() : 1
  const elapsedMs = Date.now() - startDate.getTime()
  const timeRatio = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0
  const finRatio  = target > 0 ? current / target : 0

  let status: 'ok' | 'late' | 'risk' | 'done' = 'ok'
  if (isCompleted) status = 'done'
  else if (daysRemaining !== null && daysRemaining <= 60 && remaining > 0) status = 'risk'
  else if (finRatio < timeRatio * 0.9) status = 'late'

  const statusMap = {
    ok:   { label: 'No Prazo',   color: 'rgb(var(--pastel-green-text))',  bg: 'rgba(var(--pastel-green-bg),0.5)',  icon: CheckCircle },
    late: { label: 'Atrasado',   color: 'rgb(var(--pastel-amber-text))',  bg: 'rgba(var(--pastel-amber-bg),0.5)',  icon: Clock },
    risk: { label: 'Em Risco',   color: 'rgb(var(--pastel-red-text))',    bg: 'rgba(var(--pastel-red-bg),0.5)',    icon: AlertTriangle },
    done: { label: 'Concluído',  color: 'rgb(var(--pastel-green-text))',  bg: 'rgba(var(--pastel-green-bg),0.5)',  icon: CheckCircle },
  }

  return { progress, isCompleted, remaining, daysRemaining, targetDate, status, statusInfo: statusMap[status] }
}
