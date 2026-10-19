import { useState, useEffect, useRef } from 'react';
import { generateGroupForm } from '../pdfGeneration/generatePdf';
import SignatureCanvas from '../../components/form/SignatureCanvas';
import PdfPreviewCanvas from '../../components/common/PdfPreviewCanvas';
import useBrowserStorage from '../../hooks/useBrowserStorage';
import { ASSESSMENT_TYPES, GROUP_MEMBER_COUNT, STORAGE_KEYS } from '../../utils/constants';
import {
  FIELD_LIMITS,
  isSafeBlobUrl,
  isSafeSignatureDataUrl,
  sanitizeDownloadFilename,
  sanitizePlainText,
} from '../../utils/security';

const EMPTY_MEMBER = { name: '', matric: '', ic: '', signature: null };

const LEADER_FIELD_MAX_LENGTH_MAP = {
  leaderName: FIELD_LIMITS.NAME,
  leaderMatric: FIELD_LIMITS.MATRIC,
  leaderPhoneEmail: FIELD_LIMITS.PHONE_EMAIL,
  icPassport: FIELD_LIMITS.IC_PASSPORT,
  courseName: FIELD_LIMITS.COURSE_NAME,
  courseCode: FIELD_LIMITS.COURSE_CODE,
  otherAssessment: FIELD_LIMITS.OTHER_ASSESSMENT,
};

const MEMBER_FIELD_MAX_LENGTH_MAP = {
  name: FIELD_LIMITS.NAME,
  matric: FIELD_LIMITS.MATRIC,
  ic: FIELD_LIMITS.IC_PASSPORT,
};

