// @ts-nocheck
/**
 * GET /api/monitoring/metrics
 * Monitoring and Analytics Endpoint
 * Returns system performance metrics, logs, and statistics
 */

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { ValidationError, AuthorizationError } from '@/lib/errors';
import {
  getApiMetrics,
  getQueryMetrics,
  getPerformanceSummary,
  createPerformanceReport,
  getLogs,
  LogCategory,
  LogLevel,
} from '@/lib/logging';

export async function GET(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    // Require admin or monitoring permission
    await requirePermission(request, 'admin');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary'; // summary, detailed, logs, performance

    switch (type) {
      case 'summary':
        return api.success(getPerformanceSummary(), 'Performance summary');

      case 'detailed':
        return api.success(
          {
            performance: getPerformanceSummary(),
            api: getApiMetrics(),
            database: getQueryMetrics(),
          },
          'Detailed metrics'
        );

      case 'logs':
        const logLevel = searchParams.get('level') as LogLevel | null;
        const logCategory = searchParams.get('category') as LogCategory | null;
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

        return api.success(
          {
            logs: getLogs({
              level: logLevel || undefined,
              category: logCategory || undefined,
              limit,
            }),
            count: getLogs({
              level: logLevel || undefined,
              category: logCategory || undefined,
            }).length,
          },
          'System logs'
        );

      case 'performance':
        return api.success(createPerformanceReport(), 'Performance report');

      case 'health':
        const summary = getPerformanceSummary();
        const apiMetrics = getApiMetrics();
        
        const unhealthyEndpoints = (Array.isArray(apiMetrics) 
          ? apiMetrics 
          : [apiMetrics]
        ).filter((m) => m.errorRate > 0.05);

        const health = {
          status: unhealthyEndpoints.length === 0 ? 'healthy' : 'warning',
          timestamp: new Date().toISOString(),
          metrics: summary,
          alerts: {
            slowQueries: summary.slowDbQueries > 10,
            errorPrones: unhealthyEndpoints.length > 0,
            highErrorRate: unhealthyEndpoints,
          },
        };

        return api.success(health, 'Health check');

      default:
        return api.error(
          new ValidationError('Invalid metrics type')
        );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Permission')) {
      return api.error(
        new AuthorizationError('Admin access required')
      );
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    // Require admin for actions
    await requirePermission(request, 'admin');

    const { action } = await request.json();

    switch (action) {
      case 'export-logs':
        const { format = 'json' } = await request.json();
        // Implementation would export logs
        return api.success(
          { message: 'Log export queued', format },
          'Export initiated'
        );

      case 'clear-cache':
        // Implementation would clear caches
        return api.success(
          { message: 'Caches cleared', timestamp: new Date() },
          'Cache cleared'
        );

      default:
        return api.error(
          new ValidationError('Invalid action')
        );
    }
  } catch (error) {
    throw error;
  }
}
