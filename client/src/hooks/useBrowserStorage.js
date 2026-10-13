import { useState, useEffect, useRef } from 'react';

/**
 * Safely resolve a Web Storage object.
 * Accessing `window.localStorage` / `window.sessionStorage` can itself throw
 * (e.g. Safari private mode, cookies disabled, sandboxed iframes), so guard it.
 */
function getStorage(type) {
  try {
    if (typeof window === 'undefined') return null;
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    // Probe to make sure the storage is actually usable.
    const probe = '__declaraform_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Write a value to storage without ever throwing.
 * Returns true on success, false otherwise.
 */
function safeSetItem(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError (storage full) or SecurityError - never crash the app.
    console.warn(`[storage] Could not save "${key}":`, error?.name || error);
    return false;
  }
}

/**
 * Read and parse a value from storage. Falls back to `initialValue` if the
 * key is missing, the JSON is corrupt, or storage is unavailable.
 * Stored objects are shallow-merged over `initialValue` so newly added fields
 * still get their defaults when an older draft is restored.
 */
function readValue(storage, key, initialValue) {
  if (!storage) return initialValue;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return initialValue;
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
      initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue)
    ) {
      return { ...initialValue, ...parsed };
    }
    return parsed;
  } catch (error) {
    console.warn(`[storage] Could not read "${key}", using defaults:`, error?.name || error);
    return initialValue;
  }
}

/**
 * useState that persists to sessionStorage or localStorage.
 *
 * @param {string} key            Storage key.
 * @param {*} initialValue        Default value (or a function returning it).
 * @param {object} [options]
 * @param {'session'|'local'} [options.type='session']  Which storage to use.
 * @param {number} [options.debounceMs=300]  Delay writes so we don't serialize
 *        large signature data URLs on every keystroke.
 * @param {(value:any) => any} [options.fallback]  If saving the full value fails
 *        (e.g. storage full), this reduced version is tried instead - for example
 *        the form without its signature images.
 */
export default function useBrowserStorage(key, initialValue, options = {}) {
  const { type = 'session', debounceMs = 300, fallback } = options;

  const storageRef = useRef(null);
  if (storageRef.current === null) {
    storageRef.current = getStorage(type) || false;
  }
  const storage = storageRef.current || null;

  const [value, setValue] = useState(() => {
    const init = typeof initialValue === 'function' ? initialValue() : initialValue;
    return readValue(storage, key, init);
  });

  // Keep the latest fallback without re-triggering the save effect.
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    if (!storage) return undefined;

    const timer = setTimeout(() => {
      let serialized;
      try {
        serialized = JSON.stringify(value);
      } catch (error) {
        console.warn(`[storage] Could not serialize "${key}":`, error);
        return;
      }

      if (safeSetItem(storage, key, serialized)) return;

      // Full save failed - try the reduced version if one was provided.
      if (fallbackRef.current) {
        try {
          const reduced = JSON.stringify(fallbackRef.current(value));
          if (safeSetItem(storage, key, reduced)) return;
        } catch {
          /* fall through */
        }
      }

      // Nothing fit: drop the stale draft so an outdated copy isn't restored later.
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, value, storage, debounceMs]);

  const clear = () => {
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    setValue(typeof initialValue === 'function' ? initialValue() : initialValue);
  };

  return [value, setValue, clear];
}
