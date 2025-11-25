
// src/types.ts
export type TabId = 'dashboard' | 'transactions' | 'budgets' | 'categories' | 'analytics'

export type Transacao = {
  id?: string
  type: 'receita' | 'despesa' | 'divida' | 'poupanca'
  valor: number
  data: string
  categoryId?: string | null
  descricao?: string
  categoria?: string // compat legado
}

export type AuthUserLike = { email: string | null }
