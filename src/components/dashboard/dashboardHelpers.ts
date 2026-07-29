// Lógica pura do Dashboard: formatação, períodos e pontuação financeira.
// Sem dependências de React — fácil de testar isoladamente.

export type RangeOption = "1M" | "3M" | "6M" | "1A" | "2A"
export type ModeOption = "range" | "month" | "financeiro"

export const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
  })

export const pct = (val: number, total: number) =>
  total ? Math.round((val / total) * 100) : 0

export const CHART_COLORS = {
  receitas: "#86efac",
  despesas: "#fca5a5",
  poupancas: "#93c5fd",
  dividas: "#fde68a",
}

export const PIE_PALETTE = [
  "#a78bfa", "#86efac", "#93c5fd", "#fca5a5", "#fde68a",
  "#f9a8d4", "#6ee7b7", "#67e8f9", "#c4b5fd", "#fb923c",
]

export function getBounds(range: RangeOption) {
  const months = { "1M": 1, "3M": 3, "6M": 6, "1A": 12, "2A": 24 }[range] ?? 6
  const to = new Date(); to.setHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setMonth(to.getMonth() - (months - 1)); from.setDate(1); from.setHours(0, 0, 0, 0)
  return { from, to }
}

export function getMonthBounds(yyyyMM: string) {
  const [yy, mm] = yyyyMM.split("-").map(Number)
  const from = new Date(yy, mm - 1, 1); from.setHours(0, 0, 0, 0)
  const to = new Date(yy, mm, 0); to.setHours(23, 59, 59, 999)
  return { from, to }
}

export function getPrevMonthBounds(yyyyMM: string) {
  const [yy, mm] = yyyyMM.split("-").map(Number)
  const prevTo = new Date(yy, mm - 1, 0); prevTo.setHours(23, 59, 59, 999)
  const prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), 1); prevFrom.setHours(0, 0, 0, 0)
  return { from: prevFrom, to: prevTo }
}

export function inBounds(d: Date, b: { from: Date; to: Date }) {
  return d >= b.from && d <= b.to
}

// Período financeiro: começa quando o Ricardo recebe o salário (>1000€ da Accenture)
export const SALARY_KEYWORDS = ['accenture', 'vencimento', 'vmjc', 'transferencia - vencimento']
export const SALARY_MIN = 1000

export function getFinancialPeriodBounds(allTx: { type: string; valor: number; data: string; descricao?: string | null }[]) {
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

export function nowMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
}

export function calcFinancialScore(taxaPoupanca: number, saldoPos: boolean, budgetOk: boolean): number {
  let score = 0
  if (taxaPoupanca >= 20) score += 40
  else if (taxaPoupanca >= 10) score += 25
  else if (taxaPoupanca >= 5) score += 15
  else if (taxaPoupanca > 0) score += 8
  if (saldoPos) score += 40
  if (budgetOk) score += 20
  return Math.min(100, score)
}
