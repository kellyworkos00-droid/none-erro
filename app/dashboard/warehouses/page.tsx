'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  isActive: boolean;
  locations?: Location[];
}

interface Location {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  warehouse?: Warehouse;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', address: '' });
  const [locationForm, setLocationForm] = useState({
    warehouseId: '',
    code: '',
    name: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [warehousesRes, locationsRes] = await Promise.all([
        fetch('/api/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/warehouse-locations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.data.items || []);
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.data.items || []);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const active = warehouses.filter((warehouse) => warehouse.isActive).length;
    return {
      total: warehouses.length,
      active,
      locations: locations.length,
    };
  }, [warehouses, locations.length]);

  const handleCreate = async () => {
    if (!form.code || !form.name) {
      toast.error('Warehouse code and name are required');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create warehouse');
      }

      setWarehouses((prev) => [data.data, ...prev]);
      setForm({ code: '', name: '', address: '' });
      setShowCreate(false);
      toast.success('Warehouse created');
      fetchData();
    } catch (error) {
      console.error('Create warehouse error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create warehouse');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!locationForm.warehouseId || !locationForm.code || !locationForm.name) {
      toast.error('Warehouse, code, and name are required');
      return;
    }

    try {
      setCreatingLocation(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warehouse-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(locationForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create location');
      }

      setLocations((prev) => [data.data, ...prev]);
      setLocationForm({ warehouseId: '', code: '', name: '' });
      setShowLocation(false);
      toast.success('Location created');
    } catch (error) {
      console.error('Create location error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create location');
    } finally {
      setCreatingLocation(false);
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
          <h1 className="text-2xl font-display font-bold text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-600">Manage storage sites and locations</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowLocation(true)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Warehouse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Warehouses</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.active}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Locations</p>
          <p className="text-2xl font-semibold text-gray-900">{summary.locations}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Warehouse List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locations</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{warehouse.code}</td>
                  <td className="px-4 py-3 text-gray-700">{warehouse.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {warehouse.locations?.length ?? locations.filter((loc) => loc.warehouseId === warehouse.id).length}
                  </td>
                  <td className="px-4 py-3">
                    <span className={warehouse.isActive ? 'badge-success' : 'badge-gray'}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{warehouse.address || '—'}</td>
                </tr>
              ))}
              {warehouses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No warehouses available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">New Warehouse</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="input"
                  placeholder="WH-NAI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Nairobi Main"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Street, City"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Warehouse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Location</h3>
              <button onClick={() => setShowLocation(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                <select
                  value={locationForm.warehouseId}
                  onChange={(e) =>
                    setLocationForm((prev) => ({ ...prev, warehouseId: e.target.value }))
                  }
                  className="input"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input
                  value={locationForm.code}
                  onChange={(e) => setLocationForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="input"
                  placeholder="A1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={locationForm.name}
                  onChange={(e) => setLocationForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Aisle 1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button className="btn-secondary" onClick={() => setShowLocation(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateLocation}
                disabled={creatingLocation}
              >
                {creatingLocation ? 'Creating...' : 'Create Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
