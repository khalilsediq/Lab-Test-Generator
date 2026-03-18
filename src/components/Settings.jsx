import React, { useState, useRef } from 'react';
import TestPriceManager from './TestPriceManager';
import ConfirmModal from './ConfirmModal';
import SecuritySettings from './SecuritySettings';

export default function Settings({ 
  testTemplates, 
  testPrices, 
  onUpdatePrice,
  onCreateCustom,
  onExportCustom,
  onImportCustom,
  onDeleteAllCustom,
  onEnableSecurity,
  onSecurityChanged
}) {
  const [activeSection, setActiveSection] = useState('testPrices');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleClearAll = () => {
    onDeleteAllCustom();
    setIsConfirmOpen(false);
  };

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
          <li>
            <button
              onClick={() => setActiveSection('manageTests')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeSection === 'manageTests'
                  ? 'bg-red-50 text-red-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Manage Tests</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveSection('security')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeSection === 'security'
                  ? 'bg-red-50 text-red-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Security</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Right content */}
      <div className="flex-1 bg-white flex flex-col min-w-0 md:m-4 md:rounded-xl md:shadow-sm border border-gray-100 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        {activeSection === 'security' && (
          <SecuritySettings onEnableSecurity={onEnableSecurity} onSecurityChanged={onSecurityChanged} />
        )}
        {activeSection === 'testPrices' && (
          <TestPriceManager 
            testTemplates={testTemplates}
            testPrices={testPrices}
            onUpdatePrice={onUpdatePrice}
          />
        )}
        {activeSection === 'manageTests' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Manage Custom Tests</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Create Card */}
              <div className="p-5 border border-gray-200 rounded-2xl hover:border-red-200 hover:bg-red-50/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">New Test Panel</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Create a completely new test panel with custom parameters.</p>
                <button 
                  onClick={onCreateCustom}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Create Now
                </button>
              </div>

              {/* Export Card */}
              <div className="p-5 border border-gray-200 rounded-2xl hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">Backup Panels</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Export all your custom test panels to a JSON file for backup.</p>
                <button 
                  onClick={onExportCustom}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors"
                >
                  Export Data
                </button>
              </div>

              {/* Import Card */}
              <div className="p-5 border border-gray-200 rounded-2xl hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">Restore Panels</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Import custom panels from a previous backup file.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                >
                  Import Backup
                </button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  style={{ display: "none" }} 
                  onChange={onImportCustom} 
                />
              </div>

              {/* Clear All Card */}
              <div className="p-5 border border-gray-200 rounded-2xl hover:border-red-300 hover:bg-red-50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800">Clear All Panels</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4 font-medium">Permanently delete all custom test panels.</p>
                <button 
                  onClick={() => setIsConfirmOpen(true)}
                  className="w-full py-2 bg-white border-2 border-red-200 hover:border-red-500 text-red-600 rounded-lg font-bold transition-all"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="Delete All Custom Tests"
        message="Are you sure you want to permanently delete all custom test panels? This action is irreversible."
        isDanger={true}
        confirmText="Yes, Delete All"
        onConfirm={handleClearAll}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
