import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SettingsQueueDB extends DBSchema {
  settings_queue: {
    key: string;
    value: {
      id: string;
      pdfId: string;
      payload: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SettingsQueueDB>> | null = null;
if (typeof window !== 'undefined') {
  dbPromise = openDB<SettingsQueueDB>('drizzle-settings-queue', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings_queue')) {
        db.createObjectStore('settings_queue', { keyPath: 'id' });
      }
    },
  });
}

export async function addSettingsToQueue(pdfId: string, payload: any) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('settings_queue', {
    id: crypto.randomUUID(),
    pdfId,
    payload,
    timestamp: Date.now()
  });
}

export async function getSettingsQueue() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAll('settings_queue');
}

export async function removeSettingFromQueue(id: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('settings_queue', id);
}