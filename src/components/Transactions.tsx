import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useFirestore } from '../hooks/useFirestore'
import CategorySelect from './CategorySelect'
import { useCategories } from '../hooks/useCategories'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { TransactionBadge } from './ui/Badge'
import { EmptyState } from './ui/EmptyState'
import { Modal } from './ui/Modal'
import { FAMILY_MEMBERS } from '../types'
import * as XLSX from 'xlsx'
import {
  Plus, Download, Search, Trash2, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, PiggyBank, CreditCard, X, User
} from 'lucide-react'

type Tipo = 'receita' | 'despesa' | 'divida' | 'poupanca'
const PAGE_SIZE = 50

const eur = (n: number) => Number(n || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const toPT = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const parseValor = (s: string) => parseFloat(String(s).trim().replace(/\./g, '').replace(',', '.'))
const isDate = (v: string) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)

const TYPE_LABELS: Record<Tipo, string> = { receita: 'Receita', despesa: 'Despesa', divida: 'Dívida', poupanca: 'Poupança' }
const TYPE_ICONS = {
  receita: ArrowUpCircle, despesa: ArrowDownCircle, poupanca: PiggyBank, divida: CreditCard
} as const

export default function Transactions() {
  const { transacoes, adicionarTransacao, removerTransacao, saving } = useFirestore()
  const { items: categories } = useCategories()

  // Formulário
  const [formOpen, setFormOpen] = useState(false)
  const [type, setType]         = useState<Tipo>('despesa')
  const [valor, setValor]       = useState('')
  const [data, setData]         = useState(new Date().toISOString().slice(0, 10))
  const [categoryId, setCatId]  = useState('')
  const [descricao, setDesc]    = useState('')
  const [pessoa, setPessoa]     = useState('')

  // Filtros
  const [search, setSearch]      = useState('')
  const [filterType, setFType]   = useState<Tipo | ''>('')
  const [filterMonth, setFMonth] = useState('')
  const [filterPessoa, setFPessoa] = useState('')

  const [page, setPage] = useState(0)

  const catMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c: { id?: string; name?: string }) => { if (c.id) m.set(c.id, c.name ?? '') })
    return m
  }, [categories])

  // Lista filtrada
  const filtered = useMemo(() => {
    let list = [...transacoes].sort((a, b) => b.data.localeCompare(a.data))
    if (filterType)   list = list.filter(t => t.type === filterType)
    if (filterMonth)  list = list.filter(t => t.data.startsWith(filterMonth))
    if (filterPessoa) list = list.filter(t => (t.pessoa ?? '') === filterPessoa)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        (t.descricao ?? '').toLowerCase().includes(q) ||
        (catMap.get(t.categoryId ?? '') ?? '').toLowerCase().includes(q) ||
        (t.categoria ?? '').toLowerCase().includes(q) ||
        (t.pessoa ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [transacoes, filterType, filterMonth, filterPessoa, search, catMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSlice  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const totals = useMemo(() => ({
    receitas:  filtered.filter(t => t.type==='receita').reduce((s,t) => s+t.valor, 0),
    despesas:  filtered.filter(t => t.type==='despesa').reduce((s,t) => s+t.valor, 0),
    poupancas: filtered.filter(t => t.type==='poupanca').reduce((s,t) => s+t.valor, 0),
  }), [filtered])

  const clearFilters = () => { setSearch(''); setFType(''); setFMonth(''); setFPessoa(''); setPage(0) }
  const hasFilters = !!(search || filterType || filterMonth || filterPessoa)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const vNum = parseValor(valor)
    if (!Number.isFinite(vNum) || vNum === 0) { toast.error('Valor inválido'); return }
    if (!isDate(data)) { toast.error('Data inválida'); return }
    if ((type === 'despesa' || type === 'receita') && !categoryId) { toast.error('Seleciona uma categoria'); return }

    try {
      await adicionarTransacao({
        type, valor: vNum, data,
        categoryId: categoryId || null,
        descricao: descricao.trim() || undefined,
        pessoa: pessoa || undefined,
      })
      toast.success('Transação adicionada!')
      setValor(''); setDesc(''); setPessoa('')
      setFormOpen(false)
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? 'Erro ao adicionar')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Eliminar esta transação?')) return
    try {
      await removerTransacao(id)
      toast.success('Transação eliminada')
    } catch {
      toast.error('Erro ao eliminar')
    }
  }

  const exportExcel = () => {
    const rows = filtered.map(t => ({
      'Data': toPT(t.data),
      'Titular': t.pessoa || '—',
      'Tipo': TYPE_LABELS[t.type as Tipo] ?? t.type,
      'Categoria': catMap.get(t.categoryId ?? '') || t.categoria || '—',
      'Descrição': t.descricao ?? '',
      'Valor (€)': Number(t.valor),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 40 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')
    XLSX.writeFile(wb, `transacoes-${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Excel exportado!')
  }

  const catTypeForSelect: 'receita' | 'poupanca' | 'despesa' =
    type === 'receita' ? 'receita' : type === 'poupanca' ? 'poupanca' : 'despesa'

  return (
    <div className="space-y-5">
      {/* KPIs de filtro */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Receitas',  val: totals.receitas,  color: 'text-emerald-400' },
          { label: 'Despesas',  val: totals.despesas,  color: 'text-rose-400' },
          { label: 'Poupanças', val: totals.poupancas, color: 'text-blue-400' },
        ].map(k => (
          <Card key={k.label} className="text-center py-3">
            <div className={`text-lg font-bold ${k.color}`}>{eur(k.val)}</div>
            <div className="text-xs text-[rgb(var(--text-muted))]">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
          <input
            className="input pl-9 text-sm py-2"
            placeholder="Pesquisar descrição, categoria ou titular..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filtro titular */}
        <select className="input text-sm py-2 w-auto" value={filterPessoa}
          onChange={e => { setFPessoa(e.target.value); setPage(0) }}>
          <option value="">Todos os titulares</option>
          {FAMILY_MEMBERS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Filtro tipo */}
        <select className="input text-sm py-2 w-auto" value={filterType}
          onChange={e => { setFType(e.target.value as Tipo | ''); setPage(0) }}>
          <option value="">Todos os tipos</option>
          {(['receita','despesa','poupanca','divida'] as Tipo[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>

        {/* Filtro mês */}
        <input type="month" className="input text-sm py-2 w-auto" value={filterMonth}
          onChange={e => { setFMonth(e.target.value); setPage(0) }} />

        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm gap-1 text-[rgb(var(--text-muted))]">
            <X size={12} /> Limpar
          </button>
        )}

        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" icon={Download} size="sm" onClick={exportExcel}>Excel</Button>
          <Button variant="primary" icon={Plus} size="sm" onClick={() => setFormOpen(true)}>Adicionar</Button>
        </div>
      </div>

      {/* Resultados */}
      {filtered.length > 0 && (
        <div className="text-xs text-[rgb(var(--text-muted))]">
          {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''} · Pág. {page+1}/{totalPages}
          {hasFilters && ' (filtrado)'}
        </div>
      )}

      {/* Tabela */}
      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="Sem resultados"
          description={hasFilters ? "Sem transações com os filtros ativos. Limpe os filtros para ver todas." : "Adicione a primeira transação usando o botão 'Adicionar'."}
          action={hasFilters ? <Button variant="ghost" icon={X} onClick={clearFilters}>Limpar filtros</Button> : undefined}
        />
      ) : (
        <div className="table-container">
          <table className="table-pro">
            <thead>
              <tr>
                <th>Data</th>
                <th>Titular</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th className="text-right">Valor</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map(t => {
                const isRec = t.type === 'receita'
                const isPou = t.type === 'poupanca'
                const TypeIcon = TYPE_ICONS[t.type as Tipo] ?? CreditCard
                return (
                  <tr key={t.id}>
                    <td className="text-[rgb(var(--text-muted))] text-xs font-mono whitespace-nowrap">{toPT(t.data)}</td>
                    <td>
                      {t.pessoa ? (
                        <div className="flex items-center gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
                          <User size={11} />
                          {t.pessoa}
                        </div>
                      ) : (
                        <span className="text-[rgb(var(--text-muted))] text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon size={13} className={isRec ? 'text-emerald-400' : isPou ? 'text-blue-400' : 'text-rose-400'} />
                        <TransactionBadge type={t.type} />
                      </div>
                    </td>
                    <td className="text-sm">
                      {catMap.get(t.categoryId ?? '') || t.categoria || <span className="text-[rgb(var(--text-muted))]">—</span>}
                    </td>
                    <td className="text-sm text-[rgb(var(--text-muted))] max-w-[240px]">
                      <div className="truncate" title={t.descricao ?? ''}>{t.descricao || '—'}</div>
                    </td>
                    <td className={`text-right font-bold text-sm ${isRec ? 'text-emerald-400' : isPou ? 'text-blue-400' : 'text-rose-400'}`}>
                      {isRec ? '+' : '−'}{eur(t.valor)}
                    </td>
                    <td>
                      {t.id && (
                        <button onClick={() => handleRemove(t.id!)}
                          className="btn btn-ghost p-1.5 text-rose-400 hover:bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" icon={ChevronLeft} size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-[rgb(var(--text-muted))]">Página {page + 1} de {totalPages}</span>
          <Button variant="ghost" size="sm" iconRight={ChevronRight} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      {/* Modal adicionar transação */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nova Transação">
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-2 uppercase tracking-wider">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['receita','despesa','poupanca','divida'] as Tipo[]).map(t => {
                const TIcon = TYPE_ICONS[t]
                const active = type === t
                const colorMap = { receita: 'emerald', despesa: 'rose', poupanca: 'blue', divida: 'amber' }
                const c = colorMap[t]
                return (
                  <button key={t} type="button"
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${
                      active
                        ? `border-${c}-400/50 bg-${c}-400/10 text-${c}-400`
                        : 'border-[rgba(var(--border),var(--border-alpha))] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
                    }`}
                    onClick={() => { setType(t); setCatId('') }}
                  >
                    <TIcon size={14} /> {TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Valor (€) *</label>
              <input type="text" inputMode="decimal" className="input" placeholder="0,00" value={valor}
                onChange={e => setValor(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Data *</label>
              <input type="date" className="input" value={data} onChange={e => setData(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Titular</label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  pessoa === ''
                    ? 'border-[rgba(var(--brand),0.4)] bg-[rgba(var(--brand),0.08)] text-[rgb(var(--brand))]'
                    : 'border-[rgba(var(--border),0.2)] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
                }`}
                onClick={() => setPessoa('')}
              >
                —
              </button>
              {FAMILY_MEMBERS.map(p => (
                <button key={p} type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                    pessoa === p
                      ? 'border-[rgba(var(--brand),0.4)] bg-[rgba(var(--brand),0.08)] text-[rgb(var(--brand))]'
                      : 'border-[rgba(var(--border),0.2)] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
                  }`}
                  onClick={() => setPessoa(p)}
                >
                  <User size={10} /> {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Categoria</label>
            <CategorySelect type={catTypeForSelect} value={categoryId} onChange={setCatId} placeholder="Selecionar categoria" className="w-full" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">Descrição</label>
            <input className="input" placeholder="Nota opcional..." value={descricao}
              onChange={e => setDesc(e.target.value)} maxLength={200} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
