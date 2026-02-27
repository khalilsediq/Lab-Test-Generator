import { useState } from "react";

const emptyParam = () => ({
  id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  abbreviation: "",
  unit: "",
  gender: "all",
  reference_range: { min: "", max: "" },
});

export default function CustomTestModal({ onSave, onClose }) {
  const [panelName, setPanelName] = useState("");
  const [params, setParams] = useState([emptyParam()]);
  const [error, setError] = useState("");

  const updateParam = (index, field, value) => {
    setParams((prev) =>
      prev.map((p, i) =>
        i === index
          ? field.startsWith("range_")
            ? {
                ...p,
                reference_range: {
                  ...p.reference_range,
                  [field === "range_min" ? "min" : "max"]:
                    value === "" ? null : parseFloat(value),
                },
              }
            : { ...p, [field]: value }
          : p,
      ),
    );
  };

  const addParam = () => setParams((prev) => [...prev, emptyParam()]);

  const removeParam = (index) => {
    if (params.length === 1) return;
    setParams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!panelName.trim()) {
      setError("Please enter a Panel Name.");
      return;
    }
    if (params.some((p) => !p.name.trim())) {
      setError("All parameters must have a name.");
      return;
    }

    const newPanel = {
      panel_id: `CUSTOM_${Date.now()}`,
      panel_name: panelName.trim(),
      description: "Custom test created in-app.",
      isCustom: true,
      parameters: params.map((p) => ({
        ...p,
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        reference_range: {
          min:
            p.reference_range.min === "" ? null : Number(p.reference_range.min),
          max:
            p.reference_range.max === "" ? null : Number(p.reference_range.max),
        },
      })),
    };

    onSave(newPanel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                Define a new panel and its parameters
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
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Panel Name */}
          <div className="space-y-2">
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
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none font-medium"
            />
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Parameters
              </span>
              <button
                onClick={addParam}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
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

            <div className="space-y-3">
              {params.map((param, index) => (
                <div
                  key={param.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Parameter {index + 1}
                    </span>
                    <button
                      onClick={() => removeParam(index)}
                      disabled={params.length === 1}
                      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) =>
                          updateParam(index, "name", e.target.value)
                        }
                        placeholder="e.g. Haemoglobin"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">
                        Abbreviation
                      </label>
                      <input
                        type="text"
                        value={param.abbreviation}
                        onChange={(e) =>
                          updateParam(index, "abbreviation", e.target.value)
                        }
                        placeholder="e.g. Hb"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={param.unit}
                        onChange={(e) =>
                          updateParam(index, "unit", e.target.value)
                        }
                        placeholder="e.g. g/dL"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">
                        Gender
                      </label>
                      <select
                        value={param.gender}
                        onChange={(e) =>
                          updateParam(index, "gender", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all text-gray-700"
                      >
                        <option value="all">All</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">
                        Min Range
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={param.reference_range.min ?? ""}
                        onChange={(e) =>
                          updateParam(index, "range_min", e.target.value)
                        }
                        placeholder="Leave blank if N/A"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">
                        Max Range
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={param.reference_range.max ?? ""}
                        onChange={(e) =>
                          updateParam(index, "range_max", e.target.value)
                        }
                        placeholder="Leave blank if N/A"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all font-mono"
                      />
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
