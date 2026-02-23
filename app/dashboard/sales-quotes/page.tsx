'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  customerCode: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface SalesQuoteItemForm {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface SalesQuote {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: number;
  customer: Customer;
  createdAt: string;
}

export default function SalesQuotesPage() {
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [tax, setTax] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SalesQuoteItemForm[]>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [quotesRes, customersRes, productsRes] = await Promise.all([
        fetch('/api/sales-quotes?limit=50', {
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
        setQuotes(quotesData.data.items);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData.data.customers);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.data.items);
      }
    } catch (error) {
      console.error('Error loading sales quotes:', error);
      toast.error('Failed to load sales quotes');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = (subtotal * tax) / 100;
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [items, tax]);

  const updateItem = (index: number, updates: Partial<SalesQuoteItemForm>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
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
          validUntil: validUntil || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to create quote');
      }

      setQuotes((prev) => [data.data, ...prev]);
      setCustomerId('');
      setTax(0);
      setValidUntil('');
      setNotes('');
      setItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
      setShowCreate(false);
      toast.success('Sales quote created');
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

      setQuotes((prev) => prev.map((quote) => (quote.id === quoteId ? data.data : quote)));
      toast.success(`Quote ${action.toLowerCase()}`);
    } catch (error) {
      console.error('Sales quote action error:', error);
      toast.error(error instanceof Error ? error.message : 'Quote update failed');
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
      SENT: 'badge-info',
      ACCEPTED: 'badge-success',
      DECLINED: 'badge-danger',
      EXPIRED: 'badge-warning',
    };
    return styles[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sales Quotes</h2>
              <p className="text-sm text-gray-600">Draft and send quotes to customers.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create Sales Quote</h3>
            <button onClick={() => setShowCreate(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="input"
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
                <label className="label">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Tax (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="input"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Quote Items</h4>
                <button onClick={addItem} className="btn-secondary">
                  Add Item
                </button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      updateItem(index, {
                        productId: e.target.value,
                        unitPrice: product?.price || 0,
                      });
                    }}
                    className="input"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                    className="input"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                    className="input"
                    placeholder="Unit price"
                  />
                  <button
                    onClick={() => removeItem(index)}
                    className="btn-danger"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="card">
                <div className="card-body">
                  <p className="text-gray-500">Subtotal</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.subtotal)}</p>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="text-gray-500">Tax</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.taxAmount)}</p>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="text-gray-500">Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.total)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[80px]"
              />
            </div>

            <div className="flex justify-end">
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Recent Quotes</h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-gray-500">No quotes created yet.</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div key={quote.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-sm font-semibold">{quote.quoteNumber}</p>
                    <p className="text-xs text-gray-500">{quote.customer?.name}</p>
                  </div>
                  <div>
                    <span className={`badge ${statusBadge(quote.status)}`}>{quote.status}</span>
                  </div>
                  <div className="text-sm font-semibold">{formatCurrency(quote.totalAmount)}</div>
                  <div className="flex gap-2 text-xs">
                    {quote.status === 'DRAFT' && (
                      <button
                        onClick={() => handleAction(quote.id, 'SEND')}
                        className="btn-secondary"
                      >
                        Send
                      </button>
                    )}
                    {quote.status === 'SENT' && (
                      <>
                        <button
                          onClick={() => handleAction(quote.id, 'ACCEPT')}
                          className="btn-success"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(quote.id, 'DECLINE')}
                          className="btn-danger"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
