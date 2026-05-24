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

const DB_NAME = 'drizzle-local-store';
const DB_VERSION = 1;

function openReaderDB(): Promise<IDBPDatabase<ReaderDB>> {
  return openDB<ReaderDB>(DB_NAME, DB_VERSION, {
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

/**
 * Get a live DB connection. Re-opens automatically if the previous connection
 * was closed (e.g. after page navigation or hot-module reload).
 */
let _db: IDBPDatabase<ReaderDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ReaderDB> | null> {
  if (typeof window === 'undefined') return null;
  // Re-open if we have no connection or the previous one was closed
  if (!_db || _db.version === 0) {
    _db = await openReaderDB();
  }
  return _db;
}

/**
 * Wraps any IDB operation. If the connection turns out to be closed mid-call,
 * it reopens and retries exactly once.
 */
async function withDB<T>(op: (db: IDBPDatabase<ReaderDB>) => Promise<T>): Promise<T | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    return await op(db);
  } catch (err: any) {
    if (
      err?.name === 'InvalidStateError' ||
      err?.message?.includes('closing') ||
      err?.message?.includes('connection is closing')
    ) {
      // Connection was closed — reopen and retry once
      _db = null;
      const freshDb = await getDB();
      if (!freshDb) return null;
      return await op(freshDb);
    }
    throw err;
  }
}

export async function savePdfLocal(item: ReaderDB['pdfs']['value']) {
  try {
    await withDB(db => db.put('pdfs', item));
  } catch (err: any) {
    // DataError / IOError usually means the browser is out of storage quota.
    // Re-throw with a human-readable message so callers can show a toast.
    if (err?.name === 'DataError' || err?.message?.includes('IOError') || err?.message?.includes('blobs')) {
      throw new Error('Not enough storage space to save this PDF. Try deleting some existing PDFs first.');
    }
    throw err;
  }
}

export async function getAllLocalPdfs() {
  return (await withDB(db => db.getAll('pdfs'))) ?? [];
}

export async function getLocalPdf(id: string) {
  return await withDB(db => db.get('pdfs', id));
}

export async function deleteLocalPdf(id: string) {
  await withDB(async db => {
    await db.delete('pdfs', id);
    await db.delete('settings', id);
  });
}

export async function updateLocalPdfName(id: string, newName: string) {
  await withDB(async db => {
    const pdf = await db.get('pdfs', id);
    if (pdf) {
      pdf.name = newName;
      await db.put('pdfs', pdf);
    }
  });
}

export async function savePdfSettingsLocal(settings: ReaderDB['settings']['value']) {
  await withDB(db => db.put('settings', settings));
}

export async function getPdfSettingsLocal(pdfId: string) {
  return await withDB(db => db.get('settings', pdfId));
}

export async function getAllPdfSettingsLocal() {
  return (await withDB(db => db.getAll('settings'))) ?? [];
}
