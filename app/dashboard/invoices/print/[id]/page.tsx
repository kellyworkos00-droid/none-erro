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

  useEffect(() => {
    // Auto-print when page loads
    if (invoice && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [invoice, loading]);

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

  // Pagination for multiple pages
  const maxItemsPerPage = 20;
  const totalPages = Math.ceil(lineItems.length / maxItemsPerPage);
  const pages = Array.from({ length: totalPages }, (_, i) => 
    lineItems.slice(i * maxItemsPerPage, (i + 1) * maxItemsPerPage)
  );

  return (
    <div style={{ margin: 0, padding: 0, width: '100%', backgroundColor: '#ffffff' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #111827;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            width: 210mm;
            height: 297mm;
          }
          
          .invoice-page {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0.5cm;
            background: white;
            page-break-inside: avoid;
          }
        }
        
        @media screen {
          .invoice-page {
            max-width: 900px;
            margin: 20px auto;
            padding: 40px;
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ animation: 'spin 1s linear infinite', width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', margin: '0 auto', marginBottom: '20px' }} />
          <p>Loading invoice...</p>
        </div>
      ) : !invoice ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
          <p>Invoice not found</p>
        </div>
      ) : (
        <>
          {pages.map((pageItems, pageIdx) => (
            <div 
              key={pageIdx}
              className="invoice-page"
              style={{ pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto' }}
            >
          {/* Professional Header */}
          <div style={{ borderBottom: '4px solid #2563eb', paddingBottom: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
              {/* Left: Company Logo & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                  <Image src="/images/elegant-logo.jpg" alt="Elegant Steel Logo" fill style={{ objectFit: 'contain' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>ELEGANT STEEL</h1>
                  <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0 0 0' }}>EASTERN BYPASS</p>
                </div>
              </div>
              {/* Center: INVOICE Title */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', margin: 0 }}>INVOICE</h2>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>{invoice.invoiceNumber}</p>
              </div>
              {/* Right: Tax & Contact Info */}
              <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 4px 0' }}><span style={{ fontWeight: 'bold' }}>KRA PIN:</span> <span style={{ color: '#2563eb' }}>P000000000A</span></p>
                <p style={{ margin: '0 0 4px 0', color: '#374151' }}>📞 0726788925 / 0111478454</p>
                <p style={{ margin: 0, color: '#374151' }}>📍 Eastern Bypass, Nairobi</p>
              </div>
            </div>
            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '14px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
              <div>
                <p style={{ color: '#4b5563', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Issued</p>
                <p style={{ fontWeight: 'bold', color: '#111827', margin: 0 }}>{formatDate(invoice.issueDate)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#4b5563', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Due</p>
                <p style={{ fontWeight: 'bold', color: '#111827', margin: 0 }}>{formatDate(invoice.dueDate)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  backgroundColor: invoice.status === 'PAID' ? '#dcfce7' : invoice.status === 'OVERDUE' ? '#fee2e2' : invoice.status === 'PARTIALLY_PAID' ? '#fef3c7' : '#dbeafe',
                  color: invoice.status === 'PAID' ? '#166534' : invoice.status === 'OVERDUE' ? '#991b1b' : invoice.status === 'PARTIALLY_PAID' ? '#b45309' : '#1e40af',
                  margin: 0
                }}>
                  {invoice.status.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Items Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '14px' }}>
            {/* Bill To */}
            <div>
              <p style={{ fontWeight: 'bold', color: '#111827', textTransform: 'uppercase', fontSize: '12px', marginBottom: '8px', margin: 0 }}>Bill To</p>
              <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>{invoice.customer.name}</p>
              {invoice.customer.billingAddress && <p style={{ color: '#4b5563', fontSize: '12px', margin: '2px 0' }}>{invoice.customer.billingAddress}</p>}
              {invoice.customer.phone && <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>Tel: {invoice.customer.phone}</p>}
            </div>
            {/* Items Count */}
            <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '4px', textAlign: 'center', border: '2px solid #bfdbfe' }}>
              <p style={{ fontWeight: 'bold', color: '#111827', fontSize: '18px', margin: 0 }}>{lineItems.length}</p>
              <p style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', margin: '2px 0 0 0' }}>Line Items</p>
            </div>
            {/* Tax Info */}
            <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '4px', textAlign: 'right', border: '2px solid #fde68a' }}>
              <p style={{ fontSize: '12px', color: '#4b5563', fontWeight: '600', margin: '0 0 4px 0' }}>VAT Rate</p>
              <p style={{ fontWeight: 'bold', color: '#b45309', fontSize: '18px', margin: 0 }}>16%</p>
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0 0 0' }}>Included in Total</p>
            </div>
          </div>

          {/* Line Items Table */}
          {pageItems.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#dbeafe', borderBottom: '2px solid #2563eb' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 'bold', color: '#111827' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '8px 8px', fontWeight: 'bold', color: '#111827', width: '60px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 'bold', color: '#111827', width: '100px' }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 'bold', color: '#111827', width: '100px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 12px', color: '#111827' }}>{item.description}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'center', color: '#111827', fontWeight: '500' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#111827' }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#111827', fontWeight: '600' }}>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Section - Only on first page */}
          {pageIdx === 0 && (
            <div style={{ borderTop: '2px solid #d1d5db', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '6px' }}>
                    <span style={{ color: '#374151', fontWeight: '600' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '6px', borderBottom: '2px solid #d1d5db' }}>
                    <span style={{ color: '#374151', fontWeight: '600' }}>VAT @ 16%:</span>
                    <span style={{ fontWeight: '600', color: '#b45309' }}>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eff6ff', padding: '8px 12px', borderRadius: '4px', margin: '8px 0' }}>
                    <span style={{ color: '#111827' }}>TOTAL DUE:</span>
                    <span style={{ color: '#1e3a8a' }}>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  {invoice.paidAmount > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '6px', color: '#15803d', fontWeight: '600' }}>
                        <span>Amount Paid:</span>
                        <span>{formatCurrency(invoice.paidAmount)}</span>
                      </div>
                      {invoice.balanceAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '6px', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: '4px', color: '#92400e', fontWeight: 'bold' }}>
                          <span>Balance Due:</span>
                          <span>{formatCurrency(invoice.balanceAmount)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment History - Only on first page */}
          {pageIdx === 0 && invoice.payments.length > 0 && (
            <div style={{ marginTop: '16px', fontSize: '12px' }}>
              <p style={{ fontWeight: 'bold', color: '#111827', textTransform: 'uppercase', marginBottom: '8px', paddingBottom: '4px', borderBottom: '2px solid #d1d5db', margin: 0 }}>Payment History</p>
              <div style={{ marginTop: '8px' }}>
                {invoice.payments.map((payment) => (
                  <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '4px', marginBottom: '4px', borderLeft: '4px solid #22c55e' }}>
                    <span style={{ color: '#374151', fontWeight: '500' }}>{formatDate(payment.paymentDate)} - {payment.paymentMethod}</span>
                    <span style={{ fontWeight: 'bold', color: '#15803d' }}>{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '2px solid #d1d5db', paddingTop: '12px', marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#4b5563' }}>
            <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px', fontSize: '14px', margin: 0 }}>Thank you for your business!</p>
            <p style={{ color: '#6b7280', lineHeight: 1.5, margin: '4px 0' }}>VAT is included in all prices above. This is a computer-generated document and requires no signature for validity.</p>
            <p style={{ color: '#6b7280', marginTop: '8px', fontWeight: '600', margin: '8px 0 0 0' }}>Elegant Steel | Eastern Bypass | KRA PIN: P000000000A</p>
            <p style={{ color: '#9ca3af', marginTop: '4px', fontSize: '11px', margin: '4px 0 0 0' }}>Printed on {formatDate(new Date().toISOString())}</p>
            {totalPages > 1 && (
              <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '11px', margin: '8px 0 0 0', fontWeight: '600' }}>Page {pageIdx + 1} of {totalPages}</p>
            )}
          </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
