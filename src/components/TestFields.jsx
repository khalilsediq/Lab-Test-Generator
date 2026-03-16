import { useEffect, useState, useMemo } from "react";

// ── helpers ─────────────────────────────────────────────────────────────────

const isQual = (p) => {
  const rr = p?.reference_range;
  return (
    p?.unit === "qualitative" ||
    p?.unit === "semiquantitative" ||
    p?.unit === "titre" ||
    (rr?.male_min === null &&
      rr?.male_max === null &&
      rr?.female_min === null &&
      rr?.female_max === null)
  );
};

const effectiveRange = (p, editedRanges, panelId) => {
  const overrides = editedRanges?.[panelId]?.[p.id] || {};
  return { ...p.reference_range, ...overrides };
};

// Apply editedParams overrides on top of raw param fields
const effectiveParam = (p, editedParams, panelId) => {
  const overrides = editedParams?.[panelId]?.[p.id] || {};
  return { ...p, ...overrides };
};

const formatRange = (rr, gender) => {
  if (!rr) return "—";
  
  // Check custom_ranges first for non-standard genders
  if (gender && gender !== "Male" && gender !== "Female" && Array.isArray(rr.custom_ranges)) {
    const cr = rr.custom_ranges.find(
      (c) => c.gender?.toLowerCase() === gender.toLowerCase()
    );
    if (cr) {
      const mn = cr.min, mx = cr.max;
      if (mn === null && mx === null) return rr.general || "—";
      if (mn !== null && mx === null) return `≥ ${mn}`;
      if (mn === null && mx !== null) return `< ${mx}`;
      return `${mn} – ${mx}`;
    }
  }
  
  const [minKey, maxKey] =
    gender === "Male" ? ["male_min", "male_max"] : ["female_min", "female_max"];
  const mn = rr[minKey],
    mx = rr[maxKey];
  if (mn === null && mx === null) return rr.general || "—";
  if (mn !== null && mx === null) return `≥ ${mn}`;
  if (mn === null && mx !== null) return `< ${mx}`;
  return `${mn} – ${mx}`;
};

const isAbnormal = (val, rr, gender, qual) => {
  if (qual || !val || !rr) return false;
  const n = parseFloat(val);
  if (isNaN(n)) return false;

  // Custom gender ranges first
  if (gender && gender !== "Male" && gender !== "Female" && Array.isArray(rr.custom_ranges)) {
    const cr = rr.custom_ranges.find(
      (c) => c.gender?.toLowerCase() === gender.toLowerCase()
    );
    if (cr) {
      const mn = cr.min, mx = cr.max;
      if (mn !== null && mx === null) return n < mn;
      if (mn === null && mx !== null) return n > mx;
      if (mn !== null && mx !== null) return n < mn || n > mx;
      return false;
    }
  }

  const [minKey, maxKey] =
    gender === "Male" ? ["male_min", "male_max"] : ["female_min", "female_max"];
  const mn = rr[minKey],
    mx = rr[maxKey];
  if (mn !== null && mx === null) return n < mn;
  if (mn === null && mx !== null) return n > mx;
  if (mn !== null && mx !== null) return n < mn || n > mx;
  return false;
};

// ── EditRow (reference range editor) ─────────────────────────────────────────

