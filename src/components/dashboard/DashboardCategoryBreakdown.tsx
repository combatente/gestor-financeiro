import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Target } from "lucide-react"
import { Card } from "../ui/Card"
import { EmptyState } from "../ui/EmptyState"
import { CustomTooltip } from "./CustomTooltip"
import { eur, PIE_PALETTE } from "./dashboardHelpers"

type Categoria = { name: string; value: number; pct: number }

export function DashboardCategoryBreakdown({ topCategorias }: { topCategorias: Categoria[] }) {
  return (
    <Card>
      <div className="section-header">
        <div className="section-title">Despesas por Categoria</div>
      </div>
      {topCategorias.length === 0 ? (
        <EmptyState icon={Target} title="Sem despesas" description="Nenhuma despesa registada no período." />
      ) : (
        <div className="flex flex-col gap-3">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={topCategorias} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                {topCategorias.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {topCategorias.slice(0, 5).map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs">
                    <span className="truncate text-[rgb(var(--text))] font-medium">{cat.name}</span>
                    <span className="text-[rgb(var(--text-muted))] ml-2">{cat.pct}%</span>
                  </div>
                  <div className="progress-track mt-1">
                    <div className="progress-fill" style={{ width: `${cat.pct}%`, background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-[rgb(var(--text-muted))] w-20 text-right">{eur(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
