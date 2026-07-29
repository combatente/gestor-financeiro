import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { EmptyState } from './ui/EmptyState'
import { Badge } from './ui/Badge'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import { useFirestore } from '../hooks/useFirestore'
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { RefreshCw, Plus, Trash2, Play, Pause, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

const eur = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

type RecurringTx = {
  id: string
  type: 'receita' | 'despesa'
  valor: number
  descricao: string
  categoryId: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  nextDate: string
  active: boolean
}

const FREQ_LABELS = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

function addPeriod(date: string, freq: RecurringTx['frequency']): string {
  const d = new Date(date)
  if (freq === 'daily')   d.setDate(d.getDate() + 1)
  if (freq === 'weekly')  d.setDate(d.getDate() + 7)
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1)
  if (freq === 'yearly')  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export default function RecurringTransactions() {
  const { user } = useAuth()
  const { items: categories } = useCategories()
  const { adicionarTransacao } = useFirestore()
  const [items, setItems] = useState<RecurringTx[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'despesa' as 'receita' | 'despesa',
    valor: 0,
    descricao: '',
    categoryId: '',
    frequency: 'monthly' as RecurringTx['frequency'],
    nextDate: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (!user) return
    return onSnapshot(collection(db, `households/minha-carteira/recurring`), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringTx)))
    })
  }, [user])

  const handleSave = async () => {
    if (!form.descricao.trim() || form.valor <= 0) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    try {
      await addDoc(collection(db, `households/minha-carteira/recurring`), { ...form, active: true })
      toast.success('Transação recorrente criada!')
      setOpen(false)
      setForm({ type:'despesa', valor:0, descricao:'', categoryId:'', frequency:'monthly', nextDate: new Date().toISOString().slice(0,10) })
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }

  const toggleActive = async (item: RecurringTx) => {
    await updateDoc(doc(db, `households/minha-carteira/recurring/${item.id}`), { active: !item.active })
    toast.success(item.active ? 'Pausada' : 'Ativada')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar transação recorrente?')) return
    await deleteDoc(doc(db, `households/minha-carteira/recurring/${id}`))
    toast.success('Eliminada')
  }

  const handleProcess = async (item: RecurringTx) => {
    await adicionarTransacao({
      type: item.type, valor: item.valor, data: item.nextDate,
      descricao: item.descricao, categoryId: item.categoryId || null,
    })
    const next = addPeriod(item.nextDate, item.frequency)
    await updateDoc(doc(db, `households/minha-carteira/recurring/${item.id}`), { nextDate: next })
    toast.success('Transação registada!')
  }

  const today = new Date().toISOString().slice(0, 10)
  const due    = items.filter(i => i.active && i.nextDate <= today)
  const future = items.filter(i => i.active && i.nextDate > today)
  const paused = items.filter(i => !i.active)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-[rgb(var(--text-muted))]">
          Gerencie pagamentos e receitas que se repetem regularmente.
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>Nova Recorrente</Button>
      </div>

      {due.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
            <Calendar size={12} />A vencer / vencidas ({due.length})
          </div>
          <div className="space-y-2">
            {due.map((item, idx) => (
              <RecurringCard key={item.id} item={item} idx={idx} onProcess={handleProcess}
                onToggle={toggleActive} onDelete={handleDelete} highlight />
            ))}
          </div>
        </div>
      )}

      {future.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-3">Próximas</div>
          <div className="space-y-2">
            {future.map((item, idx) => (
              <RecurringCard key={item.id} item={item} idx={idx} onProcess={handleProcess}
                onToggle={toggleActive} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {paused.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-3 opacity-60">Pausadas</div>
          <div className="space-y-2 opacity-60">
            {paused.map((item, idx) => (
              <RecurringCard key={item.id} item={item} idx={idx} onProcess={handleProcess}
                onToggle={toggleActive} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <EmptyState icon={RefreshCw} title="Sem transações recorrentes"
          description="Adicione salário, renda, subscrições ou qualquer pagamento que se repita regularmente."
          action={<Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>Criar primeira</Button>}
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova Transação Recorrente">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['receita','despesa'] as const).map(t => (
              <button key={t}
                className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${
                  form.type === t
                    ? t === 'receita'
                      ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-400'
                      : 'border-rose-400/50 bg-rose-400/10 text-rose-400'
                    : 'border-[rgba(var(--border),var(--border-alpha))] text-[rgb(var(--text-muted))]'
                }`}
                onClick={() => setForm(f => ({ ...f, type: t }))}
              >
                {t === 'receita' ? <ArrowUpCircle size={14}/> : <ArrowDownCircle size={14}/>}
                {t === 'receita' ? 'Receita' : 'Despesa'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Descrição *</label>
            <input className="input" placeholder="Ex: Salário, Netflix, Renda..." value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Valor (€) *</label>
              <input type="number" className="input" min="0" step="0.01" value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value)||0 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Frequência</label>
              <select className="input" value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}>
                {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Próxima Data</label>
              <input type="date" className="input" value={form.nextDate}
                onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Categoria</label>
              <select className="input" value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">— Nenhuma —</option>
                {categories.filter((c: any) => c.type === form.type).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={loading} onClick={handleSave}>Criar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function RecurringCard({
  item, idx, onProcess, onToggle, onDelete, highlight
}: {
  item: RecurringTx; idx: number
  onProcess: (i: RecurringTx) => void
  onToggle: (i: RecurringTx) => void
  onDelete: (id: string) => void
  highlight?: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = item.nextDate < today
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx * 0.04 }}>
      <Card className={`flex items-center gap-4 py-3.5 ${highlight ? 'border-amber-400/30' : ''}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          item.type === 'receita' ? 'bg-emerald-400/10' : 'bg-rose-400/10'
        }`}>
          {item.type === 'receita'
            ? <ArrowUpCircle size={16} className="text-emerald-400"/>
            : <ArrowDownCircle size={16} className="text-rose-400"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[rgb(var(--text))] truncate">{item.descricao}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="neutral">{FREQ_LABELS[item.frequency]}</Badge>
            <span className={`text-xs ${isOverdue && item.active ? 'text-amber-400 font-semibold' : 'text-[rgb(var(--text-muted))]'}`}>
              {isOverdue && item.active ? '⚠ ' : ''}Próxima: {item.nextDate}
            </span>
          </div>
        </div>
        <div className={`text-base font-bold flex-shrink-0 ${item.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {item.type === 'receita' ? '+' : '−'}{eur(item.valor)}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {item.active && item.nextDate <= today && (
            <Button variant="secondary" size="sm" icon={Play} onClick={() => onProcess(item)}>Registar</Button>
          )}
          <button onClick={() => onToggle(item)} className={`btn btn-sm ${item.active ? 'btn-ghost' : 'btn-secondary'} p-1.5`} title={item.active ? 'Pausar' : 'Ativar'}>
            {item.active ? <Pause size={14}/> : <Play size={14}/>}
          </button>
          <button onClick={() => onDelete(item.id)} className="btn btn-ghost btn-sm p-1.5 text-rose-400 hover:bg-rose-400/10">
            <Trash2 size={14}/>
          </button>
        </div>
      </Card>
    </motion.div>
  )
}
