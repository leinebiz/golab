'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export interface DoughnutChartProps {
  data: { name: string; value: number; color: string }[];
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
}

export function DoughnutChart({
  data,
  innerRadius = 60,
  outerRadius = 90,
  height = 300,
}: DoughnutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
