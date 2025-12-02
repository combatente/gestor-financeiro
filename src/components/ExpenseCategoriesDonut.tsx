
// src/components/ExpenseCategoriesDonut.tsx
import React from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';

export interface CategorySlice {
  name: string;
  value: number;   // total da categoria no período
}

interface ExpenseCategoriesDonutProps {
  data: CategorySlice[];
  currency?: string;
  title?: string;
}

const COLORS = ['#3a82f6', '#36c26e', '#f59e0b', '#f26a5f', '#8b5cf6', '#22d3ee', '#e11d48'];

export const ExpenseCategoriesDonut: React.FC<ExpenseCategoriesDonutProps> = ({
  data,
  currency = '€',
  title = 'Despesas por Categoria'
}) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  const decorated = data.map(d => ({
    ...d,
    percent: total ? (d.value / total) * 100 : 0,
  }));

  return (
    <div className="p-4 rounded-lg bg-[#12171f] border border-[#1e2430]">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <div className="flex items-center gap-6">
        <div className="w-full h-260">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={decorated}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {decorated.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number, name) => [`${currency} ${val.toFixed(2)}`, name as string]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-[220px] text-sm">
          {decorated.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-300">{d.name}</span>
              </div>
              <div className="text-gray-400">
                {d.percent.toFixed(0)}% — {currency} {d.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
