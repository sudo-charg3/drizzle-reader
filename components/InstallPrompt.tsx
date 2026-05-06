'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 30 seconds if not dismissed before
      const dismissed = localStorage.getItem('drizzle-install-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShow(true), 30000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Chrome/Edge/Android — capture the prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('drizzle-install-dismissed');
      if (!dismissed) setTimeout(() => setShow(true), 10000); // show after 10s
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShow(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('drizzle-install-dismissed', '1');
  };

  if (!show || isInstalled) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(200,184,176,0.4)',
      borderRadius: '16px',
      padding: '1rem 1.25rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: '1rem',
      maxWidth: '360px', width: 'calc(100vw - 3rem)',
      zIndex: 9999,
      animation: 'slideUp 0.3s ease',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-72.png" width={40} height={40}
        style={{ borderRadius: '10px' }} alt="Drizzle Reader" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3d3530' }}>
          Install Drizzle Reader
        </div>
        <div style={{ fontSize: '0.78rem', color: '#8a7f7a', marginTop: '2px' }}>
          {isIOS
            ? 'Tap the share button then "Add to Home Screen"'
            : 'Install for offline reading & a better experience'}
        </div>
      </div>
      {!isIOS && (
        <button onClick={handleInstall} style={{
          padding: '0.5rem 1rem', borderRadius: '100px',
          background: '#3d3530', color: '#f7f4ef',
          border: 'none', fontSize: '0.82rem', cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Install
        </button>
      )}
      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', fontSize: '1.1rem',
        cursor: 'pointer', color: '#8a7f7a', padding: '0 0.25rem',
      }}>×</button>
    </div>
  );
}
