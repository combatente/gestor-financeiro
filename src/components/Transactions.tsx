import { useMemo, useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import CategorySelect from './CategorySelect'
import { useCategories } from '../hooks/useCategories'

type Tipo = 'receita' | 'despesa' | 'divida' | 'poupanca'

export default function Transactions() {
  const {
    transacoes,
    adicionarTransacao,
    removerTransacao,
    saving,
    error,
  } = useFirestore()

  const { items: categories } = useCategories()

  const [type, setType] = useState<Tipo>('despesa')
  const [valor, setValor] = useState<string>('')
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10)) // YYYY-MM-DD
  const [categoryId, setCategoryId] = useState<string>('')

  // NOVO: descrição livre (opcional)
  const [descricao, setDescricao] = useState<string>('')

  // Label da categoria por id para a lista
  const idToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) {
      if (c.id) m.set(c.id, `${c.icon ? c.icon + ' ' : ''}${c.name}`)
    }
    return m
  }, [categories])

  function fmtEUR(n: number) {
    return Number(n || 0).toLocaleString('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()

    const v = Number(valor)
    if (!Number.isFinite(v)) {
      alert('Valor inválido.')
      return
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(data)) {
      alert('Data inválida. Usa AAAA-MM-DD.')
      return
    }

    try {
      await adicionarTransacao({
        type,
        valor: v,
        data,
        categoryId: categoryId || undefined,
        descricao: descricao.trim() || undefined, // 👈 novo
      })
      setValor('')
      setDescricao('')
      // Mantemos categoria e tipo para mais entradas consecutivas
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao adicionar transação.')
    }
  }

  // Escolha do "type" para CategorySelect:
  // - 'receita' → categorias de receita
  // - 'poupanca' → categorias de poupanca (ou de despesa de transferência, conforme o teu modelo)
  // - demais → 'despesa'
  const categoryTypeForSelect: 'receita' | 'poupanca' | 'despesa' =
    type === 'receita' ? 'receita' : type === 'poupanca' ? 'poupanca' : 'despesa'

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">📋 Transações</h2>

      {/* Formulário */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        {/* Tipo */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Tipo</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as Tipo)
              setCategoryId('')
            }}
            className="select min-w-40"
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
            <option value="divida">Dívida</option>
            <option value="poupanca">Poupança</option>
          </select>
        </div>

        {/* Categoria */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Categoria</label>
          <CategorySelect
            type={categoryTypeForSelect}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Seleciona categoria"
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Descrição (opcional)</label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Continente Braga Parque"
            className="input min-w-64"
            maxLength={200}
          />
        </div>

        {/* Valor */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Valor (€)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
            className="input"
            required
          />
        </div>

        {/* Data */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="input"
            required
          />
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'A guardar…' : 'Adicionar'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{String(error)}</p>}

      {/* Lista de transações */}
      {transacoes.length === 0 ? (
        <p className="text-slate-500">Sem transações</p>
      ) : (
        <div className="divide-y divide-white/5 rounded border border-white/10">
          {transacoes.map((t) => {
            const isReceita = t.type === 'receita'
            const isPoupanca = t.type === 'poupanca'
            const amount = Number(t.valor) || 0
            const sinal = isReceita ? '+' : '-' // podes ajustar se quiseres que poupanca mostre '-'
            const amountColor =
              isReceita ? 'text-emerald-400' : isPoupanca ? 'text-blue-400' : 'text-red-400'

            return (
              <div key={t.id ?? `${t.data}-${t.valor}-${t.categoryId ?? ''}`} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm px-2 py-0.5 rounded bg-white/5 capitalize">
                    {t.type}
                  </span>
                  <div className="text-sm text-neutral-300">
                    {(t.categoryId && idToLabel.get(t.categoryId)) || t.categoria || '—'}
                    {t.descricao ? ` · ${t.descricao}` : ''} · {t.data}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`font-semibold ${amountColor}`}>
                    {sinal}{fmtEUR(amount)}
                  </div>
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
      )}
    </section>
  )
}