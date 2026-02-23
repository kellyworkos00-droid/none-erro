'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  unit: string;
}

interface StockLevel {
  id: string;
  quantity: number;
  product: Product;
  location: Location;
}

export default function StockLevelsPage() {
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');

  const fetchLevels = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (warehouseId) params.set('warehouseId', warehouseId);
      if (productId) params.set('productId', productId);
      const response = await fetch(`/api/stock/levels?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch stock levels');
      const data = await response.json();
      setLevels(data.data.items || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast.error('Failed to fetch stock levels');
    }
  }, [warehouseId, productId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [warehousesRes, productsRes] = await Promise.all([
        fetch('/api/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.data.items || []);
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.data.items || []);
      }

      await fetchLevels();
    } catch (error) {
      console.error('Error loading stock levels:', error);
      toast.error('Failed to load stock levels');
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

  const summary = useMemo(() => {
    const totalUnits = levels.reduce((sum, level) => sum + level.quantity, 0);
    const uniqueProducts = new Set(levels.map((level) => level.product.id)).size;
    return {
      totalUnits,
      uniqueProducts,
      locations: new Set(levels.map((level) => level.location.id)).size,
    };
  }, [levels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Stock Levels</h1>
        <p className="text-sm text-gray-600">View on-hand quantities by location</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Units</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.totalUnits}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.uniqueProducts}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Locations</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.locations}</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Current Stock</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="input"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="input"
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
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
                    {level.location.warehouse?.code} - {level.location.warehouse?.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {level.location.code} - {level.location.name}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {level.quantity} {level.product.unit}
                  </td>
                </tr>
              ))}
              {levels.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No stock levels to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
