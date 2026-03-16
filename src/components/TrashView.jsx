import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

export default function TrashView({ 
  trashedTemplates, 
  editedPanelNames, 
  onRestorePanel, 
  onRestoreAll,
  onPermanentDelete, 
  onEmptyTrash 
}) {
  const [query, setQuery] = useState("");
  
  // Safe Confirm Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionId: null,
    actionType: null
  });

  const confirmAction = () => {
    const { actionType, actionId } = confirmDialog;
    if (actionType === 'EMPTY_TRASH') onEmptyTrash();
    if (actionType === 'PERMANENT_DELETE') onPermanentDelete(actionId);
    if (actionType === 'RESTORE_ALL') onRestoreAll();
    setConfirmDialog({ isOpen: false, title: "", message: "", actionId: null, actionType: null });
  };

  const filteredTrash = trashedTemplates.filter((panel) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const displayName = (editedPanelNames?.[panel.panel_id] || panel.panel_name || panel.panel_id || "").toString().toLowerCase();
    const idMatches = (panel.panel_id || "").toString().toLowerCase().includes(q);
    return displayName.includes(q) || idMatches;
  });

  return (
    <div className="flex-1 flex flex-col items-center bg-gray-50 overflow-y-auto p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl shadow-red-500/5 ring-1 ring-gray-200 p-6 sm:p-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span className="p-2 bg-red-50 text-red-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </span>
              Trash Bin
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Panels moved to trash won't appear in the sidebar or reports. Default tests can be restored at any time.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirmDialog({
                isOpen: true,
                title: "Restore All",
                message: "Are you sure you want to restore all panels in the trash back to your active workspace?",
                actionType: 'RESTORE_ALL'
              })}
              disabled={trashedTemplates.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              Restore All
            </button>
            <button
              onClick={() => setConfirmDialog({
                isOpen: true,
                title: "Empty Trash",
                message: "Are you sure you want to permanently delete all custom tests currently in the trash? Default tests will remain hidden in trash, but custom ones will be gone forever.",
                actionType: 'EMPTY_TRASH'
              })}
              disabled={trashedTemplates.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Empty Trash
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search trashed panels..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
          />
        </div>

        {/* List Section */}
        <div className="space-y-3">
          {filteredTrash.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4 border border-gray-200 border-dashed">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">Trash is empty</p>
              {query && <p className="text-gray-400 text-xs mt-1">No trashed panels match "{query}"</p>}
            </div>
          ) : (
            filteredTrash.map((panel) => {
              const pName = editedPanelNames?.[panel.panel_id] || panel.panel_name || panel.panel_id;
              
              return (
                <div 
                  key={panel.panel_id} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 hover:border-gray-300 shadow-sm rounded-xl transition-all gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex shrink-0 w-10 h-10 bg-gray-50 text-gray-400 rounded-lg items-center justify-center border border-gray-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        {pName}
                        {panel.isCustom && <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md uppercase tracking-wide">Custom</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{panel.panel_id}</span>
                        <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                        <span className="text-xs text-gray-500 hidden sm:inline">{panel.category || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRestorePanel(panel.panel_id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200/50 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      Restore
                    </button>
                    
                    {panel.isCustom && (
                      <button
                        onClick={() => setConfirmDialog({
                          isOpen: true,
                          title: "Delete Forever",
                          message: `Are you sure you want to permanently delete "${pName}"? This cannot be undone.`,
                          actionId: panel.panel_id,
                          actionType: 'PERMANENT_DELETE'
                        })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors border border-red-200/50 shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
