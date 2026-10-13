import React, { useState, useEffect, useRef } from 'react';
import IndividualForm from './features/individualForm/IndividualForm';
import GroupForm from './features/groupForm/GroupForm';
import DotGrid from './components/backgrounds/DotGrid';
import Navbar from './components/layout/Navbar';
import BottomNav from './components/layout/BottomNav';
import PdfMerger from './features/pdfMerger/PdfMerger';
import useScrollAnimations, { refreshScrollTriggers } from './hooks/useScrollAnimations';

export default function App() {
  const [activeTab, setActiveTab] = useState('individual');
  const [mobileScreen, setMobileScreen] = useState('home'); // 'home' | 'forms' | 'merge' | 'about' | 'contact'
  const pageRef = useRef(null);
  useScrollAnimations(pageRef);

  // Switching tabs or mobile screens changes page height, so recalculate scroll trigger positions.
  useEffect(() => {
    refreshScrollTriggers();
  }, [activeTab, mobileScreen]);

  const handleMobileScreenChange = (screen, tab) => {
    setMobileScreen(screen);
    if (tab) {
      setActiveTab(tab);
    } else if (screen === 'forms' && activeTab === 'merge') {
      setActiveTab('individual');
    } else if (screen === 'merge') {
      setActiveTab('merge');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [feedback, setFeedback] = useState({
    name: '',
    category: 'Bug Report', 
    contact: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState('idle');

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedback(prev => ({ ...prev, [name]: value }));
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    // PASTE YOUR GOOGLE SCRIPT URL HERE:
    const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbzKn_G_BWaegCu4hmbQthgPWBINlKU2tWUXbgUCQlZg-HOyJQYV8Mo484CiBHuSqirfQw/exec"; 

    try {
      await fetch(ENDPOINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          Category: feedback.category,
          Name: feedback.name || 'Not provided',
          Contact: feedback.contact || 'Not provided',
          Message: feedback.message,
        })
      });

      setFormStatus('success');
      setFeedback({ name: '', category: 'Bug Report', contact: '', message: '' });
      setTimeout(() => setFormStatus('idle'), 5000);
      
    } catch (error) {
      console.error("Feedback error:", error);
      setFormStatus('error');
    }
  };

  return (
    <div ref={pageRef} className="relative min-h-screen text-slate-200 bg-slate-950 font-sans selection:bg-teal-500/30">
      
      {/* 1. Fixed Background Layer */}
      <div className="fixed inset-0 z-0 bg-slate-950">
        <DotGrid
          dotSize={6}
          gap={24}
          baseColor="#334155" 
          activeColor="#14b8a6" 
          proximity={150}
          shockRadius={250}
          shockStrength={5}
        />
      </div>

      {/* 2. Desktop Top Navbar (Hidden on Mobile) */}
      <Navbar setActiveTab={setActiveTab} />

      {/* 3. Mobile Bottom Navigation Bar (App Dock) */}
      <BottomNav 
        currentScreen={mobileScreen}
        onChangeScreen={handleMobileScreenChange}
        activeFormTab={activeTab}
      />

      {/* 4. Scrollable Content Layer */}
      <div className="relative z-10 w-full pt-6 md:pt-24 pb-28 md:pb-12">
        
        {/* --- SECTION 1: HERO (Home Screen) --- */}
        <section 
          id="hero" 
          className={`max-w-[1400px] mx-auto px-4 md:px-8 min-h-[75vh] flex flex-col justify-center items-center text-center ${
            mobileScreen === 'home' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div data-hero className="mb-6 md:mb-8 p-3 md:px-4 md:py-2 bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] md:rounded-[3rem] border border-slate-800 inline-block shadow-2xl">
            <img src="/logo.png" alt="Declaraform" className="h-20 md:h-40 w-auto object-contain drop-shadow-lg" />
          </div>
          
          <h1 data-hero className="text-3xl md:text-6xl font-extrabold text-white mb-4 md:mb-6 max-w-3xl leading-tight tracking-tight">
            Generate a declaration form <span className="text-teal-400">with ease</span>
          </h1>
          
          <p data-hero className="text-slate-400 text-base md:text-xl max-w-2xl mb-8 md:mb-10 leading-relaxed px-2">
            Eliminate manual editing. No sign in needed, input your details, and generate a clean form in an instant.
          </p>

          <div data-hero className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto px-4 sm:px-0">
            <a 
              href="#generator" 
              onClick={(e) => {
                e.preventDefault();
                handleMobileScreenChange('forms', 'individual');
              }}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-8 rounded-full transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-sm md:text-base active:scale-95"
            >
              Start Generating
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
            <a 
              href="#about" 
              onClick={(e) => {
                e.preventDefault();
                handleMobileScreenChange('about');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3.5 px-8 rounded-full transition-all border border-slate-700 text-center text-sm md:text-base active:scale-95"
            >
              Learn More
            </a>
          </div>

          {/* Mobile-Only App Quick Action Dashboard */}
          <div data-hero className="w-full max-w-sm mt-10 space-y-3 text-left md:hidden px-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400/90">Quick Tools</span>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">100% Client-Side</span>
            </div>

            <button
              type="button"
              onClick={() => handleMobileScreenChange('forms', 'individual')}
              className="w-full p-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 active:border-teal-500/50 rounded-2xl flex items-center justify-between transition-all shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-lg">
                  👤
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Individual Declaration</div>
                  <div className="text-xs text-slate-400">Single student assignment form</div>
                </div>
              </div>
              <span className="text-slate-500 text-sm">→</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileScreenChange('forms', 'group')}
              className="w-full p-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 active:border-indigo-500/50 rounded-2xl flex items-center justify-between transition-all shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-lg">
                  👥
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Group Declaration</div>
                  <div className="text-xs text-slate-400">Up to 10 members with signatures</div>
                </div>
              </div>
              <span className="text-slate-500 text-sm">→</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileScreenChange('merge', 'merge')}
              className="w-full p-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 active:border-amber-500/50 rounded-2xl flex items-center justify-between transition-all shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg">
                  📑
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Merge PDF Files</div>
                  <div className="text-xs text-slate-400">Combine declaration & report</div>
                </div>
              </div>
              <span className="text-slate-500 text-sm">→</span>
            </button>

            <div className="pt-2 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Zero server uploads • Stored locally in your browser
              </span>
            </div>
          </div>
        </section>


        {/* --- SECTION 2: GENERATOR & FORMS --- */}
        <section 
          id="generator" 
          className={`max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-20 min-h-[85vh] ${
            mobileScreen === 'forms' || mobileScreen === 'merge' ? 'block' : 'hidden md:block'
          }`}
        >
          <header data-reveal className="mb-6 md:mb-8 text-center drop-shadow-md">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1.5 md:mb-2">
              {mobileScreen === 'merge' ? 'PDF Merger' : 'Form Generator'}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm">
              {mobileScreen === 'merge'
                ? 'Combine declaration forms with assignment files.'
                : 'Fill in your details below and preview in real-time.'}
            </p>
          </header>

          {/* Desktop Tab Bar (All 3 tabs) */}
          <div data-reveal className="hidden md:flex justify-center mb-6 border-b border-slate-700">
            <button
              className={`px-6 py-3 font-semibold text-sm transition-colors ${
                activeTab === 'individual'
                  ? 'border-b-2 border-teal-500 text-teal-400 drop-shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('individual')}
            >
              Individual Form
            </button>
            <button
              className={`px-6 py-3 font-semibold text-sm transition-colors ${
                activeTab === 'group'
                  ? 'border-b-2 border-teal-500 text-teal-400 drop-shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('group')}
            >
              Group Form
            </button>
            <button
              className={`px-6 py-3 font-semibold text-sm transition-colors ${
                activeTab === 'merge'
                  ? 'border-b-2 border-teal-500 text-teal-400 drop-shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('merge')}
            >
              Merge PDFs
            </button>
          </div>

          {/* Mobile Tab Bar (When in Forms mode: Segmented Pill Switcher between Individual & Group) */}
          {mobileScreen === 'forms' && (
            <div className="flex md:hidden justify-center mb-5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 max-w-sm mx-auto shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'individual'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>👤</span> Individual Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('group')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'group'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>👥</span> Group Form
              </button>
            </div>
          )}

          <main data-reveal className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-800">
            {activeTab === 'individual' && <IndividualForm />}
            {activeTab === 'group' && <GroupForm />}
            {activeTab === 'merge' && <PdfMerger />}
          </main>
        </section>


        {/* --- SECTION 3: ABOUT --- */}
        <section 
          id="about" 
          className={`max-w-[1400px] mx-auto px-4 md:px-8 py-10 md:py-24 ${
            mobileScreen === 'about' ? 'block' : 'hidden md:block'
          }`}
        >
          <div data-reveal className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3 md:mb-4 tracking-tight">About Declaraform</h2>
            <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto px-2">
              Built to solve a common student frustration, designed with your privacy in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* LEFT COLUMN: Developer Info */}
            <div data-reveal className="md:col-span-1 bg-slate-900/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 h-full">
              
              <img 
                src="/profile.jpg" 
                alt="Eldion Ryan Godius" 
                className="w-28 h-28 md:w-40 md:h-40 rounded-full object-cover border-2 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)] mb-4 md:mb-5"
              />
              
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight mb-1.5 md:mb-2">
                Eldion Ryan Godius
              </h3>
              <p className="text-slate-400 text-xs md:text-sm font-medium tracking-wide mb-5 md:mb-6">
                Software Engineering, Universiti Malaysia Sabah
              </p>
              
              <div className="flex flex-col gap-2.5 items-center">
                <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold rounded-md uppercase tracking-wider">
                  Founder & Maintainer
                </span>
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-md">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2ZM5.5 4.5L6.5 7L9 8L6.5 9L5.5 11.5L4.5 9L2 8L4.5 7L5.5 4.5Z" />
                  </svg>
                  Assisted by Gemini Pro
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Stacked Info Cards */}
            <div className="md:col-span-2 flex flex-col gap-6">
              
              <div data-reveal className="bg-slate-900/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl text-left transition-transform hover:-translate-x-1 flex-1">
                <div className="bg-teal-500/10 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 md:mb-5 border border-teal-500/20 shadow-inner">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight">Why it was built</h3>
                <p className="text-slate-400 leading-relaxed text-xs md:text-sm">
                  Declaraform was created to digitize the repetitive, time-consuming process of filling out academic declaration forms for Computer Science Students at Universiti Malaysia Sabah. It eliminates manual formatting, printing, and messy digital signature pasting by automating the entire workflow into a few simple clicks.
                </p>
              </div>

              <div data-reveal className="bg-slate-900/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl text-left transition-transform hover:-translate-x-1 flex-1">
                <div className="bg-teal-500/10 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 md:mb-5 border border-teal-500/20 shadow-inner">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight">Zero-Data Policy</h3>
                <p className="text-slate-400 leading-relaxed text-xs md:text-sm">
                  Your data never leaves your device. This application runs 100% locally in your browser. Absolutely no personal information, matriculation numbers, or drawn signatures are ever uploaded to a server, tracked, or stored in a database. What happens on your device, stays on your device.
                </p>
              </div>

            </div>

          </div>
        </section>


        {/* --- SECTION 4: CONTACT & FEEDBACK --- */}
        <section 
          id="contact" 
          className={`max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12 ${
            mobileScreen === 'contact' ? 'block' : 'hidden md:block'
          }`}
        >
          <div data-reveal className="bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-800">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Get in Touch</h2>
            <p className="text-slate-400 text-xs md:text-sm mb-6 md:mb-8">Found a bug or have a feature request? Let me know!</p>
            
            <form onSubmit={handleFeedbackSubmit}>
              
              {/* Category Buttons */}
              <div className="flex flex-wrap gap-2.5 mb-5 md:mb-6">
                {['Bug Report', 'Idea Suggestion', 'Other'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedback({ ...feedback, category: cat })}
                    className={`px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-colors border ${
                      feedback.category === cat
                        ? 'bg-teal-600/20 border-teal-500 text-teal-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {cat === 'Bug Report' ? '🐛 ' : cat === 'Idea Suggestion' ? '💡 ' : '💬 '} {cat}
                  </button>
                ))}
              </div>

              <div className="mb-4 md:mb-5">
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1.5">Telegram or Email for reply (Optional)</label>
                <input 
                  type="text" 
                  name="contact" 
                  value={feedback.contact} 
                  onChange={handleFeedbackChange} 
                  className="w-full p-3 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl focus:ring-1 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-colors text-sm" 
                  placeholder="@username or email" 
                />
              </div>
            
              <div className="mb-5 md:mb-6">
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1.5">Message</label>
                <textarea 
                  name="message" 
                  value={feedback.message} 
                  onChange={handleFeedbackChange} 
                  rows="4" 
                  className="w-full p-3 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl focus:ring-1 focus:ring-teal-500 focus:border-teal-500 focus:outline-none custom-scrollbar transition-colors text-sm" 
                  placeholder="Tell me what you think..." 
                  required
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                disabled={formStatus === 'submitting'}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base active:scale-95"
              >
                {formStatus === 'submitting' ? 'Sending...' : 'Send Feedback'}
              </button>

              {/* Status Messages */}
              {formStatus === 'success' && (
                <p className="text-teal-400 text-xs md:text-sm text-center font-medium mt-3">✨ Thank you! Your feedback has been sent.</p>
              )}
              {formStatus === 'error' && (
                <p className="text-red-400 text-xs md:text-sm text-center font-medium mt-3">Oops! Something went wrong. Please try again later.</p>
              )}
            </form>
          </div>
        </section>


        {/* Global Footer */}
        <footer 
          data-reveal 
          className={`mt-10 md:mt-20 text-center text-xs md:text-sm text-slate-500 drop-shadow-md px-4 ${
            mobileScreen === 'home' || mobileScreen === 'about' ? 'block' : 'hidden md:block'
          }`}
        >
          <p>Concept and Development by <strong>Eldion Ryan Godius</strong>.</p>
          <p className="mt-1.5 text-[11px] md:text-xs opacity-75">
            &copy; {new Date().getFullYear()} All Rights Reserved. Not officially affiliated with Universiti Malaysia Sabah.
          </p>
        </footer>

      </div>
    </div>
  );
}