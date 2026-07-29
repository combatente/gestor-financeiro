import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Plus, AlertTriangle, TrendingDown, Calendar, Percent, Clock } from 'lucide-react'
import { useFirestore, type AddDebtInput } from '../hooks/useFirestore'
import { DebtForm } from './DebtForm'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Crédito Habitação':   { bg: 'rgba(var(--pastel-blue-bg),0.5)',   text: 'rgb(var(--pastel-blue-text))' },
  'Empréstimo Pessoal':  { bg: 'rgba(var(--pastel-purple-bg),0.5)', text: 'rgb(var(--pastel-purple-text))' },
  'Cartão de Crédito':   { bg: 'rgba(var(--pastel-red-bg),0.5)',    text: 'rgb(var(--pastel-red-text))' },
  'Crédito Automóvel':   { bg: 'rgba(var(--pastel-amber-bg),0.5)',  text: 'rgb(var(--pastel-amber-text))' },
}

function getCategoryStyle(cat: string | null) {
  return CATEGORY_COLORS[cat ?? ''] ?? {
    bg:   'rgba(var(--surface-2),0.6)',
    text: 'rgb(var(--text-muted))',
  }
}

function debtStatus(debt: { currentAmount: number; targetAmount: number; dueDate?: string }) {
  const pct = debt.targetAmount > 0
    ? ((debt.targetAmount - debt.currentAmount) / debt.targetAmount) * 100
    : 0
  const isPaid = debt.currentAmount <= 0

  if (isPaid) return { label: 'Paga', color: 'rgb(var(--pastel-green-text))', bg: 'rgba(var(--pastel-green-bg),0.5)' }

  if (debt.dueDate) {
    const days = Math.ceil((new Date(debt.dueDate).getTime() - Date.now()) / 86_400_000)
    if (days < 0)  return { label: 'Vencida', color: 'rgb(var(--pastel-red-text))', bg: 'rgba(var(--pastel-red-bg),0.5)' }
    if (days < 30) return { label: `${days}d restantes`, color: 'rgb(var(--pastel-amber-text))', bg: 'rgba(var(--pastel-amber-bg),0.5)' }
  }

  if (pct >= 75) return { label: `${pct.toFixed(0)}% pago`, color: 'rgb(var(--pastel-green-text))', bg: 'rgba(var(--pastel-green-bg),0.5)' }
  return { label: `${pct.toFixed(0)}% pago`, color: 'rgb(var(--pastel-blue-text))', bg: 'rgba(var(--pastel-blue-bg),0.5)' }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DebtManagement() {
  const { debts, transacoes, addDebt } = useFirestore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError]   = useState('')

  const totalDebt = useMemo(() =>
    debts.reduce((s, d) => s + (d.currentAmount || 0), 0), [debts])

  const totalOriginal = useMemo(() =>
    debts.reduce((s, d) => s + (d.targetAmount || 0), 0), [debts])

  const totalPaid = totalOriginal - totalDebt

  const debtTx = useMemo(() =>
    transacoes
      .filter(t => t.type === 'divida')
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [transacoes])

  const handleAddDebt = useCallback(async (input: AddDebtInput) => {
    setFormError('')
    try {
      await addDebt({ ...input, status: (input as any).status || 'active' })
      setIsFormOpen(false)
    } catch (e) {
      setFormError('Erro ao adicionar dívida. Verifique os dados.')
      throw e
    }
  }, [addDebt])

  const overallPct = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Form modal */}
      <AnimatePresence>
        {isFormOpen && (
          <DebtForm onClose={() => setIsFormOpen(false)} onSubmit={handleAddDebt} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Dívidas</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            Controle e acompanhe o pagamento das suas dívidas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
          <Plus size={16} /> Nova Dívida
        </button>
      </div>

      {formError && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(var(--pastel-red-bg),0.5)', color: 'rgb(var(--pastel-red-text))' }}>
          {formError}
        </p>
      )}

      {/* KPI cards */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="kpi-red flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: 'rgb(var(--pastel-red-text))' }} />
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                Saldo em Dívida
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--pastel-red-text))' }}>
              {eur(totalDebt)}
            </div>
            <div className="text-xs text-[rgb(var(--text-muted))]">{debts.length} dívida{debts.length !== 1 ? 's' : ''} ativas</div>
          </Card>

          <Card className="kpi-green flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} style={{ color: 'rgb(var(--pastel-green-text))' }} />
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                Total Pago
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--pastel-green-text))' }}>
              {eur(totalPaid)}
            </div>
            <div className="text-xs text-[rgb(var(--text-muted))]">de {eur(totalOriginal)} contratados</div>
          </Card>

          {/* Overall progress */}
          <Card className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
              Progresso Global
            </span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-[rgb(var(--text))]">{overallPct.toFixed(0)}%</span>
              <span className="text-xs text-[rgb(var(--text-muted))] mb-1">pago</span>
            </div>
            <div className="h-2 rounded-full w-full" style={{ background: 'rgba(var(--border),0.12)' }}>
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%`, background: 'rgb(var(--pastel-green-text))' }} />
            </div>
          </Card>
        </div>
      )}

      {/* Debt cards */}
      {debts.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sem dívidas registadas"
          description="Clique em 'Nova Dívida' para começar a acompanhar os seus créditos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map((debt, idx) => {
            const catStyle = getCategoryStyle(debt.category ?? null)
            const paid     = Math.max(0, (debt.targetAmount || 0) - (debt.currentAmount || 0))
            const pct      = debt.targetAmount > 0 ? Math.min(100, (paid / debt.targetAmount) * 100) : 0
            const status   = debtStatus(debt)
            const isPaid   = (debt.currentAmount || 0) <= 0

            return (
              <motion.div key={debt.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card flex flex-col gap-4"
                style={{ borderLeft: `3px solid ${catStyle.text}` }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[rgb(var(--text))] truncate">{debt.name}</h3>
                    {debt.description && (
                      <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 truncate">{debt.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: catStyle.bg, color: catStyle.text }}>
                      {debt.category || 'Outro'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Key numbers */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-[rgb(var(--text-muted))] text-xs">Saldo Atual</span>
                    <span className="font-bold" style={{ color: isPaid ? 'rgb(var(--pastel-green-text))' : 'rgb(var(--pastel-red-text))' }}>
                      {eur(debt.currentAmount || 0)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[rgb(var(--text-muted))] text-xs">Montante Inicial</span>
                    <span className="font-medium text-[rgb(var(--text))]">{eur(debt.targetAmount || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Percent size={12} className="text-[rgb(var(--text-muted))]" />
                    <span className="text-[rgb(var(--text-muted))] text-xs">Juro:</span>
                    <span className="font-medium text-[rgb(var(--pastel-amber-text))]">{debt.interestRate}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[rgb(var(--text-muted))]" />
                    <span className="text-[rgb(var(--text-muted))] text-xs">Prestação:</span>
                    <span className="font-medium text-[rgb(var(--text))]">{eur(debt.minimumPayment)}</span>
                  </div>
                  {debt.dueDate && (
                    <div className="col-span-2 flex items-center gap-1.5">
                      <Calendar size={12} className="text-[rgb(var(--text-muted))]" />
                      <span className="text-[rgb(var(--text-muted))] text-xs">Vencimento:</span>
                      <span className="font-medium text-[rgb(var(--text))]">
                        {new Date(debt.dueDate).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[rgb(var(--text-muted))]">Progresso de amortização</span>
                    <span className="font-semibold text-[rgb(var(--text))]">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full w-full" style={{ background: 'rgba(var(--border),0.12)' }}>
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: isPaid ? 'rgb(var(--pastel-green-text))' : catStyle.text }} />
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))] mt-1">
                    {eur(paid)} pagos de {eur(debt.targetAmount || 0)}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Transaction history */}
      {debtTx.length > 0 && (
        <Card>
          <div className="section-header mb-4">
            <div className="section-title">
              <TrendingDown size={16} />
              Movimentos de Dívida
            </div>
          </div>
          <div className="space-y-1">
            {debtTx.slice(0, 10).map(t => {
              const isPayment = t.valor > 0
              return (
                <div key={t.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isPayment ? 'bg-[rgba(var(--pastel-green-bg),0.5)]' : 'bg-[rgba(var(--pastel-red-bg),0.5)]'
                    }`}>
                      <TrendingDown size={14} style={{
                        color: isPayment ? 'rgb(var(--pastel-green-text))' : 'rgb(var(--pastel-red-text))'
                      }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[rgb(var(--text))]">
                        {isPayment ? 'Pagamento' : 'Encargo'}
                      </p>
                      {t.descricao && <p className="text-xs text-[rgb(var(--text-muted))] truncate">{t.descricao}</p>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold" style={{
                      color: isPayment ? 'rgb(var(--pastel-green-text))' : 'rgb(var(--pastel-red-text))'
                    }}>
                      {isPayment ? '+' : '−'}{eur(Math.abs(t.valor))}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {new Date(t.data).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
