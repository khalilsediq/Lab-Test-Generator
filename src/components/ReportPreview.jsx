import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ReportTemplate, { DENSITY_LEVELS, DENSITY_CONFIG } from "./ReportTemplate";
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

const toggleBtn = (active) =>
  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
    active
      ? "bg-red-600 border-red-600 text-white shadow-sm"
      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
  }`;

const DENSITY_COLORS = {
  comfortable: "bg-emerald-100 text-emerald-700 border-emerald-200",
  compact:     "bg-amber-100  text-amber-700  border-amber-200",
  condensed:   "bg-red-100    text-red-700    border-red-200",
};

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
  editedPanelNames = {},
  disabledParams = {},
}) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError,        setPdfError]        = useState(null);

  // reportWrapperRef wraps the visible <ReportTemplate />.
  // generatePDF.js reads wrapper.firstElementChild to get the A4 root div.
  const reportWrapperRef = useRef(null);

  // ── Page layout ────────────────────────────────────────────────────────────
  const [pageLayout, setPageLayout] = useState({
    format:       "a4",
    orientation:  "portrait",
    customWidth:  210,
    customHeight: 297,
    margins:      [10, 10, 10, 10],
  });
  const updateLayout = (patch) => setPageLayout((p) => ({ ...p, ...patch }));

  // ── Header / Footer toggles ───────────────────────────────────────────────
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  // ── Density & Page Count (Feature 1 & 2) ─────────────────────────────────
  // "auto" means the system decides; we track both the auto-selected level
  // and whether the user has overridden it manually.
  const [density,     setDensity]     = useState("comfortable");
  const [densityAuto, setDensityAuto] = useState(true); // true = auto mode
  const [pageCount,   setPageCount]   = useState(1);

  // Manual cycle: clicking the density badge cycles through levels manually
  const cycleDensity = () => {
    setDensityAuto(false);
    setDensity((d) => {
      const idx = DENSITY_LEVELS.indexOf(d);
      return DENSITY_LEVELS[(idx + 1) % DENSITY_LEVELS.length];
    });
  };

  // Reset to auto when layout changes
  useEffect(() => {
    setDensityAuto(true);
  }, [pageLayout.format, pageLayout.orientation, pageLayout.customWidth, pageLayout.customHeight]);

  // ── Auto-density measurement (Feature 2) ─────────────────────────────────
  // After every render, measure the content height vs the available page height.
  // If content overflows, step down to the next density level.
  const measureAndSetDensity = useCallback(() => {
    if (!densityAuto || !reportWrapperRef.current) return;

    const sizes  = PAGE_SIZES[pageLayout.format] || PAGE_SIZES.a4;
    const pgH    = pageLayout.format === "custom"
      ? pageLayout.customHeight
      : sizes.height;
    const pgW    = pageLayout.format === "custom"
      ? pageLayout.customWidth
      : sizes.width;
    const pageH  = pageLayout.orientation === "portrait" ? pgH : pgW;

    // Convert mm → px at screen resolution (~96dpi)
    const mmToPx = (mm) => (mm * 96) / 25.4;
    const pageHeightPx = mmToPx(pageH);

    // Measure the actual rendered height of the report root (A4 div)
    const reportRoot = reportWrapperRef.current.firstElementChild;
    if (!reportRoot) return;

    const contentH = reportRoot.scrollHeight;

    // Feature 1: Calculate realistic page count
    // A normal page has margins and header/footer space.
    const estimatedUsableRatio = 0.85; 
    const usablePagePx = pageHeightPx * estimatedUsableRatio;
    const count = Math.max(1, Math.ceil(contentH / usablePagePx));
    setPageCount(count);

    if (!densityAuto) return;

    let chosen = "comfortable";
    if (contentH <= pageHeightPx) {
      chosen = "comfortable";
    } else {
      // Try each level until content fits
      for (const level of DENSITY_LEVELS) {
        chosen = level;
        // We can't re-render at a different density here synchronously,
        // so we just pick progressively tighter levels based on overflow ratio
        const overflowRatio = contentH / pageHeightPx;
        if (level === "comfortable" && overflowRatio <= 1.0) break;
        if (level === "compact"     && overflowRatio <= 1.15) break;
        // condensed: accept anything, it's the minimum
        if (level === "condensed") break;
      }
    }

    setDensity((prev) => (prev !== chosen ? chosen : prev));
  }, [densityAuto, pageLayout]);

  // Run measurement after every render (debounced via rAF)
  useEffect(() => {
    if (!show) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(measureAndSetDensity);
    });
    return () => cancelAnimationFrame(id);
  });

  // Lock body scroll
  useEffect(() => {
    if (show) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  if (!show) return null;

  // ── Computed preview dimensions ───────────────────────────────────────────
  const sizes    = PAGE_SIZES[pageLayout.format] || PAGE_SIZES.a4;
  const pgW      = pageLayout.format === "custom" ? pageLayout.customWidth  : sizes.width;
  const pgH      = pageLayout.format === "custom" ? pageLayout.customHeight : sizes.height;
  const previewW = pageLayout.orientation === "portrait" ? pgW : pgH;

  // ── Shared Print/PDF DOM Setup ───────────────────────────────────────────
  const withPrintSetup = async (actionFn) => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "visible";

    // Sync the CSS variable used by the header spacer div
    const stampZone = document.getElementById("report-stamp-zone");
    if (stampZone) {
      document.documentElement.style.setProperty("--print-header-h", `${stampZone.offsetHeight}px`);
    }

    // ── Safe DOM-Injection Pagination for Native Print ────────────────────────
    const printTarget = document.getElementById("report-print-target");
    const previewRoot = reportWrapperRef.current;

    // Clear previously injected spacers
    if (printTarget) {
      printTarget.querySelectorAll(".js-print-spacer").forEach(e => e.remove());
    }

    if (printTarget && previewRoot) {
      // Expose footer height as CSS var for dynamic padding-bottom
      const previewFooter = previewRoot.querySelector(".report-footer");
      const footerHpx     = previewFooter ? previewFooter.getBoundingClientRect().height : 80;
      const footerHmm     = Math.ceil((footerHpx * 25.4) / 96) + 6;
      document.documentElement.style.setProperty("--print-footer-h", `${footerHmm}mm`);

      const stampZoneParent = previewRoot.querySelector("#report-stamp-zone");
      const headerHpx = stampZoneParent ? stampZoneParent.offsetHeight : 170;

      const previewPanels = Array.from(previewRoot.querySelectorAll(".panel-container"));
      const printPanels   = Array.from(printTarget.querySelectorAll(".panel-container"));

      if (previewPanels.length > 0 && previewPanels.length === printPanels.length) {
        // Page math (A4 default: 297mm height)
        const currentSizes    = PAGE_SIZES[pageLayout.format] || PAGE_SIZES.a4;
        const pgH      = pageLayout.format === "custom" ? pageLayout.customHeight : currentSizes.height;
        const pgW      = pageLayout.format === "custom" ? pageLayout.customWidth : currentSizes.width;
        const pageH    = pageLayout.orientation === "portrait" ? pgH : pgW;
        
        // Convert to px assuming 96dpi
        const topMpx   = (pageLayout.margins[0] * 96) / 25.4;
        const botMpx   = (pageLayout.margins[2] * 96) / 25.4;
        const pageHpx  = (pageH * 96) / 25.4;
        
        const usableHpx = pageHpx - topMpx - botMpx - footerHpx;

        // Start counting page height usage
        let usedHpx = headerHpx;

        previewPanels.forEach((pre, idx) => {
          const pnl    = printPanels[idx];
          
          // Accounts for margins missing from getBoundingClientRect
          const style  = window.getComputedStyle(pre);
          const mt     = parseFloat(style.marginTop) || 0;
          const mb     = parseFloat(style.marginBottom) || 0;
          
          // Adds a safety buffer so JS breaks the page conservatively
          const SAFE_BUFFER = 15;
          const panelH = pre.getBoundingClientRect().height + mt + mb;
          
          if (usedHpx > headerHpx && usedHpx + panelH + SAFE_BUFFER > usableHpx) {
            const spacer = document.createElement("div");
            spacer.className = "js-print-spacer screen-only";
            spacer.style.pageBreakBefore = "always";
            spacer.style.breakBefore = "page";
            spacer.style.height = headerHpx + "px";
            spacer.style.width = "100%";
            pnl.parentNode.insertBefore(spacer, pnl);
            
            usedHpx = headerHpx + panelH;
            
            // Failsafe if panel spans MULTIPLE pages
            while (usedHpx > usableHpx) {
              usedHpx -= (usableHpx - headerHpx);
            }
          } else {
            usedHpx += panelH;
          }
        });
      }
    }

    const styleId = "dynamic-print-style";
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }

    el.textContent = `
      @page {
        size: ${getPageSizeString(pageLayout)};
        margin: ${pageLayout.margins.join("mm ")}mm;
      }
      @media print {
        html, body { display: block !important; height: auto !important; min-height: auto !important; overflow: visible !important; }
        #report-print-target { display: block !important; }
        #report-print-target > div {
          display: block !important;
          padding-bottom: var(--print-footer-h, 35mm) !important;
        }
        .report-footer {
          position: fixed !important;
          bottom: 0 !important; left: 0 !important; right: 0 !important;
          width: 100% !important;
          background: white !important;
          padding-top: 2mm !important;
        }
        .grid > div { break-inside: avoid !important; page-break-inside: avoid !important; }
        
        /* Ensure hide/show settings are respected in native print engine */
        ${!showHeader ? '#report-header-zone { visibility: hidden !important; }' : ''}
        ${!showFooter ? '.report-footer { visibility: hidden !important; }' : ''}
      }
    `;

    try {
      // Small delay to ensure DOM and CSS are fully painted and applied before capture
      await new Promise(r => setTimeout(r, 100));
      await actionFn();
    } finally {
      // Cleanup DOM exactly as before
      document.body.style.overflow = originalOverflow;
      if (document.getElementById(styleId)) document.getElementById(styleId).remove();
      if (printTarget) {
        printTarget.querySelectorAll(".js-print-spacer").forEach(e => e.remove());
      }
    }
  };

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!reportWrapperRef.current) return;
    setPdfError(null);
    setIsGeneratingPDF(true);
    await new Promise((r) => setTimeout(r, 50));

    const testName    = editedPanelNames[selectedTest] || testTemplates.find((t) => t.panel_id === selectedTest)?.panel_name || selectedTest;
    const patientName = patientDetails.name || "Unknown";
    const dateStr     = new Date().toISOString().split("T")[0];
    const filename    = `${patientName}_${testName}_${dateStr}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, "_");

    try {
      await withPrintSetup(async () => {
        // We use Electron IPC instead of html2canvas/generatePDF to get Pixel-Perfect Native match
        let isElectron = false;
        if (typeof window !== "undefined" && typeof window.require === "function") {
          try {
            window.require("electron");
            isElectron = true;
          } catch {
            // Not a real Electron require
          }
        }

        if (isElectron) {
          const { ipcRenderer } = window.require("electron");
          const res = await ipcRenderer.invoke("print-to-pdf", {
            filename,
            pageSize: pageLayout.format === "custom" 
              ? { width: Math.round(pageLayout.customWidth * 1000), height: Math.round(pageLayout.customHeight * 1000) }
              : pageLayout.format.toUpperCase(),
            margins: pageLayout.margins,
          });
          
          if (res && res.error) {
            throw new Error(res.error);
          }
        } else {
          // Fallback to html2canvas for standard browser preview
          await generatePDF(reportWrapperRef.current, {
            filename,
            format: pageLayout.format,
            orientation: pageLayout.orientation,
            customWidth: pageLayout.customWidth,
            customHeight: pageLayout.customHeight,
            margins: pageLayout.margins,
            showHeader,
            showFooter,
          });
        }
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
    withPrintSetup(() => {
      return new Promise((resolve) => {
        window.addEventListener("afterprint", resolve, { once: true });
        window.print();
        setTimeout(resolve, 15000); // safety fallback
      });
    });
  };


  // ── Shared template props ─────────────────────────────────────────────────
  const templateProps = {
    patientDetails,
    selectedTest,
    testData,
    testTemplates,
    editedRanges,
    editedParams,
    paramOrders,
    additionalPanels,
    editedPanelNames,
    showHeader,
    showFooter,
    density,
    disabledParams,
  };

  const densityInfo = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable;

  return (
    <>
      {/* ── Modal overlay (hidden on print via Tailwind print:hidden) ────── */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm print:hidden overflow-hidden">
        <div className="bg-white w-full sm:rounded-2xl sm:max-w-5xl sm:max-h-[92vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

          {/* ── Sticky toolbar ────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 px-4 sm:px-5 py-2.5 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0">
            <div className="flex flex-wrap items-center gap-2">

              {/* Title & Page Count */}
              <div className="mr-auto flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 leading-tight">Print Preview</h2>
                  <p className="text-[10px] text-gray-400 hidden sm:block">Review before printing or saving</p>
                </div>
                <div className="hidden sm:flex items-center justify-center px-2 py-1 bg-gray-100 border border-gray-200 rounded text-[10px] font-bold text-gray-600 tracking-wide">
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
                </div>
              </div>

              {/* ── Header / Footer toggles ──────────────────────────── */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Show:</span>

                <button className={toggleBtn(showHeader)} onClick={() => setShowHeader((v) => !v)}
                  title={showHeader ? "Hide header" : "Show header"}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="5" rx="1" strokeWidth="2" />
                    <line x1="3" y1="11" x2="21" y2="11" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>
                  Header
                </button>

                <button className={toggleBtn(showFooter)} onClick={() => setShowFooter((v) => !v)}
                  title={showFooter ? "Hide footer" : "Show footer"}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="3" y1="13" x2="21" y2="13" strokeWidth="2" strokeDasharray="3 2" />
                    <rect x="3" y="16" width="18" height="5" rx="1" strokeWidth="2" />
                  </svg>
                  Footer
                </button>
              </div>

              <div className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* ── Density indicator (Feature 2) ────────────────────── */}
              <button
                onClick={cycleDensity}
                title="Click to cycle density levels manually"
                className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold transition-all hover:opacity-80 ${DENSITY_COLORS[density]}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                {densityAuto ? "Auto" : ""} {densityInfo.label}
              </button>

              <div className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* ── Layout selector ─────────────────────────────────── */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Layout:</span>
                <select className={selectCls} value={pageLayout.format}
                  onChange={(e) => updateLayout({ format: e.target.value })}>
                  {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>

                <select className={selectCls} value={pageLayout.orientation}
                  onChange={(e) => updateLayout({ orientation: e.target.value })}>
                  {ORIENTATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>

                {pageLayout.format === "custom" && (
                  <>
                    <input type="number" min="50" max="1000" value={pageLayout.customWidth}
                      onChange={(e) => updateLayout({ customWidth: Number(e.target.value) })}
                      className={`${selectCls} w-14 text-center font-mono`} title="Width (mm)" />
                    <span className="text-gray-400 text-xs">×</span>
                    <input type="number" min="50" max="1000" value={pageLayout.customHeight}
                      onChange={(e) => updateLayout({ customHeight: Number(e.target.value) })}
                      className={`${selectCls} w-14 text-center font-mono`} title="Height (mm)" />
                    <span className="text-gray-400 text-[10px]">mm</span>
                  </>
                )}
              </div>

              <div className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* ── Actions ──────────────────────────────────────────── */}
              <div className="flex items-center gap-1.5">
                <button onClick={onClose}
                  className="px-2.5 py-1.5 rounded-lg text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors">
                  Close
                </button>

                {/* Download PDF */}
                <button onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download as PDF">
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
                <button onClick={handlePrint} disabled={isGeneratingPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Print">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            </div>

            {pdfError && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                ⚠ {pdfError}
              </div>
            )}
          </div>

          {/* ── Scrollable preview area ──────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain bg-gray-100 p-4 sm:p-8 flex justify-center items-start"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/*
              reportWrapperRef: the wrapper whose firstElementChild is the A4 div.
              We set width in mm so the ReportTemplate renders at its true size.
              No transform:scale — the template renders at natural size and the
              scrollable container handles overflow.
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

      {/*
        ── Print-only target (Portal) ────────────────────────────────────────
        BUG 1 FIX: Rendered via ReactDOM.createPortal directly onto document.body
        so it is a TRUE direct child of <body>, not nested inside #root.
        This means the CSS rule `body > *:not(#report-print-target) { display:none }`
        correctly hides #root (the app) while leaving #report-print-target visible.
        The .screen-only class hides it on screen (via @media screen { display:none }).
        On print, @media screen does not apply, so it becomes visible.
      */}
      {createPortal(
        <div id="report-print-target" className="screen-only">
          <ReportTemplate {...templateProps} />
        </div>,
        document.body
      )}
    </>
  );
}
