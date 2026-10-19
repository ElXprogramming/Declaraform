import { useState, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEYS, ASSESSMENT_TYPES, GROUP_MEMBER_COUNT } from '../utils/constants.js';
import {
  FIELD_LIMITS,
  isSafeSignatureDataUrl,
  logSafeError,
  sanitizePlainText,
} from '../utils/security.js';

const ALLOWED_ASSESSMENT_SET = new Set([...ASSESSMENT_TYPES, 'Others']);
const EMPTY_MEMBER = Object.freeze({ name: '', matric: '', ic: '', signature: null });

/**
 * Validates and sanitizes individual declaration form drafts read from sessionStorage.
 */
function sanitizeIndividualDraft(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  return {
    fullName: sanitizePlainText(data.fullName, FIELD_LIMITS.NAME),
    matricNo: sanitizePlainText(data.matricNo, FIELD_LIMITS.MATRIC),
    phoneEmail: sanitizePlainText(data.phoneEmail, FIELD_LIMITS.PHONE_EMAIL),
    courseName: sanitizePlainText(data.courseName, FIELD_LIMITS.COURSE_NAME),
    courseCode: sanitizePlainText(data.courseCode, FIELD_LIMITS.COURSE_CODE),
    assessmentType: ALLOWED_ASSESSMENT_SET.has(data.assessmentType)
      ? data.assessmentType
      : 'Assignment',
    otherAssessment: sanitizePlainText(data.otherAssessment, FIELD_LIMITS.OTHER_ASSESSMENT),
    usedAITools: Boolean(data.usedAITools),
    icPassport: sanitizePlainText(data.icPassport, FIELD_LIMITS.IC_PASSPORT),
    date:
      typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
        ? data.date
        : new Date().toISOString().split('T')[0],
    signature: isSafeSignatureDataUrl(data.signature) ? data.signature : null,
  };
}

/**
 * Validates and sanitizes group declaration form drafts read from sessionStorage.
 */
function sanitizeGroupDraft(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const rawMembers = Array.isArray(data.members) ? data.members : [];
  const members = Array.from({ length: GROUP_MEMBER_COUNT }, (_, i) => {
    const m = rawMembers[i];
    if (!m || typeof m !== 'object') return { ...EMPTY_MEMBER };
    return {
      name: sanitizePlainText(m.name, FIELD_LIMITS.NAME),
      matric: sanitizePlainText(m.matric, FIELD_LIMITS.MATRIC),
      ic: sanitizePlainText(m.ic, FIELD_LIMITS.IC_PASSPORT),
      signature: isSafeSignatureDataUrl(m.signature) ? m.signature : null,
    };
  });

  return {
    leaderName: sanitizePlainText(data.leaderName, FIELD_LIMITS.NAME),
    leaderMatric: sanitizePlainText(data.leaderMatric, FIELD_LIMITS.MATRIC),
    leaderPhoneEmail: sanitizePlainText(data.leaderPhoneEmail, FIELD_LIMITS.PHONE_EMAIL),
    icPassport: sanitizePlainText(data.icPassport, FIELD_LIMITS.IC_PASSPORT),
    courseName: sanitizePlainText(data.courseName, FIELD_LIMITS.COURSE_NAME),
    courseCode: sanitizePlainText(data.courseCode, FIELD_LIMITS.COURSE_CODE),
    assessmentType: ALLOWED_ASSESSMENT_SET.has(data.assessmentType)
      ? data.assessmentType
      : 'Assignment',
    otherAssessment: sanitizePlainText(data.otherAssessment, FIELD_LIMITS.OTHER_ASSESSMENT),
    usedAITools: Boolean(data.usedAITools),
    signature: isSafeSignatureDataUrl(data.signature) ? data.signature : null,
    date:
      typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
        ? data.date
        : new Date().toISOString().split('T')[0],
    members,
  };
}

/**
 * Fallback sanitizer for non-standard or generic drafts.
 */
function sanitizeGenericDraft(data, initialValue) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return initialValue;
  const sanitized = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (typeof v === 'string') {
      sanitized[k] = sanitizePlainText(v, 200);
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      sanitized[k] = v;
    } else if (v === null || v === undefined) {
      sanitized[k] = null;
    }
  }
  return typeof initialValue === 'object' && initialValue !== null
    ? { ...initialValue, ...sanitized }
    : sanitized;
}

