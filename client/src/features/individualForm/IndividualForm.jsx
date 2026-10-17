import { useState, useEffect, useRef } from 'react';
import { generateIndividualForm } from '../pdfGeneration/generatePdf';
import SignatureCanvas from '../../components/form/SignatureCanvas';
import useBrowserStorage from '../../hooks/useBrowserStorage';
import { ASSESSMENT_TYPES, STORAGE_KEYS } from '../../utils/constants';
import {
  FIELD_LIMITS,
  isSafeBlobUrl,
  isSafeSignatureDataUrl,
  sanitizeDownloadFilename,
  sanitizePlainText,
} from '../../utils/security';

const FIELD_MAX_LENGTH_MAP = {
  fullName: FIELD_LIMITS.NAME,
  matricNo: FIELD_LIMITS.MATRIC,
  phoneEmail: FIELD_LIMITS.PHONE_EMAIL,
  icPassport: FIELD_LIMITS.IC_PASSPORT,
  courseName: FIELD_LIMITS.COURSE_NAME,
  courseCode: FIELD_LIMITS.COURSE_CODE,
  otherAssessment: FIELD_LIMITS.OTHER_ASSESSMENT,
};

export default function IndividualForm() {
  // Only non-PII course metadata is persisted to sessionStorage by useBrowserStorage;
  // PII (fullName, matricNo, phoneEmail, icPassport, signature) remains strictly in React memory.
  const [formData, setFormData] = useBrowserStorage(
    STORAGE_KEYS.INDIVIDUAL_DRAFT,
    () => ({
      fullName: '',
      matricNo: '',
      phoneEmail: '',
      courseName: '',
      courseCode: '',
      assessmentType: 'Assignment',
      otherAssessment: '',
      usedAITools: false,
      icPassport: '',
      date: new Date().toISOString().split('T')[0],
      signature: null,
    }),
    { type: 'session' }
  );

  const [previewUrl, setPreviewUrl] = useState(null);
  const [mobileTab, setMobileTab] = useState('form');
  const prevUrlRef = useRef(null);

  const safePreviewUrl = isSafeBlobUrl(previewUrl) ? previewUrl : null;
  const safeSignatureUrl = isSafeSignatureDataUrl(formData.signature) ? formData.signature : null;
  const safeDownloadName = `Declaration_${sanitizeDownloadFilename(formData.matricNo, 'Form')}.pdf`;

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      const url = await generateIndividualForm(formData);
      if (!isCancelled && url && isSafeBlobUrl(url)) {
        if (prevUrlRef.current && prevUrlRef.current !== url) {
          URL.revokeObjectURL(prevUrlRef.current);
        }
        prevUrlRef.current = url;
        setPreviewUrl(url);
      }
    }, 500);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [formData]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: Boolean(checked) }));
      return;
    }

    const maxLen = FIELD_MAX_LENGTH_MAP[name] || 120;
    const sanitizedValue = sanitizePlainText(value, maxLen);
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  return (
    <div>
      {/* Mobile-only Segmented Sub-Tab Switcher */}
      <div className="lg:hidden flex bg-slate-950/90 p-1.5 rounded-2xl mb-5 border border-slate-800 shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'form'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          <span>Fill Form</span>
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
          <span>Preview PDF</span>
          {safePreviewUrl && <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[80vh] min-h-0">
        
        {/* LEFT COLUMN: The Form */}
        <div className={`overflow-y-auto lg:pr-4 pb-8 custom-scrollbar lg:max-h-full ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4">A. Student's Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  maxLength={FIELD_LIMITS.NAME}
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Matric No.</label>
                <input
                  type="text"
                  name="matricNo"
                  maxLength={FIELD_LIMITS.MATRIC}
                  value={formData.matricNo}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Phone No. & E-mail</label>
                <input
                  type="text"
                  name="phoneEmail"
                  maxLength={FIELD_LIMITS.PHONE_EMAIL}
                  value={formData.phoneEmail}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">I.C. No / Passport</label>
                <input
                  type="text"
                  name="icPassport"
                  maxLength={FIELD_LIMITS.IC_PASSPORT}
                  value={formData.icPassport}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Course Name</label>
                <input
                  type="text"
                  name="courseName"
                  maxLength={FIELD_LIMITS.COURSE_NAME}
                  value={formData.courseName}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Course Code</label>
                <input
                  type="text"
                  name="courseCode"
                  maxLength={FIELD_LIMITS.COURSE_CODE}
                  value={formData.courseCode}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Assessment Type</label>
              <div className="flex flex-wrap gap-4">
                {ASSESSMENT_TYPES.map((type) => (
                  <label key={type} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="assessmentType"
                      value={type}
                      checked={formData.assessmentType === type}
                      onChange={handleChange}
                      className="accent-teal-500 bg-slate-800 border-slate-700"
                    />
                    <span className="ml-2 text-sm text-slate-300">{type}</span>
                  </label>
                ))}
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="assessmentType"
                    value="Others"
                    checked={formData.assessmentType === 'Others'}
                    onChange={handleChange}
                    className="accent-teal-500 bg-slate-800 border-slate-700"
                  />
                  <span className="ml-2 text-sm text-slate-300">Others:</span>
                  <input
                    type="text"
                    name="otherAssessment"
                    maxLength={FIELD_LIMITS.OTHER_ASSESSMENT}
                    value={formData.otherAssessment}
                    onChange={handleChange}
                    disabled={formData.assessmentType !== 'Others'}
                    className="ml-2 p-1 bg-transparent border-b border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-teal-500 disabled:opacity-50"
                    placeholder="Specify..."
                  />
                </label>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4 mt-8">B. Declaration</h2>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="usedAITools"
                checked={formData.usedAITools}
                onChange={handleChange}
                className="rounded accent-teal-500 w-5 h-5 bg-slate-800 border-slate-700"
              />
              <span className="ml-3 text-sm font-medium text-slate-300">I have used AI tools in this assignment / assessment</span>
            </label>

            <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4 mt-8">C. Signature</h2>
            {safeSignatureUrl ? (
              <div className="mt-4 p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                <p className="text-sm font-semibold text-teal-400 mb-2">Signature Confirmed!</p>
                <div className="bg-white p-2 border border-slate-600 rounded inline-block">
                  <img src={safeSignatureUrl} alt="Signature Preview" className="h-20 object-contain" />
                </div>
                <br />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, signature: null }))}
                  className="text-xs text-red-400 mt-4 hover:text-red-300 hover:underline font-medium"
                >
                  Remove Signature
                </button>
              </div>
            ) : (
              <SignatureCanvas
                onSaveSignature={(sigData) => {
                  if (isSafeSignatureDataUrl(sigData)) {
                    setFormData((prev) => ({ ...prev, signature: sigData }));
                  }
                }}
              />
            )}

            {/* Mobile Action to Switch to Preview */}
            <div className="pt-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-sm"
              >
                <span>View Preview & Download PDF</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: The PDF Preview */}
        <div className={`flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner min-h-[480px] lg:min-h-0 ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-slate-800 text-slate-200 p-3 flex justify-between items-center border-b border-slate-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className="lg:hidden text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 bg-slate-900 px-2 py-1 rounded"
              >
                ← Form
              </button>
              <span className="text-sm font-semibold tracking-wide">Live Preview</span>
            </div>
            
            <div className="flex gap-2">
              {safePreviewUrl && (
                <>
                  <a 
                    href={safePreviewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded transition-colors"
                  >
                    Full Screen
                  </a>
                  <a 
                    href={safePreviewUrl} 
                    download={safeDownloadName}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs md:text-sm font-bold py-1.5 px-3 md:px-4 rounded transition-colors shadow-md"
                  >
                    Download PDF
                  </a>
                </>
              )}
            </div>
          </div>
          
          {/* Page Info Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
            <span className="text-slate-400 font-medium">Page (1):</span>
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-teal-500 text-slate-950 shadow-sm">
              Single Page Form
            </span>
          </div>

          {/* UNIFIED PREVIEW CONTAINER: Follows the group form mobile card layout on all screens */}
          <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-3 h-[65vh] lg:h-auto flex flex-col">
            {safePreviewUrl ? (
              <div className="flex flex-col flex-grow h-full min-h-[520px] lg:min-h-0 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                  <span>Individual Declaration Form</span>
                  <span className="text-slate-400 font-normal">Page 1 of 1</span>
                </div>
                <iframe 
                  src={`${safePreviewUrl}#toolbar=0&navpanes=0&view=Fit`} 
                  className="w-full flex-grow h-[520px] sm:h-[600px] lg:h-full border-0"
                  title="Individual Declaration Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center flex-grow h-48 lg:h-full text-slate-500 text-sm">
                Generating preview...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}