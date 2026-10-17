import { z } from 'zod';
import DOMPurify from 'dompurify';
import { ASSESSMENT_TYPES, FEEDBACK_CATEGORIES, GROUP_MEMBER_COUNT } from './constants';

// ============================================================================
// 1. CONSTANTS & LIMITS
// ============================================================================

export const UPLOAD_LIMITS = Object.freeze({
  MAX_SIGNATURE_BYTES: 2 * 1024 * 1024, // 2 MB max for signature images
  MAX_PDF_BYTES: 25 * 1024 * 1024,      // 25 MB max per PDF file
  MAX_TOTAL_PDF_BYTES: 100 * 1024 * 1024, // 100 MB max total merged payload
  MAX_PDF_FILES: 20,                    // Max 20 PDF files per merge operation
  MAX_FEEDBACK_PAYLOAD_BYTES: 4096,     // 4 KB max feedback JSON payload
});

export const FIELD_LIMITS = Object.freeze({
  NAME: 100,
  MATRIC: 25,
  PHONE_EMAIL: 120,
  IC_PASSPORT: 30,
  COURSE_NAME: 120,
  COURSE_CODE: 25,
  OTHER_ASSESSMENT: 60,
  DATE: 10,
  FEEDBACK_CONTACT: 120,
  FEEDBACK_MESSAGE: 1500,
});

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:']);
const ALLOWED_FEEDBACK_HOSTS = new Set(['script.google.com', 'script.googleusercontent.com']);
const FORBIDDEN_ENV_KEY_PATTERN = /(SECRET|PRIVATE|PASSWORD|DATABASE|DB_URI|SERVICE_ROLE|JWT|API_KEY|ACCESS_TOKEN|REFRESH_TOKEN)/i;

// Magic byte signatures
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

// Strict base64 data URL pattern for PNG/JPEG signatures only
const SIGNATURE_DATA_URL_REGEX = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

// ============================================================================
// 2. ENVIRONMENT VARIABLE VALIDATION (Pillar 1.4)
// ============================================================================

/**
 * Audits `import.meta.env` at startup to guarantee no backend secrets or private keys
 * were accidentally prefixed with `VITE_` or `REACT_APP_`.
 */
export function validateClientEnv() {
  const env = import.meta.env || {};
  for (const key of Object.keys(env)) {
    if ((key.startsWith('VITE_') || key.startsWith('REACT_APP_')) && FORBIDDEN_ENV_KEY_PATTERN.test(key)) {
      const err = new Error(
        `[Security Policy Violation] Sensitive environment variable "${key}" must never be exposed to the client bundle.`
      );
      logSafeError('validateClientEnv', err);
      throw err;
    }
  }
}

/**
 * Validates that a feedback endpoint URL uses HTTPS and points to an explicitly
 * allowlisted host.
 */
export function isValidFeedbackEndpoint(urlString) {
  if (typeof urlString !== 'string' || !urlString.trim()) return false;
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'https:' && ALLOWED_FEEDBACK_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

// ============================================================================
// 3. HTML, TEXT & FORMULA SANITIZATION (Pillars 1.1 & 3.1)
// ============================================================================

/**
 * Sanitizes rich HTML using DOMPurify with strict rules blocking scripts,
 * inline event handlers, and dangerous URI schemes.
 */
export function sanitizeRichHtml(dirtyHtml) {
  if (typeof dirtyHtml !== 'string') return '';
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'svg', 'math'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style', 'href', 'src'],
  });
}

function stripAllControlChars(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0x20 && code !== 0x7f) && (code < 0x80 || code > 0x9f)) {
      out += str[i];
    }
  }
  return out;
}

export function stripMultilineControlChars(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const isAllowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
    if (isAllowedWhitespace || (code >= 0x20 && code !== 0x7f && (code < 0x80 || code > 0x9f))) {
      out += str[i];
    }
  }
  return out;
}

/**
 * Strips ASCII control characters (except standard spaces) and enforces max length.
 */
export function sanitizePlainText(value, maxLength = 120) {
  if (typeof value !== 'string') return '';
  return stripAllControlChars(value).slice(0, maxLength);
}

/**
 * Sanitizes text specifically before drawing into `pdf-lib` standard WinAnsi fonts.
 * Replaces unsupported non-Latin1 characters and control chars so `page.drawText`
 * cannot throw an encoding exception or inject control sequences.
 */
export function sanitizePdfText(value, maxLength = 120) {
  if (typeof value !== 'string') return '';
  const singleLine = stripAllControlChars(value.replace(/[\r\n\t]+/g, ' '))
    // Restrict to printable ASCII + Latin-1 Supplement supported by WinAnsiEncoding
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '')
    .trim();
  return singleLine.slice(0, maxLength);
}

