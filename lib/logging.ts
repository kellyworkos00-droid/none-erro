/**
 * Comprehensive Logging & Monitoring System
 * Tracks all operations for debugging, auditing, and analytics
 */

import { prisma } from './prisma';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum LogCategory {
  PAYMENT = 'PAYMENT',
  INVOICE = 'INVOICE',
  AUTH = 'AUTH',
  SECURITY = 'SECURITY',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  PERFORMANCE = 'PERFORMANCE',
  SYSTEM = 'SYSTEM',
  USER = 'USER',
}

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: Date;
  duration?: number; // milliseconds
}

interface QueryMetrics {
  total: number;
  slow: number; // queries > 100ms
  errors: number;
  averageTime: number;
}

interface ApiMetrics {
  endpoint: string;
  method: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  errorRate: number;
}

// In-memory logs (use log aggregation service in production)
const logs: LogEntry[] = [];
const maxLogs = 10000; // Keep last 10k logs

// Metrics tracking
const apiMetrics: Map<string, ApiMetrics> = new Map();
const queryMetrics: QueryMetrics = {
  total: 0,
  slow: 0,
  errors: 0,
  averageTime: 0,
};

/**
 * Log a message with context
 */
export async function log(
  level: LogLevel,
  message: string,
  category: LogCategory,
  options: {
    userId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
    error?: Error;
    duration?: number;
  } = {}
): Promise<void> {
  const entry: LogEntry = {
    level,
    category,
    message,
    userId: options.userId,
    requestId: options.requestId,
    metadata: options.metadata,
    timestamp: new Date(),
    duration: options.duration,
  };

  if (options.error) {
    entry.error = {
      name: options.error.name,
      message: options.error.message,
      stack: options.error.stack,
    };
  }

  // Store in memory
  logs.push(entry);
  if (logs.length > maxLogs) {
    logs.shift();
  }

  // Console output
  const prefix = `[${entry.timestamp.toISOString()}] ${level} [${category}]`;
  const errorInfo = entry.error ? ` - ${entry.error.name}: ${entry.error.message}` : '';
  const durationInfo = entry.duration ? ` (${entry.duration}ms)` : '';

  if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
    console.error(`${prefix} ${message}${errorInfo}${durationInfo}`);
    if (entry.error?.stack) {
      console.error(entry.error.stack);
    }
  } else if (level === LogLevel.WARN) {
    console.warn(`${prefix} ${message}${durationInfo}`);
  } else {
    console.log(`${prefix} ${message}${durationInfo}`);
  }

  // Create audit log in database
  try {
    if (category === LogCategory.PAYMENT || category === LogCategory.INVOICE) {
      await prisma.auditLog.create({
        data: {
          userId: options.userId || 'system',
          action: `${category}_${level}`,
          entityType: category.toString(),
          entityId: options.metadata?.entityId || 'unknown',
          metadata: JSON.stringify(entry),
          createdAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

/**
 * Log payment operation
 */
export async function logPayment(
  message: string,
  level: LogLevel = LogLevel.INFO,
  options: {
    userId?: string;
    requestId?: string;
    invoiceId?: string;
    amount?: number;
    method?: string;
    status?: string;
    duration?: number;
    error?: Error;
  } = {}
): Promise<void> {
  await log(level, message, LogCategory.PAYMENT, {
    userId: options.userId,
    requestId: options.requestId,
    metadata: {
      invoiceId: options.invoiceId,
      amount: options.amount,
      method: options.method,
      status: options.status,
      entityId: options.invoiceId,
    },
    error: options.error,
    duration: options.duration,
  });
}

/**
 * Log invoice operation
 */
export async function logInvoice(
  message: string,
  level: LogLevel = LogLevel.INFO,
  options: {
    userId?: string;
    requestId?: string;
    invoiceId?: string;
    customerId?: string;
    status?: string;
    amount?: number;
    duration?: number;
    error?: Error;
  } = {}
): Promise<void> {
  await log(level, message, LogCategory.INVOICE, {
    userId: options.userId,
    requestId: options.requestId,
    metadata: {
      invoiceId: options.invoiceId,
      customerId: options.customerId,
      status: options.status,
      amount: options.amount,
      entityId: options.invoiceId,
    },
    error: options.error,
    duration: options.duration,
  });
}

/**
 * Log security event
 */
export async function logSecurity(
  message: string,
  level: LogLevel,
  options: {
    userId?: string;
    requestId?: string;
    ipAddress?: string;
    endpoint?: string;
    details?: Record<string, any>;
    error?: Error;
  } = {}
): Promise<void> {
  await log(level, message, LogCategory.SECURITY, {
    userId: options.userId,
    requestId: options.requestId,
    metadata: {
      ipAddress: options.ipAddress,
      endpoint: options.endpoint,
      ...options.details,
      entityId: options.ipAddress,
    },
    error: options.error,
  });
}

/**
 * Log validation error
 */
export async function logValidation(
  message: string,
  options: {
    userId?: string;
    requestId?: string;
    field?: string;
    value?: any;
    rule?: string;
    error?: Error;
  } = {}
): Promise<void> {
  await log(LogLevel.WARN, message, LogCategory.VALIDATION, {
    userId: options.userId,
    requestId: options.requestId,
    metadata: {
      field: options.field,
      value: options.value,
      rule: options.rule,
    },
    error: options.error,
  });
}

/**
 * Track API call for metrics
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number
): void {
  const key = `${method} ${endpoint}`;

  let metrics = apiMetrics.get(key);
  if (!metrics) {
    metrics = {
      endpoint,
      method,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
    apiMetrics.set(key, metrics);
  }

  metrics.totalCalls++;
  if (statusCode >= 200 && statusCode < 400) {
    metrics.successfulCalls++;
  } else {
    metrics.failedCalls++;
  }

  // Update average response time
  metrics.averageResponseTime =
    (metrics.averageResponseTime * (metrics.totalCalls - 1) + responseTime) /
    metrics.totalCalls;

  metrics.errorRate = metrics.failedCalls / metrics.totalCalls;
}

/**
 * Track database query for metrics
 */
export function trackDbQuery(duration: number, error?: boolean): void {
  queryMetrics.total++;
  if (duration > 100) {
    queryMetrics.slow++;
  }
  if (error) {
    queryMetrics.errors++;
  }

  // Update average
  queryMetrics.averageTime = (queryMetrics.averageTime * (queryMetrics.total - 1) + duration) / queryMetrics.total;
}

/**
 * Get all logs
 */
export function getLogs(options: {
  level?: LogLevel;
  category?: LogCategory;
  userId?: string;
  limit?: number;
} = {}): LogEntry[] {
  let filtered = [...logs];

  if (options.level) {
    filtered = filtered.filter((log) => log.level === options.level);
  }
  if (options.category) {
    filtered = filtered.filter((log) => log.category === options.category);
  }
  if (options.userId) {
    filtered = filtered.filter((log) => log.userId === options.userId);
  }

  // Return most recent first, limited
  return filtered.reverse().slice(0, options.limit || 100);
}

/**
 * Get API metrics
 */
export function getApiMetrics(endpoint?: string): ApiMetrics | ApiMetrics[] {
  if (endpoint) {
    return Array.from(apiMetrics.values()).filter((m) => m.endpoint === endpoint);
  }
  return Array.from(apiMetrics.values());
}

/**
 * Get query metrics
 */
export function getQueryMetrics(): QueryMetrics {
  return { ...queryMetrics };
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const apiList = Array.from(apiMetrics.values());
  const slowestEndpoint = apiList.reduce((prev, current) =>
    prev.averageResponseTime > current.averageResponseTime ? prev : current
  );

  const errorProneEndpoint = apiList.reduce((prev, current) =>
    prev.errorRate > current.errorRate ? prev : current
  );

  return {
    totalApiCalls: Array.from(apiMetrics.values()).reduce(
      (sum, m) => sum + m.totalCalls,
      0
    ),
    totalDbQueries: queryMetrics.total,
    slowDbQueries: queryMetrics.slow,
    avgDbQueryTime: queryMetrics.averageTime.toFixed(2),
    slowestEndpoint,
    errorProneEndpoint,
    logCount: logs.length,
  };
}

/**
 * Get logs for a specific request
 */
export function getRequestLogs(requestId: string): LogEntry[] {
  return logs.filter((log) => log.requestId === requestId);
}

/**
 * Clear old logs
 */
export function clearOldLogs(beforeDate: Date): number {
  const initialLength = logs.length;
  const filtered = logs.filter((log) => log.timestamp > beforeDate);
  logs.length = 0;
  logs.push(...filtered);
  return initialLength - logs.length;
}

/**
 * Export logs as JSON
 */
export function exportLogs(options: {
  format?: 'json' | 'csv';
  level?: LogLevel;
  category?: LogCategory;
} = {}): string {
  const filtered = getLogs({
    level: options.level,
    category: options.category,
    limit: 10000,
  });

  if (options.format === 'csv') {
    const header = 'Timestamp,Level,Category,Message,UserId,Duration';
    const rows = filtered.map(
      (log) =>
        `"${log.timestamp.toISOString()}","${log.level}","${log.category}","${log.message.replace(
          /"/g,
          '""'
        )}","${log.userId || ''}","${log.duration || ''}"`
    );
    return [header, ...rows].join('\n');
  }

  return JSON.stringify(filtered, null, 2);
}

/**
 * Create performance report
 */
export function createPerformanceReport() {
  const summary = getPerformanceSummary();
  const apiMetrics = getApiMetrics();
  const queryMetrics = getQueryMetrics();

  return {
    timestamp: new Date().toISOString(),
    summary,
    endpoints: apiMetrics,
    database: queryMetrics,
    recentErrors: getLogs({ level: LogLevel.ERROR, limit: 20 }),
  };
}

export default {
  log,
  logPayment,
  logInvoice,
  logSecurity,
  logValidation,
  trackApiCall,
  trackDbQuery,
  getLogs,
  getApiMetrics,
  getQueryMetrics,
  getPerformanceSummary,
  getRequestLogs,
  clearOldLogs,
  exportLogs,
  createPerformanceReport,
};
