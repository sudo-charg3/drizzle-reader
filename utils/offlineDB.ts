/**
 * IndexedDB helpers for offline PDF caching.
 * Stores PDF ArrayBuffers so they can be read without a network connection.
 */

const DB_NAME = 'drizzle-offline-pdfs';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToIndexedDB(pdfId: string, arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: pdfId, data: arrayBuffer, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFromIndexedDB(pdfId: string): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(pdfId);
    request.onsuccess = () => {
      resolve(request.result ? request.result.data : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function checkIfCached(pdfId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count(IDBKeyRange.only(pdfId));
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function removeFromIndexedDB(pdfId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(pdfId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
