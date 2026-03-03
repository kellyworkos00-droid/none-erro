# Component Usage Guide

## 🎨 Using the New UI Components

### Theme Provider & Toggle

The ThemeProvider is already integrated into `layout.tsx`. Users can toggle themes via:
1. The theme toggle button in the header
2. Command palette search for "theme"

```tsx
// Automatically available throughout the app
import { useTheme } from '@/app/components/ThemeProvider';

export function MyComponent() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {effectiveTheme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
    </div>
  );
}
```

---

### Command Palette

The command palette is automatically available globally. Press **⌘K** or **Ctrl+K** to open.

To add more commands, edit `app/components/CommandPalette.tsx` and add items to the `COMMANDS` array:

```tsx
const COMMANDS: Command[] = [
  {
    id: 'my-command',
    label: 'My Command',
    description: 'What this command does',
    href: '/dashboard/my-page',
    icon: <Icon className="w-4 h-4" />,
    category: 'Navigation'
  },
  // ... more commands
];
```

---

### StatCard Component

Display key metrics with beautiful cards:

```tsx
import { StatCard } from '@/app/components/StatCard';
import { DollarSign, TrendingUp } from 'lucide-react';

export function MyDashboard() {
  return (
    <StatCard
      title="Monthly Revenue"
      value={45000}
      icon={<DollarSign />}
      color="blue"
      change={{ value: 12, isPositive: true }}
      description="Revenue this month"
    />
  );
}
```

**Props:**
- `title` (string) - Card title
- `value` (string | number) - Primary value displayed
- `icon` (ReactNode) - Icon to display
- `color` ('blue' | 'green' | 'red' | 'purple' | 'amber') - Icon background color
- `change` (optional) - Object with `value: number` and `isPositive: boolean`
- `description` (optional) - Small description text

**Colors available:**
- `blue` - Most common for general metrics
- `green` - Positive/success metrics
- `red` - Alerts/negative metrics
- `purple` - Advanced metrics
- `amber` - Warnings

---

### DashboardStatGrid Component

Automatically arrange multiple stat cards in a responsive grid:

```tsx
import { DashboardStatGrid } from '@/app/components/DashboardStatGrid';
import { DollarSign, Users, Package, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const stats = [
    {
      title: 'Total Revenue',
      value: 125000,
      icon: <DollarSign />,
      color: 'blue' as const,
      change: { value: 8, isPositive: true }
    },
    {
      title: 'Active Customers',
      value: 342,
      icon: <Users />,
      color: 'green' as const,
      change: { value: 5, isPositive: true }
    },
    {
      title: 'Stock Items',
      value: 1284,
      icon: <Package />,
      color: 'purple' as const,
      change: { value: -2, isPositive: false }
    },
    {
      title: 'Growth Rate',
      value: '24%',
      icon: <TrendingUp />,
      color: 'amber' as const,
    },
  ];

  return <DashboardStatGrid stats={stats} />;
}
```

---

### SectionHeader Component

Consistent headers for sections with optional action button:

```tsx
import { SectionHeader } from '@/app/components/SectionHeader';

export function MySection() {
  return (
    <>
      <SectionHeader
        title="Recent Transactions"
        description="Last 30 days of activity"
        action={{
          label: 'View All',
          href: '/dashboard/transactions'
        }}
      />
      {/* Your section content */}
    </>
  );
}
```

---

### QuickActions Component

Display action buttons for common tasks:

```tsx
import { QuickActions } from '@/app/components/QuickActions';
import { Plus, Upload, UserPlus, ShoppingCart } from 'lucide-react';

export function Dashboard() {
  const customActions = [
    {
      label: 'New Invoice',
      href: '/dashboard/invoices/new',
      icon: <Plus className="w-5 h-5" />,
      color: 'blue' as const,
    },
    {
      label: 'Upload Statement',
      href: '/dashboard/upload',
      icon: <Upload className="w-5 h-5" />,
      color: 'green' as const,
    },
    // ... more actions
  ];

  // Use default actions
  return <QuickActions />;
  
  // Or use custom actions
  // return <QuickActions actions={customActions} />;
}
```

