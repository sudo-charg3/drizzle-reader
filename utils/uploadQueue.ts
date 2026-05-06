import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface UploadQueueDB extends DBSchema {
  upload_queue: {
    key: string;
    value: {
      id: string;
      userId: string;
      bookName: string;
      fileName: string;
      fileData: ArrayBuffer;
      fileSize: number;
      createdAt: string;
      status: 'pending' | 'uploading' | 'synced';
    };
  };
}

let dbPromise: Promise<IDBPDatabase<UploadQueueDB>> | null = null;
if (typeof window !== 'undefined') {
  dbPromise = openDB<UploadQueueDB>('drizzle-upload-queue', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('upload_queue')) {
        db.createObjectStore('upload_queue', { keyPath: 'id' });
      }
    },
  });
}

export async function addToUploadQueue(item: Omit<UploadQueueDB['upload_queue']['value'], 'status'>) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('upload_queue', { ...item, status: 'pending' });
}

export async function getPendingUploads() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  const all = await db.getAll('upload_queue');
  return all.filter((item) => item.status === 'pending' || item.status === 'uploading');
}

export async function markUploadSynced(id: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const item = await db.get('upload_queue', id);
  if (item) {
    item.status = 'synced';
    await db.put('upload_queue', item);
  }
}

export async function removeUpload(id: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('upload_queue', id);
}