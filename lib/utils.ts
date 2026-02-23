/**
 * Utility functions for Kelly OS Bank Reconciliation Module
 * Production-ready helper functions with proper error handling
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Decimal from 'decimal.js';

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency amount for display
 * @param amount - Amount to format
 * @param currency - Currency code (default: KES)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | Decimal, currency: string = 'KES'): string {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Format date for display
 * @param date - Date to format
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (includeTime) {
    return new Intl.DateTimeFormat('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  }
  
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Calculate days between two dates
 * @param startDate - Start date
 * @param endDate - End date (default: today)
 * @returns Number of days
 */
export function daysBetween(startDate: Date | string, endDate: Date | string = new Date()): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generate unique transaction ID
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
export function generateTransactionId(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Safe decimal arithmetic for financial calculations
 * Prevents floating point errors
 */
export const decimal = {
  add: (...values: (number | string | Decimal)[]): Decimal => {
    return values.reduce((sum: Decimal, val) => sum.add(new Decimal(val)), new Decimal(0));
  },
  
  subtract: (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
    return new Decimal(a).sub(new Decimal(b));
  },
  
  multiply: (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
    return new Decimal(a).mul(new Decimal(b));
  },
  
  divide: (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
    return new Decimal(a).div(new Decimal(b));
  },
  
  compare: (a: number | string | Decimal, b: number | string | Decimal): number => {
    return new Decimal(a).comparedTo(new Decimal(b));
  },
  
  equals: (a: number | string | Decimal, b: number | string | Decimal): boolean => {
    return new Decimal(a).equals(new Decimal(b));
  },
  
  toNumber: (value: number | string | Decimal): number => {
    return new Decimal(value).toNumber();
  },
};

/**
 * Validate file type
 * @param fileName - Name of the file
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function isValidFileType(fileName: string, allowedTypes: string[]): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  
  const mimeMap: Record<string, string> = {
    'csv': 'text/csv',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  
  const mimeType = mimeMap[extension];
  return mimeType ? allowedTypes.includes(mimeType) : false;
}

/**
 * Sanitize filename for safe storage
 * @param fileName - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Sleep utility for rate limiting or delays
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate string with ellipsis
 * @param str - String to truncate
 * @param length - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
}

/**
 * Parse CSV amount (handles different formats)
 * @param value - Amount string from CSV
 * @returns Parsed number
 */
export function parseAmount(value: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Invalid amount: ${value}`);
  }
  
  return parsed;
}

/**
 * Validate and parse date from various formats
 * @param value - Date string
 * @returns Date object
 */
export function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  
  return date;
}

/**
 * Create error response object
 * @param message - Error message
 * @param code - Error code
 * @param details - Additional details
 * @returns Error response object
 */
export function createErrorResponse(
  message: string,
  code: string = 'ERROR',
  details?: unknown
) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Create success response object
 * @param data - Response data
 * @param message - Success message
 * @returns Success response object
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Generate unique SKU for products
 * Format: SKU-TIMESTAMP-RANDOM
 * @returns Generated SKU string
 */
export function generateSKU(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SKU-${timestamp}-${random}`;
}
