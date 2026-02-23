/**
 * Input Sanitization & Security Utilities
 * Comprehensive protection against XSS, SQL injection, and other attacks
 */

/**
 * HTML/XSS Sanitization
 * Remove potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onload, etc)
    .trim();
}

/**
 * Sanitize JSON strings to prevent injection
 */
export function sanitizeJsonInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeJsonInput(item));
  }
  
  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize keys too
      const sanitizedKey = sanitizeObjectKey(key);
      sanitized[sanitizedKey] = sanitizeJsonInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObjectKey(key: string): string {
  // Prevent prototype pollution
  if (['__proto__', 'constructor', 'prototype'].includes(key)) {
    return '';
  }
  
  // Remove special characters from keys
  return key
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 100); // Limit key length
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._+-]/g, '');
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone
    .replace(/[^0-9+\-() ]/g, '')
    .trim();
}

/**
 * Sanitize URL to prevent open redirect vulnerabilities
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    
    // Prevent javascript: and data: URLs
    if (url.startsWith('javascript:') || url.startsWith('data:')) {
      return '';
    }
    
    return urlObj.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize CSV/Excel input to prevent formula injection
 */
export function sanitizeCellValue(value: string): string {
  if (!value) return '';
  
  // Prevent formula injection (starts with =, +, -, @)
  if (['+', '-', '=', '@'].includes(value[0])) {
    return "'" + value; // Prefix with apostrophe to escape formula
  }
  
  return value;
}

/**
 * Validate input length to prevent buffer overflow attacks
 */
export function validateInputLength(
  input: string,
  minLength: number = 1,
  maxLength: number = 10000,
  fieldName: string = 'Input'
): boolean {
  if (input.length < minLength) {
    throw new Error(`${fieldName} is too short (minimum ${minLength} characters)`);
  }
  
  if (input.length > maxLength) {
    throw new Error(`${fieldName} is too long (maximum ${maxLength} characters)`);
  }
  
  return true;
}

/**
 * Escape SQL special characters (use parameterized queries instead when possible)
 */
export function escapeSqlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Validate and sanitize file upload
 */
export interface SanitizeFileOptions {
  maxSize: number; // bytes
  allowedMimes: string[];
  allowedExtensions: string[];
}

export function sanitizeFileUpload(
  fileName: string,
  fileSize: number,
  mimeType: string,
  options: SanitizeFileOptions
): { valid: boolean; error?: string; sanitizedName?: string } {
  // Check file size
  if (fileSize > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum (${options.maxSize / 1024 / 1024}MB)`,
    };
  }
  
  // Check MIME type
  if (!options.allowedMimes.includes(mimeType)) {
    return {
      valid: false,
      error: 'Invalid file type',
    };
  }
  
  // Check extension
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (!options.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file extension',
    };
  }
  
  // Sanitize filename
  const sanitizedName = sanitizeFileName(fileName);
  
  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  const baseName = fileName.split(/[\\/]/).pop() || fileName;
  
  // Remove special characters but keep dots for extensions
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_') // Remove double dots
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase()
    .slice(0, 255); // Limit length
  
  return sanitized;
}

/**
 * Generate secure random string for tokens/identifiers
 */
export function generateSecureRandom(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  
  if (typeof window === 'undefined') {
    // Server-side: use Node.js crypto
    const crypto = require('crypto');
    crypto.getRandomValues(randomValues);
  } else {
    // Client-side: use browser crypto
    crypto.getRandomValues(randomValues);
  }
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

/**
 * Validate against common attack patterns
 */
export function checkForAttackPatterns(input: string): { safe: boolean; threat?: string } {
  const patterns = [
    { regex: /<script/gi, threat: 'XSS attempt (script tag)' },
    { regex: /javascript:/gi, threat: 'XSS attempt (javascript protocol)' },
    { regex: /on\w+\s*=/gi, threat: 'XSS attempt (event handler)' },
    { regex: /union\s+select/gi, threat: 'SQL injection (UNION SELECT)' },
    { regex: /drop\s+table/gi, threat: 'SQL injection (DROP TABLE)' },
    { regex: /exec\s*\(/gi, threat: 'Code injection attempt' },
    { regex: /eval\s*\(/gi, threat: 'Code injection attempt' },
  ];
  
  for (const { regex, threat } of patterns) {
    if (regex.test(input)) {
      return { safe: false, threat };
    }
  }
  
  return { safe: true };
}
