import React, { useMemo, useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

const fmtEUR = (n: number) =>
  Number(n || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

type Props = {
  /** (Opcional) Controla o mês externamente (YYYY-MM). */
  mes?: string
}

export default function NeedVsWantChart({ mes: mesProp }: Props) {
  const { transacoes } = useFirestore()
  const { items: categories } = useCategories()

  // mês selecionado (YYYY-MM)
  const [mes, setMes] = useState<string>(mesProp ?? new Date().toISOString().slice(0, 7))
  React.useEffect(() => {
    if (mesProp) setMes(mesProp)
  }, [mesProp])

  // Mapas: id -> natureza | slug(nome) -> natureza (fallback)
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

  // Totais do mês por natureza
  const { necessidade, vontade, poupanca, desconhecido, total } = useMemo(() => {
    let nec = 0
    let won = 0
    let sav = 0
    let unk = 0

    for (const t of transacoes) {
      if (t.type !== 'despesa') continue
      const dataKey = String(t.data ?? '').slice(0, 7)
      if (dataKey !== mes) continue

      const valor = Number(t.valor) || 0
      let nature: 'necessidade' | 'vontade' | 'poupanca' | 'desconhecido' = 'desconhecido'

      if (t.categoryId && byId.has(t.categoryId)) {
        const n = byId.get(t.categoryId)
        if (n === 'necessidade' || n === 'vontade' || n === 'poupanca') nature = n
      } else if (t.categoria) {
        const s = slugify(String(t.categoria))
        const n = bySlug.get(s)
        if (n === 'necessidade' || n === 'vontade' || n === 'poupanca') nature = n
      }

      if (nature === 'necessidade') nec += valor
      else if (nature === 'vontade') won += valor
      else if (nature === 'poupanca') sav += valor
      else unk += valor
    }

    return {
      necessidade: nec,
      vontade: won,
      poupanca: sav,
      desconhecido: unk,
      total: nec + won + sav + unk,
    }
  }, [transacoes, mes, byId, bySlug])

  // Dados do gráfico (esconde “Não classificado” se for 0)
  const data = useMemo(() => {
    const d = [
      { name: 'Necessidade', key: 'necessidade', value: necessidade, color: COLORS.necessidade },
      { name: 'Vontade',     key: 'vontade',     value: vontade,     color: COLORS.vontade },
      { name: 'Poupança',    key: 'poupanca',    value: poupanca,    color: COLORS.poupanca },
    ]
    if (desconhecido > 0) {
      d.push({ name: 'Não classificado', key: 'desconhecido', value: desconhecido, color: COLORS.desconhecido })
    }
    return d
  }, [necessidade, vontade, poupanca, desconhecido])

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Necessidade vs. Vontade vs. Poupança</h3>

        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-400">Mês</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border rounded px-2 py-1 bg-transparent"
            aria-label="Selecionar mês"
            disabled={!!mesProp} // read-only quando controlado pelo parent
          />
        </div>
      </header>

      {/* resumo numérico */}
      <div className="grid sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded border border-white/10 p-3">
          <div className="text-neutral-400">Necessidade</div>
          <div className="text-emerald-400 font-semibold">{fmtEUR(necessidade)}</div>
        </div>
        <div className="rounded border border-white/10 p-3">
          <div className="text-neutral-400">Vontade</div>
          <div className="text-amber-300 font-semibold">{fmtEUR(vontade)}</div>
        </div>
        <div className="rounded border border-white/10 p-3">
          <div className="text-neutral-400">Poupança</div>
          <div className="text-blue-300 font-semibold">{fmtEUR(poupanca)}</div>
        </div>
        <div className="rounded border border-white/10 p-3">
          <div className="text-neutral-400">Total (mês)</div>
          <div className="text-neutral-200 font-semibold">{fmtEUR(total)}</div>
        </div>
      </div>

      {/* gráfico */}
      <div className="h-64 w-full rounded border border-white/10 bg-white/5 dark:bg-black/20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-${entry.key}-${idx}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: any, _name, p: any) => [fmtEUR(val as number), p?.payload?.name]}
              contentStyle={{ background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E5E7EB' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* nota para itens “não classificados” */}
      {desconhecido > 0 && (
        <p className="text-xs text-neutral-400">
          <span className="inline-block w-2 h-2 rounded-full align-middle mr-1" style={{ background: COLORS.desconhecido }} />
          <span className="align-middle">
            Existem despesas sem categoria (ou sem natureza definida). Associa-as a uma categoria de despesa para melhorar a análise.
          </span>
        </p>
      )}
    </section>
  )
}