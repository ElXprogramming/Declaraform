import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfPreviewCanvas({ url, bytes = null, pageNumber = 1, className = '' }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url && !bytes) return;

    let isCancelled = false;
    let renderTask = null;

    setLoading(true);
    setError(null);

    const loadPage = async () => {
      try {
        let sourceData = bytes;
        if (!sourceData && url) {
          const resp = await fetch(url);
          const buf = await resp.arrayBuffer();
          sourceData = new Uint8Array(buf);
        }
        if (!sourceData || isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: sourceData.slice() });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const numPages = pdf.numPages;
        const pageIdx = Math.min(Math.max(1, pageNumber), numPages);
        const page = await pdf.getPage(pageIdx);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at high resolution (devicePixelRatio) for crisp display on Retina/iPad displays
        const pixelRatio = window.devicePixelRatio || 1;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        // Fit width into parent container or target ~800px width
        const targetWidth = Math.min(window.innerWidth - 64, 850);
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: scale * pixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        const ctx = canvas.getContext('2d');
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled && err.name !== 'RenderingCancelledException') {
          console.error('PdfPreviewCanvas render error:', err);
          setError('Failed to render PDF preview.');
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
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
