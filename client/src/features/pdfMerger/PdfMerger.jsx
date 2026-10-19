import { useState, useEffect, useRef } from 'react';
import { mergeMultiplePdfs } from '../pdfGeneration/generatePdf';
import { UPLOAD_LIMITS, isSafeBlobUrl, validatePdfUpload, logSafeError } from '../../utils/security';
import {
  savePdfsToStorage,
  loadPdfsFromStorage,
  clearPdfsFromStorage,
} from '../../utils/pdfStorage.js';

export default function PdfMerger() {
  const [files, setFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [previewPage, setPreviewPage] = useState('both'); // 'both' | number (1-based)
  const [mobileTab, setMobileTab] = useState('files');
  const [errorMessage, setErrorMessage] = useState('');
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Drag states for reordering and uploading
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isUploadDragging, setIsUploadDragging] = useState(false);

  const prevUrlsRef = useRef([]);
  const touchStartRef = useRef(null);
  const fileInputRef = useRef(null);

  // Restore uploaded files from IndexedDB on initial mount
  useEffect(() => {
    let isCancelled = false;
    async function restoreFiles() {
      try {
        const stored = await loadPdfsFromStorage();
        if (!isCancelled && stored.length > 0) {
          setFiles(stored);
        }
      } catch (err) {
        logSafeError('PdfMerger.restoreFiles', err);
      } finally {
        if (!isCancelled) {
          setIsStorageLoaded(true);
        }
      }
    }
    restoreFiles();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Sync files to IndexedDB whenever files change
  useEffect(() => {
    if (!isStorageLoaded) return;
    savePdfsToStorage(files);
  }, [files, isStorageLoaded]);

  const rawMergedUrl = mergedData?.url;
  const mergedUrl = isSafeBlobUrl(rawMergedUrl) ? rawMergedUrl : null;
  const mergedPages = (mergedData?.pages || []).filter(isSafeBlobUrl);
  const totalPages = mergedData?.pageCount || mergedPages.length || (mergedUrl ? 1 : 0);

  const totalBytes = files.reduce((sum, item) => sum + (item.file?.size || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  useEffect(() => {
    return () => {
      prevUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const processFiles = async (selected) => {
    setErrorMessage('');
    if (!selected || selected.length === 0) return;

    if (files.length + selected.length > UPLOAD_LIMITS.MAX_PDF_FILES) {
      setErrorMessage(`You can merge at most ${UPLOAD_LIMITS.MAX_PDF_FILES} PDF files at once.`);
      return;
    }

    let runningBytes = totalBytes;
    const validItems = [];
    const errors = [];

    for (const file of selected) {
      const check = await validatePdfUpload(file);
      if (!check.valid) {
        errors.push(check.error);
        continue;
      }
      if (runningBytes + file.size > UPLOAD_LIMITS.MAX_TOTAL_PDF_BYTES) {
        errors.push('Total combined PDF size cannot exceed 100 MB.');
        break;
      }
      runningBytes += file.size;
      validItems.push({
        id: check.safeId,
        internalName: check.safeInternalName,
        displayName: check.displayName,
        file,
      });
    }

    if (errors.length > 0) {
      setErrorMessage(errors[0]);
    }

    if (validItems.length > 0) {
      setFiles((prev) => [...prev, ...validItems]);
      setMergedData(null); // Reset preview on new upload
    }
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(selected);
  };

  const handleUploadDragOver = (e) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsUploadDragging(true);
    }
  };

  const handleUploadDragLeave = (e) => {
    e.preventDefault();
    setIsUploadDragging(false);
  };

  const handleUploadDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      await processFiles(droppedFiles);
    }
  };

  // Safe reordering logic
  const reorderFiles = (sourceIndex, targetIndex) => {
    if (
      typeof sourceIndex !== 'number' ||
      typeof targetIndex !== 'number' ||
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= files.length ||
      targetIndex >= files.length
    ) {
      return;
    }

    setFiles((prev) => {
      const next = [...prev];
      const [movedItem] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedItem);
      return next;
    });
    setMergedData(null); // Invalidate outdated preview on reorder
  };

  const moveFile = (index, direction) => {
    if (direction === 'up' && index > 0) {
      reorderFiles(index, index - 1);
    } else if (direction === 'down' && index < files.length - 1) {
      reorderFiles(index, index + 1);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMergedData(null);
    setErrorMessage('');
  };

  const clearAllFiles = () => {
    setFiles([]);
    setMergedData(null);
    setErrorMessage('');
    clearPdfsFromStorage();
  };

  // HTML5 Drag & Drop handlers for rearranging
  const handleItemDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleItemDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleItemDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderFiles(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch reordering handlers (for mobile & touchscreens)
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      startIndex: index,
      startY: touch.clientY,
    };
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = targetEl?.closest('[data-file-index]');
    if (cardEl) {
      const idxAttr = cardEl.getAttribute('data-file-index');
      if (idxAttr !== null) {
        const targetIdx = parseInt(idxAttr, 10);
        if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < files.length) {
          setDragOverIndex(targetIdx);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current) {
      const srcIdx = touchStartRef.current.startIndex;
      if (dragOverIndex !== null && dragOverIndex !== srcIdx) {
        reorderFiles(srcIdx, dragOverIndex);
      }
    }
    touchStartRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMerge = async () => {
    setErrorMessage('');
    if (files.length < 2) {
      setErrorMessage('Please select at least 2 valid PDF files to merge.');
      return;
    }
    setIsMerging(true);
    try {
      const result = await mergeMultiplePdfs(files);
      // Clean up previous blob URLs to free memory
      prevUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      prevUrlsRef.current = [result.url, ...(result.pages || [])].filter(Boolean);

      setMergedData(result);
      setPreviewPage('both');
      setMobileTab('preview'); // On mobile, automatically show the preview result!
    } catch {
      setErrorMessage('Error merging PDFs. Ensure all selected files are valid, unencrypted PDFs.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div>
      {/* Mobile-only Segmented Sub-Tab Switcher */}
      <div className="lg:hidden flex bg-slate-950/90 p-1.5 rounded-2xl mb-5 border border-slate-800 shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab('files')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'files'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <span>Select PDFs ({files.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'preview'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          <span>Result Preview</span>
          {mergedUrl && <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[80vh] min-h-0">
        
        {/* LEFT COLUMN: Uploader & Draggable Reorder List */}
        <div className={`flex flex-col h-full lg:max-h-full ${mobileTab === 'files' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
            <h2 className="text-xl font-bold text-slate-100">Upload & Arrange PDFs</h2>
            {files.length > 0 && (
              <span className="text-xs font-semibold text-teal-400 bg-teal-950/60 border border-teal-800/60 px-2.5 py-1 rounded-full">
                {files.length} {files.length === 1 ? 'file' : 'files'} ({totalMb} MB)
              </span>
            )}
          </div>
          
          {/* Upload Area with Drag & Drop */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleUploadDragOver}
            onDragLeave={handleUploadDragLeave}
            onDrop={handleUploadDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 sm:p-7 cursor-pointer transition-all mb-4 group ${
              isUploadDragging 
                ? 'border-teal-400 bg-teal-950/40 ring-2 ring-teal-500/40 scale-[1.01]' 
                : 'border-slate-700 hover:border-teal-500 bg-slate-900/50'
            }`}
          >
            <svg 
              className={`w-10 h-10 mb-2 transition-colors ${
                isUploadDragging ? 'text-teal-400 animate-bounce' : 'text-slate-400 group-hover:text-teal-400'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-slate-300 group-hover:text-teal-400 text-center">
              {isUploadDragging ? 'Drop PDF files here' : 'Click to browse or drag PDF files here'}
            </span>
            <span className="text-xs text-slate-500 mt-1 text-center">
              Valid PDFs only • Max 25 MB per file (up to 20 files)
            </span>
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept=".pdf,application/pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-xs text-red-400 mb-3 font-medium bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}

          {/* Draggable File List Header */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span className="font-semibold text-slate-300">
              File Merge Sequence
            </span>
            {files.length > 1 ? (
              <span className="text-[11px] text-teal-400/90 flex items-center gap-1 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Drag items to rearrange
              </span>
            ) : files.length === 1 ? (
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            ) : null}
          </div>

          {/* Draggable File List */}
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-2 mb-4">
            {files.length === 0 ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleUploadDragOver}
                onDragLeave={handleUploadDragLeave}
                onDrop={handleUploadDrop}
                className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-800 hover:border-teal-500/60 rounded-xl bg-slate-900/30 cursor-pointer transition-colors"
              >
                <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-slate-400 font-medium">No files selected yet</p>
                <p className="text-xs text-slate-500 mt-1">Upload or drop at least 2 PDFs to arrange and merge</p>
              </div>
            ) : (
              files.map((item, idx) => {
                const isBeingDragged = draggedIndex === idx;
                const isOver = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={item.id}
                    data-file-index={idx}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, idx)}
                    onDragOver={(e) => handleItemDragOver(e, idx)}
                    onDrop={(e) => handleItemDrop(e, idx)}
                    onDragEnd={handleItemDragEnd}
                    className={`relative group rounded-xl p-3 border transition-all duration-150 flex items-center justify-between gap-2.5 select-none ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-teal-500 bg-slate-900/70 scale-[0.99]'
                        : isOver
                        ? 'border-teal-400 bg-teal-950/40 ring-2 ring-teal-500/50 shadow-lg shadow-teal-500/10 scale-[1.01]'
                        : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 shadow-sm cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    {/* Left: Drag Handle + Number badge + PDF icon + Name & Size */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Touch & Click Drag Grip Handle */}
                      <div
                        onTouchStart={(e) => handleTouchStart(e, idx)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-teal-400 active:text-teal-300 p-1 -ml-1 rounded transition-colors touch-none select-none shrink-0"
                        title="Drag to rearrange"
                        aria-label={`Drag to rearrange ${item.displayName}`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-12a2 2 0 10.001 4.001A2 2 0 0013 2zm0 6a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                        </svg>
                      </div>

                      {/* Sequence Number */}
                      <span className="w-6 h-6 rounded-md bg-slate-900/90 border border-slate-700/80 text-teal-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* PDF File Icon */}
                      <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>

                      {/* File Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate" title={item.displayName}>
                          {item.displayName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    {/* Right: Step Move Buttons & Delete */}
                    <div 
                      className="flex items-center gap-1 shrink-0"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => moveFile(idx, 'up')}
                        disabled={idx === 0}
                        title="Move up"
                        aria-label={`Move ${item.displayName} up`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFile(idx, 'down')}
                        disabled={idx === files.length - 1}
                        title="Move down"
                        aria-label={`Move ${item.displayName} down`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        title="Remove file"
                        aria-label={`Remove ${item.displayName}`}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 ml-1 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-auto pt-2">
            {files.length > 0 && (
              <button
                type="button"
                onClick={clearAllFiles}
                className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900/50 rounded-xl transition-colors font-medium text-xs sm:text-sm shrink-0"
              >
                Clear All
              </button>
            )}
            <button 
              type="button"
              onClick={handleMerge}
              disabled={files.length < 2 || isMerging}
              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMerging ? 'Merging...' : files.length >= 2 ? `Merge ${files.length} PDFs` : 'Select at least 2 PDFs'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: The PDF Preview */}
        <div className={`flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner min-h-[480px] lg:min-h-0 ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-slate-800 text-slate-200 p-3 flex justify-between items-center border-b border-slate-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('files')}
                className="lg:hidden text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 bg-slate-900 px-2 py-1 rounded"
              >
                ← Files
              </button>
              <span className="text-sm font-semibold tracking-wide">Result Preview</span>
            </div>
            {mergedUrl && (
              <div className="flex gap-2">
                <a 
                  href={mergedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded transition-colors"
                >
                  Full Screen
                </a>
                <a 
                  href={mergedUrl} 
                  download="Merged_Document.pdf" 
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs md:text-sm font-bold py-1.5 px-3 md:px-4 rounded transition-colors shadow-md"
                >
                  Download PDF
                </a>
              </div>
            )}
          </div>
          
          {/* Page Switcher / Info Bar */}
          {mergedUrl && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
              <span className="text-slate-400 font-medium">Pages ({totalPages}):</span>
              {mergedPages.length > 1 ? (
                <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setPreviewPage('both')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                      previewPage === 'both' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Scroll All
                  </button>
                  {mergedPages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewPage(i + 1)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                        previewPage === i + 1 ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Page {i + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-teal-500 text-slate-950 shadow-sm">
                  Single Page Document
                </span>
              )}
            </div>
          )}

          {/* UNIFIED PREVIEW CONTAINER */}
          <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-4 h-[65vh] lg:h-auto">
            {mergedUrl ? (
              mergedPages.length > 1 && previewPage === 'both' ? (
                mergedPages.map((pageUrl, i) => (
                  <div key={i} className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                    <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                      <span>Merged Document Page {i + 1}</span>
                      <span className="text-slate-400 font-normal">{i + 1} of {totalPages}</span>
                    </div>
                    <iframe
                      src={`${pageUrl}#toolbar=0&navpanes=0&view=Fit`}
                      className="w-full h-[520px] sm:h-[600px] lg:h-[700px] border-0"
                      title={`Merged Document Page ${i + 1}`}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-col h-full min-h-[520px] lg:min-h-0 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                  <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                    <span>
                      {typeof previewPage === 'number'
                        ? `Merged Document Page ${previewPage}`
                        : 'Merged Document'}
                    </span>
                    <span className="text-slate-400 font-normal">
                      {typeof previewPage === 'number' ? `${previewPage} of ${totalPages}` : `${totalPages} Page${totalPages > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <iframe
                    src={`${(typeof previewPage === 'number' && mergedPages[previewPage - 1]) || mergedUrl}#toolbar=0&navpanes=0&view=Fit`}
                    className="w-full flex-grow h-[520px] sm:h-[600px] lg:h-full border-0"
                    title="Merged PDF Preview"
                  />
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-48 lg:h-full text-slate-500 text-sm">
                <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                Upload and arrange PDFs to see the merged result.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}