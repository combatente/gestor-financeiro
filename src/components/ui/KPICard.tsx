import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type KPIVariant = 'green' | 'red' | 'blue' | 'purple' | 'amber' | 'neutral'

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  variant?: KPIVariant
  delta?: number | null
  deltaLabel?: string
  trendPolicy?: 'upGood' | 'downGood'
  index?: number
}

const variantColors: Record<KPIVariant, { icon: string; iconBg: string }> = {
  green:   { icon: 'text-emerald-400',  iconBg: 'bg-emerald-400/10' },
  red:     { icon: 'text-rose-400',     iconBg: 'bg-rose-400/10' },
  blue:    { icon: 'text-blue-400',     iconBg: 'bg-blue-400/10' },
  purple:  { icon: 'text-purple-400',   iconBg: 'bg-purple-400/10' },
  amber:   { icon: 'text-amber-400',    iconBg: 'bg-amber-400/10' },
  neutral: { icon: 'text-slate-400',    iconBg: 'bg-slate-400/10' },
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'neutral',
  delta,
  trendPolicy = 'upGood',
  index = 0,
}: KPICardProps) {
  const colors = variantColors[variant]

  const isGood = delta === null || delta === undefined
    ? null
    : trendPolicy === 'downGood' ? delta <= 0 : delta >= 0

  const deltaDisplay = delta === null || delta === undefined
    ? null
    : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`

  const trendColor = isGood === null ? 'text-[rgb(var(--text-muted))]'
    : isGood ? 'text-emerald-400' : 'text-rose-400'

  const TrendIcon = isGood === null ? Minus : isGood ? TrendingUp : TrendingDown

  return (
    <motion.div
      className="card p-5 flex flex-col gap-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
          <Icon size={20} className={colors.icon} />
        </div>
        {deltaDisplay !== null && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{deltaDisplay}</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-[rgb(var(--text-muted))] text-xs font-semibold uppercase tracking-wider mb-1">
          {title}
        </div>
        <div className="text-2xl font-bold text-[rgb(var(--text))] leading-tight">
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-[rgb(var(--text-muted))] mt-1">{subtitle}</div>
        )}
      </div>
    </motion.div>
  )
}
