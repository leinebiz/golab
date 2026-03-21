'use client';

import { useCallback, useEffect, useState } from 'react';
import { KpiCard } from '@/components/charts/kpi-card';
import { BarChart } from '@/components/charts/bar-chart';
import { CsvExportButton } from '@/components/charts/csv-export-button';

interface LabData {
  labId: string;
  labName: string;
  labCode: string;
  total: number;
  completed: number;
  rejected: number;
  delayed: number;
  completionRate: number;
  rejectionRate: number;
  delayFrequency: number;
  avgTatDays: number;
  avgSlaDays: number;
}
interface LabsResponse {
  labs: LabData[];
  dateRange: { from: string; to: string };
}
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function LabPerformancePage() {
  const [data, setData] = useState<LabsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [from, setFrom] = useState(formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(formatDate(now));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/labs?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Lab Performance</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Lab Performance</h1>
        <p className="text-red-500">{error ?? 'Failed to load'}</p>
      </div>
    );

  const totalCompleted = data.labs.reduce((s, l) => s + l.completed, 0);
  const totalReqs = data.labs.reduce((s, l) => s + l.total, 0);
  const avgCompletion = totalReqs > 0 ? Math.round((totalCompleted / totalReqs) * 1000) / 10 : 0;
  const exportData = data.labs.map((l) => ({
    Lab: l.labName,
    Code: l.labCode,
    Total: l.total,
    Completed: l.completed,
    Rejected: l.rejected,
    'Completion %': l.completionRate,
    'Avg TAT': l.avgTatDays,
    'Avg SLA': l.avgSlaDays,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lab Performance</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="lab-from" className="text-sm text-gray-600">
              From
            </label>
            <input
              id="lab-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="lab-to" className="text-sm text-gray-600">
              To
            </label>
            <input
              id="lab-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <CsvExportButton data={exportData} filename={`lab-performance-${from}-${to}`} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Sub-Requests" value={totalReqs} />
        <KpiCard label="Completed" value={totalCompleted} color="success" />
        <KpiCard label="Avg Completion Rate" value={`${avgCompletion}%`} color="info" />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <BarChart
          data={data.labs.map((l) => ({ lab: l.labName, completed: l.completed, total: l.total }))}
          xAxisKey="lab"
          series={[
            { dataKey: 'completed', name: 'Completed', color: '#10b981' },
            { dataKey: 'total', name: 'Total', color: '#e5e7eb' },
          ]}
          title="Completion by Lab"
          height={350}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <BarChart
            data={data.labs.map((l) => ({ lab: l.labName, tat: l.avgTatDays, sla: l.avgSlaDays }))}
            xAxisKey="lab"
            series={[
              { dataKey: 'tat', name: 'Avg TAT (days)', color: '#3b82f6' },
              { dataKey: 'sla', name: 'Avg SLA (days)', color: '#f59e0b' },
            ]}
            title="TAT vs SLA Comparison"
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <BarChart
            data={data.labs.map((l) => ({
              lab: l.labName,
              rejectionRate: l.rejectionRate,
              delayFrequency: l.delayFrequency,
            }))}
            xAxisKey="lab"
            series={[
              { dataKey: 'rejectionRate', name: 'Rejection %', color: '#ef4444' },
              { dataKey: 'delayFrequency', name: 'Delay %', color: '#f97316' },
            ]}
            title="Rejection & Delay Rates"
          />
        </div>
      </div>
    </div>
  );
}
