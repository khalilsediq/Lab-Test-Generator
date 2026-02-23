export default function ReportPreview({
  show,
  onClose,
  patientDetails,
  selectedTest,
  testData,
  testTemplates,
}) {
  if (!show) return null;

  const panel = testTemplates.find((t) => t.panel_id === selectedTest);

  const fields =
    panel?.parameters.filter(
      (p) =>
        p.gender === "all" || p.gender === patientDetails.gender.toLowerCase(),
    ) || [];

  const formatRange = (range) => {
    if (!range) return "-";
    if (range.max === null) return `> ${range.min}`;
    return `${range.min} - ${range.max}`;
  };

  const isValueAbnormal = (val, range) => {
    if (!val || !range) return false;
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return false;
    if (range.max === null) {
      return numVal < range.min;
    }
    return numVal < range.min || numVal > range.max;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Laboratory Report
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {panel?.panel_name || selectedTest}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* Patient Info */}
        <div className="p-8 grid grid-cols-2 gap-6 border-b border-gray-100 bg-white">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
              Patient Name
            </p>
            <p className="text-gray-800 font-medium">
              {patientDetails.name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
              MR Number
            </p>
            <p className="text-gray-800 font-medium font-mono">
              {patientDetails.mrNo || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
              Age / Gender
            </p>
            <p className="text-gray-800 font-medium">
              {patientDetails.age || "N/A"}{" "}
              {patientDetails.gender ? `/ ${patientDetails.gender}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
              Referred By
            </p>
            <p className="text-gray-800 font-medium">
              {patientDetails.consultant || "N/A"}
            </p>
          </div>
        </div>

        {/* Test Results */}
        <div className="p-8 flex-1 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 font-semibold text-gray-600 text-sm">
                  Investigation
                </th>
                <th className="py-3 font-semibold text-gray-600 text-sm">
                  Result
                </th>
                <th className="py-3 font-semibold text-gray-600 text-sm">
                  Reference Range
                </th>
                <th className="py-3 font-semibold text-gray-600 text-sm">
                  Unit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fields.map((field) => {
                const val = testData[field.id];
                const isAbnormal = isValueAbnormal(val, field.reference_range);
                return (
                  <tr
                    key={field.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 text-sm font-medium text-gray-700">
                      {field.name}
                    </td>
                    <td className="py-4 text-sm font-mono font-bold">
                      <span
                        className={
                          isAbnormal
                            ? "text-red-500 bg-red-50 px-2 py-1 rounded"
                            : "text-gray-900"
                        }
                      >
                        {val || "-"}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-mono text-gray-500">
                      {formatRange(field.reference_range)}
                    </td>
                    <td className="py-4 text-sm text-gray-500">{field.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
          <button className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              ></path>
            </svg>
            <span>Print Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
