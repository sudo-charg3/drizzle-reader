'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function OfflineAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && pathname !== '/login') {
          router.push('/login');
        }
      } catch (err) {
        // Fallback to offline check or assume logged out
        const stored = localStorage.getItem('drizzle-auth');
        if (!stored && pathname !== '/login') router.push('/login');
      } finally {
        setIsReady(true);
      }
    };
    checkAuth();

    const handleOnline = () => {
      supabase.auth.getSession();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [router, supabase, pathname]);

  // Always render children container to keep hook tree stable,
  // but hide content until auth check is complete.
  return (
    <>
      {!isReady && (
        <div className="h-screen w-screen flex items-center justify-center bg-[#f7f4ef] fixed inset-0 z-[10000]">
          <div className="flex flex-col items-center gap-4">
             <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
             <p className="text-sm font-medium text-gray-600 font-sans">Verifying session...</p>
          </div>
        </div>
      )}
      <div style={{ visibility: isReady ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </>
  );
}