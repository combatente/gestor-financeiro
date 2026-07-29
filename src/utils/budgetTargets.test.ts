import { describe, expect, it } from 'vitest'
import { computeMonthlyIncome, computeSpendByNature, computeTargetsEUR } from './budgetTargets'
import type { Categoria, Transacao } from './budgetTargets'

describe('computeMonthlyIncome', () => {
  it('soma apenas receitas do mês pedido', () => {
    const transacoes: Transacao[] = [
      { type: 'receita', valor: 1000, data: '2025-01-05' },
      { type: 'receita', valor: 500, data: '2025-01-20' },
      { type: 'receita', valor: 300, data: '2025-02-01' },
      { type: 'despesa', valor: 100, data: '2025-01-10' },
    ]
    expect(computeMonthlyIncome(transacoes, '2025-01')).toBe(1500)
  })

  it('devolve 0 quando não há receitas no mês', () => {
    expect(computeMonthlyIncome([], '2025-01')).toBe(0)
  })
})

describe('computeSpendByNature', () => {
  const categories: Categoria[] = [
    { id: 'cat-1', name: 'Renda', type: 'despesa', spendNature: 'necessidade' },
    { id: 'cat-2', name: 'Streaming', type: 'despesa', spendNature: 'vontade' },
  ]

  it('agrupa despesas do mês por natureza usando categoryId', () => {
    const transacoes: Transacao[] = [
      { type: 'despesa', valor: 600, data: '2025-01-05', categoryId: 'cat-1' },
      { type: 'despesa', valor: 15, data: '2025-01-08', categoryId: 'cat-2' },
      { type: 'despesa', valor: 999, data: '2025-02-01', categoryId: 'cat-1' },
    ]
    expect(computeSpendByNature(transacoes, categories, '2025-01')).toEqual({
      necessidade: 600,
      vontade: 15,
      poupanca: 0,
    })
  })

  it('recorre ao nome da categoria (slug) quando não há categoryId correspondente', () => {
    const transacoes: Transacao[] = [
      { type: 'despesa', valor: 600, data: '2025-01-05', categoria: 'Renda' },
    ]
    expect(computeSpendByNature(transacoes, categories, '2025-01')).toEqual({
      necessidade: 600,
      vontade: 0,
      poupanca: 0,
    })
  })

  it('ignora transações que não sejam despesas', () => {
    const transacoes: Transacao[] = [
      { type: 'receita', valor: 2000, data: '2025-01-05', categoryId: 'cat-1' },
    ]
    expect(computeSpendByNature(transacoes, categories, '2025-01')).toEqual({
      necessidade: 0,
      vontade: 0,
      poupanca: 0,
    })
  })
})

describe('computeTargetsEUR', () => {
  it('calcula metas em € a partir da receita e percentagens 50/30/20', () => {
    expect(
      computeTargetsEUR(2000, { necessidadePct: 50, vontadePct: 30, poupancaPct: 20 })
    ).toEqual({ necessidade: 1000, vontade: 600, poupanca: 400 })
  })

  it('trata percentagens em falta como 0', () => {
    expect(
      computeTargetsEUR(1000, { necessidadePct: 50, vontadePct: 0, poupancaPct: 0 })
    ).toEqual({ necessidade: 500, vontade: 0, poupanca: 0 })
  })
})
