import { useState, useMemo } from "react";
import ConfirmModal from "./ConfirmModal";
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
  pinnedPanels = [],
  onTogglePin,
  onTrashPanel,
  onDeleteAllCustom,
  onClose,
  sidebarOpen,
  onToggle,
  editedPanelNames = {},
  onLogout,
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: null
  });

  const q = query.toLowerCase().trim();

  // Active tests (not in trash)
  const filteredActive = useMemo(() => {
    if (!q) return testTemplates;
    return (testTemplates || []).filter((panel) => {
      if (!panel) return false;
      const displayName = (editedPanelNames?.[panel.panel_id] || panel.panel_name || panel.panel_id || "").toString();
      const pId = (panel.panel_id || "").toString();
      const pCat = (panel.category || "").toString();
      const pDesc = (panel.description || "").toString();

      if (displayName.toLowerCase().includes(q)) return true;
      if (pId.toLowerCase().includes(q)) return true;
      if (pCat.toLowerCase().includes(q)) return true;
      if (pDesc.toLowerCase().includes(q)) return true;
      return (panel.parameters || []).some(
        (p) =>
          p && (
          (p.name || "").toString().toLowerCase().includes(q) ||
          (p.abbreviation || "").toString().toLowerCase().includes(q) ||
          (p.unit || "").toString().toLowerCase().includes(q)
          ),
      );
    });
  }, [testTemplates, q, editedPanelNames]);

  const grouped = useMemo(() => {
    const g = {};
    
    // Process active tests
    filteredActive.forEach((p) => {
      // If pinned, duplicate it into "Pinned" strictly for UI access
      if (pinnedPanels.includes(p.panel_id)) {
        (g["Pinned"] = g["Pinned"] || []).push(p);
      }
      const cat = p.isCustom ? "Custom" : p.category || "Other";
      (g[cat] = g[cat] || []).push(p);
    });

    return g;
  }, [filteredActive, pinnedPanels]);

  const cats = Object.keys(grouped).sort((a, b) => {
    if (a === "Pinned") return -1; // Pinned always first
    if (b === "Pinned") return 1;

    const ai = CATEGORY_ORDER.indexOf(a),
      bi = CATEGORY_ORDER.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  const toggle = (cat) => setExpanded((p) => ({ ...p, [cat]: !p[cat] }));

  // Count total visible tests
  const totalVisible = filteredActive.length;

  const confirmAction = () => {
    const { actionType } = confirmDialog;
    if (actionType === 'DELETE_ALL_CUSTOM') onDeleteAllCustom();
    setConfirmDialog({ isOpen: false, title: "", message: "", actionType: null });
  };


  return (
    <div className="w-full bg-gray-900 text-white h-full flex flex-col shadow-2xl select-none">
      {/* Header with logo + close button */}
      <div className={`relative flex items-center justify-center ${sidebarOpen ? "pt-5 pb-3 px-5" : "pt-4 pb-2 px-2"} shrink-0 transition-all duration-300`}>
        <img
          src={logo}
          alt="Bukhari Lab Logo"
          className={`${sidebarOpen ? "w-40" : "w-10"} h-auto object-contain mix-blend-screen transition-all duration-300`}
        />
        {sidebarOpen && (
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
        )}
      </div>

      {/* Main Content Wrapper (Search + List) */}
      <div className={`flex-1 flex flex-col min-h-0 transition duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Search */}

      {/* Search */}
      <div className="premium-search-container relative px-4 mb-4 shrink-0 group">
        <svg
          className="premium-search-icon absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 14.65z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tests or codes…"
          className="premium-search-input relative z-2 w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10 transition-all"
            title="Clear search"
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
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-1 custom-sidebar-scrollbar">
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
              <div
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="uppercase text-[10px] font-bold text-gray-500 tracking-widest group-hover:text-gray-400 whitespace-nowrap">
                    {cat}
                  </span>
                  <span className="text-[9px] bg-gray-800 group-hover:bg-gray-700 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                    {grouped[cat]?.length || 0}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {cat === "Custom" && (grouped[cat]?.length || 0) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({
                          isOpen: true,
                          title: "Delete All Custom Tests",
                          message: "Are you sure you want to permanently delete all custom tests? This action cannot be undone.",
                          actionType: 'DELETE_ALL_CUSTOM'
                        });
                      }}
                      className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove all custom tests"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <svg
                    className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${expanded[cat] || (query && (grouped[cat]?.length || 0) > 0) ? "rotate-180" : ""}`}
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
                </div>
              </div>

              {(expanded[cat] || (query && grouped[cat].length > 0)) && (
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
                        <span className="block truncate leading-snug whitespace-nowrap">
                          {editedPanelNames?.[test.panel_id] || test.panel_name || test.panel_id}
                        </span>
                        <span className="block text-[10px] font-mono text-gray-600 mt-0.5">
                          {test.panel_id || "no-id"}
                        </span>
                      </button>
                      
                      {/* ACTIVE CATEGORIES ROW ACTIONS */}
                      <div className="flex items-center ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity space-x-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(test.panel_id);
                            }}
                            title={pinnedPanels.includes(test.panel_id) ? "Unpin panel" : "Pin panel"}
                            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                              pinnedPanels.includes(test.panel_id) 
                                ? "text-yellow-500 hover:bg-yellow-500/10" 
                                : "text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5 5v14l7-3.5L19 19V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTrashPanel(test.panel_id);
                            }}
                            title="Move to trash"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>
      </div>
      
      {!sidebarOpen && <div className="flex-1 min-h-0"></div>}

      {/* Logout Button */}
      {onLogout && (
        <div className={`p-3 border-t border-gray-800 shrink-0 flex flex-col items-center overflow-visible transition-all duration-300 ${sidebarOpen ? 'mb-0 pb-0' : 'mb-0 pb-0'}`}>
          <button
            onClick={onLogout}
            className="group relative h-10 w-full flex items-center justify-center rounded-xl bg-gray-900 border border-red-900/40 hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] transition-all duration-500 overflow-hidden"
            title="Secure Logout"
          >
            {/* Futuristic Sweep Edge Effect */}
            <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-red-500/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 pointer-events-none"></div>
            
            {sidebarOpen ? (
              <div className="flex items-center justify-center gap-2 relative z-10 w-full">
                <div className="bg-red-500/10 p-1 rounded-md text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                  <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span className="tracking-[0.2em] font-semibold text-xs text-gray-400 group-hover:text-red-100 uppercase transition-colors duration-300">Logout</span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full relative z-10">
                <div className="text-red-500/70 group-hover:text-red-400 transition-colors duration-300 transform group-hover:-translate-x-0.5">
                  <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Collapse/Expand Toggle */}
      <div className="p-3 border-t border-gray-800 shrink-0 flex flex-col items-center">
        <button
          onClick={onToggle}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium h-9 w-full flex items-center justify-center transition-colors rounded-lg"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <div className="flex items-center justify-center gap-2 animate-in fade-in duration-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="whitespace-nowrap transition-all">Collapse</span>
            </div>
          ) : (
            <div className="flex items-center justify-start pl-[6.5px] w-full">
              <svg className="w-4 h-4 scale-110 active:scale-95 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </button>
        
        <div className={`transition-all duration-300 w-full flex flex-col items-center overflow-hidden ${sidebarOpen ? "opacity-100 h-5 mt-2" : "opacity-0 h-0"}`}>
          <p className="text-center text-[9px] text-gray-700 leading-tight whitespace-nowrap">
            Bukhari Lab System • v1.0.3
          </p>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDanger={true}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({...confirmDialog, isOpen: false})}
      />
    </div>
  );
}
