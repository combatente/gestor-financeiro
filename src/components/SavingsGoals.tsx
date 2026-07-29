import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PiggyBank, Target, Calendar, Plus, X, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, AlertTriangle, CheckCircle, Clock
} from 'lucide-react'
import { useFirestore } from '../hooks/useFirestore'
import type { GoalType, Transacao } from '../hooks/useFirestore'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetClass = 'CASH' | 'STOCKS' | 'ETFS' | 'CRYPTO' | 'RETIREMENT' | 'OTHER'

const ASSET_CLASS_CONFIG: { [k in AssetClass]: { label: string; icon: string; color: string } } = {
  CASH:       { label: 'Conta Poupança',     icon: '💵', color: '#86efac' },
  STOCKS:     { label: 'Ações',              icon: '📈', color: '#93c5fd' },
  ETFS:       { label: 'ETFs / Fundos',      icon: '🧺', color: '#a78bfa' },
  CRYPTO:     { label: 'Criptomoedas',       icon: '₿',  color: '#fde68a' },
  RETIREMENT: { label: 'PPR / Reforma',      icon: '🏖️', color: '#f9a8d4' },
  OTHER:      { label: 'Outros',             icon: '📦', color: '#fb923c' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

function normalizeDateInput(s: string): string | null {
  const n = s.replace(/\//g, '-')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null
  if (isNaN(new Date(n).getTime())) return null
  return n
}

function calcMetrics(goal: GoalType) {
  const target  = goal.targetAmount  || 0
  const current = goal.currentAmount || 0
  const remaining = Math.max(0, target - current)
  const progress  = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const isCompleted = progress >= 100

  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null
  const startDate  = goal.startDate  ? new Date(goal.startDate)  : new Date()

  const daysRemaining = targetDate
    ? Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000))
    : null

  const totalMs   = targetDate ? targetDate.getTime() - startDate.getTime() : 1
  const elapsedMs = Date.now() - startDate.getTime()
  const timeRatio = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0
  const finRatio  = target > 0 ? current / target : 0

  let status: 'ok' | 'late' | 'risk' | 'done' = 'ok'
  if (isCompleted) status = 'done'
  else if (daysRemaining !== null && daysRemaining <= 60 && remaining > 0) status = 'risk'
  else if (finRatio < timeRatio * 0.9) status = 'late'

  const statusMap = {
    ok:   { label: 'No Prazo',   color: 'rgb(var(--pastel-green-text))',  bg: 'rgba(var(--pastel-green-bg),0.5)',  icon: CheckCircle },
    late: { label: 'Atrasado',   color: 'rgb(var(--pastel-amber-text))',  bg: 'rgba(var(--pastel-amber-bg),0.5)',  icon: Clock },
    risk: { label: 'Em Risco',   color: 'rgb(var(--pastel-red-text))',    bg: 'rgba(var(--pastel-red-bg),0.5)',    icon: AlertTriangle },
    done: { label: 'Concluído',  color: 'rgb(var(--pastel-green-text))',  bg: 'rgba(var(--pastel-green-bg),0.5)',  icon: CheckCircle },
  }

  return { progress, isCompleted, remaining, daysRemaining, targetDate, status, statusInfo: statusMap[status] }
}

// ─── Progress Ring ─────────────────────────────────────────────────────────--

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 32, circ = 2 * Math.PI * r
  return (
    <svg width="80" height="80" className="-rotate-90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(var(--border),0.12)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  )
}

// ─── Goal Form Modal ──────────────────────────────────────────────────────────

interface GoalFormProps {
  saving: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string; description: string; targetAmount: number
    initialAmount: number; targetDate: string; assetClass: AssetClass
  }) => Promise<void>
}

