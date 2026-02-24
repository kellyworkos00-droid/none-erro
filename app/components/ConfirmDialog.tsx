'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive actions
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Confirmation action error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          {isDangerous && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        <p className="text-gray-600 mb-6">{message}</p>

        {isDangerous && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-700 font-medium">
              This action cannot be undone.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDangerous
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isLoading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
