import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { PieChart as PieIcon } from 'lucide-react'
import { CustomTooltip } from '../dashboard/CustomTooltip'
import { PIE_PALETTE } from '../dashboard/dashboardHelpers'
import { eur } from './investmentsHelpers'

type Slice = { name: string; value: number; color?: string }

function AllocationDonut({ title, slices }: { title: string; slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0)

  return (
    <Card>
      <div className="section-header">
        <div className="section-title">{title}</div>
      </div>
      {slices.length === 0 ? (
        <EmptyState icon={PieIcon} title="Sem dados" description="Adicione posições para ver a distribuição." />
      ) : (
        <div className="flex flex-col gap-3">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={44} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
                {slices.map((s, i) => <Cell key={s.name} fill={s.color ?? PIE_PALETTE[i % PIE_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {slices.map((s, i) => {
              const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
              return (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color ?? PIE_PALETTE[i % PIE_PALETTE.length] }} />
                  <span className="flex-1 truncate text-[rgb(var(--text))] font-medium">{s.name}</span>
                  <span className="text-[rgb(var(--text-muted))]">{pct}%</span>
                  <span className="font-semibold text-[rgb(var(--text-muted))] w-20 text-right">{eur(s.value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

type Props = {
  byPlatform: Slice[]
  byAssetType: Slice[]
  byCurrency: Slice[]
}

export function InvestmentsAllocationCharts({ byPlatform, byAssetType, byCurrency }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <AllocationDonut title="Por Plataforma" slices={byPlatform} />
      <AllocationDonut title="Por Tipo de Ativo" slices={byAssetType} />
      <AllocationDonut title="Por Moeda" slices={byCurrency} />
    </div>
  )
}
