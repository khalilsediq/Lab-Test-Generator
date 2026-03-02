import html2pdf from "html2pdf.js";
import ReportTemplate from "./ReportTemplate";

export default function ReportPreview({
  show,
  onClose,
  patientDetails,
  selectedTest,
  testData,
  testTemplates,
  editedRanges,
  editedParams,
  paramOrders,
  additionalPanels,
}) {
  if (!show) return null;

  const handleDownloadPDF = () => {
    // Select the printable area hidden in the DOM for printing
    const element = document.getElementById("report-print-target");
    if (!element) return;

    const testName =
      testTemplates.find((t) => t.panel_id === selectedTest)?.panel_name ||
      selectedTest;
    const patientName = patientDetails.name || "Unknown";
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${patientName}_${testName}_${dateStr}.pdf`.replace(
      /[^a-zA-Z0-9_\-.]/g,
      "_",
    );

    const opt = {
      margin: [5, 5, 5, 5],
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <>
      {/* ── Screen modal (hidden on print) ── */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm print:hidden">
        <div className="bg-white w-full sm:rounded-2xl sm:max-w-5xl sm:max-h-[92vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur shrink-0">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-gray-800">
                Print Preview
              </h2>
              <p className="text-xs text-gray-400 hidden sm:block mt-0.5">
                Review before printing or saving as PDF
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold transition-all active:scale-95 text-sm shadow-md"
                title="Download report as PDF file"
              >
                <span>⬇ Download PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/30 transition-all active:scale-95 text-sm"
                title="Print report"
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
                  />
                </svg>
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>

          {/* Scrollable preview area */}
          <div className="flex-1 overflow-y-auto bg-gray-200 p-3 sm:p-6 md:p-8 flex justify-center items-start">
            {/* Scale report to fit screen */}
            <div className="w-full flex justify-center">
              <div className="origin-top transform scale-[0.45] xs:scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100 transition-transform w-[210mm] shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.1)]">
                 <ReportTemplate
                  patientDetails={patientDetails}
                  selectedTest={selectedTest}
                  testData={testData}
                  testTemplates={testTemplates}
                  editedRanges={editedRanges}
                  editedParams={editedParams}
                  paramOrders={paramOrders}
                  additionalPanels={additionalPanels}
                />
              </div>
            </div>
          </div>

          {/* Mobile hint */}
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-2.5 text-center text-xs text-amber-600 font-medium sm:hidden shrink-0">
            💡 Tip: Use "⬇ Download PDF" to export this report
          </div>
        </div>
      </div>

      {/* ── Print target (100% of page, shown only when printing or generating PDF) ── */}
      <div id="report-print-target" className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-9999">
        <ReportTemplate
          patientDetails={patientDetails}
          selectedTest={selectedTest}
          testData={testData}
          testTemplates={testTemplates}
          editedRanges={editedRanges}
          editedParams={editedParams}
          paramOrders={paramOrders}
          additionalPanels={additionalPanels}
        />
      </div>
    </>
  );
}
