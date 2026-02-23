'use client';

import { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Edit, 
  Trash2,
  Users,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Eye,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  customerCode: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  creditLimit?: number | null;
  currentBalance: number;
  totalPaid: number;
  invoices?: Array<{ id: string }>;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'paid'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'hasBalance' | 'noPaid'>('all');
  const [formData, setFormData] = useState({
    customerCode: '',
    name: '',
    email: '',
    phone: '',
    billingAddress: '',
    creditLimit: '',
  });

  const stats = {
    total: customers.length,
    withBalance: customers.filter(c => c.currentBalance > 0).length,
    totalBalance: customers.reduce((sum, c) => sum + c.currentBalance, 0),
    totalPaid: customers.reduce((sum, c) => sum + c.totalPaid, 0),
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/customers?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch customers');

      const data = await response.json();
      setCustomers(data.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerCode || !formData.name) {
      toast.error('Please fill in required fields (Customer Code, Name)');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const payload = {
        customerCode: formData.customerCode,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        billingAddress: formData.billingAddress || undefined,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      };

      const response = await fetch(
        editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers',
        {
          method: editingCustomer ? 'PATCH' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create customer');
      }

      toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerCode: '',
      name: '',
      email: '',
      phone: '',
      billingAddress: '',
      creditLimit: '',
    });
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerCode: customer.customerCode,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      billingAddress: customer.billingAddress || '',
      creditLimit: customer.creditLimit?.toString() || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete customer');
      }

      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    }
  };



  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch = customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.customerCode.toLowerCase().includes(search.toLowerCase()) ||
        customer.email?.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterBy === 'hasBalance') return customer.currentBalance > 0;
      if (filterBy === 'noPaid') return customer.totalPaid === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'balance') return b.currentBalance - a.currentBalance;
      if (sortBy === 'paid') return b.totalPaid - a.totalPaid;
      return 0;
    });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer relationships and accounts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchCustomers()}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-blue-100 text-sm mt-1">Total Customers</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.withBalance}</div>
          <div className="text-green-100 text-sm mt-1">With Outstanding</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold">
            {(stats.totalBalance / 1000000).toFixed(1)}M
          </div>
          <div className="text-orange-100 text-sm mt-1">Total Outstanding</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold">
            {(stats.totalPaid / 1000000).toFixed(1)}M
          </div>
          <div className="text-purple-100 text-sm mt-1">Total Collected</div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingCustomer ? 'Update customer information' : 'Create a new customer record'}
                </p>
              </div>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Customer Code *
                  </label>
                  <input
                    type="text"
                    value={formData.customerCode}
                    onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                    className="input"
                    placeholder="e.g., CUST001"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Customer name"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    Credit Limit (KES)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Billing Address
                </label>
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Enter full billing address"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? (editingCustomer ? 'Updating...' : 'Creating...')
                    : (editingCustomer ? 'Update Customer' : 'Create Customer')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'balance' | 'paid')}
              className="input w-full"
            >
              <option value="name">Name (A-Z)</option>
              <option value="balance">Outstanding Balance</option>
              <option value="paid">Total Paid</option>
            </select>
          </div>

          <div>
            <label className="label">Filter</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'hasBalance' | 'noPaid')}
              className="input w-full"
            >
              <option value="all">All Customers</option>
              <option value="hasBalance">With Outstanding</option>
              <option value="noPaid">Never Paid</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setSearch('');
              setSortBy('name');
              setFilterBy('all');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Clear Filters
          </button>
          <button
            onClick={() => toast.success('Export feature coming soon!')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export ({filteredCustomers.length})
          </button>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customer Directory</h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredCustomers.length} of {stats.total} customers
            </p>
          </div>
          {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500 mb-6">
              {search ? 'Try adjusting your search or filters' : 'Get started by adding your first customer'}
            </p>
            {!search && (
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Your First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Paid
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Credit Limit
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer, index) => (
                  <tr 
                    key={customer.id} 
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      hover:bg-blue-50/30 transition-colors
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(customer.name)} flex items-center justify-center text-white font-semibold text-sm`}>
                          {getInitials(customer.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {customer.customerCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                              {customer.email}
                            </a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                              {customer.phone}
                            </a>
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <div className="text-sm text-gray-400 italic">No contact info</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {customer.currentBalance > 0 ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-orange-600">
                              KES {customer.currentBalance.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500">KES 0</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-gray-900">
                        KES {customer.totalPaid.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-gray-600">
                        KES {(customer.creditLimit || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toast.success('View details coming soon!')}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
