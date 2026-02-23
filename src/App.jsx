import { useState } from "react";
import Sidebar from "./components/Sidebar";
import PatientForm from "./components/PatientForm";
import TestFields from "./components/TestFields";
import ReportPreview from "./components/ReportPreview";

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

function App() {
  const [selectedTest, setSelectedTest] = useState("cbc");
  const [patientDetails, setPatientDetails] = useState({
    name: "",
    age: "",
    gender: "Male",
    mrNo: "",
    consultant: "",
  });
  const [testData, setTestData] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar selectedTest={selectedTest} setSelectedTest={setSelectedTest} />

      <main className="flex-1 p-10 overflow-y-auto w-full relative">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            New Laboratory Report
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Fill in the patient details and test results below to generate a
            printable report.
          </p>
        </header>

        <PatientForm
          patientDetails={patientDetails}
          setPatientDetails={setPatientDetails}
        />

        <TestFields
          selectedTest={selectedTest}
          testData={testData}
          setTestData={setTestData}
        />

        <div className="mt-8 flex justify-end max-w-4xl">
          <button
            onClick={() => setShowPreview(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/40 active:translate-y-0 flex items-center space-x-3"
          >
            <span>Generate Report</span>
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
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              ></path>
            </svg>
          </button>
        </div>
      </main>

      <ReportPreview
        show={showPreview}
        onClose={() => setShowPreview(false)}
        patientDetails={patientDetails}
        selectedTest={selectedTest}
        testData={testData}
        testConfig={testConfig}
      />
    </div>
  );
}

export default App;
