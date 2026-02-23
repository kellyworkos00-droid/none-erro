'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Hide header on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="bg-white/75 backdrop-blur border-b border-white/70 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="relative w-10 h-10">
              <Image
                src="/images/elegant-logo.jpg"
                alt="Elegant Steel Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-gray-900">Elegant Steel</h1>
              <p className="text-xs text-gray-600">ERP Suite</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 rounded-full hover:bg-white/70 transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/reconcile" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 rounded-full hover:bg-white/70 transition-colors">
              Reconcile
            </Link>
            <Link href="/dashboard/pos" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 rounded-full hover:bg-white/70 transition-colors">
              POS
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-white/80"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 rounded-full hover:bg-white/70 transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/reconcile" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 rounded-full hover:bg-white/70 transition-colors">
              Reconcile
            </Link>
            <Link href="/dashboard/pos" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 rounded-full hover:bg-white/70 transition-colors">
              POS
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
