# Advanced Reporting & Analytics + PWA Implementation Guide

## Overview

This implementation provides comprehensive financial analytics, advanced reporting capabilities, and Progressive Web App (PWA) support for Elegante. Users can now view real-time financial dashboards, export reports in PDF/Excel format, and access the platform as a native mobile app.

## Architecture

### Backend Stack
- **Analytics Service** (`lib/analytics-service.ts`) - Core financial calculations
- **Export Service** (`lib/export-service.ts`) - PDF/Excel export functionality
- **API Endpoints** - RESTful endpoints for analytics and reporting
- **Database** - Prisma ORM with PostgreSQL

### Frontend Stack
- **React Components** - Dashboard, export buttons, offline indicator
- **Recharts** - Interactive data visualizations
- **ExcelJS & jsPDF** - File generation libraries
- **Service Worker** - Offline support and caching

## Features

### 1. Financial Analytics Dashboard

#### Endpoint
```bash
GET /api/analytics/dashboard
```

#### Metrics Provided
- **Revenue Metrics**: Total revenue, expenses, net income
- **Balance Sheet**: Total assets, liabilities, equity
- **Working Capital**: Accounts receivable, accounts payable, cash balance
- **Invoice Summary**: Paid/unpaid invoice counts
- **Financial Ratios**: 8 key performance indicators

#### Financial Ratios Calculated
1. **Debt-to-Equity** - Liabilities ÷ Equity (measure financial leverage)
2. **Current Ratio** - Current Assets ÷ Current Liabilities (liquidity)
3. **Quick Ratio** - (Current Assets - Inventory) ÷ Current Liabilities (acid test)
4. **Debt-to-Assets** - Total Liabilities ÷ Total Assets (financial risk)
5. **Asset Turnover** - Revenue ÷ Average Assets (efficiency)
6. **ROA** - Net Income ÷ Average Assets (return on assets)
7. **ROE** - Net Income ÷ Average Equity (return on equity)
8. **Profit Margin** - Net Income ÷ Revenue (profitability)

#### Authentication
Required: JWT token in Authorization header
Required Role: ADMIN or FINANCE_MANAGER

#### Response Example
```json
{
  "data": {
    "totalRevenue": 500000,
    "totalExpenses": 300000,
    "netIncome": 200000,
    "totalAssets": 1500000,
    "totalLiabilities": 800000,
    "totalEquity": 700000,
    "cashBalance": 150000,
    "accountsReceivable": 200000,
    "accountsPayable": 100000,
    "unpaidInvoiceCount": 15,
    "paidInvoiceCount": 120,
    "financialRatios": {
      "debtToEquity": 1.14,
      "currentRatio": 1.75,
      "quickRatio": 1.25,
      ...
    }
  }
}
```

### 2. Aging Report

#### Endpoint
```bash
GET /api/analytics/aging-report?asOfDate=2024-01-15
```

#### Query Parameters
- `asOfDate` (optional) - Analysis date (defaults to today)

#### Aging Buckets
- 0-30 days
- 31-60 days
- 61-90 days
- 90+ days

#### Response Example
```json
{
  "data": {
    "asOfDate": "2024-01-15T00:00:00Z",
    "agingBuckets": [
      {
        "range": "0-30 Days",
        "dayRange": "0-30",
        "invoiceCount": 45,
        "totalAmount": 125000,
        "percentage": 45.5
      },
      ...
    ],
    "totalAmount": 275000,
    "totalInvoices": 65
  }
}
```

### 3. Cash Flow Forecast

#### Endpoint
```bash
GET /api/analytics/cash-flow?startDate=2024-01-01&endDate=2024-01-31
```

#### Query Parameters
- `startDate` (required) - Forecast start date
- `endDate` (required) - Forecast end date

#### Daily Forecast Data
Each day includes:
- Date
- Projected inflows
- Projected outflows
- Net flow
- Cumulative balance

#### Response Example
```json
{
  "data": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "forecast": [
      {
        "date": "2024-01-01",
        "inflows": 50000,
        "outflows": 35000,
        "netFlow": 15000,
        "cumulativeBalance": 150000
      },
      ...
    ]
  }
}
```

### 4. Report Export

#### Endpoint
```bash
GET /api/exports?type=dashboard&format=pdf
```

#### Query Parameters
- `type` - Report type: `aging`, `cashflow`, or `dashboard`
- `format` - Export format: `pdf` or `xlsx`
- `asOfDate` - (for aging reports)
- `startDate` - (for cash flow)
- `endDate` - (for cash flow)

