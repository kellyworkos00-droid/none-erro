# 📊 Logging & Monitoring System Guide

## Overview

The Elegante ERP system now includes comprehensive logging and monitoring capabilities for debugging, performance optimization, security tracking, and operational visibility.

---

## 🎯 Core Features

### 1. **Structured Logging System**
- **Categories**: Payment, Invoice, Auth, Security, Validation, Database, API, Performance
- **Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Request Tracing**: Track logs by request ID
- **Metrics Tracking**: Performance monitoring built-in

### 2. **API Metrics**
- Request counts and success rates
- Response time averages
- Error rate tracking
- Per-endpoint analysis

### 3. **Database Metrics**
- Query count tracking
- Slow query detection (>100ms)
- Average query time
- Error tracking

### 4. **Performance Analytics**
- System-wide performance summary
- Request/response time analysis
- Error-prone endpoint identification
- Database performance analysis

### 5. **Security Logging**
- Threat detection logging
- Authorization failures
- Security pattern violations
- IP-based tracking

---

## 🔧 How to Use

### Recording a Payment Log

```typescript
import { logPayment, LogLevel } from '@/lib/logging';

await logPayment('Payment recorded successfully', LogLevel.INFO, {
  userId: user.userId,
  requestId: req.id,
  invoiceId: 'inv-123',
  amount: 1000,
  method: 'BANK_TRANSFER',
  status: 'PAID',
  duration: 245, // milliseconds
});
```

### Recording a Validation Error

```typescript
import { logValidation } from '@/lib/logging';

await logValidation('Email validation failed', {
  userId: user.userId,
  requestId: req.id,
  field: 'email',
  value: 'invalid@example',
  rule: 'valid email format',
});
```

### Recording a Security Event

```typescript
import { logSecurity, LogLevel } from '@/lib/logging';

await logSecurity('Suspicious payment attempt detected', LogLevel.WARN, {
  userId: user.userId,
  requestId: req.id,
  ipAddress: req.ip,
  endpoint: '/api/payments',
  details: { threat: 'unusual_amount', amount: 999999 },
});
```

### Tracking API Calls

```typescript
import { trackApiCall } from '@/lib/logging';

const startTime = Date.now();
// ... process request ...
const responseTime = Date.now() - startTime;

trackApiCall('/api/payments', 'POST', 201, responseTime);
```

### Tracking Database Queries

```typescript
import { trackDbQuery } from '@/lib/logging';

const startTime = Date.now();
try {
  const result = await prisma.invoice.findUnique({...});
  const duration = Date.now() - startTime;
  trackDbQuery(duration, false); // false = no error
} catch (error) {
  trackDbQuery(Date.now() - startTime, true); // true = error occurred
}
```

---

## 📈 Monitoring Endpoints

### Get Performance Summary
```bash
GET /api/monitoring/metrics?type=summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalApiCalls": 1250,
    "totalDbQueries": 5432,
    "slowDbQueries": 23,
    "avgDbQueryTime": "45.67",
    "slowestEndpoint": {
      "endpoint": "/api/payments/bulk",
      "method": "POST",
      "averageResponseTime": 1234
    },
    "errorProneEndpoint": {
      "endpoint": "/api/invoices/:id",
      "method": "GET",
      "errorRate": 0.08
    },
    "logCount": 8932
  }
}
```

### Get Detailed Metrics
```bash
GET /api/monitoring/metrics?type=detailed
```

Returns: Performance summary + API metrics + Database metrics

### Get System Logs
```bash
GET /api/monitoring/metrics?type=logs&level=ERROR&category=PAYMENT&limit=50
```

**Query Parameters:**
- `level`: DEBUG, INFO, WARN, ERROR, CRITICAL (optional)
- `category`: PAYMENT, INVOICE, SECURITY, etc. (optional)
- `limit`: Max results (1-1000, default: 100)

### Get Performance Report
```bash
GET /api/monitoring/metrics?type=performance
```

Returns comprehensive performance analysis with recent errors.

### Health Check
```bash
GET /api/monitoring/metrics?type=health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-02-23T10:30:00Z",
    "metrics": {...},
    "alerts": {
      "slowQueries": false,
      "errorPrones": false,
      "highErrorRate": []
    }
  }
}
```

---

