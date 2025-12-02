// src/components/Transactions.tsx
import { useMemo, useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import CategorySelect from './CategorySelect'
import { useCategories } from '../hooks/useCategories'
import * as XLSX from 'xlsx'

type Tipo = 'receita' | 'despesa' | 'divida' | 'poupanca'
const PAGE_SIZE = 50

// ---- Helpers de formatação e validação ----

// Formata ISO (YYYY-MM-DD) para PT (DD/MM/YYYY)
const toPTDate = (iso: string) => {
  const [yy, mm, dd] = iso.split('-')
  return `${dd}/${mm}/${yy}`
}

// Formata número para EUR pt-PT
const fmtEUR = (n: number) =>
  Number(n || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

// Converte "1.234,56" -> 1234.56
const parseValor = (s: string): number => {
  const normalized = String(s ?? '').trim().replace(/\./g, '').replace(',', '.')
  return Number(normalized)
}

// Validação YYYY-MM-DD
const isYYYYMMDD = (v: string) =>
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)

export default function Transactions() {
  const { transacoes, adicionarTransacao, removerTransacao, saving, error } = useFirestore()
  const { items: categories } = useCategories()

  // ---- Form state ----
  const [type, setType] = useState<Tipo>('despesa')
  const [valor, setValor] = useState<string>('') // string para normalização
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10)) // YYYY-MM-DD
  const [categoryId, setCategoryId] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')

  // ---- Categoria -> label (com ícone) ----
  const idToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) {
      if (c.id) m.set(c.id, `${c.icon ? c.icon + ' ' : ''}${c.name}`)
    }
    return m
  }, [categories])

  // ---- Lista ordenada (desc) ----
  const sorted = useMemo(() => {
    return [...transacoes].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )
  }, [transacoes])

  // ---- Paginação ----
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageSlice = useMemo(() => {
    const start = page * PAGE_SIZE
    return sorted.slice(start, start + PAGE_SIZE)
  }, [sorted, page])

  // ---- Exportar Excel (.xlsx) ----
  const onExportXLSX = () => {
    const rows = sorted.map(t => ({
      'Data (PT)': toPTDate(t.data), // DD/MM/YYYY
      'Tipo': t.type,
      'Categoria': idToLabel.get(t.categoryId ?? '') ?? t.categoria ?? '',
      'Descrição': (t.descricao ?? '').replace(/\r?\n/g, ' ').trim(),
      'Valor (€)': Number(t.valor) || 0,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Movimentos')
    XLSX.writeFile(wb, `movimentos_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ---- Submissão ----
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const vNum = parseValor(valor)

    if (!Number.isFinite(vNum) || vNum === 0) {
      alert('Valor inválido.')
      return
    }
    if (!isYYYYMMDD(data)) {
      alert('Data inválida.')
      return
    }
    if ((type === 'despesa' || type === 'receita') && !categoryId) {
      alert('Seleciona uma categoria.')
      return
    }

    try {
      await adicionarTransacao({
        type,
        valor: vNum,
        data, // guardamos ISO (YYYY-MM-DD)
        categoryId: categoryId || undefined,
        descricao: descricao.trim() || undefined,
      })
      setValor('')
      setDescricao('')
      // Mantém tipo/categoria para lançamentos consecutivos
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao adicionar transação.')
    }
  }

  const categoryTypeForSelect: 'receita' | 'poupanca' | 'despesa' =
    type === 'receita' ? 'receita' : type === 'poupanca' ? 'poupanca' : 'despesa'

  return (
    <section className="space-y-6">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">📋 Transações</h2>
        <button
          onClick={onExportXLSX}
          className="btn btn-secondary flex items-center gap-2"
          title="Exportar todos os movimentos para Excel"
        >
          {/* Ícone simples (podes trocar por um pack de ícones) */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4zm4 4h8m-8 4h8m-8 4h8" />
          </svg>
          Excel
        </button>
      </div>
      {/* Formulário alinhado em Grid (1 linha estável em desktop) */}
      
<form
  onSubmit={handleAdd}
  lang="pt" // CORREÇÃO 2: Adiciona o locale PT para o input type="date"
  className="
    w-full
    sticky top-0 z-20
    grid grid-cols-12 gap-2
    py-3 px-3
    bg-neutral-900/80 backdrop-blur
    border border-white/10 rounded shadow-sm
    items-end
  "
>
  {/* Tipo - col-span-2, com min-w-0 */}
  <div className="flex flex-col col-span-2 min-w-0">
    <label className="text-xs text-neutral-400 mb-1 truncate">Tipo</label>
    <select
      value={type}
      onChange={(e) => { setType(e.target.value as Tipo); setCategoryId('') }}
      className="select w-full text-sm pl-2 pr-8"
    >
      <option value="receita">Receita</option>
      <option value="despesa">Despesa</option>
      <option value="divida">Dívida</option>
      <option value="poupanca">Poupança</option>
    </select>
  </div>

  {/* Categoria - col-span-2, com min-w-0 */}
  <div className="flex flex-col col-span-2 min-w-0">
    <label className="text-xs text-neutral-400 mb-1 truncate">Categoria</label>
    <CategorySelect
      type={categoryTypeForSelect}
      value={categoryId}
      onChange={setCategoryId}
      placeholder="Categoria"
      className="w-full text-sm"
    />
  </div>

  {/* Descrição - col-span-3, com min-w-0 */}
  <div className="flex flex-col col-span-3 min-w-0">
    <label className="text-xs text-neutral-400 mb-1 truncate">Descrição</label>
    <input
      value={descricao}
      onChange={(e) => setDescricao(e.target.value)}
      placeholder="Ex.: Continente"
      className="input w-full text-sm"
      maxLength={200}
    />
  </div>

  {/* Valor (€) - col-span-2, com min-w-0 */}
  <div className="flex flex-col col-span-2 min-w-0">
    <label className="text-xs text-neutral-400 mb-1 truncate">Valor (€)</label>
    <input
      type="text"
      inputMode="decimal"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      placeholder="0,00"
      className="input w-full text-sm px-2"
      required
    />
  </div>

  {/* Data - col-span-2, com min-w-0 */}
  <div className="flex flex-col col-span-2 min-w-0">
    <label className="text-xs text-neutral-400 mb-1 truncate">Data</label>
    <input
      type="date"
      value={data}
      onChange={(e) => setData(e.target.value)}
      className="input w-full text-sm px-2" 
      required
    />
  </div>

  {/* Botão - col-span-1, com min-w-0 */}
  <div className="flex col-span-1 min-w-0">
    <button type="submit" disabled={saving} className="btn btn-primary w-full p-0 flex items-center justify-center">
      {saving ? 'A processar' : 'Inserir'}
    </button>
  </div>
</form>

      {error && <p className="text-red-400 text-sm">{String(error)}</p>}

      {/* Lista paginada (50 por página) */}
      {sorted.length === 0 ? (
        <p className="text-slate-500">Sem transações</p>
      ) : (
        <>
          {/* Controlo de páginas */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">
              Total: {sorted.length} • Página {page + 1} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ◀
              </button>
              <select
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
                className="select"
                title="Ir para página"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i} value={i}>Página {i + 1}</option>
                ))}
              </select>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                ▶
              </button>
            </div>
          </div>

          {/* Lista (data em DD/MM/YYYY) */}
          <div className="rounded border border-white/10 max-h-[65vh] overflow-y-auto divide-y divide-white/5">
            {pageSlice.map((t) => {
              const isReceita = t.type === 'receita'
              const isPoupanca = t.type === 'poupanca'
              const amount = Number(t.valor) || 0
              const sinal = isReceita ? '+' : '-'
              const amountColor =
                isReceita ? 'text-emerald-400' : isPoupanca ? 'text-blue-400' : 'text-red-400'

              return (
                <div key={t.id ?? `${t.data}-${t.valor}-${t.categoryId ?? ''}`} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm px-2 py-0.5 rounded bg-white/5 capitalize">{t.type}</span>
                    <div className="text-sm text-neutral-300 truncate max-w-[48ch]" title={t.descricao ?? ''}>
                      {(t.categoryId && idToLabel.get(t.categoryId)) || t.categoria || '—'}
                      {t.descricao ? ` · ${t.descricao}` : ''} · {toPTDate(t.data)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`font-semibold ${amountColor}`}>{sinal}{fmtEUR(amount)}</div>
                    {t.id && (
                      <button
                        onClick={() => removerTransacao(t.id!)}
                        className="text-red-400 hover:text-red-300"
                        title="Remover"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}