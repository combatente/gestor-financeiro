// src/components/BudgetBar.tsx
export function BudgetBar({
  value,   // gasto atual
  max,     // limite do orçamento
  showMarkers = true,
  className = '',
  ariaLabel,
}: {
  value: number
  max: number
  showMarkers?: boolean
  className?: string
  ariaLabel?: string
}) {
  const safeMax = Math.max(0, Number(max) || 0)
  const safeVal = Math.max(0, Number(value) || 0)
  const pctRaw = safeMax > 0 ? (safeVal / safeMax) * 100 : 0
  const pct = Math.max(0, Math.min(100, pctRaw))

  // Cores por limiar
  const color =
    pctRaw < 70 ? 'bg-emerald-600'
    : pctRaw < 90 ? 'bg-amber-500'
    : pctRaw < 100 ? 'bg-orange-600'
    : 'bg-red-600'

  return (
    <div
      className={`relative h-3 w-full rounded-full bg-white/10 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(100, pctRaw))}
      aria-label={ariaLabel}
      title={`${Math.round(pctRaw)}%`}
    >
      <div
        className={`h-full ${color} transition-[width] duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
      {showMarkers && (
        <>
          {/* 80% marker */}
          <div className="absolute inset-y-0 left-[80%] w-px bg-white/40 pointer-events-none" />
          {/* 100% marker (bordo direito) */}
          <div className="absolute inset-y-0 right-0 w-px bg-white/60 pointer-events-none" />
        </>
      )}
    </div>
  )
}