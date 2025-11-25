import { useEffect, useState } from 'react'

export type Transacao = {
  id?: string
  type: 'receita' | 'despesa' | 'divida' | 'poupanca'
  valor: number | string
  data?: string // 'YYYY-MM-DD'
  categoria?: string | null
  [k: string]: any
}

export type Orcamento = {
  id?: string
  categoria: string
  /**
   * Pode ser:
   *  - 'YYYY-MM'  (ex.: '2025-10')  ➜ orçamento desse mês específico
   *  - 'mensal' | 'semanal' | 'anual'  ➜ orçamento relativo ao "hoje"
   */
  periodo: string
  /** Modelo novo (recomendado) */
  limite?: number
  /** Compat: dados antigos podem usar 'valor' */
  valor?: number
  [k: string]: any
}

function isYYYYMM(v: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
}
function sameMonth(d: Date, y: number, mZeroBased: number) {
  return d.getFullYear() === y && d.getMonth() === mZeroBased
}
function sameYear(d: Date, y: number) {
  return d.getFullYear() === y
}
function inLastNDays(d: Date, base: Date, nDays: number) {
  const ms = 24 * 60 * 60 * 1000
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const b0 = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const diff = Math.abs(b0.getTime() - d0.getTime())
  return diff < nDays * ms
}

/**
 * Verifica se a transação pertence ao período do orçamento.
 */
function pertenceAoPeriodo(t: Transacao, orc: Orcamento, hoje = new Date()) {
  const dataStr = (t.data ?? '').toString()
  if (!dataStr) return false

  const parts = dataStr.split('-').map(Number)
  const dt =
    parts.length >= 3 && parts.every((n) => Number.isFinite(n))
      ? new Date(parts[0], (parts[1] ?? 1) - 1, parts[2])
      : new Date(dataStr)

  if (Number.isNaN(dt.getTime())) return false

  const p = (orc.periodo ?? '').toLowerCase()

  if (isYYYYMM(p)) {
    const [y, m] = p.split('-').map(Number)
    return sameMonth(dt, y, (m ?? 1) - 1)
  }
  if (p === 'mensal') return sameMonth(dt, hoje.getFullYear(), hoje.getMonth())
  if (p === 'semanal') return inLastNDays(dt, hoje, 7)
  if (p === 'anual') return sameYear(dt, hoje.getFullYear())

  // fallback: mensal corrente
  return sameMonth(dt, hoje.getFullYear(), hoje.getMonth())
}

export function useBudgets(transacoes: Transacao[], orcamentos: Orcamento[]) {
  const [alertas, setAlertas] = useState<string[]>([])

  useEffect(() => {
    const hoje = new Date()
    const novos: string[] = []

    orcamentos.forEach((orc) => {
      const categoria = (orc.categoria ?? '').toString().trim()
      if (!categoria) return

      const despesas = transacoes.filter((t) => {
        const isDespesa = t.type === 'despesa'
        const mesmaCategoria = (t.categoria ?? '') === categoria
        return isDespesa && mesmaCategoria && pertenceAoPeriodo(t, orc, hoje)
      })

      const total = despesas.reduce((s, t) => s + (Number(t.valor) || 0), 0)
      const limite = Number(orc.limite ?? orc.valor ?? 0)
      if (!Number.isFinite(limite) || limite <= 0) return

      const pct = (total / limite) * 100
      const periodoLabel = isYYYYMM(orc.periodo) ? `(${orc.periodo})` : orc.periodo

      if (pct >= 100) {
        novos.push(`⚠️ ${categoria}: Atingiu ${pct.toFixed(0)}% do orçamento ${periodoLabel}!`)
      } else if (pct >= 80) {
        novos.push(`⚡ ${categoria}: ${pct.toFixed(0)}% do orçamento ${periodoLabel}`)
      }
    })

    setAlertas(novos)
  }, [transacoes, orcamentos])

  return { alertas }
}