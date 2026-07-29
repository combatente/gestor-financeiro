import { motion } from 'framer-motion'
import { ArrowDownCircle, ArrowUpCircle, Calendar } from 'lucide-react'
import type { GoalType } from '../../hooks/useFirestore'
import { ProgressRing } from './ProgressRing'
import { ASSET_CLASS_CONFIG, calcMetrics, eur, type AssetClass } from './savingsGoalsHelpers'

type Props = {
  goal: GoalType
  index: number
  inputValue: string
  saving: boolean
  onInputChange: (value: string) => void
  onTransaction: (type: 'in' | 'out') => void
}

export function GoalCard({ goal, index, inputValue, saving, onInputChange, onTransaction }: Props) {
  const m = calcMetrics(goal)
  const cfg = ASSET_CLASS_CONFIG[goal.assetClass as AssetClass] ?? ASSET_CLASS_CONFIG.OTHER
  const StatusIcon = m.statusInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-[rgb(var(--text))] truncate">{goal.name}</h3>
          {goal.description && (
            <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <span className="text-xl flex-shrink-0">{cfg.icon}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${cfg.color}22`, color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: m.statusInfo.bg, color: m.statusInfo.color }}>
          <StatusIcon size={10} />
          {m.statusInfo.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0 w-20 h-20">
          <ProgressRing pct={m.progress} color={cfg.color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-[rgb(var(--text))]">{m.progress.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[rgb(var(--text-muted))]">Atual</span>
            <span className="font-semibold" style={{ color: cfg.color }}>{eur(goal.currentAmount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[rgb(var(--text-muted))]">Objetivo</span>
            <span className="font-medium text-[rgb(var(--text))]">{eur(goal.targetAmount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[rgb(var(--text-muted))]">Falta</span>
            <span className="font-medium text-[rgb(var(--text))]">{eur(m.remaining)}</span>
          </div>
          {m.daysRemaining !== null && (
            <div className="flex justify-between">
              <span className="text-[rgb(var(--text-muted))]">Prazo</span>
              <span className="flex items-center gap-1 font-medium text-[rgb(var(--pastel-amber-text))]">
                <Calendar size={11} />
                {m.daysRemaining}d
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[rgba(var(--border),var(--border-alpha))] pt-3 space-y-2">
        <p className="text-xs font-medium text-[rgb(var(--text-muted))]">Movimento</p>
        <div className="flex gap-2">
          <input type="number" min="0" step="0.01" placeholder="€"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            className="input text-sm py-1.5 flex-1 min-w-0" />
          <button disabled={!inputValue || Number(inputValue) <= 0 || saving}
            onClick={() => onTransaction('in')}
            className="btn btn-sm flex-shrink-0"
            style={{ background: 'rgba(var(--pastel-green-bg),0.6)', color: 'rgb(var(--pastel-green-text))' }}>
            <ArrowUpCircle size={14} />
          </button>
          <button
            disabled={!inputValue || Number(inputValue) <= 0 || Number(inputValue) > (goal.currentAmount || 0) || saving}
            onClick={() => onTransaction('out')}
            className="btn btn-sm flex-shrink-0"
            style={{ background: 'rgba(var(--pastel-red-bg),0.6)', color: 'rgb(var(--pastel-red-text))' }}>
            <ArrowDownCircle size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