## 💾 Log Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **PAYMENT** | All payment operations | Recording, refunding, bulk processing |
| **INVOICE** | Invoice management | Status updates, aging reports |
| **AUTH** | Authentication events | Login, token validation |
| **SECURITY** | Security events | Threats, pattern violations |
| **VALIDATION** | Input validation | Format errors, range violations |
| **DATABASE** | DB operations | Queries, connections |
| **EXTERNAL_API** | Third-party APIs | Gateway calls, webhooks |
| **PERFORMANCE** | Performance metrics | Slow operations, timeouts |
| **SYSTEM** | System events | Startups, shutdowns |
| **USER** | User actions | Account changes, operations |

---

## 🎯 Log Levels

| Level | When to Use | Examples |
|-------|-----------|----------|
| **DEBUG** | Detailed development info | Variable values, execution flow |
| **INFO** | General information | Successful operations, progress |
| **WARN** | Something unexpected but handled | Validation warnings, retries |
| **ERROR** | Error that needs attention | Failed transactions, validation |
| **CRITICAL** | System-level failures | Database down, service unavailable |

---

## 📊 Metrics Dashboard

Access metrics via `GET /api/monitoring/metrics`:

### Available Metric Types

1. **Summary** (`?type=summary`)
   - Quick overview of system health
   - Total API calls, DB queries
   - Slow query count
   - Error-prone endpoints
   - Slowest endpoints

2. **Detailed** (`?type=detailed`)
   - Performance summary
   - All API endpoints with metrics
   - Database metrics
   - Request/response times

3. **Logs** (`?type=logs`)
   - Raw system logs
   - Filterable by level and category
   - Request ID search
   - User ID filtering

4. **Performance** (`?type=performance`)
   - Comprehensive performance report
   - Endpoint breakdown
   - Database analysis
   - Recent errors

5. **Health** (`?type=health`)
   - Quick health status
   - Alert summary
   - Error rate monitoring
   - Slow query detection

---

## 🔍 Search & Filter Logs

### Find Logs by Request ID
```typescript
import { getRequestLogs } from '@/lib/logging';

const logs = getRequestLogs('request-uuid-123');
// Returns all logs for that request
```

### Get Logs by Category
```bash
GET /api/monitoring/metrics?type=logs&category=PAYMENT
```

### Get Error Logs
```bash
GET /api/monitoring/metrics?type=logs&level=ERROR
```

### Get Recent Security Events
```bash
GET /api/monitoring/metrics?type=logs&category=SECURITY&limit=20
```

---

## 📈 Performance Optimization Tips

### Using Metrics to Optimize

1. **Identify Slow Endpoints**
   - Get metrics: `GET /api/monitoring/metrics?type=detailed`
   - Look at `averageResponseTime`
   - Optimize database queries or business logic

2. **Find N+1 Query Problems**
   - Check `slowDbQueries` count
   - Review logs for database queries
   - Add batch operations where needed

3. **Monitor Error Rates**
   - Track `errorRate` by endpoint
   - Investigate high-error endpoints
   - Add better error handling

4. **Optimize Validation**
   - Check `VALIDATION` logs
   - Find common validation failures
   - Improve client-side validation

---

## 🛡️ Security Monitoring

### Track Security Events
```typescript
import { logSecurity, LogLevel } from '@/lib/logging';

// Log suspicious activity
await logSecurity('Multiple failed login attempts', LogLevel.WARN, {
  ipAddress: req.ip,
  endpoint: '/api/auth/login',
  details: { attempts: 5, timeframe: '5 minutes' },
});
```

### Review Security Logs
```bash
GET /api/monitoring/metrics?type=logs&category=SECURITY
```

---

## 📋 Real-World Scenarios

### Scenario 1: Payment Recording Issue

1. User reports payment not recording
2. Get performance report:
   ```bash
   GET /api/monitoring/metrics?type=performance
   ```
3. Filter payment logs:
   ```bash
   GET /api/monitoring/metrics?type=logs&category=PAYMENT&limit=100
   ```
4. Find request ID for that user/time
5. Get detailed logs:
   ```bash
   GET /api/monitoring/metrics?type=logs
   ```
6. Analyze error messages and timestamps

### Scenario 2: Performance Degradation

1. System running slow
2. Check health:
   ```bash
   GET /api/monitoring/metrics?type=health
   ```
3. Get detailed metrics:
   ```bash
   GET /api/monitoring/metrics?type=detailed
   ```
