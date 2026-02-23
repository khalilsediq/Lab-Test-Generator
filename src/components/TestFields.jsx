import { useEffect } from "react";

const testConfig = {
  cbc: [
    {
      key: "hemoglobin",
      label: "Hemoglobin",
      unit: "g/dL",
      normal: "13.0 - 17.0",
    },
    {
      key: "wbc",
      label: "White Blood Cells (WBC)",
      unit: "/cumm",
      normal: "4000 - 11000",
    },
    {
      key: "platelets",
      label: "Platelet Count",
      unit: "lakhs/cumm",
      normal: "1.5 - 4.5",
    },
    {
      key: "rbc",
      label: "Red Blood Cells (RBC)",
      unit: "millions/cumm",
      normal: "4.5 - 5.5",
    },
    { key: "hct", label: "Hematocrit (HCT)", unit: "%", normal: "40 - 50" },
  ],
  lft: [
    {
      key: "bilirubin_total",
      label: "Bilirubin Total",
      unit: "mg/dL",
      normal: "0.3 - 1.2",
    },
    { key: "sgpt", label: "SGPT (ALT)", unit: "U/L", normal: "7 - 56" },
    { key: "sgot", label: "SGOT (AST)", unit: "U/L", normal: "5 - 40" },
    {
      key: "alk_phos",
      label: "Alkaline Phosphatase",
      unit: "IU/L",
      normal: "44 - 147",
    },
    {
      key: "protein_total",
      label: "Total Protein",
      unit: "g/dL",
      normal: "6.0 - 8.3",
    },
  ],
  rft: [
    { key: "urea", label: "Blood Urea", unit: "mg/dL", normal: "15 - 40" },
    {
      key: "creatinine",
      label: "Serum Creatinine",
      unit: "mg/dL",
      normal: "0.6 - 1.2",
    },
    {
      key: "uric_acid",
      label: "Uric Acid",
      unit: "mg/dL",
      normal: "3.4 - 7.0",
    },
    { key: "sodium", label: "Sodium (Na)", unit: "mEq/L", normal: "135 - 145" },
    {
      key: "potassium",
      label: "Potassium (K)",
      unit: "mEq/L",
      normal: "3.5 - 5.0",
    },
  ],
};

const testNames = {
  cbc: "Complete Blood Count (CBC)",
  lft: "Liver Function Test (LFT)",
  rft: "Renal Function Test (RFT)",
};

export default function TestFields({ selectedTest, testData, setTestData }) {
  const fields = testConfig[selectedTest] || [];

  // Clear other test data when switching tests
  useEffect(() => {
    setTestData({});
  }, [selectedTest, setTestData]);

  const handleChange = (e, key) => {
    setTestData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col space-y-1 mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Test Entry</h2>
        </div>
        <p className="text-sm font-medium text-blue-600 ml-11">
          {testNames[selectedTest]}
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex flex-col md:flex-row md:items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
          >
            <div className="md:w-1/3 text-sm font-semibold text-gray-700 mb-2 md:mb-0">
              {field.label}
            </div>
            <div className="md:w-1/3 flex items-center space-x-3 px-2">
              <input
                type="number"
                step="any"
                value={testData[field.key] || ""}
                onChange={(e) => handleChange(e, field.key)}
                className="w-full md:w-32 px-4 py-2 text-center rounded-lg bg-white border border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-mono font-medium"
              />
              <span className="text-xs text-gray-500 w-16">{field.unit}</span>
            </div>
            <div className="md:w-1/3 text-xs text-gray-400 mt-2 md:mt-0 flex flex-col items-start md:items-end">
              <span>Normal Range:</span>
              <span className="font-mono">
                {field.normal} {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
