import { describe, expect, it } from 'vitest'
import type { DividendType, InvestmentType } from '../../hooks/useFirestore'
import {
  allocationBy, dividendYieldOnCost, dividendYieldOnValue, monthlyDividendSeries,
  portfolioTotals, positionMetrics, receivedDividendsHistory, toEur, trailingTwelveMonthDividends,
  upcomingDividends, ytdDividendsTotal,
} from './investmentsHelpers'

const USD_TO_EUR = 0.9

function makeInvestment(overrides: Partial<InvestmentType> = {}): InvestmentType {
  return {
    id: 'inv-1',
    ticker: 'VWCE',
    name: 'Vanguard FTSE All-World',
    platform: 'XTB',
    assetType: 'ETF',
    currency: 'EUR',
    quantity: 10,
    avgCost: 90,
    currentPrice: 100,
    quoteUpdatedAt: '2026-07-01',
    createdAt: null,
    ...overrides,
  }
}

function makeDividend(overrides: Partial<DividendType> = {}): DividendType {
  return {
    id: 'div-1',
    investmentId: 'inv-1',
    exDividendDate: '2026-06-01',
    paymentDate: '2026-06-15',
    amountPerShare: 0.5,
    totalAmount: 5,
    currency: 'EUR',
    status: 'recebido',
    createdAt: null,
    ...overrides,
  }
}

describe('toEur', () => {
  it('não converte valores já em EUR', () => {
    expect(toEur(100, 'EUR', USD_TO_EUR)).toBe(100)
  })

  it('converte USD para EUR usando a taxa fornecida', () => {
    expect(toEur(100, 'USD', USD_TO_EUR)).toBe(90)
  })
})

describe('positionMetrics', () => {
  it('calcula valor de mercado, custo e P/L em EUR para uma posição em EUR', () => {
    const inv = makeInvestment({ quantity: 10, avgCost: 90, currentPrice: 100 })
    const m = positionMetrics(inv, USD_TO_EUR)
    expect(m.marketValueEur).toBe(1000)
    expect(m.costBasisEur).toBe(900)
    expect(m.plAbsEur).toBe(100)
    expect(m.plPct).toBeCloseTo(11.11, 1)
  })

  it('converte para EUR uma posição denominada em USD', () => {
    const inv = makeInvestment({ currency: 'USD', quantity: 10, avgCost: 100, currentPrice: 110 })
    const m = positionMetrics(inv, USD_TO_EUR)
    expect(m.marketValueEur).toBe(10 * 110 * USD_TO_EUR)
    expect(m.costBasisEur).toBe(10 * 100 * USD_TO_EUR)
  })

  it('devolve plPct = 0 quando o custo base é zero', () => {
    const inv = makeInvestment({ avgCost: 0 })
    expect(positionMetrics(inv, USD_TO_EUR).plPct).toBe(0)
  })
})

describe('portfolioTotals', () => {
  it('soma valores de mercado, custo e P/L de várias posições', () => {
    const investments = [
      makeInvestment({ id: 'a', quantity: 10, avgCost: 90, currentPrice: 100 }),
      makeInvestment({ id: 'b', quantity: 5, avgCost: 200, currentPrice: 180, currency: 'USD' }),
    ]
    const totals = portfolioTotals(investments, USD_TO_EUR)
    expect(totals.marketValueEur).toBeCloseTo(1000 + 5 * 180 * USD_TO_EUR, 5)
    expect(totals.costBasisEur).toBeCloseTo(900 + 5 * 200 * USD_TO_EUR, 5)
  })
})

describe('trailingTwelveMonthDividends', () => {
  const asOf = new Date('2026-07-29')

  it('soma apenas dividendos recebidos nos últimos 12 meses para o investimento dado', () => {
    const dividends = [
      makeDividend({ id: 'd1', paymentDate: '2026-06-15', totalAmount: 5 }),
      makeDividend({ id: 'd2', paymentDate: '2025-01-01', totalAmount: 999 }), // fora da janela
      makeDividend({ id: 'd3', investmentId: 'outra-posicao', totalAmount: 999 }), // outro investimento
      makeDividend({ id: 'd4', status: 'anunciado', totalAmount: 999 }), // ainda não recebido
    ]
    expect(trailingTwelveMonthDividends(dividends, 'inv-1', USD_TO_EUR, asOf)).toBe(5)
  })

  it('converte dividendos em USD para EUR', () => {
    const dividends = [makeDividend({ currency: 'USD', totalAmount: 10 })]
    expect(trailingTwelveMonthDividends(dividends, 'inv-1', USD_TO_EUR, asOf)).toBe(9)
  })
})

