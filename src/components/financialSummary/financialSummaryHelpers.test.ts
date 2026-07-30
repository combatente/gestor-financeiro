import { describe, expect, it } from 'vitest'
import {
  averageMonthlyIncomeExpenses, estimateDebtPayoffMonths, formatPayoffDuration,
} from './financialSummaryHelpers'

describe('averageMonthlyIncomeExpenses', () => {
  const asOf = new Date('2026-07-15')

  it('calcula a média apenas sobre os meses completos que têm transações', () => {
    const transacoes = [
      { type: 'receita', valor: 2000, data: '2026-06-01' },
      { type: 'despesa', valor: 1500, data: '2026-06-05' },
      { type: 'receita', valor: 1800, data: '2026-05-01' },
      { type: 'despesa', valor: 1600, data: '2026-05-05' },
      // Abril sem transações
      { type: 'receita', valor: 9999, data: '2026-07-10' }, // mês corrente, ignorado
    ]
    const result = averageMonthlyIncomeExpenses(transacoes, 3, asOf)
    expect(result.monthsUsed).toBe(2)
    expect(result.avgIncome).toBe((2000 + 1800) / 2)
    expect(result.avgExpenses).toBe((1500 + 1600) / 2)
  })

  it('recorre ao mês corrente quando não há nenhum mês completo com dados', () => {
    const transacoes = [
      { type: 'receita', valor: 3000, data: '2026-07-05' },
      { type: 'despesa', valor: 1200, data: '2026-07-10' },
    ]
    const result = averageMonthlyIncomeExpenses(transacoes, 3, asOf)
    expect(result.monthsUsed).toBe(1)
    expect(result.avgIncome).toBe(3000)
    expect(result.avgExpenses).toBe(1200)
  })

  it('devolve zeros e monthsUsed=0 quando não há transações', () => {
    const result = averageMonthlyIncomeExpenses([], 3, asOf)
    expect(result).toEqual({ avgIncome: 0, avgExpenses: 0, monthsUsed: 0 })
  })
})

describe('estimateDebtPayoffMonths', () => {
  it('devolve null quando não há dívidas ativas', () => {
    expect(estimateDebtPayoffMonths([])).toEqual({ weightedAverageMonths: null, anyNeverPaysOff: false })
    expect(estimateDebtPayoffMonths([{ currentAmount: 0, interestRate: 5, minimumPayment: 100 }]))
      .toEqual({ weightedAverageMonths: null, anyNeverPaysOff: false })
  })

  it('calcula meses até à liquidação para uma dívida com juro (fórmula de amortização)', () => {
    // P=1200, taxa mensal=1%, prestação=106.61€ (PMT exato para n=12) -> deve dar ~12 meses
    const result = estimateDebtPayoffMonths([{ currentAmount: 1200, interestRate: 12, minimumPayment: 106.61 }])
    expect(result.anyNeverPaysOff).toBe(false)
    expect(result.weightedAverageMonths).toBeCloseTo(12, 0)
  })

  it('usa divisão simples quando a taxa de juro é zero', () => {
    const result = estimateDebtPayoffMonths([{ currentAmount: 1000, interestRate: 0, minimumPayment: 100 }])
    expect(result.weightedAverageMonths).toBe(10)
  })

  it('sinaliza dívidas cujo pagamento mínimo não cobre o juro mensal e exclui-as da média', () => {
    const result = estimateDebtPayoffMonths([
      { currentAmount: 10000, interestRate: 24, minimumPayment: 50 }, // juro mensal = 200€ > prestação
      { currentAmount: 1000, interestRate: 0, minimumPayment: 100 },
    ])
    expect(result.anyNeverPaysOff).toBe(true)
    expect(result.weightedAverageMonths).toBe(10) // só a segunda dívida entra na média
  })

  it('pondera a média pelo saldo em dívida de cada dívida', () => {
    const result = estimateDebtPayoffMonths([
      { currentAmount: 1000, interestRate: 0, minimumPayment: 100 }, // 10 meses
      { currentAmount: 3000, interestRate: 0, minimumPayment: 100 }, // 30 meses
    ])
    // média ponderada: (1000*10 + 3000*30) / 4000 = 25
    expect(result.weightedAverageMonths).toBe(25)
  })
})

describe('formatPayoffDuration', () => {
  it('formata meses puros', () => {
    expect(formatPayoffDuration(5)).toBe('5 meses')
    expect(formatPayoffDuration(1)).toBe('1 mês')
  })

  it('formata anos puros', () => {
    expect(formatPayoffDuration(24)).toBe('2 anos')
    expect(formatPayoffDuration(12)).toBe('1 ano')
  })

  it('formata anos e meses', () => {
    expect(formatPayoffDuration(14)).toBe('1 ano e 2 meses')
    expect(formatPayoffDuration(25)).toBe('2 anos e 1 mês')
  })
})