function EditRow({ param, gender, editedRanges, panelId, onSave, onReset, onCancel }) {
  const base = effectiveRange(param, editedRanges, panelId);
  const hasOverride = !!editedRanges?.[panelId]?.[param.id];
  const qual = isQual(param);
  
  // Initialize state with standard and custom ranges
  const [vals, setVals] = useState({
    general: base.general ?? "",
    male_min: base.male_min ?? "",
    male_max: base.male_max ?? "",
    female_min: base.female_min ?? "",
    female_max: base.female_max ?? "",
    custom_ranges: Array.isArray(base.custom_ranges) ? [...base.custom_ranges] : []
  });

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const toNum = (v) => (v === "" ? null : parseFloat(v));

  // Helper to update specific custom gender range in array
  const setCustom = (targetGender, key, value) => {
    const next = [...vals.custom_ranges];
    const idx = next.findIndex(c => c.gender?.toLowerCase() === targetGender.toLowerCase());
    const val = toNum(value);
    if (idx >= 0) {
      next[idx] = { ...next[idx], [key]: val };
    } else {
      next.push({ gender: targetGender, [key]: val });
    }
    set("custom_ranges", next);
  };

  const handleSave = () =>
    onSave(param.id, {
      general: vals.general || null,
      male_min: toNum(vals.male_min),
      male_max: toNum(vals.male_max),
      female_min: toNum(vals.female_min),
      female_max: toNum(vals.female_max),
      custom_ranges: vals.custom_ranges.length > 0 ? vals.custom_ranges : null
    });

  const inp =
    "w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none";

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mx-2 my-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-gray-800">{param.name}</span>
          <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
            Editing Range
          </span>
        </div>
        <div className="flex space-x-2">
          {hasOverride && (
            <button
              onClick={() => onReset(param.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-orange-600 hover:bg-orange-100 border border-orange-300 transition-colors"
              title="Reset to original template value"
            >
              Reset Default
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md shadow-red-500/20"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <label className="text-xs font-semibold text-gray-600">
          General / Note
        </label>
        <input
          type="text"
          value={vals.general}
          onChange={(e) => set("general", e.target.value)}
          className={inp}
          placeholder="e.g. Non-Reactive (Negative)"
        />
      </div>

      {!qual && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-blue-600 mb-2">♂ Male Range</p>
            <div className="grid grid-cols-2 gap-2">
              {["male_min", "male_max"].map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">
                    {k.includes("min") ? "Min" : "Max"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={vals[k]}
                    onChange={(e) => set(k, e.target.value)}
                    className={inp}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-pink-600 mb-2">
              ♀ Female Range
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["female_min", "female_max"].map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">
                    {k.includes("min") ? "Min" : "Max"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={vals[k]}
                    onChange={(e) => set(k, e.target.value)}
                    className={inp}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Custom Gender Range (Dynamic) */}
          {gender && gender !== "Male" && gender !== "Female" && (
            <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-violet-600 mb-2">
                ⚧ {gender} Range
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["min", "max"].map((k) => {
                  const cr = vals.custom_ranges?.find(c => c.gender?.toLowerCase() === gender.toLowerCase());
                  const curVal = cr ? (cr[k] ?? "") : "";
                  return (
                    <div key={k} className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase">
                        {k}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={curVal}
                        onChange={(e) => setCustom(gender, k, e.target.value)}
                        className={inp}
                        placeholder="—"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── EditParamRow (parameter field editor) ─────────────────────────────────────

function EditParamRow({
  param,
  editedParams,
  panelId,
  onSave,
  onReset,
  onCancel,
}) {
  const hasOverride = !!editedParams?.[panelId]?.[param.id];
  const [vals, setVals] = useState({
    name: param.name,
    abbreviation: param.abbreviation || "",
    unit: param.unit || "",
  });
  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));

  const handleSave = () =>
    onSave(param.id, {
      name: vals.name.trim() || param.name,
      abbreviation: vals.abbreviation.trim(),
      unit: vals.unit.trim(),
    });

  const inp =
    "w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none";

  return (
    <div className="bg-violet-50 border border-violet-300 rounded-xl p-4 mx-2 my-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-gray-800">{param.name}</span>
          <span className="text-[10px] bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full font-bold">
            Editing Parameter
          </span>
          {hasOverride && (
            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
              Custom
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {hasOverride && (
            <button
              onClick={() => onReset(param.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-orange-600 hover:bg-orange-100 border border-orange-300 transition-colors"
              title="Reset to original template value"
            >
              Reset Default
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-md shadow-violet-500/20"
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            Parameter Name
          </label>
          <input
            type="text"
            value={vals.name}
            onChange={(e) => set("name", e.target.value)}
            className={inp}
            placeholder="e.g. Haemoglobin"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            Abbreviation
          </label>
          <input
            type="text"
            value={vals.abbreviation}
            onChange={(e) => set("abbreviation", e.target.value)}
            className={inp + " font-mono"}
            placeholder="e.g. Hb"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            Unit
          </label>
          <input
            type="text"
            value={vals.unit}
            onChange={(e) => set("unit", e.target.value)}
            className={inp + " font-mono"}
            placeholder="e.g. g/dL"
          />
        </div>
      </div>

      {hasOverride && (
        <p className="mt-3 text-[10px] text-violet-500 font-medium">
          ⚙ This parameter has been customised. Click &ldquo;Reset
          Default&rdquo; to restore original template values.
        </p>
      )}
    </div>
  );
}

// ── PanelFieldsGroup ─────────────────────────────────────────────────────────

import BloodBankFields from "./BloodBankFields";

function PanelFieldsGroup({
  panelId,
  testData,
  setTestData,
  patientDetails,
  testTemplates,
  editedRanges,
  editedParams,
  paramOrders,
  onSaveRange,
  onResetRange,
  onSaveParam,
  onResetParam,
  onSavePanelName,
  onResetPanelName,
  onSaveOrder,
  isRemovable,
  onRemove,
  editedPanelNames,
  testPrices = {},
  onUpdatePrice,
}) {
  const gender = patientDetails?.gender || "Male";
  const panel = testTemplates?.find((t) => t.panel_id === panelId);
  if (!panel) return null;

  const isBloodBank = panel?.category?.toLowerCase()?.includes("blood");

  const rawFields = useMemo(() => {
    return (panel?.parameters || []).filter(
      (p) =>
        p && (p.gender_applicable === "all" ||
        p.gender_applicable === gender.toLowerCase()),
    );
  }, [panel, gender]);

  // Apply saved order
  function applyOrder(src, order) {
    if (!order) return src;
    return [...src].sort((a, b) => {
      const ai = order.indexOf(a.id),
        bi = order.indexOf(b.id);
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  }

  const savedOrder = paramOrders?.[panelId];
  const [fields, setFields] = useState(() => applyOrder(rawFields, savedOrder));

  // "editingId" tracks which row is open and which editor (range|param)
  const [editingId, setEditingId] = useState(null);     // param id
  const [editingMode, setEditingMode] = useState(null); // "range" | "param"
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [localPrice, setLocalPrice] = useState(null); // null = not editing

  const panelName = (editedPanelNames?.[panelId] || panel?.panel_name || panelId || "").toString();
  const hasNameOverride = !!editedPanelNames?.[panelId];

  useEffect(() => {
    // Reset editor state when panel changes
     
    setEditingId(null);
     
    setEditingMode(null);
    setIsEditingName(false); // Reset name editor state
  }, [panelId]);

  useEffect(() => {
    if (isEditingName) setNewName(panelName);
  }, [isEditingName, panelName]);
   
  useEffect(() => {
    setFields(applyOrder(rawFields, paramOrders?.[panelId]));
  }, [panelId, gender, rawFields, paramOrders]);

  const handleChange = (key, val) =>
    setTestData((prev) => ({ ...prev, [key]: val }));

  const openEditor = (id, mode) => {
    if (editingId === id && mode === editingMode) {
      setEditingId(null);
      setEditingMode(null);
    } else {
      setEditingId(id);
      setEditingMode(mode);
    }
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditingMode(null);
  };

  // ── drag handlers ──
  const onDragStart = (i) => setDragFrom(i);
  const onDragOver = (e, i) => {
    e.preventDefault();
    setDragOver(i);
  };
  const onDrop = (i) => {
    if (dragFrom === null || dragFrom === i) return;
    const next = [...fields];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(i, 0, moved);
    setFields(next);
    onSaveOrder(
      panelId,
      next.map((f) => f.id),
    );
    setDragFrom(null);
    setDragOver(null);
  };
  const onDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col space-y-1 mb-6">
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
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
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Test Entry</h2>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-200 mb-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  className="flex-1 min-w-0 px-2 py-1 text-xl font-black text-gray-800 border-2 border-red-500 rounded-lg focus:outline-none shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSavePanelName(panelId, newName);
                      setIsEditingName(false);
                    }
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <button
                  onClick={() => {
                    onSavePanelName(panelId, newName);
                    setIsEditingName(false);
                  }}
                  className="p-1 px-2 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 transition-colors"
                >
                  Save
                </button>
                {hasNameOverride && (
                  <button
                    onClick={() => {
                      onResetPanelName(panelId);
                      setIsEditingName(false);
                    }}
                    className="p-1 px-2 border border-orange-200 text-orange-600 text-[10px] font-bold rounded-md hover:bg-orange-50 transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-1 px-2 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 min-w-0 group/name mb-1">
                <p className="text-xl font-black text-gray-800 tracking-tight leading-none truncate uppercase">
                  {panelName}
                </p>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/name:opacity-100 transition-all rounded-md hover:bg-red-50"
                  title="Edit panel name"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            <span
              className={`text-[10px] w-fit font-bold px-2 py-0.5 rounded-full ${
                gender === "Male" 
                  ? "bg-blue-100 text-blue-700" 
                  : gender === "Female" 
                    ? "bg-pink-100 text-pink-700" 
                    : "bg-violet-100 text-violet-700"
              }`}
            >
              {gender === "Male" ? "♂ Male" : gender === "Female" ? "♀ Female" : `⚧ ${gender}`} ranges shown
            </span>
          </div>
          
          {/* Inline Price Editor */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center gap-1 group/price">
              <span className="text-xs font-semibold text-gray-400">Rs.</span>
              <input
                type="number"
                min="0"
                step="1"
                value={localPrice !== null ? localPrice : (testPrices[panelId] ?? "")}
                onChange={(e) => setLocalPrice(e.target.value)}
                onFocus={(e) => {
                  if (localPrice === null) setLocalPrice(testPrices[panelId] ?? "");
                }}
                onBlur={() => {
                  if (localPrice !== null && onUpdatePrice) {
                    onUpdatePrice(panelId, panel?.panel_name || panelId, localPrice);
                    setLocalPrice(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && localPrice !== null && onUpdatePrice) {
                    onUpdatePrice(panelId, panel?.panel_name || panelId, localPrice);
                    setLocalPrice(null);
                    e.target.blur();
                  }
                  if (e.key === 'Escape') {
                    setLocalPrice(null);
                    e.target.blur();
                  }
                }}
                placeholder="Price"
                className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-lg text-right font-mono focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 bg-gray-50 hover:bg-white transition-colors"
                title="Set panel price (Rs.)"
              />
              {(testPrices[panelId] > 0 || localPrice > 0) && (
                <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap">
                  ✓ Priced
                </span>
              )}
            </div>
            {isRemovable && onRemove && (
              <button
                onClick={() => onRemove(panelId)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                ✕ Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {isBloodBank ? (
        <BloodBankFields
          panel={panel}
          testData={testData}
          setTestData={setTestData}
          editedParams={editedParams}
          paramOrders={paramOrders}
        />
      ) : (
        <>
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[24px_1fr_180px_180px_64px] gap-2 px-3 pb-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <div />
            <div>Parameter</div>
            <div className="text-center">Result</div>
            <div className="text-right">Ref. Range</div>
            <div />
          </div>

          <div className="space-y-1 mt-2">
            {fields.map((rawField, idx) => {
              // Apply param overrides for display
              const field = effectiveParam(rawField, editedParams, panelId);
              const rr = effectiveRange(rawField, editedRanges, panelId);
              const qual = isQual(rawField);
              const abn = isAbnormal(testData[rawField.id], rr, gender, qual);
              const isDragging = dragFrom === idx;
              const isDragTarget = dragOver === idx && dragFrom !== idx;
              const hasParamOverride = !!editedParams?.[panelId]?.[rawField.id];

              if (editingId === rawField.id && editingMode === "range") {
                return (
                  <EditRow
                    key={rawField.id}
                    param={rawField}
                    gender={gender}
                    editedRanges={editedRanges}
                    panelId={panelId}
                    onSave={(id, range) => {
                      onSaveRange(panelId, id, range);
                      closeEditor();
                    }}
                    onReset={(id) => {
                      onResetRange(panelId, id);
                      closeEditor();
                    }}
                    onCancel={closeEditor}
                  />
                );
              }

              if (editingId === rawField.id && editingMode === "param") {
                return (
                  <EditParamRow
                    key={rawField.id}
                    param={field}
                    editedParams={editedParams}
                    panelId={panelId}
                    onSave={(id, updatedFields) => {
                      onSaveParam(panelId, id, updatedFields);
                      closeEditor();
                    }}
                    onReset={(id) => {
                      onResetParam(panelId, id);
                      closeEditor();
                    }}
                    onCancel={closeEditor}
                  />
                );
              }

              return (
                <div
                  key={rawField.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDrop={() => onDrop(idx)}
                  onDragEnd={onDragEnd}
                  className={`grid grid-cols-[24px_1fr_64px] sm:grid-cols-[24px_1fr_180px_180px_64px] gap-2 items-center px-3 py-2.5 rounded-xl border transition-all ${
                    isDragTarget
                      ? "border-red-400 bg-red-50 scale-[1.01]"
                      : isDragging
                        ? "border-gray-200 bg-gray-50 opacity-40"
                        : "border-transparent hover:border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab text-gray-300 hover:text-gray-500 transition-colors active:cursor-grabbing">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 17a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                    </svg>
                  </div>

                  {/* Name + Input + Range (Responsive Layout) */}
                  <div className="flex flex-col sm:contents min-w-0">
                    {/* Name */}
                    <div className="min-w-0 mb-1 sm:mb-0">
                      <span className="text-sm font-semibold text-gray-700">
                        {field.name}
                      </span>
                      {field.abbreviation && (
                        <span className="ml-1.5 text-[11px] text-gray-400 font-mono">
                          ({field.abbreviation})
                        </span>
                      )}
                      {hasParamOverride && (
                        <span className="ml-1.5 text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-bold align-middle">
                          edited
                        </span>
                      )}
                    </div>

                    {/* Input */}
                    <div className="flex items-center space-x-2 mb-1 sm:mb-0">
                      {qual ? (
                        <input
                          type="text"
                          value={testData[rawField.id] || ""}
                          onChange={(e) =>
                            handleChange(rawField.id, e.target.value)
                          }
                          placeholder="e.g. Negative"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                        />
                      ) : (
                        <>
                          <input
                            type="number"
                            step="any"
                            value={testData[rawField.id] || ""}
                            onChange={(e) =>
                              handleChange(rawField.id, e.target.value)
                            }
                            className={`w-full sm:w-24 px-3 py-2 text-center rounded-lg bg-white border transition-all outline-none font-mono font-medium text-sm ${
                              abn
                                ? "border-red-400 text-red-700 bg-red-50 focus:ring-red-500/20"
                                : "border-gray-300 focus:border-red-500 focus:ring-red-500/10"
                            } focus:ring-4`}
                          />
                          <span className="text-[11px] text-gray-500 leading-tight shrink-0">
                            {field.unit}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Range */}
                    <div className="text-left sm:text-right">
                      <div
                        className={`text-[10px] font-bold ${gender === "Male" ? "text-blue-500" : "text-pink-500"}`}
                      >
                        {gender === "Male" ? "♂" : "♀"} Normal
                      </div>
                      <div
                        className={`text-xs font-mono ${abn ? "text-red-600 font-bold" : "text-gray-500"}`}
                      >
                        {qual
                          ? rr.general || "—"
                          : `${formatRange(rr, gender)}${field.unit ? ` ${field.unit}` : ""}`}
                      </div>
                      {abn && (
                        <div className="text-[10px] text-red-500 font-bold">
                          ⚠ Abnormal
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons: param edit + range edit */}
                  <div className="flex items-center justify-end space-x-1 shrink-0">
                    {/* Edit Parameter Fields */}
                    <button
                      onClick={() => openEditor(rawField.id, "param")}
                      title="Edit parameter name / abbreviation / unit"
                      className={`p-1.5 rounded-lg transition-all shrink-0 ${
                        editingId === rawField.id && editingMode === "param"
                          ? "text-violet-600 bg-violet-100"
                          : hasParamOverride
                            ? "text-violet-400 hover:text-violet-600 hover:bg-violet-50"
                            : "text-gray-300 hover:text-violet-500 hover:bg-violet-50"
                      }`}
                    >
                      {/* Tag/label icon */}
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
                          d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </button>

                    {/* Edit Reference Range */}
                    <button
                      onClick={() => openEditor(rawField.id, "range")}
                      title="Edit reference range"
                      className={`p-1.5 rounded-lg transition-all shrink-0 ${
                        editingId === rawField.id && editingMode === "range"
                          ? "text-red-600 bg-red-100"
                          : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                      }`}
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}

            {fields.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                No parameters found for this test and gender selection.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Export (Multi-Test Composition) ─────────────────────────────────────

export default function TestFields({
  selectedTest,
  testData,
  setTestData,
  patientDetails,
  testTemplates,
  editedRanges,
  editedParams,
  paramOrders,
  additionalPanels = [],
  setAdditionalPanels = () => {},
  onSaveRange,
  onResetRange,
  onSaveParam,
  onResetParam,
  onSavePanelName,
  onResetPanelName,
  onSaveOrder,
  editedPanelNames = {},
  testPrices = {},
  onUpdatePrice,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState("");
  const [inlineAlert, setInlineAlert] = useState(null);

  const showAlert = (msg) => {
    setInlineAlert(msg);
    setTimeout(() => setInlineAlert(null), 3000);
  };

  // Clear data when main selectedTest changes (but do not clear when adding secondary panels)
  useEffect(() => {
    setTestData({});
    setAdditionalPanels([]);
  }, [selectedTest, setTestData, setAdditionalPanels]);

  const handleAddPanel = () => {
    if (!pickerValue) return;
    if (pickerValue === selectedTest) {
      showAlert("This panel is already the primary test.");
      return;
    }
    if (additionalPanels.includes(pickerValue)) {
      showAlert("This panel is already added.");
      return;
    }
    setAdditionalPanels([...additionalPanels, pickerValue]);
    setPickerValue("");
    setPickerOpen(false);
  };

  const handleRemovePanel = (idToRemove) => {
    setAdditionalPanels(additionalPanels.filter((id) => id !== idToRemove));
  };

  const activePanels = [selectedTest, ...additionalPanels];

  return (
    <>
      <div className="space-y-6">
      {activePanels.map((panelId, index) => (
        <PanelFieldsGroup
          key={panelId + index}
          panelId={panelId}
          testData={testData}
          setTestData={setTestData}
          patientDetails={patientDetails}
          testTemplates={testTemplates}
          editedRanges={editedRanges}
          editedParams={editedParams}
          paramOrders={paramOrders}
          onSaveRange={onSaveRange}
          onResetRange={onResetRange}
          onSaveParam={onSaveParam}
          onResetParam={onResetParam}
          onSavePanelName={onSavePanelName}
          onResetPanelName={onResetPanelName}
          onSaveOrder={onSaveOrder}
          isRemovable={index > 0}
          onRemove={handleRemovePanel}
          editedPanelNames={editedPanelNames}
          testPrices={testPrices}
          onUpdatePrice={onUpdatePrice}
        />
      ))}

      {/* Add Another Test Section */}
      <div className="max-w-4xl p-4 bg-gray-50 border border-gray-200 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all">
        {!pickerOpen ? (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:shadow-sm transition-all"
          >
            <span className="text-xl leading-none">+</span>
            <span>Add Another Test</span>
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full max-w-md">
            <select
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
            >
              <option value="" disabled>
                Select a panel to add...
              </option>
              {testTemplates.map((t) => (
                <option key={t.panel_id} value={t.panel_id}>
                  {t.panel_name}
                </option>
              ))}
            </select>
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                onClick={handleAddPanel}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all whitespace-nowrap"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setPickerOpen(false);
                  setPickerValue("");
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Inline alert toast */}
      {inlineAlert && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 bg-gray-900/90 backdrop-blur-sm text-white text-sm px-5 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2 border border-white/10">
          <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z"/></svg>
          {inlineAlert}
        </div>
      )}
    </>
  );
}
