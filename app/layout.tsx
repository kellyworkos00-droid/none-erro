import type { Metadata } from 'next';
import { Space_Grotesk, Fraunces } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import Header from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWARegister } from './components/PWARegister';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Kelly OS - ERP Suite',
  description: 'Production-ready ERP suite for finance and operations',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#3b82f6',
  keywords: ['ERP', 'Finance', 'Business', 'Management', 'Analytics'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/elegant-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/images/elegant-logo.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kelly OS" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} font-sans`}>
        <PWARegister />
        <OfflineIndicator />
        <ErrorBoundary>
          <Header />
          {children}
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#000',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
            }}
          />
        </ErrorBoundary>
      </body>
    </html>
  );
}
