import React, { useState, useEffect } from 'react';
import { generateIndividualForm } from '../pdfGeneration/generatePdf';
import SignatureCanvas from '../../components/form/SignatureCanvas';

export default function IndividualForm() {
  const [formData, setFormData] = useState({
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
    signatureScale: 0.25,
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  // --- LIVE PREVIEW EFFECT ---
  useEffect(() => {
    // We use a timeout so it doesn't generate on every single keystroke
    const timer = setTimeout(async () => {
      const url = await generateIndividualForm(formData);
      setPreviewUrl(url);
    }, 500); // Wait 500ms after you stop typing to generate

    return () => clearTimeout(timer); // Cleanup if typing continues
  }, [formData]); 
  // ---------------------------

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
      
      {/* LEFT COLUMN: The Form */}
      <div className="overflow-y-auto pr-4 pb-20 custom-scrollbar">
        <form className="space-y-6">
          <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4">A. Student's Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Matric No.</label>
              <input type="text" name="matricNo" value={formData.matricNo} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone No. & E-mail</label>
              <input type="text" name="phoneEmail" value={formData.phoneEmail} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">I.C. No / Passport</label>
              <input type="text" name="icPassport" value={formData.icPassport} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Name</label>
              <input type="text" name="courseName" value={formData.courseName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Code</label>
              <input type="text" name="courseCode" value={formData.courseCode} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Type</label>
            <div className="flex flex-wrap gap-4">
              {['Assignment', 'Quiz', 'Lab Exercise', 'Project'].map(type => (
                <label key={type} className="inline-flex items-center cursor-pointer">
                  <input type="radio" name="assessmentType" value={type} checked={formData.assessmentType === type} onChange={handleChange} className="text-blue-600" />
                  <span className="ml-2 text-sm text-gray-700">{type}</span>
                </label>
              ))}
              <label className="inline-flex items-center">
                <input type="radio" name="assessmentType" value="Others" checked={formData.assessmentType === 'Others'} onChange={handleChange} className="text-blue-600" />
                <span className="ml-2 text-sm text-gray-700">Others:</span>
                <input type="text" name="otherAssessment" value={formData.otherAssessment} onChange={handleChange} disabled={formData.assessmentType !== 'Others'} className="ml-2 p-1 border-b text-sm focus:outline-none" placeholder="Specify..." />
              </label>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4 mt-8">B. Declaration</h2>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" name="usedAITools" checked={formData.usedAITools} onChange={handleChange} className="rounded text-blue-600 w-5 h-5" />
            <span className="ml-3 text-sm font-medium text-gray-700">I have used AI tools in this assignment / assessment</span>
          </label>

          <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4 mt-8">C. Signature</h2>
          {formData.signature ? (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <p className="text-sm font-semibold text-green-600 mb-2">Signature Confirmed!</p>
              <div className="bg-white p-2 border rounded inline-block">
                <img src={formData.signature} alt="Signature Preview" className="h-20 object-contain" />
              </div>
              <div className="mt-4 max-w-sm">
                <label className="block text-sm font-medium text-gray-700">
                  Adjust Signature Size: {formData.signatureScale}x
                </label>
                <input 
                  type="range" name="signatureScale" min="0.05" max="1.5" step="0.05" 
                  value={formData.signatureScale} onChange={handleChange}
                  className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, signature: null, signatureScale: 0.25})} 
                className="text-xs text-red-500 mt-4 hover:underline font-medium"
              >
                Remove Signature
              </button>
            </div>
          ) : (
            <SignatureCanvas onSaveSignature={(sigData) => setFormData({...formData, signature: sigData})} />
          )}
        </form>
      </div>

      {/* RIGHT COLUMN: The PDF Preview */}
      <div className="flex flex-col bg-gray-200 rounded-xl overflow-hidden border border-gray-300 shadow-inner">
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
          <span className="text-sm font-semibold tracking-wide">Live Preview</span>
          {previewUrl && (
            <a 
              href={previewUrl} 
              download={`Declaration_${formData.matricNo}.pdf`}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-1 px-4 rounded transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
        
        <div className="flex-grow w-full h-full relative">
          {previewUrl ? (
            <iframe 
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} 
              className="absolute inset-0 w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Generating preview...
            </div>
          )}
        </div>
      </div>

    </div>
  );
}