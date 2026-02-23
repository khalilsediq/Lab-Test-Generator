import { useState } from "react";
import Sidebar from "./components/Sidebar";
import PatientForm from "./components/PatientForm";
import TestFields from "./components/TestFields";
import ReportPreview from "./components/ReportPreview";

import testTemplates from "./data/testTemplates.json";

function App() {
  const [selectedTest, setSelectedTest] = useState(testTemplates[0].panel_id);
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
      <Sidebar
        selectedTest={selectedTest}
        setSelectedTest={setSelectedTest}
        testTemplates={testTemplates}
      />

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
          patientDetails={patientDetails}
          testTemplates={testTemplates}
        />

        <div className="mt-8 flex justify-end max-w-4xl">
          <button
            onClick={() => setShowPreview(true)}
            className="px-8 py-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/40 active:translate-y-0 flex items-center space-x-3"
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
        testTemplates={testTemplates}
      />
    </div>
  );
}

export default App;
