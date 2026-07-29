import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Target } from 'lucide-react'
import { useFirestore } from '../hooks/useFirestore'
import type { Transacao } from '../hooks/useFirestore'
import { EmptyState } from './ui/EmptyState'
import { GoalForm } from './savingsGoals/GoalForm'
import { GoalsSummary } from './savingsGoals/GoalsSummary'
import { GoalCard } from './savingsGoals/GoalCard'
import { GoalsHistory, type HistoryItem } from './savingsGoals/GoalsHistory'
import type { AssetClass } from './savingsGoals/savingsGoalsHelpers'

export default function SavingsGoals() {
  const { goals, transacoes, addGoal, updateGoal, adicionarTransacao, saving, error } = useFirestore()

  const [showForm, setShowForm]     = useState(false)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  // Transaction history (manual contributions/withdrawals only)
  const goalHistory: HistoryItem[] = useMemo(() => {
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
      <AnimatePresence>
        {showForm && (
          <GoalForm saving={saving} onClose={() => setShowForm(false)} onSubmit={handleAddGoal} />
        )}
      </AnimatePresence>

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

      {goals.length > 0 && (
        <GoalsSummary totalInvested={totalInvested} goalsCount={goals.length} distribution={distribution} />
      )}

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Sem metas de poupança"
          description="Crie a sua primeira meta para começar a acompanhar o progresso." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal, idx) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              index={idx}
              inputValue={inputValues[goal.id] ?? ''}
              saving={saving}
              onInputChange={(value) => setInputValues(prev => ({ ...prev, [goal.id]: value }))}
              onTransaction={(type) => handleTransaction(goal.id, type)}
            />
          ))}
        </div>
      )}

      <GoalsHistory items={goalHistory} />
    </div>
  )
}
