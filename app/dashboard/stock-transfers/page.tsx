'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
  warehouse?: Warehouse;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
  product?: Product;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  fromLocation?: Location;
  toLocation?: Location;
  items: TransferItem[];
}

interface TransferItemForm {
  productId: string;
  quantity: number;
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferItemForm[]>([{
    productId: '',
    quantity: 1,
  }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [transfersRes, locationsRes, productsRes] = await Promise.all([
        fetch('/api/stock/transfers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/warehouse-locations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        setTransfers(data.data.items || []);
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.data.items || []);
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data.items || []);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'badge-gray',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return styles[status] || 'badge-gray';
  };

  const summary = useMemo(() => {
    const draft = transfers.filter((transfer) => transfer.status === 'DRAFT').length;
    const completed = transfers.filter((transfer) => transfer.status === 'COMPLETED').length;
    return {
      total: transfers.length,
      draft,
      completed,
    };
  }, [transfers]);

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const updateItem = (index: number, updates: Partial<TransferItemForm>) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreate = async () => {
    if (!fromLocationId || !toLocationId) {
      toast.error('Select both locations');
      return;
    }

    if (fromLocationId === toLocationId) {
      toast.error('Locations must be different');
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
      const response = await fetch('/api/stock/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromLocationId,
          toLocationId,
          notes: notes || undefined,
          items: preparedItems,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create transfer');
      }

      setTransfers((prev) => [data.data, ...prev]);
      setShowCreate(false);
      setFromLocationId('');
      setToLocationId('');
      setNotes('');
      setItems([{ productId: '', quantity: 1 }]);
      toast.success('Transfer created');
    } catch (error) {
      console.error('Create transfer error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transfer');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (transferId: string, action: 'COMPLETE' | 'CANCEL') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stock/transfers/${transferId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to update transfer');
      }

      setTransfers((prev) => prev.map((transfer) => (transfer.id === transferId ? data.data : transfer)));
      toast.success(action === 'COMPLETE' ? 'Transfer completed' : 'Transfer cancelled');
    } catch (error) {
      console.error('Transfer action error:', error);
      toast.error(error instanceof Error ? error.message : 'Transfer update failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Stock Transfers</h1>
          <p className="text-sm text-gray-600">Move inventory between locations</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Transfers</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Draft</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.draft}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.completed}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Transfer List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{transfer.transferNumber}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {transfer.fromLocation?.warehouse?.code} - {transfer.fromLocation?.code}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {transfer.toLocation?.warehouse?.code} - {transfer.toLocation?.code}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{transfer.items?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(transfer.status)}>{transfer.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {transfer.status === 'DRAFT' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => handleAction(transfer.id, 'COMPLETE')}
                        >
                          Complete
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleAction(transfer.id, 'CANCEL')}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No transfers available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">New Transfer</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Location</label>
                  <select
                    value={fromLocationId}
                    onChange={(e) => setFromLocationId(e.target.value)}
                    className="input"
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.warehouse?.code} - {location.code} ({location.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Location</label>
                  <select
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value)}
                    className="input"
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.warehouse?.code} - {location.code} ({location.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Optional note"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Items</h4>
                  <button className="btn-secondary" onClick={addItem}>
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-7">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, { productId: e.target.value })}
                        className="input"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} - {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        className="input"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center">
                      <button className="btn-danger" onClick={() => removeItem(index)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
