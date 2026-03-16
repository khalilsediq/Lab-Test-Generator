import { useState } from "react";

const CATEGORIES = [
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
  "🩸 Blood Bank",
  "Custom",
];

const emptyParam = () => ({
  _key: Math.random().toString(36).slice(2),
  name: "",
  abbreviation: "",
  unit: "",
  type: "numeric", // numeric | qualitative_select | text | subheading
  options: "", // comma separated options for qualitative_select
  gender_applicable: "all",
  reference_range: {
    general: "",
    male_min: "",
    male_max: "",
    female_min: "",
    female_max: "",
    custom_ranges: [], // [{gender: "Child", min: "", max: ""}]
  },
});

export default function CustomTestModal({ onSave, onClose }) {
  const [category, setCategory] = useState("");
  const [panelName, setPanelName] = useState("");
  const [panelPrice, setPanelPrice] = useState("");
  const [params, setParams] = useState([emptyParam()]);
  const [error, setError] = useState("");

  const updateParam = (key, field, val) =>
    setParams((prev) =>
      prev.map((p) => {
        if (p._key !== key) return p;
        if (field === "rr_custom_ranges") {
          return {
            ...p,
            reference_range: { ...p.reference_range, custom_ranges: val },
          };
        }
        if (field.startsWith("rr_")) {
          return {
            ...p,
            reference_range: { ...p.reference_range, [field.slice(3)]: val },
          };
        }
        return { ...p, [field]: val };
      }),
    );

  const addParam = () => setParams((p) => [...p, emptyParam()]);
  const removeParam = (key) =>
    setParams((p) => (p.length > 1 ? p.filter((x) => x._key !== key) : p));

  const handleSave = () => {
    let errs = [];
    if (!panelName.trim()) errs.push("Panel name is required.");

    params.forEach((p) => {
      if (!p.name.trim()) errs.push("All parameters must have a name.");
    });

    if (errs.length > 0) {
      setError(errs[0]);
      return;
    }

    const panelId = "CUSTOM_" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const toNum = (v) => (v === "" || v == null ? null : parseFloat(v));

    const finalParams = params.map((p, idx) => {
      const pId = panelId + "_PARAM_" + idx;
      
      let unitValue = p.unit;
      if (p.type === "qualitative_select") unitValue = "qualitative_select";
      if (p.type === "text") unitValue = "text_remark";
      if (p.type === "subheading") unitValue = "subheading";

      const rr = { ...p.reference_range };
      if (p.type === "qualitative_select") {
        rr.general = p.options?.trim() || "A Positive, B Positive, AB Positive, O Positive, A Negative, B Negative, AB Negative, O Negative";
      }

      // Filter out empty custom_ranges entries
      const custom_ranges = (rr.custom_ranges || []).filter(
        (cr) => cr.gender?.trim() && (cr.min !== "" || cr.max !== "")
      ).map(cr => ({
        gender: cr.gender.trim(),
        min: cr.min !== "" && cr.min != null ? parseFloat(cr.min) : null,
        max: cr.max !== "" && cr.max != null ? parseFloat(cr.max) : null,
      }));

      return {
        id: pId,
        name: p.name.trim(),
        abbreviation: p.abbreviation.trim(),
        unit: unitValue,
        gender_applicable: p.gender_applicable,
        reference_range: {
          general: rr.general || null,
          male_min: toNum(rr.male_min),
          male_max: toNum(rr.male_max),
          female_min: toNum(rr.female_min),
          female_max: toNum(rr.female_max),
          custom_ranges: custom_ranges.length > 0 ? custom_ranges : undefined,
        },
      };
    });

    onSave({
      panel_id: panelId,
      panel_name: panelName.trim(),
      category: category.trim() || "Custom",
      description: "Custom test created in-app.",
      isCustom: true,
      parameters: finalParams,
    }, panelPrice !== "" ? parseFloat(panelPrice) : undefined);
    
    onClose();
  };

  const inp =
    "w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all";
  const numInp = inp + " font-mono";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Create Custom Test
              </h2>
              <p className="text-xs text-gray-500">
                Define a new panel with its parameters and reference ranges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Panel info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inp + " text-gray-700"}
                >
                  <option value="">Select or type below…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Or type a new category…"
                className={inp + " mt-1"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Panel Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={panelName}
                onChange={(e) => {
                  setPanelName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Thyroid Stimulating Hormone"
                className={inp}
              />
            </div>
          </div>

          {/* Panel Price */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Panel Price (Rs.) <span className="text-gray-400 font-normal text-xs">— optional</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={panelPrice}
              onChange={(e) => setPanelPrice(e.target.value)}
              placeholder="e.g. 500"
              className={numInp + " w-48"}
            />
            <p className="text-[10px] text-gray-400 leading-relaxed">This price will be saved to the Test Prices database immediately upon creating the panel.</p>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Parameters
              </span>
              <button
                onClick={addParam}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Add Row</span>
              </button>
            </div>

            <div className="space-y-4">
              {params.map((param, idx) => (
                <div
                  key={param._key}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Parameter {idx + 1}
                    </span>
                    <button
                      onClick={() => removeParam(param._key)}
                      disabled={params.length === 1}
                      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Param Type
                      </label>
                      <select
                        value={param.type || "numeric"}
                        onChange={(e) => updateParam(param._key, "type", e.target.value)}
                        className={inp + " text-gray-700"}
                      >
                        <option value="numeric">Numerical Range</option>
                        <option value="qualitative_select">Dropdown (Blood Bank)</option>
                        <option value="text">Free Text / Remarks</option>
                        <option value="subheading">Section Subheading</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateParam(param._key, "name", e.target.value)}
                        placeholder={param.type === "subheading" ? "e.g. INFECTIOUS DISEASE SCREENING" : "e.g. Haemoglobin"}
                        className={inp}
                      />
                    </div>
                    
                    {param.type !== "subheading" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">
                          Abbrev
                        </label>
                        <input
                          type="text"
                          value={param.abbreviation}
                          onChange={(e) => updateParam(param._key, "abbreviation", e.target.value)}
                          placeholder="e.g. Hb"
                          className={inp}
                        />
                      </div>
                    )}

                    {param.type === "numeric" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={param.unit}
                          onChange={(e) => updateParam(param._key, "unit", e.target.value)}
                          placeholder="e.g. g/dL"
                          className={inp}
                        />
                      </div>
                    )}
                  </div>

                  {param.type === "qualitative_select" && (
                    <div className="space-y-1 mt-3">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Dropdown Options (comma separated)
                      </label>
                      <input
                        type="text"
                        value={param.options || ""}
                        onChange={(e) => updateParam(param._key, "options", e.target.value)}
                        placeholder="e.g. A Positive, B Positive, AB Positive"
                        className={inp}
                      />
                    </div>
                  )}

                  {param.type === "numeric" && (
                    <>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase">
                            Applies To
                          </label>
                          <select
                            value={param.gender_applicable}
                            onChange={(e) => updateParam(param._key, "gender_applicable", e.target.value)}
                            className={inp + " text-gray-700"}
                          >
                            <option value="all">All genders</option>
                            <option value="male">Male only</option>
                            <option value="female">Female only</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase">
                            General Reference Note
                          </label>
                          <input
                            type="text"
                            value={param.reference_range.general}
                            onChange={(e) => updateParam(param._key, "rr_general", e.target.value)}
                            placeholder="e.g. Negative / <5.7"
                            className={inp}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-[10px] font-bold text-blue-600 mb-2">♂ Male Range</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500">Min</label>
                              <input
                                type="number" step="any"
                                value={param.reference_range.male_min}
                                onChange={(e) => updateParam(param._key, "rr_male_min", e.target.value)}
                                placeholder="—" className={numInp}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500">Max</label>
                              <input
                                type="number" step="any"
                                value={param.reference_range.male_max}
                                onChange={(e) => updateParam(param._key, "rr_male_max", e.target.value)}
                                placeholder="—" className={numInp}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-pink-600 mb-2">♀ Female Range</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500">Min</label>
                              <input
                                type="number" step="any"
                                value={param.reference_range.female_min}
                                onChange={(e) => updateParam(param._key, "rr_female_min", e.target.value)}
                                placeholder="—" className={numInp}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500">Max</label>
                              <input
                                type="number" step="any"
                                value={param.reference_range.female_max}
                                onChange={(e) => updateParam(param._key, "rr_female_max", e.target.value)}
                                placeholder="—" className={numInp}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Custom Gender Ranges */}
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">⊕ Custom Gender Ranges</p>
                          <button
                            type="button"
                            onClick={() => {
                              const existing = param.reference_range.custom_ranges || [];
                              updateParam(param._key, "rr_custom_ranges", [
                                ...existing,
                                { _k: Math.random().toString(36).slice(2), gender: "", min: "", max: "" }
                              ]);
                            }}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-purple-50 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            Add Custom Gender
                          </button>
                        </div>
                        {(param.reference_range.custom_ranges || []).length === 0 ? (
                          <p className="text-[10px] text-gray-400 italic">No custom gender ranges. Click "Add Custom Gender" to add ranges for e.g. Child, Infant, Elderly.</p>
                        ) : (
                          <div className="space-y-2">
                            {(param.reference_range.custom_ranges || []).map((cr, crIdx) => (
                              <div key={cr._k || crIdx} className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg p-2">
                                <input
                                  type="text"
                                  value={cr.gender}
                                  onChange={(e) => {
                                    const updated = [...(param.reference_range.custom_ranges || [])];
                                    updated[crIdx] = { ...updated[crIdx], gender: e.target.value };
                                    updateParam(param._key, "rr_custom_ranges", updated);
                                  }}
                                  placeholder="Gender (e.g. Child)"
                                  className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                                />
                                <input
                                  type="number" step="any"
                                  value={cr.min}
                                  onChange={(e) => {
                                    const updated = [...(param.reference_range.custom_ranges || [])];
                                    updated[crIdx] = { ...updated[crIdx], min: e.target.value };
                                    updateParam(param._key, "rr_custom_ranges", updated);
                                  }}
                                  placeholder="Min"
                                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono text-right"
                                />
                                <span className="text-xs text-gray-400">to</span>
                                <input
                                  type="number" step="any"
                                  value={cr.max}
                                  onChange={(e) => {
                                    const updated = [...(param.reference_range.custom_ranges || [])];
                                    updated[crIdx] = { ...updated[crIdx], max: e.target.value };
                                    updateParam(param._key, "rr_custom_ranges", updated);
                                  }}
                                  placeholder="Max"
                                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono text-right"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (param.reference_range.custom_ranges || []).filter((_, i) => i !== crIdx);
                                    updateParam(param._key, "rr_custom_ranges", updated);
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium mt-4">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95"
          >
            Save Test Panel
          </button>
        </div>
      </div>
    </div>
  );
}