4. Identify slow endpoint
5. Check slow queries:
   ```bash
   GET /api/monitoring/metrics?type=logs&level=WARN
   ```
6. Optimize database query or add caching

### Scenario 3: Security Audit

1. Review security events:
   ```bash
   GET /api/monitoring/metrics?type=logs&category=SECURITY
   ```
2. Check failed authentication:
   ```bash
   GET /api/monitoring/metrics?type=logs&category=AUTH&level=ERROR
   ```
3. Identify suspicious patterns
4. Review threat detections from notes

---

## 🔧 Integration Examples

### Express Middleware
```typescript
import { trackApiCall } from '@/lib/logging';

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    trackApiCall(req.path, req.method, res.statusCode, duration);
  });
  
  next();
});
```

### Database Logging
```typescript
import { trackDbQuery } from '@/lib/logging';

// Wrap Prisma queries
const result = await prisma.$transaction(async (tx) => {
  const start = Date.now();
  try {
    const result = await tx.invoice.findMany();
    trackDbQuery(Date.now() - start, false);
    return result;
  } catch (error) {
    trackDbQuery(Date.now() - start, true);
    throw error;
  }
});
```

### Request Context
```typescript
import { v4 as uuidv4 } from 'uuid';
import { logPayment, LogLevel } from '@/lib/logging';

export async function handlePayment(req) {
  const requestId = uuidv4();
  
  try {
    await logPayment('Processing', LogLevel.INFO, { requestId });
    // ... process payment ...
    await logPayment('Success', LogLevel.INFO, { requestId });
  } catch (error) {
    await logPayment('Failed', LogLevel.ERROR, { requestId, error });
  }
}
```

---

## 📊 KPIs to Monitor

### Business Metrics
- Total payments recorded daily
- Average payment processing time
- Successful payment rate
- Failed payment rate

### Technical Metrics
- API response times (target: <500ms)
- Database query times (target: <100ms)
- Error rate (target: <0.1%)
- Request throughput

### Security Metrics
- Authentication failures
- Authorization denials
- Security threat detections
- Unusual activity patterns

---

## 🚨 Alerting

### Set Up Alerts
```bash
# Alert if error rate > 5% on any endpoint
GET /api/monitoring/metrics?type=detailed
# Check errorRate field

# Alert if slow queries > 100
GET /api/monitoring/metrics?type=summary
# Check slowDbQueries field

# Alert if average response time > 1000ms
GET /api/monitoring/metrics?type=detailed
# Check averageResponseTime field
```

---

## 🔒 Data Retention

- **In-Memory Logs**: Last 10,000 entries
- **Audit Logs**: Persistent in database
- **Metrics**: Aggregate statistics (real-time)
- **Old Logs**: Clear using `clearOldLogs(beforeDate)`

---

## 📚 API Reference

### Core Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `log()` | Generic logging | void |
| `logPayment()` | Payment-specific logging | void |
| `logInvoice()` | Invoice-specific logging | void |
| `logSecurity()` | Security event logging | void |
| `logValidation()` | Validation error logging | void |
| `trackApiCall()` | Record API metrics | void |
| `trackDbQuery()` | Record DB metrics | void |
| `getLogs()` | Retrieve logs | LogEntry[] |
| `getApiMetrics()` | Get API metrics | ApiMetrics[] |
| `getQueryMetrics()` | Get DB metrics | QueryMetrics |
| `getPerformanceSummary()` | Get summary | Object |
| `createPerformanceReport()` | Full report | Report |

---

## 🎓 Best Practices

1. **Always include request ID** for request tracing
2. **Log at appropriate levels** - DEBUG for details, INFO for progress, ERROR for failures
3. **Include relevant context** - user ID, invoice ID, amounts, etc.
4. **Track performance** - Log duration for critical operations
5. **Monitor security** - Log authentication and authorization events
6. **Use categories** - Helps with filtering and analysis
7. **Clean up logs** - Periodically clear old logs to manage memory
8. **Extract metrics** - Use metrics endpoint to build dashboards

---

## 🔗 Related Documentation

- [`lib/logging.ts`](../../lib/logging.ts) - Implementation
- [`app/api/monitoring/route.ts`](../../app/api/monitoring/route.ts) - Monitoring endpoints
- [`PAYMENT_SYSTEM_SUMMARY.md`](../PAYMENT_SYSTEM_SUMMARY.md) - Payment logging examples

---

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: February 23, 2026