/**
 * Validates and strips invalid/unsafe values from any stored draft before restoring into state.
 */
export function sanitizeDraft(key, data, initialValue) {
  if (key === STORAGE_KEYS.INDIVIDUAL_DRAFT) {
    const sanitized = sanitizeIndividualDraft(data);
    return sanitized ? { ...initialValue, ...sanitized } : initialValue;
  }
  if (key === STORAGE_KEYS.GROUP_DRAFT) {
    const sanitized = sanitizeGroupDraft(data);
    return sanitized ? { ...initialValue, ...sanitized } : initialValue;
  }
  return sanitizeGenericDraft(data, initialValue);
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
 * Purges any legacy drafts persisted to `localStorage` (permanent disk storage)
 * by older versions of the application.
 * In compliance with OWASP & Pillar 1.3, form drafts must never linger on permanent disk storage;
 * drafts are strictly scoped to volatile, in-tab `sessionStorage`.
 */
export function purgeLegacyPiiStorage() {
  const localStorageObj = getStorage('local');
  if (!localStorageObj) return;

  for (const storageKey of Object.values(STORAGE_KEYS)) {
    try {
      localStorageObj.removeItem(storageKey);
    } catch {
      /* ignore */
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
 * Read and parse a value from storage, validating and sanitizing all fields.
 * Falls back to `initialValue` if the key is missing, JSON is corrupt, or storage is unavailable.
 */
function readValue(storage, key, initialValue) {
  if (!storage) return initialValue;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return initialValue;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return sanitizeDraft(key, parsed, initialValue);
    }
    return initialValue;
  } catch (error) {
    logSafeError('useBrowserStorage.read', error);
    return initialValue;
  }
}

/**
 * useState hook that persists form drafts to volatile `sessionStorage`.
 * Inputs survive page reloads within the same tab, but are destroyed when the tab closes.
 * Drafts are never persisted to disk (`localStorage`), and restored data is strictly sanitized.
 *
 * @param {string} key            Storage key.
 * @param {*} initialValue        Default value (or a function returning it).
 * @param {object} [options]
 * @param {'session'|'local'} [options.type='session']  Which storage to use.
 * @param {number} [options.debounceMs=300]  Delay writes.
 * @param {(value:any) => any} [options.fallback]  Reduced payload (e.g. without signatures) if storage quota is exceeded.
 */
export default function useBrowserStorage(key, initialValue, options = {}) {
  const { type = 'session', debounceMs = 300, fallback } = options;

  // Enforce Pillar 1.3: Form drafts with user inputs must never be saved to permanent disk storage (`localStorage`)
  const effectiveType =
    type === 'local' && (key === STORAGE_KEYS.INDIVIDUAL_DRAFT || key === STORAGE_KEYS.GROUP_DRAFT)
      ? 'session'
      : type;

  const storageRef = useRef(null);
  if (storageRef.current === null) {
    storageRef.current = getStorage(effectiveType) || false;
  }
  const storage = storageRef.current || null;

  const [value, setValue] = useState(() => {
    const init = typeof initialValue === 'function' ? initialValue() : initialValue;
    return readValue(storage, key, init);
  });

  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    if (!storage) return undefined;

    const timer = setTimeout(() => {
      let serialized;
      try {
        serialized = JSON.stringify(value);
      } catch (error) {
        logSafeError('useBrowserStorage.serialize', error);
        return;
      }

      if (safeSetItem(storage, key, serialized)) return;

      // Full save failed (e.g. QuotaExceededError). Try fallback without signature images.
      if (fallbackRef.current) {
        try {
          const reduced = JSON.stringify(fallbackRef.current(value));
          if (safeSetItem(storage, key, reduced)) return;
        } catch (error) {
          logSafeError('useBrowserStorage.fallback', error);
        }
      }

      // If even the fallback fails or wasn't provided, drop the stale draft
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, value, storage, debounceMs]);

  const clear = useCallback(() => {
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    const init = typeof initialValue === 'function' ? initialValue() : initialValue;
    setValue(init);
  }, [key, storage, initialValue]);

  return [value, setValue, clear];
}
