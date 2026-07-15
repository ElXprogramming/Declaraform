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
      // Check if the canvas reference exists and isn't empty
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        // Use the standard toDataURL instead of getTrimmedCanvas to prevent dimension errors
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
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 mt-4">
      <div className="flex space-x-4 mb-4 border-b pb-2">
        <button
          type="button"
          className={`font-semibold text-sm ${activeTab === 'draw' ? 'text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('draw')}
        >
          Draw Signature
        </button>
        <button
          type="button"
          className={`font-semibold text-sm ${activeTab === 'upload' ? 'text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Image
        </button>
      </div>

      {activeTab === 'draw' ? (
        <div>
          <div className="border bg-white rounded-md mb-2">
            <SignaturePad
              ref={sigCanvas}
              canvasProps={{
                className: 'signature-canvas w-full h-40 rounded-md cursor-crosshair'
              }}
            />
          </div>
          <button type="button" onClick={clearCanvas} className="text-xs text-red-500 hover:underline">
            Clear
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-40 bg-white">
          <input type="file" accept="image/png, image/jpeg" onChange={handleFileUpload} className="text-sm text-gray-500" />
          {uploadedImage && <p className="text-xs text-green-600 mt-2">Image loaded successfully.</p>}
        </div>
      )}

      <button
        type="button"
        onClick={saveSignature}
        className="mt-4 bg-gray-800 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors"
      >
        Confirm Signature
      </button>
    </div>
  );
}