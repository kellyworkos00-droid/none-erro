'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap"
        >
          {action.label}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
