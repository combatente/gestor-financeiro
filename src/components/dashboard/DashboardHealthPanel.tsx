import { Card } from "../ui/Card"
import { AlertTriangle, CheckCircle, Info } from "lucide-react"

type SmartTip = { type: "danger" | "warning" | "success" | "info"; msg: string }

type Props = {
  financialScore: number
  taxaPoupanca: number
  despesasSobreReceitasPct: number
  categoriasAtivas: number
  smartTip: SmartTip
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#86efac" : score >= 50 ? "#fde68a" : "#fca5a5"
  const label = score >= 75 ? "Excelente" : score >= 50 ? "Bom" : score >= 25 ? "A melhorar" : "Crítico"
  const r = 44; const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(var(--border),0.15)" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[rgb(var(--text))]">{score}</span>
          <span className="text-[9px] text-[rgb(var(--text-muted))] uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

const TIP_ICON = { danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle, info: Info }
const TIP_COLOR = { danger: "text-rose-400", warning: "text-amber-400", success: "text-emerald-400", info: "text-blue-400" }

export function DashboardHealthPanel({ financialScore, taxaPoupanca, despesasSobreReceitasPct, categoriasAtivas, smartTip }: Props) {
  const TipIcon = TIP_ICON[smartTip.type]
  const tipColor = TIP_COLOR[smartTip.type]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="flex flex-col items-center justify-center gap-3 py-6">
        <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">Saúde Financeira</div>
        <ScoreRing score={financialScore} />
      </Card>

      <Card className="md:col-span-2 flex flex-col justify-center gap-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">Indicadores</div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[rgb(var(--text))]">{taxaPoupanca}%</div>
            <div className="text-xs text-[rgb(var(--text-muted))]">Taxa de Poupança</div>
          </div>
          <div className="text-center border-x border-[rgba(var(--border),var(--border-alpha))]">
            <div className="text-2xl font-bold text-[rgb(var(--text))]">{despesasSobreReceitasPct}%</div>
            <div className="text-xs text-[rgb(var(--text-muted))]">Despesas / Receitas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[rgb(var(--text))]">{categoriasAtivas}</div>
            <div className="text-xs text-[rgb(var(--text-muted))]">Categorias Ativas</div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-sm p-3 rounded-xl bg-[rgba(var(--surface-2),0.6)]">
          {TipIcon && <TipIcon size={16} className={`${tipColor} flex-shrink-0 mt-0.5`} />}
          <span className="text-[rgb(var(--text-muted))]">{smartTip.msg}</span>
        </div>
      </Card>
    </div>
  )
}
