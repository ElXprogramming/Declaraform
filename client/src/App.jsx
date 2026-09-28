import React, { useState, useEffect } from 'react';
import IndividualForm from './features/individualForm/IndividualForm';
import GroupForm from './features/groupForm/GroupForm';
import DotGrid from './components/backgrounds/DotGrid'; // <-- New import

export default function App() {
  const [activeTab, setActiveTab] = useState('individual');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen text-gray-800 p-4 md:p-8 overflow-hidden bg-gray-900">
      
      {/* The Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900">
        <DotGrid
          dotSize={6}
          gap={24}
          baseColor="#374151" /* Tailwind gray-700 for subtle background dots */
          activeColor="#60a5fa" /* Tailwind blue-400 to match your active tabs */
          proximity={150}
          shockRadius={250}
          shockStrength={5}
        />
      </div>

      {/* The Content Layer */}
      <div className="relative z-10 max-w-[1400px] mx-auto w-full">
        
        <header className="mb-8 text-center drop-shadow-md pointer-events-none">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            UMS Declaration Form Filler
          </h1>
          <p className="text-gray-200">Generate your asynchronous mode assessment forms instantly.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 border-b border-gray-400/30">
          <button
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'individual'
                ? 'border-b-2 border-blue-400 text-blue-400 drop-shadow'
                : 'text-gray-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('individual')}
          >
            Individual Form
          </button>
          <button
            className={`px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'group'
                ? 'border-b-2 border-blue-400 text-blue-400 drop-shadow'
                : 'text-gray-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('group')}
          >
            Group Form
          </button>
        </div>

        {/* Form Container */}
        <main className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl border border-white/20">
          {activeTab === 'individual' ? <IndividualForm /> : <GroupForm />}
        </main>

        <footer className="mt-12 mb-8 text-center text-sm text-gray-300 drop-shadow-md pointer-events-none">
          <p>
            Concept and Development by <strong>Eldion Ryan Godius</strong>.
          </p>
          <p className="mt-1 pointer-events-auto">
            Have feedback or issues? Contact me at <a href="mailto:nayrnoidle@gmail.com" className="text-blue-300 hover:underline">nayrnoidle@gmail.com</a>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            &copy; {new Date().getFullYear()} All Rights Reserved. Not officially affiliated with Universiti Malaysia Sabah.
          </p>
        </footer>

      </div>
    </div>
  );
}