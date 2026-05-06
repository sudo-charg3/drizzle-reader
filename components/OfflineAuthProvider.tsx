'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function OfflineAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && window.location.pathname !== '/login') {
          router.push('/login');
        }
      } catch (err) {
        // Fallback to offline check or assume logged out
        const stored = localStorage.getItem('drizzle-auth');
        if (!stored && window.location.pathname !== '/login') router.push('/login');
      } finally {
        setIsReady(true);
      }
    };
    checkAuth();

    const handleOnline = () => {
      // Refresh session when back online
      supabase.auth.getSession();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [router, supabase]);

  if (!isReady) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#f7f4ef]">Loading...</div>;
  }

  return <>{children}</>;
}