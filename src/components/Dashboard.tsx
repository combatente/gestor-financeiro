import { motion } from "framer-motion"
import { useState, useMemo } from "react"
import { useFirestore } from "../hooks/useFirestore"
import TopCategoriasDespesas from "../components/TopCategoriasDespesas"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts"
import type { Transacao } from "../types"

// ---------- Utils ----------
const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })

const percent = (parte: number, total: number) => {
  if (!total || !Number.isFinite(parte) || !Number.isFinite(total)) return "—"
  return `${Math.round((parte / total) * 100)}%`
}

function movingAverage(values: number[], window = 3) {
  if (!values?.length) return []
  const out: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      out.push(null)
      continue
    }
    const slice = values.slice(i - window + 1, i + 1)
    const sum = slice.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
    out.push(sum / slice.length)
  }
  return out
}

// ---------- Component ----------
export default function Dashboard() {
  const { transacoes, totais, saldo, dadosGraficoTempo } = useFirestore()
  const [meses, setMeses] = useState<3 | 6 | 12>(6)
  const [metaPoupanca, setMetaPoupanca] = useState<number>(500)

  // ⚠️ NÃO PODE HAVER return condicional antes dos hooks → removido
  const transacoesExistem = !!transacoes?.length

  // ---- Série temporal ----
  const serieBruta = useMemo(() => {
    return (dadosGraficoTempo?.() ?? []).map((d: any) => ({
      mes: String(d?.mes ?? ""),
      receitas: Number.isFinite(+d?.receitas) ? +d.receitas : 0,
      despesas: Number.isFinite(+d?.despesas) ? +d.despesas : 0,
    }))
  }, [dadosGraficoTempo])

  const serie = useMemo(() => {
    const s = Array.isArray(serieBruta) ? [...serieBruta] : []
    const start = Math.max(0, s.length - meses)
    return s.slice(start)
  }, [serieBruta, meses])

  const mediaReceitas = useMemo(
    () => movingAverage(serie.map((d) => d.receitas), 3),
    [serie]
  )

  const mediaDespesas = useMemo(
    () => movingAverage(serie.map((d) => d.despesas), 3),
    [serie]
  )

  const serieAug = useMemo(
    () =>
      serie.map((d, i) => ({
        ...d,
        mm_r: mediaReceitas[i],
        mm_d: mediaDespesas[i],
      })),
    [serie, mediaReceitas, mediaDespesas]
  )

  const picoDespesas = useMemo(() => {
    let idx = -1
    let max = -Infinity
    serie.forEach((d, i) => {
      if (Number.isFinite(d.despesas) && d.despesas > max) {
        max = d.despesas
        idx = i
      }
    })
    return idx >= 0 && Number.isFinite(serie[idx]?.despesas)
      ? { x: serie[idx].mes, y: serie[idx].despesas }
      : null
  }, [serie])

  // indicadores
  const despesasSobreReceitas = percent(totais?.despesas ?? 0, totais?.receitas ?? 0)
  const poupancasSobreReceitas = percent(totais?.poupancas ?? 0, totais?.receitas ?? 0)

  const progressoPoupanca = useMemo(
    () =>
      Math.max(
        0,
        Math.min(
          100,
          metaPoupanca > 0
            ? Math.round(((totais?.poupancas ?? 0) / metaPoupanca) * 100)
            : 0
        )
      ),
    [metaPoupanca, totais]
  )

  const dataMin = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - meses)
    return d.toISOString().slice(0, 10)
  }, [meses])

  const transacoesCompat = useMemo<Transacao[]>(() => {
    return (transacoes ?? []).map((t: any) => ({
      ...t,
      descricao: t?.descricao ?? undefined,
    })) as Transacao[]
  }, [transacoes])

  // ---------- RENDER ----------
  if (!transacoesExistem) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-slate-500 text-lg">Ainda não há transações</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="💵 Receitas" value={totais?.receitas ?? 0} color="green" />
        <StatCard title="💸 Despesas" value={totais?.despesas ?? 0} color="red" />
        <StatCard title="📋 Dívidas" value={totais?.dividas ?? 0} color="orange" />
        <StatCard title="🏦 Poupanças" value={totais?.poupancas ?? 0} color="blue" />
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IndicatorChip
          label="Despesas / Receitas"
          value={despesasSobreReceitas}
          tone="red"
          hint={`${eur(totais?.despesas ?? 0)} de ${eur(totais?.receitas ?? 0)}`}
        />
        <IndicatorChip
          label="Poupanças / Receitas"
          value={poupancasSobreReceitas}
          tone="blue"
          hint={`${eur(totais?.poupancas ?? 0)} de ${eur(totais?.receitas ?? 0)}`}
        />
      </div>

      {/* Saldo */}
      <div
        className={`p-4 rounded-lg border ${
          (saldo ?? 0) >= 0
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
        <div className="text-sm font-semibold flex items-center gap-2">
          {(saldo ?? 0) >= 0 ? "Saldo Atual" : "⚠️ Saldo Negativo"}
        </div>
        <div className="text-3xl font-bold mt-1">{eur(saldo ?? 0)}</div>
      </div>

      {/* Evolução */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">📈 Evolução</h3>

          <div className="inline-flex rounded-md overflow-hidden border">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMeses(m as 3 | 6 | 12)}
                className={`px-3 py-1 text-sm ${
                  meses === m ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={serieAug}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(v: any) => eur(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="receitas" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="despesas" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />

            {/* Médias móveis */}
            <Line
              type="monotone"
              dataKey="mm_r"
              stroke="#86efac"
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="mm_d"
              stroke="#fca5a5"
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />

            {picoDespesas && (
              <ReferenceDot
                x={picoDespesas.x}
                y={picoDespesas.y}
                r={5}
                fill="#dc2626"
                label={{ value: "Pico despesas", fill: "#dc2626", position: "top" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top categorias */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="font-bold mb-3 text-slate-800 dark:text-slate-100">
          🏷️ Despesas por categoria (Top 5)
        </h3>
        <TopCategoriasDespesas transacoes={transacoesCompat} dataMin={dataMin} />
      </div>

      {/* Meta poupança */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">🎯 Meta de poupança</h3>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {eur(totais?.poupancas ?? 0)} / {eur(metaPoupanca)} ({progressoPoupanca}%)
          </div>
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${
              progressoPoupanca >= 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressoPoupanca}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600 dark:text-slate-300">Alterar meta:</label>
          <input
            type="number"
            min={0}
            className="px-2 py-1 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 w-28"
            value={metaPoupanca}
            onChange={(e) => setMetaPoupanca(Number(e.target.value))}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ---------- Subcomponentes ----------
function StatCard({ title, value, color }: {
  title: string
  value: number
  color: "green" | "red" | "orange" | "blue"
}) {
  const map: Record<string, string> = {
    green: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  }

  return (
    <div className={`p-4 rounded-lg ${map[color]} border dark:border-white/10`}>
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="text-2xl font-bold">{eur(value)}</div>
    </div>
  )
}

function IndicatorChip({ label, value, hint, tone = "slate" }: {
  label: string
  value: string | number
  hint?: string
  tone?: "red" | "blue" | "slate"
}) {
  const tones: Record<string, string> = {
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  }

  return (
    <div className={`p-3 rounded-lg ${tones[tone]} border dark:border-white/10`}>
      <div className="text-xs uppercase opacity-80">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {hint && <div className="text-xs opacity-80">{hint}</div>}
    </div>
  )
}