#### Features
- **Professional Formatting** - Headers, footers, colors
- **Multi-page Support** - Long reports span multiple pages
- **Currency Formatting** - Automatic currency formatting
- **Conditional Colors** - Red for negative, green for positive

### 5. Custom Report Builder

#### Create Report Template
```bash
POST /api/reports
Content-Type: application/json

{
  "name": "Monthly Financial Summary",
  "description": "Custom monthly financial report",
  "reportType": "dashboard",
  "columns": ["date", "amount", "customer", "status"],
  "filters": {
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "customer": "ACME Corp"
  }
}
```

#### List Reports
```bash
GET /api/reports?limit=10&offset=0
```

#### Get Report
```bash
GET /api/reports/<id>
```

#### Update Report
```bash
PUT /api/reports/<id>
Content-Type: application/json

{
  "name": "Updated Report Name",
  "columns": ["date", "amount", "status"]
}
```

#### Delete Report
```bash
DELETE /api/reports/<id>
```

### Available Report Columns
- `date` - Transaction date
- `amount` - Transaction amount
- `customer` - Customer/vendor name
- `status` - Transaction status (paid/unpaid)
- `reference` - Invoice/transaction reference
- `description` - Transaction description
- `daysOutstanding` - Days overdue
- `invoiceCount` - Number of invoices
- `totalAmount` - Total amount

## Progressive Web App (PWA)

### Features

#### 1. Offline Support
- Cached static assets for offline browsing
- API responses cached using stale-while-revalidate strategy
- Offline indicator shown in header
- Syncs data when connection restored

#### 2. Installation
- Native install prompt on compatible browsers
- Install button in header (when available)
- Works as standalone app on mobile devices

#### 3. Push Notifications
- Real-time push notifications for alerts
- Background sync for data synchronization
- Works even when app is not active

#### 4. Caching Strategy
- **Static Assets**: Cache first (offline, then network)
- **API Calls**: Stale while revalidate (serves cache immediately, updates in background)
- **User Data**: Network first with fallback to cache

### Installation

The PWA automatically registers the service worker on app load. Users can:

1. **Web App Install** (Chrome, Edge, Opera)
   - Click "Install App" button in header
   - Or use browser menu → "Install Elegante"
   - Appears as desktop/home screen icon

2. **iOS (Safari)**
   - Share → Add to Home Screen
   - Creates home screen shortcut
   - Works in standalone mode

3. **Android (Chrome)**
   - Menu (three dots) → "Install app"
   - Or use system install prompt
   - Full PWA experience

### Service Worker

Location: `public/service-worker.js`

#### Lifecycle
- **Install**: Caches static assets
- **Activate**: Cleans up old caches
- **Fetch**: Intercepts requests, applies caching strategy

#### Push Events
- Receives push notifications
- Displays system notifications
- Syncs data in background

#### Cache Names
- `elegante-v1` - Static assets
- `elegante-api-v1` - API responses

### Configuration

#### Manifest
Location: `public/manifest.json`

Configured with:
- App names and descriptions
- Icons at various sizes (192x512px + maskable)
- Start URL and display mode
- Theme colors
- Shortcuts for quick access
- Share target configuration

#### Meta Tags (in `app/layout.tsx`)
```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#3b82f6" />
```

## Components

### AnalyticsDashboard (`app/components/AnalyticsDashboard.tsx`)

Main dashboard component displaying:
- Financial summary cards (revenue, expenses, income, cash)
- Asset/liability/equity breakdown
- Receivables/payables summary
- Interactive charts (area, pie, bar)
- Financial ratios display
- Export buttons

Features:
- Auto-refresh every 30 seconds
- Real-time data fetching
- Error handling and retry
- Responsive design

### PWAInstallButton (`app/components/PWAInstallButton.tsx`)

Installation button displayed when:
- Service worker is registered
- App is installable (beforeinstallprompt fired)
- User is online
- Browser supports PWA installation

### OfflineIndicator (`app/components/OfflineIndicator.tsx`)

Displayed when:
- No internet connection
- Shows warning about limited features
- Auto-hides when connection restored

## Hooks

### useServiceWorker (`lib/hooks/useServiceWorker.ts`)

Provides:
- Service worker registration status
- Online/offline status
- App installability status
- Install trigger function
- Unregister function

## Database Schema

### ReportTemplate Model

```prisma
model ReportTemplate {
  id              String   @id @default(cuid())
  name            String
  description     String?
  reportType      String   // aging, cashflow, dashboard
  columns         Json     @default("[]")
  filters         Json     @default("{}")
  
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  createdBy       User     @relation(fields: [createdById], references: [id], onDelete: Cascade)
  
  @@index([createdById])
  @@index([reportType])
  @@index([createdAt])
}
```

