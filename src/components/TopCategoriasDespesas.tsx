// src/components/TopCategoriasDespesas.tsx
import { useMemo } from "react"
import type { Transacao } from "../types"
import { useCategories } from "../hooks/useCategories"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

const eur = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  })

export default function TopCategoriasDespesas({
  transacoes,
  dataMin, // opcional: "YYYY-MM-DD" para filtrar por período
}: {
  transacoes: Transacao[]
  dataMin?: string
}) {
  const { items: categories } = useCategories()

  // id -> label (usa ícone se existir)
  const idToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories ?? []) {
      if (c?.id) m.set(c.id, `${c.icon ? c.icon + " " : ""}${c.name}`)
    }
    return m
  }, [categories])

  const data = useMemo(() => {
    const soma = new Map<string, number>()
    const corte = dataMin ? new Date(dataMin) : null

    for (const t of transacoes ?? []) {
      if (t?.type !== "despesa") continue
      if (!Number.isFinite(t?.valor)) continue

      if (corte && t?.data) {
        const d = new Date(t.data)
        if (isNaN(+d) || d < corte) continue
      }

      const id = (t?.categoryId ?? "").toString().trim()
      const label =
        (id && idToLabel.get(id)) ||
        (t?.categoria && String(t.categoria)) ||
        "Sem categoria"

      const v = Math.abs(Number(t.valor))
      if (!Number.isFinite(v) || v <= 0) continue

      soma.set(label, (soma.get(label) || 0) + v)
    }

    return Array.from(soma.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [transacoes, idToLabel, dataMin])

  if (!data.length) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 p-4 border border-dashed rounded-lg">
        Sem despesas encontradas para o intervalo selecionado.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="categoria" width={160} />
        <Tooltip formatter={(v: any) => eur(Number(v))} />
        <Bar dataKey="total" name="Total" fill="#f87171" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}