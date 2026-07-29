import { CreditCard, PiggyBank, TrendingDown, TrendingUp } from "lucide-react"
import { Card } from "../ui/Card"
import { EmptyState } from "../ui/EmptyState"
import { eur } from "./dashboardHelpers"
import type { Transacao } from "../../hooks/useFirestore"

type Props = {
  recentTx: Transacao[]
  catNameMap: Map<string, string>
}

export function DashboardRecentTransactions({ recentTx, catNameMap }: Props) {
  return (
    <Card>
      <div className="section-header">
        <div className="section-title">Transações Recentes</div>
      </div>
      {recentTx.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sem transações" description="Adicione a primeira transação." />
      ) : (
        <div className="space-y-2">
          {recentTx.map((tx) => {
            const catName = catNameMap.get(tx.categoryId ?? "") || tx.categoria || ""
            const isIncome = tx.type === "receita"
            const isPoupanca = tx.type === "poupanca"
            return (
              <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[rgba(var(--surface-2),0.5)] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isIncome ? "bg-emerald-400/10" : isPoupanca ? "bg-blue-400/10" : "bg-rose-400/10"
                }`}>
                  {isIncome ? <TrendingUp size={14} className="text-emerald-400" />
                    : isPoupanca ? <PiggyBank size={14} className="text-blue-400" />
                    : <TrendingDown size={14} className="text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[rgb(var(--text))] truncate">
                    {tx.descricao || catName || "Sem descrição"}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">{tx.data}</div>
                </div>
                <div className={`text-sm font-bold ${
                  isIncome ? "text-emerald-400" : isPoupanca ? "text-blue-400" : "text-rose-400"
                }`}>
                  {isIncome ? "+" : "−"}{eur(tx.valor)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
