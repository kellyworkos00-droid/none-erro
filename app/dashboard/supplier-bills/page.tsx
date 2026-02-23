'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, DollarSign } from 'lucide-react';

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
}

interface SupplierBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplier: Supplier;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  approvalStatus: string;
  purchaseOrderId: string | null;
  issueDate: string;
  dueDate: string;
  reference: string | null;
  notes: string | null;
}

export default function SupplierBillsPage() {
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Array<{ id: string; orderNumber: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('VIEWER');

  const [formData, setFormData] = useState({
    supplierId: '',
    totalAmount: '',
    issueDate: '',
    dueDate: '',
    reference: '',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchBills();
    fetchSuppliers();
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser) as { role?: string };
      setUserRole(parsed.role || 'VIEWER');
    } catch {
      setUserRole('VIEWER');
    }
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/supplier-bills', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch bills');

      const data = await response.json();
      setBills(data.data.items);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load supplier bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/suppliers?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch suppliers');

      const data = await response.json();
      setSuppliers(data.data.items);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/purchase-orders?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch purchase orders');

      const data = await response.json();
      setPurchaseOrders(data.data.items || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId || !formData.totalAmount || !formData.issueDate || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/supplier-bills', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          totalAmount: parseFloat(formData.totalAmount),
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create bill');
      }

      toast.success('Supplier bill created successfully');
      setFormData({
        supplierId: '',
        totalAmount: '',
        issueDate: '',
        dueDate: '',
        reference: '',
        notes: '',
      });
      setShowForm(false);
      fetchBills();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBill || !paymentData.amount || !paymentData.paymentDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: parseFloat(paymentData.amount),
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          reference: paymentData.reference || undefined,
          notes: paymentData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to record payment');
      }

      toast.success('Payment recorded successfully');
      setPaymentData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        notes: '',
      });
      setShowPaymentForm(false);
      setSelectedBill(null);
      fetchBills();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkflowAction = async (billId: string, action: string, purchaseOrderId?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/supplier-bills/${billId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, purchaseOrderId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to update bill');
      }

      setBills((prev) => prev.map((bill) => (bill.id === billId ? data.data : bill)));
      toast.success(`Bill ${action.toLowerCase()} successful`);
    } catch (error) {
      console.error('Bill action error:', error);
      toast.error(error instanceof Error ? error.message : 'Bill update failed');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PAID: 'badge-success',
      OPEN: 'badge-info',
      PARTIALLY_PAID: 'badge-warning',
      OVERDUE: 'badge-danger',
      CANCELLED: 'badge-gray',
    };
    return styles[status as keyof typeof styles] || 'badge-gray';
  };

  const getApprovalBadge = (status: string) => {
    const styles = {
      NOT_SUBMITTED: 'badge-gray',
      PENDING: 'badge-warning',
      APPROVED: 'badge-success',
      REJECTED: 'badge-danger',
    };
    return styles[status as keyof typeof styles] || 'badge-gray';
  };

  const canApprove = userRole === 'ADMIN' || userRole === 'FINANCE_MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Bills</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Bill
        </button>
      </div>

      {/* Create Bill Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Add New Supplier Bill</h2>
            <button onClick={() => setShowForm(false)}>
              <X size={24} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.supplierCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
            >
              {submitting ? 'Creating Bill...' : 'Create Bill'}
            </button>
          </form>
        </div>
      )}

      {/* Payment Form */}
      {showPaymentForm && selectedBill && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Record Payment - {selectedBill.billNumber}</h2>
            <button onClick={() => {
              setShowPaymentForm(false);
              setSelectedBill(null);
            }}>
              <X size={24} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold ml-2">{formatCurrency(selectedBill.totalAmount)}</span>
              </div>
              <div>
                <span className="text-gray-600">Paid:</span>
                <span className="font-semibold ml-2">{formatCurrency(selectedBill.paidAmount)}</span>
              </div>
              <div>
                <span className="text-gray-600">Balance:</span>
                <span className="font-semibold ml-2 text-red-600">{formatCurrency(selectedBill.balanceAmount)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  max={selectedBill.balanceAmount}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
            >
              {submitting ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </form>
        </div>
      )}

      {showMatchForm && selectedBill && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Match Bill - {selectedBill.billNumber}</h2>
            <button
              onClick={() => {
                setShowMatchForm(false);
                setSelectedPurchaseOrder('');
              }}
            >
              <X size={24} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="space-y-4">
            <select
              value={selectedPurchaseOrder}
              onChange={(e) => setSelectedPurchaseOrder(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="">Select received purchase order</option>
              {purchaseOrders
                .filter((order) => order.status === 'RECEIVED')
                .map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
            </select>

            <button
              onClick={() => {
                if (!selectedPurchaseOrder) {
                  toast.error('Select a purchase order');
                  return;
                }
                handleWorkflowAction(selectedBill.id, 'MATCH', selectedPurchaseOrder);
                setShowMatchForm(false);
                setSelectedPurchaseOrder('');
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              Match Bill
            </button>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Supplier Bills</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Supplier</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Approval</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    No supplier bills found. Create your first bill!
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="text-sm font-medium">{bill.billNumber}</td>
                    <td className="text-sm">{bill.supplier.name}</td>
                    <td className="text-sm">{formatDate(bill.issueDate)}</td>
                    <td className="text-sm">{formatDate(bill.dueDate)}</td>
                    <td className="text-sm font-semibold">{formatCurrency(bill.totalAmount)}</td>
                    <td className="text-sm text-green-600">{formatCurrency(bill.paidAmount)}</td>
                    <td className="text-sm text-red-600 font-medium">{formatCurrency(bill.balanceAmount)}</td>
                    <td>
                      <span className={`badge ${getApprovalBadge(bill.approvalStatus)}`}>
                        {bill.approvalStatus.replace(/_/g, ' ')}
                      </span>
                      {bill.purchaseOrderId && (
                        <div className="text-xs text-gray-500 mt-1">PO linked</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(bill.status)}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {bill.approvalStatus === 'NOT_SUBMITTED' && bill.status === 'DRAFT' && (
                          <button
                            onClick={() => handleWorkflowAction(bill.id, 'SUBMIT')}
                            className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-200"
                          >
                            Submit
                          </button>
                        )}
                        {bill.approvalStatus === 'PENDING' && canApprove && (
                          <button
                            onClick={() => handleWorkflowAction(bill.id, 'APPROVE')}
                            className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-200"
                          >
                            Approve
                          </button>
                        )}
                        {bill.status === 'OPEN' && !bill.purchaseOrderId && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowMatchForm(true);
                            }}
                            className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-200"
                          >
                            Match PO
                          </button>
                        )}
                        {bill.status === 'DRAFT' && canApprove && (
                          <button
                            onClick={() => handleWorkflowAction(bill.id, 'CANCEL')}
                            className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        )}
                        {bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setPaymentData({
                                ...paymentData,
                                amount: bill.balanceAmount.toString(),
                              });
                              setShowPaymentForm(true);
                            }}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-xs"
                          >
                            <DollarSign size={16} />
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
