// Lógica pura do Resumo Financeiro: médias reais de rendimento/despesa e
// estimativa de amortização de dívida. Sem dependências de React.

export type SimpleTransacao = { type: string; valor: number; data: string }
export type SimpleDebt = { currentAmount: number; interestRate: number; minimumPayment: number }

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Média mensal real de receitas/despesas, calculada a partir dos meses (completos,
 * anteriores ao atual) que efetivamente têm transações — evita diluir a média por
 * meses sem histórico. Se não houver nenhum mês completo com dados, recorre ao
 * mês corrente (parcial) como última alternativa.
 */
export function averageMonthlyIncomeExpenses(
  transacoes: SimpleTransacao[],
  months: number = 3,
  asOf: Date = new Date()
): { avgIncome: number; avgExpenses: number; monthsUsed: number } {
  const buckets: Record<string, { income: number; expenses: number }> = {}
  for (let i = 1; i <= months; i++) {
    const d = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1)
    buckets[monthKey(d)] = { income: 0, expenses: 0 }
  }

  transacoes.forEach(t => {
    const key = monthKey(new Date(t.data))
    if (!(key in buckets)) return
    const val = Number(t.valor) || 0
    if (t.type === 'receita') buckets[key].income += val
    if (t.type === 'despesa') buckets[key].expenses += val
  })

  const monthsWithData = Object.keys(buckets).filter(k => buckets[k].income > 0 || buckets[k].expenses > 0)

  if (monthsWithData.length === 0) {
    const curKey = monthKey(asOf)
    let income = 0
    let expenses = 0
    transacoes.forEach(t => {
      if (monthKey(new Date(t.data)) !== curKey) return
      const val = Number(t.valor) || 0
      if (t.type === 'receita') income += val
      if (t.type === 'despesa') expenses += val
    })
    return { avgIncome: income, avgExpenses: expenses, monthsUsed: income || expenses ? 1 : 0 }
  }

  const totalIncome = monthsWithData.reduce((s, k) => s + buckets[k].income, 0)
  const totalExpenses = monthsWithData.reduce((s, k) => s + buckets[k].expenses, 0)
  return {
    avgIncome: totalIncome / monthsWithData.length,
    avgExpenses: totalExpenses / monthsWithData.length,
    monthsUsed: monthsWithData.length,
  }
}

/**
 * Estima o tempo (em meses) até à liquidação de cada dívida, usando a fórmula
 * padrão de amortização (n = ln(A / (A − P·r)) / ln(1+r)), e devolve a média
 * ponderada pelo saldo em dívida. Dívidas cujo pagamento mínimo nem cobre o
 * juro mensal nunca se pagam sozinhas — são sinalizadas em `anyNeverPaysOff`
 * e excluídas da média (que ficaria infinita/sem sentido).
 */
export function estimateDebtPayoffMonths(
  debts: SimpleDebt[]
): { weightedAverageMonths: number | null; anyNeverPaysOff: boolean } {
  const active = debts.filter(d => (d.currentAmount || 0) > 0)
  if (active.length === 0) return { weightedAverageMonths: null, anyNeverPaysOff: false }

  let anyNeverPaysOff = false
  let weightedSum = 0
  let totalWeight = 0

  active.forEach(d => {
    const P = d.currentAmount
    const rMonthly = (d.interestRate || 0) / 100 / 12
    const A = d.minimumPayment || 0

    let months: number
    if (A <= 0 || (rMonthly > 0 && A <= P * rMonthly)) {
      anyNeverPaysOff = true
      months = Infinity
    } else if (rMonthly === 0) {
      months = P / A
    } else {
      months = Math.log(A / (A - P * rMonthly)) / Math.log(1 + rMonthly)
    }

    if (Number.isFinite(months)) {
      weightedSum += months * P
      totalWeight += P
    }
  })

  return {
    weightedAverageMonths: totalWeight > 0 ? weightedSum / totalWeight : null,
    anyNeverPaysOff,
  }
}

/** Formata um número de meses como "X anos e Y meses" (pt-PT). */
export function formatPayoffDuration(months: number): string {
  const totalMonths = Math.round(months)
  const years = Math.floor(totalMonths / 12)
  const rem = totalMonths % 12
  if (years === 0) return `${rem} ${rem === 1 ? 'mês' : 'meses'}`
  if (rem === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${rem} ${rem === 1 ? 'mês' : 'meses'}`
}
