'use client';
import { useEffect } from 'react';

const SYNC_QUEUE_KEY = 'drizzle-sync-queue';

/**
 * Drains the offline sync queue — retries any highlight saves that failed
 * while the user was offline. Runs on mount and on 'online' events.
 */
export default function SyncQueueDrainer() {
  useEffect(() => {
    async function drainSyncQueue() {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!raw) return;

      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining: any[] = [];
      for (const item of queue) {
        try {
          const res = await fetch('/api/save-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfId: item.pdfId,
              highlights: item.highlights,
            }),
          });
          if (!res.ok) throw new Error('Failed');
        } catch {
          remaining.push(item); // still failing, keep in queue
        }
      }
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
    }

    // Drain on mount
    drainSyncQueue();

    // Drain when we come back online
    const handleOnline = () => drainSyncQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null; // This component renders nothing
}
