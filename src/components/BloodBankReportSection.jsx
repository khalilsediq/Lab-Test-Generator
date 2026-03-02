export default function BloodBankReportSection({
  panel,
  testData,
  gender,
  editedParams,
  paramOrders,
}) {
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
    <div className="w-full text-[10pt] print:text-[9pt] mt-1 space-y-4 print:space-y-3 pb-4">
      {fields.map((rawField) => {
        const paramOverride = editedParams?.[panel.panel_id]?.[rawField.id];
        const field = paramOverride ? { ...rawField, ...paramOverride } : rawField;
        const val = testData[field.id] || "";

        if (field.unit === "subheading") {
          return (
            <div key={field.id} className="pt-2">
              <h3 className="text-sm print:text-xs font-bold font-serif underline uppercase tracking-wider mb-1">
                {field.name}
              </h3>
            </div>
          );
        }

        if (field.unit === "text_remark") {
          return (
            <div key={field.id} className="mb-2">
              <span className="font-semibold">{field.name}: </span>
              <span className="font-normal whitespace-pre-line">{val}</span>
            </div>
          );
        }

        return (
          <div key={field.id} className="grid grid-cols-[200px_1fr] print:grid-cols-[150px_1fr] items-center gap-2 mb-1 border-b border-gray-100/50 pb-1">
            <div className="font-semibold">{field.name}</div>
            <div className="font-bold print:font-semibold">{val}</div>
          </div>
        );
      })}
    </div>
  );
}
