import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ReaderDB extends DBSchema {
  pdfs: {
    key: string;
    value: {
      id: string;
      name: string;
      fileName: string;
      fileData: ArrayBuffer;
      fileSize: number;
      createdAt: string;
      lastOpenedAt: string;
    };
  };
  settings: {
    key: string;
    value: {
      pdfId: string;
      currentPage: number;
      zoom: number;
      theme: string;
      highlights: any[];
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;
if (typeof window !== 'undefined') {
  dbPromise = openDB<ReaderDB>('drizzle-local-store', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'pdfId' });
      }
    },
  });
}

export async function savePdfLocal(item: ReaderDB['pdfs']['value']) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('pdfs', item);
}

export async function getAllLocalPdfs() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAll('pdfs');
}

export async function getLocalPdf(id: string) {
  if (!dbPromise) return null;
  const db = await dbPromise;
  return await db.get('pdfs', id);
}

export async function deleteLocalPdf(id: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('pdfs', id);
  await db.delete('settings', id);
}

export async function updateLocalPdfName(id: string, newName: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const pdf = await db.get('pdfs', id);
  if (pdf) {
    pdf.name = newName;
    await db.put('pdfs', pdf);
  }
}

export async function savePdfSettingsLocal(settings: ReaderDB['settings']['value']) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('settings', settings);
}

export async function getPdfSettingsLocal(pdfId: string) {
  if (!dbPromise) return null;
  const db = await dbPromise;
  return await db.get('settings', pdfId);
}

export async function getAllPdfSettingsLocal() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAll('settings');
}
