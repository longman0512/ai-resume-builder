import React from 'react';

export default function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-400 text-sm">
      <p>© {new Date().getFullYear()} AI Resume Tailor.</p>
    </footer>
  );
}
