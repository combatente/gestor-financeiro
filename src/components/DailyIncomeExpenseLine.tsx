
// src/components/DailyIncomeExpenseLine.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export interface DailyPoint {
  day: number;        // 1..31
  income: number;     // receitas no dia
  expense: number;    // despesas no dia
}

interface DailyIncomeExpenseLineProps {
  data: DailyPoint[];       // dados do mês atual selecionado
  currency?: string;        // '€' por defeito
  title?: string;
}

export const DailyIncomeExpenseLine: React.FC<DailyIncomeExpenseLineProps> = ({
  data,
  currency = '€',
  title = 'Receitas e Despesas (distribuição diária)'
}) => {
  return (
    <div className="p-4 rounded-lg bg-[#12171f] border border-[#1e2430]">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid stroke="#2a3040" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fill: '#aab2c5' }} />
          <YAxis tick={{ fill: '#aab2c5' }} />
          <Tooltip formatter={(val: number) => `${currency} ${val.toFixed(2)}`} />
          <Legend />
          <Line type="monotone" dataKey="income" stroke="#36c26e" strokeWidth={2} dot={false} name="Receitas" />
          <Line type="monotone" dataKey="expense" stroke="#f26a5f" strokeWidth={2} dot={false} name="Despesas" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
