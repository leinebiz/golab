'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

export interface FunnelChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  height?: number;
}

const DEFAULT_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#84cc16'];

export function FunnelChart({ data, title, height = 300 }: FunnelChartProps) {
  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-medium text-gray-700">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            width={100}
          />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="value" position="right" style={{ fontSize: 12, fill: '#374151' }} />
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
