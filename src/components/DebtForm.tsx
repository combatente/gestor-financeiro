import { useState } from 'react'
import { X, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'
import type { AddDebtInput } from '../hooks/useFirestore'

interface DebtFormProps {
  onClose: () => void
  onSubmit: (debt: AddDebtInput) => Promise<void>
}

const CATEGORIES = [
  'Crédito Habitação',
  'Empréstimo Pessoal',
  'Cartão de Crédito',
  'Crédito Automóvel',
  'Outro',
]

export const DebtForm = ({ onClose, onSubmit }: DebtFormProps) => {
  const [name, setName]             = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCategory]     = useState(CATEGORIES[1])
  const [initialInput, setInitial]  = useState('')
  const [currentInput, setCurrent]  = useState('')
  const [interestInput, setInterest]= useState('')
  const [minPayInput, setMinPay]    = useState('')
  const [dueDate, setDueDate]       = useState('')
  const [err, setErr]               = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const initial  = Number(initialInput.replace(',', '.'))
    const current  = Number(currentInput.replace(',', '.'))
    const interest = Number(interestInput.replace(',', '.'))
    const minPay   = Number(minPayInput.replace(',', '.'))

    if (!name.trim() || !dueDate || isNaN(initial) || initial <= 0 ||
        isNaN(current) || current < 0 || current > initial ||
        isNaN(interest) || isNaN(minPay) || minPay < 0) {
      setErr('Verifique todos os campos. O saldo atual não pode exceder o montante inicial.')
      return
    }

    setErr('')
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        targetAmount: initial,
        currentAmount: current,
        interestRate: interest,
        minimumPayment: minPay,
        dueDate,
        status: current <= 0 ? 'paid' : 'active',
      })
    } catch {
      setErr('Erro ao guardar. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md my-4 shadow-2xl" style={{ background: 'rgb(var(--surface))' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(var(--pastel-red-bg),0.6)' }}>
              <CreditCard size={16} style={{ color: 'rgb(var(--pastel-red-text))' }} />
            </div>
            <h3 className="font-semibold text-[rgb(var(--text))]">Registar Dívida</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Nome da Dívida *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Empréstimo pessoal BPI" required />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Categoria</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Montante Inicial (€) *</label>
              <input className="input" inputMode="decimal" value={initialInput}
                onChange={e => setInitial(e.target.value)} placeholder="Ex: 15 000" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Saldo Atual (€) *</label>
              <input className="input" inputMode="decimal" value={currentInput}
                onChange={e => setCurrent(e.target.value)} placeholder="Ex: 12 000" required />
            </div>
          </div>

          {/* Interest + min payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Taxa de Juro (%) *</label>
              <input className="input" inputMode="decimal" value={interestInput}
                onChange={e => setInterest(e.target.value)} placeholder="Ex: 4.5" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Pagamento Mínimo (€) *</label>
              <input className="input" inputMode="decimal" value={minPayInput}
                onChange={e => setMinPay(e.target.value)} placeholder="Ex: 200" required />
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Data de Vencimento *</label>
            <input className="input" type="date" value={dueDate}
              onChange={e => setDueDate(e.target.value)} required />
          </div>

          {/* Description (optional) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Observações (opcional)</label>
            <input className="input" value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Banco BPI, prestação dia 15" />
          </div>

          {err && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(var(--pastel-red-bg),0.5)', color: 'rgb(var(--pastel-red-text))' }}>
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
              {submitting ? 'A guardar…' : 'Registar Dívida'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
