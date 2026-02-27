import { useEffect } from "react";

export default function TestFields({
  selectedTest,
  testData,
  setTestData,
  patientDetails,
  testTemplates,
}) {
  const panel = testTemplates.find((t) => t.panel_id === selectedTest);

  const fields =
    panel?.parameters.filter(
      (p) =>
        p.gender === "all" || p.gender === patientDetails.gender.toLowerCase(),
    ) || [];

  // Clear test data when switching tests
  useEffect(() => {
    setTestData({});
  }, [selectedTest, setTestData]);

  const handleChange = (e, key) => {
    setTestData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const formatRange = (range) => {
    if (!range || (range.min === null && range.max === null))
      return "See report";
    if (range.min !== null && range.max === null) return `≥ ${range.min}`;
    if (range.min === null && range.max !== null) return `< ${range.max}`;
    return `${range.min} – ${range.max}`;
  };

  const isQualitative = (field) =>
    field.unit === "qualitative" ||
    field.unit === "semiquantitative" ||
    field.unit === "titre" ||
    (field.reference_range?.min === null &&
      field.reference_range?.max === null);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col space-y-1 mb-8">
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
        <p className="text-sm font-medium text-red-600 ml-11">
          {panel?.panel_name || selectedTest}
        </p>
      </div>

      <div className="space-y-2">
        {/* Column Headers */}
        <div className="flex items-center px-3 pb-2 border-b border-gray-100">
          <div className="w-1/3 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Parameter
          </div>
          <div className="w-1/3 text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
            Result
          </div>
          <div className="w-1/3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
            Reference Range
          </div>
        </div>

        {fields.map((field) => (
          <div
            key={field.id}
            className="flex flex-col md:flex-row md:items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
          >
            <div className="md:w-1/3 mb-2 md:mb-0">
              <span className="text-sm font-semibold text-gray-700">
                {field.name}
              </span>
              {field.abbreviation && (
                <span className="ml-1.5 text-xs text-gray-400 font-mono">
                  ({field.abbreviation})
                </span>
              )}
            </div>

            <div className="md:w-1/3 flex items-center space-x-3 px-2">
              {isQualitative(field) ? (
                /* Qualitative → text input (Positive / Negative / Reactive etc.) */
                <input
                  type="text"
                  value={testData[field.id] || ""}
                  onChange={(e) => handleChange(e, field.id)}
                  placeholder="e.g. Negative"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                />
              ) : (
                /* Quantitative → number input */
                <>
                  <input
                    type="number"
                    step="any"
                    value={testData[field.id] || ""}
                    onChange={(e) => handleChange(e, field.id)}
                    className="w-full md:w-32 px-4 py-2 text-center rounded-lg bg-white border border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none font-mono font-medium"
                  />
                  <span className="text-xs text-gray-500 w-16 shrink-0">
                    {field.unit}
                  </span>
                </>
              )}
            </div>

            <div className="md:w-1/3 text-xs text-gray-400 mt-2 md:mt-0 flex flex-col items-start md:items-end">
              <span>Normal Range:</span>
              <span className="font-mono text-gray-500">
                {formatRange(field.reference_range)}{" "}
                {!isQualitative(field) ? field.unit : ""}
              </span>
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No parameters found for the selected test and gender.
          </div>
        )}
      </div>
    </div>
  );
}
