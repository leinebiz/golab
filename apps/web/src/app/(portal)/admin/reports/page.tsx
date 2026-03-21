'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/charts/KpiCard';
import { DoughnutChart } from '@/components/charts/DoughnutChart';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { Download } from 'lucide-react';

interface Kpi {
  key: string;
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
}

interface RequestAnalytics {
  statusDistribution: { status: string; count: number }[];
  volumeTrend: { date: string; count: number }[];
  funnel: { name: string; value: number }[];
  avgTurnaround: { stage: string; avgHours: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  QUOTE_CALCULATED: '#60a5fa',
  PENDING_CUSTOMER_REVIEW: '#fbbf24',
  ACCEPTED_BY_CUSTOMER: '#34d399',
  INVOICE_GENERATED: '#a78bfa',
  AWAITING_COD_PAYMENT: '#f97316',
  PAYMENT_RECEIVED: '#22d3ee',
  CREDIT_APPROVED_FOR_REQUEST: '#2dd4bf',
  IN_PROGRESS: '#3b82f6',
  PENDING_CUSTOMER_ACTION: '#eab308',
  CLOSED: '#10b981',
  CANCELLED: '#ef4444',
  ON_HOLD: '#f59e0b',
};

const FUNNEL_COLORS = ['#3b82f6', '#60a5fa', '#34d399', '#22d3ee', '#10b981'];

const STAGE_LABELS: Record<string, string> = {
  QUOTE_CALCULATED: 'Quote Calculated',
  ACCEPTED_BY_CUSTOMER: 'Customer Accepted',
  PAYMENT_RECEIVED: 'Payment Received',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
};

export default function ReportsPage() {
  const [days, setDays] = useState('30');
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [analytics, setAnalytics] = useState<RequestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, analyticsRes] = await Promise.all([
        fetch(`/api/v1/reports/kpis?days=${days}`),
        fetch(`/api/v1/reports/requests?days=${days}`),
      ]);

      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        setKpis(kpiData.kpis);
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = (type: string) => {
    window.open(`/api/v1/reports/export/${type}?days=${days}`, '_blank');
  };

  const doughnutData = (analytics?.statusDistribution ?? []).map((s) => ({
    name: s.status.replace(/_/g, ' '),
    value: s.count,
    color: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  const funnelData = (analytics?.funnel ?? []).map((f, i) => ({
    ...f,
    color: FUNNEL_COLORS[i] ?? '#94a3b8',
  }));

  const turnaroundData = (analytics?.avgTurnaround ?? []).map((t) => ({
    stage: STAGE_LABELS[t.stage] ?? t.stage,
    hours: t.avgHours,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          <p className="text-sm text-gray-500">KPI overview and request analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport('requests')}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                changePercent={kpi.changePercent}
              />
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Requests by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {doughnutData.length > 0 ? (
                  <DoughnutChart data={doughnutData} />
                ) : (
                  <p className="py-8 text-center text-gray-400">No data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && analytics.volumeTrend.length > 0 ? (
                  <LineChart
                    data={analytics.volumeTrend}
                    series={[{ dataKey: 'count', name: 'Requests', color: '#3b82f6' }]}
                    xAxisKey="date"
                  />
                ) : (
                  <p className="py-8 text-center text-gray-400">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quote Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <FunnelChart data={funnelData} />
                ) : (
                  <p className="py-8 text-center text-gray-400">No data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Turnaround by Stage (hours)</CardTitle>
              </CardHeader>
              <CardContent>
                {turnaroundData.length > 0 ? (
                  <BarChart
                    data={turnaroundData}
                    series={[{ dataKey: 'hours', name: 'Avg Hours', color: '#8b5cf6' }]}
                    xAxisKey="stage"
                    layout="vertical"
                  />
                ) : (
                  <p className="py-8 text-center text-gray-400">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
