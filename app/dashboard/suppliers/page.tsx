'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, X, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface SupplierBill {
  id: string;
  billNumber: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  supplier?: Supplier | null;
}

interface SupplierAgingData {
  buckets: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [showBillModal, setShowBillModal] = useState(false);
  const [creatingBill, setCreatingBill] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [billForm, setBillForm] = useState({
    supplierId: '',
    totalAmount: '',
    issueDate: '',
    dueDate: '',
    reference: '',
    notes: '',
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingBill, setPayingBill] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    billId: '',
    amount: '',
    paymentDate: '',
    paymentMethod: '',
    reference: '',
    notes: '',
  });
  const [agingData, setAgingData] = useState<SupplierAgingData | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);
  const [form, setForm] = useState({
    supplierCode: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchSuppliers();
    fetchBills();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/suppliers?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch suppliers');

      const data = await response.json();
      setSuppliers(data.data.suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/supplier-bills?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch supplier bills');

      const data = await response.json();
      setBills(data.data.items);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load supplier bills');
    } finally {
      setLoadingBills(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const billStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'badge-info',
      PARTIALLY_PAID: 'badge-warning',
      OVERDUE: 'badge-danger',
      PAID: 'badge-success',
      CANCELLED: 'badge-gray',
    };
    return styles[status] || 'badge-gray';
  };

  const summary = useMemo(() => {
    const openStatuses = new Set(['OPEN', 'PARTIALLY_PAID', 'OVERDUE']);
    const openBills = bills.filter((bill) => openStatuses.has(bill.status));
    const openBalance = openBills.reduce((sum, bill) => sum + bill.balanceAmount, 0);
    const overdueCount = bills.filter((bill) => bill.status === 'OVERDUE').length;

    return {
      suppliers: suppliers.length,
      openBills: openBills.length,
      openBalance,
      overdueCount,
    };
  }, [bills, suppliers.length]);

  const handleCreate = async () => {
    if (!form.supplierCode || !form.name) {
      toast.error('Supplier code and name are required');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        editingSupplierId ? `/api/suppliers/${editingSupplierId}` : '/api/suppliers',
        {
          method: editingSupplierId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create supplier');
      }

      if (editingSupplierId) {
        setSuppliers((prev) => prev.map((item) => (item.id === editingSupplierId ? data.data : item)));
        toast.success('Supplier updated');
      } else {
        setSuppliers((prev) => [data.data, ...prev]);
        toast.success('Supplier added');
      }
      setForm({ supplierCode: '', name: '', email: '', phone: '', address: '' });
      setShowAdd(false);
      setEditingSupplierId(null);
    } catch (error) {
      console.error('Create supplier error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create supplier');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setForm({
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
    setEditingSupplierId(supplier.id);
    setShowAdd(true);
  };

  const handleCreateBill = async () => {
    if (!billForm.supplierId || !billForm.totalAmount || !billForm.issueDate || !billForm.dueDate) {
      toast.error('Supplier, amount, issue date, and due date are required');
      return;
    }

    try {
      setCreatingBill(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/supplier-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId: billForm.supplierId,
          totalAmount: parseFloat(billForm.totalAmount),
          issueDate: billForm.issueDate,
          dueDate: billForm.dueDate,
          reference: billForm.reference || undefined,
          notes: billForm.notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create bill');
      }

      setBills((prev) => [data.data, ...prev]);
      setBillForm({
        supplierId: '',
        totalAmount: '',
        issueDate: '',
        dueDate: '',
        reference: '',
        notes: '',
      });
      setShowBillModal(false);
      toast.success('Supplier bill added');
    } catch (error) {
      console.error('Create bill error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create bill');
    } finally {
      setCreatingBill(false);
    }
  };

  const handlePayBill = async () => {
    if (!paymentForm.billId || !paymentForm.amount || !paymentForm.paymentDate) {
      toast.error('Bill, amount, and date are required');
      return;
    }

    try {
      setPayingBill(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          billId: paymentForm.billId,
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod || undefined,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to record payment');
      }

      setBills((prev) =>
        prev.map((bill) => (bill.id === paymentForm.billId ? data.data.bill : bill))
      );
      setPaymentForm({
        billId: '',
        amount: '',
        paymentDate: '',
        paymentMethod: '',
        reference: '',
        notes: '',
      });
      setShowPaymentModal(false);
      toast.success('Payment recorded');
    } catch (error) {
      console.error('Record payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setPayingBill(false);
    }
  };

  const filtered = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    supplier.supplierCode.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBills = bills.filter((bill) =>
    selectedSupplierId ? bill.supplier?.id === selectedSupplierId : true
  );

  useEffect(() => {
    const fetchAging = async () => {
      if (!selectedSupplierId) {
        setAgingData(null);
        return;
      }

      try {
        setLoadingAging(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/suppliers/${selectedSupplierId}/aging`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch aging report');

        const data = await response.json();
        setAgingData(data.data);
      } catch (error) {
        console.error('Aging report error:', error);
        toast.error('Failed to load aging report');
      } finally {
        setLoadingAging(false);
      }
    };

    fetchAging();
  }, [selectedSupplierId]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setForm({ supplierCode: '', name: '', email: '', phone: '', address: '' });
                setEditingSupplierId(null);
                setShowAdd(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Suppliers</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.suppliers}</p>
            <p className="text-xs text-gray-500 mt-1">Active vendor profiles</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Open Bills</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.openBills}</p>
            <p className="text-xs text-gray-500 mt-1">Open & partially paid</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Outstanding</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(summary.openBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total open balance</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Overdue Bills</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.overdueCount}</p>
            <p className="text-xs text-gray-500 mt-1">Require attention</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Supplier Bills</h2>
              <p className="text-sm text-gray-600">Track balances and aging across suppliers.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="input"
              >
                <option value="">All suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <button onClick={() => setShowBillModal(true)} className="btn-secondary">
                + New Bill
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Record Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedSupplierId && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900">Aging Summary</h3>
          </div>
          <div className="card-body">
            {loadingAging ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : agingData ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">Current</p>
                  <p className="text-lg font-semibold">{formatCurrency(agingData.buckets.current)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">1-30 Days</p>
                  <p className="text-lg font-semibold">{formatCurrency(agingData.buckets.days1to30)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">31-60 Days</p>
                  <p className="text-lg font-semibold">{formatCurrency(agingData.buckets.days31to60)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">61-90 Days</p>
                  <p className="text-lg font-semibold">{formatCurrency(agingData.buckets.days61to90)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500">90+ Days</p>
                  <p className="text-lg font-semibold">{formatCurrency(agingData.buckets.days90plus)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No aging data available.</p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Open Bills</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Supplier</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingBills ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No bills found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="text-sm font-medium">{bill.billNumber}</td>
                    <td className="text-sm">{bill.supplier?.name || '-'}</td>
                    <td className="text-sm">
                      {new Date(bill.issueDate).toLocaleDateString('en-KE')}
                    </td>
                    <td className="text-sm">
                      {new Date(bill.dueDate).toLocaleDateString('en-KE')}
                    </td>
                    <td className="text-sm font-semibold">{formatCurrency(bill.totalAmount)}</td>
                    <td className="text-sm font-semibold">{formatCurrency(bill.balanceAmount)}</td>
                    <td>
                      <span className={`badge ${billStatusBadge(bill.status)}`}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Suppliers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filtered.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="text-sm font-medium">{supplier.supplierCode}</td>
                    <td className="text-sm font-medium">{supplier.name}</td>
                    <td className="text-sm">{supplier.email || '-'}</td>
                    <td className="text-sm">{supplier.phone || '-'}</td>
                    <td className="text-sm">{supplier.address || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleEditSupplier(supplier)}
                        className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSupplierId ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Supplier Code</label>
                <input
                  type="text"
                  value={form.supplierCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, supplierCode: e.target.value }))}
                  className="input"
                  placeholder="SUP-0001"
                />
              </div>
              <div>
                <label className="label">Supplier Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Atlas Supplies"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="billing@atlas.com"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="+254 700 000000"
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="input"
                  placeholder="Industrial Area, Nairobi"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setEditingSupplierId(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                disabled={creating}
              >
                {creating
                  ? (editingSupplierId ? 'Updating...' : 'Saving...')
                  : (editingSupplierId ? 'Update Supplier' : 'Save Supplier')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Supplier Bill</h3>
              <button onClick={() => setShowBillModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Supplier</label>
                <select
                  value={billForm.supplierId}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, supplierId: e.target.value }))}
                  className="input"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.supplierCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Total Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billForm.totalAmount}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Issue Date</label>
                <input
                  type="date"
                  value={billForm.issueDate}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Reference</label>
                <input
                  type="text"
                  value={billForm.reference}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, reference: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  type="text"
                  value={billForm.notes}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowBillModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                disabled={creatingBill}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBill}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                disabled={creatingBill}
              >
                {creatingBill ? 'Saving...' : 'Save Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Supplier Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Bill</label>
                <select
                  value={paymentForm.billId}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, billId: e.target.value }))}
                  className="input"
                >
                  <option value="">Select bill...</option>
                  {bills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.billNumber} - {bill.supplier?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <input
                  type="text"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Reference</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                disabled={payingBill}
              >
                Cancel
              </button>
              <button
                onClick={handlePayBill}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                disabled={payingBill}
              >
                {payingBill ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
