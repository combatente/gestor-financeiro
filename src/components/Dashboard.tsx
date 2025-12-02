import { motion } from "framer-motion";
import { useState, useMemo, useTransition } from "react";
import { useFirestore } from "../hooks/useFirestore";
import { useCategories } from "../hooks/useCategories";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

// ---------- Utils ----------
const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const percentText = (parte: number, total: number) => {
  if (!total || !Number.isFinite(parte) || !Number.isFinite(total)) return "—";
  return `${Math.round((parte / total) * 100)}%`;
};

type RangeOption = "1M" | "3M" | "6M" | "1A" | "2A";
type ModeOption = "range" | "month";

// ---------- Paleta (mockup) ----------
const COLOR = {
  receitas: "#22C55E", // verde
  despesas: "#F59E0B", // âmbar
  despesasBad: "#EF4444", // vermelho (para piora)
  poupancas: "#3B82F6", // azul
  saldoPos: "#22C55E",
  saldoNeg: "#EF4444",

  // 50/30/20
  necessidades: "#3B82F6",
  vontades: "#F59E0B",
  poupanca50: "#22C55E",

  // tema escuro
  grid: "#475569", // slate-600
  axisText: "#cbd5e1", // slate-300
  textLight: "#e5e7eb", // slate-200
};

const BAR_COLORS = [
  "#22C55E",
  "#4ADE80",
  "#86EFAC",
  "#F59E0B",
  "#FBBF24",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
];

// ---------- Helpers de período ----------
function monthsFromRange(r: RangeOption): number {
  switch (r) {
    case "1M":
      return 1;
    case "3M":
      return 3;
    case "6M":
      return 6;
    case "1A":
      return 12;
    case "2A":
      return 24;
    default:
      return 6;
  }
}

