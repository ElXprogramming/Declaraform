import React, { useState } from 'react';
import { generateGroupForm } from '../pdfGeneration/generatePdf';
import SignatureCanvas from '../../components/form/SignatureCanvas';

export default function GroupForm() {

  const [activeSigningIndex, setActiveSigningIndex] = useState(null);

  const [formData, setFormData] = useState({
    leaderName: '',
    leaderMatric: '',
    leaderPhoneEmail: '',
    leaderIC: '',
    courseName: '',
    courseCode: '',
    assessmentType: '',
    usedAITools: false,
    signature: null,
    signatureScale: 0.25,
    date: new Date().toISOString().split('T')[0],
    // Initialize 10 empty members for the table
    members: Array(10).fill({ name: '', matric: '', ic: '', signature: null, signatureScale: 0.25 })
  });

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

  const handleGenerate = (e) => {
    e.preventDefault();
    generateGroupForm(formData);
  };

  return (
    <form onSubmit={handleGenerate} className="space-y-6">
      <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4">A. Leader's Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Leader's Full Name</label>
          <input type="text" name="leaderName" value={formData.leaderName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Leader's Matric No.</label>
          <input type="text" name="leaderMatric" value={formData.leaderMatric} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone No. & E-mail</label>
          <input type="text" name="leaderPhoneEmail" value={formData.leaderPhoneEmail} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">I.C. No / Passport</label>
          <input type="text" name="icPassport" value={formData.icPassport} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Course Name</label>
          <input type="text" name="courseName" value={formData.courseName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
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
            <label key={type} className="inline-flex items-center">
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
      <label className="inline-flex items-center">
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
          
          {/* Scale Slider */}
          <div className="mt-4 max-w-sm">
            <label className="block text-sm font-medium text-gray-700">
              Adjust Signature Size on PDF: {formData.signatureScale}x
            </label>
            <input 
              type="range" 
              name="signatureScale"
              min="0.05" 
              max="1.5" 
              step="0.05" 
              value={formData.signatureScale} 
              onChange={handleChange}
              className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Slide left to make it smaller, right to make it larger.
            </p>
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

      <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4 mt-8">D. List of Group Members</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">I.C. Number</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Signature</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {formData.members.map((member, idx) => (
              <tr key={idx} className={activeSigningIndex === idx ? 'bg-blue-50' : ''}>
                <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-4 py-1"><input type="text" value={member.name} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-4 py-1"><input type="text" value={member.matric} onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-4 py-1"><input type="text" value={member.ic} onChange={(e) => handleMemberChange(idx, 'ic', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-4 py-1 min-w-[120px]">
                  {member.signature ? (
                    <div className="flex flex-col items-center">
                      <img src={member.signature} alt="sig" className="h-8 object-contain mb-1" />
                      <input 
                        type="range" min="0.05" max="1.0" step="0.05" 
                        value={member.signatureScale} 
                        onChange={(e) => handleMemberChange(idx, 'signatureScale', e.target.value)} 
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <button type="button" onClick={() => handleMemberChange(idx, 'signature', null)} className="text-[10px] text-red-500 mt-1 hover:underline">Remove</button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setActiveSigningIndex(idx)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border w-full transition-colors"
                    >
                      {activeSigningIndex === idx ? 'Signing...' : 'Add Signature'}
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
        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-blue-800">
              Adding Signature for Member #{activeSigningIndex + 1}
            </h3>
            <button type="button" onClick={() => setActiveSigningIndex(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-800">
              Cancel
            </button>
          </div>
          <SignatureCanvas 
            onSaveSignature={(sigData) => {
              handleMemberChange(activeSigningIndex, 'signature', sigData);
              setActiveSigningIndex(null); // Automatically hide canvas after confirming
            }} 
          />
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Generate PDF
        </button>
      </div>
    </form>
  );
}