
// src/components/DateRangeFilter.tsx
import React from 'react';

export type RangeOption = '1M' | '3M' | '6M' | '1A' | '2A';

interface DateRangeFilterProps {
  value: RangeOption;
  onChange: (value: RangeOption) => void;
  className?: string;
}

const options: RangeOption[] = ['1M', '3M', '6M', '1A', '2A'];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange, className }) => {
  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-md border text-sm ${
            value === opt ? 'bg-blue-600 text-white border-blue-500' : 'bg-transparent text-gray-300 border-gray-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
