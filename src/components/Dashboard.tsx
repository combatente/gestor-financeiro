import { useState, useMemo, useTransition } from "react"
import { motion } from "framer-motion"
import { useFirestore } from "../hooks/useFirestore"
import { useCategories } from "../hooks/useCategories"
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ReferenceDot
} from "recharts"
import { KPICard } from "./ui/KPICard"
import { Card } from "./ui/Card"
import { EmptyState } from "./ui/EmptyState"
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  ArrowUpCircle, ArrowDownCircle, BarChart2, Target,
  AlertTriangle, CheckCircle, Info, Activity, CreditCard
} from "lucide-react"

// ---------- Formatação ----------
const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  })

const pct = (val: number, total: number) =>
  total ? Math.round((val / total) * 100) : 0

type RangeOption = "1M" | "3M" | "6M" | "1A" | "2A"
type ModeOption = "range" | "month" | "financeiro"

// ---------- Cores pastel para gráficos ----------
const CHART_COLORS = {
  receitas:   "#86efac",  // verde pastel
  despesas:   "#fca5a5",  // vermelho pastel
  poupancas:  "#93c5fd",  // azul pastel
  dividas:    "#fde68a",  // âmbar pastel
}

const PIE_PALETTE = [
  "#a78bfa", "#86efac", "#93c5fd", "#fca5a5", "#fde68a",
  "#f9a8d4", "#6ee7b7", "#67e8f9", "#c4b5fd", "#fb923c",
]

function getBounds(range: RangeOption) {
  const months = { "1M":1,"3M":3,"6M":6,"1A":12,"2A":24 }[range] ?? 6
  const to = new Date(); to.setHours(23,59,59,999)
  const from = new Date(to)
  from.setMonth(to.getMonth() - (months - 1)); from.setDate(1); from.setHours(0,0,0,0)
  return { from, to }
}

function getMonthBounds(yyyyMM: string) {
  const [yy, mm] = yyyyMM.split("-").map(Number)
  const from = new Date(yy, mm - 1, 1); from.setHours(0,0,0,0)
  const to = new Date(yy, mm, 0); to.setHours(23,59,59,999)
  return { from, to }
}

function getPrevMonthBounds(yyyyMM: string) {
  const [yy, mm] = yyyyMM.split("-").map(Number)
  const prevTo = new Date(yy, mm - 1, 0); prevTo.setHours(23,59,59,999)
  const prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), 1); prevFrom.setHours(0,0,0,0)
  return { from: prevFrom, to: prevTo }
}

function inBounds(d: Date, b: { from: Date; to: Date }) {
  return d >= b.from && d <= b.to
}

// Período financeiro: começa quando o Ricardo recebe o salário (>1000€ da Accenture)
const SALARY_KEYWORDS = ['accenture', 'vencimento', 'vmjc', 'transferencia - vencimento']
const SALARY_MIN = 1000

function getFinancialPeriodBounds(allTx: { type: string; valor: number; data: string; descricao?: string | null }[]) {
  const salaryTx = allTx
    .filter(t => {
      if (t.type !== 'receita' || (Number(t.valor) || 0) <= SALARY_MIN) return false
      const desc = (t.descricao ?? '').toLowerCase()
      return SALARY_KEYWORDS.some(k => desc.includes(k))
    })
    .sort((a, b) => b.data.localeCompare(a.data))

  if (salaryTx.length === 0) return null

  const last = salaryTx[0]
  const prev = salaryTx[1] ?? null

  const from = new Date(last.data); from.setHours(0, 0, 0, 0)
  const to = new Date(); to.setHours(23, 59, 59, 999)

  let prevFrom: Date | null = null
  let prevTo: Date | null = null
  if (prev) {
    prevFrom = new Date(prev.data); prevFrom.setHours(0, 0, 0, 0)
    prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1); prevTo.setHours(23, 59, 59, 999)
  }

  return { from, to, prevFrom, prevTo, salaryDate: last.data }
}

function nowMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`
}

// ---------- Tooltip custom ----------
const CustomTooltip = ({ active, payload, label }: any) => {
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

// ---------- Pontuação financeira ----------
function calcFinancialScore(taxaPoupanca: number, saldoPos: boolean, budgetOk: boolean): number {
  let score = 0
  // Taxa de poupança (0-40 pts)
  if (taxaPoupanca >= 20) score += 40
  else if (taxaPoupanca >= 10) score += 25
  else if (taxaPoupanca >= 5) score += 15
  else if (taxaPoupanca > 0) score += 8
  // Saldo positivo (0-40 pts)
  if (saldoPos) score += 40
  // Orçamento ok (0-20 pts)
  if (budgetOk) score += 20
  return Math.min(100, score)
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#86efac" : score >= 50 ? "#fde68a" : "#fca5a5"
  const label = score >= 75 ? "Excelente" : score >= 50 ? "Bom" : score >= 25 ? "A melhorar" : "Crítico"
  const r = 44; const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(var(--border),0.15)" strokeWidth="8"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[rgb(var(--text))]">{score}</span>
          <span className="text-[9px] text-[rgb(var(--text-muted))] uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

// ---------- Componente principal ----------
export default function Dashboard() {
  const { transacoes, dadosGraficoTempo, getTransacoesInRange, orcamentos } = useFirestore()
  const { items: categories } = useCategories()

  const [mode, setMode] = useState<ModeOption>("range")
  const [range, setRange] = useState<RangeOption>("6M")
  const [month, setMonth] = useState(nowMonth)
  const [, startTransition] = useTransition()

  const currentMonth = nowMonth()

  // Mapas
  const catNameMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c: any) => { if (c.id) m.set(c.id, c.name ?? "") })
    return m
  }, [categories])

  const catNatureMap = useMemo(() => {
    const m = new Map<string, "necessidade" | "vontade">()
    categories.forEach((c: any) => {
      if (c.id && c.type === "despesa") m.set(c.id, c.spendNature ?? "necessidade")
    })
    return m
  }, [categories])

  // Período financeiro (baseado no salário do Ricardo)
  const financialPeriod = useMemo(() => {
    if (mode !== "financeiro") return null
    return getFinancialPeriodBounds(transacoes)
  }, [mode, transacoes])

  // Transações filtradas
  const txFiltered = useMemo(() => {
    if (mode === "range") return getTransacoesInRange(range)
    if (mode === "financeiro") {
      if (!financialPeriod) return []
      return transacoes.filter(t => inBounds(new Date(t.data), financialPeriod))
    }
    const b = getMonthBounds(month)
    return transacoes.filter((t) => inBounds(new Date(t.data), b))
  }, [mode, range, month, transacoes, getTransacoesInRange, financialPeriod])

  // Transações do mês atual
  const txCurrentMonth = useMemo(() => {
    const b = getMonthBounds(currentMonth)
    return transacoes.filter((t) => inBounds(new Date(t.data), b))
  }, [transacoes, currentMonth])

  // Totais
  const sum = (list: any[], type: string) =>
    list.filter(t => t.type === type).reduce((s, t) => s + (Number(t.valor)||0), 0)

  const curReceitas  = useMemo(() => sum(txFiltered, "receita"),  [txFiltered])
  const curDespesas  = useMemo(() => sum(txFiltered, "despesa"),  [txFiltered])
  const curPoupancas = useMemo(() => sum(txFiltered, "poupanca"), [txFiltered])
  const curSaldo     = useMemo(() => curReceitas - curDespesas - curPoupancas, [curReceitas, curDespesas, curPoupancas])

  // Mês anterior (para deltas)
  const prevBounds = useMemo(() => {
    if (mode === "month") return getPrevMonthBounds(month)
    if (mode === "financeiro") {
      if (financialPeriod?.prevFrom && financialPeriod?.prevTo)
        return { from: financialPeriod.prevFrom, to: financialPeriod.prevTo }
      return { from: new Date(0), to: new Date(0) }
    }
    const { from } = getBounds(range)
    const prevTo = new Date(from); prevTo.setDate(0)
    const months = { "1M":1,"3M":3,"6M":6,"1A":12,"2A":24 }[range] ?? 6
    const prevFrom = new Date(prevTo)
    prevFrom.setMonth(prevTo.getMonth() - (months - 1)); prevFrom.setDate(1)
    return { from: prevFrom, to: prevTo }
  }, [mode, range, month, financialPeriod])

  const txPrev = useMemo(() =>
    transacoes.filter(t => inBounds(new Date(t.data), prevBounds)), [transacoes, prevBounds])

  const prevReceitas  = useMemo(() => sum(txPrev, "receita"),  [txPrev])
  const prevDespesas  = useMemo(() => sum(txPrev, "despesa"),  [txPrev])
  const prevPoupancas = useMemo(() => sum(txPrev, "poupanca"), [txPrev])
  const prevSaldo     = useMemo(() => prevReceitas - prevDespesas - prevPoupancas, [prevReceitas, prevDespesas, prevPoupancas])

  const delta = (cur: number, prev: number) => {
    if (prev === 0) return null
    return ((cur - prev) / Math.abs(prev)) * 100
  }

  // Taxa de poupança
  const taxaPoupanca = curReceitas > 0 ? pct(curPoupancas, curReceitas) : 0

  // Série mensal para gráfico
  const serieMensal = useMemo(() => dadosGraficoTempo(range), [dadosGraficoTempo, range])

  // Série diária (modo mês ou financeiro)
  const serieDiaria = useMemo(() => {
    if (mode === "range") return []

    if (mode === "financeiro") {
      if (!financialPeriod) return []
      const result: { dia: string; Receitas: number; Despesas: number }[] = []
      const cur = new Date(financialPeriod.from)
      while (cur <= financialPeriod.to && result.length < 65) {
        const dateStr = cur.toISOString().slice(0, 10)
        const dayTx = txFiltered.filter(t => t.data === dateStr)
        result.push({
          dia: `${cur.getDate()}/${cur.getMonth() + 1}`,
          Receitas: dayTx.filter(t => t.type === "receita").reduce((s, t) => s + (Number(t.valor) || 0), 0),
          Despesas: dayTx.filter(t => t.type === "despesa").reduce((s, t) => s + (Number(t.valor) || 0), 0),
        })
        cur.setDate(cur.getDate() + 1)
      }
      return result
    }

    // Modo mês
    const b = getMonthBounds(month)
    const dias = new Date(b.to.getFullYear(), b.to.getMonth() + 1, 0).getDate()
    const byDay: Record<number, { r: number; d: number }> = {}
    for (let i = 1; i <= dias; i++) byDay[i] = { r: 0, d: 0 }
    txFiltered.forEach(t => {
      const day = new Date(t.data).getDate()
      if (t.type === "receita") byDay[day].r += Number(t.valor)||0
      if (t.type === "despesa") byDay[day].d += Number(t.valor)||0
    })
    return Object.entries(byDay).map(([dia, v]) => ({
      dia: `${dia}`, Receitas: v.r, Despesas: v.d
    }))
  }, [mode, month, txFiltered, financialPeriod])

  // Top categorias de despesa
  const topCategorias = useMemo(() => {
    const m = new Map<string, number>()
    txFiltered.forEach(t => {
      if (t.type !== "despesa") return
      const nome = catNameMap.get(t.categoryId ?? "") || t.categoria || "Outros"
      m.set(nome, (m.get(nome) ?? 0) + (Number(t.valor)||0))
    })
    return Array.from(m.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, pct: pct(value, curDespesas || 1) }))
  }, [txFiltered, catNameMap, curDespesas])

  // Distribuição 50/30/20
  const distNWS = useMemo(() => {
    let nec = 0, von = 0, pou = 0
    txFiltered.forEach(t => {
      const val = Number(t.valor)||0
      if (t.type === "despesa") {
        const nature = catNatureMap.get(t.categoryId ?? "") ?? "necessidade"
        if (nature === "necessidade") nec += val; else von += val
      }
      if (t.type === "poupanca") pou += val
    })
    return [
      { name: "Necessidades", value: nec, fill: "#93c5fd" },
      { name: "Vontades",     value: von, fill: "#fde68a" },
      { name: "Poupança",     value: pou, fill: "#86efac" },
    ]
  }, [txFiltered, catNatureMap])

  // Últimas 5 transações
  const recentTx = useMemo(() =>
    [...transacoes]
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 5), [transacoes])

  // Pico de despesas na série
  const picoDespesas = useMemo(() => {
    if (mode !== "range") return null
    let idx = -1, max = -Infinity
    serieMensal.forEach((d, i) => {
      if (d.despesas > max) { max = d.despesas; idx = i }
    })
    return idx >= 0 ? { x: serieMensal[idx].mes, y: serieMensal[idx].despesas } : null
  }, [mode, serieMensal])

  // Orçamentos do mês atual
  const budgetsThisMonth = useMemo(() => {
    const monthOrcs = orcamentos.filter((o: any) => o.periodo === currentMonth)
    return monthOrcs.map((o: any) => {
      const catName = catNameMap.get(o.categoryId) ?? o.categoryId ?? "Sem nome"
      const gasto = sum(txCurrentMonth.filter(t => t.categoryId === o.categoryId), "despesa")
      const percentUsed = o.limite > 0 ? pct(gasto, o.limite) : 0
      return { catName, gasto, limite: o.limite, percentUsed }
    }).filter(b => b.limite > 0)
  }, [orcamentos, currentMonth, txCurrentMonth, catNameMap])

  // Pontuação financeira
  const budgetOk = budgetsThisMonth.every(b => b.percentUsed <= 100)
  const financialScore = calcFinancialScore(taxaPoupanca, curSaldo >= 0, budgetOk)

  // Dica inteligente
  const smartTip = useMemo(() => {
    if (curSaldo < 0) return { type: "danger", msg: `O seu saldo está negativo em ${eur(Math.abs(curSaldo))}. Reduza as despesas ou aumente as receitas.` }
    if (taxaPoupanca < 5) return { type: "warning", msg: `A sua taxa de poupança é de ${taxaPoupanca}%. O ideal é poupar pelo menos 20% do rendimento.` }
    if (taxaPoupanca >= 20) return { type: "success", msg: `Parabéns! Está a poupar ${taxaPoupanca}% do rendimento — acima do recomendado.` }
    return { type: "info", msg: `Está a poupar ${taxaPoupanca}% do rendimento. Tente aumentar gradualmente até 20%.` }
  }, [curSaldo, taxaPoupanca])

  const TipIcon = { danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle, info: Info }[smartTip.type]
  const tipColor = { danger: "text-rose-400", warning: "text-amber-400", success: "text-emerald-400", info: "text-blue-400" }[smartTip.type]

  // Controlo de filtros
  const FilterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl overflow-hidden border border-[rgba(var(--border),var(--border-alpha))]">
        {(["range","month","financeiro"] as ModeOption[]).map(m => (
          <button key={m}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand))]"
                : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
            }`}
            onClick={() => startTransition(() => setMode(m))}
          >
            {m === "range" ? "Período" : m === "month" ? "Mês" : "💰 Financeiro"}
          </button>
        ))}
      </div>
      {mode === "range" && (
        <div className="inline-flex rounded-xl overflow-hidden border border-[rgba(var(--border),var(--border-alpha))]">
          {(["1M","3M","6M","1A","2A"] as RangeOption[]).map(opt => (
            <button key={opt}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                range === opt
                  ? "bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand))]"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              }`}
              onClick={() => startTransition(() => setRange(opt))}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {mode === "month" && (
        <input type="month" value={month}
          onChange={e => startTransition(() => setMonth(e.target.value))}
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

  const axisStyle = { fontSize: 11, fill: 'rgb(var(--text-muted))' } as const

  if (!txFiltered.length) {
    return (
      <div className="space-y-6">
        {FilterBar}
        <EmptyState
          icon={BarChart2}
          title="Sem dados no período"
          description="Adicione transações ou selecione um período diferente para ver o dashboard."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      {FilterBar}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Saldo Disponível" value={eur(curSaldo)} subtitle="Receitas − Despesas − Poupanças"
          icon={Wallet} variant={curSaldo >= 0 ? "green" : "red"} delta={delta(curSaldo, prevSaldo)} trendPolicy="upGood" index={0} />
        <KPICard title="Total Receitas" value={eur(curReceitas)} subtitle="Entradas no período"
          icon={ArrowUpCircle} variant="green" delta={delta(curReceitas, prevReceitas)} trendPolicy="upGood" index={1} />
        <KPICard title="Total Despesas" value={eur(curDespesas)} subtitle={`${pct(curDespesas, curReceitas||1)}% das receitas`}
          icon={ArrowDownCircle} variant="red" delta={delta(curDespesas, prevDespesas)} trendPolicy="downGood" index={2} />
        <KPICard title="Poupanças" value={eur(curPoupancas)} subtitle={`Taxa: ${taxaPoupanca}% do rendimento`}
          icon={PiggyBank} variant="blue" delta={delta(curPoupancas, prevPoupancas)} trendPolicy="upGood" index={3} />
      </div>

      {/* Alerta saldo negativo */}
      {curSaldo < 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl border"
          style={{ background: 'rgba(var(--pastel-red-bg),0.3)', borderColor: 'rgba(var(--pastel-red-text),0.2)' }}
        >
          <AlertTriangle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-400 text-sm">Saldo negativo</div>
            <div className="text-sm text-[rgb(var(--text-muted))]">
              Reduza as despesas em <span className="font-bold text-rose-400">{eur(Math.abs(curSaldo))}</span> para equilibrar.
            </div>
          </div>
        </motion.div>
      )}

      {/* Pontuação + Dica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center justify-center gap-3 py-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">Saúde Financeira</div>
          <ScoreRing score={financialScore} />
        </Card>

        <Card className="md:col-span-2 flex flex-col justify-center gap-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">Indicadores</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[rgb(var(--text))]">{taxaPoupanca}%</div>
              <div className="text-xs text-[rgb(var(--text-muted))]">Taxa de Poupança</div>
            </div>
            <div className="text-center border-x border-[rgba(var(--border),var(--border-alpha))]">
              <div className="text-2xl font-bold text-[rgb(var(--text))]">{pct(curDespesas, curReceitas||1)}%</div>
              <div className="text-xs text-[rgb(var(--text-muted))]">Despesas / Receitas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[rgb(var(--text))]">{topCategorias.length}</div>
              <div className="text-xs text-[rgb(var(--text-muted))]">Categorias Ativas</div>
            </div>
          </div>

          {/* Dica inteligente */}
          <div className={`flex items-start gap-2.5 text-sm p-3 rounded-xl bg-[rgba(var(--surface-2),0.6)]`}>
            {TipIcon && <TipIcon size={16} className={`${tipColor} flex-shrink-0 mt-0.5`} />}
            <span className="text-[rgb(var(--text-muted))]">{smartTip.msg}</span>
          </div>
        </Card>
      </div>

      {/* Gráfico principal */}
      <Card>
        <div className="section-header">
          <div className="section-title">
            {mode === "range" ? "📈 Evolução Mensal" : mode === "financeiro" ? "💰 Mês Financeiro" : "📆 Fluxo Diário"}
          </div>
          <div className="flex items-center gap-1">
            <Activity size={14} className="text-[rgb(var(--text-muted))]" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          {mode === "range" ? (
            <AreaChart data={serieMensal} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.receitas}  stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.receitas}  stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.despesas}  stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.despesas}  stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradPoup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.poupancas} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.poupancas} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border),0.08)" />
              <XAxis dataKey="mes" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--text-muted))' }} />
              <Area type="monotone" dataKey="receitas"  name="Receitas"  stroke={CHART_COLORS.receitas}  fill="url(#gradRec)"  strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="despesas"  name="Despesas"  stroke={CHART_COLORS.despesas}  fill="url(#gradDesp)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="poupancas" name="Poupanças" stroke={CHART_COLORS.poupancas} fill="url(#gradPoup)" strokeWidth={2} dot={false} />
              {picoDespesas && (
                <ReferenceDot x={picoDespesas.x} y={picoDespesas.y} r={5} fill={CHART_COLORS.despesas} stroke="white" strokeWidth={2} />
              )}
            </AreaChart>
          ) : (
            <BarChart data={serieDiaria} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border),0.08)" />
              <XAxis dataKey="dia" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--text-muted))' }} />
              <Bar dataKey="Receitas" fill={CHART_COLORS.receitas} radius={[4,4,0,0]} maxBarSize={20} />
              <Bar dataKey="Despesas" fill={CHART_COLORS.despesas} radius={[4,4,0,0]} maxBarSize={20} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* Distribuição + Transações recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie de categorias */}
        <Card>
          <div className="section-header">
            <div className="section-title">Despesas por Categoria</div>
          </div>
          {topCategorias.length === 0 ? (
            <EmptyState icon={Target} title="Sem despesas" description="Nenhuma despesa registada no período." />
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topCategorias} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                    {topCategorias.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {topCategorias.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-xs">
                        <span className="truncate text-[rgb(var(--text))] font-medium">{cat.name}</span>
                        <span className="text-[rgb(var(--text-muted))] ml-2">{cat.pct}%</span>
                      </div>
                      <div className="progress-track mt-1">
                        <div className="progress-fill" style={{ width: `${cat.pct}%`, background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[rgb(var(--text-muted))] w-20 text-right">{eur(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Transações recentes */}
        <Card>
          <div className="section-header">
            <div className="section-title">Transações Recentes</div>
          </div>
          {recentTx.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sem transações" description="Adicione a primeira transação." />
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => {
                const catName = catNameMap.get(tx.categoryId ?? "") || tx.categoria || ""
                const isIncome = tx.type === "receita"
                const isPoupanca = tx.type === "poupanca"
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isIncome ? "bg-emerald-400/10" : isPoupanca ? "bg-blue-400/10" : "bg-rose-400/10"
                    }`}>
                      {isIncome ? <TrendingUp size={14} className="text-emerald-400" />
                        : isPoupanca ? <PiggyBank size={14} className="text-blue-400" />
                        : <TrendingDown size={14} className="text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[rgb(var(--text))] truncate">
                        {tx.descricao || catName || "Sem descrição"}
                      </div>
                      <div className="text-xs text-[rgb(var(--text-muted))]">{tx.data}</div>
                    </div>
                    <div className={`text-sm font-bold ${
                      isIncome ? "text-emerald-400" : isPoupanca ? "text-blue-400" : "text-rose-400"
                    }`}>
                      {isIncome ? "+" : "−"}{eur(tx.valor)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Distribuição 50/30/20 + Orçamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 50/30/20 */}
        <Card>
          <div className="section-header">
            <div className="section-title">Regra 50/30/20 — Distribuição Real</div>
          </div>
          <div className="space-y-4">
            {distNWS.map((item) => {
              const totalGasto = distNWS.reduce((s, i) => s + i.value, 0)
              const p = pct(item.value, totalGasto || 1)
              return (
                <div key={item.name}>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium text-[rgb(var(--text))]">{item.name}</span>
                    <span className="text-[rgb(var(--text-muted))]">{p}% · {eur(item.value)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${p}%`, background: item.fill }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl text-xs text-[rgb(var(--text-muted))] bg-[rgba(var(--surface-2),0.5)]">
            A regra 50/30/20 recomenda: 50% necessidades · 30% vontades · 20% poupança
          </div>
        </Card>

        {/* Orçamentos do mês */}
        <Card>
          <div className="section-header">
            <div className="section-title">Orçamentos — {currentMonth}</div>
          </div>
          {budgetsThisMonth.length === 0 ? (
            <EmptyState icon={Target} title="Sem orçamentos" description="Defina orçamentos em Orçamentos para ver o progresso." />
          ) : (
            <div className="space-y-3">
              {budgetsThisMonth.slice(0, 6).map((b) => {
                const color = b.percentUsed >= 100 ? "#fca5a5" : b.percentUsed >= 80 ? "#fde68a" : "#86efac"
                return (
                  <div key={b.catName}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium text-[rgb(var(--text))] truncate">{b.catName}</span>
                      <span className="text-[rgb(var(--text-muted))] text-xs ml-2 flex-shrink-0">
                        {eur(b.gasto)} / {eur(b.limite)}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.min(100, b.percentUsed)}%`, background: color }} />
                    </div>
                    {b.percentUsed >= 100 && (
                      <div className="text-xs text-rose-400 mt-0.5">⚠ Limite ultrapassado em {eur(b.gasto - b.limite)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

