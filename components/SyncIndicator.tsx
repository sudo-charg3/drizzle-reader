'use client';
import { useEffect, useState } from 'react';
import { syncEngine } from '@/utils/syncEngine';
import { Cloud, CloudLightning, CloudOff } from 'lucide-react';

export default function SyncIndicator() {
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    const handleOnline = () => {
      setStatus('syncing');
      syncEngine.triggerSync();
    };
    const handleOffline = () => setStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial sync
    if (navigator.onLine) {
      syncEngine.triggerSync();
    } else {
      setStatus('offline');
    }

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  return (
    <div 
      className="fixed top-4 right-4 z-[9999] flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-['DM_Sans'] text-gray-700 border border-gray-100 transition-all duration-300"
      style={{ 
        opacity: status === 'idle' ? 0 : 1,
        pointerEvents: status === 'idle' ? 'none' : 'auto',
        transform: status === 'idle' ? 'translateY(-10px)' : 'translateY(0)'
      }}
    >
      {status === 'syncing' && (
        <span key="syncing" className="flex items-center gap-2">
          <CloudLightning size={14} className="text-blue-500 animate-pulse" /> Syncing...
        </span>
      )}
      {status === 'offline' && (
        <span key="offline" className="flex items-center gap-2">
          <CloudOff size={14} className="text-gray-400" /> Offline
        </span>
      )}
      {status === 'error' && (
        <span key="error" className="flex items-center gap-2">
          <CloudOff size={14} className="text-red-500" /> Sync Error
        </span>
      )}
      {status === 'synced' && (
        <span key="synced" className="flex items-center gap-2">
          <Cloud size={14} className="text-green-500" /> Synced
        </span>
      )}
    </div>
  );
}