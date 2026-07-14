import React, { useState } from 'react';
import { generateIndividualForm } from '../pdfGeneration/generatePdf';


export default function IndividualForm() {
  const [formData, setFormData] = useState({
    fullName: 'Eldion Ryan Godius',
    matricNo: 'BI23110190',
    phoneEmail: '',
    courseName: '',
    courseCode: '',
    assessmentType: '',
    otherAssessment: '',
    usedAITools: false,
    icPassport: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    generateIndividualForm(formData);
  };

  return (
    <form onSubmit={handleGenerate} className="space-y-6">
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

      <div className="mt-6 flex justify-end">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Generate PDF
        </button>
      </div>
    </form>
  );
}