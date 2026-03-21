'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface BarChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}
export interface BarChartProps {
  data: Array<Record<string, unknown>>;
  xAxisKey: string;
  series: BarChartSeries[];
  title?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function BarChart({
  data,
  xAxisKey,
  series,
  title,
  height = 300,
  layout = 'horizontal',
}: BarChartProps) {
  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-medium text-gray-700">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis
                dataKey={xAxisKey}
                type="category"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            </>
          )}
          <Tooltip />
          <Legend />
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
