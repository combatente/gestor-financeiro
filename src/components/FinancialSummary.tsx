import React, { useEffect, useMemo } from 'react';
// Importação do hook central e dos tipos necessários
import { useFirestore } from '../hooks/useFirestore'; // Ajuste o caminho se necessário
// Importação dos componentes de gráficos (assumindo que RechartsComponents.tsx foi ajustado)
import { DistributionDonutChart, NetWorthLineChart } from './charts/RechartsComponents';
import { nowMonth } from './dashboard/dashboardHelpers';
import {
    averageMonthlyIncomeExpenses, estimateDebtPayoffMonths, formatPayoffDuration,
} from './financialSummary/financialSummaryHelpers';


// --- Tipos de Dados (Devem corresponder ao que o Firestore retorna para 'liabilities' e 'assets') ---

type DebtType = {
    id: string;
    name: string;
    currentAmount: number; // Saldo atual da dívida (Tipo correto na interface)
    interestRate: number;
    minimumPayment: number
};
type GoalType = {
    id: string;
    name: string;
    currentAmount: number; // Saldo atual da poupança/meta
    assetClass: 'CASH' | 'STOCKS' | 'ETFS' | 'CRYPTO' | 'RETIREMENT' | 'OTHER';
};
type AssetClass = GoalType['assetClass'];
type MonthlyIncome = number;


const ASSET_CLASS_LABELS: { [key in AssetClass]: string } = {
    CASH: 'Caixa / Poupança',
    STOCKS: 'Ações',
    ETFS: 'ETFs / Fundos',
    CRYPTO: 'Criptomoedas',
    RETIREMENT: 'PPR / Reforma',
    OTHER: 'Outros',
};

// Cores em formato HEX para a biblioteca de gráficos
const ASSET_COLORS_HEX: string[] = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#737373']; 
const DEBT_COLORS_HEX: string[] = ['#dc2626', '#f97316', '#f87171', '#fbbf24', '#fca5a5'];


// --- Funções de Formatação ---

const formatCurrency = (value: number) => {
    // Trata NaN ou valores infinitos que possam surgir
    if (isNaN(value) || !isFinite(value)) return 'N/A €'; 
    return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
};

const formatPercent = (value: number) => {
    // Trata NaN ou valores infinitos para a percentagem
    if (isNaN(value) || !isFinite(value)) return 'N/A %'; 
    return (value * 100).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
};


// --- DEFINIÇÃO DA FUNÇÃO useFinancialKPIs (CORE LOGIC) ---

const useFinancialKPIs = (
    debts: DebtType[], // Dados reais do Firestore
    goals: GoalType[], // Dados reais do Firestore
    income: MonthlyIncome,
    expenses: number,
) => {
    
    // Cálculos de Totais
    // CORREÇÃO ESSENCIAL: Usa debt.currentAmount, que é o tipo definido acima.
    const totalCurrentDebt = debts.reduce((sum, debt) => sum + (debt.currentAmount || 0), 0); 
    const totalInvested = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
    const totalMinimumPayment = debts.reduce((sum, debt) => sum + (debt.minimumPayment || 0), 0);
    
    // KPIs CALCULADOS
    const netWorth = totalInvested - totalCurrentDebt; 
    // Garante que income > 0 antes de dividir
    const debtToIncomeRatio = income > 0 ? totalMinimumPayment / income : 0; 
    const emergencyFund = goals.filter(g => g.assetClass === 'CASH').reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    // Garante que expenses > 0 antes de dividir
    const emergencyCoverageMonths = expenses > 0 ? emergencyFund / expenses : 0;
    
    // 1. Distribuição da Dívida
    const debtDistribution = useMemo(() => {
        const distribution: { name: string, amount: number, percent: number }[] = [];
        if (totalCurrentDebt === 0) return [];

        debts.forEach(debt => {
            // CORREÇÃO ESSENCIAL: Usa debt.currentAmount na distribuição
            if (debt.currentAmount > 0) { // Ignora dívidas com saldo zero
                 distribution.push({
                    name: debt.name,
                    amount: debt.currentAmount,
                    percent: debt.currentAmount / totalCurrentDebt,
                });
            }
        });
        return distribution.sort((a, b) => b.amount - a.amount); 
    }, [debts, totalCurrentDebt]);
    
    // 2. Distribuição de Ativos (Património)
    const assetDistribution = useMemo(() => {
        const distribution: { [key in AssetClass]?: number } = {};
        goals.forEach(goal => {
            distribution[goal.assetClass] = (distribution[goal.assetClass] || 0) + (goal.currentAmount || 0);
        });

        const result: { assetClass: AssetClass, amount: number, percent: number }[] = [];
        if (totalInvested === 0) return [];

        Object.entries(distribution).forEach(([key, amount]) => {
            if (amount !== undefined && amount > 0) {
                result.push({
                    assetClass: key as AssetClass,
                    amount,
                    percent: amount / totalInvested,
                });
            }
        });
        return result.sort((a, b) => b.amount - a.amount);
    }, [goals, totalInvested]);

    return {
        netWorth,
        totalInvested,
        totalCurrentDebt,
        debtToIncomeRatio,
        emergencyCoverageMonths,
        debtDistribution,
        assetDistribution,
    };
};


