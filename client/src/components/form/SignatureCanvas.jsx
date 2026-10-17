import { useRef, useState } from 'react';
import SignaturePad from 'react-signature-canvas';
import { isSafeSignatureDataUrl, logSafeError, validateImageUpload } from '../../utils/security';

const MAX_SIGNATURE_WIDTH = 600;
const MAX_SIGNATURE_HEIGHT = 240;

/**
 * Re-encodes an uploaded image file through an offscreen HTML5 Canvas into a clean,
 * bounded PNG data URL. This strips EXIF metadata and neutralizes image polyglot payloads.
 */
function sanitizeImageViaCanvas(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
          reject(new Error('Invalid image dimensions.'));
          return;
        }

        const scale = Math.min(
          1,
          MAX_SIGNATURE_WIDTH / img.naturalWidth,
          MAX_SIGNATURE_HEIGHT / img.naturalHeight
        );
        const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const cleanDataUrl = canvas.toDataURL('image/png');
        if (!isSafeSignatureDataUrl(cleanDataUrl)) {
          reject(new Error('Sanitized signature image exceeded safety limits.'));
          return;
        }
        resolve(cleanDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image file.'));
    };

    img.src = objectUrl;
  });
}

export default function SignatureCanvas({ onSaveSignature }) {
  const [activeTab, setActiveTab] = useState('draw');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const sigCanvas = useRef(null);

  const clearCanvas = () => {
    sigCanvas.current?.clear();
    setErrorMessage('');
  };

  const handleFileUpload = async (e) => {
    setErrorMessage('');
    setUploadedImage(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateImageUpload(file);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      e.target.value = '';
      return;
    }

    try {
      const sanitizedDataUrl = await sanitizeImageViaCanvas(file);
      setUploadedImage(sanitizedDataUrl);
    } catch (error) {
      logSafeError('SignatureCanvas.upload', error);
      setErrorMessage('Could not process the selected image. Please use a standard PNG or JPEG file.');
      e.target.value = '';
    }
  };

  const saveSignature = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (activeTab === 'draw') {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const signatureData = sigCanvas.current.toDataURL('image/png');
        if (!isSafeSignatureDataUrl(signatureData)) {
          setErrorMessage('Invalid signature data generated. Please clear and redraw.');
          return;
        }
        onSaveSignature(signatureData);
      } else {
        setErrorMessage('Please draw a signature before confirming.');
      }
    } else if (activeTab === 'upload') {
      if (uploadedImage && isSafeSignatureDataUrl(uploadedImage)) {
        onSaveSignature(uploadedImage);
      } else {
        setErrorMessage('Please upload a valid PNG or JPEG signature image before confirming.');
      }
    }
  };

  return (
    <div className="border border-slate-700 rounded-lg p-4 bg-slate-800 mt-4">
      <div className="flex space-x-4 mb-4 border-b border-slate-700 pb-2">
        <button
          type="button"
          className={`font-semibold text-sm ${activeTab === 'draw' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => {
            setActiveTab('draw');
            setErrorMessage('');
          }}
        >
          Draw Signature
        </button>
        <button
          type="button"
          className={`font-semibold text-sm ${activeTab === 'upload' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => {
            setActiveTab('upload');
            setErrorMessage('');
          }}
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
                className: 'signature-canvas w-full h-40 rounded-md cursor-crosshair touch-none',
              }}
            />
          </div>
          <button type="button" onClick={clearCanvas} className="text-xs text-red-400 hover:text-red-300 hover:underline">
            Clear
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-md h-40 bg-slate-900/50 p-3 text-center">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleFileUpload}
            className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">PNG or JPEG only, max 2 MB</p>
          {uploadedImage && <p className="text-xs text-teal-400 mt-1">Image verified & loaded safely.</p>}
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="text-xs text-red-400 mt-2 font-medium">
          {errorMessage}
        </p>
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