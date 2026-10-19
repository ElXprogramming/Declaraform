import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BASE_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

const DEV_CSP = [
  "default-src 'self'",
  // Vite dev server requires inline preamble for React Fast Refresh HMR
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: ws: wss: https://script.google.com https://script.googleusercontent.com",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' blob: https://script.google.com https://script.googleusercontent.com",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

// Restrict allowed hosts to localhost and explicit cloudflared tunnel domains (prevents DNS rebinding)
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.trycloudflare.com'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ALLOWED_HOSTS,
    cors: false,
    headers: {
      ...BASE_SECURITY_HEADERS,
      'Content-Security-Policy': DEV_CSP,
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ALLOWED_HOSTS,
    cors: false,
    headers: {
      ...BASE_SECURITY_HEADERS,
      'Content-Security-Policy': PROD_CSP,
    },
  },
  build: {
    sourcemap: false,
  },
});