// src/types.ts

// --- [ Tipos Base de Navegação e Autenticação ] ---

export type TabId = 
  | 'dashboard' 
  | 'transactions' 
  | 'budgets' 
  | 'categories' 
  | 'debt'     // NOVO: Dívidas
  | 'savings'  // NOVO: Poupanças
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


// --- [ NOVOS TIPOS PARA GESTÃO DE DÍVIDAS E ORÇAMENTOS ] ---

/**
 * Interface para representar uma Dívida.
 * Inclui todos os campos do formulário (targetAmount, interestRate, minPayment, etc.).
 */
export interface DebtType {
  id?: string;
  name: string; // Nome da Dívida (Ex: Crédito Habitação)
  description: string; // Descrição (Opcional)
  category: string; // Categoria de Dívida (Ex: Habitação, Pessoal)
  
  // Dados Financeiros
  targetAmount: number; // Montante Inicial da Dívida (Ex: 150000.00)
  currentAmount: number; // Montante Atual em dívida
  interestRate: number; // Taxa de Juro Anual (%)
  minPayment: number; // Pagamento Mínimo Mensal (€)
  
  // Datas e Controlo
  startDate: string; // Data de Início da Dívida (Formato AAAA-MM-DD)
  targetDate: string; // Data Alvo de Liquidação (Formato AAAA-MM-DD)
}

/**
 * Tipo para Dívidas lidas e usadas localmente, garantindo que o 'id' existe.
 * O seu hook useFirestore deve retornar um array deste tipo.
 */
export type LocalDebtType = DebtType & { id: string };


/**
 * Placeholder para a interface de Orçamento, se for usada pelo useFirestore.
 * Preencha esta interface com os campos reais do seu Orçamento.
 */
export interface Orcamento {
  id?: string;
  category: string;
  amount: number;
  // Adicione outros campos de Orçamento, como startDate, endDate, etc.
}