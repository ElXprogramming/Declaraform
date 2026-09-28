import React, { useRef, useState } from 'react';
import SignaturePad from 'react-signature-canvas';

export default function SignatureCanvas({ onSaveSignature }) {
  const [activeTab, setActiveTab] = useState('draw');
  const [uploadedImage, setUploadedImage] = useState(null);
  const sigCanvas = useRef(null);

  const clearCanvas = () => {
    sigCanvas.current.clear();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSignature = (e) => {
    e.preventDefault(); 
    
    if (activeTab === 'draw') {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const signatureData = sigCanvas.current.toDataURL('image/png');
        onSaveSignature(signatureData);
      } else {
        alert("Please draw a signature before confirming.");
      }
    } else if (activeTab === 'upload') {
      if (uploadedImage) {
        onSaveSignature(uploadedImage);
      } else {
        alert("Please upload an image before confirming.");
      }
    }
  };

  return (
    <div className="border border-slate-700 rounded-lg p-4 bg-slate-800 mt-4">
      <div className="flex space-x-4 mb-4 border-b border-slate-700 pb-2">
        <button
          type="button"
          className={`font-semibold text-sm ${activeTab === 'draw' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('draw')}
        >
          Draw Signature
        </button>
        <button
          type="button"
          className={`font-semibold text-sm ${activeTab === 'upload' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Image
        </button>
      </div>

      {activeTab === 'draw' ? (
        <div>
          {/* Keep the canvas pad itself white so the black pen is visible */}
          <div className="border border-slate-600 bg-white rounded-md mb-2 overflow-hidden">
            <SignaturePad
              ref={sigCanvas}
              canvasProps={{
                className: 'signature-canvas w-full h-40 rounded-md cursor-crosshair'
              }}
            />
          </div>
          <button type="button" onClick={clearCanvas} className="text-xs text-red-400 hover:text-red-300 hover:underline">
            Clear
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-md h-40 bg-slate-900/50">
          <input type="file" accept="image/png, image/jpeg" onChange={handleFileUpload} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600" />
          {uploadedImage && <p className="text-xs text-teal-400 mt-2">Image loaded successfully.</p>}
        </div>
      )}

      <button
        type="button"
        onClick={saveSignature}
        className="mt-4 bg-slate-700 text-white text-sm px-4 py-2 rounded hover:bg-slate-600 transition-colors shadow-sm"
      >
        Confirm Signature
      </button>
    </div>
  );
}