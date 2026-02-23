import React from 'react';
import { DEFAULT_VAT_RATE } from '@/lib/tax';

interface InvoiceItem {
  product?: { name: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
interface Invoice {
  invoiceNumber: string;
  customer?: { name: string };
  issueDate: string;
  subtotal: number;
  items?: InvoiceItem[];
}

export default function InvoicePrint({ invoice }: { invoice: Invoice }) {
  // Calculate VAT and totals
  const vat = Math.round((invoice.subtotal * DEFAULT_VAT_RATE) / 100);
  const total = invoice.subtotal + vat;

  // Limit products per page
  const maxItemsPerPage = 20;
  const items = invoice.items || [];
  const pages = Math.ceil(items.length / maxItemsPerPage);

  return (
    <div className="print-invoice">
      {[...Array(pages)].map((_, pageIdx) => (
        <div className="invoice-page" key={pageIdx} style={{ pageBreakAfter: pageIdx < pages - 1 ? 'always' : 'auto' }}>
          <div className="invoice-header">
            <h2>Invoice #{invoice.invoiceNumber}</h2>
            <div>Customer: {invoice.customer?.name}</div>
            <div>Date: {invoice.issueDate}</div>
          </div>
          <table className="invoice-items">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(pageIdx * maxItemsPerPage, (pageIdx + 1) * maxItemsPerPage).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.product?.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice}</td>
                  <td>{item.totalPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="invoice-summary">
            <div>Subtotal: {invoice.subtotal}</div>
            <div>VAT ({DEFAULT_VAT_RATE}%): {vat}</div>
            <div>Total: {total}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