// --- Componente de Cartão KPI ---
const KPICard = ({ title, value, unit, colorClass }: { title: string, value: string, unit: string, colorClass: string }) => (
    <div className="bg-slate-900 p-4 rounded-xl shadow-lg border-l-4 border-slate-700">
        <p className="text-sm font-semibold text-neutral-300 mb-1">{title}</p>
        <p className={`text-2xl font-extrabold ${colorClass}`}>
            {value}
        </p>
        <p className="text-xs text-neutral-500 mt-1">{unit}</p>
    </div>
);


// --- Componente de Layout/Legenda para o Donut Chart ---
const DonutChartWithLegend = ({ title, data, total, chartComponent }: { title: string, data: any[], total: number, isDebt: boolean, chartComponent: React.ReactNode }) => (
    <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 h-full">
        <h3 className="text-xl font-bold text-neutral-300 mb-4">{title}</h3>

        {/* Layout ajustado para o gráfico circular (como na correção anterior) */}
        <div className="flex flex-col lg:flex-row items-center gap-4">
            
            {/* O GRÁFICO REAL (Contentor compacto w-40 h-40) */}
            <div className="flex-shrink-0 w-40 h-40"> 
                {chartComponent} 
            </div>

            {/* Legenda */}
            <div className="flex-grow space-y-2 text-sm w-full">
                {data.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                            {/* Garante que o item.label existe */}
                            <span className="text-neutral-300 font-semibold">{item.label || 'Sem Nome'}</span>
                        </div>
                        <span className="font-bold text-white">{formatPercent(item.percent)}</span>
                    </div>
                ))}
                {/* Mostra 'Sem dados' se não houverem itens para exibir (mesmo que total != 0, por segurança) */}
                {(data.length === 0) && <p className="text-neutral-400 italic">Nenhum dado para mostrar.</p>}
            </div>
        </div>
        <p className={`text-xs text-neutral-500 mt-4 text-center`}>
            Total: {formatCurrency(total)}
        </p>
    </div>
);


// --- Componente Principal FinancialSummary (Com integração Firestore) ---

