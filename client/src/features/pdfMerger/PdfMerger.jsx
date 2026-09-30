import React, { useState } from 'react';
import { mergeMultiplePdfs } from '../pdfGeneration/generatePdf';

export default function PdfMerger() {
  const [files, setFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedUrl, setMergedUrl] = useState(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const pdfs = selected.filter(file => file.type === 'application/pdf');
    if (pdfs.length !== selected.length) {
      alert("Only PDF files are allowed.");
    }
    setFiles(prev => [...prev, ...pdfs]);
    setMergedUrl(null); // Reset preview on new upload
  };

  const moveFile = (index, direction) => {
    const newFiles = [...files];
    if (direction === 'up' && index > 0) {
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    } else if (direction === 'down' && index < newFiles.length - 1) {
      [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
    }
    setFiles(newFiles);
    setMergedUrl(null);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setMergedUrl(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return alert("Please select at least 2 PDFs to merge.");
    setIsMerging(true);
    try {
      const url = await mergeMultiplePdfs(files);
      setMergedUrl(url);
    } catch (error) {
      alert("Error merging PDFs. Ensure they are valid, unencrypted PDF files.");
    }
    setIsMerging(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[80vh] min-h-screen lg:min-h-0">
      
      {/* LEFT COLUMN: Uploader & List */}
      <div className="flex flex-col h-full max-h-[60vh] lg:max-h-full">
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
      <div className="flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner min-h-[500px] lg:min-h-0">
        <div className="bg-slate-800 text-slate-200 p-3 flex justify-between items-center border-b border-slate-700">
          <span className="text-sm font-semibold tracking-wide">Result Preview</span>
          {mergedUrl && (
            <a href={mergedUrl} download="Merged_Document.pdf" className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold py-1 px-4 rounded transition-colors shadow-md">
              Download PDF
            </a>
          )}
        </div>
        
        <div className="flex-grow w-full h-full relative">
          {mergedUrl ? (
            <iframe src={`${mergedUrl}#toolbar=0&navpanes=0&view=FitH`} className="absolute inset-0 w-full h-full rounded-b-xl" title="Merged PDF" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
              Upload and arrange PDFs to see the merged result.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}