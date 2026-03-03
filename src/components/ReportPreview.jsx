import { useState, useEffect, useRef } from "react";
import ReportTemplate from "./ReportTemplate";
import { generatePDF, PAGE_SIZES, getPageSizeString } from "../utils/generatePDF";

// ── Page layout presets ────────────────────────────────────────────────────────
const LAYOUTS = [
  { id: "a4",     label: "A4" },
  { id: "a5",     label: "A5" },
  { id: "letter", label: "Letter" },
  { id: "legal",  label: "Legal" },
  { id: "custom", label: "Custom" },
];

const ORIENTATIONS = [
  { id: "portrait",  label: "Portrait" },
  { id: "landscape", label: "Landscape" },
];

const selectCls =
  "px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 " +
  "focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all cursor-pointer";

// Toggle button — active style vs inactive
const toggleBtn = (active) =>
  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
    active
      ? "bg-red-600 border-red-600 text-white shadow-sm"
      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
  }`;

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
  const [pdfError,        setPdfError]        = useState(null);

  // The ref points to the wrapper div that contains <ReportTemplate />.
  // generatePDF grabs wrapper.firstElementChild to skip the scale transform.
  const reportWrapperRef = useRef(null);

  // ── Page layout ─────────────────────────────────────────────────────────────
  const [pageLayout, setPageLayout] = useState({
    format:       "a4",
    orientation:  "portrait",
    customWidth:  210,
    customHeight: 297,
    margins:      [10, 10, 10, 10],
  });
  const updateLayout = (patch) => setPageLayout((p) => ({ ...p, ...patch }));

  // ── Header / Footer visibility toggles ───────────────────────────────────
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (show) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  if (!show) return null;

  // ── Computed preview dimensions ──────────────────────────────────────────
  const sizes   = PAGE_SIZES[pageLayout.format] || PAGE_SIZES.a4;
  const pgW     = pageLayout.format === "custom" ? pageLayout.customWidth  : sizes.width;
  const pgH     = pageLayout.format === "custom" ? pageLayout.customHeight : sizes.height;
  const previewW = pageLayout.orientation === "portrait" ? pgW : pgH;
  const previewH = pageLayout.orientation === "portrait" ? pgH : pgW;

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!reportWrapperRef.current) return;
    setPdfError(null);
    setIsGeneratingPDF(true);
    await new Promise((r) => setTimeout(r, 50)); // let React paint the spinner

    const testName    = testTemplates.find((t) => t.panel_id === selectedTest)?.panel_name || selectedTest;
    const patientName = patientDetails.name || "Unknown";
    const dateStr     = new Date().toISOString().split("T")[0];
    const filename    = `${patientName}_${testName}_${dateStr}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, "_");

    try {
      await generatePDF(reportWrapperRef.current, {
        filename,
        format:       pageLayout.format,
        orientation:  pageLayout.orientation,
        customWidth:  pageLayout.customWidth,
        customHeight: pageLayout.customHeight,
        margins:      pageLayout.margins,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfError(`PDF failed: ${err.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const styleId = "dynamic-print-style";
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }
    el.textContent = `
      @page {
        size: ${getPageSizeString(pageLayout)};
        margin: ${pageLayout.margins.join("mm ")}mm;
      }
    `;
    window.print();
    setTimeout(() => el.remove(), 2000);
  };

  // ── Shared props for both preview and print-target ReportTemplate ────────
  const templateProps = {
    patientDetails,
    selectedTest,
    testData,
    testTemplates,
    editedRanges,
    editedParams,
    paramOrders,
    additionalPanels,
    showHeader,
    showFooter,
  };

  return (
    <>
      {/* ── Modal overlay (hidden on print) ─────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm print:hidden overflow-hidden">
        <div className="bg-white w-full sm:rounded-2xl sm:max-w-5xl sm:max-h-[92vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

          {/* ── Sticky toolbar ──────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0">
            <div className="flex flex-wrap items-center gap-2">

              {/* Title */}
              <div className="mr-auto">
                <h2 className="text-sm font-bold text-gray-800 leading-tight">Print Preview</h2>
                <p className="text-[10px] text-gray-400 hidden sm:block">Review before printing or saving</p>
              </div>

              {/* ── Header / Footer toggles ──────────────────────────── */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Show:</span>

                <button
                  className={toggleBtn(showHeader)}
                  onClick={() => setShowHeader((v) => !v)}
                  title={showHeader ? "Hide header" : "Show header"}
                >
                  {/* Header icon */}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="5" rx="1" strokeWidth="2" />
                    <line x1="3" y1="11" x2="21" y2="11" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>
                  Header
                </button>

                <button
                  className={toggleBtn(showFooter)}
                  onClick={() => setShowFooter((v) => !v)}
                  title={showFooter ? "Hide footer" : "Show footer"}
                >
                  {/* Footer icon */}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="3" y1="13" x2="21" y2="13" strokeWidth="2" strokeDasharray="3 2" />
                    <rect x="3" y="16" width="18" height="5" rx="1" strokeWidth="2" />
                  </svg>
                  Footer
                </button>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* ── Layout selector ─────────────────────────────────── */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Layout:</span>
                <select
                  className={selectCls}
                  value={pageLayout.format}
                  onChange={(e) => updateLayout({ format: e.target.value })}
                >
                  {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>

                <select
                  className={selectCls}
                  value={pageLayout.orientation}
                  onChange={(e) => updateLayout({ orientation: e.target.value })}
                >
                  {ORIENTATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>

                {pageLayout.format === "custom" && (
                  <>
                    <input type="number" min="50" max="1000"
                      value={pageLayout.customWidth}
                      onChange={(e) => updateLayout({ customWidth: Number(e.target.value) })}
                      className={`${selectCls} w-14 text-center font-mono`} title="Width (mm)" />
                    <span className="text-gray-400 text-xs">×</span>
                    <input type="number" min="50" max="1000"
                      value={pageLayout.customHeight}
                      onChange={(e) => updateLayout({ customHeight: Number(e.target.value) })}
                      className={`${selectCls} w-14 text-center font-mono`} title="Height (mm)" />
                    <span className="text-gray-400 text-[10px]">mm</span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* ── Actions ──────────────────────────────────────────── */}
              <div className="flex items-center gap-1.5">

                {/* Close */}
                <button
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded-lg text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>

                {/* Download PDF */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download as PDF"
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                {/* Print */}
                <button
                  onClick={handlePrint}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Print"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {pdfError && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                ⚠ {pdfError}
              </div>
            )}
          </div>

          {/* ── Scrollable preview area ─────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain bg-gray-100 p-4 sm:p-8 flex justify-center items-start"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/*
              reportWrapperRef wraps the ReportTemplate.
              generatePDF reads wrapper.firstElementChild to get the report root
              without the CSS transform:scale() that the wrapper may carry.
            */}
            <div
              ref={reportWrapperRef}
              className="shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
              style={{ width: `${previewW}mm` }}
            >
              <ReportTemplate {...templateProps} />
            </div>
          </div>

          {/* Mobile hint */}
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 text-center text-xs text-amber-600 font-medium sm:hidden shrink-0">
            💡 Use "Download PDF" to export this report
          </div>
        </div>
      </div>

      {/* ── Print-only hidden target ────────────────────────────────────── */}
      {/*
        This div is always present in the DOM but hidden on screen.
        On window.print(), index.css hides everything EXCEPT this div.
        It renders a second, independent ReportTemplate so there are no
        dimension constraints from the preview wrapper.
      */}
      <div id="report-print-target" className="hidden">
        <ReportTemplate {...templateProps} />
      </div>
    </>
  );
}
