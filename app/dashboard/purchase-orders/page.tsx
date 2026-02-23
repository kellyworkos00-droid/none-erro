'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  cost?: number | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  expectedDate?: string | null;
  supplier?: Supplier | null;
  items: { id: string }[];
}

interface OrderItemForm {
  productId: string;
  quantity: number;
  unitCost: number;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>([
    { productId: '', quantity: 1, unitCost: 0 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        fetch('/api/purchase-orders?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/suppliers?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/products?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.data.items);
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.data.suppliers);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.data.items);
      }
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast.error('Failed to load purchase orders');
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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'badge-gray',
      APPROVED: 'badge-info',
      SENT: 'badge-warning',
      RECEIVED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return styles[status] || 'badge-gray';
  };

  const summary = useMemo(() => {
    const counts = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        acc.totalValue += order.totalAmount;
        return acc;
      },
      { totalValue: 0 } as Record<string, number>
    );

    return {
      draft: counts.DRAFT || 0,
      approved: counts.APPROVED || 0,
      sent: counts.SENT || 0,
      received: counts.RECEIVED || 0,
      totalValue: counts.totalValue || 0,
    };
  }, [orders]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitCost * item.quantity,
      0
    );
    const taxAmount = (subtotal * tax) / 100;
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [items, tax]);

  const updateItem = (index: number, updates: Partial<OrderItemForm>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreate = async () => {
    if (!supplierId) {
      toast.error('Select a supplier');
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
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId,
          items: preparedItems,
          tax,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create purchase order');
      }

      setOrders((prev) => [data.data, ...prev]);
      setSupplierId('');
      setExpectedDate('');
      setTax(0);
      setNotes('');
      setItems([{ productId: '', quantity: 1, unitCost: 0 }]);
      setShowCreate(false);
      toast.success('Purchase order created');
    } catch (error) {
      console.error('Create purchase order error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create purchase order');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (orderId: string, action: 'APPROVE' | 'SEND' | 'RECEIVE') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to receive purchase order');
      }

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? data.data : order))
      );
      const actionLabels = {
        APPROVE: 'approved',
        SEND: 'sent',
        RECEIVE: 'received',
      } as const;
      toast.success(`Purchase order ${actionLabels[action]}`);
    } catch (error) {
      console.error('Receive purchase order error:', error);
      toast.error(error instanceof Error ? error.message : 'Purchase order update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
              <p className="text-sm text-gray-600">Track supplier orders and stock receipts.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Purchase Order
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Draft</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.draft}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Approved</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.approved}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sent</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.sent}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Received</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{summary.received}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Value</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(summary.totalValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Expected</th>
                <th>Status</th>
                <th>Actions</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="text-sm font-medium">{order.orderNumber}</td>
                    <td className="text-sm">{order.supplier?.name || '-'}</td>
                    <td className="text-sm">{order.items?.length || 0}</td>
                    <td className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</td>
                    <td className="text-sm">
                      {order.expectedDate
                        ? new Date(order.expectedDate).toLocaleDateString('en-KE')
                        : '-'}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === 'DRAFT' && (
                        <button
                          onClick={() => handleAction(order.id, 'APPROVE')}
                          className="text-xs font-semibold text-primary-700 bg-primary-50/70 px-3 py-1 rounded-full hover:bg-primary-100"
                        >
                          Approve
                        </button>
                      )}
                      {order.status === 'APPROVED' && (
                        <button
                          onClick={() => handleAction(order.id, 'SEND')}
                          className="text-xs font-semibold text-primary-700 bg-primary-50/70 px-3 py-1 rounded-full hover:bg-primary-100"
                        >
                          Send
                        </button>
                      )}
                      {order.status === 'SENT' && (
                        <button
                          onClick={() => handleAction(order.id, 'RECEIVE')}
                          className="text-xs font-semibold text-primary-700 bg-primary-50/70 px-3 py-1 rounded-full hover:bg-primary-100"
                        >
                          Receive
                        </button>
                      )}
                      {(order.status === 'RECEIVED' || order.status === 'CANCELLED') && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Purchase Order</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
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
                  <label className="label">Expected Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Items</h4>
                  <button onClick={addItem} className="text-xs text-primary-700 hover:text-primary-600">
                    + Add Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="label">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const product = products.find((p) => p.id === e.target.value);
                          updateItem(index, {
                            productId: e.target.value,
                            unitCost: product?.cost ?? item.unitCost,
                          });
                        }}
                        className="input"
                      >
                        <option value="">Select product...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Unit Cost</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateItem(index, { unitCost: parseFloat(e.target.value) || 0 })}
                        className="input"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-700">
                        {formatCurrency(item.unitCost * item.quantity)}
                      </div>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input"
                    placeholder="Delivery instructions"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
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
                {creating ? 'Saving...' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
