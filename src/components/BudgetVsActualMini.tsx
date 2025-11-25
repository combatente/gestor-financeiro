import { useMemo } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'
import { useBudgetAllocation } from '../hooks/useBudgetAllocation'
import {
  computeMonthlyIncome,
  computeSpendByNature,
  computeTargetsEUR,
} from '../utils/budgetTargets'

type Props = {
  mes: string        // 'YYYY-MM'
  userId?: string    // opcional, se quiseres usar uid específico no hook de alocação
}

const COLORS = {
  necessidade: '#059669', // emerald-600
  vontade: '#F59E0B',     // amber-500
  poupanca: '#3B82F6',    // blue-500
}

const fmtEUR = (n: number) =>
  Number(n || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

export default function BudgetVsActualMini({ mes, userId }: Props) {
  const { transacoes } = useFirestore()
  const { items: categories } = useCategories()
  const { value: alloc } = useBudgetAllocation(mes, userId)

  const income = useMemo(() => computeMonthlyIncome(transacoes, mes), [transacoes, mes])
  const exec = useMemo(() => computeSpendByNature(transacoes, categories, mes), [transacoes, categories, mes])
  const targets = useMemo(() => computeTargetsEUR(income, alloc), [income, alloc])

  const rows = [
    { key: 'necessidade', label: 'Necessidade', color: COLORS.necessidade },
    { key: 'vontade',     label: 'Vontade',     color: COLORS.vontade },
    { key: 'poupanca',    label: 'Poupança',    color: COLORS.poupanca },
  ] as const

  return (
    <section className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        {rows.map((r) => {
          const actual = exec[r.key]
          const target = targets[r.key]
          const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
          return (
            <div key={r.key} className="rounded border border-white/10 p-3">
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: r.color }}>{r.label}</span>
                <span>
                  {fmtEUR(actual)} / {fmtEUR(target)} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded bg-white/10 overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: r.color }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-neutral-400">
        Base de orçamento: receita do mês {mes} = {fmtEUR(income)}.
      </div>
    </section>
  )
}