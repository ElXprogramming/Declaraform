import React, { useState } from 'react';
import IndividualForm from './features/individualForm/IndividualForm';
import GroupForm from './features/groupForm/GroupForm';

export default function App() {
  const [activeTab, setActiveTab] = useState('individual');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-blue-900 mb-2">
            UMS Declaration Form Filler
          </h1>
          <p className="text-gray-500">Generate your asynchronous mode assessment forms instantly.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 border-b border-gray-200">
          <button
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'individual'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('individual')}
          >
            Individual Form
          </button>
          <button
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'group'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('group')}
          >
            Group Form
          </button>
        </div>

        {/* Form Container */}
        <main className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
          {activeTab === 'individual' ? <IndividualForm /> : <GroupForm />}
        </main>

        {/* Main Content Above */}
        
        {/* Footer */}
        <footer className="mt-12 mb-8 text-center text-sm text-gray-500">
          <p>
            Concept and Development by <strong>Eldion Ryan Godius</strong>.
          </p>
          <p className="mt-1">
            Have feedback or issues? Contact me at <a href="mailto:nayrnoidle@gmail.com" className="text-blue-600 hover:underline">nayrnoidle@gmail.com</a>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            &copy; {new Date().getFullYear()} All Rights Reserved. Not officially affiliated with Universiti Malaysia Sabah.
          </p>
        </footer>
      </div>
    </div>
  );
}