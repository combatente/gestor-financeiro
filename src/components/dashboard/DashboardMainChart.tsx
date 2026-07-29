import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend,
  ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { Activity } from "lucide-react"
import { Card } from "../ui/Card"
import { CustomTooltip } from "./CustomTooltip"
import { CHART_COLORS, type ModeOption } from "./dashboardHelpers"

type Props = {
  mode: ModeOption
  serieMensal: { mes: string; receitas: number; despesas: number; poupancas: number }[]
  serieDiaria: { dia: string; Receitas: number; Despesas: number }[]
  picoDespesas: { x: string; y: number } | null
}

const axisStyle = { fontSize: 11, fill: 'rgb(var(--text-muted))' } as const

export function DashboardMainChart({ mode, serieMensal, serieDiaria, picoDespesas }: Props) {
  return (
    <Card>
      <div className="section-header">
        <div className="section-title">
          {mode === "range" ? "📈 Evolução Mensal" : mode === "financeiro" ? "💰 Mês Financeiro" : "📆 Fluxo Diário"}
        </div>
        <div className="flex items-center gap-1">
          <Activity size={14} className="text-[rgb(var(--text-muted))]" />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        {mode === "range" ? (
          <AreaChart data={serieMensal} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.receitas} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.receitas} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.despesas} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.despesas} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPoup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.poupancas} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.poupancas} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border),0.08)" />
            <XAxis dataKey="mes" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--text-muted))' }} />
            <Area type="monotone" dataKey="receitas" name="Receitas" stroke={CHART_COLORS.receitas} fill="url(#gradRec)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="despesas" name="Despesas" stroke={CHART_COLORS.despesas} fill="url(#gradDesp)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="poupancas" name="Poupanças" stroke={CHART_COLORS.poupancas} fill="url(#gradPoup)" strokeWidth={2} dot={false} />
            {picoDespesas && (
              <ReferenceDot x={picoDespesas.x} y={picoDespesas.y} r={5} fill={CHART_COLORS.despesas} stroke="white" strokeWidth={2} />
            )}
          </AreaChart>
        ) : (
          <BarChart data={serieDiaria} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border),0.08)" />
            <XAxis dataKey="dia" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--text-muted))' }} />
            <Bar dataKey="Receitas" fill={CHART_COLORS.receitas} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="Despesas" fill={CHART_COLORS.despesas} radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  )
}
