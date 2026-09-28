import React, { useState, useEffect } from 'react';
import { generateGroupForm } from '../pdfGeneration/generatePdf';
import SignatureCanvas from '../../components/form/SignatureCanvas';

export default function GroupForm() {
  const [activeSigningIndex, setActiveSigningIndex] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
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
    members: Array(10).fill({ name: '', matric: '', ic: '', signature: null })
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      const url = await generateGroupForm(formData);
      setPreviewUrl(url);
    }, 500); 
    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[90vh] min-h-screen lg:min-h-0">
      
      {/* LEFT COLUMN: The Form */}
      <div className="overflow-y-auto pr-4 pb-20 custom-scrollbar max-h-[60vh] lg:max-h-full">
        <form className="space-y-6">
          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4">A. Leader's Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Leader's Full Name</label>
              <input type="text" name="leaderName" value={formData.leaderName} onChange={handleChange} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Leader's Matric No.</label>
              <input type="text" name="leaderMatric" value={formData.leaderMatric} onChange={handleChange} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Phone No. & E-mail</label>
              <input type="text" name="leaderPhoneEmail" value={formData.leaderPhoneEmail} onChange={handleChange} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">I.C. No / Passport</label>
              <input type="text" name="icPassport" value={formData.icPassport} onChange={handleChange} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Course Name</label>
              <input type="text" name="courseName" value={formData.courseName} onChange={handleChange} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Course Code</label>
              <input type="text" name="courseCode" value={formData.courseCode} onChange={handleChange} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-teal-500" required />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Assessment Type</label>
            <div className="flex flex-wrap gap-4">
              {['Assignment', 'Quiz', 'Lab Exercise', 'Project'].map(type => (
                <label key={type} className="inline-flex items-center">
                  <input type="radio" name="assessmentType" value={type} checked={formData.assessmentType === type} onChange={handleChange} className="accent-teal-500 bg-slate-800 border-slate-700" />
                  <span className="ml-2 text-sm text-slate-300">{type}</span>
                </label>
              ))}
              <label className="inline-flex items-center">
                <input type="radio" name="assessmentType" value="Others" checked={formData.assessmentType === 'Others'} onChange={handleChange} className="accent-teal-500 bg-slate-800 border-slate-700" />
                <span className="ml-2 text-sm text-slate-300">Others:</span>
                <input type="text" name="otherAssessment" value={formData.otherAssessment} onChange={handleChange} disabled={formData.assessmentType !== 'Others'} className="ml-2 p-1 bg-transparent border-b border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-teal-500 disabled:opacity-50" placeholder="Specify..." />
              </label>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4 mt-8">B. Declaration</h2>
          <label className="inline-flex items-center">
            <input type="checkbox" name="usedAITools" checked={formData.usedAITools} onChange={handleChange} className="rounded accent-teal-500 w-5 h-5 bg-slate-800 border-slate-700" />
            <span className="ml-3 text-sm font-medium text-slate-300">I have used AI tools in this assignment / assessment</span>
          </label>

          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-700 pb-2 mb-4 mt-8">C. Signature</h2>

          {formData.signature ? (
            <div className="mt-4 p-4 border border-slate-700 rounded-lg bg-slate-800/50">
              <p className="text-sm font-semibold text-teal-400 mb-2">Signature Confirmed!</p>
              
              <div className="bg-white p-2 border border-slate-600 rounded inline-block">
                <img src={formData.signature} alt="Signature Preview" className="h-20 object-contain" />
              </div>
              <br/>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, signature: null})} 
                className="text-xs text-red-400 mt-4 hover:text-red-300 hover:underline font-medium"
              >
                Remove Signature
              </button>
            </div>
          ) : (
            <SignatureCanvas onSaveSignature={(sigData) => setFormData({...formData, signature: sigData})} />
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
                {formData.members.map((member, idx) => (
                  <tr key={idx} className={activeSigningIndex === idx ? 'bg-slate-800/80' : ''}>
                    <td className="px-4 py-2 text-sm text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-1"><input type="text" value={member.name} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)} className="w-full p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded focus:border-teal-500 focus:outline-none" /></td>
                    <td className="px-4 py-1"><input type="text" value={member.matric} onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)} className="w-full p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded focus:border-teal-500 focus:outline-none" /></td>
                    <td className="px-4 py-1"><input type="text" value={member.ic} onChange={(e) => handleMemberChange(idx, 'ic', e.target.value)} className="w-full p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded focus:border-teal-500 focus:outline-none" /></td>
                    <td className="px-4 py-1 min-w-[120px]">
                      {member.signature ? (
                        <div className="flex flex-col items-center">
                          <div className="bg-white p-0.5 rounded border border-slate-600 mb-1">
                            <img src={member.signature} alt="sig" className="h-6 object-contain" />
                          </div>
                          <button type="button" onClick={() => handleMemberChange(idx, 'signature', null)} className="text-[10px] text-red-400 hover:text-red-300 hover:underline">Remove</button>
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
                ))}
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
        </form>
      </div>

      {/* RIGHT COLUMN: The PDF Preview */}
      <div className="flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner min-h-[500px] lg:min-h-0">
        <div className="bg-slate-800 text-slate-200 p-3 flex justify-between items-center border-b border-slate-700">
          <span className="text-sm font-semibold tracking-wide">Live Preview</span>
          
          <div className="flex gap-2">
            {previewUrl && (
              <>
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-1 px-3 rounded transition-colors lg:hidden"
                >
                  Full Screen
                </a>
                
                <a 
                  href={previewUrl} 
                  download={`Group_Declaration_${formData.leaderMatric}.pdf`}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold py-1 px-3 rounded transition-colors shadow-md"
                >
                  Download PDF
                </a>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-grow w-full h-full relative">
          {previewUrl ? (
            <iframe 
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} 
              className="absolute inset-0 w-full h-full rounded-b-xl"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Generating preview...
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}