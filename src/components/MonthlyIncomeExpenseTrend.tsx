// src/components/MonthlyIncomeExpenseTrend.tsx
import { useMemo, useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

type DayPoint = {
  dia: string   // '01', '02', ...
  date: string  // 'YYYY-MM-DD'
  receitas: number
  despesas: number
  saldo: number // receitas - despesas (diário ou acumulado, conforme o modo)
}

/** Lista os dias de um mês YYYY-MM com padding '01'..'DD' */
function listDaysOfMonth(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number)
  const days = new Date(y, (m ?? 1), 0).getDate()
  return Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0'))
}

function fmtEUR(n: number) {
  return Number(n || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default function MonthlyIncomeExpenseTrend({ mes }: { mes: string }) {
  const { transacoes } = useFirestore()
  const [accMode, setAccMode] = useState<'diario' | 'acumulado'>('diario')

  const data: DayPoint[] = useMemo(() => {
    const days = listDaysOfMonth(mes)
    const base = days.map<DayPoint>((d) => ({
      dia: d,
      date: `${mes}-${d}`,
      receitas: 0,
      despesas: 0,
      saldo: 0,
    }))

    // índice rápido por 'YYYY-MM-DD'
    const idxByDate = new Map<string, number>()
    base.forEach((row, i) => idxByDate.set(row.date, i))

    for (const t of transacoes) {
      const dateStr = String(t.data ?? '')
      if (!dateStr.startsWith(mes)) continue
      const idx = idxByDate.get(dateStr)
      if (idx === undefined) continue

      const v = Number(t.valor) || 0
      if (t.type === 'receita') base[idx].receitas += v
      else if (t.type === 'despesa') base[idx].despesas += v
    }

    if (accMode === 'acumulado') {
      let rAcc = 0
      let dAcc = 0
      for (const row of base) {
        rAcc += row.receitas
        dAcc += row.despesas
        row.saldo = rAcc - dAcc
        row.receitas = rAcc
        row.despesas = dAcc
      }
    } else {
      for (const row of base) {
        row.saldo = row.receitas - row.despesas
      }
    }

    return base
  }, [transacoes, mes, accMode])

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">
          📈 Evolução no mês: Receitas vs Despesas ({accMode === 'diario' ? 'Diário' : 'Acumulado'})
        </h3>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={accMode === 'acumulado'}
              onChange={(e) => setAccMode(e.target.checked ? 'acumulado' : 'diario')}
            />
            Mostrar como acumulado
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dia" />
          <YAxis tickFormatter={(v) => fmtEUR(v as number)} width={80} />
          <Tooltip
            formatter={(val: any, name: any) => [fmtEUR(val as number), name]}
            labelFormatter={(lbl: any, p: any) => {
              const dt = p?.[0]?.payload?.date ?? ''
              return `Dia: ${lbl} (${dt})`
            }}
            contentStyle={{
              background: 'rgba(17,24,39,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: '#E5E7EB',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="despesas"
            stroke="#ef4444"
            strokeWidth={2}
            name="Despesas"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="receitas"
            stroke="#22c55e"
            strokeWidth={2}
            name="Receitas"
            dot={false}
            activeDot={{ r: 4 }}
          />
          {/* Se também quiseres a linha de saldo, descomenta: */}
          {/* <Line
            type="monotone"
            dataKey="saldo"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Saldo"
            dot={false}
          /> */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}