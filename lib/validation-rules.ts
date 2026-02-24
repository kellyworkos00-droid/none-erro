/**
 * Form-level validation rules and helpers
 * Used for real-time form validation and error handling
 */

export const formValidationRules = {
  required: (value: unknown): string | null => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string): string | null => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (min: number) => (value: string): string | null => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string): string | null => {
    if (!value) return null;
    if (value.length > max) {
      return `Must not exceed ${max} characters`;
    }
    return null;
  },

  minValue: (min: number) => (value: number | string): string | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  maxValue: (max: number) => (value: number | string): string | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num > max) {
      return `Must not exceed ${max}`;
    }
    return null;
  },

  phone: (value: string): string | null => {
    if (!value) return null;
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s]?[0-9]{3}[-\s]?[0-9]{4,6}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  url: (value: string): string | null => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  pattern: (pattern: RegExp, message: string) => (value: string): string | null => {
    if (!value) return null;
    if (!pattern.test(value)) {
      return message;
    }
    return null;
  },

  match: (fieldValue: string, otherValue: string, fieldName: string = 'Fields') => (): string | null => {
    if (fieldValue !== otherValue) {
      return `${fieldName} do not match`;
    }
    return null;
  },
};

/**
 * Validate a single field
 */
export function validateField(
  value: unknown,
  rules: Array<(val: unknown) => string | null>
): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

/**
 * Validate multiple fields at once
 */
export function validateMultipleFields(
  data: Record<string, unknown>,
  schema: Record<string, Array<(val: unknown) => string | null>>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}
