/**
 * Payment Methods & Statuses
 * Comprehensive payment method management for invoices
 */

/**
 * Available Payment Methods
 */
export enum PaymentMethod {
  // Bank Transfers
  BANK_TRANSFER = 'BANK_TRANSFER',
  MPESA = 'MPESA',
  BANK_CHEQUE = 'BANK_CHEQUE',
  
  // Cash
  CASH = 'CASH',
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  
  // Cards
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  
  // Digital Wallets & Money Transfers
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  
  // Vouchers & Credits
  PREPAID_VOUCHER = 'PREPAID_VOUCHER',
  STORE_CREDIT = 'STORE_CREDIT',
  
  // Other
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  OTHER = 'OTHER',
}

/**
 * Payment Method Display Information
 */
export const PAYMENT_METHOD_INFO: Record<PaymentMethod, {
  name: string;
  description: string;
  icon: string;
  color: string;
  requiresReference: boolean;
  requiresVerification: boolean;
  processingTime: string;
}> = {
  [PaymentMethod.BANK_TRANSFER]: {
    name: 'Bank Transfer',
    description: 'Direct bank-to-bank transfer',
    icon: '🏦',
    color: 'blue',
    requiresReference: true,
    requiresVerification: true,
    processingTime: '1-3 business days',
  },
  [PaymentMethod.MPESA]: {
    name: 'M-Pesa',
    description: 'Mobile money - Safaricom M-Pesa',
    icon: '📱',
    color: 'green',
    requiresReference: true,
    requiresVerification: true,
    processingTime: 'Instant',
  },
  [PaymentMethod.BANK_CHEQUE]: {
    name: 'Bank Cheque',
    description: 'Payment by bank cheque',
    icon: '📋',
    color: 'gray',
    requiresReference: true,
    requiresVerification: true,
    processingTime: '3-5 business days',
  },
  [PaymentMethod.CASH]: {
    name: 'Cash',
    description: 'Direct cash payment',
    icon: '💵',
    color: 'green',
    requiresReference: false,
    requiresVerification: false,
    processingTime: 'Immediate',
  },
  [PaymentMethod.CASH_DEPOSIT]: {
    name: 'Cash Deposit',
    description: 'Cash deposited to bank account',
    icon: '🏪',
    color: 'green',
    requiresReference: false,
    requiresVerification: true,
    processingTime: '1 business day',
  },
  [PaymentMethod.CREDIT_CARD]: {
    name: 'Credit Card',
    description: 'Credit card payment',
    icon: '💳',
    color: 'purple',
    requiresReference: true,
    requiresVerification: true,
    processingTime: 'Immediate',
  },
  [PaymentMethod.DEBIT_CARD]: {
    name: 'Debit Card',
    description: 'Debit card payment',
    icon: '💳',
    color: 'purple',
    requiresReference: true,
    requiresVerification: true,
    processingTime: 'Immediate',
  },
  [PaymentMethod.PAYPAL]: {
    name: 'PayPal',
    description: 'PayPal online payment',
    icon: '🌐',
    color: 'blue',
    requiresReference: true,
    requiresVerification: true,
    processingTime: '1-2 business days',
  },
  [PaymentMethod.STRIPE]: {
    name: 'Stripe',
    description: 'Stripe payment gateway',
    icon: '🌐',
    color: 'blue',
    requiresReference: true,
    requiresVerification: true,
    processingTime: '1-2 business days',
  },
  [PaymentMethod.AIRTEL_MONEY]: {
    name: 'Airtel Money',
    description: 'Mobile money - Airtel Money',
    icon: '📱',
    color: 'red',
    requiresReference: true,
    requiresVerification: true,
    processingTime: 'Instant',
  },
  [PaymentMethod.PREPAID_VOUCHER]: {
    name: 'Prepaid Voucher',
    description: 'Payment using prepaid voucher',
    icon: '🎫',
    color: 'orange',
    requiresReference: true,
    requiresVerification: false,
    processingTime: 'Immediate',
  },
  [PaymentMethod.STORE_CREDIT]: {
    name: 'Store Credit',
    description: 'Payment from store credit',
    icon: '💳',
    color: 'orange',
    requiresReference: false,
    requiresVerification: false,
    processingTime: 'Immediate',
  },
  [PaymentMethod.CRYPTOCURRENCY]: {
    name: 'Cryptocurrency',
    description: 'Crypto payment (Bitcoin, Ethereum, etc.)',
    icon: '₿',
    color: 'orange',
    requiresReference: true,
    requiresVerification: true,
    processingTime: '10-30 minutes',
  },
  [PaymentMethod.WIRE_TRANSFER]: {
    name: 'Wire Transfer',
    description: 'International wire transfer',
    icon: '🌍',
    color: 'blue',
    requiresReference: true,
    requiresVerification: true,
    processingTime: '2-5 business days',
  },
  [PaymentMethod.OTHER]: {
    name: 'Other',
    description: 'Other payment method',
    icon: '💰',
    color: 'gray',
    requiresReference: false,
    requiresVerification: false,
    processingTime: 'Varies',
  },
};

