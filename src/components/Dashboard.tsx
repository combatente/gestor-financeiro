import { useState, useMemo, useTransition } from "react"
import { useFirestore } from "../hooks/useFirestore"
import { useCategories } from "../hooks/useCategories"
import { EmptyState } from "./ui/EmptyState"
import { BarChart2 } from "lucide-react"
import {
  CHART_COLORS, type ModeOption, type RangeOption,
  calcFinancialScore, getBounds, getFinancialPeriodBounds,
  getMonthBounds, getPrevMonthBounds, inBounds, nowMonth, pct,
} from "./dashboard/dashboardHelpers"
import { DashboardFilterBar } from "./dashboard/DashboardFilterBar"
import { DashboardKpis } from "./dashboard/DashboardKpis"
import { DashboardHealthPanel } from "./dashboard/DashboardHealthPanel"
import { DashboardMainChart } from "./dashboard/DashboardMainChart"
import { DashboardCategoryBreakdown } from "./dashboard/DashboardCategoryBreakdown"
import { DashboardRecentTransactions } from "./dashboard/DashboardRecentTransactions"
import { DashboardDistribution } from "./dashboard/DashboardDistribution"
import { DashboardBudgets } from "./dashboard/DashboardBudgets"

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
    list.filter(t => t.type === type).reduce((s, t) => s + (Number(t.valor) || 0), 0)

  const curReceitas = useMemo(() => sum(txFiltered, "receita"), [txFiltered])
  const curDespesas = useMemo(() => sum(txFiltered, "despesa"), [txFiltered])
  const curPoupancas = useMemo(() => sum(txFiltered, "poupanca"), [txFiltered])
  const curSaldo = useMemo(() => curReceitas - curDespesas - curPoupancas, [curReceitas, curDespesas, curPoupancas])

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
    const months = { "1M": 1, "3M": 3, "6M": 6, "1A": 12, "2A": 24 }[range] ?? 6
    const prevFrom = new Date(prevTo)
    prevFrom.setMonth(prevTo.getMonth() - (months - 1)); prevFrom.setDate(1)
    return { from: prevFrom, to: prevTo }
  }, [mode, range, month, financialPeriod])

  const txPrev = useMemo(() =>
    transacoes.filter(t => inBounds(new Date(t.data), prevBounds)), [transacoes, prevBounds])

  const prevReceitas = useMemo(() => sum(txPrev, "receita"), [txPrev])
  const prevDespesas = useMemo(() => sum(txPrev, "despesa"), [txPrev])
  const prevPoupancas = useMemo(() => sum(txPrev, "poupanca"), [txPrev])
  const prevSaldo = useMemo(() => prevReceitas - prevDespesas - prevPoupancas, [prevReceitas, prevDespesas, prevPoupancas])

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
      if (t.type === "receita") byDay[day].r += Number(t.valor) || 0
      if (t.type === "despesa") byDay[day].d += Number(t.valor) || 0
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
      m.set(nome, (m.get(nome) ?? 0) + (Number(t.valor) || 0))
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
      const val = Number(t.valor) || 0
      if (t.type === "despesa") {
        const nature = catNatureMap.get(t.categoryId ?? "") ?? "necessidade"
        if (nature === "necessidade") nec += val; else von += val
      }
      if (t.type === "poupanca") pou += val
    })
    return [
      { name: "Necessidades", value: nec, fill: "#93c5fd" },
      { name: "Vontades", value: von, fill: "#fde68a" },
      { name: "Poupança", value: pou, fill: CHART_COLORS.poupancas },
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
    const eur = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })
    if (curSaldo < 0) return { type: "danger" as const, msg: `O seu saldo está negativo em ${eur(Math.abs(curSaldo))}. Reduza as despesas ou aumente as receitas.` }
    if (taxaPoupanca < 5) return { type: "warning" as const, msg: `A sua taxa de poupança é de ${taxaPoupanca}%. O ideal é poupar pelo menos 20% do rendimento.` }
    if (taxaPoupanca >= 20) return { type: "success" as const, msg: `Parabéns! Está a poupar ${taxaPoupanca}% do rendimento — acima do recomendado.` }
    return { type: "info" as const, msg: `Está a poupar ${taxaPoupanca}% do rendimento. Tente aumentar gradualmente até 20%.` }
  }, [curSaldo, taxaPoupanca])

  const filterBar = (
    <DashboardFilterBar
      mode={mode}
      onModeChange={(m) => startTransition(() => setMode(m))}
      range={range}
      onRangeChange={(r) => startTransition(() => setRange(r))}
      month={month}
      onMonthChange={(m) => startTransition(() => setMonth(m))}
      financialPeriod={financialPeriod}
    />
  )

  if (!txFiltered.length) {
    return (
      <div className="space-y-6">
        {filterBar}
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
      {filterBar}

      <DashboardKpis
        curSaldo={curSaldo} prevSaldo={prevSaldo}
        curReceitas={curReceitas} prevReceitas={prevReceitas}
        curDespesas={curDespesas} prevDespesas={prevDespesas}
        curPoupancas={curPoupancas} prevPoupancas={prevPoupancas}
        taxaPoupanca={taxaPoupanca}
      />

      <DashboardHealthPanel
        financialScore={financialScore}
        taxaPoupanca={taxaPoupanca}
        despesasSobreReceitasPct={pct(curDespesas, curReceitas || 1)}
        categoriasAtivas={topCategorias.length}
        smartTip={smartTip}
      />

      <DashboardMainChart mode={mode} serieMensal={serieMensal} serieDiaria={serieDiaria} picoDespesas={picoDespesas} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCategoryBreakdown topCategorias={topCategorias} />
        <DashboardRecentTransactions recentTx={recentTx} catNameMap={catNameMap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardDistribution distNWS={distNWS} />
        <DashboardBudgets budgetsThisMonth={budgetsThisMonth} currentMonth={currentMonth} />
      </div>
    </div>
  )
}
