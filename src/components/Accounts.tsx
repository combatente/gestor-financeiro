import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { EmptyState } from './ui/EmptyState'
import { Wallet, Plus, Trash2, CreditCard, PiggyBank, Banknote, TrendingUp, Building } from 'lucide-react'
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

const eur = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

type Account = {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'other'
  balance: number
  color: string
  icon: string
}

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Conta à Ordem',    icon: Building,  color: '#93c5fd' },
  { value: 'savings',    label: 'Conta Poupança',   icon: PiggyBank,  color: '#86efac' },
  { value: 'credit',     label: 'Cartão de Crédito',icon: CreditCard, color: '#fca5a5' },
  { value: 'cash',       label: 'Dinheiro',         icon: Banknote,   color: '#fde68a' },
  { value: 'investment', label: 'Investimento',     icon: TrendingUp, color: '#c4b5fd' },
  { value: 'other',      label: 'Outro',            icon: Wallet,     color: '#94a3b8' },
] as const

export default function Accounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'checking' as Account['type'], balance: 0, color: '#93c5fd', icon: '' })

  useEffect(() => {
    if (!user) return
    const ref = collection(db, `households/minha-carteira/accounts`)
    return onSnapshot(ref, snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)))
    })
  }, [user])

  const totalBalance = accounts.reduce((s, a) => {
    return a.type === 'credit' ? s - a.balance : s + a.balance
  }, 0)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return }
    setLoading(true)
    try {
      const typeInfo = ACCOUNT_TYPES.find(t => t.value === form.type)
      await addDoc(collection(db, `households/minha-carteira/accounts`), {
        ...form,
        color: typeInfo?.color ?? '#94a3b8',
        createdAt: new Date().toISOString(),
      })
      toast.success('Conta criada!')
      setOpen(false)
      setForm({ name: '', type: 'checking', balance: 0, color: '#93c5fd', icon: '' })
    } catch {
      toast.error('Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta conta?')) return
    await deleteDoc(doc(db, `households/minha-carteira/accounts/${id}`))
    toast.success('Conta eliminada')
  }

  return (
    <div className="space-y-6">
      {/* KPI total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">Saldo Total Consolidado</div>
          <div className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{eur(totalBalance)}</div>
          <div className="text-xs text-[rgb(var(--text-muted))] mt-1">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} ativas · crédito deduzido</div>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-2">
          <Button variant="primary" icon={Plus} fullWidth onClick={() => setOpen(true)}>Nova Conta</Button>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="Sem contas criadas"
          description="Adicione as suas contas bancárias, poupanças e investimentos para acompanhar o saldo total."
          action={<Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>Criar primeira conta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, idx) => {
            const typeInfo = ACCOUNT_TYPES.find(t => t.value === acc.type)
            const TypeIcon = typeInfo?.icon ?? Wallet
            const isCredit = acc.type === 'credit'
            return (
              <motion.div key={acc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
                <Card className="relative group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl" style={{ background: `${typeInfo?.color}20` }}>
                      <TypeIcon size={20} style={{ color: typeInfo?.color }} />
                    </div>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-400/10 p-1.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))] font-semibold uppercase tracking-wider mb-0.5">{typeInfo?.label}</div>
                  <div className="font-bold text-[rgb(var(--text))] mb-2 truncate">{acc.name}</div>
                  <div className={`text-2xl font-bold ${isCredit ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isCredit ? '−' : ''}{eur(acc.balance)}
                  </div>
                  {isCredit && <div className="text-xs text-[rgb(var(--text-muted))] mt-1">Dívida de cartão</div>}
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova Conta">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Nome da Conta *</label>
            <input className="input" placeholder="Ex: Conta CGD, Poupança BPI..." value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Tipo de Conta *</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map(t => {
                const TIcon = t.icon
                return (
                  <button key={t.value}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                      form.type === t.value
                        ? 'border-[rgba(var(--brand),0.5)] bg-[rgba(var(--brand),0.08)] text-[rgb(var(--brand))]'
                        : 'border-[rgba(var(--border),var(--border-alpha))] text-[rgb(var(--text-muted))]'
                    }`}
                    onClick={() => setForm(f => ({ ...f, type: t.value as Account['type'] }))}
                  >
                    <TIcon size={14} />
                    <span className="truncate">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">
              {form.type === 'credit' ? 'Saldo em dívida (€)' : 'Saldo atual (€)'}
            </label>
            <input type="number" className="input" min="0" step="0.01" value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value)||0 }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={loading} onClick={handleSave}>Criar Conta</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
