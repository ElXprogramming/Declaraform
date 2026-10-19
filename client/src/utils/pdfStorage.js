import { logSafeError, validatePdfUpload } from './security.js';

const DB_NAME = 'declaraform_pdf_storage';
const DB_VERSION = 1;
const STORE_NAME = 'merged_pdf_files';

/**
 * Open or initialize the IndexedDB instance for local PDF caching.
 */
function openDatabase() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        logSafeError('pdfStorage.openDatabase', request.error);
        resolve(null);
      };
    } catch (err) {
      logSafeError('pdfStorage.openDatabaseException', err);
      resolve(null);
    }
  });
}

/**
 * Save an array of uploaded PDF file items into IndexedDB.
 *
 * @param {Array<{ id: string, displayName: string, internalName: string, file: File }>} items
 */
export async function savePdfsToStorage(items) {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear();

      items.forEach((item, index) => {
        if (!item?.file) return;
        store.put({
          id: item.id,
          order: index,
          displayName: item.displayName,
          internalName: item.internalName,
          blob: item.file,
          name: item.file.name,
          type: item.file.type || 'application/pdf',
          lastModified: item.file.lastModified || Date.now(),
        });
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        logSafeError('pdfStorage.save', tx.error);
        resolve(false);
      };
      tx.onabort = () => resolve(false);
    } catch (err) {
      logSafeError('pdfStorage.saveException', err);
      resolve(false);
    }
  });
}

/**
 * Load and validate cached PDF file items from IndexedDB.
 *
 * @returns {Promise<Array<{ id: string, displayName: string, internalName: string, file: File }>>}
 */
export async function loadPdfsFromStorage() {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        const records = request.result || [];
        records.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const restoredItems = [];
        for (const record of records) {
          if (!record.blob) continue;

          const file =
            record.blob instanceof File
              ? record.blob
              : new File([record.blob], record.name || record.displayName || 'document.pdf', {
                  type: record.type || 'application/pdf',
                  lastModified: record.lastModified || Date.now(),
                });

          const validation = await validatePdfUpload(file);
          if (validation.valid) {
            restoredItems.push({
              id: record.id || validation.safeId,
              displayName: record.displayName || validation.displayName,
              internalName: record.internalName || validation.safeInternalName,
              file,
            });
          }
        }

        resolve(restoredItems);
      };

      request.onerror = () => {
        logSafeError('pdfStorage.load', request.error);
        resolve([]);
      };
    } catch (err) {
      logSafeError('pdfStorage.loadException', err);
      resolve([]);
    }
  });
}

/**
 * Remove all cached PDF files from IndexedDB.
 */
export async function clearPdfsFromStorage() {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
