'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (token) {
      // If logged in, redirect to dashboard
      router.push('/dashboard');
    } else {
      // Redirect to login page
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
