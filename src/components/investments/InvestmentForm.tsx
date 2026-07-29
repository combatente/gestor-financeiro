import { useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, X } from 'lucide-react'
import type { AddInvestmentInput, Currency, InvestmentAssetType, Platform } from '../../hooks/useFirestore'
import { ASSET_TYPE_CONFIG, PLATFORM_CONFIG } from './investmentsHelpers'

interface InvestmentFormProps {
  saving: boolean
  onClose: () => void
  onSubmit: (data: AddInvestmentInput) => Promise<void>
}

function normalizeDateInput(s: string): string | null {
  const n = s.replace(/\//g, '-')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null
  if (isNaN(new Date(n).getTime())) return null
  return n
}

export function InvestmentForm({ saving, onClose, onSubmit }: InvestmentFormProps) {
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<Platform>('DEGIRO')
  const [assetType, setAssetType] = useState<InvestmentAssetType>('ETF')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [quantity, setQuantity] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = Number(quantity.replace(',', '.'))
    const avg = Number(avgCost.replace(',', '.'))
    const price = Number(currentPrice.replace(',', '.'))
    const date = normalizeDateInput(quoteUpdatedAt)

    if (!ticker.trim() || !name.trim() || !date || isNaN(q) || q <= 0 || isNaN(avg) || avg < 0 || isNaN(price) || price < 0) {
      setErr('Verifique todos os campos: ticker, nome, quantidade (>0), preços (>=0) e data da cotação.')
      return
    }
    setErr('')
    try {
      await onSubmit({
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        platform,
        assetType,
        currency,
        quantity: q,
        avgCost: avg,
        currentPrice: price,
        quoteUpdatedAt: date,
      })
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
              style={{ background: 'rgba(var(--pastel-blue-bg),0.6)' }}>
              <LineChart size={16} style={{ color: 'rgb(var(--pastel-blue-text))' }} />
            </div>
            <h3 className="font-semibold text-[rgb(var(--text))]">Nova Posição</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Ticker *</label>
              <input className="input" value={ticker} onChange={e => setTicker(e.target.value)}
                placeholder="Ex: VWCE" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Moeda</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                <option value="EUR">€ Euro</option>
                <option value="USD">$ Dólar</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Nome *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Vanguard FTSE All-World" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Plataforma</label>
              <select className="input" value={platform} onChange={e => setPlatform(e.target.value as Platform)}>
                {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Tipo de Ativo</label>
              <select className="input" value={assetType} onChange={e => setAssetType(e.target.value as InvestmentAssetType)}>
                {Object.entries(ASSET_TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Quantidade *</label>
              <input className="input" inputMode="decimal" value={quantity}
                onChange={e => setQuantity(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 10" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Preço Médio *</label>
              <input className="input" inputMode="decimal" value={avgCost}
                onChange={e => setAvgCost(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 95.20" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Cotação Atual *</label>
              <input className="input" inputMode="decimal" value={currentPrice}
                onChange={e => setCurrentPrice(e.target.value.replace(/[^0-9,.]/g, ''))}
                placeholder="Ex: 102.50" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Data da Cotação</label>
              <input className="input" type="date" value={quoteUpdatedAt}
                onChange={e => setQuoteUpdatedAt(e.target.value)} required />
            </div>
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
              {saving ? 'A guardar…' : 'Criar Posição'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
