'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-blue-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="inline-block">
            <div className="text-8xl font-bold text-primary-600 mb-4">404</div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <Search className="w-4 h-4" />
            <span>Try checking the URL or use the navigation below</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Quick Links</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/invoices" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Invoices
            </Link>
            <Link href="/dashboard/customers" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Customers
            </Link>
            <Link href="/dashboard/products" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
