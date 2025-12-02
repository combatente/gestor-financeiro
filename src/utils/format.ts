// Conteúdo de src/utils/format.ts

/** Formata um número para moeda, sem símbolo € (apenas valor). */
export const fmt = (value: number): string => {
  // Use toLocaleString para formatação de moeda (Portugal)
  return value.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).replace('€', '').trim(); // Remove o símbolo da moeda se toLocaleString o adicionar
};

/** Formata o período (YYYY-MM) para Mês/Ano (ex: 2025-12 -> Dezembro/2025) */
export const formatPeriod = (periodo: string): string => {
  if (!periodo || periodo.length < 7) return 'Desconhecido';

  const [year, month] = periodo.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  
  // Opções para nome completo do mês
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
  
  // Capitaliza a primeira letra do mês e junta com o ano
  const formatted = date.toLocaleDateString('pt-PT', options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};