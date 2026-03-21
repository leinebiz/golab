'use client';

import { useCallback, useEffect, useState } from 'react';
import { KpiCard } from '@/components/charts/kpi-card';
import { DoughnutChart } from '@/components/charts/doughnut-chart';
import { LineChart } from '@/components/charts/line-chart';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { CsvExportButton } from '@/components/charts/csv-export-button';

interface OperationsData {
  kpis: { totalRequests: number; conversionRate: number; volumeChange: number };
  byStatus: Array<{ name: string; value: number }>;
  volumeTrend: Array<{ date: string; count: number }>;
  funnel: Array<{ name: string; value: number }>;
  turnaroundByStage: Array<{ stage: string; avgDays: number }>;
  dateRange: { from: string; to: string };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [from, setFrom] = useState(formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(formatDate(now));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/operations?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
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
        <h1 className="text-2xl font-bold">Operations Dashboard</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Operations Dashboard</h1>
        <p className="text-red-500">{error ?? 'Failed to load data'}</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Operations Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="from" className="text-sm text-gray-600">
              From
            </label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="to" className="text-sm text-gray-600">
              To
            </label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <CsvExportButton
            data={data.byStatus}
            filename={`operations-status-${from}-${to}`}
            headers={{ name: 'Status', value: 'Count' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Requests"
          value={data.kpis.totalRequests}
          trend={{
            direction:
              data.kpis.volumeChange > 0 ? 'up' : data.kpis.volumeChange < 0 ? 'down' : 'flat',
            percentage: Math.abs(data.kpis.volumeChange),
            label: 'vs prev period',
          }}
        />
        <KpiCard label="Conversion Rate" value={`${data.kpis.conversionRate}%`} color="success" />
        <KpiCard
          label="Volume Change"
          value={`${data.kpis.volumeChange > 0 ? '+' : ''}${data.kpis.volumeChange}%`}
          trend={{
            direction:
              data.kpis.volumeChange > 0 ? 'up' : data.kpis.volumeChange < 0 ? 'down' : 'flat',
            percentage: Math.abs(data.kpis.volumeChange),
          }}
          color={data.kpis.volumeChange >= 0 ? 'info' : 'warning'}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <DoughnutChart data={data.byStatus} title="Requests by Status" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <LineChart
            data={data.volumeTrend}
            xAxisKey="date"
            series={[{ dataKey: 'count', name: 'Requests' }]}
            title="Volume Trend (Last 30 Days)"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <FunnelChart data={data.funnel} title="Quote Conversion Funnel" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <BarChart
            data={data.turnaroundByStage}
            xAxisKey="stage"
            series={[{ dataKey: 'avgDays', name: 'Avg Days', color: '#8b5cf6' }]}
            title="Turnaround by Stage"
          />
        </div>
      </div>
    </div>
  );
}
