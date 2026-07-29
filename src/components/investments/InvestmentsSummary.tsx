import { Coins, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { KPICard } from '../ui/KPICard'
import { eur } from './investmentsHelpers'

type Props = {
  marketValueEur: number
  costBasisEur: number
  plAbsEur: number
  ytdDividendsEur: number
}

export function InvestmentsSummary({ marketValueEur, costBasisEur, plAbsEur, ytdDividendsEur }: Props) {
  const plPct = costBasisEur > 0 ? (plAbsEur / costBasisEur) * 100 : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard title="Valor de Mercado" value={eur(marketValueEur)} subtitle="Consolidado em EUR"
        icon={Wallet} variant="blue" index={0} />
      <KPICard title="Custo Total" value={eur(costBasisEur)} subtitle="Investido (preço médio × qtd.)"
        icon={Wallet} variant="neutral" index={1} />
      <KPICard title="P/L Não Realizado" value={eur(plAbsEur)} subtitle={`${plPct >= 0 ? '+' : ''}${plPct.toFixed(1)}% sobre o custo`}
        icon={plAbsEur >= 0 ? TrendingUp : TrendingDown} variant={plAbsEur >= 0 ? 'green' : 'red'} index={2} />
      <KPICard title="Dividendos (Ano)" value={eur(ytdDividendsEur)} subtitle="Recebidos este ano"
        icon={Coins} variant="amber" index={3} />
    </div>
  )
}
