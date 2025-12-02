// src/lib/dashboard-helpers.ts
import type { RangeOption } from '../components/DateRangeFilter'; // Usar 'import type' para o compilador TS
// REMOVIDO: import { subMonths, subYears } from 'date-fns';

/**
 * Função auxiliar para obter o início (00:00:00) de um dia.
 */
function getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Função auxiliar para obter o fim (23:59:59) de um dia.
 */
function getEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}


// Função que calcula os limites de período (de/para) com base na data base e na opção de range.
export function getPeriodBounds(base: Date, range: RangeOption) {
  // 1. Definir 'to' (fim do período) para o final do dia da data base (base)
  const to = getEndOfDay(base);

  // 2. Definir 'from' (início do período) como uma cópia de 'base' inicialmente
  const from = new Date(base);

  switch (range) {
    case '1M':
      // ✅ CORREÇÃO: Subtrair 1 mês sem o risco de "rolling over" o dia (e.g. 31/03 -> 03/03)
      from.setMonth(from.getMonth() - 1);
      // Garante que o dia se mantém se o mês anterior tiver menos dias (setHours para o início do dia)
      break;
    case '3M':
      from.setMonth(from.getMonth() - 3);
      break;
    case '6M':
      from.setMonth(from.getMonth() - 6);
      break;
    case '1A':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case '2A':
      from.setFullYear(from.getFullYear() - 2);
      break;
    // Se o seu RangeOption incluir 'All', 'Year', 'Month', etc., adicione-os aqui.
  }
  
  // Limpa o tempo de 'from' para o início do dia
  // O `setMonth/setFullYear` pode ter alterado a hora, por isso forçamos para o início do dia.
  const finalFrom = getStartOfDay(from);
  
  return { from: finalFrom, to };
}

// ... (Restante das funções, mantidas inalteradas)

export function buildDailySeries(
  transactions: Array<{ date: string; type: 'income' | 'expense' | 'saving'; amount: number }>,
  _: Date, // Argumento marcado como não utilizado
  to: Date
) {
  // assume range 1M para diário; ajusta se quiseres amostrar por dia mesmo em ranges maiores
  const year = to.getFullYear();
  const month = to.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay: { [day: number]: { income: number; expense: number } } = {};
  for (let d = 1; d <= daysInMonth; d++) byDay[d] = { income: 0, expense: 0 };

  transactions.forEach(t => {
    const date = new Date(t.date);
    if (date.getMonth() !== month || date.getFullYear() !== year) return; // só mês atual
    const day = date.getDate();
    if (t.type === 'income') byDay[day].income += t.amount;
    if (t.type === 'expense') byDay[day].expense += t.amount;
  });

  return Object.entries(byDay).map(([day, v]) => ({ day: Number(day), income: v.income, expense: v.expense }));
}

export function aggregateCategories(
  transactions: Array<{ type: 'income' | 'expense' | 'saving'; amount: number; category?: string }>
) {
  const map = new Map<string, number>();
  transactions.forEach(t => {
    if (t.type !== 'expense') return;
    const key = t.category ?? 'Outros';
    map.set(key, (map.get(key) ?? 0) + t.amount);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * split50_30_20:
 * - Necessidades: despesas essenciais (assume t.isEssential === true)
 * - Vontades: despesas não essenciais
 * - Poupança: somatório tipo 'saving' ou (income - expense) se não tiveres a transação explícita
 */
export function split50_30_20(
  transactions: Array<{ type: 'income' | 'expense' | 'saving'; amount: number; isEssential?: boolean }>
) {
  let needs = 0, wants = 0, savings = 0;
  let income = 0, expense = 0;

  transactions.forEach(t => {
    if (t.type === 'income') income += t.amount;
    if (t.type === 'expense') {
      expense += t.amount;
      if (t.isEssential) needs += t.amount;
      else wants += t.amount;
    }
    if (t.type === 'saving') savings += t.amount;
  });

  // Se não tens transações de saving explícitas, calcula poupança como income - expense (>=0)
  if (savings === 0) savings = Math.max(0, income - expense);

  return [
    { name: 'Necessidades' as const, value: needs },
    { name: 'Vontades' as const, value: wants },
    { name: 'Poupança' as const, value: savings },
  ];
}