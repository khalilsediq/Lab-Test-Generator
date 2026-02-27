import { useState, useMemo } from "react";
import logo from "../assets/images/Logo.png";

const CATEGORY_ORDER = [
  "Hematology",
  "Coagulation",
  "Biochemistry",
  "Liver Function",
  "Lipids & Cardiac",
  "Endocrinology",
  "Iron Studies",
  "Serology & Infection",
  "Urine & Fluid",
  "Microbiology",
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
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const q = query.toLowerCase().trim();

  const filtered = useMemo(() => {
    if (!q) return testTemplates;
    return testTemplates.filter((panel) => {
      if (panel.panel_name.toLowerCase().includes(q)) return true;
      if (panel.panel_id.toLowerCase().includes(q)) return true;
      return panel.parameters.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.abbreviation || "").toLowerCase().includes(q),
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
    if (ai < 0 && bi < 0) return a.localeCompare(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  const toggle = (cat) => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="w-72 bg-gray-900 text-white min-h-screen p-5 shadow-2xl flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex justify-center mb-5">
        <img
          src={logo}
          alt="Bukhari Lab Logo"
          className="w-44 h-auto object-contain mix-blend-screen"
        />
      </div>

      {/* Search */}
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tests or abbreviation…"
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5"
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

      {/* Grouped list */}
      <nav className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1 pb-2">
        {cats.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">
            <p>No tests found</p>
            <p className="text-xs mt-1 text-gray-700">Try a different search</p>
          </div>
        ) : (
          cats.map((cat) => (
            <div key={cat} className="mb-1">
              <button
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <span className="uppercase text-[10px] font-bold text-gray-500 tracking-widest group-hover:text-gray-400">
                  {cat}
                </span>
                <svg
                  className={`w-3 h-3 text-gray-600 transition-transform ${collapsed[cat] ? "" : "rotate-180"}`}
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
                <div className="space-y-0.5 mt-0.5">
                  {grouped[cat].map((test) => (
                    <div
                      key={test.panel_id}
                      className="flex items-center group"
                    >
                      <button
                        onClick={() => setSelectedTest(test.panel_id)}
                        className={`flex-1 text-left px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm min-w-0 ${
                          selectedTest === test.panel_id
                            ? "bg-red-600/20 text-red-400 border-l-4 border-red-500 shadow-inner"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
                        }`}
                      >
                        <span className="block truncate">
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
                          className="ml-1 p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
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
      <div className="pt-4 border-t border-gray-800">
        <button
          onClick={onCreateCustom}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 font-semibold text-sm transition-all"
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
        <p className="text-center text-xs text-gray-700 mt-3">
          Bukhari Lab System © 2026 · v1.0.0
        </p>
      </div>
    </div>
  );
}
