import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react'
import { Card } from '../ui/Card'
import { eur } from './savingsGoalsHelpers'

export type HistoryItem = {
  id: string
  date: Date
  desc: string
  amount: number
  positive: boolean
  goalName: string
}

export function GoalsHistory({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return null

  return (
    <Card>
      <div className="section-header mb-4">
        <div className="section-title">
          <TrendingUp size={16} />
          Histórico de Movimentos
        </div>
      </div>
      <div className="space-y-1">
        {items.slice(0, 12).map(item => (
          <div key={item.id}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.positive
                  ? 'bg-[rgba(var(--pastel-green-bg),0.5)]'
                  : 'bg-[rgba(var(--pastel-red-bg),0.5)]'}`}>
                {item.positive
                  ? <ArrowUpCircle size={14} style={{ color: 'rgb(var(--pastel-green-text))' }} />
                  : <ArrowDownCircle size={14} style={{ color: 'rgb(var(--pastel-red-text))' }} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[rgb(var(--text))] truncate">{item.desc}</p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{item.goalName}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-semibold" style={{
                color: item.positive ? 'rgb(var(--pastel-green-text))' : 'rgb(var(--pastel-red-text))'
              }}>
                {item.positive ? '+' : '−'}{eur(item.amount)}
              </p>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                {item.date.toLocaleDateString('pt-PT')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
