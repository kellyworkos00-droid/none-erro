'use client';

// This is an EXAMPLE file showing how to use the new components
// You can adapt this to your actual dashboard page

import { DashboardStatGrid } from '@/app/components/DashboardStatGrid';
import { SectionHeader } from '@/app/components/SectionHeader';
import { QuickActions } from '@/app/components/QuickActions';
import {
  DollarSign,
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

/**
 * EXAMPLE: Enhanced Dashboard Component
 * 
 * This demonstrates how to use the new UI components:
 * - DashboardStatGrid for metrics
 * - SectionHeader for section titles
 * - QuickActions for common tasks
 * - StatCard (via DashboardStatGrid) for individual metrics
 */

export function DashboardExample() {
  // Example metrics data
  const mainStats = [
    {
      title: 'Total Revenue',
      value: 125000,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'blue' as const,
      change: { value: 12, isPositive: true },
      description: 'Last 30 days'
    },
    {
      title: 'Active Customers',
      value: 342,
      icon: <Users className="w-6 h-6" />,
      color: 'green' as const,
      change: { value: 5, isPositive: true },
      description: 'Total accounts'
    },
    {
      title: 'Stock Items',
      value: 1284,
      icon: <Package className="w-6 h-6" />,
      color: 'purple' as const,
      change: { value: 2, isPositive: false },
      description: 'Inventory items'
    },
    {
      title: 'Growth Rate',
      value: '24%',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'amber' as const,
      description: 'Month over month'
    },
  ];

  const secondaryStats = [
    {
      title: 'Pending Orders',
      value: 34,
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'blue' as const,
      change: { value: 8, isPositive: false },
    },
    {
      title: 'Completed Tasks',
      value: 156,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green' as const,
      change: { value: 15, isPositive: true },
    },
    {
      title: 'Alerts',
      value: 7,
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'red' as const,
      description: 'Require attention'
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Quick Actions Section */}
        <div className="mb-12">
          <SectionHeader
            title="Welcome Back!"
            description="Quick access to common actions"
          />
          <QuickActions />
        </div>

        {/* Main Metrics Grid */}
        <div className="mb-12">
          <SectionHeader
            title="Key Metrics"
            description="Overview of your business"
            action={{
              label: 'View Full Report',
              href: '/dashboard/reports'
            }}
          />
          <DashboardStatGrid stats={mainStats} />
        </div>

        {/* Secondary Metrics Grid */}
        <div className="mb-12">
          <SectionHeader
            title="Today's Activity"
            description="Real-time updates"
          />
          <DashboardStatGrid stats={secondaryStats} />
        </div>

        {/* Example Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            <SectionHeader
              title="Recent Transactions"
              action={{
                label: 'View All',
                href: '/dashboard/transactions'
              }}
            />
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Transaction #{i}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Today at {10 + i}:00 AM
                    </p>
                  </div>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    +${(i * 500).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            <SectionHeader
              title="Top Customers"
              action={{
                label: 'Manage',
                href: '/dashboard/customers'
              }}
            />
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                      C{i}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Customer {i}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${(i * 1000).toLocaleString()} lifetime value
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Tier {i}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Copy this component structure to your actual dashboard page
 * 2. Replace the example data with your real data from the API
 * 3. Use the `DashboardStatGrid` to display multiple metrics
 * 4. Use `SectionHeader` for consistent section titles
 * 5. Use `QuickActions` for common tasks
 * 6. All components automatically support dark mode!
 * 
 * STYLING NOTES:
 * - All components use dark: prefix for dark mode
 * - Hover effects are smooth and instant
 * - Add stagger animations with page-enter class
 * - Responsive design adapts to all screen sizes
 * 
 * KEYBOARD SHORTCUTS:
 * - ⌘K / Ctrl+K: Open command palette
 * - Use arrow keys in command palette to navigate
 * - Press Enter to execute a command
 * - Press Esc to close command palette
 */
