import { Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { LineChart } from 'lucide-react'
import type { DividendType, InvestmentType } from '../../hooks/useFirestore'
import { ASSET_TYPE_CONFIG, PLATFORM_CONFIG, dividendYieldOnCost, eur, positionMetrics } from './investmentsHelpers'

type Props = {
  investments: InvestmentType[]
  dividends: DividendType[]
  usdToEur: number
  onRemove: (id: string) => void
}

export function InvestmentsTable({ investments, dividends, usdToEur, onRemove }: Props) {
  return (
    <Card>
      <div className="section-header">
        <div className="section-title">Posições</div>
      </div>
      {investments.length === 0 ? (
        <EmptyState icon={LineChart} title="Sem posições" description="Adicione a sua primeira posição de ações, ETFs ou criptomoedas." />
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <th className="px-2 py-2 font-semibold">Ticker</th>
                <th className="px-2 py-2 font-semibold">Plataforma</th>
                <th className="px-2 py-2 font-semibold text-right">Qtd.</th>
                <th className="px-2 py-2 font-semibold text-right">P. Médio</th>
                <th className="px-2 py-2 font-semibold text-right">Cotação</th>
                <th className="px-2 py-2 font-semibold text-right">Valor (€)</th>
                <th className="px-2 py-2 font-semibold text-right">P/L</th>
                <th className="px-2 py-2 font-semibold text-right">Yield</th>
                <th className="px-2 py-2 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => {
                const m = positionMetrics(inv, usdToEur)
                const yieldOnCost = dividendYieldOnCost(inv, dividends, usdToEur)
                const assetCfg = ASSET_TYPE_CONFIG[inv.assetType]
                return (
                  <tr key={inv.id} className="border-t border-[rgba(var(--border),var(--border-alpha))]">
                    <td className="px-2 py-2.5">
                      <div className="font-semibold text-[rgb(var(--text))]">{inv.ticker}</div>
                      <div className="text-xs text-[rgb(var(--text-muted))] truncate max-w-[160px]">
                        {assetCfg.icon} {inv.name}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-[rgb(var(--text-muted))]">
                      {PLATFORM_CONFIG[inv.platform].label}
                    </td>
                    <td className="px-2 py-2.5 text-right text-[rgb(var(--text))]">{inv.quantity}</td>
                    <td className="px-2 py-2.5 text-right text-[rgb(var(--text-muted))]">
                      {inv.avgCost.toFixed(2)} {inv.currency}
                    </td>
                    <td className="px-2 py-2.5 text-right text-[rgb(var(--text-muted))]">
                      {inv.currentPrice.toFixed(2)} {inv.currency}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-[rgb(var(--text))]">
                      {eur(m.marketValueEur)}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-semibold ${m.plAbsEur >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {m.plAbsEur >= 0 ? '+' : ''}{eur(m.plAbsEur)}
                      <div className="text-xs font-normal">{m.plPct >= 0 ? '+' : ''}{m.plPct.toFixed(1)}%</div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-[rgb(var(--text-muted))]">
                      {assetCfg.label === ASSET_TYPE_CONFIG.CRYPTO.label ? '—' : `${yieldOnCost.toFixed(1)}%`}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button className="btn btn-ghost btn-sm text-rose-400" onClick={() => onRemove(inv.id)} aria-label="Remover">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
