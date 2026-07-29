import { Card } from "../ui/Card"
import { eur, pct } from "./dashboardHelpers"

type Item = { name: string; value: number; fill: string }

export function DashboardDistribution({ distNWS }: { distNWS: Item[] }) {
  const totalGasto = distNWS.reduce((s, i) => s + i.value, 0)

  return (
    <Card>
      <div className="section-header">
        <div className="section-title">Regra 50/30/20 — Distribuição Real</div>
      </div>
      <div className="space-y-4">
        {distNWS.map((item) => {
          const p = pct(item.value, totalGasto || 1)
          return (
            <div key={item.name}>
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-medium text-[rgb(var(--text))]">{item.name}</span>
                <span className="text-[rgb(var(--text-muted))]">{p}% · {eur(item.value)}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${p}%`, background: item.fill }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 p-3 rounded-xl text-xs text-[rgb(var(--text-muted))] bg-[rgba(var(--surface-2),0.5)]">
        A regra 50/30/20 recomenda: 50% necessidades · 30% vontades · 20% poupança
      </div>
    </Card>
  )
}
