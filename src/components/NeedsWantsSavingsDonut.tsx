
// src/components/NeedsWantsSavingsDonut.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface NWSItem {
  name: 'Necessidades' | 'Vontades' | 'Poupança';
  value: number; // valor monetário
}

interface NeedsWantsSavingsDonutProps {
  data: NWSItem[];        // três entradas
  currency?: string;
  title?: string;
}

const COLORS = {
  Necessidades: '#3a82f6',
  Vontades: '#f59e0b',
  Poupança: '#36c26e',
};

export const NeedsWantsSavingsDonut: React.FC<NeedsWantsSavingsDonutProps> = ({
  data,
  currency = '€',
  title = 'Distribuição de Receita (50/30/20)'
}) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const decorated = data.map(d => ({
    ...d,
    percent: total ? (d.value / total) * 100 : 0,
  }));

  return (
    <div className="p-4 rounded-lg bg-[#12171f] border border-[#1e2430]">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="w-full h-260">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={decorated} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {decorated.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number, name) => [`${currency} ${val.toFixed(2)}`, name as string]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm">
          {decorated.map(d => (
            <div key={d.name} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[d.name] }} />
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
