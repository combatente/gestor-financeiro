import { motion } from "framer-motion"
import { KPICard } from "../ui/KPICard"
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, PiggyBank, Wallet } from "lucide-react"
import { eur, pct } from "./dashboardHelpers"

type Props = {
  curSaldo: number
  prevSaldo: number
  curReceitas: number
  prevReceitas: number
  curDespesas: number
  prevDespesas: number
  curPoupancas: number
  prevPoupancas: number
  taxaPoupanca: number
}

function delta(cur: number, prev: number) {
  if (prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

export function DashboardKpis({
  curSaldo, prevSaldo, curReceitas, prevReceitas, curDespesas, prevDespesas, curPoupancas, prevPoupancas, taxaPoupanca,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Saldo Disponível" value={eur(curSaldo)} subtitle="Receitas − Despesas − Poupanças"
          icon={Wallet} variant={curSaldo >= 0 ? "green" : "red"} delta={delta(curSaldo, prevSaldo)} trendPolicy="upGood" index={0} />
        <KPICard title="Total Receitas" value={eur(curReceitas)} subtitle="Entradas no período"
          icon={ArrowUpCircle} variant="green" delta={delta(curReceitas, prevReceitas)} trendPolicy="upGood" index={1} />
        <KPICard title="Total Despesas" value={eur(curDespesas)} subtitle={`${pct(curDespesas, curReceitas || 1)}% das receitas`}
          icon={ArrowDownCircle} variant="red" delta={delta(curDespesas, prevDespesas)} trendPolicy="downGood" index={2} />
        <KPICard title="Poupanças" value={eur(curPoupancas)} subtitle={`Taxa: ${taxaPoupanca}% do rendimento`}
          icon={PiggyBank} variant="blue" delta={delta(curPoupancas, prevPoupancas)} trendPolicy="upGood" index={3} />
      </div>

      {curSaldo < 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl border"
          style={{ background: 'rgba(var(--pastel-red-bg),0.3)', borderColor: 'rgba(var(--pastel-red-text),0.2)' }}
        >
          <AlertTriangle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-400 text-sm">Saldo negativo</div>
            <div className="text-sm text-[rgb(var(--text-muted))]">
              Reduza as despesas em <span className="font-bold text-rose-400">{eur(Math.abs(curSaldo))}</span> para equilibrar.
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}
