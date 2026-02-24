'use client';

import React, { useEffect, useState } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 text-center z-50 flex items-center justify-center gap-2">
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M13.477 14.89A6 6 0 015.11 2.526a6 6 0 008.367 8.368l5.657 5.657a1 1 0 11-1.414 1.414l-5.657-5.657z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">You&apos;re offline. Some features may be limited.</span>
    </div>
  );
};

export default OfflineIndicator;