function getBounds(range: RangeOption) {
  const months = monthsFromRange(range);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setMonth(to.getMonth() - (months - 1));
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function getMonthBounds(yyyyMM: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yyyyMM)) {
    const now = new Date();
    yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const [yy, mm] = yyyyMM.split("-").map(Number);
  const from = new Date(yy, mm - 1, 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(yy, mm, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getPrevBounds(range: RangeOption, month?: string) {
  if (month) {
    const [yy, mm] = month.split("-").map(Number);
    const prevTo = new Date(yy, mm - 1, 0);
    prevTo.setHours(23, 59, 59, 999);
    const prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), 1);
    prevFrom.setHours(0, 0, 0, 0);
    return { from: prevFrom, to: prevTo };
  }
  const { from } = getBounds(range);
  const prevTo = new Date(from);
  prevTo.setDate(0);
  prevTo.setHours(23, 59, 59, 999);
  const months = monthsFromRange(range);
  const prevFrom = new Date(prevTo);
  prevFrom.setMonth(prevTo.getMonth() - (months - 1));
  prevFrom.setDate(1);
  prevFrom.setHours(0, 0, 0, 0);
  return { from: prevFrom, to: prevTo };
}

function inBounds(d: Date, bounds: { from: Date; to: Date }) {
  return d >= bounds.from && d <= bounds.to;
}

// ---------- Component ----------
export default function Dashboard() {
  const { transacoes, dadosGraficoTempo, getTransacoesInRange } = useFirestore();
  const { items: categories } = useCategories();

  const [mode, setMode] = useState<ModeOption>("range");
  const [range, setRange] = useState<RangeOption>("6M");
  const defaultMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();
  const [month, setMonth] = useState<string>(defaultMonth);

  const [isPending, startTransition] = useTransition();

  // mapa id -> nome
  const categoriesNameMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c: any) => {
      if (c.id) m.set(c.id, c.name ?? "");
    });
    return m;
  }, [categories]);

  // Filtragem principal
  const txFiltered = useMemo(() => {
    if (mode === "range") return getTransacoesInRange(range);
    const b = getMonthBounds(month);
    return transacoes.filter((t) => inBounds(new Date(t.data), b));
  }, [mode, range, month, transacoes, getTransacoesInRange]);

  // Série mensal
  const serieBruta = useMemo(() => dadosGraficoTempo(range), [dadosGraficoTempo, range]);

  // Totais atuais
  const sumByType = (list: any[], type: string) =>
    list.filter((t) => t.type === type).reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const curReceitas = useMemo(() => sumByType(txFiltered, "receita"), [txFiltered]);
  const curDespesas = useMemo(() => sumByType(txFiltered, "despesa"), [txFiltered]);
  const curPoupancas = useMemo(() => sumByType(txFiltered, "poupanca"), [txFiltered]);
  const curSaldo = useMemo(
    () => curReceitas - curDespesas - curPoupancas,
    [curReceitas, curDespesas, curPoupancas]
  );

  // Período anterior
  const prevBounds = useMemo(
    () => (mode === "month" ? getPrevBounds(range, month) : getPrevBounds(range)),
    [mode, range, month]
  );
  const txPrev = useMemo(
    () => transacoes.filter((t) => inBounds(new Date(t.data), prevBounds)),
    [transacoes, prevBounds]
  );
  const prevReceitas = useMemo(() => sumByType(txPrev, "receita"), [txPrev]);
  const prevDespesas = useMemo(() => sumByType(txPrev, "despesa"), [txPrev]);
  const prevPoupancas = useMemo(() => sumByType(txPrev, "poupanca"), [txPrev]);
  const prevSaldo = useMemo(
    () => prevReceitas - prevDespesas - prevPoupancas,
    [prevReceitas, prevDespesas, prevPoupancas]
  );

  const deltaPct = (cur: number, prev: number) => {
    if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
    if (prev === 0) return cur !== 0 ? null : 0;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };
  const deltaReceitas = deltaPct(curReceitas, prevReceitas);
  const deltaDespesas = deltaPct(curDespesas, prevDespesas);
  const deltaPoupancas = deltaPct(curPoupancas, prevPoupancas);
  const deltaSaldo = deltaPct(curSaldo, prevSaldo);

  const despesasSobreReceitas = percentText(curDespesas, curReceitas);
  const poupancasSobreReceitas = percentText(curPoupancas, curReceitas);

  // Pico de despesas (apenas range)
  const picoDespesas = useMemo(() => {
    if (mode !== "range") return null;
    let idx = -1,
      max = -Infinity;
    serieBruta.forEach((d, i) => {
      if (Number.isFinite(d.despesas) && d.despesas > max) {
        max = d.despesas;
        idx = i;
      }
    });
    return idx >= 0 ? { x: serieBruta[idx].mes, y: serieBruta[idx].despesas } : null;
  }, [mode, serieBruta]);

  // Diário (apenas mês) - ESTE É O GRÁFICO MOVIDO
  const dailySeries = useMemo(() => {
    if (mode !== "month") return [] as { dia: number; receitas: number; despesas: number }[];
    const b = getMonthBounds(month);
    const daysInMonth = new Date(b.from.getFullYear(), b.from.getMonth() + 1, 0).getDate();
    const byDay: { [k: number]: { income: number; expense: number } } = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[d] = { income: 0, expense: 0 };
    txFiltered.forEach((t) => {
      const d = new Date(t.data);
      if (!inBounds(d, b)) return;
      const day = d.getDate();
      if (t.type === "receita") byDay[day].income += Number(t.valor) || 0;
      if (t.type === "despesa") byDay[day].expense += Number(t.valor) || 0;
    });
    return Object.entries(byDay).map(([dia, v]) => ({ dia: Number(dia), receitas: v.income, despesas: v.expense }));
  }, [mode, month, txFiltered]);

  // Mapa categorias -> spendNature
  const categoriesNatureMap = useMemo(() => {
    const m = new Map<string, "necessidade" | "vontade">();
    categories.forEach((c: any) => {
      if (c.id && c.type === "despesa") m.set(c.id, c.spendNature ?? "necessidade");
    });
    return m;
  }, [categories]);

  // Top 8 por categoria
  const categoriasTop8 = useMemo(() => {
    const somaPorCat = new Map<string, number>();
    txFiltered.forEach((t) => {
      if (t.type !== "despesa") return;
      const nome =
        categoriesNameMap.get(t.categoryId ?? "") || (t.categoria ?? "").trim() || "Outros";
      const val = Number(t.valor) || 0;
      somaPorCat.set(nome, (somaPorCat.get(nome) ?? 0) + val);
    });

    const ordenado = Array.from(somaPorCat.entries())
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const top = ordenado.slice(0, 8);
    const totalDespesasPeriodo = curDespesas || 1;

    return top.map(([name, value]) => {
      const pct = Math.round((value / totalDespesasPeriodo) * 100);
      return { name, value, pct, labelText: `${pct}% • ${eur(value)}` };
    });
  }, [txFiltered, categoriesNameMap, curDespesas]);

  // 50/30/20 real
  const distNWS = useMemo(() => {
    let necessidades = 0,
      vontades = 0,
      poupanca = 0;
    txFiltered.forEach((t) => {
      const val = Number(t.valor) || 0;
      if (t.type === "despesa") {
        const n = categoriesNatureMap.get(t.categoryId ?? "") ?? "necessidade";
        if (n === "necessidade") necessidades += val;
        else vontades += val;
      }
      if (t.type === "poupanca") poupanca += val;
    });
    return [
      { name: "Necessidades", value: necessidades },
      { name: "Vontades", value: vontades },
      { name: "Poupança", value: poupanca },
    ];
  }, [txFiltered, categoriesNatureMap]);

  const NWS_COLORS: Record<string, string> = {
    Necessidades: COLOR.necessidades,
    Vontades: COLOR.vontades,
    Poupança: COLOR.poupanca50,
  };

  const faltaEquilibrar = curSaldo < 0 ? Math.abs(curSaldo) : 0;

  const onSetMode = (m: ModeOption) => startTransition(() => setMode(m));
  const onSetRange = (opt: RangeOption) => startTransition(() => setRange(opt));
  const onSetMonth = (val: string) => startTransition(() => setMonth(val));

  // NOVO BLOCO: Controlo Range ↔ Mês (Movido para aqui)
  const FilterControls = (
    <div className="flex items-center gap-3">
        <div className="inline-flex rounded-md overflow-hidden border border-white/10">
          <button
            className={`px-3 py-1 text-sm ${mode === "range" ? "bg-slate-900 text-white" : "bg-slate-700 text-slate-200"}`}
            onClick={() => onSetMode("range")}
          >
            Range
          </button>
          <button
            className={`px-3 py-1 text-sm ${mode === "month" ? "bg-slate-900 text-white" : "bg-slate-700 text-slate-200"}`}
            onClick={() => onSetMode("month")}
          >
            Mês
          </button>
        </div>
        {mode === "range" ? (
          <div className="inline-flex rounded-md overflow-hidden border border-white/10">
            {["1M", "3M", "6M", "1A", "2A"].map((opt) => (
              <button
                key={opt}
                onClick={() => onSetRange(opt as RangeOption)}
                className={`px-3 py-1 text-sm ${range === opt ? "bg-slate-900 text-white" : "bg-slate-700 text-slate-200"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="month"
            value={month}
            onChange={(e) => onSetMonth(e.target.value)}
            className="px-3 py-1 rounded border border-white/10 bg-slate-800 text-slate-100"
          />
        )}
        {isPending && <span className="text-xs text-slate-400">A atualizar…</span>}
    </div>
  );
  // FIM DO BLOCO: Controlo Range ↔ Mês
  

  if (!txFiltered.length) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {FilterControls} {/* MANTEM OS FILTROS SEMPRE VISÍVEIS */}
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-500 text-lg">Sem dados no período selecionado. Por favor, utilize os controlos acima para selecionar outro Mês ou Range.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {FilterControls} {/* Controlo Range ↔ Mês */}

      {/* Cards conforme mockup */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Receitas" value={curReceitas} color={COLOR.receitas} delta={deltaReceitas} icon="💹" trendPolicy="upGood" />
        <MetricCard title="Despesas" value={curDespesas} color={COLOR.despesas} delta={deltaDespesas} icon="📉" trendPolicy="downGood" />
        <MetricCard title="Saldo" value={curSaldo} color={curSaldo >= 0 ? COLOR.saldoPos : COLOR.saldoNeg} delta={deltaSaldo} icon="💰" trendPolicy="upGood" />
        <MetricCard title="Poupanças" value={curPoupancas} color={COLOR.poupancas} delta={deltaPoupancas} icon="🔒" trendPolicy="upGood" />
      </div>

      {/* Alerta saldo negativo */}
      {curSaldo < 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-red-200">
          <div className="font-semibold mb-1">⚠️ Saldo negativo</div>
          <div className="text-sm">
            Reduza as suas despesas em <span className="font-semibold">{eur(faltaEquilibrar)}</span> para equilibrar o orçamento.
          </div>
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IndicatorCard label="Despesas / Receitas" value={despesasSobreReceitas} />
        <IndicatorCard label="Poupanças / Receitas" value={poupancasSobreReceitas} />
      </div>

      {/* Evolução (apenas Range) */}
      {mode === "range" && (
        <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-100">📈 Evolução</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={serieBruta}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
              <XAxis dataKey="mes" tick={{ fill: COLOR.axisText }} />
              <YAxis tick={{ fill: COLOR.axisText }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: COLOR.textLight }}
                formatter={(v: any) => eur(Number(v))}
              />
              <Legend wrapperStyle={{ color: COLOR.textLight }} />
              <Line type="monotone" dataKey="receitas" stroke={COLOR.receitas} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} name="Receitas" />
              <Line type="monotone" dataKey="despesas" stroke={COLOR.despesas} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} name="Despesas" />
              <Line type="monotone" dataKey="poupancas" stroke={COLOR.poupancas} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} name="Poupanças" />
              {picoDespesas && (
                <ReferenceDot x={picoDespesas.x} y={picoDespesas.y} r={5} fill={COLOR.despesas} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lado a lado: Barras + 50/30/20 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Barras horizontais */}
        <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
          <h3 className="font-bold mb-3 text-slate-100">🏷️ Despesas por Categoria (Top 8)</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={categoriasTop8} layout="vertical" margin={{ top: 10, right: 24, left: 24, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
              <XAxis type="number" tick={{ fill: COLOR.axisText }} tickFormatter={(v) => eur(Number(v))} />
              <YAxis type="category" dataKey="name" width={190} tick={{ fill: COLOR.axisText, fontSize: 13 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: COLOR.textLight }}
                formatter={(val: any, _: any, props: any) => [`${eur(Number(val))} • ${props?.payload?.pct ?? 0}%`, "Valor"]}
              />
              <Legend wrapperStyle={{ color: COLOR.textLight }} />
              <Bar dataKey="value" name="Valor" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                {categoriasTop8.map((_, i) => (
                  <Cell key={`bar-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="labelText"
                  position="right"
                  style={{ fill: COLOR.axisText, fontWeight: 700, fontSize: 13 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie 50/30/20 */}
        <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
          <h3 className="font-bold mb-3 text-slate-100">🎯 Distribuição 50/30/20 (Real)</h3>
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={distNWS}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                label={({ name, percent }) => `${name}: ${Math.round((Number(percent) ?? 0) * 100)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {distNWS.map((d, i) => (
                  <Cell key={`nws-${d.name}-${i}`} fill={NWS_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: COLOR.textLight }}
                formatter={(val: any, name: any) => [`${eur(Number(val))}`, String(name)]}
              />
              <Legend wrapperStyle={{ color: COLOR.textLight }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Diário (apenas Mês) - GRÁFICO MOVIDO PARA AQUI! */}
      {mode === "month" && (
        <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
          <h3 className="font-bold mb-3 text-slate-100">📆 Receitas vs Despesas (diário)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
              <XAxis dataKey="dia" tick={{ fill: COLOR.axisText }} />
              <YAxis tick={{ fill: COLOR.axisText }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: COLOR.textLight }}
                formatter={(v: any) => eur(Number(v))}
              />
              <Legend wrapperStyle={{ color: COLOR.textLight }} />
              <Line type="monotone" dataKey="receitas" stroke={COLOR.receitas} strokeWidth={2} dot={false} isAnimationActive={false} name="Receitas" />
              <Line type="monotone" dataKey="despesas" stroke={COLOR.despesas} strokeWidth={2} dot={false} isAnimationActive={false} name="Despesas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

// ---------- Subcomponentes (mantidos) ----------
function MetricCard({
  title,
  value,
  color,
  delta,
  icon,
  trendPolicy = "upGood",
}: {
  title: string;
  value: number;
  color: string;
  delta: number | null;
  icon?: string;
  trendPolicy?: "upGood" | "downGood";
}) {
  const isGood = (d: number | null) => {
    if (d === null) return null;
    return trendPolicy === "downGood" ? d <= 0 : d >= 0;
  };
  const deltaLabel = delta === null ? "novo" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
  const deltaClass =
    delta === null ? "text-slate-400" : isGood(delta) ? "text-green-400" : "text-red-400";

  return (
    <div className="p-4 rounded-lg border border-white/10 bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-slate-400 flex items-center gap-2">
          <span style={{ color }}>{icon ?? "•"}</span>
          {title}
        </div>
        <div className={`text-xs ${deltaClass}`}>{deltaLabel}</div>
      </div>
      <div className="text-2xl font-bold text-slate-100 mt-1">{eur(value)}</div>
    </div>
  );
}

function IndicatorCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-slate-900">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  );
}