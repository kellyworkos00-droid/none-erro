'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

interface ReturnItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  condition: string;
  restockable: boolean;
  notes: string | null;
  product: Product;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ProductReturn {
  id: string;
  returnNumber: string;
  returnType: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string;
  status: string;
  totalAmount: number;
  refundAmount: number;
  restockFee: number;
  returnDate: string;
  approvedDate: string | null;
  completedDate: string | null;
  notes: string | null;
  createdAt: string;
  items: ReturnItem[];
  createdByUser: User;
}

interface ReturnSummary {
  total: number;
  pending: number;
  approved: number;
  processing: number;
  completed: number;
  rejected: number;
  totalRefundAmount: number;
  totalRestockFee: number;
}

interface ReturnFormItem {
  productId: string;
  locationId: string;
  quantity: number;
  unitPrice: number;
  condition: string;
  restockable: boolean;
  notes: string;
}

export default function ProductReturnsPage() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form states
  const [returnType, setReturnType] = useState<string>('CUSTOMER_RETURN');
  const [reason, setReason] = useState('');
  const [restockFee, setRestockFee] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReturnFormItem[]>([{
    productId: '',
    locationId: '',
    quantity: 1,
    unitPrice: 0,
    condition: 'GOOD',
    restockable: true,
    notes: '',
  }]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('returnType', typeFilter);

      const [returnsRes, productsRes] = await Promise.all([
        fetch(`/api/stock/returns?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/products', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!returnsRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const returnsData = await returnsRes.json();
      const productsData = await productsRes.json();

      setReturns(returnsData.data.returns || []);
      setSummary(returnsData.data.summary);
      setProducts(productsData.data || []);
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Failed to load product returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = () => {
    fetchData();
  };

  const addItem = () => {
    setItems((prev) => [...prev, {
      productId: '',
      locationId: '',
      quantity: 1,
      unitPrice: 0,
      condition: 'GOOD',
      restockable: true,
      notes: '',
    }]);
  };

  const updateItem = (index: number, updates: Partial<ReturnFormItem>) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreate = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }

    const preparedItems = items.filter((item) => item.productId && item.quantity > 0);
    if (preparedItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/stock/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnType,
          reason,
          restockFee: Number(restockFee) || 0,
          notes: notes || undefined,
          items: preparedItems,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create return');
      }

      setReturns((prev) => [data.data, ...prev]);
      setShowCreate(false);
      setReturnType('CUSTOMER_RETURN');
      setReason('');
      setRestockFee('0');
      setNotes('');
      setItems([{
        productId: '',
        locationId: '',
        quantity: 1,
        unitPrice: 0,
        condition: 'GOOD',
        restockable: true,
        notes: '',
      }]);
      toast.success('Return created successfully');
      fetchData();
    } catch (error) {
      console.error('Create return error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create return');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (returnId: string, action: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stock/returns/${returnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `Failed to ${action.toLowerCase()} return`);
      }

      toast.success(`Return ${action.toLowerCase()}d successfully`);
      fetchData();
    } catch (error) {
      console.error('Return action error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update return');
    }
  };

  const statusStyles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  const returnTypeLabels: Record<string, string> = {
    CUSTOMER_RETURN: 'Customer Return',
    SUPPLIER_RETURN: 'Supplier Return',
    DAMAGED: 'Damaged',
    WARRANTY: 'Warranty',
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Product Returns</h1>
          <p className="text-sm text-gray-600">Manage customer and supplier returns</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Return
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Returns</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{summary?.pending || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{summary?.completed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Refunds</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                KES {(summary?.totalRefundAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="CUSTOMER_RETURN">Customer Return</option>
              <option value="SUPPLIER_RETURN">Supplier Return</option>
              <option value="DAMAGED">Damaged</option>
              <option value="WARRANTY">Warranty</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Returns List</h2>
        {returns.length === 0 ? (
          <p className="text-gray-600 text-center py-12">No product returns found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-4">Return #</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Refund</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((productReturn) => (
                  <tr key={productReturn.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{productReturn.returnNumber}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {returnTypeLabels[productReturn.returnType]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 max-w-xs truncate">{productReturn.reason}</td>
                    <td className="py-3 pr-4 text-gray-700">{productReturn.items.length}</td>
                    <td className="py-3 pr-4 text-gray-900 font-medium">
                      KES {productReturn.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-green-700 font-medium">
                      KES {productReturn.refundAmount.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[productReturn.status]}`}>
                        {productReturn.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {new Date(productReturn.returnDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {productReturn.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleAction(productReturn.id, 'APPROVE')}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(productReturn.id, 'REJECT')}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {productReturn.status === 'APPROVED' && (
                          <button
                            onClick={() => handleAction(productReturn.id, 'PROCESS')}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                          >
                            Process
                          </button>
                        )}
                        {productReturn.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleAction(productReturn.id, 'COMPLETE')}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Complete
                          </button>
                        )}
                        {['COMPLETED', 'REJECTED'].includes(productReturn.status) && (
                          <span className="text-xs text-gray-500">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Return Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Product Return</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Type</label>
                  <select
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="CUSTOMER_RETURN">Customer Return</option>
                    <option value="SUPPLIER_RETURN">Supplier Return</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="WARRANTY">Warranty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restock Fee (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={restockFee}
                    onChange={(e) => setRestockFee(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Reason for return..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <button
                    onClick={addItem}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                  >
                    Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const product = products.find(p => p.id === e.target.value);
                              updateItem(index, {
                                productId: e.target.value,
                                unitPrice: product ? (product as any).price || 0 : 0,
                              });
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.sku} - {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Condition</label>
                          <select
                            value={item.condition}
                            onChange={(e) => updateItem(index, { condition: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="DEFECTIVE">Defective</option>
                            <option value="EXPIRED">Expired</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => removeItem(index)}
                            className="w-full px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
