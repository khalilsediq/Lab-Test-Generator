import React, { useState, useMemo } from 'react';

export default function TestPriceManager({ testTemplates, testPrices = {}, onUpdatePrice }) {
  const [search, setSearch] = useState("");
  const [localValues, setLocalValues] = useState({});
  const [savedIndicators, setSavedIndicators] = useState({});
  const [errorIndicators, setErrorIndicators] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Deduplicate testTemplates by panel_id
  const panels = useMemo(() => {
    const seen = new Map();
    (testTemplates || []).forEach(p => {
      if (!p?.panel_id) return;
      if (!seen.has(p.panel_id)) seen.set(p.panel_id, p);
    });
    return Array.from(seen.values()).sort((a, b) => {
      const aHasPrice = (testPrices[a.panel_id] ?? 0) > 0 ? 1 : 0;
      const bHasPrice = (testPrices[b.panel_id] ?? 0) > 0 ? 1 : 0;
      if (aHasPrice !== bHasPrice) return bHasPrice - aHasPrice;
      return (a.panel_name || a.panel_id).localeCompare(b.panel_name || b.panel_id);
    });
  }, [testTemplates, testPrices]);

  const filteredPanels = useMemo(() => {
    if (!search.trim()) return panels;
    const s = search.toLowerCase();
    return panels.filter(p =>
      (p.panel_name || p.panel_id).toLowerCase().includes(s) ||
      (p.category || "").toLowerCase().includes(s)
    );
  }, [panels, search]);

  const getValue = (panelId) => {
    if (localValues[panelId] !== undefined) return localValues[panelId];
    return testPrices[panelId] ?? 0;
  };

  const handleChange = (panelId, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setLocalValues(prev => ({ ...prev, [panelId]: num }));
  };

  const handleSave = async (panel) => {
    const val = localValues[panel.panel_id] ?? (testPrices[panel.panel_id] ?? 0);
    
    try {
      await onUpdatePrice(panel.panel_id, panel.panel_name || panel.panel_id, val);
      // Clear local value — global state (testPrices) now holds it
      setLocalValues(prev => {
        const next = { ...prev };
        delete next[panel.panel_id];
        return next;
      });
      setSavedIndicators(prev => ({ ...prev, [panel.panel_id]: true }));
      setTimeout(() => {
        setSavedIndicators(prev => {
          const next = { ...prev };
          delete next[panel.panel_id];
          return next;
        });
      }, 2000);
    } catch {
      setErrorIndicators(prev => ({ ...prev, [panel.panel_id]: true }));
      setTimeout(() => {
        setErrorIndicators(prev => {
          const next = { ...prev };
          delete next[panel.panel_id];
          return next;
        });
      }, 3000);
    }
  };

  const handleSaveAll = async () => {
    const dirty = panels.filter(p => localValues[p.panel_id] !== undefined);
    if (dirty.length === 0) return;
    for (const panel of dirty) await handleSave(panel);
    showToast("All prices saved.");
  };

  const isDirty = (panelId) => localValues[panelId] !== undefined;
  const isAnyDirty = panels.some(p => isDirty(p.panel_id));

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Test Prices</h2>
          <p className="text-sm text-gray-500 mt-1">
            Set the default price for each test panel. Changes sync across the app instantly.
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

      {/* Search */}
      <div className="p-4 shrink-0">
        <input
          type="text"
          placeholder="Search panels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
        />
      </div>

      {/* Table */}
      <div className="flex-1 px-4 pb-4 overflow-hidden">
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto rounded-lg border border-gray-100 bg-white h-full">
          {panels.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No test panels found. Add panels via the sidebar first.
            </div>
          ) : filteredPanels.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No panels match your search.</div>
          ) : (
            <table className="w-full text-left border-collapse bg-white">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-2.5 px-4 border-b border-gray-200 w-12 text-center">#</th>
                  <th className="py-2.5 px-4 border-b border-gray-200">Panel Name</th>
                  <th className="py-2.5 px-4 border-b border-gray-200">Category</th>
                  <th className="py-2.5 px-4 border-b border-gray-200 text-right">Price (Rs.)</th>
                  <th className="py-2.5 px-4 border-b border-gray-200 text-center w-24">Status</th>
                  <th className="py-2.5 px-4 border-b border-gray-200 text-center w-20">Save</th>
                </tr>
              </thead>
              <tbody>
                {filteredPanels.map((p, idx) => {
                  const currentPrice = testPrices[p.panel_id] ?? 0;
                  const dirty = isDirty(p.panel_id);
                  const saved = !!savedIndicators[p.panel_id];
                  const error = !!errorIndicators[p.panel_id];

                  return (
                    <tr
                      key={p.panel_id}
                      className={`${
                        dirty ? "bg-yellow-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } border-b border-gray-100 last:border-0 hover:bg-yellow-50/50 transition-colors`}
                    >
                      <td className="py-2.5 px-4 text-gray-400 text-sm text-center">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-gray-800 text-sm">
                        {p.panel_name || p.panel_id}
                      </td>
                      <td className="py-2.5 px-4 text-sm">
                        {p.category
                          ? <span className="text-gray-600">{p.category}</span>
                          : <span className="italic text-gray-400">Custom</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {dirty && <span className="w-2 h-2 bg-yellow-400 rounded-full shrink-0" />}
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={getValue(p.panel_id)}
                            onChange={(e) => handleChange(p.panel_id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleSave(p); }
                            }}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right w-28 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {currentPrice > 0 ? (
                          <span className="bg-green-100 text-green-700 text-xs font-medium rounded-full px-2 py-0.5">Set</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-xs rounded-full px-2 py-0.5 whitespace-nowrap">Not Set</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center min-h-[30px]">
                          {saved ? (
                            <span className="text-green-600 text-xs font-medium whitespace-nowrap">✓ Saved</span>
                          ) : (
                            <button
                              onClick={() => handleSave(p)}
                              disabled={!dirty}
                              className={`border rounded px-2 py-1 text-xs transition-colors ${
                                dirty
                                  ? "border-red-300 text-red-600 hover:bg-red-50"
                                  : "border-gray-200 text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              Save
                            </button>
                          )}
                          {error && (
                            <span className="text-red-500 text-[10px] mt-0.5 leading-tight whitespace-nowrap">Save failed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