export default function FinancialSummary() {
    
    // 1. CHAMA O HOOK PARA OBTER DADOS REAIS
    const {
        debts,
        goals,
        transacoes,
        netWorthSnapshots,
        upsertNetWorthSnapshot,
        saving, // Usado como 'isLoading' ou 'isSaving'
        error
    } = useFirestore();

    // Garante que debts e goals são arrays para evitar erros de runtime
    const actualDebts = debts || [];
    const actualGoals = goals || [];

    // 2. RENDIMENTO/DESPESA MÉDIOS REAIS (últimos meses com transações, não fixos)
    const { avgIncome, avgExpenses, monthsUsed: incomeMonthsUsed } = useMemo(
        () => averageMonthlyIncomeExpenses(transacoes, 3),
        [transacoes]
    );

    // 3. CALCULA OS KPIs com os dados reais
    const {
        netWorth,
        totalInvested,
        totalCurrentDebt,
        debtToIncomeRatio,
        emergencyCoverageMonths,
        debtDistribution,
        assetDistribution,
    } = useFinancialKPIs(
        actualDebts as any, // Cast para evitar erros de tipagem entre LocalDebtType e DebtType
        actualGoals as any, // Cast para evitar erros de tipagem entre LocalGoalType e GoalType
        avgIncome,
        avgExpenses,
    );

    // 4. TEMPO ESTIMADO DE LIQUIDAÇÃO DA DÍVIDA (amortização real, não um valor fixo)
    const { weightedAverageMonths: payoffMonths, anyNeverPaysOff } = useMemo(
        () => estimateDebtPayoffMonths(actualDebts as any),
        [actualDebts]
    );

    // 5. HISTÓRICO REAL DE PATRIMÓNIO LÍQUIDO (snapshots mensais persistidos,
    // construídos incrementalmente — não uma série inventada)
    const historicalNetWorth = useMemo(
        () => [...netWorthSnapshots]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(s => ({ date: s.id, netWorth: s.netWorth })),
        [netWorthSnapshots]
    );

    // Regista o snapshot do mês corrente sempre que o Património Líquido muda,
    // para que o histórico se vá construindo com dados reais ao longo do tempo.
    useEffect(() => {
        if (actualDebts.length === 0 && actualGoals.length === 0) return;
        upsertNetWorthSnapshot(nowMonth(), { totalInvested, totalDebt: totalCurrentDebt, netWorth });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalInvested, totalCurrentDebt, netWorth]);

    // 6. TRATAMENTO DE ESTADOS (Loading, Erro, Sem Dados) — só depois de todos os hooks
    if (saving) {
        return (
            <div className="text-center p-8 text-neutral-400">
                A carregar dados financeiros do Firestore...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-900/30 text-red-500 rounded-lg border border-red-500">
                Erro ao ler dados financeiros: {error}
            </div>
        );
    }

    // Se não houver dados, exibe um aviso
    if (actualDebts.length === 0 && actualGoals.length === 0) {
          return (
              <div className="text-center p-8 text-yellow-500 bg-slate-800 rounded-lg">
                  Nenhum dado encontrado. Por favor, adicione as suas dívidas e metas.
              </div>
          );
    }

    // Prepara os dados de ativos para a Legenda e Gráfico
    const assetChartDataWithColors = assetDistribution.map((item, index) => ({
        ...item,
        color: ASSET_COLORS_HEX[index % ASSET_COLORS_HEX.length],
        label: ASSET_CLASS_LABELS[item.assetClass]
    }));

    // Prepara os dados de dívida para a Legenda e Gráfico
    const debtChartDataWithColors = debtDistribution.map((item, index) => ({
        ...item,
        color: DEBT_COLORS_HEX[index % DEBT_COLORS_HEX.length],
        label: item.name
    }));
    
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-blue-400">📊 Resumo Financeiro e KPIs</h2>

            {/* 1. KPIs de Topo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <KPICard 
                    title="Património Líquido (PL)"
                    value={formatCurrency(netWorth)}
                    unit="Ativos - Dívidas"
                    colorClass={netWorth >= 0 ? 'text-green-500' : 'text-red-500'}
                />
                
                <KPICard 
                    title="Investimento Total"
                    value={formatCurrency(totalInvested)}
                    unit="Saldo de Ativos Bruto"
                    colorClass="text-green-500"
                />

                <KPICard 
                    title="Dívida Total"
                    value={formatCurrency(totalCurrentDebt)}
                    unit="Saldo Total Pendente"
                    colorClass="text-red-500"
                />

                <KPICard 
                    title="Rácio Dívida/Rend."
                    value={formatPercent(debtToIncomeRatio)}
                    unit="Pag. Mínimo vs. Receita Mensal"
                    colorClass={debtToIncomeRatio < 0.36 ? 'text-green-500' : 'text-yellow-500'}
                />
            </div>

            <hr className="border-slate-700" />

            {/* 2. GRÁFICOS DE DISTRIBUIÇÃO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Gráfico 1: Distribuição de Património */}
                <DonutChartWithLegend
                    title="💰 Distribuição de Património (Investimento)"
                    data={assetChartDataWithColors}
                    total={totalInvested}
                    isDebt={false}
                    chartComponent={
                        <DistributionDonutChart 
                            data={assetDistribution as any}
                            total={totalInvested}
                            isDebt={false}
                            colors={ASSET_COLORS_HEX}
                            labels={ASSET_CLASS_LABELS}
                            dataKey="assetClass"
                        />
                    }
                />

                {/* Gráfico 2: Distribuição da Dívida */}
                <DonutChartWithLegend
                    title="🚨 Distribuição da Dívida por Tipo"
                    data={debtChartDataWithColors}
                    total={totalCurrentDebt}
                    isDebt={true}
                    chartComponent={
                        <DistributionDonutChart 
                            data={debtDistribution as any}
                            total={totalCurrentDebt}
                            isDebt={true}
                            colors={DEBT_COLORS_HEX}
                            labels={{}}
                            dataKey="name"
                        />
                    }
                />
            </div>
            
            <hr className="border-slate-700" />
            
            {/* 3. Evolução do Património Líquido */}
            <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
                <h3 className="font-bold mb-3 text-slate-100">📈 Evolução do Património Líquido</h3>

                {historicalNetWorth.length >= 2 ? (
                    <NetWorthLineChart historicalData={historicalNetWorth} />
                ) : (
                    <p className="text-sm text-neutral-400 italic p-4 text-center">
                        O histórico real está a começar a ser registado agora — volta dentro de
                        alguns meses para veres a evolução do teu património líquido.
                    </p>
                )}
            </div>

            {/* 4. Métricas Específicas: Cobertura de Emergência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
                    <h3 className="font-bold mb-3 text-slate-100">Duração Estimada da Dívida</h3>
                    <div className="p-2">
                        <KPICard
                            title="Tempo de Liquidação (Média Ponderada)"
                            value={
                                payoffMonths === null ? 'Sem dívida'
                                    : anyNeverPaysOff ? `~ ${formatPayoffDuration(payoffMonths)} *`
                                        : `~ ${formatPayoffDuration(payoffMonths)}`
                            }
                            unit={
                                anyNeverPaysOff
                                    ? '* Uma ou mais dívidas nunca se pagam com o valor mínimo atual (juro excede a prestação).'
                                    : 'Estimativa com pagamentos mínimos atuais (amortização real).'
                            }
                            colorClass="text-red-400"
                        />
                    </div>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
                    <h3 className="font-bold mb-3 text-slate-100">Cobertura de Emergência</h3>
                    <div className="p-2">
                        <KPICard
                            title="Meses de Despesas Cobertos"
                            value={emergencyCoverageMonths.toFixed(1)}
                            unit={
                                incomeMonthsUsed > 0
                                    ? `Fundo Emergência / ${formatCurrency(avgExpenses)} despesa média mensal (últimos ${incomeMonthsUsed} ${incomeMonthsUsed === 1 ? 'mês' : 'meses'})`
                                    : 'Sem transações suficientes para estimar a despesa mensal.'
                            }
                            colorClass={emergencyCoverageMonths >= 6 ? 'text-green-500' : emergencyCoverageMonths >= 3 ? 'text-yellow-500' : 'text-red-500'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}