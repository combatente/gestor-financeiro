import { useState, useMemo, useEffect } from 'react'
import { useFirestore } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'
import { useBudgets } from '../hooks/useBudgets'
import { formatPeriod, fmt } from '../utils/format';
import BudgetBar from "./BudgetBar";
import BudgetInputRow  from "./BudgetInputRow"

// TIPOS: Para resolver o erro TS2538 e TS2345
type Orcamento = {
  id?: string;
  categoryId: string; // Garantir que categoryId não é nulo/undefined aqui para uso no key
  periodo: string;
  limite?: number;
  valor?: number;
  [k: string]: any;
}

/**
 * Componente para renderizar um único cartão de Orçamento (Mantido)
 */
function BudgetCard({ orc, spentForBudget, idToLabel, removerOrcamento }: any) {
  // ... (código mantido)
  const { spent, lim, pctRaw } = spentForBudget(orc)
  const remaining = lim - spent

  const pctLabel =
    lim <= 0
      ? '—'
      : pctRaw >= 10
      ? `${Math.round(pctRaw)}%`
      : pctRaw > 0
      ? `${pctRaw.toFixed(1)}%`
      : '0%'

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
    (orc?.categoryId && idToLabel.get(String(orc.categoryId))) || '—'

  return (
    <div
      className="card p-4"
      key={orc?.id || `${orc?.categoryId || 'semcat'}_${orc?.periodo}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold">{catLabel}</div>
          <div className="text-xs text-neutral-400">
            Período: {formatPeriod(orc?.periodo)}
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
        ariaLabel={`Orçamento ${catLabel} ${orc?.periodo}`}
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
            if (!orc?.categoryId) return
            if (
              window.confirm(
                `Tem certeza que deseja remover o orçamento de ${catLabel} para ${formatPeriod(
                  orc.periodo
                )}?`
              )
            ) {
              removerOrcamento(String(orc.categoryId), String(orc.periodo))
            }
          }}
          className="text-red-500 hover:text-red-400 text-sm"
          title="Remover orçamento"
        >
          × Remover
        </button>
      </div>
    </div>
  )
}

// --- Componente principal ---
export default function Budgets() {
  
  const { 
    transacoes,
    orcamentos,
    // CORREÇÃO 1: Renomear a função real 'adicionarOrcamento' para 'atualizarOrcamento' 
    adicionarOrcamento,
    removerOrcamento,
    adicionarOrcamento: atualizarOrcamento,
    saving,
    error,
  } = useFirestore() as {
      transacoes: any[];
      orcamentos: Orcamento[];
      adicionarOrcamento: (o: any) => Promise<void>;
      removerOrcamento: (categoryId: string, periodo: string) => Promise<void>;
      saving: boolean;
      error: string | null;
      [key: string]: any;
  }
  
  const { items: categoryItems } = useCategories()

  // Filtra apenas categorias de despesa
  const expenseCategories = useMemo(
    () =>
      (categoryItems ?? []).filter((c: any) => c.type === 'despesa'),
    [categoryItems]
  )

  // id -> "😀 Nome"
  const idToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categoryItems ?? []) {
      if (c?.id) m.set(c.id, `${c.icon ? c.icon + ' ' : ''}${c.name}`)
    }
    return m
  }, [categoryItems])

  // Normalizamos orçamentos
  const orcamentosNorm = useMemo(
    () =>
      (orcamentos ?? []).map((o: any) => ({
        ...o,
        categoria: o.categoria ?? o.categoryId ?? 'semcat',
      })),
    [orcamentos]
  )

  const { alertas } = useBudgets(transacoes, orcamentosNorm)

  // Formulário de gestão de período
  const [periodo, setPeriodo] = useState<string>(new Date().toISOString().slice(0, 7)) // 'YYYY-MM'
  const [limitsByCat, setLimitsByCat] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Efeito para carregar limites existentes quando o período ou orçamentos mudam
  useEffect(() => {
    const currentLimits: Record<string, string> = {}
    
    for (const cat of expenseCategories) {
      // ✅ CORREÇÃO TS2538: Forçar catId para string para ser usado como índice
      const catId: string = cat.id! // cat.id deve ser uma string aqui
      const orc = (orcamentos ?? []).find(
        (o: any) =>
          String(o.categoryId) === catId && String(o.periodo) === periodo
      )
      currentLimits[catId] = (orc?.limite ?? orc?.valor)?.toString() ?? ''
    }
    setLimitsByCat(currentLimits)
  }, [periodo, orcamentos, expenseCategories])


  const spentForBudget = (orc: any) => {
    const lim = Number(orc.limite ?? orc.valor ?? 0)

    const spent = (transacoes ?? [])
      .filter((t: any) => {
        const inMonth =
          String(t?.data ?? '').slice(0, 7) === String(orc?.periodo ?? '')
        if (!inMonth || t?.type !== 'despesa') return false
        return String(t?.categoryId ?? '') === String(orc?.categoryId ?? '')
      })
      .reduce((s: number, t: any) => s + (Number(t?.valor) || 0), 0)

    const pctRaw = lim > 0 ? (spent / lim) * 100 : 0
    return { spent, lim, pctRaw }
  }

  function handleLimitChange(categoryId: string, value: string) {
    setLimitsByCat((prev) => ({
      ...prev,
      [categoryId]: value,
    }))
  }


  async function handleSaveAllBudgets(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo))
      return setFormError('Período inválido (AAAA-MM).')

    const operations = []
    
    for (const category of expenseCategories) {
      // ✅ CORREÇÃO TS2538: Forçar categoryId para string para ser usado como índice
      const categoryId: string = category.id! 
      const rawLimit = limitsByCat[categoryId] ?? ''
      const newLimit = rawLimit === '' ? 0 : Number(rawLimit)

      if (rawLimit !== '' && (!Number.isFinite(newLimit) || newLimit < 0)) {
        // ✅ CORREÇÃO TS2345: Garantir que idToLabel.get(categoryId) é tratado como string ou fallback
        return setFormError(`Limite inválido para ${idToLabel.get(categoryId) ?? 'categoria desconhecida'}.`)
      }

      const existingOrcamento = orcamentos.find(
        (o: any) =>
          String(o.categoryId) === categoryId && String(o.periodo) === periodo
      )
      
      const isExisting = !!existingOrcamento
      const isZero = newLimit <= 0

      if (isExisting) {
        if (!isZero) {
          // 1. ATUALIZAR
          operations.push({
            type: 'update',
            id: existingOrcamento.id,
            categoryId: categoryId,
            periodo: periodo,
            limite: newLimit,
          })
        } else {
          // 2. REMOVER
          operations.push({
            type: 'remove',
            categoryId: categoryId,
            periodo: periodo,
          })
        }
      } else if (!isZero) {
        // 3. ADICIONAR
        operations.push({
          type: 'add',
          categoryId: categoryId,
          periodo: periodo,
          limite: newLimit,
        })
      }
    }

    try {
      for (const op of operations) {
        if (op.type === 'add') {
          await adicionarOrcamento(op) 
        } else if (op.type === 'update') {
          // Chamar a função de atualização/criação com o objeto de orçamento
          await atualizarOrcamento({ categoryId: op.categoryId, periodo: op.periodo, limite: op.limite })
        } else if (op.type === 'remove') {
          // ✅ CORREÇÃO TS2345: Forçar o tipo string para o argumento
          await removerOrcamento(op.categoryId, op.periodo!)
        }
      }
      
      setFormError(null)

    } catch (e: any) {
      setFormError(e?.message ?? 'Erro ao salvar os orçamentos.')
    }
  }


  // Filtra os orçamentos para a lista de cards, excluindo o mês que está em edição
  const orcamentosParaCards = useMemo(() => {
    return (orcamentos ?? []).filter(
        (o: any) => String(o.periodo) !== periodo
    )
  }, [orcamentos, periodo])


  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">🎯 Orçamentos Ativos</h2>

      {/* Formulário de gestão por período */}
      <form onSubmit={handleSaveAllBudgets} className="space-y-4">
        <h3 className="font-semibold text-lg card p-3">Gerir Orçamentos Mensais: {formatPeriod(periodo)}</h3>
        
        {/* Seletor de Período */}
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col w-48">
            <label className="text-sm text-neutral-400">Alterar Período</label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="input"
              required
            />
          </div>
          
          <button type="submit" disabled={saving || expenseCategories.length === 0} className="btn btn-primary w-full sm:w-auto">
            {saving ? 'A salvar alterações…' : '💾 Salvar todos os Orçamentos'}
          </button>
        </div>

        {/* Lista de Categorias com o novo design de Linha/Card */}
        <div className="space-y-4">
          {expenseCategories.length === 0 ? (
            <p className="text-slate-500 card p-4">Nenhuma categoria de despesa definida.</p>
          ) : (
            expenseCategories.map((cat: any) => (
              <BudgetInputRow
                key={cat.id}
                cat={cat}
                limite={limitsByCat[cat.id as string]} // Garantir que a chave é string
                onLimitChange={handleLimitChange}
                spentForBudget={spentForBudget}
                orcamentoExistente={orcamentos.find(
                  (o: any) =>
                    String(o.categoryId) === cat.id && String(o.periodo) === periodo
                )}
              />
            ))
          )}
        </div>
      </form>

      {/* Erros e Alertas */}
      {formError && <p className="text-red-400 text-sm mt-3">{formError}</p>}
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {!!alertas.length && (
        <ul className="mt-2 space-y-1">
          {alertas.map((a: string, i: number) => (
            <li key={i} className="text-amber-300 text-sm">
              • {a}
            </li>
          ))}
        </ul>
      )}

      {/* Lista de orçamentos ativos (Outros Períodos) */}
      <h3 className="text-lg font-bold pt-4">Orçamentos Definidos (Outros Períodos)</h3>
      {orcamentosParaCards.length === 0 ? (
        <p className="text-slate-500">Nenhum orçamento definido para outros períodos.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {orcamentosParaCards.map((o: any) => (
            <BudgetCard
              key={o?.id || `${o?.categoryId || 'semcat'}_${o?.periodo}`}
              orc={o}
              spentForBudget={spentForBudget}
              idToLabel={idToLabel}
              removerOrcamento={removerOrcamento}
            />
          ))}
        </div>
      )}
    </div>
  )
}