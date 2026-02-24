/**
 * Enhanced Validation Utilities
 * Type-safe validation with comprehensive error handling
 */

import { z, ZodSchema, SafeParseError } from 'zod';

/**
 * Parse and validate request body
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: ZodSchema
): Promise<{
  success: boolean;
  data?: T;
  error?: SafeParseError<unknown>;
}> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: result,
      };
    }

    return {
      success: true,
      data: result.data as T,
    };
  } catch {
    // Return undefined error to indicate parsing failure
    return {
      success: false,
      error: undefined,
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema
): {
  success: boolean;
  data?: T;
  error?: SafeParseError<unknown>;
} {
  const params: Record<string, string | string[]> = {};

  // Convert URLSearchParams to object
  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: result,
    };
  }

  return {
    success: true,
    data: result.data as T,
  };
}

/**
 * Get validation error message
 */
export function getValidationErrorMessage(error: SafeParseError<unknown>): string {
  if (!error.error?.issues) return 'Validation failed';

  const firstIssue = error.error.issues[0];
  const path = firstIssue.path.join('.');

  if (path) {
    return `${path}: ${firstIssue.message}`;
  }

  return firstIssue.message;
}

/**
 * Get all validation errors
 */
export function getValidationErrors(error: SafeParseError<unknown>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!error.error?.issues) return errors;

  error.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path || 'root'] = issue.message;
  });

  return errors;
}

/**
 * Validate string format
 */
export const StringValidators = {
  isEmail: (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  isUrl: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  isPhoneNumber: (value: string): boolean => /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(value),
  isUUID: (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  isCUID: (value: string): boolean => /^c[^\s]{24}$/.test(value),
  isSlug: (value: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
  isStrongPassword: (value: string): boolean => {
    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^a-zA-Z0-9]/.test(value)
    );
  },
};

/**
 * Create custom validation schemas
 */
export const CustomSchemas = {
  email: z.string().email('Invalid email address'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  strongPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special character'),
  
  phoneNumber: z
    .string()
    .refine(StringValidators.isPhoneNumber, 'Invalid phone number format'),
  
  url: z
    .string()
    .refine(StringValidators.isUrl, 'Invalid URL'),
  
  uuid: z
    .string()
    .refine(StringValidators.isUUID, 'Invalid UUID format'),
  
  cuid: z
    .string()
    .refine(StringValidators.isCUID, 'Invalid CUID format'),
  
  slug: z
    .string()
    .refine(StringValidators.isSlug, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  
  amount: z
    .number()
    .min(0, 'Amount must be positive')
    .max(999999999.99, 'Amount exceeds maximum'),
  
  percentage: z
    .number()
    .min(0, 'Percentage must be at least 0')
    .max(100, 'Percentage must be at most 100'),
  
  date: z
    .union([z.string(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .refine(date => !isNaN(date.getTime()), 'Invalid date'),
  
  futureDate: z
    .union([z.string(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .refine(date => !isNaN(date.getTime()), 'Invalid date')
    .refine(date => date > new Date(), 'Date must be in the future'),
  
  pastDate: z
    .union([z.string(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .refine(date => !isNaN(date.getTime()), 'Invalid date')
    .refine(date => date < new Date(), 'Date must be in the past'),
};

/**
 * Batch validation result
 */
export interface BatchValidationResult<T> {
  success: boolean;
  data?: T[];
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Validate array of items
 */
export function validateBatch<T>(
  items: unknown[],
  schema: ZodSchema,
  maxItems: number = 100
): BatchValidationResult<T> {
  if (items.length > maxItems) {
    return {
      success: false,
      errors: [
        {
          index: 0,
          error: `Cannot validate more than ${maxItems} items`,
        },
      ],
    };
  }

  const validResults: T[] = [];
  const errors: Array<{
    index: number;
    error: string;
  }> = [];

  items.forEach((item, index) => {
    const result = schema.safeParse(item);

    if (result.success) {
      validResults.push(result.data as T);
    } else {
      errors.push({
        index,
        error: getValidationErrorMessage(result as SafeParseError<unknown>),
      });
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      data: validResults,
      errors,
    };
  }

  return {
    success: true,
    data: validResults,
  };
}

/**
 * Create safe validation wrapper with error context
 */
export async function safeValidate<T>(
  fn: () => T | Promise<T>,
  schema?: ZodSchema,
  context: string = 'Validation'
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const data = await fn();

    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        return {
          success: false,
          error: `${context}: ${getValidationErrorMessage(result as SafeParseError<unknown>)}`,
        };
      }
      return { success: true, data: result.data as T };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
