import { useState, useMemo, useRef } from "react";
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
  onCreateCustom,
  onTrashPanel,
  onDeleteAllCustom,
  onImportCustom,
  onClose,
  editedPanelNames = {},
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [sidebarAlert, setSidebarAlert] = useState(null);
  const fileInputRef = useRef(null);
  
  // Safe Confirm Dialog states
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

  // ── EXPORT CUSTOM PANELS ──
  const handleExportCustomPanels = () => {
    // 1. Get all custom panels from testTemplates or localStorage
    const allCustomPanels = testTemplates.filter((p) => p.isCustom);
    if (allCustomPanels.length === 0) {
      if (typeof window.showToast === 'function') window.showToast("No custom panels found to export.", "error");
      return;
    }
    
    // 2. Serialize to JSON
    const dataStr = JSON.stringify(allCustomPanels, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // 3. Download
    const dateStr = new Date().toISOString().split("T")[0];
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-panels-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── IMPORT CUSTOM PANELS ──
  const handleImportCustomPanels = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (!Array.isArray(importedData)) {
          setSidebarAlert("Invalid file format: Expected an array of panels.");
          setTimeout(() => setSidebarAlert(null), 3000);
          return;
        }

        const existingCustomPanels = testTemplates.filter((p) => p.isCustom);
        
        let newCount = 0;
        let overwriteCount = 0;
        let skipCount = 0;
        let keepBothCount = 0;

        const updatedPanels = [...existingCustomPanels];

        for (const imported of importedData) {
          // Validate structure (basic check)
          if (!imported.panel_id || !imported.panel_name || !imported.parameters) {
            console.warn("Skipping invalid panel data:", imported);
            continue;
          }
          
          imported.isCustom = true; // Ensure it's marked as custom

          const existingIndex = updatedPanels.findIndex(p => p.panel_id === imported.panel_id);
          
          if (existingIndex >= 0) {
            // Conflict
            // Auto overwrite for simplicity to avoid `prompt` blocking main thread
            updatedPanels[existingIndex] = {...imported};
            overwriteCount++;
          } else {
            // New Panel
            updatedPanels.push(imported);
            newCount++;
          }
        }
        
        if (updatedPanels.length === existingCustomPanels.length && newCount === 0 && overwriteCount === 0) {
           console.warn("No new or updated panels found in the file.");
           return;
        }

        // Call parent handler to save and update state
        onImportCustom(updatedPanels);

      } catch (err) {
        console.error("Error parsing JSON file. Please make sure it is a valid backup.", err);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = null;
  };

  return (
    <div className="w-full bg-gray-900 text-white h-full flex flex-col shadow-2xl select-none">
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
                <div className="flex items-center space-x-2">
                  <span className="uppercase text-[10px] font-bold text-gray-500 tracking-widest group-hover:text-gray-400">
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
                        <span className="block truncate leading-snug">
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

      {/* Create Custom Test */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        <div className="flex flex-col space-y-1.5">
          <button
            onClick={onCreateCustom}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 font-semibold text-xs transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Custom Test</span>
          </button>
          
          <div className="flex space-x-1.5">
            <button
              onClick={handleExportCustomPanels}
              title="Export Custom Panels"
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-semibold transition-all active:scale-95"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              <span>Export</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import Custom Panels"
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-semibold transition-all active:scale-95"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4V4"/>
              </svg>
              <span>Import</span>
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={handleImportCustomPanels} 
            />
          </div>
        </div>
        
        <p className="text-center text-[9px] text-gray-700 mt-2 leading-tight">
          Bukhari Lab System • v1.0.0
        </p>
      </div>

      <ConfirmModal 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDanger={true}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({...confirmDialog, isOpen: false})}
      />

      {sidebarAlert && (
        <div className="absolute bottom-16 left-2 right-2 z-50 bg-red-900 text-red-100 text-xs font-medium px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <svg className="w-4 h-4 shrink-0 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" /></svg>
          {sidebarAlert}
        </div>
      )}
    </div>
  );
}
