import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from './ui/Card'
import { Calculator, Home, PiggyBank, TrendingUp } from 'lucide-react'

const eur = (v: number) => Number.isFinite(v) ? v.toLocaleString('pt-PT', { style:'currency', currency:'EUR', minimumFractionDigits:2 }) : '—'
const pctFmt = (v: number) => `${v.toFixed(1)}%`

type CalcId = 'loan' | 'savings' | 'compound' | 'rule5030'

export default function Calculators() {
  const [active, setActive] = useState<CalcId>('loan')

  // Empréstimo
  const [lCapital, setLCapital] = useState(150000)
  const [lRate,    setLRate]    = useState(3.5)
  const [lYears,   setLYears]   = useState(30)

  // Poupança
  const [sTarget,   setSTarget]   = useState(10000)
  const [sMonths,   setSMonths]   = useState(24)
  const [sReturn,   setSReturn]   = useState(3)

  // Juro composto
  const [cInitial,  setCInitial]  = useState(1000)
  const [cMonthly,  setCMonthly]  = useState(100)
  const [cRate,     setCRate]     = useState(7)
  const [cYears,    setCYears]    = useState(10)

  // 50/30/20
  const [rIncome, setRIncome] = useState(1500)
  const [rNec, setRNec] = useState(50)
  const [rWant, setRWant] = useState(30)
  const [rSave, setRSave] = useState(20)

  // Cálculos de empréstimo (fórmula PMT)
  const lMonthRate = lRate / 100 / 12
  const lMonths    = lYears * 12
  const lPmt       = lCapital && lMonths
    ? lMonthRate === 0
      ? lCapital / lMonths
      : (lCapital * lMonthRate * Math.pow(1 + lMonthRate, lMonths)) / (Math.pow(1 + lMonthRate, lMonths) - 1)
    : 0
  const lTotal = lPmt * lMonths
  const lInterest = lTotal - lCapital

  // Cálculo de poupança mensal necessária
  const sMonthRate = sReturn / 100 / 12
  const sNeeded = sTarget && sMonths
    ? sMonthRate === 0
      ? sTarget / sMonths
      : (sTarget * sMonthRate) / (Math.pow(1 + sMonthRate, sMonths) - 1)
    : 0

  // Juro composto
  const compoundResult = (() => {
    let balance = cInitial
    const months = cYears * 12
    const mRate  = cRate / 100 / 12
    for (let i = 0; i < months; i++) {
      balance = balance * (1 + mRate) + cMonthly
    }
    return balance
  })()
  const cContributed = cInitial + cMonthly * cYears * 12
  const cEarned = compoundResult - cContributed

  // 50/30/20
  const rTotal = rNec + rWant + rSave
  const rNecVal  = rIncome * rNec  / 100
  const rWantVal = rIncome * rWant / 100
  const rSaveVal = rIncome * rSave / 100

  const tabs: { id: CalcId; label: string; icon: typeof Calculator }[] = [
    { id: 'loan',    label: 'Empréstimo',   icon: Home },
    { id: 'savings', label: 'Poupança',     icon: PiggyBank },
    { id: 'compound',label: 'Juro Composto',icon: TrendingUp },
    { id: 'rule5030',label: 'Regra 50/30/20',icon: Calculator },
  ]

  const numInput = (label: string, value: number, onChange: (v: number) => void, opts?: { min?: number; max?: number; step?: number; suffix?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input type="number" value={value} min={opts?.min ?? 0} max={opts?.max} step={opts?.step ?? 1}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="input pr-10"
        />
        {opts?.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[rgb(var(--text-muted))] font-medium">{opts.suffix}</span>
        )}
      </div>
    </div>
  )

  const resultRow = (label: string, value: string, highlight?: boolean) => (
    <div className={`flex justify-between items-center py-2.5 border-b border-[rgba(var(--border),var(--border-alpha))] last:border-0 ${highlight ? 'font-bold' : ''}`}>
      <span className={highlight ? 'text-[rgb(var(--text))]' : 'text-[rgb(var(--text-muted))] text-sm'}>{label}</span>
      <span className={highlight ? 'text-[rgb(var(--brand))] text-lg' : 'text-[rgb(var(--text))] font-semibold'}>{value}</span>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                active === t.id
                  ? 'border-[rgba(var(--brand),0.5)] bg-[rgba(var(--brand),0.08)] text-[rgb(var(--brand))]'
                  : 'border-[rgba(var(--border),var(--border-alpha))] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
              }`}
            >
              <Icon size={16} />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

      <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {active === 'loan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Dados do Empréstimo</h3>
              <div className="space-y-4">
                {numInput('Montante (€)', lCapital, setLCapital, { min: 1000, step: 1000, suffix: '€' })}
                {numInput('Taxa de Juro Anual', lRate, setLRate, { min: 0.1, max: 30, step: 0.1, suffix: '%' })}
                {numInput('Prazo', lYears, setLYears, { min: 1, max: 50, suffix: 'anos' })}
              </div>
            </Card>
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Resultado</h3>
              {resultRow('Prestação mensal', eur(lPmt), true)}
              {resultRow('Total pago', eur(lTotal))}
              {resultRow('Capital emprestado', eur(lCapital))}
              {resultRow('Juros totais', eur(lInterest))}
              {resultRow('Custo do crédito', pctFmt((lInterest/lCapital)*100))}
            </Card>
          </div>
        )}

        {active === 'savings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Objetivo de Poupança</h3>
              <div className="space-y-4">
                {numInput('Objetivo (€)', sTarget, setSTarget, { min: 100, step: 100, suffix: '€' })}
                {numInput('Prazo', sMonths, setSMonths, { min: 1, max: 600, suffix: 'meses' })}
                {numInput('Rendimento anual esperado', sReturn, setSReturn, { min: 0, max: 30, step: 0.1, suffix: '%' })}
              </div>
            </Card>
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Resultado</h3>
              {resultRow('Poupança mensal necessária', eur(sNeeded), true)}
              {resultRow('Objetivo total', eur(sTarget))}
              {resultRow('Prazo', `${sMonths} meses (${(sMonths/12).toFixed(1)} anos)`)}
              {resultRow('Total que vai poupar', eur(sNeeded * sMonths))}
            </Card>
          </div>
        )}

        {active === 'compound' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Dados do Investimento</h3>
              <div className="space-y-4">
                {numInput('Capital inicial (€)', cInitial, setCInitial, { min: 0, step: 100, suffix: '€' })}
                {numInput('Contribuição mensal (€)', cMonthly, setCMonthly, { min: 0, step: 10, suffix: '€' })}
                {numInput('Rendimento anual esperado', cRate, setCRate, { min: 0, max: 50, step: 0.5, suffix: '%' })}
                {numInput('Prazo', cYears, setCYears, { min: 1, max: 50, suffix: 'anos' })}
              </div>
            </Card>
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Projeção com Juro Composto</h3>
              {resultRow('Valor final', eur(compoundResult), true)}
              {resultRow('Total investido', eur(cContributed))}
              {resultRow('Juros ganhos', eur(cEarned))}
              {resultRow('Multiplicador', `${(compoundResult / (cContributed || 1)).toFixed(2)}×`)}
              <div className="mt-4 p-3 rounded-xl bg-[rgba(var(--surface-2),0.5)] text-xs text-[rgb(var(--text-muted))]">
                O juro composto é calculado mensalmente. Os valores são estimativas; o rendimento real pode variar.
              </div>
            </Card>
          </div>
        )}

        {active === 'rule5030' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">O meu orçamento</h3>
              <div className="space-y-4">
                {numInput('Rendimento mensal líquido (€)', rIncome, setRIncome, { min: 100, step: 50, suffix: '€' })}
                {numInput('% Necessidades', rNec, setRNec, { min: 0, max: 100, suffix: '%' })}
                {numInput('% Vontades', rWant, setRWant, { min: 0, max: 100, suffix: '%' })}
                {numInput('% Poupança / Investimento', rSave, setRSave, { min: 0, max: 100, suffix: '%' })}
              </div>
              {rTotal !== 100 && (
                <div className="mt-3 text-xs text-amber-400 flex items-center gap-1">
                  ⚠ Total: {rTotal}% (deve ser 100%)
                </div>
              )}
            </Card>
            <Card>
              <h3 className="font-bold text-[rgb(var(--text))] mb-4">Distribuição Mensal</h3>
              {resultRow('Necessidades', eur(rNecVal), true)}
              {resultRow('Vontades', eur(rWantVal), true)}
              {resultRow('Poupança', eur(rSaveVal), true)}
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Necessidades', val: rNecVal, fill: '#93c5fd', pct: rNec },
                  { label: 'Vontades',     val: rWantVal,fill: '#fde68a', pct: rWant },
                  { label: 'Poupança',     val: rSaveVal,fill: '#86efac', pct: rSave },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[rgb(var(--text-muted))]">{item.label}</span>
                      <span className="font-semibold text-[rgb(var(--text))]">{item.pct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${item.pct}%`, background: item.fill }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  )
}
