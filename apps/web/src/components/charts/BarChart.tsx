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
  color: string;
}

export interface BarChartProps {
  data: Record<string, unknown>[];
  series: BarChartSeries[];
  xAxisKey: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
}

export function BarChart({
  data,
  series,
  xAxisKey,
  height = 300,
  layout = 'horizontal',
}: BarChartProps) {
  const isVertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={isVertical ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              width={120}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
          </>
        )}
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
        <Legend />
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={s.color}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
