// Simple, fast IndexedDB and in-memory cache helper for storing PDF blobs and large files locally
const DB_NAME = 'sabeel_books_db';
const DB_VERSION = 1;
const STORE_NAME = 'books_files';

// In-memory cache to guarantee zero-latency, instant display without white screens
// when navigating back and forth between courses
const memoryBlobCache = new Map<string, Blob>();
const memoryUrlCache = new Map<string, string>();

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Synchronously retrieves cached object URL if available in memory
 */
export function getCachedBookPdfUrl(courseId: string): string | null {
  return memoryUrlCache.get(courseId) || null;
}

/**
 * Synchronously retrieves cached Blob if available in memory
 */
export function getCachedBookPdfBlob(courseId: string): Blob | null {
  return memoryBlobCache.get(courseId) || null;
}

export async function storeBookPdfFile(courseId: string, blob: Blob): Promise<void> {
  // Save in memory cache immediately
  memoryBlobCache.set(courseId, blob);
  if (!memoryUrlCache.has(courseId)) {
    memoryUrlCache.set(courseId, URL.createObjectURL(blob));
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, `book_pdf_${courseId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to store book PDF in IndexedDB:', e);
  }
}

export async function getStoredBookPdfFile(courseId: string): Promise<Blob | null> {
  // Check memory cache first for instant synchronous return
  if (memoryBlobCache.has(courseId)) {
    return memoryBlobCache.get(courseId)!;
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`book_pdf_${courseId}`);
      req.onsuccess = () => {
        const result = req.result || null;
        if (result instanceof Blob) {
          memoryBlobCache.set(courseId, result);
          if (!memoryUrlCache.has(courseId)) {
            memoryUrlCache.set(courseId, URL.createObjectURL(result));
          }
        }
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to retrieve book PDF from IndexedDB:', e);
    return null;
  }
}

export async function deleteStoredBookPdfFile(courseId: string): Promise<void> {
  // Revoke cached URL and clear memory
  const cachedUrl = memoryUrlCache.get(courseId);
  if (cachedUrl) {
    try {
      URL.revokeObjectURL(cachedUrl);
    } catch {}
    memoryUrlCache.delete(courseId);
  }
  memoryBlobCache.delete(courseId);

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(`book_pdf_${courseId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to delete book PDF from IndexedDB:', e);
  }
}
