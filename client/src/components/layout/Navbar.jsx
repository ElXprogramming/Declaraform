import React, { useEffect, useState } from 'react';

const NAV_ITEMS = [
  {
    id: 'generator',
    sectionId: 'generator',
    label: 'Generator',
    tab: 'individual',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'merge',
    sectionId: 'generator',
    label: 'Merge PDF',
    tab: 'merge',
    badge: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
  {
    id: 'about',
    sectionId: 'about',
    label: 'About',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'contact',
    sectionId: 'contact',
    label: 'Contact',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

export default function Navbar({ activeTab, setActiveTab }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track which section is currently in the middle of the viewport on desktop.
  useEffect(() => {
    const sectionIds = ['hero', 'generator', 'about', 'contact'];
    const sections = sectionIds
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (sections.length === 0 || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const isItemActive = (item) => {
    if (item.sectionId !== activeSection) return false;
    if (item.sectionId === 'generator') {
      return item.id === 'merge' ? activeTab === 'merge' : activeTab !== 'merge';
    }
    return true;
  };

  const getPillClasses = (isActive) =>
    `pointer-events-auto group relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs lg:text-sm font-semibold backdrop-blur-xl border transition-all duration-300 select-none hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
      isActive
        ? 'bg-slate-900/95 text-teal-400 border-teal-500/50 shadow-[0_8px_25px_-4px_rgba(20,184,166,0.3)] ring-1 ring-teal-500/20'
        : isScrolled
          ? 'bg-slate-900/90 text-slate-300 border-slate-700/80 shadow-lg shadow-black/40 hover:bg-slate-800/95 hover:text-teal-300 hover:border-slate-600'
          : 'bg-slate-900/75 text-slate-300 border-slate-800/90 shadow-md shadow-black/25 hover:bg-slate-900/95 hover:text-teal-300 hover:border-slate-700'
    }`;

  return (
    <header className="hidden md:block fixed top-0 left-0 w-full z-40 pointer-events-none">
      <div
        className={`max-w-[1400px] mx-auto px-4 md:px-8 flex justify-between items-center transition-all duration-300 pointer-events-none ${
          isScrolled ? 'py-2.5 md:py-3' : 'py-3 md:py-4'
        }`}
      >
        {/* Top-Left Logo (plain logo, no box) */}
        <a
          href="#hero"
          aria-label="Declaraform Home"
          className="pointer-events-auto flex items-center transition-opacity hover:opacity-85"
        >
          <img
            src="/logo.png"
            alt="Declaraform Logo"
            className={`w-auto object-contain drop-shadow-md transition-all duration-300 ${
              isScrolled ? 'h-8 md:h-10' : 'h-9 md:h-12'
            }`}
          />
        </a>

        {/* Top-Right Floating Pill Buttons */}
        <nav
          aria-label="Desktop Navigation"
          className="flex items-center gap-2.5 lg:gap-3 pointer-events-none"
        >
          {NAV_ITEMS.map(item => {
            const isActive = isItemActive(item);
            return (
              <a
                key={item.id}
                href={`#${item.sectionId}`}
                onClick={
                  item.tab
                    ? () => {
                        if (item.id === 'generator' && activeTab === 'group') {
                          setActiveTab('group');
                        } else {
                          setActiveTab(item.tab);
                        }
                      }
                    : undefined
                }
                aria-current={isActive ? 'true' : undefined}
                className={getPillClasses(isActive)}
              >
                <span
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-teal-400 drop-shadow-[0_0_6px_rgba(45,212,191,0.5)]' : 'text-slate-400 group-hover:text-teal-400'
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      isActive
                        ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.9)]'
                        : 'bg-teal-400/70 group-hover:bg-teal-400 group-hover:shadow-[0_0_8px_rgba(45,212,191,0.8)]'
                    }`}
                  />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}