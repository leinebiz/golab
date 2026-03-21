'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
  sparklineData?: { value: number }[];
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', stroke: '#16a34a' },
  down: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', stroke: '#dc2626' },
  flat: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50', stroke: '#6b7280' },
};

export function KpiCard({
  label,
  value,
  trend,
  changePercent,
  sparklineData,
  className,
}: KpiCardProps) {
  const { icon: Icon, color, bg, stroke } = trendConfig[trend];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              bg,
              color,
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={stroke}
                  fill={`url(#gradient-${label})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
