'use client';

import { useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      // Register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js', {
            scope: '/',
          })
          .then((registration) => {
            console.log('✅ Service Worker registered successfully:', registration.scope);

            // Check for updates every hour
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('🔄 New version available!');
                    if (confirm('New version available! Reload to update?')) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error: Error) => {
            console.warn('⚠️ Service Worker registration failed:', error);
          });
      });
    } else {
      console.warn('⚠️ Service Workers not supported in this browser');
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      event.preventDefault();
      console.log('📱 PWA install prompt available');
    };

    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null;
}
