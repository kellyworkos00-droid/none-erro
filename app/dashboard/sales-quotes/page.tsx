'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X, FileText, Send, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  customerCode: string;
  email?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  unit?: string;
}

interface SalesQuoteItemForm {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface SalesQuoteItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  product: Product;
}

interface SalesQuote {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  discount: number;
  validUntil?: string;
  notes?: string;
  customer: Customer;
  items: SalesQuoteItem[];
  createdAt: string;
  updatedAt: string;
}

interface Summary {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
  totalValue: number;
}

export default function SalesQuotesPage() {
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [tax, setTax] = useState(16);
  const [discount, setDiscount] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SalesQuoteItemForm[]>([
    { productId: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (customerFilter) params.append('customerId', customerFilter);

      const [quotesRes, customersRes, productsRes] = await Promise.all([
        fetch(`/api/sales-quotes?${params.toString()}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/customers?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/products?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData.data.items || []);
      } else {
        throw new Error('Failed to load quotes');
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData.data?.customers || []);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.data?.items || []);
      }
    } catch (error) {
      console.error('Error loading sales quotes:', error);
      setError('Failed to load sales quotes');
      toast.error('Failed to load sales quotes');
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

  // Calculate summary
  const summary: Summary = useMemo(() => {
    return {
      total: quotes.length,
      draft: quotes.filter((q) => q.status === 'DRAFT').length,
      sent: quotes.filter((q) => q.status === 'SENT').length,
      accepted: quotes.filter((q) => q.status === 'ACCEPTED').length,
      declined: quotes.filter((q) => q.status === 'DECLINED').length,
      expired: quotes.filter((q) => q.status === 'EXPIRED').length,
      totalValue: quotes.reduce((sum, q) => sum + q.totalAmount, 0),
    };
  }, [quotes]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemDiscount = (item.discount || 0) / 100 * itemTotal;
      return sum + itemTotal - itemDiscount;
    }, 0);
    const globalDiscount = (discount / 100) * subtotal;
    const afterDiscount = subtotal - globalDiscount;
    const taxAmount = (tax / 100) * afterDiscount;
    return {
      subtotal,
      discount: globalDiscount,
      afterDiscount,
      taxAmount,
      total: afterDiscount + taxAmount,
    };
  }, [items, tax, discount]);

  const updateItem = (index: number, updates: Partial<SalesQuoteItemForm>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleCreate = async () => {
    if (!customerId) {
      toast.error('Select a customer');
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
      const response = await fetch('/api/sales-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          items: preparedItems,
          tax,
          discount,
          validUntil: validUntil || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create quote');
      }

      setShowCreate(false);
      setCustomerId('');
      setTax(16);
      setDiscount(0);
      setValidUntil('');
      setNotes('');
      setItems([{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
      toast.success('Sales quote created successfully');
      fetchData();
    } catch (error) {
      console.error('Create sales quote error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create quote');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (quoteId: string, action: 'SEND' | 'ACCEPT' | 'DECLINE') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sales-quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to update quote');
      }

      toast.success(`Quote ${action.toLowerCase()}ed successfully`);
      fetchData();
    } catch (error) {
      console.error('Sales quote action error:', error);
      toast.error(error instanceof Error ? error.message : 'Quote update failed');
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statusStyles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    DECLINED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-yellow-100 text-yellow-800',
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Sales Quotes</h1>
          <p className="text-sm text-gray-600">Create and manage customer quotations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quotes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-3xl font-bold text-gray-600 mt-2">{summary.draft}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{summary.sent}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accepted</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{summary.accepted}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-primary-600 mt-2">
                {formatCurrency(summary.totalValue)}
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
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              onClick={handleFilter}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
      {/* Quotes Table */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-white/70 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Quotes</h2>
        {quotes.length === 0 ? (
          <p className="text-gray-600 text-center py-12">No sales quotes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-4">Quote #</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Valid Until</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">Total Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{quote.quoteNumber}</td>
                    <td className="py-3 pr-4 text-gray-700">
                      {quote.customer?.name}
                      {quote.customer?.email && (
                        <div className="text-xs text-gray-500">{quote.customer.email}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {quote.items?.length || 0} items
                    </td>
                    <td className="py-3 pr-4 text-gray-900 font-medium">
                      {formatCurrency(quote.totalAmount)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[quote.status]}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {quote.status === 'DRAFT' && (
                          <button
                            onClick={() => handleAction(quote.id, 'SEND')}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Send
                          </button>
                        )}
                        {quote.status === 'SENT' && (
                          <>
                            <button
                              onClick={() => handleAction(quote.id, 'ACCEPT')}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleAction(quote.id, 'DECLINE')}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {['ACCEPTED', 'DECLINED', 'EXPIRED'].includes(quote.status) && (
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

      {/* Create Quote Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Sales Quote</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Customer and Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Quote Items</label>
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
                          <label className="block text-xs text-gray-600 mb-1">Product *</label>
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const product = products.find((p) => p.id === e.target.value);
                              updateItem(index, {
                                productId: e.target.value,
                                unitPrice: product?.price || 0,
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
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
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
                            onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Discount (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount || 0}
                            onChange={(e) => updateItem(index, { discount: Number(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="w-full px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax and Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">Subtotal</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(totals.subtotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Discount</p>
                  <p className="text-sm font-semibold text-red-600">-{formatCurrency(totals.discount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">After Discount</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(totals.afterDiscount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Tax ({tax}%)</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(totals.taxAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-bold text-primary-600">{formatCurrency(totals.total)}</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Additional notes for the customer..."
                />
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
                {creating ? 'Creating...' : 'Create Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