/**
 * Prevents Spreadsheet / CSV Formula Injection (OWASP Injection) when sending text
 * to Google Sheets / Apps Script by neutralizing leading `=`, `+`, `-`, `@`, `\t`, `\r`.
 */
export function sanitizeSpreadsheetCell(value, maxLength = 1500) {
  if (typeof value !== 'string') return '';
  const cleaned = stripMultilineControlChars(value)
    .trim()
    .slice(0, maxLength);

  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return `'${cleaned}`.slice(0, maxLength + 1);
  }
  return cleaned;
}

/**
 * Sanitizes a user-supplied string for safe use inside a download filename.
 * Blocks path traversal (`..`, `/`, `\`) and special filesystem characters.
 */
export function sanitizeDownloadFilename(rawSegment, fallback = 'Form') {
  if (typeof rawSegment !== 'string') return fallback;
  const safe = rawSegment
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return safe || fallback;
}

// ============================================================================
// 4. URL & NAVIGATION VALIDATION (Pillar 1.2)
// ============================================================================

/**
 * Validates external navigation links to block `javascript:`, `data:`, `vbscript:`,
 * and other unsafe URI schemes.
 */
export function isSafeExternalUrl(urlString) {
  if (typeof urlString !== 'string' || !urlString.trim()) return false;
  const trimmed = urlString.trim();
  // Explicitly reject dangerous schemes even if URL parsing behaves unexpectedly
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates that a dynamic preview URL is strictly a same-origin `blob:` URL.
 */
export function isSafeBlobUrl(urlString) {
  if (typeof urlString !== 'string' || !urlString.startsWith('blob:')) return false;
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return urlString.startsWith(`blob:${window.location.origin}/`);
  }
  return /^blob:(https?:\/\/[^\s/]+|null)\/[0-9a-fA-F-]{36}$/.test(urlString);
}

/**
 * Strictly validates that a signature image string is a well-formed base64
 * `data:image/png` or `data:image/jpeg` URL within the 2 MB size cap.
 */
export function isSafeSignatureDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return false;
  const match = SIGNATURE_DATA_URL_REGEX.exec(dataUrl);
  if (!match) return false;
  const base64Payload = match[2];
  const estimatedBytes = Math.floor((base64Payload.length * 3) / 4);
  return estimatedBytes > 0 && estimatedBytes <= UPLOAD_LIMITS.MAX_SIGNATURE_BYTES;
}

// ============================================================================
// 5. FILE UPLOAD VALIDATION & MAGIC BYTE VERIFICATION (Pillar 3.3)
// ============================================================================

function matchesMagicBytes(uint8Array, magic) {
  if (!uint8Array || uint8Array.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (uint8Array[i] !== magic[i]) return false;
  }
  return true;
}

export function generateSafeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Cryptographic fallback using crypto.getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Decodes a validated base64 signature Data URL directly into a `Uint8Array`
 * without calling `fetch()`, and verifies PNG/JPEG magic bytes.
 */
export function decodeSignatureDataUrl(dataUrl) {
  if (!isSafeSignatureDataUrl(dataUrl)) return null;
  const match = SIGNATURE_DATA_URL_REGEX.exec(dataUrl);
  if (!match) return null;

  const format = match[1]; // 'png' | 'jpeg'
  const base64 = match[2];

  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    if (len === 0 || len > UPLOAD_LIMITS.MAX_SIGNATURE_BYTES) return null;

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (format === 'png' && !matchesMagicBytes(bytes, PNG_MAGIC)) return null;
    if (format === 'jpeg' && !matchesMagicBytes(bytes, JPEG_MAGIC)) return null;

    return { format, bytes };
  } catch {
    return null;
  }
}

/**
 * Validates an uploaded signature image file:
 * 1. Enforces max file size (2 MB)
 * 2. Enforces extension allowlist (`.png`, `.jpg`, `.jpeg`)
 * 3. Enforces MIME type allowlist (`image/png`, `image/jpeg`)
 * 4. Inspects actual binary magic bytes (`89 50 4E 47...` or `FF D8 FF`)
 */
