import React, { useState } from 'react';
import { generateGroupForm } from '../pdfGeneration/generatePdf';


export default function GroupForm() {
  const [formData, setFormData] = useState({
    leaderName: 'Eldion Ryan Godius',
    leaderMatric: 'BI23110190',
    leaderPhoneEmail: '',
    leaderIC: '',
    courseName: '',
    courseCode: '',
    assessmentType: '',
    usedAITools: false,
    date: new Date().toISOString().split('T')[0],
    // Initialize 10 empty members for the table
    members: Array(10).fill({ name: '', matric: '', ic: '' })
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
          <label className="block text-sm font-medium text-gray-700">Course Code</label>
          <input type="text" name="courseCode" value={formData.courseCode} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" required />
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-700 border-b pb-2 mb-4 mt-8">D. List of Group Members</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">I.C. Number</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {formData.members.map((member, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-4 py-1"><input type="text" value={member.name} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-4 py-1"><input type="text" value={member.matric} onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="px-4 py-1"><input type="text" value={member.ic} onChange={(e) => handleMemberChange(idx, 'ic', e.target.value)} className="w-full p-1 border rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Generate PDF
        </button>
      </div>
    </form>
  );
}