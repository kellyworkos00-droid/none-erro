'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface SupplierAgingRow {
  supplierId: string;
  supplierName: string;
  totalBalance: number;
  buckets: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
}

export default function SupplierAgingPage() {
  const [rows, setRows] = useState<SupplierAgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAging();
  }, []);

  const fetchAging = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/suppliers/aging', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load aging report');

      const data = await response.json();
      setRows(data.data.rows);
    } catch (error) {
      console.error('Aging report error:', error);
      toast.error('Failed to load aging report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += row.totalBalance;
        acc.current += row.buckets.current;
        acc.days1to30 += row.buckets.days1to30;
        acc.days31to60 += row.buckets.days31to60;
        acc.days61to90 += row.buckets.days61to90;
        acc.days90plus += row.buckets.days90plus;
        return acc;
      },
      {
        total: 0,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
      }
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Supplier Aging Report</h2>
            <p className="text-sm text-gray-600">Monitor outstanding balances by aging bucket.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Balance</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(totals.total)}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Current</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(totals.current)}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">1-30 Days</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(totals.days1to30)}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">90+ Days</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(totals.days90plus)}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">Aging Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Total Balance</th>
                <th>Current</th>
                <th>1-30 Days</th>
                <th>31-60 Days</th>
                <th>61-90 Days</th>
                <th>90+ Days</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No aging data found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.supplierId}>
                    <td className="text-sm font-medium">{row.supplierName}</td>
                    <td className="text-sm font-semibold">{formatCurrency(row.totalBalance)}</td>
                    <td className="text-sm">{formatCurrency(row.buckets.current)}</td>
                    <td className="text-sm">{formatCurrency(row.buckets.days1to30)}</td>
                    <td className="text-sm">{formatCurrency(row.buckets.days31to60)}</td>
                    <td className="text-sm">{formatCurrency(row.buckets.days61to90)}</td>
                    <td className="text-sm">{formatCurrency(row.buckets.days90plus)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="bg-white/80">
                  <td className="text-sm font-semibold">Totals</td>
                  <td className="text-sm font-semibold">{formatCurrency(totals.total)}</td>
                  <td className="text-sm font-semibold">{formatCurrency(totals.current)}</td>
                  <td className="text-sm font-semibold">{formatCurrency(totals.days1to30)}</td>
                  <td className="text-sm font-semibold">{formatCurrency(totals.days31to60)}</td>
                  <td className="text-sm font-semibold">{formatCurrency(totals.days61to90)}</td>
                  <td className="text-sm font-semibold">{formatCurrency(totals.days90plus)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
