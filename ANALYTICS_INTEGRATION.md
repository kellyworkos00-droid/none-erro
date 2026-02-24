# Analytics & PWA Integration Guide

Quick reference for integrating Advanced Reporting, Analytics, and PWA features into the Elegante dashboard.

## Files Created

### Backend (API Endpoints)
- `app/api/exports/route.ts` - Export dashboard/reports to PDF/Excel
- `app/api/reports/route.ts` - List and create custom reports
- `app/api/reports/[id]/route.ts` - Get, update, delete reports

### Backend (Services)
- `lib/analytics-service.ts` - Financial calculations
- `lib/export-service.ts` - PDF/Excel export

### Frontend (Components)
- `app/components/AnalyticsDashboard.tsx` - Main dashboard
- `app/components/PWAInstallButton.tsx` - Install button
- `app/components/OfflineIndicator.tsx` - Connection status

### Frontend (Hooks)
- `lib/hooks/useServiceWorker.ts` - PWA management

### PWA (Background)
- `public/manifest.json` - App metadata
- `public/service-worker.js` - Offline support
- `app/layout.tsx` - Updated with meta tags

### Database
- `prisma/schema.prisma` - Added ReportTemplate model

### Documentation
- `ANALYTICS_PWA_GUIDE.md` - Complete documentation

## Implementation Steps

### 1. Add Dashboard to Navigation

Update your navigation/header to include an analytics link:

```tsx
<Link href="/analytics">
  <Icon name="chart-bar" />
  Analytics
</Link>
```

### 2. Create Analytics Page

Create `app/analytics/page.tsx`:

```tsx
import { AnalyticsDashboard } from '@/app/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

### 3. Add PWA Install Button to Header

Update your Header component:

```tsx
import { PWAInstallButton } from '@/app/components/PWAInstallButton';

export function Header() {
  return (
    <header>
      {/* ... other header content ... */}
      <PWAInstallButton />
    </header>
  );
}
```

### 4. Run Database Migration

Required before using custom report builder:

```bash
npx prisma migrate dev --name add-report-template
```

This creates the `report_templates` table.

## API Quick Reference

### Get Financial Dashboard
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/analytics/dashboard
```

### Export Dashboard as PDF
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/exports?type=dashboard&format=pdf" \
  -o dashboard.pdf
```

### Export Dashboard as Excel
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/exports?type=dashboard&format=xlsx" \
  -o dashboard.xlsx
```

### Get Aging Report
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/analytics/aging-report?asOfDate=2024-01-31"
```

### Get Cash Flow Forecast
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/analytics/cash-flow?startDate=2024-01-01&endDate=2024-01-31"
```

### Create Custom Report
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Report",
    "reportType": "dashboard",
    "columns": ["date", "amount", "customer"],
    "filters": {}
  }' \
  http://localhost:3000/api/reports
```

## Component Usage

### AnalyticsDashboard

```tsx
import AnalyticsDashboard from '@/app/components/AnalyticsDashboard';

export default function Page() {
  return <AnalyticsDashboard />;
}
```

Features:
- Auto-refresh every 30 seconds
- Export to PDF/Excel buttons
- Real-time metrics and charts
- Financial ratio analysis
- Cash flow visualization
- Aging report breakdown

### PWAInstallButton

```tsx
import PWAInstallButton from '@/app/components/PWAInstallButton';

export function Header() {
  return (
    <header>
      <PWAInstallButton />
    </header>
  );
}
```

Shows install button when:
- Browser supports PWA
- User is online
- Service worker registered
- App not already installed

### OfflineIndicator

```tsx
import OfflineIndicator from '@/app/components/OfflineIndicator';