## Error Handling

### API Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Server error

### Service Function Error Handling

All service functions wrap operations in try-catch:

```typescript
try {
  // Operation
} catch (error) {
  console.error('Descriptive error:', error);
  throw new Error('User-friendly error message');
}
```

## Security

### Authentication
- JWT required on all analytics APIs
- Role-based access control (ADMIN, FINANCE_MANAGER)
- User verification on report CRUD operations

### Authorization
- Compare user ID with report creator
- Admins can access all reports
- Others limited to own reports

### Data Protection
- No sensitive data cached offline
- Service worker only caches approved APIs
- Push notifications don't contain sensitive data

## Performance Optimization

### Frontend
- Lazy loading of components
- Memoization of expensive calculations
- Responsive charts with Recharts
- Efficient re-rendering with React hooks

### Backend
- Database query optimization with Prisma
- Caching of frequent calculations
- Batch operations where possible
- Connection pooling

### Network
- Service worker caching reduces requests
- API responses include etags for smart caching
- Stale-while-revalidate strategy improves perceived performance

## Mobile Responsiveness

### Breakpoints
- Mobile: < 640px (tailwind: `max-w-sm`)
- Tablet: 640px - 1024px (tailwind: `md:`)
- Desktop: > 1024px (tailwind: `lg:`)

### Responsive Features
- Grid layouts adapt to screen size
- Charts scale to container
- Touch-friendly buttons and interactions
- Viewport meta tags configured

## Testing

### API Testing

```bash
# Dashboard metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/analytics/dashboard

# Aging report
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/analytics/aging-report?asOfDate=2024-01-15"

# Cash flow forecast
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/analytics/cash-flow?startDate=2024-01-01&endDate=2024-01-31"

# Export to PDF
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/exports?type=dashboard&format=pdf" \
  -o dashboard.pdf

# Export to Excel
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/exports?type=aging&format=xlsx" \
  -o aging-report.xlsx
```

### Component Testing

```typescript
// Test AnalyticsDashboard
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '@/app/components/AnalyticsDashboard';

test('renders dashboard and fetches metrics', async () => {
  render(<AnalyticsDashboard />);
  
  await waitFor(() => {
    expect(screen.getByText('Financial Dashboard')).toBeInTheDocument();
  });
});
```

## Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL database
- HTTPS enabled (required for PWA)

### Environment Variables
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

### Build & Deploy
```bash
npm install
npm run build
npm start
```

### PWA Deployment Checklist
- [ ] Manifest.json configured with app metadata
- [ ] Service worker deployed to `public/`
- [ ] HTTPS enabled (required)
- [ ] Icons at 192x192 and 512x512
- [ ] Meta tags in layout
- [ ] App tested on mobile devices
- [ ] Installation tested on iOS/Android
- [ ] Offline functionality tested

## Troubleshooting

### Service Worker Not Registering
1. Ensure HTTPS enabled (http://localhost:3000 OK for dev)
2. Check browser console for errors
3. Clear browser cache and reload
4. Verify file path: `/public/service-worker.js`

### Export Not Working
1. Check authorization token
2. Verify user has FINANCE_MANAGER or ADMIN role
3. Ensure database has sample data
4. Check browser download settings

### Dashboard Not Loading
1. Verify database connection
2. Check analytics service calculations
3. Ensure user is authenticated
4. Review network tab for API errors

### Offline Mode Issues
1. Check Network tab in DevTools
2. Verify cache storage (DevTools → Application → Cache)
3. Test with flight mode enabled
4. Clear service worker cache

## Future Enhancements

- **Advanced Filtering** - Multi-criteria report filtering
- **Saved Filters** - Quick filters for common queries
- **Scheduled Reports** - Automatic report generation
- **Email Distribution** - Send reports by email
- **Collaboration** - Share reports with team
- **Real-time Sync** - WebSocket updates for live data
- **Advanced Charting** - Custom chart builder
- **Data Export** - Format options (CSV, XML, JSON)
- **Machine Learning** - Predictive analytics
- **Audit Trail** - Track report access and modifications

## Support & Maintenance

### Monitoring
- Monitor API response times
- Track cache hit rates
- Watch for PWA install errors
- Monitor database query performance

### Updates
- Service worker cache-busting on deployments
- Database migrations for schema changes
- Dependency updates for security
- Browser compatibility testing

### Performance Baselines
- Dashboard API: < 500ms
- Export generation: < 2s
- Service worker install: < 100ms
- Cache hit rate: > 80%

