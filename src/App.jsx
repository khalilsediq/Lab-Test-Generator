import { useState, useEffect } from "react";
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

// Detect if screen is mobile initially
const isMobileScreen = () => window.innerWidth < 768;

function App() {
  const [customTests, setCustomTests] = useState(() => load("customTests", []));
  const [editedRanges, setEditedRanges] = useState(() =>
    load("editedRanges", {}),
  );
  const [editedParams, setEditedParams] = useState(() =>
    load("editedParams", {}),
  );
  const [editedPanelNames, setEditedPanelNames] = useState(() =>
    load("editedPanelNames", {}),
  );
  const [paramOrders, setParamOrders] = useState(() => load("paramOrders", {}));
  const [showCustomModal, setShowCustomModal] = useState(false);
  // Sidebar: open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileScreen());
  const [sidebarWidth, setSidebarWidth] = useState(() => load("sidebarWidth", 288));
  const [isResizing, setIsResizing] = useState(false);

  const testTemplates = [...staticTemplates, ...customTests];

  const [selectedTest, setSelectedTest] = useState(testTemplates[0].panel_id);
  const [patientDetails, setPatientDetails] = useState({
    name: "",
    age: "",
    gender: "Male",
    mrNo: "",
    trId: "",
    trNo: "",
    consultant: "",
    fatherHusbandName: "",
    contactNo: "",
    address: "",
    reference: "",
    sampleLocation: "Collected In Lab",
    registrationLocation: "Lab data_Main",
    specimen: "Taken in lab",
    registrationDate: new Date()
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", ""),
  });

  const [testData, setTestData] = useState({});
  const [additionalPanels, setAdditionalPanels] = useState([]); // [{panelId, testData}]
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type }

  // Close sidebar on resize to mobile
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sidebar Resizing Logic
  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e) => {
      let newWidth = e.clientX;
      if (newWidth < 240) newWidth = 240;
      if (newWidth > 480) newWidth = 480;
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem("sidebarWidth", JSON.stringify(sidebarWidth));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const persist = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  const handleSaveCustomTest = (newPanel) => {
    const updated = [...customTests, newPanel];
    persist("customTests", updated, setCustomTests);
    setSelectedTest(newPanel.panel_id);
    showToast(`"${newPanel.panel_name}" added to sidebar`);
  };

  const handleDeleteCustomTest = (panelId) => {
    const panel = customTests.find((t) => t.panel_id === panelId);
    const updated = customTests.filter((t) => t.panel_id !== panelId);
    persist("customTests", updated, setCustomTests);
    if (selectedTest === panelId) setSelectedTest(testTemplates[0].panel_id);
    showToast(`"${panel?.panel_name}" deleted`, "error");
  };

  const handleDeleteAllCustomTests = () => {
    persist("customTests", [], setCustomTests);
    if (customTests.some((t) => t.panel_id === selectedTest)) {
      setSelectedTest(staticTemplates[0].panel_id);
    }
    showToast("All custom tests deleted", "error");
  };

  const handleSaveRange = (panelId, paramId, updatedRange) => {
    const updated = {
      ...editedRanges,
      [panelId]: { ...(editedRanges[panelId] || {}), [paramId]: updatedRange },
    };
    persist("editedRanges", updated, setEditedRanges);
    showToast("Reference range saved");
  };

  const handleResetRange = (panelId, paramId) => {
    const panelOverrides = { ...(editedRanges[panelId] || {}) };
    delete panelOverrides[paramId];
    const updated = { ...editedRanges, [panelId]: panelOverrides };
    persist("editedRanges", updated, setEditedRanges);
    showToast("Reference range reset to default");
  };

  const handleSaveParam = (panelId, paramId, updatedFields) => {
    const updated = {
      ...editedParams,
      [panelId]: {
        ...(editedParams[panelId] || {}),
        [paramId]: updatedFields,
      },
    };
    persist("editedParams", updated, setEditedParams);
    showToast("Parameter saved");
  };

  const handleResetParam = (panelId, paramId) => {
    const panelOverrides = { ...(editedParams[panelId] || {}) };
    delete panelOverrides[paramId];
    const updated = { ...editedParams, [panelId]: panelOverrides };
    persist("editedParams", updated, setEditedParams);
    showToast("Parameter reset to default");
  };

  const handleSavePanelName = (panelId, newName) => {
    const updated = {
      ...editedPanelNames,
      [panelId]: newName,
    };
    persist("editedPanelNames", updated, setEditedPanelNames);
    showToast("Panel name updated");
  };

  const handleResetPanelName = (panelId) => {
    const updated = { ...editedPanelNames };
    delete updated[panelId];
    persist("editedPanelNames", updated, setEditedPanelNames);
    showToast("Panel name reset to default");
  };

  const handleSaveOrder = (panelId, orderedIds) => {
    const updated = { ...paramOrders, [panelId]: orderedIds };
    persist("paramOrders", updated, setParamOrders);
    showToast("Row order saved");
  };

  // Close sidebar when test selected on mobile
  const handleSelectTest = (id) => {
    setSelectedTest(id);
    if (isMobileScreen()) setSidebarOpen(false);
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50 font-sans print:hidden relative overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
          className={`
          fixed inset-y-0 left-0 z-40 transition-[width,opacity,transform] duration-300 ease-in-out
          md:relative md:z-auto md:shrink-0 h-full overflow-hidden
          ${sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full md:translate-x-0 md:opacity-0 md:pointer-events-none"}
          ${isResizing ? "transition-none" : ""}
        `}
        >
          <div className="h-full" style={{ width: sidebarWidth }}>
            <Sidebar
              selectedTest={selectedTest}
              setSelectedTest={handleSelectTest}
              testTemplates={testTemplates}
              onCreateCustom={() => setShowCustomModal(true)}
              onDeleteCustom={handleDeleteCustomTest}
              onDeleteAllCustom={handleDeleteAllCustomTests}
              onClose={() => setSidebarOpen(false)}
              sidebarOpen={sidebarOpen}
              editedPanelNames={editedPanelNames}
            />
          </div>
        </div>

        {/* Resize Handle */}
        {sidebarOpen && (
          <div
            onMouseDown={() => setIsResizing(true)}
            className="hidden md:block absolute top-0 bottom-0 z-50 w-2 cursor-col-resize group transition-colors"
            style={{ left: sidebarWidth - 4 }}
          >
            <div className="h-full w-[2px] mx-auto bg-gray-800/50 group-hover:bg-red-500/50 transition-colors" />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* Top nav bar */}
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
              title="Open sidebar"
            >
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <span className="font-bold text-gray-800 text-sm">Bukhari Lab</span>
            <button
              onClick={() => setShowPreview(true)}
              className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Preview
            </button>
          </div>

          <div className="p-4 sm:p-6 md:p-10">
            <header className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    New Laboratory Report
                  </h1>
                  <p className="text-gray-500 mt-1.5 font-medium text-sm sm:text-base">
                    Fill in patient details and test results to generate a
                    printable report.
                  </p>
                </div>
                {/* Desktop sidebar toggle */}
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors text-xs font-semibold"
                  title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                  <span>{sidebarOpen ? "Hide" : "Show"} Panel</span>
                </button>
              </div>
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
              editedParams={editedParams}
              paramOrders={paramOrders}
              additionalPanels={additionalPanels}
              setAdditionalPanels={setAdditionalPanels}
              onSaveRange={handleSaveRange}
              onResetRange={handleResetRange}
              onSaveParam={handleSaveParam}
              onResetParam={handleResetParam}
              onSavePanelName={handleSavePanelName}
              onResetPanelName={handleResetPanelName}
              onSaveOrder={handleSaveOrder}
              editedPanelNames={editedPanelNames}
            />

            <div className="mt-8 flex justify-end max-w-4xl">
              <button
                onClick={() => setShowPreview(true)}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-xl shadow-red-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-500/40 active:translate-y-0 flex items-center justify-center space-x-3"
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
        editedParams={editedParams}
        paramOrders={paramOrders}
        additionalPanels={additionalPanels}
        editedPanelNames={editedPanelNames}
      />

      {showCustomModal && (
        <CustomTestModal
          onSave={handleSaveCustomTest}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-200 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "error" ? "bg-gray-800" : "bg-gray-900"
          }`}
        >
          {toast.type === "error" ? (
            <svg
              className="w-4 h-4 text-red-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-green-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}

export default App;
