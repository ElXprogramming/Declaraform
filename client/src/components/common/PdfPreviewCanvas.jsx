import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from '../../utils/pdfWorker.js?worker&url';
import { isSafeBlobUrl, logSafeError } from '../../utils/security';

// Configure pdfjs worker to use the bundled worker script containing iOS polyfills
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfPreviewCanvas({ url, bytes = null, pageNumber = 1, className = '' }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvasEl = canvasRef.current;

    if (!url && !bytes) {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    // Cancel any ongoing render task before starting a new one
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // Ignore cancellation errors
      }
      renderTaskRef.current = null;
    }

    setLoading(true);
    setError(null);

    const loadPage = async () => {
      try {
        let sourceData = bytes;
        if (!sourceData && url) {
          // Strictly validate URL to prevent SSRF or unsafe schemes
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

        const loadingTask = pdfjsLib.getDocument({ data: sourceData.slice() });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const numPages = pdf.numPages || 1;
        const pageIdx = Math.min(Math.max(1, pageNumber), numPages);
        const page = await pdf.getPage(pageIdx);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Cap devicePixelRatio at 2 to prevent WebKit GPU out-of-memory crashes on 3x Retina displays (e.g., iPhone 13)
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate responsive target width safely from parent container or viewport
        const containerWidth = canvas.parentElement?.clientWidth || window.innerWidth;
        const targetWidth = Math.max(240, Math.min(containerWidth - 16, 850));
        const scale = (targetWidth / unscaledViewport.width) * pixelRatio;
        const viewport = page.getViewport({ scale });

        // Update canvas buffer dimensions
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Unable to obtain 2D canvas context.');
        }

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const currentRenderTask = page.render(renderContext);
        renderTaskRef.current = currentRenderTask;

        await currentRenderTask.promise;

        if (!isCancelled) {
          setLoading(false);
          renderTaskRef.current = null;
        }
      } catch (err) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          logSafeError('PdfPreviewCanvas.render', err);
          setError('Failed to render PDF preview.');
          setLoading(false);
          renderTaskRef.current = null;
        }
      }
    };

    loadPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
      // Zero out canvas buffer on unmount to immediately release GPU backing memory on iOS Safari
      if (canvasEl) {
        canvasEl.width = 0;
        canvasEl.height = 0;
      }
    };
  }, [url, bytes, pageNumber]);

  return (
    <div className={`relative flex flex-col items-center justify-center w-full ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10 text-xs text-teal-400">
          <span className="animate-pulse">Rendering preview...</span>
        </div>
      )}
      {error ? (
        <div className="p-4 text-xs text-red-400 text-center">{error}</div>
      ) : (
        <canvas ref={canvasRef} className="max-w-full rounded shadow" />
      )}
    </div>
  );
}
