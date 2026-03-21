'use client';

import { useCallback, useEffect, useState } from 'react';
import { KpiCard } from '@/components/charts/kpi-card';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { CsvExportButton } from '@/components/charts/csv-export-button';

interface FinancialData {
  kpis: { totalRevenue: number; revenueChange: number; totalOutstanding: number };
  revenueTrend: Array<{ date: string; revenue: number }>;
  outstanding: Array<{ name: string; value: number }>;
  creditUtilization: Array<{
    customerId: string;
    customerName: string;
    creditLimit: number;
    outstandingBalance: number;
    availableCredit: number;
    utilizationPercent: number;
  }>;
  dateRange: { from: string; to: string };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function FinancialDashboardPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [from, setFrom] = useState(formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(formatDate(now));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/financial?from=${from}&to=${to}`);
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
        <h1 className="text-2xl font-bold">Financial Dashboard</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Financial Dashboard</h1>
        <p className="text-red-500">{error ?? 'Failed to load'}</p>
      </div>
    );

  const creditExport = data.creditUtilization.map((c) => ({
    Customer: c.customerName,
    'Credit Limit': c.creditLimit,
    Outstanding: c.outstandingBalance,
    Available: c.availableCredit,
    'Utilization %': c.utilizationPercent,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="fin-from" className="text-sm text-gray-600">
              From
            </label>
            <input
              id="fin-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="fin-to" className="text-sm text-gray-600">
              To
            </label>
            <input
              id="fin-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <CsvExportButton data={creditExport} filename={`financial-${from}-${to}`} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(data.kpis.totalRevenue)}
          trend={{
            direction:
              data.kpis.revenueChange > 0 ? 'up' : data.kpis.revenueChange < 0 ? 'down' : 'flat',
            percentage: Math.abs(data.kpis.revenueChange),
            label: 'vs prev period',
          }}
          color="success"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(data.kpis.totalOutstanding)}
          color={data.kpis.totalOutstanding > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          label="Revenue Change"
          value={`${data.kpis.revenueChange > 0 ? '+' : ''}${data.kpis.revenueChange}%`}
          trend={{
            direction:
              data.kpis.revenueChange > 0 ? 'up' : data.kpis.revenueChange < 0 ? 'down' : 'flat',
            percentage: Math.abs(data.kpis.revenueChange),
          }}
          color="info"
        />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <LineChart
          data={data.revenueTrend}
          xAxisKey="date"
          series={[{ dataKey: 'revenue', name: 'Revenue (ZAR)', color: '#10b981' }]}
          title="Revenue Trend"
          height={350}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <BarChart
            data={data.outstanding}
            xAxisKey="name"
            series={[{ dataKey: 'value', name: 'Amount (ZAR)', color: '#f59e0b' }]}
            title="Outstanding COD Aging"
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <BarChart
            data={data.creditUtilization.map((c) => ({
              customer:
                c.customerName.length > 15 ? c.customerName.slice(0, 15) + '...' : c.customerName,
              utilization: c.utilizationPercent,
            }))}
            xAxisKey="customer"
            series={[{ dataKey: 'utilization', name: 'Utilization %', color: '#8b5cf6' }]}
            title="Credit Utilization by Customer"
          />
        </div>
      </div>
    </div>
  );
}