/**
 * Invoice Status Enum
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  DISPUTED = 'DISPUTED',
}

/**
 * Invoice Status Display Information
 */
export const INVOICE_STATUS_INFO: Record<InvoiceStatus, {
  label: string;
  color: string;
  icon: string;
  isFinal: boolean;
  isPaid: boolean;
  allowsPayment: boolean;
}> = {
  [InvoiceStatus.DRAFT]: {
    label: 'Draft',
    color: 'gray',
    icon: '📝',
    isFinal: false,
    isPaid: false,
    allowsPayment: false,
  },
  [InvoiceStatus.SENT]: {
    label: 'Sent',
    color: 'blue',
    icon: '📧',
    isFinal: false,
    isPaid: false,
    allowsPayment: true,
  },
  [InvoiceStatus.VIEWED]: {
    label: 'Viewed',
    color: 'cyan',
    icon: '👁️',
    isFinal: false,
    isPaid: false,
    allowsPayment: true,
  },
  [InvoiceStatus.PARTIALLY_PAID]: {
    label: 'Partially Paid',
    color: 'orange',
    icon: '💛',
    isFinal: false,
    isPaid: false,
    allowsPayment: true,
  },
  [InvoiceStatus.PAID]: {
    label: 'Paid',
    color: 'green',
    icon: '✅',
    isFinal: true,
    isPaid: true,
    allowsPayment: false,
  },
  [InvoiceStatus.OVERDUE]: {
    label: 'Overdue',
    color: 'red',
    icon: '⏰',
    isFinal: false,
    isPaid: false,
    allowsPayment: true,
  },
  [InvoiceStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'red',
    icon: '❌',
    isFinal: true,
    isPaid: false,
    allowsPayment: false,
  },
  [InvoiceStatus.REJECTED]: {
    label: 'Rejected',
    color: 'red',
    icon: '❌',
    isFinal: true,
    isPaid: false,
    allowsPayment: false,
  },
  [InvoiceStatus.DISPUTED]: {
    label: 'Disputed',
    color: 'orange',
    icon: '⚠️',
    isFinal: false,
    isPaid: false,
    allowsPayment: false,
  },
};

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
  PROCESSING = 'PROCESSING',
}

/**
 * Payment Status Display Information
 */
export const PAYMENT_STATUS_INFO: Record<PaymentStatus, {
  label: string;
  color: string;
  icon: string;
  isSuccessful: boolean;
  isFinal: boolean;
}> = {
  [PaymentStatus.PENDING]: {
    label: 'Pending',
    color: 'yellow',
    icon: '⏳',
    isSuccessful: false,
    isFinal: false,
  },
  [PaymentStatus.CONFIRMED]: {
    label: 'Confirmed',
    color: 'green',
    icon: '✅',
    isSuccessful: true,
    isFinal: true,
  },
  [PaymentStatus.FAILED]: {
    label: 'Failed',
    color: 'red',
    icon: '❌',
    isSuccessful: false,
    isFinal: true,
  },
  [PaymentStatus.REJECTED]: {
    label: 'Rejected',
    color: 'red',
    icon: '❌',
    isSuccessful: false,
    isFinal: true,
  },
  [PaymentStatus.REFUNDED]: {
    label: 'Refunded',
    color: 'orange',
    icon: '↩️',
    isSuccessful: false,
    isFinal: true,
  },
  [PaymentStatus.PROCESSING]: {
    label: 'Processing',
    color: 'cyan',
    icon: '⏳',
    isSuccessful: false,
    isFinal: false,
  },
};

