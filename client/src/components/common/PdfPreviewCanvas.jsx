import '../../utils/polyfills.js';
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { isSafeBlobUrl, logSafeError } from '../../utils/security';

// Register WorkerMessageHandler on globalThis so PDF.js executes in-thread
// without module worker / cross-context failures on mobile Safari and WebViews.
const mainThreadWorker = { WorkerMessageHandler: pdfjsWorker.WorkerMessageHandler };
if (typeof globalThis !== 'undefined') {
  globalThis.pdfjsWorker = mainThreadWorker;
}
if (typeof window !== 'undefined') {
  window.pdfjsWorker = mainThreadWorker;
}
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const MAX_CANVAS_PIXELS = 4_000_000;
const MAX_CANVAS_DIM = 4096;

export default function PdfPreviewCanvas({ url, bytes = null, pageNumber = 1, className = '' }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Release canvas GPU backing buffer only when component unmounts (prevents iOS WebKit memory leaks)
  useEffect(() => {
    const canvasEl = canvasRef.current;
    return () => {
      if (canvasEl) {
        canvasEl.width = 0;
        canvasEl.height = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!url && !bytes) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    let loadingTask = null;

    const destroyLoadingTask = () => {
      if (loadingTask) {
        const task = loadingTask;
        loadingTask = null;
        task.destroy().catch(() => {});
      }
    };

    setLoading(true);
    setError(null);

    const loadPage = async () => {
      try {
        let sourceData = bytes;
        if (!sourceData && url) {
          // Strictly validate URL to prevent SSRF or unsafe URI schemes
          if (!isSafeBlobUrl(url) && !url.startsWith('/')) {
            throw new Error('Invalid or untrusted PDF URL.');
          }
          const resp = await fetch(url);
          if (!resp.ok) {
            throw new Error(`Failed to fetch PDF preview: HTTP ${resp.status}`);
          }
          const buf = await resp.arrayBuffer();
          sourceData = new Uint8Array(buf);
        }

        if (!sourceData || isCancelled) return;

        // Avoid eval()/new Function() for strict CSP compliance and use system fonts fallback
        loadingTask = pdfjsLib.getDocument({
          data: sourceData.slice(),
          isEvalSupported: false,
          useSystemFonts: true,
        });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const numPages = pdf.numPages || 1;
        const pageIdx = Math.min(Math.max(1, pageNumber), numPages);
        const page = await pdf.getPage(pageIdx);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Wait for any previous render operation on this canvas to finish cancelling
        // (prevents "Cannot use the same canvas during multiple render() operations")
        const prevTask = renderTaskRef.current;
        if (prevTask) {
          try {
            prevTask.cancel();
          } catch {
            // Ignore cancellation errors
          }
          await prevTask.promise.catch(() => {});
          if (renderTaskRef.current === prevTask) {
            renderTaskRef.current = null;
          }
        }
        if (isCancelled) return;

        // Cap devicePixelRatio at 2 to prevent WebKit GPU OOM on 3x Retina displays (e.g., iPhone 13)
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        if (unscaledViewport.width <= 0 || unscaledViewport.height <= 0) {
          throw new Error('Invalid PDF page dimensions.');
        }

        // Calculate responsive target width safely from parent container or viewport
        const containerWidth = canvas.parentElement?.clientWidth || window.innerWidth;
        const targetWidth = Math.max(240, Math.min(containerWidth - 16, 850));
        let scale = (targetWidth / unscaledViewport.width) * pixelRatio;

        // Enforce mobile-safe canvas surface area and dimension ceilings
        const estWidth = unscaledViewport.width * scale;
        const estHeight = unscaledViewport.height * scale;
        if (estWidth * estHeight > MAX_CANVAS_PIXELS) {
          scale *= Math.sqrt(MAX_CANVAS_PIXELS / (estWidth * estHeight));
        }
        if (unscaledViewport.width * scale > MAX_CANVAS_DIM) {
          scale = MAX_CANVAS_DIM / unscaledViewport.width;
        }
        if (unscaledViewport.height * scale > MAX_CANVAS_DIM) {
          scale = MAX_CANVAS_DIM / unscaledViewport.height;
        }

        const viewport = page.getViewport({ scale });

        // Update canvas backing buffer dimensions
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Unable to obtain 2D canvas context.');
        }

        const currentRenderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = currentRenderTask;

        await currentRenderTask.promise;

        if (!isCancelled) {
          setLoading(false);
          if (renderTaskRef.current === currentRenderTask) {
            renderTaskRef.current = null;
          }
        }
      } catch (err) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          logSafeError('PdfPreviewCanvas.render', err);
          setError('Failed to render PDF preview.');
          setLoading(false);
          renderTaskRef.current = null;
        }
      } finally {
        destroyLoadingTask();
      }
    };

    loadPage();

    return () => {
      isCancelled = true;
      const activeTask = renderTaskRef.current;
      if (activeTask) {
        try {
          activeTask.cancel();
        } catch {
          // Ignore cancellation errors
        }
      }
      destroyLoadingTask();
    };
  }, [url, bytes, pageNumber]);

  return (
    <div className={`relative flex flex-col items-center justify-center w-full ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10 text-xs text-teal-400 min-h-[200px]">
          <span className="animate-pulse">Rendering preview...</span>
        </div>
      )}
      {error && (
        <div className="p-4 text-xs text-red-400 text-center z-10">{error}</div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full rounded shadow ${error ? 'hidden' : 'block'}`}
      />
    </div>
  );
}
