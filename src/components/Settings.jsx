import React, { useState } from 'react';
import TestPriceManager from './TestPriceManager';

export default function Settings({ testTemplates, testPrices, onUpdatePrice }) {
  const [activeSection, setActiveSection] = useState('testPrices');

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-gray-50">
      {/* Left sub-nav */}
      <div className="w-full md:w-48 border-r border-gray-200 p-4 shrink-0 bg-white shadow-sm z-10">
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => setActiveSection('testPrices')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeSection === 'testPrices'
                  ? 'bg-red-50 text-red-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Test Prices</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Right content */}
      <div className="flex-1 bg-white flex flex-col min-w-0 md:m-4 md:rounded-xl md:shadow-sm border border-gray-100 overflow-hidden">
        {activeSection === 'testPrices' && (
          <TestPriceManager 
            testTemplates={testTemplates}
            testPrices={testPrices}
            onUpdatePrice={onUpdatePrice}
          />
        )}
      </div>
    </div>
  );
}
