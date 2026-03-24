import { useState, useEffect, useCallback } from "react";
import { dbClient } from "../utils/dbClient";
import ConfirmModal from "./ConfirmModal";

export default function TrashView({ 
  trashedTemplates, 
  editedPanelNames, 
  onRestorePanel, 
  onRestoreAll,
  onPermanentDelete, 
  onEmptyTrash,
  trashedParams = [],
  onRestoreParam,
  onPermanentDeleteParam,
  onEmptyParamTrash
}) {
  const [activeTab, setActiveTab] = useState('panels'); // 'panels' | 'patients' | 'parameters'
  const [query, setQuery] = useState("");
  
  // Patient Trash Data
  const [trashedPatients, setTrashedPatients] = useState([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  // Safe Confirm Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionId: null,
    actionType: null
  });

  const confirmAction = async () => {
    const { actionType, actionId } = confirmDialog;
    
    if (actionType === 'EMPTY_TRASH') onEmptyTrash();
    if (actionType === 'PERMANENT_DELETE') onPermanentDelete(actionId);
    if (actionType === 'RESTORE_ALL') onRestoreAll();
    
    if (actionType === 'EMPTY_PARAM_TRASH') onEmptyParamTrash();
    if (actionType === 'PERMANENT_DELETE_PARAM') onPermanentDeleteParam(actionId);
    
    if (actionType === 'RESTORE_ALL_PATIENTS') {
      try {
        const success = await dbClient.restoreAllPatients();
        if (success) {
          if (window.showToast) window.showToast("All patients restored successfully", "success");
          setTrashedPatients([]);
        }
      } catch (err) {
        console.error("Failed to restore all patients", err);
      }
    }

    if (actionType === 'EMPTY_PATIENT_TRASH') {
      try {
        const success = await dbClient.emptyPatientTrash();
        if (success) {
          if (window.showToast) window.showToast("Patient trash emptied", "error");
          setTrashedPatients([]);
        }
      } catch (err) {
        console.error("Failed to empty patient trash", err);
      }
    }
    
    if (actionType === 'PERMANENT_DELETE_PATIENT') {
      try {
        const success = await dbClient.permanentlyDeletePatient(actionId);
        if (success) {
          if (window.showToast) window.showToast("Patient permanently deleted", "error");
          setTrashedPatients(prev => prev.filter(p => p.id !== actionId));
        }
      } catch (err) {
        console.error("Failed to permanent delete", err);
      }
    }
    
    setConfirmDialog({ isOpen: false, title: "", message: "", actionId: null, actionType: null });
  };

  const handleRestorePatient = async (patientId) => {
    try {
      const success = await dbClient.restorePatient(patientId);
      if (success) {
        if (window.showToast) window.showToast("Patient restored successfully", "success");
        setTrashedPatients(prev => prev.filter(p => p.id !== patientId));
      }
    } catch (err) {
      console.error("Failed to restore patient", err);
    }
  };

  const fetchTrashedPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    try {
      const res = await dbClient.getTrashedPatients();
      if (res?.success) {
        setTrashedPatients(res.data);
      }
    } catch (err) {
      console.error("Failed to load trashed patients", err);
    } finally {
      setIsLoadingPatients(false);
      setPatientsLoaded(true);
      if (window.showToast) window.showToast("Trash list synchronized", "success");
    }
  }, []); // Stable reference since it doesn't depend on local reactive state except setters

  // Sync patient trash whenever the tab becomes active
  useEffect(() => {
    if (activeTab === 'patients') {
      fetchTrashedPatients();
    }
  }, [activeTab, fetchTrashedPatients]); // Constant size: 2 items
  
  const filteredTrash = trashedTemplates.filter((panel) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const displayName = (editedPanelNames?.[panel.panel_id] || panel.panel_name || panel.panel_id || "").toString().toLowerCase();
    const idMatches = (panel.panel_id || "").toString().toLowerCase().includes(q);
    return displayName.includes(q) || idMatches;
  });

  const filteredPatients = trashedPatients.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    return (p.name || "").toLowerCase().includes(q) || 
           (p.mrNo || "").toLowerCase().includes(q) || 
           (p.panelNames || "").toLowerCase().includes(q);
  });

  const filteredParams = trashedParams.filter(tp => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    return (tp.parameter?.name || "").toLowerCase().includes(q) ||
           (tp.panelName || "").toLowerCase().includes(q) ||
           (tp.panelId || "").toLowerCase().includes(q);
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
              Panels and test rows moved to trash won't appear in reports. Standard parameters can be restored at any time.
            </p>
          </div>
          {activeTab === 'panels' ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setConfirmDialog({
                  isOpen: true,
                  title: "Restore All Panels",
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
                  title: "Empty Panel Trash",
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
          ) : activeTab === 'patients' ? (
            <div className="flex items-center gap-2 shrink-0">
               <button
                onClick={() => setConfirmDialog({
                  isOpen: true,
                  title: "Restore All Patients",
                  message: "Are you sure you want to restore all patients from the trash back to your active records?",
                  actionType: 'RESTORE_ALL_PATIENTS'
                })}
                disabled={trashedPatients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                Restore All
              </button>
              <button
                onClick={() => setConfirmDialog({
                  isOpen: true,
                  title: "Empty Patient Trash",
                  message: "Are you sure you want to permanently delete all trashed patient records? This will also purge their test results and transactions. This action cannot be undone.",
                  actionType: 'EMPTY_PATIENT_TRASH'
                })}
                disabled={trashedPatients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Empty Trash
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setConfirmDialog({
                  isOpen: true,
                  title: "Empty Parameter Trash",
                  message: "Are you sure you want to permanently delete all trashed test parameters? Standard parameters will remain hidden in trash, but custom ones will be gone forever.",
                  actionType: 'EMPTY_PARAM_TRASH'
                })}
                disabled={trashedParams.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Empty Trash
              </button>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('panels')}
            className={`pb-4 px-6 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'panels'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Test Panels
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{trashedTemplates.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`pb-4 px-6 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'patients'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Patient Records
            {patientsLoaded && <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{trashedPatients.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('parameters')}
            className={`pb-4 px-6 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'parameters'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Test Parameters
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{trashedParams.length}</span>
          </button>
        </div>

        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={
                activeTab === 'panels' ? "Search trashed panels..." : 
                activeTab === 'patients' ? "Search trashed patients..." : 
                "Search trashed parameters..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
            />
          </div>
          <button 
            onClick={activeTab === 'panels' ? null : fetchTrashedPatients}
            disabled={activeTab === 'panels' || isLoadingPatients}
            className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh List"
          >
            <svg className={`w-5 h-5 ${isLoadingPatients ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* List Section */}
        <div className="space-y-3">
          {activeTab === 'panels' && (
            filteredTrash.length === 0 ? (
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
            )
          )}

          {activeTab === 'patients' && (
            isLoadingPatients ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4 border border-gray-200 border-dashed">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">No trashed patients</p>
                {query && <p className="text-gray-400 text-xs mt-1">No matches for "{query}"</p>}
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div 
                  key={patient.id} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 hover:border-gray-300 shadow-sm rounded-xl transition-all gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex shrink-0 w-10 h-10 bg-gray-50 text-gray-400 rounded-lg items-center justify-center border border-gray-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        {patient.name} <span className="text-xs font-normal text-gray-500 ml-1">({patient.mrNo})</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={patient.panelNames}>{patient.panelNames || 'No Tests'}</span>
                        <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                        <span className="text-xs text-red-500/80 font-medium hidden sm:inline">
                          Deleted: {patient.deletedAt ? new Date(patient.deletedAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestorePatient(patient.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200/50 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      Restore
                    </button>
                    
                    <button
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        title: "Delete Patient Forever",
                        message: `Are you sure you want to permanently delete "${patient.name}" and all their test records? This action cannot be undone.`,
                        actionId: patient.id,
                        actionType: 'PERMANENT_DELETE_PATIENT'
                      })}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors border border-red-200/50 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'parameters' && (
            filteredParams.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4 border border-gray-200 border-dashed">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">No trashed parameters</p>
                {query && <p className="text-gray-400 text-xs mt-1">No matches for "{query}"</p>}
              </div>
            ) : (
              filteredParams.map((item) => (
                <div 
                  key={item.trashId} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 hover:border-gray-300 shadow-sm rounded-xl transition-all gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:flex shrink-0 w-10 h-10 bg-gray-50 text-gray-400 rounded-lg items-center justify-center border border-gray-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        {item.parameter?.name} 
                        {item.parameter?.isCustom && <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md uppercase tracking-wide ml-2">Custom</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">From: <span className="font-semibold">{item.panelName || item.panelId}</span></span>
                        <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                        <span className="text-xs text-red-500/80 font-medium hidden sm:inline">
                          Trashed: {new Date(item.trashedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRestoreParam(item.trashId)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200/50 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      Restore
                    </button>
                    
                    <button
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        title: "Delete Parameter Forever",
                        message: `Are you sure you want to permanently delete "${item.parameter?.name}" from trash? This action cannot be undone.`,
                        actionId: item.trashId,
                        actionType: 'PERMANENT_DELETE_PARAM'
                      })}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors border border-red-200/50 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))
            )
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