export async function validateImageUpload(file) {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'No image file provided.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'The selected image file is empty.' };
  }

  if (file.size > UPLOAD_LIMITS.MAX_SIGNATURE_BYTES) {
    return { valid: false, error: 'Image size must not exceed 2 MB.' };
  }

  const fileName = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  const hasAllowedExt = /\.(png|jpe?g)$/i.test(fileName);
  const hasAllowedMime = file.type === 'image/png' || file.type === 'image/jpeg';

  if (!hasAllowedExt || !hasAllowedMime) {
    return { valid: false, error: 'Only PNG and JPEG images (.png, .jpg, .jpeg) are allowed.' };
  }

  try {
    const headerBuffer = await file.slice(0, 8).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const isPng = matchesMagicBytes(headerBytes, PNG_MAGIC);
    const isJpeg = matchesMagicBytes(headerBytes, JPEG_MAGIC);

    if (!isPng && !isJpeg) {
      return { valid: false, error: 'Invalid image file signature. File content does not match PNG or JPEG.' };
    }

    return {
      valid: true,
      safeId: generateSafeUuid(),
      detectedMime: isPng ? 'image/png' : 'image/jpeg',
    };
  } catch {
    return { valid: false, error: 'Unable to read and verify the selected image file.' };
  }
}

/**
 * Validates an uploaded PDF file:
 * 1. Enforces max file size (25 MB per file)
 * 2. Enforces `.pdf` extension and `application/pdf` MIME type
 * 3. Inspects actual binary magic bytes (`%PDF-`)
 * 4. Assigns a safe UUID internal identifier and sanitized display name
 */
export async function validatePdfUpload(file) {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'Invalid file object.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Empty PDF files are not allowed.' };
  }

  if (file.size > UPLOAD_LIMITS.MAX_PDF_BYTES) {
    return { valid: false, error: 'Each PDF file must be 25 MB or smaller.' };
  }

  const fileName = typeof file.name === 'string' ? file.name : '';
  const hasPdfExt = /\.pdf$/i.test(fileName);
  const hasPdfMime = file.type === 'application/pdf';

  if (!hasPdfExt || !hasPdfMime) {
    return { valid: false, error: 'Only valid PDF (.pdf) files are allowed.' };
  }

  try {
    const headerBuffer = await file.slice(0, 5).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    if (!matchesMagicBytes(headerBytes, PDF_MAGIC)) {
      return { valid: false, error: 'File rejected: binary header does not match a valid PDF document.' };
    }

    const safeId = generateSafeUuid();
    const cleanBase = sanitizeDownloadFilename(fileName.replace(/\.pdf$/i, ''), 'Document');

    return {
      valid: true,
      safeId,
      safeInternalName: `${safeId}.pdf`,
      displayName: `${cleanBase}.pdf`,
    };
  } catch {
    return { valid: false, error: 'Unable to read and verify the PDF file.' };
  }
}

// ============================================================================
// 6. STRICT ZOD SCHEMAS (Pillar 3.1)
// ============================================================================

const allowedAssessmentSet = new Set([...ASSESSMENT_TYPES, 'Others']);
const allowedFeedbackCategorySet = new Set(FEEDBACK_CATEGORIES.map((c) => c.label));

const signatureSchema = z
  .string()
  .refine(isSafeSignatureDataUrl, { message: 'Invalid signature image format.' })
  .nullable()
  .optional()
  .transform((val) => val ?? null);

export const individualFormSchema = z
  .object({
    fullName: z.string().max(FIELD_LIMITS.NAME).transform((v) => sanitizePdfText(v, FIELD_LIMITS.NAME)),
    matricNo: z.string().max(FIELD_LIMITS.MATRIC).transform((v) => sanitizePdfText(v, FIELD_LIMITS.MATRIC)),
    phoneEmail: z.string().max(FIELD_LIMITS.PHONE_EMAIL).transform((v) => sanitizePdfText(v, FIELD_LIMITS.PHONE_EMAIL)),
    courseName: z.string().max(FIELD_LIMITS.COURSE_NAME).transform((v) => sanitizePdfText(v, FIELD_LIMITS.COURSE_NAME)),
    courseCode: z.string().max(FIELD_LIMITS.COURSE_CODE).transform((v) => sanitizePdfText(v, FIELD_LIMITS.COURSE_CODE)),
    assessmentType: z
      .string()
      .refine((val) => allowedAssessmentSet.has(val), { message: 'Invalid assessment type.' }),
    otherAssessment: z
      .string()
      .max(FIELD_LIMITS.OTHER_ASSESSMENT)
      .transform((v) => sanitizePdfText(v, FIELD_LIMITS.OTHER_ASSESSMENT)),
    usedAITools: z.boolean(),
    icPassport: z.string().max(FIELD_LIMITS.IC_PASSPORT).transform((v) => sanitizePdfText(v, FIELD_LIMITS.IC_PASSPORT)),
    date: z
      .string()
      .max(FIELD_LIMITS.DATE)
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Invalid ISO date.' }),
    signature: signatureSchema,
  })
  .strip();

