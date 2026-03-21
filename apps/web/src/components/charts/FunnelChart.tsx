'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface FunnelStage {
  name: string;
  value: number;
  color: string;
}

export interface FunnelChartProps {
  data: FunnelStage[];
  height?: number;
}

export function FunnelChart({ data, height = 300 }: FunnelChartProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            width={120}
          />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {data.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 px-4">
          {data.slice(1).map((stage, i) => {
            const prev = data[i];
            const rate = prev.value > 0 ? ((stage.value / prev.value) * 100).toFixed(1) : '0.0';
            return (
              <div key={stage.name} className="text-xs text-gray-500">
                {prev.name} &rarr; {stage.name}:{' '}
                <span className="font-medium text-gray-700">{rate}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
