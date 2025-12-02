// src/types.ts

// TabId CORRIGIDO: Substituímos 'analytics' por 'debt', 'savings', e 'summary'.
export type TabId = 
  | 'dashboard' 
  | 'transactions' 
  | 'budgets' 
  | 'categories' 
  | 'debt'     // NOVO: Dívidas
  | 'savings'  // NOVO: Poupanças
  | 'summary'; // NOVO: Resumo/KPIs

export type Transacao = {
  id?: string
  // Transacao types: 'divida' e 'poupanca' mantidos, 'transferencia' adicionada como boa prática.
  type: 'receita' | 'despesa' | 'divida' | 'poupanca' | 'transferencia' 
  valor: number
  data: string
  categoryId?: string | null
  descricao?: string
  categoria?: string // compat legado
}

export type AuthUserLike = { email: string | null }
