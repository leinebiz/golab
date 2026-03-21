'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'flat'; percentage: number; label?: string };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const colorMap: Record<NonNullable<KpiCardProps['color']>, string> = {
  default: 'bg-white border-gray-200',
  success: 'bg-white border-green-200',
  warning: 'bg-white border-yellow-200',
  danger: 'bg-white border-red-200',
  info: 'bg-white border-blue-200',
};

const trendColorMap: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-green-600',
  down: 'text-red-600',
  flat: 'text-gray-500',
};

export function KpiCard({ label, value, trend, color = 'default' }: KpiCardProps) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${colorMap[color]}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${trendColorMap[trend.direction]}`}
          >
            {trend.direction === 'up' && <ArrowUpRight className="h-4 w-4" />}
            {trend.direction === 'down' && <ArrowDownRight className="h-4 w-4" />}
            {trend.direction === 'flat' && <Minus className="h-4 w-4" />}
            {trend.percentage.toFixed(1)}%
            {trend.label && <span className="ml-1 text-gray-400">{trend.label}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
