import type { ModeOption, RangeOption } from "./dashboardHelpers"

type FinancialPeriod = { from: Date } | null

type Props = {
  mode: ModeOption
  onModeChange: (m: ModeOption) => void
  range: RangeOption
  onRangeChange: (r: RangeOption) => void
  month: string
  onMonthChange: (m: string) => void
  financialPeriod: FinancialPeriod
}

export function DashboardFilterBar({ mode, onModeChange, range, onRangeChange, month, onMonthChange, financialPeriod }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl overflow-hidden border border-[rgba(var(--border),var(--border-alpha))]">
        {(["range", "month", "financeiro"] as ModeOption[]).map(m => (
          <button key={m}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand))]"
                : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
            }`}
            onClick={() => onModeChange(m)}
          >
            {m === "range" ? "Período" : m === "month" ? "Mês" : "💰 Financeiro"}
          </button>
        ))}
      </div>
      {mode === "range" && (
        <div className="inline-flex rounded-xl overflow-hidden border border-[rgba(var(--border),var(--border-alpha))]">
          {(["1M", "3M", "6M", "1A", "2A"] as RangeOption[]).map(opt => (
            <button key={opt}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                range === opt
                  ? "bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand))]"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              }`}
              onClick={() => onRangeChange(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {mode === "month" && (
        <input type="month" value={month}
          onChange={e => onMonthChange(e.target.value)}
          className="input w-auto text-sm py-1.5"
        />
      )}
      {mode === "financeiro" && financialPeriod && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--brand))] bg-[rgba(var(--brand),0.08)] px-3 py-1.5 rounded-xl border border-[rgba(var(--brand),0.15)]">
          <span>
            Desde {financialPeriod.from.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })} · último salário
          </span>
        </div>
      )}
      {mode === "financeiro" && !financialPeriod && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
          Sem salário da Accenture detetado nos registos
        </div>
      )}
    </div>
  )
}
