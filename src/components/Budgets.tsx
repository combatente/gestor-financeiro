// src/components/Budgets.tsx
import { useState, useMemo } from 'react'
import { BudgetBar } from './BudgetBar'
import { useFirestore } from '../hooks/useFirestore'
import { useBudgets } from '../hooks/useBudgets'
import CategorySelect from './CategorySelect'
import { useCategories } from '../hooks/useCategories'

export default function Budgets() {
  const {
    transacoes,
    orcamentos,
    adicionarOrcamento,
    removerOrcamento,
    saving,
    error,
  } = useFirestore()

  const { items: categoryItems } = useCategories()

  // id -> "😀 Nome" (se houver icon)
  const idToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categoryItems ?? []) {
      if (c?.id) m.set(c.id, `${c.icon ? c.icon + ' ' : ''}${c.name}`)
    }
    return m
  }, [categoryItems])

  // ⚠️ Alguns hooks/peças antigas podem ainda esperar 'categoria' textual
  // Normalizamos orçamentos para garantir a compatibilidade
  const orcamentosNorm = useMemo(
    () =>
      (orcamentos ?? []).map((o: any) => ({
        ...o,
        categoria: o.categoria ?? o.categoryId ?? 'semcat',
      })),
    [orcamentos]
  )

  const { alertas } = useBudgets(transacoes, orcamentosNorm)

  // Formulário
  const [categoryId, setCategoryId] = useState<string>('') // obrigatório
  const [periodo, setPeriodo] = useState<string>(new Date().toISOString().slice(0, 7)) // 'YYYY-MM'
  const [limite, setLimite] = useState<string>('')

  const fmt = (n: number) =>
    Number(n || 0).toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  function spentForBudget(orc: any) {
    const lim = Number(orc.limite ?? orc.valor ?? 0)

    const spent = (transacoes ?? [])
      .filter((t: any) => {
        const inMonth =
          String(t?.data ?? '').slice(0, 7) === String(orc?.periodo ?? '')
        if (!inMonth || t?.type !== 'despesa') return false
        // orçamentos por categoryId
        return String(t?.categoryId ?? '') === String(orc?.categoryId ?? '')
      })
      .reduce((s: number, t: any) => s + (Number(t?.valor) || 0), 0)

    const pctRaw = lim > 0 ? (spent / lim) * 100 : 0
    return { spent, lim, pctRaw }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const lim = Number(limite)

    if (!categoryId) return alert('Seleciona a categoria.')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo))
      return alert('Período inválido (AAAA-MM).')
    if (!Number.isFinite(lim) || lim < 0) return alert('Limite inválido.')

    try {
      await adicionarOrcamento({ categoryId, periodo, limite: lim }) // apenas id
      setLimite('')
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao adicionar orçamento.')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">🎯 Orçamentos Ativos</h2>

      {/* Formulário para criar orçamento */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        {/* Categoria */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Categoria</label>
          <CategorySelect
            type="despesa"
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Seleciona categoria"
            // NOTA: não passamos 'required' aqui para evitar erro de tipagem;
            // a validação é feita no handleAdd()
          />
        </div>

        {/* Período */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Período</label>
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Limite */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Limite (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            placeholder="0.00"
            className="input"
            required
          />
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'A guardar…' : '➕ Adicionar novo orçamento'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!!alertas.length && (
        <ul className="mt-2 space-y-1">
          {alertas.map((a: string, i: number) => (
            <li key={i} className="text-amber-300 text-sm">
              • {a}
            </li>
          ))}
        </ul>
      )}

      {/* Lista de orçamentos com barra */}
      {orcamentos.length === 0 ? (
        <p className="text-slate-500">Nenhum orçamento definido</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {orcamentos.map((o: any, idx: number) => {
            const { spent, lim, pctRaw } = spentForBudget(o)
            const pctLabel = lim > 0 ? `${Math.round(pctRaw)}%` : '—'
            const remaining = lim - spent

            const statusText =
              lim <= 0
                ? 'Sem limite'
                : pctRaw >= 100
                ? 'Ultrapassado'
                : pctRaw >= 90
                ? 'Muito perto'
                : pctRaw >= 80
                ? 'Aproximar'
                : 'Confortável'

            const statusColor =
              pctRaw >= 100
                ? 'text-red-400'
                : pctRaw >= 90
                ? 'text-orange-400'
                : pctRaw >= 80
                ? 'text-amber-300'
                : 'text-emerald-400'

            const catLabel =
              (o?.categoryId && idToLabel.get(String(o.categoryId))) || '—'

            return (
              <div
                key={o?.id || `${o?.categoryId || 'semcat'}_${o?.periodo}_${idx}`}
                className="card p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold">{catLabel}</div>
                    <div className="text-xs text-neutral-400">
                      Período: {o?.periodo}
                    </div>
                  </div>
                  <div className={`text-xs ${statusColor}`}>{statusText}</div>
                </div>

                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="text-neutral-300">
                    Gasto:{' '}
                    <span className="font-medium">€{fmt(spent)}</span>
                  </div>
                  <div className="text-neutral-300">
                    Limite:{' '}
                    <span className="font-medium">€{fmt(lim)}</span>
                  </div>
                </div>

                <BudgetBar
                  value={spent}
                  max={lim}
                  ariaLabel={`Orçamento ${catLabel} ${o?.periodo}`}
                />

                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <div>{pctLabel}</div>
                  {lim > 0 && (
                    <div className={remaining < 0 ? 'text-red-400' : 'text-neutral-400'}>
                      {remaining < 0 ? 'A mais: ' : 'Por gastar: '}€
                      {fmt(Math.abs(remaining))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      if (!o?.categoryId) return
                      removerOrcamento(String(o.categoryId), String(o.periodo))
                    }}
                    className="text-red-500 hover:text-red-400 text-sm"
                    title="Remover orçamento"
                  >
                    × Remover
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
