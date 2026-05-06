'use client';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    // Check initial state
    if (!navigator.onLine) setOffline(true);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);


  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      background: '#3d3530', color: '#f7f4ef',
      textAlign: 'center', fontSize: '0.82rem',
      padding: '0.5rem 1rem', zIndex: 99999,
      letterSpacing: '0.02em',
      fontFamily: "'DM Sans', sans-serif",
      transition: 'all 0.4s ease',
      transform: offline ? 'translateY(0)' : 'translateY(-100%)',
      opacity: offline ? 1 : 0,
      pointerEvents: offline ? 'auto' : 'none',
    }}>
      🌧 You&apos;re offline — reading from local cache
    </div>
  );
}
