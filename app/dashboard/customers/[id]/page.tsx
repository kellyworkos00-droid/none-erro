'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
  isActive: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  totalPaid?: number;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoices, setCurrentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch customer');

      const data = await response.json();
      setCustomer(data.data.customer);
      setInvoices(data.data.invoices || []);
      setCurrentInvoices(data.data.currentInvoices || []);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const handleDeleteCustomer = async () => {
    if (confirmName !== customer?.name) {
      toast.error('Customer name does not match');
      return;
    }

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete customer');
      }

      toast.success('Customer deleted successfully');
      router.push('/dashboard/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = userRole === 'ADMIN' || userRole === 'OWNER';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'SENT':
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/customers"
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Customers
        </Link>
      </div>

      {/* Customer Details Card */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600 mt-2">Customer Code: {customer.customerCode}</p>

            <div className="space-y-4 mt-8">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Email</p>
                <p className="text-gray-900 mt-1">{customer.email || 'Not provided'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Phone</p>
                <p className="text-gray-900 mt-1">{customer.phone || 'Not provided'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Billing Address</p>
                <p className="text-gray-900 mt-1">{customer.billingAddress || 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4">Financial Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Credit Limit</span>
                  <span className="font-bold text-gray-900">
                    {customer.creditLimit ? formatCurrency(customer.creditLimit) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Current Balance</span>
                  <span className={`font-bold ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-blue-200">
                  <span className="text-gray-700">Total Paid</span>
                  <span className="font-bold text-green-600">{formatCurrency(customer.totalPaid)}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Status</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                customer.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Invoices */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">Current Invoices (Unpaid)</h2>
        </div>

        {currentInvoices.length === 0 ? (
          <p className="text-gray-600 py-6">No current unpaid invoices</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Issue Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{formatCurrency(invoice.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(invoice.issueDate)}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(invoice.dueDate)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Invoices History */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-600 py-6">No invoices for this customer</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Paid</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Issue Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{formatCurrency(invoice.amount)}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {formatCurrency(invoice.totalPaid || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(invoice.issueDate)}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(invoice.dueDate)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Customer Section */}
      {canDelete && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Delete Customer</h2>
          </div>

          <p className="text-red-800 text-sm mb-6">
            This action cannot be undone. Deleting a customer will remove all associated data. 
            Customer must have no active invoices.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
          >
            Delete Customer
          </button>
        </div>
      )}

      {!canDelete && (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm">
            Only Admins and Owners can delete customers. Please contact an administrator.
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && canDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
            </div>

            <p className="text-gray-700 mb-6">
              To delete <strong>{customer.name}</strong>, please type their name exactly below to confirm:
            </p>

            <input
              type="text"
              placeholder={`Type "${customer.name}" to confirm`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteCustomer}
                disabled={confirmName !== customer.name || deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