export default function GroupForm() {
  const [activeSigningIndex, setActiveSigningIndex] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewPage, setPreviewPage] = useState('both'); // 'both' | 1 | 2
  const [mobileTab, setMobileTab] = useState('form');

  const rawPreviewUrl = previewData?.url;
  const previewBytes = previewData?.bytes;
  const previewUrl = isSafeBlobUrl(rawPreviewUrl) ? rawPreviewUrl : null;
  const previewPages = (previewData?.pages || []).filter(isSafeBlobUrl);

  // Draft is kept in volatile sessionStorage: survives page refresh, cleared when the tab closes.
  const [formData, setFormData] = useBrowserStorage(
    STORAGE_KEYS.GROUP_DRAFT,
    () => ({
      leaderName: '',
      leaderMatric: '',
      leaderPhoneEmail: '',
      icPassport: '',
      courseName: '',
      courseCode: '',
      assessmentType: 'Assignment',
      otherAssessment: '',
      usedAITools: false,
      signature: null,
      date: new Date().toISOString().split('T')[0],
      members: Array.from({ length: GROUP_MEMBER_COUNT }, () => ({ ...EMPTY_MEMBER })),
    }),
    {
      type: 'session',
      fallback: (data) => ({
        ...data,
        signature: null,
        members: (data.members || []).map((m) => ({ ...m, signature: null })),
      }),
    }
  );

  const safeLeaderSignature = isSafeSignatureDataUrl(formData.signature) ? formData.signature : null;
  const safeDownloadName = `Group_Declaration_${sanitizeDownloadFilename(formData.leaderMatric, 'Group')}.pdf`;

  // Guard against a malformed/older draft so the members table never breaks.
  useEffect(() => {
    if (!Array.isArray(formData.members) || formData.members.length !== GROUP_MEMBER_COUNT) {
      const existing = Array.isArray(formData.members) ? formData.members : [];
      setFormData((prev) => ({
        ...prev,
        members: Array.from({ length: GROUP_MEMBER_COUNT }, (_, i) => ({
          ...EMPTY_MEMBER,
          ...existing[i],
        })),
      }));
    }
  }, [formData.members, setFormData]);

  const prevUrlsRef = useRef([]);

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      const result = await generateGroupForm(formData);
      if (!isCancelled && result) {
        // Clean up previous blob URLs to free browser memory
        prevUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        prevUrlsRef.current = [result.url, ...(result.pages || [])].filter(Boolean);
        setPreviewData(result);
      }
    }, 500);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [formData]);

  useEffect(() => {
    return () => {
      prevUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: Boolean(checked) }));
      return;
    }

    const maxLen = LEADER_FIELD_MAX_LENGTH_MAP[name] || 120;
    const sanitizedValue = sanitizePlainText(value, maxLen);
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  const handleMemberChange = (index, field, value) => {
    if (index < 0 || index >= GROUP_MEMBER_COUNT) return;
    if (field === 'signature') {
      const safeSig = value && isSafeSignatureDataUrl(value) ? value : null;
      setFormData((prev) => {
        const newMembers = [...prev.members];
        newMembers[index] = { ...newMembers[index], signature: safeSig };
        return { ...prev, members: newMembers };
      });
      return;
    }

    const maxLen = MEMBER_FIELD_MAX_LENGTH_MAP[field];
    if (!maxLen) return;
    const sanitizedValue = sanitizePlainText(value, maxLen);
    setFormData((prev) => {
      const newMembers = [...prev.members];
      newMembers[index] = { ...newMembers[index], [field]: sanitizedValue };
      return { ...prev, members: newMembers };
    });
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
          {previewUrl && <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[90vh] min-h-0">
        
        {/* LEFT COLUMN: The Form */}
        <div className={`overflow-y-auto lg:pr-4 pb-8 custom-scrollbar lg:max-h-full ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4">A. Leader's Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Leader's Full Name</label>
                <input
                  type="text"
                  name="leaderName"
                  maxLength={FIELD_LIMITS.NAME}
                  value={formData.leaderName}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Leader's Matric No.</label>
                <input
                  type="text"
                  name="leaderMatric"
                  maxLength={FIELD_LIMITS.MATRIC}
                  value={formData.leaderMatric}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Phone No. & E-mail</label>
                <input
                  type="text"
                  name="leaderPhoneEmail"
                  maxLength={FIELD_LIMITS.PHONE_EMAIL}
                  value={formData.leaderPhoneEmail}
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
                  <label key={type} className="inline-flex items-center">
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
            <label className="inline-flex items-center">
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

            {safeLeaderSignature ? (
              <div className="mt-4 p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                <p className="text-sm font-semibold text-teal-400 mb-2">Signature Confirmed!</p>
                
                <div className="bg-white p-2 border border-slate-600 rounded inline-block">
                  <img src={safeLeaderSignature} alt="Signature Preview" className="h-20 object-contain" />
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

            <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4 mt-8">D. List of Group Members</h2>
            <div className="overflow-x-auto border border-slate-700 rounded-md">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Matric No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">I.C. Number</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Signature</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900/50 divide-y divide-slate-700">
                  {formData.members.map((member, idx) => {
                    const safeMemberSig = isSafeSignatureDataUrl(member.signature) ? member.signature : null;
                    return (
                      <tr key={idx} className={activeSigningIndex === idx ? 'bg-slate-800/80' : ''}>
                        <td className="px-4 py-2 text-sm text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-1">
                          <input
                            type="text"
                            maxLength={FIELD_LIMITS.NAME}
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            className="w-full p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded focus:border-teal-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-1">
                          <input
                            type="text"
                            maxLength={FIELD_LIMITS.MATRIC}
                            value={member.matric}
                            onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)}
                            className="w-full p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded focus:border-teal-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-1">
                          <input
                            type="text"
                            maxLength={FIELD_LIMITS.IC_PASSPORT}
                            value={member.ic}
                            onChange={(e) => handleMemberChange(idx, 'ic', e.target.value)}
                            className="w-full p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded focus:border-teal-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-1 min-w-[120px]">
                          {safeMemberSig ? (
                            <div className="flex flex-col items-center">
                              <div className="bg-white p-0.5 rounded border border-slate-600 mb-1">
                                <img src={safeMemberSig} alt="sig" className="h-6 object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleMemberChange(idx, 'signature', null)}
                                className="text-[10px] text-red-400 hover:text-red-300 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => setActiveSigningIndex(idx)}
                              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded border border-slate-600 w-full transition-colors"
                            >
                              {activeSigningIndex === idx ? 'Signing...' : 'Add'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Shared Signature Canvas for Members */}
            {activeSigningIndex !== null && (
              <div className="mt-4 p-4 border border-teal-500/30 bg-teal-900/20 rounded-lg shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-teal-400">
                    Adding Signature for Member #{activeSigningIndex + 1}
                  </h3>
                  <button type="button" onClick={() => setActiveSigningIndex(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-200">
                    Cancel
                  </button>
                </div>
                <SignatureCanvas 
                  onSaveSignature={(sigData) => {
                    handleMemberChange(activeSigningIndex, 'signature', sigData);
                    setActiveSigningIndex(null); 
                  }} 
                />
              </div>
            )}

            {/* Mobile Action to Switch to Preview */}
            <div className="pt-4 lg:hidden">
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
              {previewUrl && (
                <>
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded transition-colors"
                  >
                    Full Screen
                  </a>
                  
                  <a 
                    href={previewUrl} 
                    download={safeDownloadName}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs md:text-sm font-bold py-1.5 px-3 md:px-4 rounded transition-colors shadow-md"
                  >
                    Download PDF
                  </a>
                </>
              )}
            </div>
          </div>
          
          {/* Page Switcher Bar */}
          {previewPages.length > 1 && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
              <span className="text-slate-400 font-medium">Pages (2):</span>
              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setPreviewPage('both')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                    previewPage === 'both' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Scroll Both
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPage(1)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                    previewPage === 1 ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Page 1
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPage(2)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                    previewPage === 2 ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Page 2
                </button>
              </div>
            </div>
          )}

          {/* UNIFIED PREVIEW CONTAINER: Follows the mobile card layout on all screens */}
          <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-4 h-[65vh] lg:h-auto">
            {previewUrl ? (
              previewPage === 'both' ? (
                <>
                  <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                    <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                      <span>Page 1: Leader & Declaration</span>
                      <span className="text-slate-400 font-normal">1 of 2</span>
                    </div>
                    <div className="w-full p-2 bg-slate-950 flex items-center justify-center">
                      <PdfPreviewCanvas url={previewPages[0] || previewUrl} bytes={previewBytes} pageNumber={1} />
                    </div>
                  </div>

                  <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                    <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                      <span>Page 2: Group Members Table</span>
                      <span className="text-slate-400 font-normal">2 of 2</span>
                    </div>
                    <div className="w-full p-2 bg-slate-950 flex items-center justify-center">
                      <PdfPreviewCanvas url={previewPages[1] || previewUrl} bytes={previewBytes} pageNumber={2} />
                    </div>
                  </div>
                </>
              ) : previewPage === 1 ? (
                <div className="flex flex-col h-full min-h-[520px] lg:min-h-0 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                  <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                    <span>Page 1: Leader & Declaration</span>
                    <span className="text-slate-400 font-normal">1 of 2</span>
                  </div>
                  <div className="w-full flex-grow p-2 bg-slate-950 flex items-center justify-center overflow-y-auto custom-scrollbar">
                    <PdfPreviewCanvas url={previewPages[0] || previewUrl} bytes={previewBytes} pageNumber={1} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full min-h-[520px] lg:min-h-0 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                  <div className="px-3 py-1.5 bg-slate-800/90 text-[11px] font-bold text-teal-400 flex justify-between items-center">
                    <span>Page 2: Group Members Table</span>
                    <span className="text-slate-400 font-normal">2 of 2</span>
                  </div>
                  <div className="w-full flex-grow p-2 bg-slate-950 flex items-center justify-center overflow-y-auto custom-scrollbar">
                    <PdfPreviewCanvas url={previewPages[1] || previewUrl} bytes={previewBytes} pageNumber={2} />
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-48 lg:h-full text-slate-500 text-sm">
                Generating preview...
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}