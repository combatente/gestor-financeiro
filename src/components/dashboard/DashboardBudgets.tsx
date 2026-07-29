import { Card } from "../ui/Card"
import { EmptyState } from "../ui/EmptyState"
import { Target } from "lucide-react"
import { eur } from "./dashboardHelpers"

type Budget = { catName: string; gasto: number; limite: number; percentUsed: number }

type Props = {
  budgetsThisMonth: Budget[]
  currentMonth: string
}

export function DashboardBudgets({ budgetsThisMonth, currentMonth }: Props) {
  return (
    <Card>
      <div className="section-header">
        <div className="section-title">Orçamentos — {currentMonth}</div>
      </div>
      {budgetsThisMonth.length === 0 ? (
        <EmptyState icon={Target} title="Sem orçamentos" description="Defina orçamentos em Orçamentos para ver o progresso." />
      ) : (
        <div className="space-y-3">
          {budgetsThisMonth.slice(0, 6).map((b) => {
            const color = b.percentUsed >= 100 ? "#fca5a5" : b.percentUsed >= 80 ? "#fde68a" : "#86efac"
            return (
              <div key={b.catName}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium text-[rgb(var(--text))] truncate">{b.catName}</span>
                  <span className="text-[rgb(var(--text-muted))] text-xs ml-2 flex-shrink-0">
                    {eur(b.gasto)} / {eur(b.limite)}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(100, b.percentUsed)}%`, background: color }} />
                </div>
                {b.percentUsed >= 100 && (
                  <div className="text-xs text-rose-400 mt-0.5">⚠ Limite ultrapassado em {eur(b.gasto - b.limite)}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
