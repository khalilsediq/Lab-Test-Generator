import { useState } from "react";
import Sidebar from "./components/Sidebar";
import PatientForm from "./components/PatientForm";
import TestFields from "./components/TestFields";
import ReportPreview from "./components/ReportPreview";
import CustomTestModal from "./components/CustomTestModal";
import staticTemplates from "./data/testTemplates.json";

const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

function App() {
  const [customTests, setCustomTests] = useState(() => load("customTests", []));
  const [editedRanges, setEditedRanges] = useState(() =>
    load("editedRanges", {}),
  );
  const [paramOrders, setParamOrders] = useState(() => load("paramOrders", {}));
  const [showCustomModal, setShowCustomModal] = useState(false);

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

  const persist = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  const handleSaveCustomTest = (newPanel) => {
    const updated = [...customTests, newPanel];
    persist("customTests", updated, setCustomTests);
    setSelectedTest(newPanel.panel_id);
  };

  const handleDeleteCustomTest = (panelId) => {
    const updated = customTests.filter((t) => t.panel_id !== panelId);
    persist("customTests", updated, setCustomTests);
    if (selectedTest === panelId) setSelectedTest(testTemplates[0].panel_id);
  };

  const handleSaveRange = (panelId, paramId, updatedRange) => {
    const updated = {
      ...editedRanges,
      [panelId]: { ...(editedRanges[panelId] || {}), [paramId]: updatedRange },
    };
    persist("editedRanges", updated, setEditedRanges);
  };

  const handleSaveOrder = (panelId, orderedIds) => {
    const updated = { ...paramOrders, [panelId]: orderedIds };
    persist("paramOrders", updated, setParamOrders);
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
            editedRanges={editedRanges}
            paramOrders={paramOrders}
            onSaveRange={handleSaveRange}
            onSaveOrder={handleSaveOrder}
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
        editedRanges={editedRanges}
        paramOrders={paramOrders}
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
