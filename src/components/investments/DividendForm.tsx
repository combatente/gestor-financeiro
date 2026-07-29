import { useState } from 'react'
import { motion } from 'framer-motion'
import { Coins, X } from 'lucide-react'
import type { AddDividendInput, Currency, DividendStatus, InvestmentType } from '../../hooks/useFirestore'

interface DividendFormProps {
  investments: InvestmentType[]
  saving: boolean
  onClose: () => void
  onSubmit: (data: AddDividendInput) => Promise<void>
}

function normalizeDateInput(s: string): string | null {
  const n = s.replace(/\//g, '-')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null
  if (isNaN(new Date(n).getTime())) return null
  return n
}

export function DividendForm({ investments, saving, onClose, onSubmit }: DividendFormProps) {
  const [investmentId, setInvestmentId] = useState(investments[0]?.id ?? '')
  const [exDividendDate, setExDividendDate] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [amountPerShare, setAmountPerShare] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [status, setStatus] = useState<DividendStatus>('anunciado')
  const [err, setErr] = useState('')

  const selectedInvestment = investments.find(i => i.id === investmentId)
  const currency: Currency = selectedInvestment?.currency ?? 'EUR'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const exDate = normalizeDateInput(exDividendDate)
    const payDate = normalizeDateInput(paymentDate)
    const perShare = Number(amountPerShare.replace(',', '.') || '0')
    const total = Number(totalAmount.replace(',', '.'))

    if (!investmentId || !exDate || !payDate || isNaN(perShare) || perShare < 0 || isNaN(total) || total <= 0) {
      setErr('Verifique todos os campos: posição, datas e valores.')
      return
    }
    setErr('')
    try {
      await onSubmit({
        investmentId,
        exDividendDate: exDate,
        paymentDate: payDate,
        amountPerShare: perShare,
        totalAmount: total,
        currency,
        status,
      })
    } catch {
      setErr('Erro ao guardar. Tente novamente.')
    }
  }

  if (investments.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="card w-full max-w-md shadow-2xl" style={{ background: 'rgb(var(--surface))' }}>
          <p className="text-sm text-[rgb(var(--text-muted))] mb-4">
            Cria primeiro uma posição de ação ou ETF para poderes registar dividendos.
          </p>
          <button className="btn btn-secondary w-full" onClick={onClose}>Fechar</button>
        </motion.div>
      </div>
    )
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
              <Coins size={16} style={{ color: 'rgb(var(--pastel-green-text))' }} />
            </div>
            <h3 className="font-semibold text-[rgb(var(--text))]">Novo Dividendo</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Posição *</label>
            <select className="input" value={investmentId} onChange={e => setInvestmentId(e.target.value)}>
              {investments.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.ticker} — {inv.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Data Ex-Dividendo *</label>
              <input className="input" type="date" value={exDividendDate}
                onChange={e => setExDividendDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Data Pagamento *</label>
              <input className="input" type="date" value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Valor / Ação ({currency})</label>
              <input className="input" inputMode="decimal" value={amountPerShare}
                onChange={e => setAmountPerShare(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 0.50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Valor Total ({currency}) *</label>
              <input className="input" inputMode="decimal" value={totalAmount}
                onChange={e => setTotalAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 5.00" required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Estado</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value as DividendStatus)}>
              <option value="anunciado">Anunciado (a receber)</option>
              <option value="recebido">Recebido</option>
            </select>
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
              {saving ? 'A guardar…' : 'Registar Dividendo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
