import { PiggyBank } from 'lucide-react'
import { Card } from '../ui/Card'
import { ASSET_CLASS_CONFIG, eur, type AssetClass } from './savingsGoalsHelpers'

type Props = {
  totalInvested: number
  goalsCount: number
  distribution: [AssetClass, number][]
}

export function GoalsSummary({ totalInvested, goalsCount, distribution }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="flex flex-col gap-3 kpi-green">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(var(--pastel-green-bg),0.8)' }}>
            <PiggyBank size={16} style={{ color: 'rgb(var(--pastel-green-text))' }} />
          </div>
          <span className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
            Total Poupado
          </span>
        </div>
        <div className="text-2xl font-bold" style={{ color: 'rgb(var(--pastel-green-text))' }}>
          {eur(totalInvested)}
        </div>
        <div className="text-xs text-[rgb(var(--text-muted))]">{goalsCount} metas ativas</div>
      </Card>

      <Card className="md:col-span-2">
        <p className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
          Distribuição por Classe de Ativo
        </p>
        {distribution.length === 0 ? (
          <p className="text-xs text-[rgb(var(--text-muted))] italic">Nenhuma distribuição registada.</p>
        ) : (
          <div className="space-y-2">
            {distribution.map(([ac, amt]) => {
              const cfg = ASSET_CLASS_CONFIG[ac]
              const pct = totalInvested > 0 ? (amt / totalInvested) * 100 : 0
              return (
                <div key={ac} className="flex items-center gap-3">
                  <span className="text-base w-5 flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-[rgb(var(--text-muted))] truncate">{cfg.label}</span>
                      <span className="font-medium text-[rgb(var(--text))] ml-2 flex-shrink-0">
                        {eur(amt)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(var(--border),0.12)' }}>
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
