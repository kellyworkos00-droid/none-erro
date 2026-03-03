'use client';

import React from 'react';
import { StatCard } from './StatCard';

interface DashboardStats {
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

interface DashboardStatGridProps {
  stats: DashboardStats[];
}

export function DashboardStatGrid({ stats }: DashboardStatGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="animate-in fade-in duration-500"
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          <StatCard {...stat} />
        </div>
      ))}
    </div>
  );
}
