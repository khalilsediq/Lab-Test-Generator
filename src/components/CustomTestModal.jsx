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
  "Custom",
];

const emptyParam = () => ({
  _key: Math.random().toString(36).slice(2),
  name: "",
  abbreviation: "",
  unit: "",
  gender_applicable: "all",
  reference_range: {
    general: "",
    male_min: "",
    male_max: "",
    female_min: "",
    female_max: "",
  },
});

export default function CustomTestModal({ onSave, onClose }) {
  const [category, setCategory] = useState("");
  const [panelName, setPanelName] = useState("");
  const [params, setParams] = useState([emptyParam()]);
  const [error, setError] = useState("");

  const updateParam = (key, field, val) =>
    setParams((prev) =>
      prev.map((p) => {
        if (p._key !== key) return p;
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
    if (!panelName.trim()) {
      setError("Panel name is required.");
      return;
    }
    if (params.some((p) => !p.name.trim())) {
      setError("Every parameter needs a name.");
      return;
    }

    const toNum = (v) => (v === "" || v == null ? null : parseFloat(v));

    onSave({
      panel_id: `CUSTOM_${Date.now()}`,
      panel_name: panelName.trim(),
      category: category.trim() || "Custom",
      description: "Custom test created in-app.",
      isCustom: true,
      parameters: params.map((p) => ({
        id: `CUST_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: p.name.trim(),
        abbreviation: p.abbreviation.trim(),
        unit: p.unit.trim(),
        gender_applicable: p.gender_applicable,
        reference_range: {
          general: p.reference_range.general || null,
          male_min: toNum(p.reference_range.male_min),
          male_max: toNum(p.reference_range.male_max),
          female_min: toNum(p.reference_range.female_min),
          female_max: toNum(p.reference_range.female_max),
        },
      })),
    });
    onClose();
  };

  const inp =
    "w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all";
  const numInp = inp + " font-mono";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
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

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) =>
                          updateParam(param._key, "name", e.target.value)
                        }
                        placeholder="e.g. Haemoglobin"
                        className={inp}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Abbreviation
                      </label>
                      <input
                        type="text"
                        value={param.abbreviation}
                        onChange={(e) =>
                          updateParam(
                            param._key,
                            "abbreviation",
                            e.target.value,
                          )
                        }
                        placeholder="e.g. Hb"
                        className={inp}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={param.unit}
                        onChange={(e) =>
                          updateParam(param._key, "unit", e.target.value)
                        }
                        placeholder="e.g. g/dL"
                        className={inp}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">
                        Applies To
                      </label>
                      <select
                        value={param.gender_applicable}
                        onChange={(e) =>
                          updateParam(
                            param._key,
                            "gender_applicable",
                            e.target.value,
                          )
                        }
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
                        onChange={(e) =>
                          updateParam(param._key, "rr_general", e.target.value)
                        }
                        placeholder="e.g. Negative / <5.7"
                        className={inp}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 mb-2">
                        ♂ Male Range
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">
                            Min
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={param.reference_range.male_min}
                            onChange={(e) =>
                              updateParam(
                                param._key,
                                "rr_male_min",
                                e.target.value,
                              )
                            }
                            placeholder="—"
                            className={numInp}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">
                            Max
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={param.reference_range.male_max}
                            onChange={(e) =>
                              updateParam(
                                param._key,
                                "rr_male_max",
                                e.target.value,
                              )
                            }
                            placeholder="—"
                            className={numInp}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-pink-600 mb-2">
                        ♀ Female Range
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">
                            Min
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={param.reference_range.female_min}
                            onChange={(e) =>
                              updateParam(
                                param._key,
                                "rr_female_min",
                                e.target.value,
                              )
                            }
                            placeholder="—"
                            className={numInp}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">
                            Max
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={param.reference_range.female_max}
                            onChange={(e) =>
                              updateParam(
                                param._key,
                                "rr_female_max",
                                e.target.value,
                              )
                            }
                            placeholder="—"
                            className={numInp}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium">
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