**Color options:**
- `blue` - Primary actions
- `green` - Success/positive actions
- `purple` - Secondary actions
- `amber` - Warning actions

---

### ScrollToTop Component

Already integrated in `layout.tsx`. The button automatically:
- Appears when user scrolls down 300px
- Hides when at the top
- Smoothly scrolls to top on click

No additional setup needed!

---

### Footer Component

Already integrated in `layout.tsx`. Shows:
- Company info
- Quick navigation links
- Contact information
- Copyright notice

Customize by editing `app/components/Footer.tsx`.

---

### Header with Theme Toggle

Already integrated with new features:
- Theme toggle button
- Command palette access via button
- Mobile-responsive menu
- Dark mode support

---

## 🎯 Dark Mode CSS Classes

All Tailwind classes support dark mode with the `dark:` prefix:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  This adapts to light and dark mode
</div>
```

**Common dark mode patterns:**

```tsx
// Background
className="bg-white dark:bg-gray-800"

// Text
className="text-gray-900 dark:text-white"

// Borders
className="border-gray-200 dark:border-gray-700"

// Hover states
className="hover:bg-gray-100 dark:hover:bg-gray-700"

// Cards
className="bg-white/80 dark:bg-gray-800/80"
```

---

## ⚡ Animation Classes

Use these new animation classes throughout your components:

```tsx
// Smooth transitions
<div className="transition-smooth">Content</div>

// Lift on hover
<div className="hover-lift">Hover me</div>

// Scale on hover
<div className="hover-scale">Hover me</div>

// Page entry animation
<div className="page-enter">Fades in</div>

// Staggered animation
<div className="stagger-rise">
  <div>First</div>
  <div>Second (80ms delay)</div>
  <div>Third (140ms delay)</div>
</div>
```

---

## 📱 Responsive Breakpoints

Components adapt to these Tailwind breakpoints:

- `sm` (640px) - Small devices
- `md` (768px) - Tablets
- `lg` (1024px) - Desktops
- `xl` (1280px) - Wide screens
- `2xl` (1536px) - Extra wide screens

Example:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>
```

---

## 🎨 Color Customization

Tailwind color scale available in `tailwind.config.js`:

```tsx
<div className="bg-primary-600 dark:bg-primary-700">
  Uses color scheme defined in config
</div>
```

Supported colors:
- `primary` (blues/sky) - Main brand color
- `success` (green) - Positive states
- `warning` (amber) - Warning states
- `danger` (red) - Error states

---

## 🔍 Testing Dark Mode

### Manual Testing
1. Click theme toggle in header
2. Try all three modes: Light, Dark, System
3. Verify all components look good

### Testing with Command Palette
1. Press ⌘K / Ctrl+K
2. Type "theme"
3. Select a theme option

### System Preference Testing
1. Set theme to "System"
2. Change OS dark mode setting
3. Verify app follows OS preference

---

## 📝 Best Practices

### When Creating New Components

1. **Always support dark mode:**
   ```tsx
   className="bg-white dark:bg-gray-800"
   ```

2. **Use semantic colors:**
   ```tsx
   // Good
   className="bg-success-50 dark:bg-success-900/30"
   
   // Avoid hardcoding colors
   className="bg-green-50 dark:bg-green-900"
   ```

3. **Test responsiveness:**
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1024px)

4. **Use smooth transitions:**
   ```tsx
   className="transition-colors duration-200"
   ```

5. **Follow component patterns:**
   - Use StatCard for metrics
   - Use SectionHeader for sections
   - Use QuickActions for actions
   - Use DashboardStatGrid for grids

---

## 🐛 Troubleshooting

**Dark mode not working?**
- Check if ThemeProvider wraps your app
- Verify `darkMode: 'class'` in tailwind.config.js
- Check browser console for errors

**Command palette not opening?**
- Ensure CommandPalette component is in layout
- Check if keyboard shortcuts are conflicting
- Try different keyboard combination

**Components not styled?**
- Import components correctly
- Check dark mode class applied to html
- Verify Tailwind CSS is compiling

---

For more help, refer to the main APP_ENHANCEMENTS.md file!
