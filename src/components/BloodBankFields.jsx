export default function BloodBankFields({
  panel,
  testData,
  setTestData,
  editedParams,
  paramOrders,
}) {
  const handleChange = (key, val) => {
    setTestData((prev) => ({ ...prev, [key]: val }));
  };

  const savedOrder = paramOrders?.[panel.panel_id];
  let fields = panel.parameters;
  if (savedOrder) {
    fields = [...fields].sort((a, b) => {
      const ai = savedOrder.indexOf(a.id);
      const bi = savedOrder.indexOf(b.id);
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  }

  return (
    <div className="space-y-4 pb-4">
      {fields.map((rawField) => {
        // Apply param overrides (if user customized name/abbrev in CustomTestModal they wouldn't use overrides but just in case)
        const paramOverride = editedParams?.[panel.panel_id]?.[rawField.id];
        const field = paramOverride ? { ...rawField, ...paramOverride } : rawField;

        const val = testData[field.id] || "";

        if (field.unit === "subheading") {
          return (
            <div key={field.id} className="pt-4 pb-1">
              <h3 className="text-sm font-bold text-red-700 uppercase tracking-widest border-b border-red-100 pb-1">
                {field.name}
              </h3>
            </div>
          );
        }

        if (field.unit === "text_remark") {
          return (
            <div key={field.id} className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">
                {field.name}
              </label>
              <textarea
                value={val}
                onChange={(e) => handleChange(field.id, e.target.value)}
                rows={3}
                placeholder="Enter remarks..."
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none resize-y"
              />
            </div>
          );
        }

        if (field.unit === "qualitative_select") {
          // parse options from reference_range.general
          const optionsList = field.reference_range?.general
            ? field.reference_range.general.split(",").map((s) => s.trim())
            : [];

          return (
            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 items-center">
              <div className="text-sm font-semibold text-gray-700">
                {field.name}
              </div>
              <select
                value={val}
                onChange={(e) => handleChange(field.id, e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none font-medium text-gray-800"
              >
                <option value="" disabled>-- Select Option --</option>
                {optionsList.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        // fallback generic input
        return (
          <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 items-center">
            <div className="text-sm font-semibold text-gray-700">
              {field.name}
            </div>
            <input
              type="text"
              value={val}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
            />
          </div>
        );
      })}
    </div>
  );
}