describe('dividendYieldOnCost / dividendYieldOnValue', () => {
  const asOf = new Date('2026-07-29')

  it('calcula o yield sobre o custo e sobre o valor de mercado', () => {
    const inv = makeInvestment({ quantity: 10, avgCost: 90, currentPrice: 100 })
    const dividends = [makeDividend({ totalAmount: 45 })] // 45€ TTM
    expect(dividendYieldOnCost(inv, dividends, USD_TO_EUR, asOf)).toBeCloseTo(5, 5) // 45/900
    expect(dividendYieldOnValue(inv, dividends, USD_TO_EUR, asOf)).toBeCloseTo(4.5, 5) // 45/1000
  })
})

describe('ytdDividendsTotal', () => {
  it('soma apenas dividendos recebidos desde o início do ano', () => {
    const asOf = new Date('2026-07-29')
    const dividends = [
      makeDividend({ id: 'd1', paymentDate: '2026-03-01', totalAmount: 5 }),
      makeDividend({ id: 'd2', paymentDate: '2025-12-01', totalAmount: 999 }),
    ]
    expect(ytdDividendsTotal(dividends, USD_TO_EUR, asOf)).toBe(5)
  })
})

describe('monthlyDividendSeries', () => {
  it('agrega dividendos recebidos por mês nos últimos N meses', () => {
    const asOf = new Date('2026-07-15')
    const dividends = [
      makeDividend({ paymentDate: '2026-07-01', totalAmount: 5 }),
      makeDividend({ paymentDate: '2026-06-10', totalAmount: 3 }),
      makeDividend({ paymentDate: '2024-01-01', totalAmount: 999 }), // fora da janela de 3 meses
    ]
    const series = monthlyDividendSeries(dividends, USD_TO_EUR, 3, asOf)
    expect(series).toHaveLength(3)
    expect(series[series.length - 1]).toEqual({ mes: '07', total: 5 })
    expect(series[series.length - 2]).toEqual({ mes: '06', total: 3 })
  })
})

describe('upcomingDividends', () => {
  it('devolve apenas dividendos anunciados dentro da janela, ordenados por data de pagamento', () => {
    const asOf = new Date('2026-07-01')
    const investments = [makeInvestment({ id: 'inv-1', ticker: 'VWCE' })]
    const dividends = [
      makeDividend({ id: 'd1', status: 'anunciado', paymentDate: '2026-08-01' }),
      makeDividend({ id: 'd2', status: 'anunciado', paymentDate: '2026-07-10' }),
      makeDividend({ id: 'd3', status: 'anunciado', paymentDate: '2027-01-01' }), // fora da janela de 90 dias
      makeDividend({ id: 'd4', status: 'recebido', paymentDate: '2026-07-15' }), // já recebido
    ]
    const result = upcomingDividends(dividends, investments, 90, asOf)
    expect(result.map(r => r.dividend.id)).toEqual(['d2', 'd1'])
    expect(result[0].investment?.ticker).toBe('VWCE')
  })
})

describe('receivedDividendsHistory', () => {
  it('devolve apenas dividendos recebidos, mais recentes primeiro, limitados ao máximo pedido', () => {
    const investments = [makeInvestment({ id: 'inv-1', ticker: 'VWCE' })]
    const dividends = [
      makeDividend({ id: 'd1', status: 'recebido', paymentDate: '2026-05-01' }),
      makeDividend({ id: 'd2', status: 'recebido', paymentDate: '2026-06-15' }),
      makeDividend({ id: 'd3', status: 'anunciado', paymentDate: '2026-07-01' }),
    ]
    const result = receivedDividendsHistory(dividends, investments, 10)
    expect(result.map(r => r.dividend.id)).toEqual(['d2', 'd1'])
    expect(result[0].investment?.ticker).toBe('VWCE')
  })

  it('respeita o limite máximo de itens', () => {
    const dividends = Array.from({ length: 5 }, (_, i) =>
      makeDividend({ id: `d${i}`, status: 'recebido', paymentDate: `2026-0${i + 1}-01` }))
    expect(receivedDividendsHistory(dividends, [], 2)).toHaveLength(2)
  })
})

describe('allocationBy', () => {
  it('agrega valor de mercado por chave e ordena por valor decrescente', () => {
    const investments = [
      makeInvestment({ id: 'a', platform: 'XTB', quantity: 10, currentPrice: 100 }),
      makeInvestment({ id: 'b', platform: 'DEGIRO', quantity: 1, currentPrice: 2000 }),
      makeInvestment({ id: 'c', platform: 'XTB', quantity: 5, currentPrice: 100 }),
    ]
    const result = allocationBy(investments, USD_TO_EUR, inv => inv.platform)
    expect(result).toEqual([
      { key: 'DEGIRO', valueEur: 2000 },
      { key: 'XTB', valueEur: 1500 },
    ])
  })
})