const groupMemberSchema = z
  .object({
    name: z.string().max(FIELD_LIMITS.NAME).transform((v) => sanitizePdfText(v, FIELD_LIMITS.NAME)),
    matric: z.string().max(FIELD_LIMITS.MATRIC).transform((v) => sanitizePdfText(v, FIELD_LIMITS.MATRIC)),
    ic: z.string().max(FIELD_LIMITS.IC_PASSPORT).transform((v) => sanitizePdfText(v, FIELD_LIMITS.IC_PASSPORT)),
    signature: signatureSchema,
  })
  .strip();

export const groupFormSchema = z
  .object({
    leaderName: z.string().max(FIELD_LIMITS.NAME).transform((v) => sanitizePdfText(v, FIELD_LIMITS.NAME)),
    leaderMatric: z.string().max(FIELD_LIMITS.MATRIC).transform((v) => sanitizePdfText(v, FIELD_LIMITS.MATRIC)),
    leaderPhoneEmail: z
      .string()
      .max(FIELD_LIMITS.PHONE_EMAIL)
      .transform((v) => sanitizePdfText(v, FIELD_LIMITS.PHONE_EMAIL)),
    icPassport: z.string().max(FIELD_LIMITS.IC_PASSPORT).transform((v) => sanitizePdfText(v, FIELD_LIMITS.IC_PASSPORT)),
    courseName: z.string().max(FIELD_LIMITS.COURSE_NAME).transform((v) => sanitizePdfText(v, FIELD_LIMITS.COURSE_NAME)),
    courseCode: z.string().max(FIELD_LIMITS.COURSE_CODE).transform((v) => sanitizePdfText(v, FIELD_LIMITS.COURSE_CODE)),
    assessmentType: z
      .string()
      .refine((val) => allowedAssessmentSet.has(val), { message: 'Invalid assessment type.' }),
    otherAssessment: z
      .string()
      .max(FIELD_LIMITS.OTHER_ASSESSMENT)
      .transform((v) => sanitizePdfText(v, FIELD_LIMITS.OTHER_ASSESSMENT)),
    usedAITools: z.boolean(),
    signature: signatureSchema,
    date: z
      .string()
      .max(FIELD_LIMITS.DATE)
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Invalid ISO date.' }),
    members: z.array(groupMemberSchema).max(GROUP_MEMBER_COUNT),
  })
  .strip();

export const feedbackSchema = z
  .object({
    category: z
      .string()
      .refine((val) => allowedFeedbackCategorySet.has(val), { message: 'Invalid feedback category.' }),
    contact: z
      .string()
      .max(FIELD_LIMITS.FEEDBACK_CONTACT, 'Contact info must be 120 characters or fewer.')
      .transform((val) => sanitizeSpreadsheetCell(val, FIELD_LIMITS.FEEDBACK_CONTACT)),
    message: z
      .string()
      .min(1, 'Feedback message is required.')
      .max(FIELD_LIMITS.FEEDBACK_MESSAGE, 'Message must be 1500 characters or fewer.')
      .transform((val) => sanitizeSpreadsheetCell(val, FIELD_LIMITS.FEEDBACK_MESSAGE)),
  })
  .strict();

// ============================================================================
// 7. RATE LIMITING & SAFE ERROR LOGGING (Pillars 4.3 & 5.1)
// ============================================================================

/**
 * In-memory sliding-window rate limiter with per-action cooldown.
 */
export function createRateLimiter({ maxAttempts = 3, windowMs = 10 * 60 * 1000, cooldownMs = 30 * 1000 } = {}) {
  let timestamps = [];

  return {
    checkAndRecord() {
      const now = Date.now();
      timestamps = timestamps.filter((t) => now - t < windowMs);

      if (timestamps.length > 0) {
        const elapsedSinceLast = now - timestamps[timestamps.length - 1];
        if (elapsedSinceLast < cooldownMs) {
          const waitSec = Math.ceil((cooldownMs - elapsedSinceLast) / 1000);
          return {
            allowed: false,
            reason: `Please wait ${waitSec}s before submitting again.`,
          };
        }
      }

      if (timestamps.length >= maxAttempts) {
        return {
          allowed: false,
          reason: 'Rate limit reached. Please try again in a few minutes.',
        };
      }

      timestamps.push(now);
      return { allowed: true, reason: null };
    },
  };
}

/**
 * Logs detailed diagnostics only in local development (`import.meta.env.DEV`).
 * Never leaks stack traces or internal system details in production builds.
 */
export function logSafeError(context, error) {
  if (import.meta.env?.DEV) {
    console.error(`[${context}]`, error);
  }
}
