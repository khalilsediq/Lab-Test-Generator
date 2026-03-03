import { useState, useEffect, useRef } from "react";
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Ref pointing to the live visible ReportTemplate — it has real rendered dimensions
  const reportRef = useRef(null);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  if (!show) return null;

  const handleDownloadPDF = () => {
    // We capture #report-print-target structurally, but place it into a fresh,
    // isolated container to guarantee html2canvas reads the correct dimensions.
    // This bypasses all flex/scale/hidden layout context issues from the parent.
    const printTarget = document.getElementById("report-print-target");
    if (!printTarget) return;

    setIsGeneratingPDF(true);

    setTimeout(async () => {
      let container = null;
      try {
        container = document.createElement("div");
        Object.assign(container.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "794px", // Exact A4 width in px (96dpi)
          height: "1123px", // Exact A4 height in px
          zIndex: "-9999",
          opacity: "0",
          pointerEvents: "none",
          backgroundColor: "white",
        });

        // Clone the content and override Tailwind classes that might hide it
        const contentClone = printTarget.cloneNode(true);
        contentClone.classList.remove("hidden");
        contentClone.style.display = "block";
        contentClone.style.width = "794px";
        contentClone.style.minHeight = "1123px";

        container.appendChild(contentClone);
        document.body.appendChild(container);

        // Two rAF frames so the browser paints the new DOM
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));

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
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            width: 794,
            height: 1123,
            windowWidth: 794,
            windowHeight: 1123,
            onclone: (clonedDoc) => {
              // Nuke all traces of oklch/oklab from CSS to stop html2canvas crashing.
              // We must catch 'oklch(0 0 0)' AND variable definitions like 'oklch'.
              for (const style of clonedDoc.querySelectorAll("style")) {
                if (style.innerHTML && /ok(?:lch|lab)/.test(style.innerHTML)) {
                  let cssText = style.innerHTML;
                  cssText = cssText.replace(/oklch\([^)]+\)/g, "rgb(0,0,0)");
                  cssText = cssText.replace(/oklab\([^)]+\)/g, "rgb(0,0,0)");
                  cssText = cssText.replace(/oklch/g, "rgb");
                  cssText = cssText.replace(/oklab/g, "rgb");
                  style.innerHTML = cssText;
                }
              }
              for (const el of clonedDoc.querySelectorAll("[style]")) {
                const s = el.getAttribute("style");
                if (s && /ok(?:lch|lab)/.test(s)) {
                  let cssText = s;
                  cssText = cssText.replace(/oklch\([^)]+\)/g, "rgb(0,0,0)");
                  cssText = cssText.replace(/oklab\([^)]+\)/g, "rgb(0,0,0)");
                  cssText = cssText.replace(/oklch/g, "rgb");
                  cssText = cssText.replace(/oklab/g, "rgb");
                  el.setAttribute("style", cssText);
                }
              }
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };

        // FileSaver.js handles cross-platform Electron/Browser download safely
        await html2pdf().set(opt).from(container).save();
      } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Failed to generate PDF. Please try again.");
      } finally {
        setIsGeneratingPDF(false);
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }, 50);
  };

  return (
    <>
      {/* ── Screen modal (hidden on print) ── */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm print:hidden overflow-hidden">
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
                disabled={isGeneratingPDF}
                className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold transition-all active:scale-95 text-sm shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed disabled:active:scale-100"
                title="Download report as PDF file"
              >
                {isGeneratingPDF ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>⬇ Download PDF</span>
                )}
              </button>
              <button
                onClick={() => window.print()}
                disabled={isGeneratingPDF}
                className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/30 transition-all active:scale-95 text-sm disabled:bg-red-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
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
          <div
            className="flex-1 overflow-y-auto overscroll-contain bg-gray-200 p-3 sm:p-6 md:p-8 flex justify-center items-start"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Scale report to fit screen */}
            <div className="w-full flex justify-center">
              <div
                ref={reportRef}
                className="origin-top transform-gpu will-change-transform scale-[0.45] xs:scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100 transition-transform w-[210mm] shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.1)]"
              >
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
      <div
        id="report-print-target"
        className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-9999"
      >
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
