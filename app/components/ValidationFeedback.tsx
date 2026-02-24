'use client';

import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ValidationFeedbackProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
}

export function ValidationFeedback({ type, message, className = '' }: ValidationFeedbackProps) {
  const baseClass = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium';
  
  const typeStyles = {
    error: 'bg-red-50 text-red-700 border border-red-200',
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  const icons = {
    error: <XCircle className="w-4 h-4 flex-shrink-0" />,
    success: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
    info: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
  };

  return (
    <div className={`${baseClass} ${typeStyles[type]} ${className}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
}

interface FormFieldErrorProps {
  error?: string;
  touched?: boolean;
}

export function FormFieldError({ error, touched }: FormFieldErrorProps) {
  if (!touched || !error) return null;

  return (
    <div className="mt-1 flex items-center gap-1 text-red-700 text-sm">
      <XCircle className="w-3 h-3" />
      <span>{error}</span>
    </div>
  );
}

interface FieldValidationProps {
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
}

export function FieldLabel({ label, error, touched, required }: FieldValidationProps) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-600 ml-1">*</span>}
      {error && touched && (
        <span className="ml-2 text-red-600 text-xs">— {error}</span>
      )}
    </label>
  );
}

export function getInputClassName(error?: string, touched?: boolean, base = '') {
  const baseClass = 'px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all';
  const errorClass = error && touched 
    ? 'border-red-300 focus:ring-red-500 bg-red-50'
    : 'border-gray-300 focus:ring-primary-500';
  
  return `${baseClass} ${errorClass} ${base}`;
}
