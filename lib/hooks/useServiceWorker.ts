'use client';

import { useEffect, useState } from 'react';

interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isInstallable: boolean;
  deferredPrompt?: BeforeInstallPromptEvent | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const useServiceWorker = () => {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInstallable: false,
  });

  const [registrationError, setRegistrationError] = useState<Error | null>(null);

  useEffect(() => {
    if (!status.isSupported) {
      console.warn('Service Workers are not supported in this browser');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });

        console.log('Service Worker registered successfully:', registration);
        setStatus((prev) => ({ ...prev, isRegistered: true }));

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Handle controller change (new SW activated)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      } catch (error) {
        console.error('Failed to register Service Worker:', error);
        setRegistrationError(error instanceof Error ? error : new Error('Unknown error'));
      }
    };

    registerServiceWorker();

    // Listen for online/offline events
    const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setStatus((prev) => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: event,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [status.isSupported]);

  const installApp = async (): Promise<boolean> => {
    if (!status.deferredPrompt) {
      console.warn('Install prompt is not available');
      return false;
    }

    try {
      status.deferredPrompt.prompt();
      const { outcome } = await status.deferredPrompt.userChoice;

      setStatus((prev) => ({
        ...prev,
        isInstallable: false,
        deferredPrompt: null,
      }));

      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  };

  const unregisterServiceWorker = async (): Promise<boolean> => {
    if (!status.isSupported || !status.isRegistered) {
      return false;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        await registration.unregister();
      }

      setStatus((prev) => ({ ...prev, isRegistered: false }));
      return true;
    } catch (error) {
      console.error('Error unregistering Service Worker:', error);
      return false;
    }
  };

  return {
    ...status,
    registrationError,
    installApp,
    unregisterServiceWorker,
  };
};

export default useServiceWorker;
