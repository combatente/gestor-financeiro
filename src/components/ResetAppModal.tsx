import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFirestore } from '../hooks/useFirestore'

const CONFIRM_WORD = 'APAGAR'

const DELETED_ITEMS = [
  'Transações, orçamentos e alocações 50/30/20',
  'Dívidas e metas de poupança',
  'Investimentos e dividendos',
  'Contas e transações recorrentes',
  'Categorias e histórico de património',
]

export function ResetAppModal({ onClose }: { onClose: () => void }) {
  const { resetAllHouseholdData, saving } = useFirestore()
  const [confirmText, setConfirmText] = useState('')
  const [err, setErr] = useState('')

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD

  async function handleConfirm() {
    if (!canConfirm) return
    setErr('')
    try {
      await resetAllHouseholdData()
      toast.success('Aplicação reposta. Todos os dados foram apagados.')
      onClose()
    } catch {
      setErr('Erro ao repor os dados. Tente novamente.')
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
              style={{ background: 'rgba(var(--pastel-red-bg),0.6)' }}>
              <AlertTriangle size={16} style={{ color: 'rgb(var(--pastel-red-text))' }} />
            </div>
            <h3 className="font-semibold text-[rgb(var(--text))]">Repor Aplicação</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Esta ação apaga <strong className="text-[rgb(var(--pastel-red-text))]">permanentemente</strong> todos
            os dados desta aplicação. Não é possível desfazer.
          </p>

          <ul className="text-xs text-[rgb(var(--text-muted))] list-disc pl-4 space-y-1">
            {DELETED_ITEMS.map(item => <li key={item}>{item}</li>)}
          </ul>

          <div className="space-y-1 pt-2">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">
              Escreve <span className="font-bold text-[rgb(var(--text))]">{CONFIRM_WORD}</span> para confirmar
            </label>
            <input
              className="input"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
            />
          </div>

          {err && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(var(--pastel-red-bg),0.5)', color: 'rgb(var(--pastel-red-text))' }}>
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="btn flex-1"
              style={{
                background: canConfirm ? 'rgba(var(--pastel-red-bg),0.8)' : 'rgba(var(--surface-2),0.6)',
                color: canConfirm ? 'rgb(var(--pastel-red-text))' : 'rgb(var(--text-muted))',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
              }}
              disabled={!canConfirm || saving}
              onClick={handleConfirm}
            >
              {saving ? 'A apagar…' : 'Apagar Tudo'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
