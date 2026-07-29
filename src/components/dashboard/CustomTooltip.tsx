import { eur } from "./dashboardHelpers"

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card p-3 text-sm shadow-xl min-w-[160px]">
      <div className="font-semibold text-[rgb(var(--text))] mb-2">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
          <span className="text-[rgb(var(--text))] font-semibold">{eur(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}
