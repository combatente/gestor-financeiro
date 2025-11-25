import React, { useMemo, useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = {
  necessidade: '#059669',   // emerald-600
  vontade: '#F59E0B',       // amber-500
  poupanca: '#3B82F6',      // blue-500
  desconhecido: '#94A3B8',  // slate-400
}

// slug simples (fallback quando não há categoryId)
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// devolve array ascendente de 'YYYY-MM' com 'count' meses, terminando em endYM
function lastMonths(endYM: string, count = 6) {
  const [yy, mm] = endYM.split('-').map(Number)
  const out: string[] = []
  const d = new Date(yy, (mm ?? 1) - 1, 1)
  d.setHours(0, 0, 0, 0)
  // gerar do mais antigo → mais recente
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(d)
    t.setMonth(d.getMonth() - i)
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, '0')
    out.push(`${y}-${m}`)
  }
  return out
}

const fmtEUR = (n: number) =>
  Number(n || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

type Props = {
  /** (Opcional) Controla o mês final externamente (YYYY-MM). */
  endMonth?: string
}

export default function NeedVsWantTrend({ endMonth: endMonthProp }: Props) {
  const { transacoes } = useFirestore()
  const { items: categories } = useCategories()

  // mês final (YYYY-MM)
  const [endMonth, setEndMonth] = useState<string>(
    endMonthProp ?? new Date().toISOString().slice(0, 7)
  )
  // sincroniza com a prop (se vier controlado)
  React.useEffect(() => {
    if (endMonthProp) setEndMonth(endMonthProp)
  }, [endMonthProp])

  const [showUnknown, setShowUnknown] = useState<boolean>(true)

  // Mapas para natureza por id e por slug(nome) — fallback
  const { byId, bySlug } = useMemo(() => {
    const idMap = new Map<string, 'necessidade' | 'vontade' | 'poupanca' | null>()
    const slugMap = new Map<string, 'necessidade' | 'vontade' | 'poupanca' | null>()
    for (const c of categories) {
      const nature =
        c.type === 'despesa' ? (c.spendNature ?? 'necessidade') : null
      if (c.id) idMap.set(c.id, nature)
      if (c.name) slugMap.set(slugify(c.name), nature)
    }
    return { byId: idMap, bySlug: slugMap }
  }, [categories])

  // Série mensal (últimos 6 meses até endMonth)
  const data = useMemo(() => {
    const months = lastMonths(endMonth, 6)
    // acumular por mês
    const acc = months.map((ym) => ({
      ym,
      necessidade: 0,
      vontade: 0,
      poupanca: 0,
      desconhecido: 0,
      total: 0,
    }))

    // índice rápido por ym
    const idxByYm = new Map<string, number>()
    months.forEach((ym, i) => idxByYm.set(ym, i))

    for (const t of transacoes) {
      if (t.type !== 'despesa') continue
      const ym = String(t.data ?? '').slice(0, 7)
      const idx = idxByYm.get(ym)
      if (idx === undefined) continue

      const valor = Number(t.valor) || 0
      let nature: 'necessidade' | 'vontade' | 'poupanca' | 'desconhecido' = 'desconhecido'

      if (t.categoryId && byId.has(t.categoryId)) {
        const n = byId.get(t.categoryId)
        if (n === 'necessidade' || n === 'vontade' || n === 'poupanca') nature = n
      } else if (t.categoria) {
        const n = bySlug.get(slugify(String(t.categoria)))
        if (n === 'necessidade' || n === 'vontade' || n === 'poupanca') nature = n
      }

      acc[idx][nature] += valor
      acc[idx].total += valor
    }

    // transformar para labels “MMM/YY”
    const fmtLabel = (ym: string) => {
      const [y, m] = ym.split('-').map(Number)
      const d = new Date(y, (m ?? 1) - 1, 1)
      // ex.: "out/25"
      const mon = d.toLocaleString('pt-PT', { month: 'short' })
      return `${mon}/${String(y).slice(-2)}`
    }

    return acc.map((r) => ({
      mes: fmtLabel(r.ym),
      ym: r.ym,
      necessidade: r.necessidade,
      vontade: r.vontade,
      poupanca: r.poupanca,
      desconhecido: r.desconhecido,
      total: r.total,
    }))
  }, [transacoes, endMonth, byId, bySlug])

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Evolução: Necessidade vs. Vontade vs. Poupança (6 meses)</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-400">Mês final</label>
          <input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="border rounded px-2 py-1 bg-transparent"
            disabled={!!endMonthProp} // read-only quando controlado pelo parent
          />
          <label className="text-sm inline-flex items-center gap-2 text-neutral-400">
            <input
              type="checkbox"
              checked={showUnknown}
              onChange={(e) => setShowUnknown(e.target.checked)}
            />
            Incluir "Não classificado"
          </label>
        </div>
      </header>

      <div className="h-72 w-full rounded border border-white/10 bg-white/5 dark:bg-black/20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(v) => fmtEUR(v as number)} width={90} />
            <Tooltip
              formatter={(val: any, name: any) => [fmtEUR(val as number), name]}
              labelFormatter={(lbl: any, p: any) => {
                const ym = p?.[0]?.payload?.ym ?? ''
                return `Mês: ${lbl} (${ym})`
              }}
              contentStyle={{
                background: 'rgba(17,24,39,0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: '#E5E7EB',
              }}
            />
            <Legend />
            <Bar name="Necessidade" dataKey="necessidade" stackId="a" fill={COLORS.necessidade} />
            <Bar name="Vontade" dataKey="vontade" stackId="a" fill={COLORS.vontade} />
            <Bar name="Poupança" dataKey="poupanca" stackId="a" fill={COLORS.poupanca} />
            {showUnknown && (
              <Bar
                name="Não classificado"
                dataKey="desconhecido"
                stackId="a"
                fill={COLORS.desconhecido}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}