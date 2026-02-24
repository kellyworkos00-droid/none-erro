'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  unpaidInvoiceCount: number;
  paidInvoiceCount: number;
  financialRatios: {
    debtToEquity: number;
    currentRatio: number;
    quickRatio: number;
    debtToAssets: number;
    assetTurnover: number;
    roa: number;
    roe: number;
    profitMargin: number;
  };
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
};

const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = 'bg-blue-50',
}) => (
  <div className={`${color} p-4 rounded-lg shadow`}>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const FinancialRatioCard: React.FC<{ label: string; value: number; benchmark?: number }> = ({
  label,
  value,
  benchmark,
}) => {
  const isHealthy = benchmark ? value >= benchmark : true;
  const textColor = isHealthy ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-xl font-bold mt-1 ${textColor}`}>{value.toFixed(2)}</p>
      {benchmark && <p className="text-xs text-gray-500 mt-1">Benchmark: {benchmark.toFixed(2)}</p>}
    </div>
  );
};

type PieLabelProps = {
  name?: string;
  value?: number;
};

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

export const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Simulated cash flow data for demonstration
  const [cashFlowData] = useState([
    { date: 'Jan 1', inflows: 45000, outflows: 32000 },
    { date: 'Jan 2', inflows: 52000, outflows: 38000 },
    { date: 'Jan 3', inflows: 48000, outflows: 35000 },
    { date: 'Jan 4', inflows: 61000, outflows: 42000 },
    { date: 'Jan 5', inflows: 55000, outflows: 40000 },
    { date: 'Jan 6', inflows: 67000, outflows: 45000 },
    { date: 'Jan 7', inflows: 72000, outflows: 50000 },
  ]);

  // Simulated aging report data
  const [agingData] = useState([
    { name: '0-30 Days', value: 45000, count: 12 },
    { name: '31-60 Days', value: 28000, count: 8 },
    { name: '61-90 Days', value: 15000, count: 4 },
    { name: '90+ Days', value: 8000, count: 2 },
  ]);

  const fetchMetrics = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/analytics/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const data = await response.json();
      setMetrics(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    try {
      const response = await fetch(`/api/exports?type=dashboard&format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to export dashboard');
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <p className="text-red-800">Error loading dashboard: {error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time financial metrics and analysis</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Export Excel
            </button>
            <button
              onClick={fetchMetrics}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Total Revenue"
            value={`$${(metrics.totalRevenue / 1000).toFixed(1)}K`}
            color="bg-green-50"
          />
          <MetricCard
            label="Total Expenses"
            value={`$${(metrics.totalExpenses / 1000).toFixed(1)}K`}
            color="bg-red-50"
          />
          <MetricCard
            label="Net Income"
            value={`$${(metrics.netIncome / 1000).toFixed(1)}K`}
            color={metrics.netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'}
          />
          <MetricCard
            label="Cash Balance"
            value={`$${(metrics.cashBalance / 1000).toFixed(1)}K`}
            color="bg-blue-50"
          />
        </div>

        {/* Asset, Liability, Equity Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="Total Assets"
            value={`$${(metrics.totalAssets / 1000).toFixed(1)}K`}
            color="bg-blue-50"
          />
          <MetricCard
            label="Total Liabilities"
            value={`$${(metrics.totalLiabilities / 1000).toFixed(1)}K`}
            color="bg-orange-50"
          />
          <MetricCard
            label="Total Equity"
            value={`$${(metrics.totalEquity / 1000).toFixed(1)}K`}
            color="bg-purple-50"
          />
        </div>

        {/* Receivables & Payables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="Accounts Receivable"
            value={`$${(metrics.accountsReceivable / 1000).toFixed(1)}K`}
            color="bg-indigo-50"
          />
          <MetricCard
            label="Accounts Payable"
            value={`$${(metrics.accountsPayable / 1000).toFixed(1)}K`}
            color="bg-yellow-50"
          />
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Invoice Summary</p>
            <div className="mt-2 space-y-1">
              <p className="text-sm">
                Paid: <span className="font-bold text-green-600">{metrics.paidInvoiceCount}</span>
              </p>
              <p className="text-sm">
                Unpaid: <span className="font-bold text-red-600">{metrics.unpaidInvoiceCount}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cash Flow Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Forecast</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorInflows" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inflows"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorInflows)"
                  name="Inflows"
                />
                <Area type="monotone" dataKey="outflows" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Aging Report Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Accounts Receivable Aging</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: PieLabelProps) =>
                    `${name}: $${(Number(value || 0) / 1000).toFixed(0)}K`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Ratios Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Ratios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinancialRatioCard label="Debt-to-Equity" value={metrics.financialRatios.debtToEquity} benchmark={1.5} />
            <FinancialRatioCard label="Current Ratio" value={metrics.financialRatios.currentRatio} benchmark={1.5} />
            <FinancialRatioCard label="Quick Ratio" value={metrics.financialRatios.quickRatio} benchmark={1.0} />
            <FinancialRatioCard label="Debt-to-Assets" value={metrics.financialRatios.debtToAssets} benchmark={0.6} />
            <FinancialRatioCard label="Asset Turnover" value={metrics.financialRatios.assetTurnover} />
            <FinancialRatioCard label="ROA (%)" value={metrics.financialRatios.roa * 100} />
            <FinancialRatioCard label="ROE (%)" value={metrics.financialRatios.roe * 100} />
            <FinancialRatioCard label="Profit Margin (%)" value={metrics.financialRatios.profitMargin * 100} />
          </div>
        </div>

        {/* Revenue vs Expenses Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="inflows" fill={COLORS.success} name="Revenue" />
              <Bar dataKey="outflows" fill={COLORS.danger} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
