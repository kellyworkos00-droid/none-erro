'use client';

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'amber';
}

const colorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
};

export function StatCard({
  title,
  value,
  icon,
  change,
  description,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow duration-200 hover:border-gray-300 dark:hover:border-gray-600">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {React.cloneElement(icon as React.ReactElement, {
            className: 'w-6 h-6',
          })}
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {change.isPositive ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            {Math.abs(change.value)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' && value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          {typeof value === 'string' && value}
        </p>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
}
