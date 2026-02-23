'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertCircle, Mail, Phone } from 'lucide-react';

interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
  };
  amount: number;
  dueDate: string;
  issueDate: string;
  daysOverdue: number;
  status: 'overdue' | 'pending' | 'warning';
  notes?: string;
}

export default function UnpaidInvoicesPage() {
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'pending'>('all');
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const fetchUnpaidInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices/unpaid?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setInvoices(result.data);
        setTotalUnpaid(result.total);
      }
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUnpaidInvoices();
  }, [fetchUnpaidInvoices]);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'overdue') {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {daysOverdue} days overdue
        </span>
      );
    } else if (status === 'warning') {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Due soon
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Unpaid Invoices</h1>
          <p className="text-sm text-gray-600 mt-1">Track and manage outstanding invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-600">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">KES {totalUnpaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Overdue Invoices</p>
          <p className="text-3xl font-bold text-red-600">
            {invoices.filter(inv => inv.status === 'overdue').length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            KES {invoices.filter(inv => inv.status === 'overdue')
              .reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Pending Invoices</p>
          <p className="text-3xl font-bold text-blue-600">
            {invoices.filter(inv => inv.status === 'pending').length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            KES {invoices.filter(inv => inv.status === 'pending')
              .reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Warning (Due Soon)</p>
          <p className="text-3xl font-bold text-yellow-600">
            {invoices.filter(inv => inv.status === 'warning').length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            KES {invoices.filter(inv => inv.status === 'warning')
              .reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-white/80 backdrop-blur rounded-lg border border-white/70 p-2 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded font-medium text-sm ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Invoices
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded font-medium text-sm ${
            filter === 'overdue'
              ? 'bg-red-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          Overdue Only
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded font-medium text-sm ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          Pending Only
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No unpaid invoices found
                </td>
              </tr>
            ) : (
              invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">{new Date(invoice.issueDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{invoice.customer.name}</div>
                    <div className="text-xs text-gray-500">{invoice.customer.companyName}</div>
                    <div className="flex gap-2 mt-1">
                      <a href={`mailto:${invoice.customer.email}`} className="text-blue-600 hover:text-blue-700">
                        <Mail className="w-3 h-3" />
                      </a>
                      {invoice.customer.phone && (
                        <a href={`tel:${invoice.customer.phone}`} className="text-blue-600 hover:text-blue-700">
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900">KES {invoice.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(invoice.status, invoice.daysOverdue)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                        Send Reminder
                      </button>
                      <button className="text-green-600 hover:text-green-700 text-xs font-medium">
                        Mark Paid
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-blue-900">
            {selectedInvoices.length} invoice(s) selected - Total: KES{' '}
            {invoices
              .filter(inv => selectedInvoices.includes(inv.id))
              .reduce((sum, inv) => sum + inv.amount, 0)
              .toLocaleString()}
          </p>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Send Reminders
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              Mark as Paid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
