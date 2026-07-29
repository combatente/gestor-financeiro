import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LineChart, Plus } from 'lucide-react'
import { useFirestore } from '../hooks/useFirestore'
import { InvestmentForm } from './investments/InvestmentForm'
import { DividendForm } from './investments/DividendForm'
import { InvestmentsSummary } from './investments/InvestmentsSummary'
import { InvestmentsAllocationCharts } from './investments/InvestmentsAllocationCharts'
import { InvestmentsTable } from './investments/InvestmentsTable'
import { DividendsPanel } from './investments/DividendsPanel'
import { FxRateEditor } from './investments/FxRateEditor'
import {
  ASSET_TYPE_CONFIG, CURRENCY_LABELS, PLATFORM_CONFIG,
  allocationBy, monthlyDividendSeries, portfolioTotals, receivedDividendsHistory, upcomingDividends, ytdDividendsTotal,
} from './investments/investmentsHelpers'

export default function Investments() {
  const {
    investments, dividends, fxRate, saving, error,
    addInvestment, removeInvestment, addDividend, removeDividend, setFxRate,
  } = useFirestore()

  const [showInvestmentForm, setShowInvestmentForm] = useState(false)
  const [showDividendForm, setShowDividendForm] = useState(false)

  const usdToEur = fxRate.usdToEur

  const totals = useMemo(() => portfolioTotals(investments, usdToEur), [investments, usdToEur])
  const ytdDividends = useMemo(() => ytdDividendsTotal(dividends, usdToEur), [dividends, usdToEur])

  const byPlatform = useMemo(
    () => allocationBy(investments, usdToEur, inv => inv.platform)
      .map(({ key, valueEur }) => ({ name: PLATFORM_CONFIG[key].label, value: valueEur, color: PLATFORM_CONFIG[key].color })),
    [investments, usdToEur]
  )

  const byAssetType = useMemo(
    () => allocationBy(investments, usdToEur, inv => inv.assetType)
      .map(({ key, valueEur }) => ({ name: ASSET_TYPE_CONFIG[key].label, value: valueEur, color: ASSET_TYPE_CONFIG[key].color })),
    [investments, usdToEur]
  )

  const byCurrency = useMemo(
    () => allocationBy(investments, usdToEur, inv => inv.currency)
      .map(({ key, valueEur }) => ({ name: CURRENCY_LABELS[key], value: valueEur })),
    [investments, usdToEur]
  )

  const upcoming = useMemo(() => upcomingDividends(dividends, investments, 90), [dividends, investments])
  const received = useMemo(() => receivedDividendsHistory(dividends, investments, 10), [dividends, investments])
  const monthlySeries = useMemo(() => monthlyDividendSeries(dividends, usdToEur, 12), [dividends, usdToEur])

  if (error) {
    return (
      <div className="p-4 rounded-xl text-sm"
        style={{ background: 'rgba(var(--pastel-red-bg),0.4)', color: 'rgb(var(--pastel-red-text))' }}>
        Erro ao carregar dados: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showInvestmentForm && (
          <InvestmentForm
            saving={saving}
            onClose={() => setShowInvestmentForm(false)}
            onSubmit={async (data) => { await addInvestment(data); setShowInvestmentForm(false) }}
          />
        )}
        {showDividendForm && (
          <DividendForm
            investments={investments.filter(i => i.assetType !== 'CRYPTO')}
            saving={saving}
            onClose={() => setShowDividendForm(false)}
            onSubmit={async (data) => { await addDividend(data); setShowDividendForm(false) }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Investimentos</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            Ações, ETFs e criptomoedas em DEGIRO, XTB e YouHodler
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FxRateEditor usdToEur={usdToEur} saving={saving} onSave={setFxRate} />
          <button className="btn btn-secondary" onClick={() => setShowDividendForm(true)} disabled={saving}>
            <Plus size={16} /> Dividendo
          </button>
          <button className="btn btn-primary" onClick={() => setShowInvestmentForm(true)} disabled={saving}>
            <Plus size={16} /> Nova Posição
          </button>
        </div>
      </div>

      {investments.length === 0 ? (
        <InvestmentsTable investments={investments} dividends={dividends} usdToEur={usdToEur} onRemove={removeInvestment} />
      ) : (
        <>
          <InvestmentsSummary
            marketValueEur={totals.marketValueEur}
            costBasisEur={totals.costBasisEur}
            plAbsEur={totals.plAbsEur}
            ytdDividendsEur={ytdDividends}
          />

          <InvestmentsAllocationCharts byPlatform={byPlatform} byAssetType={byAssetType} byCurrency={byCurrency} />

          <InvestmentsTable investments={investments} dividends={dividends} usdToEur={usdToEur} onRemove={removeInvestment} />

          <DividendsPanel upcoming={upcoming} received={received} monthlySeries={monthlySeries} onRemoveReceived={removeDividend} />
        </>
      )}

      {investments.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
          <LineChart size={14} /> Comece por criar uma posição para ver KPIs, alocação e dividendos.
        </p>
      )}
    </div>
  )
}
