import ReportTemplate from "./ReportTemplate";

export default function ReportPreview({
  show,
  onClose,
  patientDetails,
  selectedTest,
  testData,
  testTemplates,
}) {
  if (!show) return null;

  return (
    <>
      {/* Screen Mode Modal (Hidden on Print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col relative">
          {/* Header Controls */}
          <div className="sticky top-0 z-10 p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/90 backdrop-blur">
            <h2 className="text-xl font-bold text-gray-800">Print Preview</h2>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-500/30 transition-all active:scale-95 flex items-center space-x-2"
                title="Use the Print dialog to Save as PDF"
              >
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  ></path>
                </svg>
                <span>Save PDF / Print</span>
              </button>
            </div>
          </div>

          {/* Scaled Down Preview Area */}
          <div className="p-8 bg-gray-200 flex justify-center items-start flex-1 overflow-auto">
            <div className="transform origin-top scale-75 md:scale-90 lg:scale-100 transition-transform w-[210mm] h-[297mm] flex-shrink-0 bg-white shadow-2xl">
              <ReportTemplate
                patientDetails={patientDetails}
                selectedTest={selectedTest}
                testData={testData}
                testTemplates={testTemplates}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Print Mode CSS Block (Hidden on Screen, occupies 100% of body on Print) */}
      <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-[9999]">
        <ReportTemplate
          patientDetails={patientDetails}
          selectedTest={selectedTest}
          testData={testData}
          testTemplates={testTemplates}
        />
      </div>
    </>
  );
}