/**
 * Determine invoice status based on payment amounts
 */
export function calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: Date,
  currentStatus?: string
): InvoiceStatus {
  // If already in final state, don't change
  if (
    currentStatus === InvoiceStatus.CANCELLED ||
    currentStatus === InvoiceStatus.REJECTED ||
    currentStatus === InvoiceStatus.DISPUTED
  ) {
    return currentStatus as InvoiceStatus;
  }

  // Check if paid
  if (paidAmount >= totalAmount) {
    return InvoiceStatus.PAID;
  }

  // Check if overdue
  if (new Date() > dueDate) {
    return paidAmount > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.OVERDUE;
  }

  // Check if partially paid
  if (paidAmount > 0) {
    return InvoiceStatus.PARTIALLY_PAID;
  }

  // Default to SENT
  return InvoiceStatus.SENT;
}

/**
 * Get all unpaid amount
 */
export function getUnpaidAmount(
  totalAmount: number,
  paidAmount: number
): number {
  return Math.max(totalAmount - paidAmount, 0);
}

/**
 * Check if invoice is paid
 */
export function isInvoicePaid(status: InvoiceStatus): boolean {
  return status === InvoiceStatus.PAID;
}

/**
 * Check if invoice is not paid (includes all non-paid statuses)
 */
export function isInvoiceNotPaid(status: InvoiceStatus): boolean {
  return ![InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(status);
}

/**
 * Check if payment can be recorded
 */
export function canRecordPayment(status: InvoiceStatus): boolean {
  return INVOICE_STATUS_INFO[status]?.allowsPayment ?? false;
}

/**
 * Get payment method display name
 */
export function getPaymentMethodName(method: PaymentMethod | string): string {
  const info = PAYMENT_METHOD_INFO[method as PaymentMethod];
  return info?.name ?? method;
}

/**
 * Group payment methods by category
 */
export function groupPaymentMethodsByCategory(): Record<string, PaymentMethod[]> {
  return {
    'Bank Transfers': [
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.WIRE_TRANSFER,
    ],
    'Mobile Money': [
      PaymentMethod.MPESA,
      PaymentMethod.AIRTEL_MONEY,
    ],
    'Cheques': [
      PaymentMethod.BANK_CHEQUE,
    ],
    'Cash': [
      PaymentMethod.CASH,
      PaymentMethod.CASH_DEPOSIT,
    ],
    'Cards': [
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
    ],
    'Digital Wallets': [
      PaymentMethod.PAYPAL,
      PaymentMethod.STRIPE,
      PaymentMethod.CRYPTOCURRENCY,
    ],
    'Vouchers & Credits': [
      PaymentMethod.PREPAID_VOUCHER,
      PaymentMethod.STORE_CREDIT,
    ],
    'Other': [
      PaymentMethod.OTHER,
    ],
  };
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(
  paymentAmount: number,
  invoiceTotal: number,
  alreadyPaid: number,
  allowOverpayment: boolean = false
): { valid: boolean; error?: string } {
  if (paymentAmount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than 0' };
  }

  const remaining = invoiceTotal - alreadyPaid;
  
  if (paymentAmount > remaining && !allowOverpayment) {
    return { 
      valid: false, 
      error: `Payment amount exceeds remaining balance of ${remaining.toFixed(2)}. Max overpayment allowed: ${remaining.toFixed(2)}` 
    };
  }

  return { valid: true };
}
