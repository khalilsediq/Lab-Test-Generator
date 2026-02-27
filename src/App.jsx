import { useState } from "react";
import Sidebar from "./components/Sidebar";
import PatientForm from "./components/PatientForm";
import TestFields from "./components/TestFields";
import ReportPreview from "./components/ReportPreview";
import CustomTestModal from "./components/CustomTestModal";

import staticTemplates from "./data/testTemplates.json";

// Merge static templates with any saved custom panels from localStorage
const loadCustomTests = () => {
  try {
    const saved = localStorage.getItem("customTests");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

function App() {
  const [customTests, setCustomTests] = useState(loadCustomTests);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // All panels visible to the app = static + custom
  const testTemplates = [...staticTemplates, ...customTests];

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

  const handleSaveCustomTest = (newPanel) => {
    const updated = [...customTests, newPanel];
    setCustomTests(updated);
    localStorage.setItem("customTests", JSON.stringify(updated));
    setSelectedTest(newPanel.panel_id);
  };

  const handleDeleteCustomTest = (panelId) => {
    const updated = customTests.filter((t) => t.panel_id !== panelId);
    setCustomTests(updated);
    localStorage.setItem("customTests", JSON.stringify(updated));
    // If deleted panel was selected, fall back to first panel
    if (selectedTest === panelId) {
      setSelectedTest(testTemplates[0].panel_id);
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 font-sans print:hidden">
        <Sidebar
          selectedTest={selectedTest}
          setSelectedTest={setSelectedTest}
          testTemplates={testTemplates}
          onCreateCustom={() => setShowCustomModal(true)}
          onDeleteCustom={handleDeleteCustomTest}
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
              className="px-8 py-4 bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-xl shadow-red-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-500/40 active:translate-y-0 flex items-center space-x-3"
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
                />
              </svg>
            </button>
          </div>
        </main>
      </div>

      <ReportPreview
        show={showPreview}
        onClose={() => setShowPreview(false)}
        patientDetails={patientDetails}
        selectedTest={selectedTest}
        testData={testData}
        testTemplates={testTemplates}
      />

      {showCustomModal && (
        <CustomTestModal
          onSave={handleSaveCustomTest}
          onClose={() => setShowCustomModal(false)}
        />
      )}
    </>
  );
}

export default App;
