// src/components/FinancialSummary.tsx

export default function FinancialSummary() {
  // TODO: Calcular KPIs de Património Líquido, Dívida e Poupança

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-blue-400">📊 Resumo Financeiro e KPIs</h2>

      {/* 1. KPIs de Topo (Património Líquido) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Património Líquido Atual */}
        {/* KPI: Taxa de Crescimento do PL */}
        {/* KPI: Dívida a Receita (%) */}
        {/* KPI: Taxa de Poupança Pessoal (%) */}
      </div>

      {/* 2. Gráfico de Tendência (Património Líquido) */}
      <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
        <h3 className="font-bold mb-3 text-slate-100">📈 Evolução do Património Líquido</h3>
        {/* Componente do Gráfico de Linhas (Net Worth) */}
      </div>

      {/* 3. Dívida vs. Poupança (Sumário/Donut Chart) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
          <h3 className="font-bold mb-3 text-slate-100">Duração Estimada da Dívida</h3>
          {/* KPI: Velocidade de Liquidação */}
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
          <h3 className="font-bold mb-3 text-slate-100">Cobertura de Emergência</h3>
          {/* KPI: Cobertura de Despesas (em meses) */}
        </div>
      </div>
    </div>
  );
}