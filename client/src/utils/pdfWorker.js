// Ensure polyfills are loaded in the worker thread scope before pdf.worker.mjs executes
import './polyfills.js';
import 'pdfjs-dist/build/pdf.worker.mjs';
