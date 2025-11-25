// src/components/Analytics.tsx
import { useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'

import NeedVsWantChart from './NeedVsWantChart'
import NeedVsWantTrend from './NeedVsWantTrend'
import BudgetAllocationDragBar from './BudgetAllocationDragBar'
import AllocationBulkApply from './AllocationBulkApply'
import BudgetVsActualMini from './BudgetVsActualMini'
import MonthlyIncomeExpenseTrend from './MonthlyIncomeExpenseTrend'

export default function Analytics() {
  const { transacoes } = useFirestore()
  const [mes, setMes] = useState<string>(new Date().toISOString().slice(0, 7))

  const hasTx = transacoes.length > 0

  return (
    <div className="space-y-8">
      {/* 🎯 Orçamento 50/30/20 (definição por mês) */}
      <div className="rounded-lg border border-white/10 bg-white dark:bg-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">
            🎯 Orçamento 50/30/20
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500 dark:text-slate-300">Mês</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="border rounded px-2 py-1 bg-transparent"
              aria-label="Selecionar mês para orçamento"
            />
          </div>
        </div>

        {/* Barra com divisórias arrastáveis (Necessidade / Vontade / Poupança) */}
        <BudgetAllocationDragBar mes={mes} />

        {/* Comparativo Execução vs Alvo (€) para o mês selecionado */}
        <div className="mt-4">
          <BudgetVsActualMini mes={mes} />
        </div>

        {/* Propagar a alocação do mês atual para vários meses */}
        <div className="mt-4">
          <AllocationBulkApply mesOrigem={mes} />
        </div>
      </div>

      {/* Pizza: repartição por natureza (Necessidade/Vontade/Poupança) */}
      <NeedVsWantChart mes={mes} />

      {/* Barras: evolução 6 meses (Necessidade/Vontade/Poupança) até ao mês selecionado */}
      <NeedVsWantTrend endMonth={mes} />

      {/* Evolução diária/acumulada do mês selecionado (Receitas vs Despesas) */}
      {hasTx ? <MonthlyIncomeExpenseTrend mes={mes} /> : (
        <p className="text-slate-500 text-center py-10">
          Adicione transações para ver análises
        </p>
      )}
    </div>
  )
}