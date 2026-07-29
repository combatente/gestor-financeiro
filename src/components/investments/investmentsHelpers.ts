// Lógica pura do módulo de Investimentos: conversão de moeda, métricas de
// posição, dividendos (TTM/YTD/próximos) e alocação. Sem dependências de
// React — fácil de testar isoladamente.

import type {
  Currency, DividendType, InvestmentAssetType, InvestmentType, Platform,
} from '../../hooks/useFirestore'

export const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  DEGIRO:         { label: 'DEGIRO',         color: '#f97316' },
  XTB:            { label: 'XTB',            color: '#3b82f6' },
  YOUHODLER:      { label: 'YouHodler',      color: '#a78bfa' },
  TRADE_REPUBLIC: { label: 'Trade Republic', color: '#22c55e' },
  OUTRA:          { label: 'Outra',          color: '#94a3b8' },
}

export const ASSET_TYPE_CONFIG: Record<InvestmentAssetType, { label: string; icon: string; color: string }> = {
  ACAO:   { label: 'Ações',         icon: '📈', color: '#93c5fd' },
  ETF:    { label: 'ETFs',          icon: '🧺', color: '#86efac' },
  CRYPTO: { label: 'Criptomoedas', icon: '₿',  color: '#fde68a' },
}

export const CURRENCY_LABELS: Record<Currency, string> = { EUR: '€ Euro', USD: '$ Dólar' }

// ---------- Conversão de moeda ----------

export function toEur(amount: number, currency: Currency, usdToEur: number): number {
  return currency === 'USD' ? amount * usdToEur : amount
}

// ---------- Métricas por posição ----------

export function positionMetrics(inv: InvestmentType, usdToEur: number) {
  const marketValue = inv.quantity * inv.currentPrice
  const costBasis = inv.quantity * inv.avgCost
  const marketValueEur = toEur(marketValue, inv.currency, usdToEur)
  const costBasisEur = toEur(costBasis, inv.currency, usdToEur)
  const plAbsEur = marketValueEur - costBasisEur
  const plPct = costBasisEur > 0 ? (plAbsEur / costBasisEur) * 100 : 0
  return { marketValueEur, costBasisEur, plAbsEur, plPct }
}

export function portfolioTotals(investments: InvestmentType[], usdToEur: number) {
  return investments.reduce(
    (acc, inv) => {
      const m = positionMetrics(inv, usdToEur)
      acc.marketValueEur += m.marketValueEur
      acc.costBasisEur += m.costBasisEur
      acc.plAbsEur += m.plAbsEur
      return acc
    },
    { marketValueEur: 0, costBasisEur: 0, plAbsEur: 0 }
  )
}

// ---------- Dividendos ----------

export function dividendsForInvestment(dividends: DividendType[], investmentId: string): DividendType[] {
  return dividends.filter(d => d.investmentId === investmentId)
}

export function trailingTwelveMonthDividends(
  dividends: DividendType[],
  investmentId: string,
  usdToEur: number,
  asOf: Date = new Date()
): number {
  const cutoff = new Date(asOf)
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  return dividendsForInvestment(dividends, investmentId)
    .filter(d => d.status === 'recebido')
    .filter(d => {
      const payment = new Date(d.paymentDate)
      return payment >= cutoff && payment <= asOf
    })
    .reduce((sum, d) => sum + toEur(d.totalAmount, d.currency, usdToEur), 0)
}

export function dividendYieldOnCost(
  inv: InvestmentType, dividends: DividendType[], usdToEur: number, asOf: Date = new Date()
): number {
  const { costBasisEur } = positionMetrics(inv, usdToEur)
  if (costBasisEur <= 0) return 0
  const ttm = trailingTwelveMonthDividends(dividends, inv.id, usdToEur, asOf)
  return (ttm / costBasisEur) * 100
}

export function dividendYieldOnValue(
  inv: InvestmentType, dividends: DividendType[], usdToEur: number, asOf: Date = new Date()
): number {
  const { marketValueEur } = positionMetrics(inv, usdToEur)
  if (marketValueEur <= 0) return 0
  const ttm = trailingTwelveMonthDividends(dividends, inv.id, usdToEur, asOf)
  return (ttm / marketValueEur) * 100
}

export function ytdDividendsTotal(dividends: DividendType[], usdToEur: number, asOf: Date = new Date()): number {
  const yearStart = new Date(asOf.getFullYear(), 0, 1)
  return dividends
    .filter(d => d.status === 'recebido')
    .filter(d => {
      const payment = new Date(d.paymentDate)
      return payment >= yearStart && payment <= asOf
    })
    .reduce((sum, d) => sum + toEur(d.totalAmount, d.currency, usdToEur), 0)
}

export function monthlyDividendSeries(
  dividends: DividendType[],
  usdToEur: number,
  months: number = 12,
  asOf: Date = new Date()
): { mes: string; total: number }[] {
  const buckets: Record<string, number> = {}
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1)
    // Nota: usar componentes locais (não toISOString) para evitar que a
    // conversão para UTC "role" o mês perto da meia-noite local.
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets[key] = 0
    keys.push(key)
  }

  dividends
    .filter(d => d.status === 'recebido')
    .forEach(d => {
      const key = d.paymentDate.slice(0, 7)
      if (buckets[key] !== undefined) {
        buckets[key] += toEur(d.totalAmount, d.currency, usdToEur)
      }
    })

  return keys.map(key => ({ mes: key.slice(5), total: Math.round(buckets[key] * 100) / 100 }))
}

export type UpcomingDividend = {
  dividend: DividendType
  investment: InvestmentType | undefined
  daysUntilPayment: number
}

export function upcomingDividends(
  dividends: DividendType[],
  investments: InvestmentType[],
  withinDays: number = 90,
  asOf: Date = new Date()
): UpcomingDividend[] {
  const limit = new Date(asOf)
  limit.setDate(limit.getDate() + withinDays)

  const investmentById = new Map(investments.map(inv => [inv.id, inv]))

  return dividends
    .filter(d => d.status === 'anunciado')
    .filter(d => {
      const payment = new Date(d.paymentDate)
      return payment >= asOf && payment <= limit
    })
    .map(d => ({
      dividend: d,
      investment: investmentById.get(d.investmentId),
      daysUntilPayment: Math.ceil((new Date(d.paymentDate).getTime() - asOf.getTime()) / 86_400_000),
    }))
    .sort((a, b) => a.dividend.paymentDate.localeCompare(b.dividend.paymentDate))
}

export type ReceivedDividend = {
  dividend: DividendType
  investment: InvestmentType | undefined
}

export function receivedDividendsHistory(
  dividends: DividendType[],
  investments: InvestmentType[],
  limit: number = 10
): ReceivedDividend[] {
  const investmentById = new Map(investments.map(inv => [inv.id, inv]))

  return dividends
    .filter(d => d.status === 'recebido')
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
    .slice(0, limit)
    .map(d => ({ dividend: d, investment: investmentById.get(d.investmentId) }))
}

// ---------- Alocação ----------

export function allocationBy<K extends string>(
  investments: InvestmentType[],
  usdToEur: number,
  keyFn: (inv: InvestmentType) => K
): { key: K; valueEur: number }[] {
  const map = new Map<K, number>()
  investments.forEach(inv => {
    const { marketValueEur } = positionMetrics(inv, usdToEur)
    const key = keyFn(inv)
    map.set(key, (map.get(key) ?? 0) + marketValueEur)
  })
  return Array.from(map.entries())
    .map(([key, valueEur]) => ({ key, valueEur }))
    .sort((a, b) => b.valueEur - a.valueEur)
}
