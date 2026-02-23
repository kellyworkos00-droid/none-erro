'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Package } from 'lucide-react';

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
  unit: string;
}

interface StockLevel {
  id: string;
  quantity: number;
  product: Product;
  location: Location;
}

export default function StockAdjustmentsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    locationId: '',
    productId: '',
    quantity: '0',
    reason: '',
    reference: '',
  });

  const fetchLevels = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (form.locationId) params.set('locationId', form.locationId);
      const response = await fetch(`/api/stock/levels?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load stock levels');
      const data = await response.json();
      setLevels(data.data.items || []);
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  }, [form.locationId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [locationsRes, productsRes] = await Promise.all([
        fetch('/api/warehouse-locations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.data.items || []);
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data.items || []);
      }

      await fetchLevels();
    } catch (error) {
      console.error('Error loading adjustment data:', error);
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [fetchLevels]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === form.locationId),
    [form.locationId, locations]
  );

  const handleSubmit = async () => {
    if (!form.locationId || !form.productId || !form.quantity) {
      toast.error('Location, product, and quantity are required');
      return;
    }

    const quantityValue = Number(form.quantity);
    if (Number.isNaN(quantityValue) || quantityValue === 0) {
      toast.error('Quantity must be a non-zero number');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/stock/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationId: form.locationId,
          productId: form.productId,
          quantity: quantityValue,
          reason: form.reason || undefined,
          reference: form.reference || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to adjust stock');
      }

      toast.success('Stock adjusted');
      setForm({ locationId: form.locationId, productId: '', quantity: '0', reason: '', reference: '' });
      fetchLevels();
    } catch (error) {
      console.error('Adjustment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Stock Adjustments</h1>
          <p className="text-sm text-gray-600">Increase or decrease stock quantities by location</p>
        </div>
        <Link href="/dashboard/products" className="btn-secondary flex items-center gap-2">
          <Package size={16} />
          Manage Products
        </Link>
      </div>

      {products.length === 0 && (
        <div className="card">
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              You need to create products before you can adjust stock levels.
            </p>
            <Link href="/dashboard/products" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Add Your First Product
            </Link>
          </div>
        </div>
      )}

      {locations.length === 0 && products.length > 0 && (
        <div className="card">
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Warehouse Locations</h3>
            <p className="text-sm text-gray-600 mb-4">
              You need to create warehouse locations before adjusting stock.
            </p>
            <Link href="/dashboard/warehouses" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Create Warehouse Location
            </Link>
          </div>
        </div>
      )}

      {products.length > 0 && locations.length > 0 && (
        <>
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">New Adjustment</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <select
              value={form.locationId}
              onChange={(e) => setForm((prev) => ({ ...prev, locationId: e.target.value }))}
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
            <label className="block text-sm font-medium text-gray-700">Product</label>
            <select
              value={form.productId}
              onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
              className="input"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                <Link href="/dashboard/products" className="text-primary-600 hover:text-primary-700">
                  Add products first
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              className="input"
              placeholder="Use negative for reductions"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <input
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              className="input"
              placeholder="Damage, recount, etc"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference</label>
            <input
              value={form.reference}
              onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
              className="input"
              placeholder="PO-123 or note"
            />
          </div>
        </div>
        <div className="flex justify-end p-4 border-t">
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Adjust Stock'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Stock at {selectedLocation ? `${selectedLocation.warehouse?.code} - ${selectedLocation.code}` : 'All Locations'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {levels.map((level) => (
                <tr key={level.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {level.product.sku} - {level.product.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {level.location.warehouse?.code} - {level.location.code}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {level.quantity} {level.product.unit}
                  </td>
                </tr>
              ))}
              {levels.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No stock levels found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
