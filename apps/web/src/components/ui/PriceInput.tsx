'use client';

import { useState } from 'react';
import { CircleDollarSign } from 'lucide-react';

interface PriceInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label?: string;
  hint?: string;
  currency?: string;
  disabled?: boolean;
  error?: string;
  showFree?: boolean;
}

const CURRENCIES = ['GNF', 'XOF', 'USD'] as const;

export function PriceInput({
  value = 0,
  onChange,
  label = 'Prix',
  hint,
  currency: selectedCurrency = 'GNF',
  disabled = false,
  error,
  showFree = true,
}: PriceInputProps) {
  const [currency, setCurrency] = useState(selectedCurrency);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <CircleDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => onChange(Number(e.target.value || 0))}
            disabled={disabled}
            placeholder={showFree ? '0 = Gratuit' : 'Prix en GNF'}
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pl-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${error ? 'border-red-500' : ''}`}
          />
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={disabled}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
        </div>
        {showFree && value === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Gratuit
          </span>
        )}
        {showFree && value > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            {value.toLocaleString('fr-FR')} {currency}
          </span>
        )}
      </div>
    </div>
  );
}
