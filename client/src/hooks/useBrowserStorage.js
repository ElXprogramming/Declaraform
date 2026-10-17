import { useState, useEffect, useRef } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import { logSafeError } from '../utils/security';

/**
 * Explicit allowlist of non-sensitive course metadata keys permitted in Web Storage.
 * Per Pillar 1.3 (Client-Side Storage Security), PII (names, matric numbers, IC/passport
 * numbers, phone/email, signatures, group member rosters) and tokens/secrets must NEVER
 * be written to `localStorage` or `sessionStorage`.
 */
const ALLOWED_DRAFT_KEYS = new Set([
  'courseName',
  'courseCode',
  'assessmentType',
  'otherAssessment',
  'usedAITools',
  'date',
]);

const SENSITIVE_KEY_PATTERN =
  /(name|matric|ic|passport|phone|email|signature|member|token|jwt|secret|password|auth|key|ssn)/i;

/**
 * Strips any PII, biometric signature data, or credential/token fields from an object
 * before it can be read from or written to Web Storage.
 */
export function stripSensitiveFields(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  const sanitized = {};
  for (const [k, v] of Object.entries(data)) {
    if (ALLOWED_DRAFT_KEYS.has(k) && !SENSITIVE_KEY_PATTERN.test(k)) {
      if (typeof v === 'string' || typeof v === 'boolean') {
        sanitized[k] = typeof v === 'string' ? v.slice(0, 120) : v;
      }
    }
  }
  return sanitized;
}

/**
 * Safely resolve a Web Storage object.
 * Accessing `window.localStorage` / `window.sessionStorage` can itself throw
 * (e.g. Safari private mode, cookies disabled, sandboxed iframes), so guard it.
 */
function getStorage(type) {
  try {
    if (typeof window === 'undefined') return null;
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__declaraform_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Purges any legacy PII fields previously stored in `sessionStorage` or `localStorage`
 * by older versions of the application.
 */
export function purgeLegacyPiiStorage() {
  for (const type of ['session', 'local']) {
    const storage = getStorage(type);
    if (!storage) continue;

    for (const storageKey of Object.values(STORAGE_KEYS)) {
      try {
        const raw = storage.getItem(storageKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const scrubbed = stripSensitiveFields(parsed);
          storage.setItem(storageKey, JSON.stringify(scrubbed));
        } else {
          storage.removeItem(storageKey);
        }
      } catch {
        try {
          storage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
      }
    }
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
    logSafeError('useBrowserStorage.write', error);
    return false;
  }
}

/**
 * Read and parse a value from storage, stripping any PII or unknown keys.
 * Falls back to `initialValue` if the key is missing, JSON is corrupt, or storage is unavailable.
 */
function readValue(storage, key, initialValue) {
  if (!storage) return initialValue;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return initialValue;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      initialValue &&
      typeof initialValue === 'object' &&
      !Array.isArray(initialValue)
    ) {
      const safeRestored = stripSensitiveFields(parsed);
      return { ...initialValue, ...safeRestored };
    }
    return initialValue;
  } catch (error) {
    logSafeError('useBrowserStorage.read', error);
    return initialValue;
  }
}

/**
 * useState hook that persists ONLY non-sensitive course metadata to sessionStorage.
 * All PII (names, matric numbers, IC/passport numbers, contact details, signatures,
 * and group members) stays strictly in volatile React memory and is never persisted to disk.
 *
 * @param {string} key            Storage key.
 * @param {*} initialValue        Default value (or a function returning it).
 * @param {object} [options]
 * @param {'session'|'local'} [options.type='session']  Which storage to use.
 * @param {number} [options.debounceMs=300]  Delay writes.
 */
export default function useBrowserStorage(key, initialValue, options = {}) {
  const { type = 'session', debounceMs = 300 } = options;

  const storageRef = useRef(null);
  if (storageRef.current === null) {
    storageRef.current = getStorage(type) || false;
  }
  const storage = storageRef.current || null;

  const [value, setValue] = useState(() => {
    const init = typeof initialValue === 'function' ? initialValue() : initialValue;
    return readValue(storage, key, init);
  });

  useEffect(() => {
    if (!storage) return undefined;

    const timer = setTimeout(() => {
      let serialized;
      try {
        // Enforce Pillar 1.3: Strip all PII and sensitive fields before persisting
        const safePayload = stripSensitiveFields(value);
        serialized = JSON.stringify(safePayload);
      } catch (error) {
        logSafeError('useBrowserStorage.serialize', error);
        return;
      }

      if (safeSetItem(storage, key, serialized)) return;

      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, value, storage, debounceMs]);

  return [value, setValue];
}
