'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Phone } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="inline-block">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Server Error</h1>
        <p className="text-gray-600 mb-2">
          Something went wrong on our end.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Our team has been notified and is working to fix the issue.
        </p>

        {error.digest && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-xs text-red-700 font-mono break-words">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-left">
          <p className="text-sm font-semibold text-red-900 mb-2">Error Details:</p>
          <p className="text-xs text-red-700 font-mono break-words">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            Need help? Contact our support team
          </p>
          <a
            href="mailto:support@elegante.app"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <Phone className="w-4 h-4" />
            support@elegante.app
          </a>
        </div>
      </div>
    </div>
  );
}
