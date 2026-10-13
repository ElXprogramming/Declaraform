import React, { useState } from 'react';
import { mergeMultiplePdfs } from '../pdfGeneration/generatePdf';

export default function PdfMerger() {
  const [files, setFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [previewPage, setPreviewPage] = useState('both'); // 'both' | number (1-based)
  const prevUrlsRef = React.useRef([]);

  const mergedUrl = typeof mergedData === 'string' ? mergedData : mergedData?.url;
  const mergedPages = Array.isArray(mergedData?.pages) ? mergedData.pages : [];
  const totalPages = mergedData?.pageCount || mergedPages.length || (mergedUrl ? 1 : 0);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const pdfs = selected.filter(file => file.type === 'application/pdf');
    if (pdfs.length !== selected.length) {
      alert("Only PDF files are allowed.");
    }
    setFiles(prev => [...prev, ...pdfs]);
    setMergedData(null); // Reset preview on new upload
  };

  const moveFile = (index, direction) => {
    const newFiles = [...files];
    if (direction === 'up' && index > 0) {
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    } else if (direction === 'down' && index < newFiles.length - 1) {
      [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
    }
    setFiles(newFiles);
    setMergedData(null);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setMergedData(null);
  };

  const [mobileTab, setMobileTab] = useState('files');

  const handleMerge = async () => {
    if (files.length < 2) return alert("Please select at least 2 PDFs to merge.");
    setIsMerging(true);
    try {
      const result = await mergeMultiplePdfs(files);
      // Clean up previous blob URLs to free memory
      prevUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      const newUrls = typeof result === 'string'
        ? [result]
        : [result.url, ...(result.pages || [])].filter(Boolean);
      prevUrlsRef.current = newUrls;

      setMergedData(result);
      setPreviewPage('both');
      setMobileTab('preview'); // On mobile, automatically show the preview result!
    } catch {
      alert("Error merging PDFs. Ensure they are valid, unencrypted PDF files.");
    }
    setIsMerging(false);
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
        
        {/* LEFT COLUMN: Uploader & List */}
        <div className={`flex flex-col h-full lg:max-h-full ${mobileTab === 'files' ? 'flex' : 'hidden lg:flex'}`}>
        <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4">Upload PDFs</h2>
        
        {/* Upload Area */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-teal-500 rounded-xl p-8 bg-slate-900/50 cursor-pointer transition-colors mb-6 group">
          <svg className="w-10 h-10 text-slate-400 group-hover:text-teal-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <span className="text-sm font-medium text-slate-300 group-hover:text-teal-400">Click to browse or drag PDF files here</span>
          <input type="file" multiple accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </label>

        {/* File List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
          {files.length === 0 ? (
            <div className="text-center text-slate-500 text-sm mt-8">No files selected yet.</div>
          ) : (
            files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-200 truncate w-2/3" title={file.name}>
                  <span className="font-bold text-slate-500 mr-2">{idx + 1}.</span>{file.name}
                </span>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => moveFile(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                  </button>
                  <button onClick={() => moveFile(idx, 'down')} disabled={idx === files.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  <button onClick={() => removeFile(idx)} className="p-1 text-red-400 hover:text-red-300 ml-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={handleMerge}
          disabled={files.length < 2 || isMerging}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
        >
          {isMerging ? 'Merging...' : `Merge ${files.length} PDFs`}
        </button>
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

        {/* UNIFIED PREVIEW CONTAINER: Follows the group form mobile card layout on all screens */}
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