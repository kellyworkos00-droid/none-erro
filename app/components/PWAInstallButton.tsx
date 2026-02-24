'use client';

import React, { useState } from 'react';
import { useServiceWorker } from '@/lib/hooks/useServiceWorker';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isOnline, installApp, isRegistered } = useServiceWorker();
  const [installing, setInstalling] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  const handleInstall = async () => {
    if (!isOnline) {
      setShowOfflineWarning(true);
      setTimeout(() => setShowOfflineWarning(false), 3000);
      return;
    }

    setInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        console.log('App installed successfully');
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setInstalling(false);
    }
  };

  if (!isInstallable || !isRegistered) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstall}
        disabled={installing || !isOnline}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        title="Install Elegante as an app on your device"
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 1a1 1 0 011-1h12a1 1 0 011 1v2h2a2 2 0 012 2v13a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2h2V1z" />
          <path d="M15 13H5m0-2h10m0-2H5" />
        </svg>
        {installing ? 'Installing...' : 'Install App'}
      </button>

      {showOfflineWarning && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">You must be online to install the app</p>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
