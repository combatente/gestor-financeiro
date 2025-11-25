
// Funções utilitárias para calcular receita do mês,
// execução (despesas) por natureza e alvos (€) a partir de percentagens.

export type Transacao = {
  type: 'receita' | 'despesa' | 'divida' | 'poupanca'
  valor: number | string
  data?: string
  categoryId?: string | null
  categoria?: string | null
}

export type Categoria = {
  id?: string
  name?: string
  type?: 'receita' | 'despesa' | 'poupanca' | 'outro' | undefined
  spendNature?: 'necessidade' | 'vontade' | 'poupanca' | null | undefined
}

export type NatureTotals = {
  necessidade: number
  vontade: number
  poupanca: number
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/**
 * Soma todas as receitas do mês selecionado.
 */
export function computeMonthlyIncome(transacoes: Transacao[], mesYYYYMM: string) {
  return transacoes.reduce((acc, t) => {
    const ym = String(t.data ?? '').slice(0, 7)
    if (t.type === 'receita' && ym === mesYYYYMM) {
      acc += Number(t.valor) || 0
    }
    return acc
  }, 0)
}

/**
 * Calcula totais de despesa por natureza (necessidade, vontade, poupanca) no mês.
 */
export function computeSpendByNature(
  transacoes: Transacao[],
  categories: Categoria[],
  mesYYYYMM: string
): NatureTotals {
  const byId = new Map<string, 'necessidade' | 'vontade' | 'poupanca' | undefined>()
  const bySlug = new Map<string, 'necessidade' | 'vontade' | 'poupanca' | undefined>()

  for (const c of categories) {
    const nat = c.type === 'despesa' ? c.spendNature : undefined
    // Corrige null -> undefined para compatibilidade com Map
    if (c.id) byId.set(c.id, nat ?? undefined)
    if (c.name) bySlug.set(slugify(c.name), nat ?? undefined)
  }

  const out: NatureTotals = { necessidade: 0, vontade: 0, poupanca: 0 }

  for (const t of transacoes) {
    if (t.type !== 'despesa') continue
    const ym = String(t.data ?? '').slice(0, 7)
    if (ym !== mesYYYYMM) continue

    const val = Number(t.valor) || 0
    let nat: 'necessidade' | 'vontade' | 'poupanca' | undefined
    if (t.categoryId && byId.has(t.categoryId)) {
      nat = byId.get(t.categoryId)
    } else if (t.categoria) {
      nat = bySlug.get(slugify(String(t.categoria)))
    }

    if (nat && nat in out) out[nat] += val
  }
  return out
}

/**
 * Calcula metas em € para cada bucket com base na receita e percentagens.
 */
export function computeTargetsEUR(
  incomeEUR: number,
  alloc: { necessidadePct: number; vontadePct: number; poupancaPct: number }
) {
  const k = incomeEUR / 100
  return {
    necessidade: k * (alloc.necessidadePct || 0),
    vontade: k * (alloc.vontadePct || 0),
    poupanca: k * (alloc.poupancaPct || 0),
  }
}
