import { useState, useMemo } from "react";
import logo from "../assets/images/Logo.png";

const CATEGORY_ORDER = [
  "Blood Grouping & Cross Matching",
  "Hematology",
  "Hematology – CBC Advanced",
  "Coagulation",
  "Biochemistry",
  "Biochemistry – Electrolytes",
  "Biochemistry – Blood Gas",
  "Liver Function",
  "Lipids & Cardiac",
  "Endocrinology",
  "Iron Studies",
  "Serology & Infection",
  "Urine & Fluid",
  "Urine Analysis",
  "Microbiology",
  "Seminal Fluid Analysis",
  "Vitamins & Minerals",
  "Tumour Markers",
  "Custom",
  "Other",
];

export default function Sidebar({
  selectedTest,
  setSelectedTest,
  testTemplates,
  onCreateCustom,
  onDeleteCustom,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const q = query.toLowerCase().trim();

  const filtered = useMemo(() => {
    if (!q) return testTemplates;
    return testTemplates.filter((panel) => {
      if (panel.panel_name.toLowerCase().includes(q)) return true;
      if (panel.panel_id.toLowerCase().includes(q)) return true;
      if ((panel.category || "").toLowerCase().includes(q)) return true;
      if ((panel.description || "").toLowerCase().includes(q)) return true;
      return panel.parameters.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.abbreviation || "").toLowerCase().includes(q) ||
          (p.unit || "").toLowerCase().includes(q),
      );
    });
  }, [testTemplates, q]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((p) => {
      const cat = p.isCustom ? "Custom" : p.category || "Other";
      (g[cat] = g[cat] || []).push(p);
    });
    return g;
  }, [filtered]);

  const cats = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a),
      bi = CATEGORY_ORDER.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  const toggle = (cat) => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));

  // Count total visible tests
  const totalVisible = filtered.length;

  return (
    <div className="w-72 bg-gray-900 text-white h-full min-h-screen flex flex-col shadow-2xl select-none">
      {/* Header with logo + close button */}
      <div className="relative flex items-center justify-center pt-5 pb-3 px-5 shrink-0">
        <img
          src={logo}
          alt="Bukhari Lab Logo"
          className="w-40 h-auto object-contain mix-blend-screen"
        />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors md:hidden"
          title="Close sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Desktop close/collapse button */}
      <div className="hidden md:flex justify-end px-4 pb-1 shrink-0">
        <button
          onClick={onClose}
          className="text-[10px] font-semibold text-gray-600 hover:text-gray-400 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
          title="Collapse sidebar"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
          <span>Collapse</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative px-4 mb-3 shrink-0">
        <svg
          className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tests or abbreviation…"
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5"
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

      {/* Result count when searching */}
      {query && (
        <div className="px-5 mb-2 shrink-0">
          <p className="text-[10px] text-gray-500">
            {totalVisible === 0
              ? "No results"
              : `${totalVisible} test${totalVisible > 1 ? "s" : ""} found`}
          </p>
        </div>
      )}

      {/* Grouped list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
        {cats.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-30"
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
            <p className="font-medium">No tests found</p>
            <p className="text-xs mt-1 text-gray-700">
              Try a different keyword
            </p>
          </div>
        ) : (
          cats.map((cat) => (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <span className="uppercase text-[10px] font-bold text-gray-500 tracking-widest group-hover:text-gray-400">
                    {cat}
                  </span>
                  <span className="text-[9px] bg-gray-800 group-hover:bg-gray-700 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                    {grouped[cat].length}
                  </span>
                </div>
                <svg
                  className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${collapsed[cat] ? "" : "rotate-180"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {!collapsed[cat] && (
                <div className="space-y-0.5 mt-0.5 mb-2">
                  {grouped[cat].map((test) => (
                    <div
                      key={test.panel_id}
                      className="flex items-center group/row"
                    >
                      <button
                        onClick={() => setSelectedTest(test.panel_id)}
                        className={`flex-1 text-left px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm min-w-0 ${
                          selectedTest === test.panel_id
                            ? "bg-red-600/20 text-red-400 border-l-4 border-red-500 shadow-inner"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
                        }`}
                      >
                        <span className="block truncate leading-snug">
                          {test.panel_name}
                        </span>
                        <span className="block text-[10px] font-mono text-gray-600 mt-0.5">
                          {test.panel_id}
                        </span>
                      </button>
                      {test.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${test.panel_name}"?`))
                              onDeleteCustom(test.panel_id);
                          }}
                          title="Delete custom test"
                          className="ml-1 p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/row:opacity-100 transition-all shrink-0"
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>

      {/* Create Custom Test */}
      <div className="p-4 border-t border-gray-800 shrink-0">
        <button
          onClick={onCreateCustom}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 font-semibold text-sm transition-all active:scale-95"
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
        <p className="text-center text-xs text-gray-700 mt-3 leading-relaxed">
          Bukhari Lab System © 2026
          <br />
          <span className="text-gray-800">v1.0.0</span>
        </p>
      </div>
    </div>
  );
}