function GoalForm({ saving, onClose, onSubmit }: GoalFormProps) {
  const [name, setName]         = useState('')
  const [description, setDesc]  = useState('')
  const [targetAmt, setTarget]  = useState('')
  const [initialAmt, setInitial]= useState('0')
  const [targetDate, setDate]   = useState('')
  const [assetClass, setAsset]  = useState<AssetClass>('CASH')
  const [err, setErr]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const target  = Number(targetAmt.replace(',', '.'))
    const initial = Number(initialAmt.replace(',', '.'))
    const date    = normalizeDateInput(targetDate)
    if (!name.trim() || !date || isNaN(target) || target <= 0 || isNaN(initial) || initial > target) {
      setErr('Verifique todos os campos: nome, datas e valores.')
      return
    }
    setErr('')
    try {
      await onSubmit({ name: name.trim(), description, targetAmount: target, initialAmount: initial, targetDate: date, assetClass })
    } catch {
      setErr('Erro ao guardar. Tente novamente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md shadow-2xl" style={{ background: 'rgb(var(--surface))' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(var(--pastel-green-bg),0.6)' }}>
              <Target size={16} style={{ color: 'rgb(var(--pastel-green-text))' }} />
            </div>
            <h3 className="font-semibold text-[rgb(var(--text))]">Nova Meta de Poupança</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Nome da Meta *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Fundo de Emergência" required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Descrição (opcional)</label>
            <textarea className="input resize-none" rows={2} value={description}
              onChange={e => setDesc(e.target.value)} placeholder="Para que serve esta poupança?" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Classe de Ativo</label>
            <select className="input" value={assetClass}
              onChange={e => setAsset(e.target.value as AssetClass)}>
              {Object.entries(ASSET_CLASS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Objetivo Total (€) *</label>
              <input className="input" inputMode="decimal" value={targetAmt}
                onChange={e => setTarget(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 10 000" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Já poupado (€)</label>
              <input className="input" inputMode="decimal" value={initialAmt}
                onChange={e => setInitial(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="0" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Data Alvo *</label>
            <input className="input" type="date" value={targetDate}
              onChange={e => setDate(e.target.value)} required />
          </div>

          {err && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(var(--pastel-red-bg),0.5)', color: 'rgb(var(--pastel-red-text))' }}>
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'A guardar…' : 'Criar Meta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SavingsGoals() {
  const { goals, transacoes, addGoal, updateGoal, adicionarTransacao, saving, error } = useFirestore()

  const [showForm, setShowForm]     = useState(false)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  // Transaction history (manual contributions/withdrawals only)
  const goalHistory = useMemo(() => {
    return transacoes
      .filter(t => t.type === 'poupanca' && t.goalId && !String(t.descricao).includes('Registo inicial da meta:'))
      .map(t => ({
        id:       t.id!,
        date:     new Date(t.data),
        desc:     t.descricao || (Number(t.valor) > 0 ? 'Contribuição manual' : 'Levantamento manual'),
        amount:   Math.abs(Number(t.valor)),
        positive: Number(t.valor) > 0,
        goalName: goals.find(g => g.id === t.goalId)?.name ?? t.categoria ?? '—',
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [transacoes, goals])

  // Asset distribution
  const { totalInvested, distribution } = useMemo(() => {
    let total = 0
    const dist: Partial<Record<AssetClass, number>> = {}
    goals.forEach(g => {
      const amt = g.currentAmount || 0
      total += amt
      const ac = g.assetClass as AssetClass
      dist[ac] = (dist[ac] || 0) + amt
    })
    return {
      totalInvested: total,
      distribution: Object.entries(dist)
        .sort(([, a], [, b]) => (b as number) - (a as number)) as [AssetClass, number][],
    }
  }, [goals])

  // Add goal
  const handleAddGoal = useCallback(async (data: {
    name: string; description: string; targetAmount: number
    initialAmount: number; targetDate: string; assetClass: AssetClass
  }) => {
    const ref = await addGoal({
      name: data.name,
      description: data.description || '',
      targetAmount: data.targetAmount,
      currentAmount: data.initialAmount,
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: data.targetDate,
      assetClass: data.assetClass,
    })
    if (ref?.id && data.initialAmount > 0) {
      await adicionarTransacao({
        type: 'poupanca', valor: data.initialAmount,
        data: new Date().toISOString().slice(0, 10),
        categoria: data.name,
        descricao: `Registo inicial da meta: ${data.name}.`,
        goalId: ref.id,
      } as Transacao)
    }
    setShowForm(false)
  }, [addGoal, adicionarTransacao])

  // Contribute / withdraw
  const handleTransaction = useCallback(async (goalId: string, type: 'in' | 'out') => {
    const raw  = Number(inputValues[goalId])
    if (!raw || raw <= 0 || saving) return
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    if (type === 'out' && raw > (goal.currentAmount || 0)) {
      alert('Não pode retirar mais do que o saldo atual.')
      return
    }
    const newAmt = (goal.currentAmount || 0) + (type === 'in' ? raw : -raw)
    await updateGoal(goalId, { currentAmount: newAmt })
    await adicionarTransacao({
      type: 'poupanca', valor: type === 'in' ? raw : -raw,
      data: new Date().toISOString().slice(0, 10),
      categoria: goal.name,
      descricao: `${type === 'in' ? 'Contribuição' : 'Levantamento'} manual — ${goal.name}.`,
      goalId,
    } as Transacao)
    setInputValues(prev => { const s = { ...prev }; delete s[goalId]; return s })
  }, [inputValues, goals, saving, updateGoal, adicionarTransacao])

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
      {/* Portal for form modal */}
      <AnimatePresence>
        {showForm && (
          <GoalForm saving={saving} onClose={() => setShowForm(false)} onSubmit={handleAddGoal} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Poupanças e Metas</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            Acompanhe o progresso das suas metas de poupança e investimento
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={saving}>
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {/* KPI + Asset distribution */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total */}
          <Card className="flex flex-col gap-3 kpi-green">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(var(--pastel-green-bg),0.8)' }}>
                <PiggyBank size={16} style={{ color: 'rgb(var(--pastel-green-text))' }} />
              </div>
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                Total Poupado
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'rgb(var(--pastel-green-text))' }}>
              {eur(totalInvested)}
            </div>
            <div className="text-xs text-[rgb(var(--text-muted))]">{goals.length} metas ativas</div>
          </Card>

          {/* Asset distribution */}
          <Card className="md:col-span-2">
            <p className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
              Distribuição por Classe de Ativo
            </p>
            {distribution.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-muted))] italic">Nenhuma distribuição registada.</p>
            ) : (
              <div className="space-y-2">
                {distribution.map(([ac, amt]) => {
                  const cfg = ASSET_CLASS_CONFIG[ac]
                  const pct = totalInvested > 0 ? (amt / totalInvested) * 100 : 0
                  return (
                    <div key={ac} className="flex items-center gap-3">
                      <span className="text-base w-5 flex-shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-[rgb(var(--text-muted))] truncate">{cfg.label}</span>
                          <span className="font-medium text-[rgb(var(--text))] ml-2 flex-shrink-0">
                            {eur(amt)} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(var(--border),0.12)' }}>
                          <div className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Goal cards */}
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Sem metas de poupança"
          description="Crie a sua primeira meta para começar a acompanhar o progresso." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal, idx) => {
            const m = calcMetrics(goal)
            const cfg = ASSET_CLASS_CONFIG[goal.assetClass as AssetClass] ?? ASSET_CLASS_CONFIG.OTHER
            const StatusIcon = m.statusInfo.icon
            const inputVal = inputValues[goal.id] ?? ''

            return (
              <motion.div key={goal.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card flex flex-col gap-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[rgb(var(--text))] truncate">{goal.name}</h3>
                    {goal.description && (
                      <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 line-clamp-2">{goal.description}</p>
                    )}
                  </div>
                  <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                </div>

                {/* Asset class + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${cfg.color}22`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: m.statusInfo.bg, color: m.statusInfo.color }}>
                    <StatusIcon size={10} />
                    {m.statusInfo.label}
                  </span>
                </div>

                {/* Progress ring + amounts */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0 w-20 h-20">
                    <ProgressRing pct={m.progress} color={cfg.color} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-[rgb(var(--text))]">{m.progress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--text-muted))]">Atual</span>
                      <span className="font-semibold" style={{ color: cfg.color }}>{eur(goal.currentAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--text-muted))]">Objetivo</span>
                      <span className="font-medium text-[rgb(var(--text))]">{eur(goal.targetAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--text-muted))]">Falta</span>
                      <span className="font-medium text-[rgb(var(--text))]">{eur(m.remaining)}</span>
                    </div>
                    {m.daysRemaining !== null && (
                      <div className="flex justify-between">
                        <span className="text-[rgb(var(--text-muted))]">Prazo</span>
                        <span className="flex items-center gap-1 font-medium text-[rgb(var(--pastel-amber-text))]">
                          <Calendar size={11} />
                          {m.daysRemaining}d
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transaction input */}
                <div className="border-t border-[rgba(var(--border),var(--border-alpha))] pt-3 space-y-2">
                  <p className="text-xs font-medium text-[rgb(var(--text-muted))]">Movimento</p>
                  <div className="flex gap-2">
                    <input type="number" min="0" step="0.01" placeholder="€"
                      value={inputVal}
                      onChange={e => setInputValues(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      className="input text-sm py-1.5 flex-1 min-w-0" />
                    <button disabled={!inputVal || Number(inputVal) <= 0 || saving}
                      onClick={() => handleTransaction(goal.id, 'in')}
                      className="btn btn-sm flex-shrink-0"
                      style={{ background: 'rgba(var(--pastel-green-bg),0.6)', color: 'rgb(var(--pastel-green-text))' }}>
                      <ArrowUpCircle size={14} />
                    </button>
                    <button
                      disabled={!inputVal || Number(inputVal) <= 0 || Number(inputVal) > (goal.currentAmount || 0) || saving}
                      onClick={() => handleTransaction(goal.id, 'out')}
                      className="btn btn-sm flex-shrink-0"
                      style={{ background: 'rgba(var(--pastel-red-bg),0.6)', color: 'rgb(var(--pastel-red-text))' }}>
                      <ArrowDownCircle size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* History */}
      {goalHistory.length > 0 && (
        <Card>
          <div className="section-header mb-4">
            <div className="section-title">
              <TrendingUp size={16} />
              Histórico de Movimentos
            </div>
          </div>
          <div className="space-y-1">
            {goalHistory.slice(0, 12).map(item => (
              <div key={item.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.positive
                      ? 'bg-[rgba(var(--pastel-green-bg),0.5)]'
                      : 'bg-[rgba(var(--pastel-red-bg),0.5)]'}`}>
                    {item.positive
                      ? <ArrowUpCircle size={14} style={{ color: 'rgb(var(--pastel-green-text))' }} />
                      : <ArrowDownCircle size={14} style={{ color: 'rgb(var(--pastel-red-text))' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[rgb(var(--text))] truncate">{item.desc}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">{item.goalName}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-semibold" style={{
                    color: item.positive ? 'rgb(var(--pastel-green-text))' : 'rgb(var(--pastel-red-text))'
                  }}>
                    {item.positive ? '+' : '−'}{eur(item.amount)}
                  </p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {item.date.toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
