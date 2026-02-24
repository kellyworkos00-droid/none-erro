# Error Handling & Validation Improvements

This document describes the new error handling and form validation system implemented in Kelly OS.

## 📋 Components & Utilities

### 1. ErrorBoundary Component
**Location:** `app/components/ErrorBoundary.tsx`

Catches React component errors and displays a user-friendly error page with recovery options.

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

**Features:**
- ✅ Catches unhandled component errors
- ✅ Error tracking (counts repeated errors)
- ✅ Retry mechanism
- ✅ User-friendly error UI

---

### 2. useApiCall Hook
**Location:** `lib/hooks/useApiCall.ts`

Custom hook for API calls with automatic retry logic and error handling.

**Usage:**
```tsx
import { useApiCall } from '@/lib/hooks/useApiCall';

export function MyComponent() {
  const { data, error, loading, call, retry } = useApiCall();

  const fetchData = async () => {
    const { data, error, success } = await call('/api/endpoint', {
      method: 'POST',
      body: { /* data */ },
      retries: 3,
      retryDelay: 1000,
    });

    if (success) {
      console.log('Success:', data);
    } else {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && (
        <p className="text-red-600">
          {error}
          <button onClick={() => retry('/api/endpoint')}>
            Retry
          </button>
        </p>
      )}
      {data && <p>Data: {JSON.stringify(data)}</p>}
    </div>
  );
}
```

**Features:**
- ✅ Automatic retry logic (configurable)
- ✅ Exponential backoff delays
- ✅ Auth token handling
- ✅ Error tracking and recovery

---

### 3. ValidationFeedback Component
**Location:** `app/components/ValidationFeedback.tsx`

Reusable components for displaying form validation feedback.

**Components:**

#### ValidationFeedback
Displays inline validation messages with icons.

```tsx
import { ValidationFeedback } from '@/components/ValidationFeedback';

<ValidationFeedback
  type="error"
  message="Email is invalid"
/>

<ValidationFeedback
  type="success"
  message="Email verified"
/>
```

#### FormFieldError
Shows field-specific error messages.

```tsx
import { FormFieldError } from '@/components/ValidationFeedback';

<FormFieldError
  error={errors.email}
  touched={touched.email}
/>
```

#### FieldLabel
Label with validation feedback.

```tsx
import { FieldLabel } from '@/components/ValidationFeedback';

<FieldLabel
  label="Email"
  required
  error={errors.email}
  touched={touched.email}
/>
```

#### getInputClassName
Utility for styling inputs based on validation state.

```tsx
import { getInputClassName } from '@/components/ValidationFeedback';

<input
  className={getInputClassName(
    errors.email,
    touched.email,
    'w-full'
  )}
/>
```

---

### 4. Form Validation Rules
**Location:** `lib/validation-rules.ts`

Reusable validation functions for common scenarios.

**Available Rules:**

```tsx
import { formValidationRules, validateField } from '@/lib/validation-rules';

// Single field validation
const error = validateField(email, [
  formValidationRules.required,
  formValidationRules.email,
]);

// Common rules
formValidationRules.required(value)              // Required field
formValidationRules.email(value)                 // Valid email
formValidationRules.minLength(10)(value)        // Min length
formValidationRules.maxLength(255)(value)       // Max length
formValidationRules.minValue(0)(value)          // Min numeric value
formValidationRules.maxValue(100)(value)        // Max numeric value
formValidationRules.phone(value)                // Valid phone
formValidationRules.url(value)                  // Valid URL
formValidationRules.pattern(regex, msg)(value)  // Regex pattern
```

---

### 5. ConfirmDialog Component
**Location:** `app/components/ConfirmDialog.tsx`

Modal confirmation dialog for destructive actions.

**Usage:**
```tsx
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';

export function DeleteButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch('/api/resource/123', { method: 'DELETE' });
      setShowConfirm(false);
      toast.success('Deleted successfully');
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>
        Delete
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Item"
        message="Are you sure you want to delete this item? This cannot be undone."
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
```

---

### 6. Error Pages

#### 404 Page
**Location:** `app/not-found.tsx`

Automatically shown for non-existent pages.

#### Error Page
**Location:** `app/error.tsx`

Automatically shown for server errors (500s).

**Features:**
- ✅ Error ID tracking
- ✅ Error details
- ✅ Recovery options
- ✅ Support contact info

---

## 🚀 Implementation Examples

