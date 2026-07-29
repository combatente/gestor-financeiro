import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, X } from 'lucide-react'
import { ASSET_CLASS_CONFIG, normalizeDateInput, type AssetClass } from './savingsGoalsHelpers'

interface GoalFormProps {
  saving: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string; description: string; targetAmount: number
    initialAmount: number; targetDate: string; assetClass: AssetClass
  }) => Promise<void>
}

export function GoalForm({ saving, onClose, onSubmit }: GoalFormProps) {
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
