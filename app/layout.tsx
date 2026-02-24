import type { Metadata } from 'next';
import { Space_Grotesk, Fraunces } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import Header from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} font-sans`}>
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