### Credit Notes Form with Validation
```tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ValidationFeedback,
  FieldLabel,
  getInputClassName,
  FormFieldError,
} from '@/components/ValidationFeedback';
import { 
  formValidationRules, 
  validateField,
  validateMultipleFields 
} from '@/lib/validation-rules';

export function CreditNoteForm() {
  const [formData, setFormData] = useState({
    reason: '',
    customerId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validationSchema = {
    reason: [
      formValidationRules.required,
      formValidationRules.minLength(10),
    ],
    customerId: [formValidationRules.required],
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Real-time validation
    const error = validateField(value, validationSchema[field as keyof typeof validationSchema]);
    setErrors((prev) => ({
      ...prev,
      [field]: error || '',
    }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = validateMultipleFields(formData, validationSchema);
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.keys(newErrors).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>));
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      const response = await fetch('/api/credit-notes', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create');
      
      toast.success('Credit note created successfully');
      setFormData({ reason: '', customerId: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create credit note');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FieldLabel
          label="Customer"
          required
          error={errors.customerId}
          touched={touched.customerId}
        />
        <select
          value={formData.customerId}
          onChange={(e) => handleChange('customerId', e.target.value)}
          onBlur={() => handleBlur('customerId')}
          className={getInputClassName(errors.customerId, touched.customerId, 'w-full')}
        >
          <option value="">Select customer</option>
          {/* Options */}
        </select>
        <FormFieldError error={errors.customerId} touched={touched.customerId} />
      </div>

      <div>
        <FieldLabel
          label="Reason"
          required
          error={errors.reason}
          touched={touched.reason}
        />
        <textarea
          value={formData.reason}
          onChange={(e) => handleChange('reason', e.target.value)}
          onBlur={() => handleBlur('reason')}
          className={getInputClassName(errors.reason, touched.reason, 'w-full')}
          rows={3}
        />
        <FormFieldError error={errors.reason} touched={touched.reason} />
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
      >
        Create Credit Note
      </button>
    </form>
  );
}
```

---

## 🔄 API Call with Retry Example

```tsx
import { useApiCall } from '@/lib/hooks/useApiCall';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function InvoicesList() {
  const { data, error, loading, call, retry } = useApiCall();

  useEffect(() => {
    const fetchInvoices = async () => {
      const result = await call('/api/invoices', {
        retries: 3,
        retryDelay: 1000,
      });

      if (!result.success) {
        toast.error(result.error);
      }
    };

    fetchInvoices();
  }, [call]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {error && (
        <div className="bg-red-50 p-4 rounded mb-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => retry('/api/invoices')}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      {data && <InvoicesTable invoices={data} />}
    </div>
  );
}
```

---

## 📝 Best Practices

### 1. Always validate on both client and server
```tsx
// Client-side for UX
validateField(value, rules);

// Server-side for security
const result = schema.safeParse(body);
```

### 2. Use ConfirmDialog for destructive actions
```tsx
<ConfirmDialog
  isDangerous
  onConfirm={handleDelete}
  // ...
/>
```

### 3. Wrap critical sections with ErrorBoundary
```tsx
<ErrorBoundary>
  <CriticalComponent />
</ErrorBoundary>
```

### 4. Use retry hooks for network-dependent operations
```tsx
const { error, retry } = useApiCall();
if (error) return <button onClick={retry}>Retry</button>;
```

### 5. Show validation feedback immediately
```tsx
// Use real-time validation
onChange={(e) => handleChange(field, e.target.value)}
```

---

## 🔧 Customization

### Customize Error Boundary Colors
Edit `ErrorBoundary.tsx` colors in the JSX.

### Add Custom Validation Rules
Add to `validation-rules.ts`:

```tsx
export const formValidationRules = {
  customRule: (value: string): string | null => {
    // Your logic
    return 'Error message' || null;
  },
};
```

### Customize Toast Notifications
Edit `toastOptions` in `layout.tsx`

---

## ✅ Testing

Test error scenarios:
```tsx
// Test Error Boundary
<ErrorBoundary>
  <BrokenComponent /> {/* Throws error */}
</ErrorBoundary>

// Test Validation
const error = validateField('', [formValidationRules.required]);
expect(error).toBe('This field is required');

// Test API Retry
// Throttle network to test retries in DevTools
```

---

## 📚 Files Created/Modified

**New Files:**
- `app/components/ErrorBoundary.tsx` - Error boundary component
- `app/components/ValidationFeedback.tsx` - Validation UI components
- `app/components/ConfirmDialog.tsx` - Confirmation dialog
- `app/not-found.tsx` - 404 page
- `app/error.tsx` - 500 error page
- `lib/hooks/useApiCall.ts` - API call hook with retry
- `lib/validation-rules.ts` - Form validation rules

**Modified Files:**
- `app/layout.tsx` - Added ErrorBoundary and Toaster

---

## 🚀 Next Steps

1. ✅ Integrate validation into all forms
2. ✅ Test error scenarios in production
3. ✅ Add monitoring/logging for errors
4. ✅ Implement retry UI in critical sections
5. ✅ Add analytics tracking for error rates