// Already included in layout.tsx
// Shows warning bar when offline
```

## Customization

### Modify Chart Colors

Edit `app/components/AnalyticsDashboard.tsx`:

```tsx
const COLORS = {
  primary: '#3b82f6',      // Blue
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  neutral: '#6b7280',      // Gray
};
```

### Change Refresh Interval

In `AnalyticsDashboard.tsx`:

```tsx
useEffect(() => {
  fetchMetrics();
  const interval = setInterval(fetchMetrics, 60000); // 60 seconds
  return () => clearInterval(interval);
}, []);
```

### Customize Report Columns

In `app/api/reports/route.ts`, update `allowedColumns`:

```tsx
const allowedColumns = [
  'date',
  'amount',
  'customer',
  'status',
  'reference',
  'description',
  'daysOutstanding',
  'invoiceCount',
  'totalAmount',
  'YOUR_NEW_COLUMN', // Add custom columns
];
```

### Change PWA Theme Color

Update in `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  themeColor: '#3b82f6', // Change to your brand color
  // ...
};
```

Also update `public/manifest.json`:

```json
{
  "theme_color": "#3b82f6",
  ...
}
```

## Authentication

All analytics APIs require:
1. Valid JWT token in `Authorization: Bearer <token>` header
2. User role in ['ADMIN', 'FINANCE_MANAGER']

Add token to requests:

```ts
async function fetchAnalytics() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/analytics/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
}
```

## Error Handling

All components include built-in error boundaries:

```tsx
{error ? (
  <div className="bg-red-50 border border-red-200 rounded p-4">
    <p className="text-red-800">Error: {error}</p>
    <button onClick={fetchMetrics} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
      Retry
    </button>
  </div>
) : (
  // Component content
)}
```

## Performance Tips

1. **Lazy Load Dashboard** - Use React.lazy() for code splitting
2. **Memoize Charts** - Use React.memo() for Recharts components
3. **Debounce Filters** - Delay API calls while user types
4. **Cache API Responses** - Service worker handles this
5. **Optimize Images** - Scale dashboard icons appropriately

## Testing

### Test Dashboard Loading
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '@/app/components/AnalyticsDashboard';

test('loads and displays dashboard', async () => {
  render(<AnalyticsDashboard />);
  await waitFor(() => {
    expect(screen.getByText('Financial Dashboard')).toBeInTheDocument();
  });
});
```

### Test Offline Mode
In DevTools:
1. Network tab → Offline
2. Verify OfflineIndicator appears
3. Check cache storage for cached data

### Test PWA Installation
1. Chrome DevTools → Application → Manifest
2. Click "Add to shelf" 
3. Or use beforeinstallprompt in DevTools

## Deployment Checklist

- [ ] Database migration run: `npx prisma migrate deploy`
- [ ] Environment variables set (DATABASE_URL, DIRECT_URL)
- [ ] HTTPS enabled (required for PWA)
- [ ] Service worker deployed to `/public/`
- [ ] Manifest.json deployed
- [ ] Meta tags in layout.tsx
- [ ] Analytics page created and linked
- [ ] PWA install button added to header
- [ ] Tested on mobile devices
- [ ] Offline functionality verified
- [ ] Export functionality tested
- [ ] All 3 analytics endpoints verified

## Troubleshooting

### Dashboard shows "Loading..." forever
- Check browser console for API errors
- Verify database connection
- Ensure user has FINANCE_MANAGER role
- Check network tab for failed requests

### Export button not working
- Verify auth token is valid
- Check user has FINANCE_MANAGER role
- Browser downloads should be enabled
- Try exporting to different format

### PWA not installing
- Verify HTTPS enabled (localhost:3000 is OK for dev)
- Check service worker registered (DevTools → Application)
- Ensure manifest.json is valid
- Try Chrome/Edge (best PWA support)

### Offline features not working
- Service worker must be registered (see DevTools → Application)
- Only GET requests are cached
- Clear browser cache and retry
- Check service worker scope in DevTools

## Next Steps

1. **Add to Header Navigation** - Link to `/analytics`
2. **Create Reports Page** - CRUD UI for custom reports
3. **Setup Mobile Icons** - Add 192x192 and 512x512 images
4. **Test on Devices** - iOS Safari, Android Chrome
5. **Configure Scheduling** - Add cron jobs for reports
6. **Add Email Export** - Send reports via email
7. **Setup Push Notifications** - Alert users in real-time

## Support

For issues or questions:
1. Check `ANALYTICS_PWA_GUIDE.md` for detailed documentation
2. Review error messages in browser console
3. Test API endpoints with curl/Postman
4. Verify database migrations completed
5. Check service worker status in DevTools

