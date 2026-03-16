import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbClient } from '../utils/dbClient';

export default function TestPriceManager({ testTemplates }) {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [globalToast, setGlobalToast] = useState(null);
  const mountedRef = useRef(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await dbClient.getAllTestPrices();
      if (!res?.success) {
        setErrorMsg("Failed to load prices. Please restart the application.");
        setLoading(false);
        return;
      }

      const priceMap = new Map();
      if (Array.isArray(res.data)) {
        res.data.forEach(item => {
          if (item?.panelId) priceMap.set(item.panelId, item.price ?? 0);
        });
      }

      const deduplicatedMap = new Map();
      (testTemplates || []).forEach(p => {
        if (!p || !p.panel_id) return;
        if (!deduplicatedMap.has(p.panel_id)) {
          deduplicatedMap.set(p.panel_id, p);
        }
      });
      
      const finalState = Array.from(deduplicatedMap.values()).map(p => ({
        panelId: p.panel_id,
        panelName: p.panel_name || p.panel_id,
        category: p.category,
        price: priceMap.get(p.panel_id) ?? 0,
        dirty: false,
        savedIndicator: false,
        errorIndicator: false
      }));
      
      setPanels([...finalState].sort(sortPanels));
    } catch (err) {
      setErrorMsg("Failed to load prices. Please restart the application.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadData();
  }, []);

  // Update silently when testTemplates change (imports, deletions, trashes)
  // App.jsx now wraps these changes in startTransition so this won't freeze the UI 
  useEffect(() => {
    setPanels(currentPanels => {
      if (!currentPanels) return currentPanels;
      
      const currentMap = new Map();
      currentPanels.forEach(p => currentMap.set(p.panelId, p));

      const newDeduplicated = new Map();
      (testTemplates || []).forEach(p => {
        if (!p || !p.panel_id) return;
        if (!newDeduplicated.has(p.panel_id)) {
          newDeduplicated.set(p.panel_id, p);
        }
      });

      let changed = false;
      const finalState = [];

      // Retain existing panels that are still in testTemplates
      currentPanels.forEach(p => {
        if (newDeduplicated.has(p.panelId)) {
          finalState.push(p);
        } else {
          changed = true; // Panel was deleted/trashed
        }
      });

      // Add new panels that appeared in testTemplates
      newDeduplicated.forEach(newP => {
        if (!currentMap.has(newP.panel_id)) {
          changed = true; // Panel was added/restored
          finalState.push({
            panelId: newP.panel_id,
            panelName: newP.panel_name || newP.panel_id,
            category: newP.category,
            price: 0,
            dirty: false,
            savedIndicator: false,
            errorIndicator: false
          });
        }
      });

      if (changed) {
        return [...finalState].sort(sortPanels);
      }
      return currentPanels;
    });
  }, [testTemplates]); // Note: testTemplates passed down from App already excludes trashed panels

  const sortPanels = (a, b) => {
    const aPriced = a.price > 0 ? 1 : 0;
    const bPriced = b.price > 0 ? 1 : 0;
    if (aPriced !== bPriced) return bPriced - aPriced;
    return a.panelName.localeCompare(b.panelName);
  };

  const showToast = (msg) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 3000);
  };

  const handlePriceChange = (panelId, val) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 0) num = 0;
    
    setPanels(prev => prev.map(p => {
      if (p.panelId !== panelId) return p;
      return { ...p, price: num, dirty: true };
    }));
  };

  const saveIndividual = async (panelId) => {
    const pInfo = panels.find(p => p.panelId === panelId);
    if (!pInfo || !pInfo.dirty) return;

    try {
      const res = await dbClient.setTestPrice(pInfo.panelId, pInfo.panelName, pInfo.price);
      if (!res?.success) {
        setPanels(prev => prev.map(p => p.panelId === panelId ? { ...p, errorIndicator: true } : p));
        setTimeout(() => {
          setPanels(prev => prev.map(p => p.panelId === panelId ? { ...p, errorIndicator: false } : p));
        }, 3000);
      } else {
        setPanels(prev => {
          const updated = prev.map(p => p.panelId === panelId ? { ...p, dirty: false, savedIndicator: true, errorIndicator: false } : p);
          setTimeout(() => {
            setPanels(current => {
              const refreshed = current.map(cp => cp.panelId === panelId ? { ...cp, savedIndicator: false } : cp);
              return [...refreshed]; // Removed sort here to avoid jumping mid-edit
            });
          }, 2000);
          return updated;
        });
      }
    } catch (err) {
      setPanels(prev => prev.map(p => p.panelId === panelId ? { ...p, errorIndicator: true } : p));
      setTimeout(() => {
        setPanels(prev => prev.map(p => p.panelId === panelId ? { ...p, errorIndicator: false } : p));
      }, 3000);
    }
  };

  const handleSaveAll = async () => {
    const dirtyRows = panels.filter(p => p.dirty);
    if (dirtyRows.length === 0) return;

    let anyFailed = false;
    for (const row of dirtyRows) {
      try {
        const res = await dbClient.setTestPrice(row.panelId, row.panelName, row.price);
        if (!res?.success) {
           anyFailed = true;
           break;
        }
      } catch (err) {
        anyFailed = true;
        break;
      }
    }

    if (anyFailed) {
      setErrorMsg("Some prices failed to save. Please try again.");
    } else {
      setErrorMsg(null);
      setPanels(prev => {
        const updated = prev.map(p => p.dirty ? { ...p, dirty: false } : p);
        return [...updated]; // Removed sort here to avoid jumping
      });
      showToast("All prices saved successfully.");
    }
  };

  const isAnyDirty = panels.some(p => p.dirty);

  const filteredPanels = useMemo(() => {
    if (!search) return panels;
    const s = search.toLowerCase();
    return panels.filter(p => p.panelName.toLowerCase().includes(s));
  }, [panels, search]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-400 h-full">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading test prices...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {errorMsg === "Failed to load prices. Please restart the application." ? (
        <div className="p-4 m-6 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center py-10">
          <p className="text-red-600 font-medium mb-4">{errorMsg}</p>
          <button onClick={loadData} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Test Prices</h2>
              <p className="text-sm text-gray-500 mt-1">
                Set the default price for each test panel. These prices will auto-fill when registering a patient.
              </p>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={!isAnyDirty}
              className={`${
                isAnyDirty
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              } rounded-lg px-4 py-2 text-sm font-semibold transition-colors shrink-0`}
            >
              Save All Changes
            </button>
          </div>

          {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold px-2">×</button>
            </div>
          )}

          <div className="p-4 shrink-0">
            <input
              type="text"
              placeholder="Search panels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
            />
          </div>

          <div className="flex-1 px-4 pb-4 overflow-hidden relative">
            {/* The wrapper allows scrolling only for the table body technically, but using overflow-y-auto on a flex child works well for full list scrolling. */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto rounded-lg border border-gray-100 bg-white h-full relative">
              {panels.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No test panels found. Add panels using the sidebar to get started.
                </div>
              ) : filteredPanels.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No panels match your search.
                </div>
              ) : (
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold w-12 text-center border-b border-gray-200">#</th>
                      <th className="py-2.5 px-4 font-semibold border-b border-gray-200">Panel Name</th>
                      <th className="py-2.5 px-4 font-semibold border-b border-gray-200">Category</th>
                      <th className="py-2.5 px-4 font-semibold text-right border-b border-gray-200">Price (Rs.)</th>
                      <th className="py-2.5 px-4 font-semibold text-center w-24 border-b border-gray-200">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-center w-24 border-b border-gray-200">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPanels.map((p, idx) => (
                      <tr
                        key={p.panelId}
                        className={`${
                          p.dirty ? "bg-yellow-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } border-b border-gray-100 last:border-0 hover:bg-yellow-50/50 transition-colors`}
                      >
                        <td className="py-2.5 px-4 text-gray-400 text-sm text-center">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-gray-800 text-sm">
                          {p.panelName}
                        </td>
                        <td className="py-2.5 px-4 text-sm whitespace-nowrap">
                          {p.category ? (
                            <span className="text-gray-600">{p.category}</span>
                          ) : (
                            <span className="italic text-gray-400">Custom</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end">
                            {p.dirty && (
                              <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block mr-2 shrink-0"></span>
                            )}
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={p.price}
                              onChange={(e) => handlePriceChange(p.panelId, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveIndividual(p.panelId);
                                }
                              }}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right w-28 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {p.price > 0 ? (
                            <span className="bg-green-100 text-green-700 text-xs font-medium rounded-full px-2 py-0.5">
                              Set
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 text-xs rounded-full px-2 py-0.5 whitespace-nowrap">
                              Not Set
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex flex-col items-center justify-center min-h-[30px]">
                            {p.savedIndicator ? (
                              <span className="text-green-600 text-xs font-medium whitespace-nowrap">✓ Saved</span>
                            ) : (
                              <button
                                onClick={() => saveIndividual(p.panelId)}
                                className="border border-gray-200 hover:border-red-400 text-gray-600 hover:text-red-600 rounded px-2 py-1 text-xs transition-colors"
                              >
                                Save
                              </button>
                            )}
                            {p.errorIndicator && (
                              <span className="text-red-500 text-[10px] mt-0.5 leading-tight block whitespace-nowrap">Save failed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {globalToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          {globalToast}
        </div>
      )}
    </div>
  );
}
