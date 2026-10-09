/**
 * IndexedDB storage engine for long-duration audio recording (4-8+ hours).
 * Stores audio Blobs on disk rather than holding them in browser RAM heap.
 */

const DB_NAME = 'TavernEcho_SessionDB';
const DB_VERSION = 1;
const BLOB_STORE = 'audio_blobs';
const META_STORE = 'session_metadata';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlobToDb(key: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE], 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const req = store.put(blob, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioBlobFromDb(key: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE], 'readonly');
    const store = tx.objectStore(BLOB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioBlobFromDb(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE], 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveSessionMetadata(key: string, data: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE], 'readwrite');
    const store = tx.objectStore(META_STORE);
    const req = store.put(data, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSessionMetadata(key: string): Promise<any> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE], 'readonly');
    const store = tx.objectStore(META_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function estimateStorageQuota(): Promise<{
  usageMb: number;
  quotaMb: number;
  percentUsed: number;
  estimatedHoursRemaining: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMb = Math.round((estimate.usage || 0) / (1024 * 1024));
      const quotaMb = Math.round((estimate.quota || 1024 * 1024 * 1024) / (1024 * 1024));
      const percentUsed = Math.min(100, Math.round((usageMb / quotaMb) * 100));

      // Opus at 64kbps consumes roughly ~28MB per hour
      const freeMb = Math.max(0, quotaMb - usageMb);
      const estimatedHoursRemaining = Math.floor(freeMb / 30);

      return { usageMb, quotaMb, percentUsed, estimatedHoursRemaining };
    } catch {
      // Fallback
    }
  }
  return { usageMb: 0, quotaMb: 5000, percentUsed: 1, estimatedHoursRemaining: 150 };
}
