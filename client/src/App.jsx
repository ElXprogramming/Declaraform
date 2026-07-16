import React, { useState, useEffect } from 'react';
import IndividualForm from './features/individualForm/IndividualForm';
import GroupForm from './features/groupForm/GroupForm';
import Ballpit from './components/backgrounds/Ballpit'; 

export default function App() {
  const [activeTab, setActiveTab] = useState('individual');
  
  // Add a mounted state
  const [isMounted, setIsMounted] = useState(false);

  // Set it to true only after the first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen text-gray-800 p-4 md:p-8 overflow-hidden bg-gray-900">
      
      {/* 3. The Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900">
        <Ballpit
          count={100}
          gravity={0.01}
          friction={0.9975}
          wallBounce={0.95}
          followCursor={false}
          colors={[0xffffff, 0x888888, 0x4f46e5]} // Added: White, Grey, and Indigo
        />
      </div>

      {/* 4. The Content Layer: Add relative and z-10 so it sits on top of the balls */}
      <div className="relative z-10 max-w-[1400px] mx-auto w-full">
        
        {/* We make the header text white or highly contrasted against the background */}
        <header className="mb-8 text-center drop-shadow-md">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            UMS Declaration Form Filler
          </h1>
          <p className="text-gray-200">Generate your asynchronous mode assessment forms instantly.</p>
        </header>

        {/* Tab Navigation (Added glassmorphism to tabs) */}
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

        {/* Form Container: Added bg-white/90 and backdrop-blur for a frosted glass effect */}
        <main className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-2xl border border-white/20">
          {activeTab === 'individual' ? <IndividualForm /> : <GroupForm />}
        </main>

        <footer className="mt-12 mb-8 text-center text-sm text-gray-300 drop-shadow-md">
          <p>
            Concept and Development by <strong>Eldion Ryan Godius</strong>.
          </p>
          <p className="mt-1">
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