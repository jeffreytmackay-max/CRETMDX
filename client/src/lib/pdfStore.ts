// Stores original lease PDFs in IndexedDB, keyed by lease id. IndexedDB is used
// instead of localStorage because PDFs are far larger than the ~5 MB localStorage
// quota. Degrades gracefully (no-throw) where IndexedDB is unavailable, e.g. some
// file:// contexts — the rest of the app keeps working without attachments.

const DB_NAME = 'cretmdx';
const STORE = 'pdfs';

interface StoredPdf {
  name: string;
  type: string;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePdf(id: number, file: File): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ name: file.name, type: file.type, blob: file } as StoredPdf, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* attachments unavailable in this environment */
  }
}

export async function getPdf(id: number): Promise<StoredPdf | null> {
  try {
    const db = await openDb();
    return await new Promise<StoredPdf | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as StoredPdf) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deletePdf(id: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function listPdfIds(): Promise<number[]> {
  try {
    const db = await openDb();
    return await new Promise<number[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result as number[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Open the stored PDF in a new tab (object URL). Returns false if none stored.
export async function openPdf(id: number): Promise<boolean> {
  const stored = await getPdf(id);
  if (!stored) return false;
  const url = URL.createObjectURL(stored.blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
