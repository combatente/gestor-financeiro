// src/components/charts/RechartsComponents.tsx

import React from 'react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

// --- Helpers de Formatação ---

// Funções de Formatação reutilizadas do FinancialSummary
const formatCurrency = (value: number) => 
    value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 });
const formatPercent = (value: number) => 
    (value * 100).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';


// --- 1. Gráfico de Distribuição (Donut Chart Real AJUSTADO) ---

interface DonutChartProps {
    data: { name: string, amount: number, percent: number }[] | { assetClass: string, amount: number, percent: number }[];
    total: number;
    isDebt: boolean;
    colors: string[]; // Cores Hex para Recharts
    labels: { [key: string]: string }; // Map de AssetClass/Nome para Label
    dataKey: 'name' | 'assetClass';
}

export const DistributionDonutChart: React.FC<DonutChartProps> = ({ data, total, isDebt, colors, labels }) => {
    
    // Mapeia os dados para o formato esperado pelo Recharts
    const chartData = data.map((item, index) => ({
        // @ts-ignore
        name: isDebt ? item.name : labels[item.assetClass],
        value: item.amount, 
        color: colors[index % colors.length],
    }));

    // Tooltip formatado
    const customTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const dataItem = payload[0].payload;
            return (
                <div className="bg-slate-700/90 p-2 border border-slate-600 rounded-lg text-white text-sm">
                    <p className="font-bold">{dataItem.name}</p>
                    <p>Valor: {formatCurrency(dataItem.value)}</p>
                    {/* Calcula a percentagem exata no tooltip */}
                    <p>Percentagem: {formatPercent(dataItem.value / total)}</p>
                </div>
            );
        }
        return null;
    };


    return (
        // ALTERADO: Altura reduzida para 200px para caber no contentor mais pequeno
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    // ALTERADO: innerRadius reduzido de 70 para 50
                    innerRadius={50} 
                    // ALTERADO: outerRadius reduzido de 110 para 80
                    outerRadius={80} 
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} /> 
                    ))}
                </Pie>
                
                <Tooltip content={customTooltip} />
            </PieChart>
        </ResponsiveContainer>
    );
};


// --- 2. Gráfico de Evolução (Line Chart Real MANTIDO) ---

interface LineChartProps {
    historicalData: { date: string, netWorth: number }[];
}

export const NetWorthLineChart: React.FC<LineChartProps> = ({ historicalData }) => {
    
    // Os dados já têm o formato {date, netWorth}, mas formatamos a data para o eixo X
    const data = historicalData.map(item => ({
        // Usamos o mês/ano (ex: 2024-03)
        date: item.date.substring(0, 7), 
        PL: item.netWorth,
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid stroke="#334155" strokeDasharray="5 5" />
                <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    padding={{ left: 20, right: 20 }}
                />
                <YAxis 
                    stroke="#94a3b8" 
                    tickFormatter={(value) => formatCurrency(value)} 
                    domain={['auto', 'auto']}
                />
                <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Património Líquido']}
                    labelFormatter={(label) => `Data: ${label}`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc' }}
                />
                <Line 
                    type="monotone" 
                    dataKey="PL" 
                    stroke="#3b82f6" // Cor azul
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#3b82f6', fill: '#0f172a' }} // Pontos na linha
                    activeDot={{ r: 8, fill: '#3b82f6', stroke: '#fff' }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};