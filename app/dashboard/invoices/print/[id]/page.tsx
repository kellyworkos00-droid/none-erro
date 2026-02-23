'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Product {
  name: string;
  sku: string;
}

interface PosOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: Product;
}

interface PosOrder {
  id: string;
  orderNumber: string;
  orderItems: PosOrderItem[];
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
}

interface Customer {
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  customerCode: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  description: string | null;
  notes: string | null;
  customer: Customer;
  payments: Payment[];
  posOrders: PosOrder[];
}

export default function InvoicePrintPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/invoices/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch invoice');

        const data = await response.json();
        setInvoice(data.data.invoice);
      } catch (error) {
        console.error('Error fetching invoice:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

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
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">Invoice not found</p>
        </div>
      </div>
    );
  }

  // Collect all line items from POS orders
  const lineItems = invoice.posOrders.flatMap(order =>
    order.orderItems.map(item => ({
      description: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.totalPrice,
    }))
  );

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={handlePrint}
          className="btn-primary flex items-center gap-2 shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
              clipRule="evenodd"
            />
          </svg>
          Print Invoice
        </button>
      </div>

      {/* Invoice Document */}
      <div className="min-h-screen bg-gray-50 print:bg-white py-8 print:py-0">
        <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-12 print:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 border-b-2 border-gray-300 pb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-gray-600 text-lg">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-3 mb-2">
                <div className="relative w-14 h-14">
                  <Image
                    src="/images/elegant-logo.jpg"
                    alt="Elegant Steel Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">Elegant Steel</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">East Africa</p>
                </div>
              </div>
              <p className="text-gray-600">P.O. Box 12345, Nairobi</p>
              <p className="text-gray-600">Phone: +254 700 000 000</p>
              <p className="text-gray-600">Email: info@company.com</p>
            </div>
          </div>

          {/* Customer & Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bill To</h3>
              <div className="text-gray-900">
                <p className="font-semibold text-lg mb-1">{invoice.customer.name}</p>
                <p className="text-gray-600 text-sm mb-1">{invoice.customer.customerCode}</p>
                {invoice.customer.billingAddress && (
                  <p className="text-gray-600 text-sm mb-1">{invoice.customer.billingAddress}</p>
                )}
                {invoice.customer.phone && (
                  <p className="text-gray-600 text-sm mb-1">Phone: {invoice.customer.phone}</p>
                )}
                {invoice.customer.email && (
                  <p className="text-gray-600 text-sm">Email: {invoice.customer.email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Invoice Details</h3>
              <div className="space-y-2">
                <div className="flex justify-end gap-4">
                  <span className="text-gray-600 font-medium">Issue Date:</span>
                  <span className="text-gray-900 font-semibold">{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-gray-600 font-medium">Due Date:</span>
                  <span className="text-gray-900 font-semibold">{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <span className={`font-semibold ${
                    invoice.status === 'PAID' ? 'text-green-600' :
                    invoice.status === 'OVERDUE' ? 'text-red-600' :
                    invoice.status === 'PARTIALLY_PAID' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {invoice.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {invoice.description && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</h3>
              <p className="text-gray-700">{invoice.description}</p>
            </div>
          )}

          {/* Line Items Table */}
          {lineItems.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Items</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">SKU</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-gray-900">{item.description}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{item.sku}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-80">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Subtotal:</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Tax (VAT):</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between py-3 border-b-2 border-gray-300 bg-gray-50 px-4 -mx-4">
                <span className="text-gray-900 font-bold text-lg">Total Amount:</span>
                <span className="text-gray-900 font-bold text-lg">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Paid:</span>
                <span className="text-green-600 font-semibold">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-50 px-4 -mx-4">
                <span className="text-gray-900 font-bold text-lg">Balance Due:</span>
                <span className="text-blue-900 font-bold text-lg">{formatCurrency(invoice.balanceAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Payment History</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-semibold text-gray-700 text-sm">Date</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-700 text-sm">Method</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-700 text-sm">Reference</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700 text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-200">
                      <td className="py-2 px-4 text-gray-900 text-sm">{formatDate(payment.paymentDate)}</td>
                      <td className="py-2 px-4 text-gray-900 text-sm">{payment.paymentMethod}</td>
                      <td className="py-2 px-4 text-gray-600 text-sm">{payment.reference}</td>
                      <td className="py-2 px-4 text-right text-green-600 font-medium text-sm">{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8 bg-gray-50 p-4 rounded">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
              <p className="text-gray-700 text-sm">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-300 pt-8 mt-12">
            <div className="text-center text-gray-600 text-sm">
              <p className="mb-2">Thank you for your business!</p>
              <p className="text-xs">
                Please make payment to: Bank Account - 1234567890, Bank Name, Branch.
              </p>
              <p className="text-xs mt-2 text-gray-500">
                This is a computer-generated invoice and does not require a signature.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
