// Stores original lease PDFs in IndexedDB, keyed by lease id. IndexedDB is used
// instead of localStorage because PDFs are far larger than the ~5 MB localStorage
// quota. Degrades gracefully (no-throw) where IndexedDB is unavailable, e.g. some
// file:// contexts — the rest of the app keeps working without attachments.

const DB_NAME = 'cretmdx';
const STORE = 'pdfs';
const TXN_STORE = 'txnAttachments';
const COI_STORE = 'coiPdfs'; // current Certificate of Insurance PDF, keyed by lease id

interface StoredPdf {
  name: string;
  type: string;
  blob: Blob;
}

export interface TxnAttachment {
  id: number;
  txnId: number;
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
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(TXN_STORE)) {
        const s = db.createObjectStore(TXN_STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('txnId', 'txnId', { unique: false });
      }
      if (!db.objectStoreNames.contains(COI_STORE)) db.createObjectStore(COI_STORE);
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface PdfExport {
  id: number;
  name: string;
  type: string;
  data: string; // base64
}

export async function exportAllPdfs(): Promise<PdfExport[]> {
  const ids = await listPdfIds();
  const out: PdfExport[] = [];
  for (const id of ids) {
    const rec = await getPdf(id);
    if (!rec) continue;
    const buf = await rec.blob.arrayBuffer();
    out.push({ id, name: rec.name, type: rec.type, data: bytesToBase64(new Uint8Array(buf)) });
  }
  return out;
}

export async function importPdfs(items: PdfExport[]): Promise<void> {
  await clearAllPdfs();
  for (const p of items) {
    try {
      const bytes = base64ToBytes(p.data);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: p.type || 'application/pdf' });
      const file = new File([blob], p.name || 'lease.pdf', { type: p.type || 'application/pdf' });
      await savePdf(p.id, file);
    } catch {
      /* skip malformed entry */
    }
  }
}

export async function clearAllPdfs(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
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
  openBlob(stored.blob);
  return true;
}

function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---- Transaction attachments (multiple files per transaction, device-local) ----
export async function addTxnAttachment(txnId: number, file: File): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TXN_STORE, 'readwrite');
      tx.objectStore(TXN_STORE).add({ txnId, name: file.name, type: file.type, blob: file });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* attachments unavailable in this environment */
  }
}

export async function listTxnAttachments(txnId: number): Promise<TxnAttachment[]> {
  try {
    const db = await openDb();
    return await new Promise<TxnAttachment[]>((resolve, reject) => {
      const tx = db.transaction(TXN_STORE, 'readonly');
      const req = tx.objectStore(TXN_STORE).index('txnId').getAll(txnId);
      req.onsuccess = () => resolve((req.result as TxnAttachment[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteTxnAttachment(id: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(TXN_STORE, 'readwrite');
      tx.objectStore(TXN_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function deleteTxnAttachmentsFor(txnId: number): Promise<void> {
  const list = await listTxnAttachments(txnId);
  for (const a of list) await deleteTxnAttachment(a.id);
}

export async function openTxnAttachment(att: TxnAttachment): Promise<void> {
  openBlob(att.blob);
}

// ---- COI certificate PDFs (one current cert per lease, device-local) ----
export async function saveCoiPdf(leaseId: number, file: File): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(COI_STORE, 'readwrite');
      tx.objectStore(COI_STORE).put({ name: file.name, type: file.type, blob: file } as StoredPdf, leaseId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* attachments unavailable in this environment */
  }
}

export async function getCoiPdf(leaseId: number): Promise<StoredPdf | null> {
  try {
    const db = await openDb();
    return await new Promise<StoredPdf | null>((resolve, reject) => {
      const tx = db.transaction(COI_STORE, 'readonly');
      const req = tx.objectStore(COI_STORE).get(leaseId);
      req.onsuccess = () => resolve((req.result as StoredPdf) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteCoiPdf(leaseId: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(COI_STORE, 'readwrite');
      tx.objectStore(COI_STORE).delete(leaseId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function listCoiPdfIds(): Promise<number[]> {
  try {
    const db = await openDb();
    return await new Promise<number[]>((resolve, reject) => {
      const tx = db.transaction(COI_STORE, 'readonly');
      const req = tx.objectStore(COI_STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result as number[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function openCoiPdf(leaseId: number): Promise<boolean> {
  const stored = await getCoiPdf(leaseId);
  if (!stored) return false;
  openBlob(stored.blob);
  return true;
}
