import { useState } from "react";
import logo from "../assets/images/Logo.png";

export default function Sidebar({
  selectedTest,
  setSelectedTest,
  testTemplates,
  onCreateCustom,
  onDeleteCustom,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = testTemplates.filter((test) =>
    test.panel_name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const staticTests = filtered.filter((t) => !t.isCustom);
  const customTests = filtered.filter((t) => t.isCustom);

  return (
    <div className="w-72 bg-gray-900 text-white min-h-screen p-6 shadow-2xl flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex justify-center mb-6 p-2">
        <img
          src={logo}
          alt="Bukhari Lab Logo"
          className="w-48 h-auto object-contain mix-blend-screen"
        />
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 14.65z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tests…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Test List */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1 -mr-1">
        {/* Standard panels */}
        {staticTests.length > 0 && (
          <div>
            <div className="uppercase text-[10px] font-bold text-gray-600 tracking-widest mb-2 px-1">
              Standard Tests
            </div>
            {staticTests.map((test) => (
              <TestNavButton
                key={test.panel_id}
                test={test}
                isSelected={selectedTest === test.panel_id}
                onClick={() => setSelectedTest(test.panel_id)}
              />
            ))}
          </div>
        )}

        {/* Custom panels */}
        {customTests.length > 0 && (
          <div className="mt-4">
            <div className="uppercase text-[10px] font-bold text-gray-600 tracking-widest mb-2 px-1">
              Custom Tests
            </div>
            {customTests.map((test) => (
              <div key={test.panel_id} className="flex items-center group">
                <TestNavButton
                  test={test}
                  isSelected={selectedTest === test.panel_id}
                  onClick={() => setSelectedTest(test.panel_id)}
                  className="flex-1"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${test.panel_name}"?`)) {
                      onDeleteCustom(test.panel_id);
                    }
                  }}
                  className="ml-1 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Delete custom test"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No tests found</p>
            <p className="text-xs mt-1 text-gray-700">Try a different search</p>
          </div>
        )}
      </nav>

      {/* Create Custom Test Button */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <button
          onClick={onCreateCustom}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 font-semibold text-sm transition-all duration-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Create Custom Test</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-600 text-center">
        <p>Bukhari Lab System © 2026</p>
        <p className="text-gray-700 mt-0.5">Version 1.0.0</p>
      </div>
    </div>
  );
}

function TestNavButton({ test, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
        isSelected
          ? "bg-red-600/20 text-red-400 border-l-4 border-red-500 shadow-inner"
          : "text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
      }`}
    >
      <span className="block truncate">{test.panel_name}</span>
      <span className="block text-[10px] text-gray-600 mt-0.5 font-mono">
        {test.panel_id}
      </span>
    </button>
  );
}
