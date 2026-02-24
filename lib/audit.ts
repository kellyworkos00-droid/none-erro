import prisma from './prisma';

// AuditAction enum values for type safety
type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'UPLOAD_STATEMENT'
  | 'RECONCILE_PAYMENT'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'CREATE_INVOICE'
  | 'UPDATE_INVOICE'
  | 'CREATE_SUPPLIER'
  | 'CREATE_SUPPLIER_BILL'
  | 'SUPPLIER_BILL_SUBMIT'
  | 'SUPPLIER_BILL_APPROVE'
  | 'SUPPLIER_BILL_MATCH'
  | 'SUPPLIER_BILL_CANCEL'
  | 'RECORD_SUPPLIER_PAYMENT'
  | 'CREATE_PURCHASE_ORDER'
  | 'APPROVE_PURCHASE_ORDER'
  | 'SEND_PURCHASE_ORDER'
  | 'RECEIVE_PURCHASE_ORDER'
  | 'CREATE_SALES_QUOTE'
  | 'SALES_QUOTE_SEND'
  | 'SALES_QUOTE_ACCEPT'
  | 'SALES_QUOTE_DECLINE'
  | 'CREATE_SALES_ORDER'
  | 'SALES_ORDER_SUBMIT'
  | 'SALES_ORDER_APPROVE'
  | 'SALES_ORDER_DELIVER'
  | 'SALES_ORDER_INVOICE'
  | 'SALES_ORDER_CANCEL'
  | 'CREATE_WAREHOUSE'
  | 'UPDATE_WAREHOUSE'
  | 'CREATE_WAREHOUSE_LOCATION'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'IMPORT_PRODUCTS'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_TRANSFER_CREATE'
  | 'STOCK_TRANSFER_COMPLETE'
  | 'STOCK_TRANSFER_CANCEL'
  | 'CREATE_EXPENSE'
  | 'CREATE_EXPENSE_CATEGORY'
  | 'CREATE_EMPLOYEE'
  | 'UPDATE_EMPLOYEE'
  | 'DELETE_EMPLOYEE'
  | 'PROCESS_PAYROLL'
  | 'APPROVE_LEAVE'
  | 'COLLECT_PAYMENT'
  | 'RECORD_BULK_PAYMENTS'
  | 'RECORD_REFUND'
  | 'MANUAL_ADJUSTMENT'
  | 'REVERSE_PAYMENT'
  | 'DELETE_RECORD'
  | 'EXPORT_DATA'
  | 'UPDATE_CREDIT_NOTE';

interface AuditLogData {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 * This function should be called for all critical operations
 * 
 * @param data - Audit log data
 * @returns Created audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Extract IP address from request headers
 * Handles various proxy headers
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined
  );
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}
