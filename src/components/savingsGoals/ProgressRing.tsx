export function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 32, circ = 2 * Math.PI * r
  return (
    <svg width="80" height="80" className="-rotate-90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(var(--border),0.12)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  )
}
