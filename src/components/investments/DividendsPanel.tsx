import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, Coins, Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { CustomTooltip } from '../dashboard/CustomTooltip'
import { eur, type ReceivedDividend, type UpcomingDividend } from './investmentsHelpers'

const axisStyle = { fontSize: 11, fill: 'rgb(var(--text-muted))' } as const

type Props = {
  upcoming: UpcomingDividend[]
  received: ReceivedDividend[]
  monthlySeries: { mes: string; total: number }[]
  onRemoveReceived: (id: string) => void
}

export function DividendsPanel({ upcoming, received, monthlySeries, onRemoveReceived }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <div className="section-header">
          <div className="section-title">Próximos Dividendos</div>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Sem dividendos anunciados" description="Registe um dividendo anunciado para o ver aqui." />
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ dividend, investment, daysUntilPayment }) => (
              <div key={dividend.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-400/10">
                  <Coins size={14} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[rgb(var(--text))] truncate">
                    {investment?.ticker ?? 'Posição removida'}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">
                    Ex-dividendo {dividend.exDividendDate} · Pagamento {dividend.paymentDate}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-[rgb(var(--text))]">
                    {dividend.totalAmount.toFixed(2)} {dividend.currency}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">
                    {daysUntilPayment === 0 ? 'Hoje' : `em ${daysUntilPayment}d`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="section-header">
          <div className="section-title">Dividendos Recebidos (12 meses)</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlySeries} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border),0.08)" />
            <XAxis dataKey="mes" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => eur(v)} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" name="Dividendos" fill="#fde68a" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="lg:col-span-2">
        <div className="section-header">
          <div className="section-title">Histórico de Dividendos Recebidos</div>
        </div>
        {received.length === 0 ? (
          <EmptyState icon={Coins} title="Sem dividendos recebidos" description="Os dividendos marcados como 'Recebido' aparecem aqui." />
        ) : (
          <div className="space-y-2">
            {received.map(({ dividend, investment }) => (
              <div key={dividend.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-400/10">
                  <Coins size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[rgb(var(--text))] truncate">
                    {investment?.ticker ?? 'Posição removida'}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">Pagamento {dividend.paymentDate}</div>
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  +{dividend.totalAmount.toFixed(2)} {dividend.currency}
                </div>
                <button className="btn btn-ghost btn-sm text-rose-400" onClick={() => onRemoveReceived(dividend.id)} aria-label="Remover dividendo">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
