// src/types.ts

export type TabId =
  | 'dashboard'
  | 'transactions'
  | 'import'
  | 'budgets'
  | 'categories'
  | 'savings'
  | 'investments'
  | 'debt'
  | 'summary'
  | 'reports'
  | 'recurring'
  | 'accounts'
  | 'calculators'
  | 'calendar'

export const FAMILY_MEMBERS = ['Ricardo', 'Josefa', 'Carlinda', 'Vânia', 'Ana'] as const
export type FamilyMember = typeof FAMILY_MEMBERS[number]

export type Transacao = {
  id?: string
  type: 'receita' | 'despesa' | 'divida' | 'poupanca' | 'transferencia'
  valor: number
  data: string
  categoryId?: string | null
  descricao?: string
  categoria?: string
  accountId?: string
  pessoa?: string
}

export type AuthUserLike = { email: string | null }

export interface DebtType {
  id?: string
  name: string
  description: string
  category: string
  targetAmount: number
  currentAmount: number
  interestRate: number
  minPayment: number
  startDate: string
  targetDate: string
  status?: 'active' | 'paid' | 'defaulted'
}

export type LocalDebtType = DebtType & { id: string }

export interface Orcamento {
  id?: string
  categoryId: string
  periodo: string
  limite: number
}

export interface SavingsGoal {
  id?: string
  name: string
  description?: string
  targetAmount: number
  currentAmount: number
  startDate: string
  targetDate: string
  assetClass: 'CASH' | 'STOCKS' | 'ETFS' | 'CRYPTO' | 'RETIREMENT' | 'OTHER'
  expectedReturn?: number
}

export interface Account {
  id?: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'other'
  balance: number
  color?: string
  icon?: string
  createdAt?: string
}

export interface RecurringTransaction {
  id?: string
  type: 'receita' | 'despesa'
  valor: number
  descricao: string
  categoryId?: string
  accountId?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  nextDate: string
  active: boolean
  createdAt?: string
}
