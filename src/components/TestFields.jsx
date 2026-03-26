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

// ── NewCustomParamEditor (Add custom parameter form) ─────────────────────────

function NewCustomParamEditor({ onSave, onCancel }) {
  const [vals, setVals] = useState({
    type: "numeric",
    name: "",
    abbreviation: "",
    unit: "",
    options: "",
    gender_applicable: "all",
    reference_range: {
      general: "",
      male_min: "",
      male_max: "",
      female_min: "",
      female_max: "",
      custom_ranges: []
    }
  });

  const updateParam = (field, val) => {
    setVals((prev) => {
      if (field === "rr_custom_ranges") {
        return { ...prev, reference_range: { ...prev.reference_range, custom_ranges: val } };
      }
      if (field.startsWith("rr_")) {
        return { ...prev, reference_range: { ...prev.reference_range, [field.slice(3)]: val } };
      }
      return { ...prev, [field]: val };
    });
  };

  const handleSave = () => {
    if (!vals.name.trim()) return;

    const toNum = (v) => (v === "" || v == null ? null : parseFloat(v));
    let unitValue = vals.unit;
    if (vals.type === "qualitative_select") unitValue = "qualitative_select";
    if (vals.type === "text") unitValue = "text_remark";
    if (vals.type === "subheading") unitValue = "subheading";

    const rr = { ...vals.reference_range };
    if (vals.type === "qualitative_select") {
      rr.general = vals.options?.trim() || "A Positive, B Positive, AB Positive, O Positive, A Negative, B Negative, AB Negative, O Negative";
    }

    const custom_ranges = (rr.custom_ranges || []).filter(
      (cr) => cr.gender?.trim() && (cr.min !== "" || cr.max !== "")
    ).map(cr => ({
      gender: cr.gender.trim(),
      min: cr.min !== "" && cr.min != null ? parseFloat(cr.min) : null,
      max: cr.max !== "" && cr.max != null ? parseFloat(cr.max) : null,
    }));

    const newParam = {
      id: `custom_param_${Math.random().toString(36).substr(2, 9)}`,
      name: vals.name.trim(),
      abbreviation: vals.abbreviation.trim(),
      unit: unitValue,
      gender_applicable: vals.gender_applicable,
      isCustom: true,
      reference_range: {
        general: rr.general || null,
        male_min: toNum(rr.male_min),
        male_max: toNum(rr.male_max),
        female_min: toNum(rr.female_min),
        female_max: toNum(rr.female_max),
        custom_ranges: custom_ranges.length > 0 ? custom_ranges : undefined,
      },
    };

    onSave(newParam);
  };

  const inp = "w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none";
  const numInp = inp + " font-mono";

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-2">
      <div className="flex items-center justify-between mb-3 border-b border-red-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          </div>
          <span className="text-sm font-bold text-gray-800">Add Custom Parameter</span>
        </div>
        <div className="flex space-x-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-white transition-colors border border-transparent hover:border-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={!vals.name.trim()} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed">Save Parameter</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Param Type</label>
          <select value={vals.type} onChange={(e) => updateParam("type", e.target.value)} className={inp + " text-gray-700"}>
            <option value="numeric">Numerical Range</option>
            <option value="qualitative_select">Dropdown</option>
            <option value="text">Free Text</option>
            <option value="subheading">Subheading</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name <span className="text-red-500">*</span></label>
          <input type="text" value={vals.name} onChange={(e) => updateParam("name", e.target.value)} placeholder="e.g. Haemoglobin" className={inp} />
        </div>
        {vals.type !== "subheading" && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Abbrev</label>
            <input type="text" value={vals.abbreviation} onChange={(e) => updateParam("abbreviation", e.target.value)} placeholder="e.g. Hb" className={inp} />
          </div>
        )}
        {vals.type === "numeric" && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Unit</label>
            <input type="text" value={vals.unit} onChange={(e) => updateParam("unit", e.target.value)} placeholder="e.g. g/dL" className={inp} />
          </div>
        )}
      </div>

      {vals.type === "qualitative_select" && (
        <div className="space-y-1 mb-3">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Dropdown Options (comma separated)</label>
          <input type="text" value={vals.options} onChange={(e) => updateParam("options", e.target.value)} placeholder="e.g. Positive, Negative" className={inp} />
        </div>
      )}

      {vals.type === "numeric" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Applies To</label>
              <select value={vals.gender_applicable} onChange={(e) => updateParam("gender_applicable", e.target.value)} className={inp + " text-gray-700"}>
                <option value="all">All genders</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase">General Reference Note</label>
              <input type="text" value={vals.reference_range.general} onChange={(e) => updateParam("rr_general", e.target.value)} placeholder="e.g. Negative / < 5.7" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-xl border border-red-50 shadow-sm">
              <p className="text-[10px] font-bold text-blue-600 mb-2">♂ Male Range</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><label className="text-[10px] text-gray-400">Min</label><input type="number" step="any" value={vals.reference_range.male_min} onChange={(e) => updateParam("rr_male_min", e.target.value)} placeholder="—" className={numInp} /></div>
                <div className="space-y-1"><label className="text-[10px] text-gray-400">Max</label><input type="number" step="any" value={vals.reference_range.male_max} onChange={(e) => updateParam("rr_male_max", e.target.value)} placeholder="—" className={numInp} /></div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-red-50 shadow-sm">
              <p className="text-[10px] font-bold text-pink-600 mb-2">♀ Female Range</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><label className="text-[10px] text-gray-400">Min</label><input type="number" step="any" value={vals.reference_range.female_min} onChange={(e) => updateParam("rr_female_min", e.target.value)} placeholder="—" className={numInp} /></div>
                <div className="space-y-1"><label className="text-[10px] text-gray-400">Max</label><input type="number" step="any" value={vals.reference_range.female_max} onChange={(e) => updateParam("rr_female_max", e.target.value)} placeholder="—" className={numInp} /></div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-red-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">⊕ Custom Gender Ranges (e.g. Infant)</p>
              <button type="button" onClick={() => updateParam("rr_custom_ranges", [...(vals.reference_range.custom_ranges || []), { _k: Math.random().toString(), gender: "", min: "", max: "" }])} className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-100 transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>Add Custom</button>
            </div>
            {(vals.reference_range.custom_ranges || []).length === 0 ? (
              <p className="text-[10px] text-gray-400 italic">No custom gender ranges added.</p>
            ) : (
              <div className="space-y-2">
                {(vals.reference_range.custom_ranges || []).map((cr, crIdx) => (
                  <div key={cr._k || crIdx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white border border-red-100 rounded-lg p-2 shadow-sm">
                    <input type="text" value={cr.gender} onChange={(e) => { const updated = [...(vals.reference_range.custom_ranges || [])]; updated[crIdx] = { ...updated[crIdx], gender: e.target.value }; updateParam("rr_custom_ranges", updated); }} placeholder="Gender (e.g. Child)" className="flex-1 w-full sm:w-auto px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400" />
                    <input type="number" step="any" value={cr.min} onChange={(e) => { const updated = [...(vals.reference_range.custom_ranges || [])]; updated[crIdx] = { ...updated[crIdx], min: e.target.value }; updateParam("rr_custom_ranges", updated); }} placeholder="Min" className="w-20 md:w-24 flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400 font-mono text-right" />
                    <span className="text-xs text-gray-400 hidden sm:inline">to</span>
                    <input type="number" step="any" value={cr.max} onChange={(e) => { const updated = [...(vals.reference_range.custom_ranges || [])]; updated[crIdx] = { ...updated[crIdx], max: e.target.value }; updateParam("rr_custom_ranges", updated); }} placeholder="Max" className="w-20 md:w-24 flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400 font-mono text-right" />
                    <button type="button" onClick={() => updateParam("rr_custom_ranges", (vals.reference_range.custom_ranges || []).filter((_, i) => i !== crIdx))} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50 ml-auto"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
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
  disabledParams = {},
  onToggleDisableParam,
  onAddParamToPanel,
  onTrashParam,
}) {
  const gender = patientDetails?.gender || "Male";
  const panel = testTemplates?.find((t) => t.panel_id === panelId);

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
  const fields = useMemo(() => applyOrder(rawFields, savedOrder), [rawFields, savedOrder]);

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

  if (!panel) return null;

  return (
    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl transition-all duration-300 hover:shadow-md overflow-x-auto">
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
                  onClick={() => {
                    setNewName(panelName);
                    setIsEditingName(true);
                  }}
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
                onFocus={() => {
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
          <div className="hidden xl:grid xl:grid-cols-[24px_minmax(150px,1fr)_200px_140px_130px] gap-2 px-3 pb-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[700px]">
            <div />
            <div>Parameter</div>
            <div className="text-center">Result</div>
            <div className="text-right">Ref. Range</div>
            <div className="text-right">Actions</div>
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
              const isDisabled = disabledParams?.[panelId]?.includes(rawField.id);

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
                  className={`
                    group bg-white rounded-xl border p-3 py-2.5 transition-all
                    ${
                      isDragging
                        ? "opacity-50 border-red-300 shadow-md scale-95"
                        : isDragTarget
                          ? "border-red-500 bg-red-50 shadow-lg scale-102 z-10"
                          : "border-gray-200 hover:border-red-200 hover:shadow-md"
                    }
                    ${isDisabled ? "opacity-40 grayscale" : ""}
                  `}
                >
                  <div className="grid xl:grid-cols-[24px_minmax(150px,1fr)_200px_140px_130px] gap-2 items-center min-w-[700px] xl:min-w-0">
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
                    <div className="flex flex-col md:grid md:grid-cols-[1fr_auto] xl:contents gap-y-2 gap-x-4 min-w-0">
                      {/* Name */}
                      <div className="min-w-0 wrap-break-word">
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
                      <div className="flex items-center space-x-2 xl:mb-0">
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
                              className={`w-full md:w-28 xl:w-24 px-3 py-2 text-center rounded-lg bg-white border transition-all outline-none font-mono font-medium text-sm ${
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
                      <div className="md:col-span-2 xl:col-span-1 text-left xl:text-right border-t border-gray-50 xl:border-none pt-2 xl:pt-0">
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
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </button>

                      {/* Disable Param */}
                      <button
                        onClick={() => onToggleDisableParam(panelId, rawField.id)}
                        title={isDisabled ? "Enable parameter in report" : "Disable parameter in report"}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${
                          isDisabled
                            ? "text-blue-600 bg-blue-100"
                            : "text-gray-300 hover:text-blue-500 hover:bg-blue-50"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isDisabled ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          )}
                        </svg>
                      </button>

                      {/* Trash Param */}
                      <button
                        onClick={() => onTrashParam(panelId, panelName, rawField)}
                        title="Move parameter to trash"
                        className="p-1.5 rounded-lg transition-all shrink-0 text-gray-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Custom Parameter */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
              {editingId === "new_param" ? (
                <div className="w-full">
                  <NewCustomParamEditor
                    onSave={(newParam) => {
                      onAddParamToPanel(panelId, newParam);
                      closeEditor();
                    }}
                    onCancel={closeEditor}
                  />
                </div>
              ) : (
                <button
                  onClick={() => openEditor("new_param", "param")}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-transparent border-2 border-dashed border-gray-300 text-gray-500 hover:text-violet-600 hover:border-violet-400 hover:bg-violet-50 text-sm font-bold rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Custom Parameter
                </button>
              )}
            </div>

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
  onRemovePanel,
  disabledParams = {},
  onToggleDisableParam,
  onAddParamToPanel,
  onTrashParam,
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
          key={`${panelId}_${index}_${patientDetails.gender}`}
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
          isRemovable={true}
          onRemove={onRemovePanel || handleRemovePanel}
          editedPanelNames={editedPanelNames}
          testPrices={testPrices}
          onUpdatePrice={onUpdatePrice}
          disabledParams={disabledParams}
          onToggleDisableParam={onToggleDisableParam}
          onAddParamToPanel={onAddParamToPanel}
          onTrashParam={onTrashParam}
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
