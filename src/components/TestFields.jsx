import { useEffect, useState } from "react";

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

const formatRange = (rr, gender) => {
  if (!rr) return "—";
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
  const [minKey, maxKey] =
    gender === "Male" ? ["male_min", "male_max"] : ["female_min", "female_max"];
  const mn = rr[minKey],
    mx = rr[maxKey];
  if (mn !== null && mx === null) return n < mn;
  if (mn === null && mx !== null) return n > mx;
  if (mn !== null && mx !== null) return n < mn || n > mx;
  return false;
};

// ── EditRow ──────────────────────────────────────────────────────────────────

function EditRow({ param, editedRanges, panelId, onSave, onCancel }) {
  const base = effectiveRange(param, editedRanges, panelId);
  const qual = isQual(param);
  const [vals, setVals] = useState({
    general: base.general ?? "",
    male_min: base.male_min ?? "",
    male_max: base.male_max ?? "",
    female_min: base.female_min ?? "",
    female_max: base.female_max ?? "",
  });
  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const toNum = (v) => (v === "" ? null : parseFloat(v));

  const handleSave = () =>
    onSave(param.id, {
      general: vals.general || null,
      male_min: toNum(vals.male_min),
      male_max: toNum(vals.male_max),
      female_min: toNum(vals.female_min),
      female_max: toNum(vals.female_max),
    });

  const inp =
    "w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none font-mono";

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
        </div>
      )}
    </div>
  );
}

// ── TestFields ───────────────────────────────────────────────────────────────

export default function TestFields({
  selectedTest,
  testData,
  setTestData,
  patientDetails,
  testTemplates,
  editedRanges,
  paramOrders,
  onSaveRange,
  onSaveOrder,
}) {
  const gender = patientDetails.gender;
  const panel = testTemplates.find((t) => t.panel_id === selectedTest);

  const rawFields =
    panel?.parameters.filter(
      (p) =>
        p.gender_applicable === "all" ||
        p.gender_applicable === gender.toLowerCase(),
    ) || [];

  // Apply saved order
  const savedOrder = paramOrders?.[selectedTest];
  const [fields, setFields] = useState(() => applyOrder(rawFields, savedOrder));

  const [editingId, setEditingId] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

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

  useEffect(() => {
    setTestData({});
    setEditingId(null);
  }, [selectedTest, setTestData]);

  useEffect(() => {
    setFields(applyOrder(rawFields, paramOrders?.[selectedTest]));
  }, [selectedTest, gender]);

  const handleChange = (key, val) =>
    setTestData((prev) => ({ ...prev, [key]: val }));

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
      selectedTest,
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
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-600"
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
        <div className="ml-11 flex items-center space-x-3">
          <p className="text-sm font-medium text-red-600">
            {panel?.panel_name || selectedTest}
          </p>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gender === "Male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}
          >
            {gender === "Male" ? "♂ Male" : "♀ Female"} ranges shown
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[24px_1fr_180px_180px_32px] gap-2 px-3 pb-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <div />
        <div>Parameter</div>
        <div className="text-center">Result</div>
        <div className="text-right">Ref. Range</div>
        <div />
      </div>

      <div className="space-y-1 mt-2">
        {fields.map((field, idx) => {
          const rr = effectiveRange(field, editedRanges, selectedTest);
          const qual = isQual(field);
          const abn = isAbnormal(testData[field.id], rr, gender, qual);
          const isDragging = dragFrom === idx;
          const isDragTarget = dragOver === idx && dragFrom !== idx;

          if (editingId === field.id) {
            return (
              <EditRow
                key={field.id}
                param={field}
                editedRanges={editedRanges}
                panelId={selectedTest}
                onSave={(id, range) => {
                  onSaveRange(selectedTest, id, range);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <div
              key={field.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={onDragEnd}
              className={`grid grid-cols-[24px_1fr_180px_180px_32px] gap-2 items-center px-3 py-2.5 rounded-xl border transition-all ${
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

              {/* Name */}
              <div className="min-w-0">
                <span className="text-sm font-semibold text-gray-700">
                  {field.name}
                </span>
                {field.abbreviation && (
                  <span className="ml-1.5 text-[11px] text-gray-400 font-mono">
                    ({field.abbreviation})
                  </span>
                )}
              </div>

              {/* Input */}
              <div className="flex items-center space-x-2">
                {qual ? (
                  <input
                    type="text"
                    value={testData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder="e.g. Negative"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                  />
                ) : (
                  <>
                    <input
                      type="number"
                      step="any"
                      value={testData[field.id] || ""}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className={`w-24 px-3 py-2 text-center rounded-lg bg-white border transition-all outline-none font-mono font-medium text-sm ${
                        abn
                          ? "border-red-400 text-red-700 bg-red-50 focus:ring-red-500/20"
                          : "border-gray-300 focus:border-red-500 focus:ring-red-500/10"
                      } focus:ring-4`}
                    />
                    <span className="text-[11px] text-gray-500 leading-tight">
                      {field.unit}
                    </span>
                  </>
                )}
              </div>

              {/* Range */}
              <div className="text-right">
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

              {/* Edit button */}
              <button
                onClick={() => setEditingId(field.id)}
                title="Edit reference range"
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
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
          );
        })}

        {fields.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No parameters found for this test and gender selection.
          </div>
        )}
      </div>
    </div>
  );
}
