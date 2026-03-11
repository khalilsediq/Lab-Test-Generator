import logo from "../assets/images/Logo.png";
import BloodBankReportSection from "./BloodBankReportSection";
import Barcode from "react-barcode";

// ── helpers ────────────────────────────────────────────────────────────────

const isQual = (p) => {
  const rr = p?.reference_range;
  return (
    p?.unit === "qualitative" ||
    p?.unit === "semiquantitative" ||
    p?.unit === "titre" ||
    (rr?.male_min === null &&
      rr?.male_max === null &&
      rr?.female_min === null &&
      rr?.female_max === null)
  );
};

const effectiveRange = (p, editedRanges, panelId) => ({
  ...p.reference_range,
  ...(editedRanges?.[panelId]?.[p.id] || {}),
});

const effectiveParam = (field, pOverrides, pId) => {
  const o = pOverrides?.[pId]?.[field.id];
  return o ? { ...field, ...o } : field;
};

const formatRange = (rr, gender) => {
  if (!rr) return "—";
  
  // Custom gender fallback logic
  let mn = null;
  let mx = null;
  if (gender === "Male") {
    mn = rr.male_min; mx = rr.male_max;
  } else if (gender === "Female") {
    mn = rr.female_min; mx = rr.female_max;
  } else {
    // For custom genders like "Child" or "Other", check if they have specific
    // ranges (though backend currently doesn't support this via schema).
    // Fallback: If both male/female exist and are identical, use it.
    // Otherwise fallback to general string, or show a generic message.
    if (rr.male_min !== null && rr.male_max !== null && rr.male_min === rr.female_min && rr.male_max === rr.female_max) {
      mn = rr.male_min; mx = rr.male_max;
    } else {
      return rr.general || "—";
    }
  }

  if (mn === null && mx === null) return rr.general || "—";
  if (mn !== null && mx === null) return `≥ ${mn}`;
  if (mn === null && mx !== null) return `< ${mx}`;
  return `${mn} – ${mx}`;
};

const isAbnormal = (val, rr, gender, qual) => {
  if (qual || !val || !rr) return false;
  const n = parseFloat(val);
  if (isNaN(n)) return false;
  
  let mn = null;
  let mx = null;
  if (gender === "Male") {
    mn = rr.male_min; mx = rr.male_max;
  } else if (gender === "Female") {
    mn = rr.female_min; mx = rr.female_max;
  } else {
    if (rr.male_min !== null && rr.male_max !== null && rr.male_min === rr.female_min && rr.male_max === rr.female_max) {
      mn = rr.male_min; mx = rr.male_max;
    } else {
      return false; // Safely ignore abnormal flag if we can't determine numeric range for custom gender
    }
  }

  if (mn !== null && mx === null) return n < mn;
  if (mn === null && mx !== null) return n > mx;
  if (mn !== null && mx !== null) return n < mn || n > mx;
  return false;
};

const applyOrder = (fields, order) => {
  if (!order) return fields;
  return [...fields].sort((a, b) => {
    const ai = order.indexOf(a.id),
      bi = order.indexOf(b.id);
    if (ai < 0) return 1;
    if (bi < 0) return -1;
    return ai - bi;
  });
};

// ── Density configs ────────────────────────────────────────────────────────
// Each level defines CSS classes/values for font size, row padding, section gap.
// These are applied to the table rows and patient info section.
export const DENSITY_LEVELS = ["comfortable", "compact", "condensed"];

export const DENSITY_CONFIG = {
  comfortable: {
    label: "Comfortable",
    tableTextClass: "text-[10pt]",
    rowPaddingClass: "py-1",
    sectionGapClass: "mb-4",
    patientTextClass: "text-[10pt]",
    titlePaddingClass: "py-[2px]",
    titleTextClass: "text-base",
  },
  compact: {
    label: "Compact",
    tableTextClass: "text-[9pt]",
    rowPaddingClass: "py-[2px]",
    sectionGapClass: "mb-2",
    patientTextClass: "text-[9pt]",
    titlePaddingClass: "py-[1px]",
    titleTextClass: "text-sm",
  },
  condensed: {
    label: "Condensed",
    tableTextClass: "text-[8pt]",
    rowPaddingClass: "py-[1px]",
    sectionGapClass: "mb-1",
    patientTextClass: "text-[8pt]",
    titlePaddingClass: "py-0",
    titleTextClass: "text-xs",
  },
};

// ── component ─────────────────────────────────────────────────────────────

export default function ReportTemplate({
  patientDetails,
  selectedTest,
  testData,
  testTemplates,
  editedRanges,
  editedParams,
  paramOrders,
  additionalPanels = [],
  showHeader = true,
  showFooter = true,
  density = "comfortable",
}) {
  const gender = patientDetails.gender;
  const dc = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable;

  const parseDate = (dStr) => (dStr ? new Date(dStr) : new Date());
  const regDateObj = parseDate(patientDetails.registrationDate);
  const regDateStr = regDateObj.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const printDateStr = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="relative bg-white w-[210mm] min-h-[297mm] mx-auto p-[3mm] text-black font-sans box-border flex flex-col print:block print:m-0 print:p-0 print:min-h-0 print:shadow-none shadow-[0_0_10px_rgba(0,0,0,0.1)]">
      
      {/* ── Background Watermark (Repeats on every print page via fixed) ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 overflow-hidden print:fixed print:inset-0 print:h-full print:w-full print:opacity-[0.05]">
        <img src={logo} alt="Watermark" className="w-[80%] max-w-[600px] h-auto object-contain" />
      </div>

      {/*
        ── PRINT HEADER (Fixed Position) ──
        This block is rendered ONCE in the DOM but becomes position:fixed during print,
        causing Chromium to stamp it at the top of EVERY printed page automatically.
        A spacer `div` below reserves the same vertical space so content never overlaps.
      */}
      <div
        id="report-stamp-zone"
        className="bg-white print:fixed print:top-0 print:left-0 print:right-0 print:z-50 print:w-full"
      >
      <div
        id="report-header-zone"
        style={{ visibility: showHeader ? "visible" : "hidden" }}
      >
        <div className="report-header flex justify-between items-center mb-2 px-2 print:mb-1">
          <div
            className="flex flex-col text-red-600 font-serif font-bold italic leading-none shrink-0"
            style={{ transform: "scaleY(1.1)", transformOrigin: "left center" }}
          >
            <h1 className="text-[38px] print:text-[32px] tracking-tighter mb-1">
              BUKHARI LAB
            </h1>
            <h2 className="text-[24px] print:text-[20px] tracking-tight mb-1">
              AL BASIT MEDICAL
            </h2>
            <h2 className="text-[24px] print:text-[20px] tracking-tight">
              CENTER
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center shrink-0 -mt-2">
            <img
              src={logo}
              alt="Bukhari Lab Logo"
              className="w-[120px] h-[120px] print:w-[100px] print:h-[100px] object-contain"
            />
            <div
              className="text-red-600 font-bold text-xl print:text-lg mt-1"
              style={{
                fontFamily: "'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif",
              }}
            >
              الباسط میڈیکل سینٹر شاہرگ
            </div>
          </div>

          <div className="flex flex-col items-center text-red-600 font-serif font-bold italic leading-tight shrink-0">
            <div
              className="text-[48px] print:text-[40px] font-normal not-italic mb-1 leading-none"
              style={{
                fontFamily: "'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif",
                transform: "scaleY(1.2)",
                transformOrigin: "bottom center",
              }}
            >
              بخاری لیب
            </div>
            <div className="text-[22px] print:text-[18px] tracking-wide mt-2">
              LAB TECHNICIAN
            </div>
            <div className="text-[16px] print:text-[14px] tracking-wide">
              SYED MOHEEB ULLAH
            </div>
            <div className="text-[16px] print:text-[14px] tracking-widest">
              0332-3333800
            </div>
          </div>
        </div>
        <hr className="border-t-2 border-red-600 mb-2 print:mb-1" />
      </div>

      {/* ── Patient Info Box (BUG 5 FIX: Moved into semantic thead to repeat on every page) ── */}
      <div id="patient-details-zone" className={`${dc.sectionGapClass} print:mb-2 ${dc.patientTextClass} print:text-[9pt] leading-tight text-left print:block print:w-full print:break-inside-avoid`}>
        {/* ZONE A: Barcode Strip */}
        <div className="border-t-[1.5px] border-b-[1.5px] border-black py-1 mb-2">
          <div className="flex items-center justify-between px-1">
            {/* Patient No */}
            <div className="flex items-center gap-2">
              <span className="font-normal text-black">Patient No:</span>
              <span className="font-bold text-black text-[11pt] print:text-[10pt]">
                {patientDetails.mrNo || "—"}
              </span>
              <div className="h-[20px] ml-1 overflow-hidden flex items-center">
                {patientDetails.mrNo ? (
                  <Barcode
                    value={patientDetails.mrNo}
                    format="CODE128"
                    displayValue={false}
                    height={20}
                    margin={0}
                    width={1.2}
                  />
                ) : (
                  <div className="h-[20px] w-[80px] border border-dashed border-gray-400 flex items-center justify-center text-[8px] text-gray-400">
                    [barcode]
                  </div>
                )}
              </div>
            </div>

            {/* T/R ID */}
            <div className="flex items-center gap-2">
              <span className="font-normal text-black">T/R ID:</span>
              <span className="font-bold text-black text-[11pt] print:text-[10pt]">
                {patientDetails.trId || "—"}
              </span>
              <div className="h-[20px] ml-1 overflow-hidden flex items-center">
                {patientDetails.trId ? (
                  <Barcode
                    value={patientDetails.trId}
                    format="CODE128"
                    displayValue={false}
                    height={20}
                    margin={0}
                    width={1.2}
                  />
                ) : (
                  <div className="h-[20px] w-[80px] border border-dashed border-gray-400 flex items-center justify-center text-[8px] text-gray-400">
                    [barcode]
                  </div>
                )}
              </div>
            </div>

            {/* T/R No */}
            <div className="flex items-center gap-2">
              <span className="font-normal text-black">T/R No:</span>
              <span className="font-bold text-black text-[11pt] print:text-[10pt]">
                {patientDetails.trNo || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* ZONE B: Patient Details Grid */}
        <div className="grid grid-cols-[1fr_1fr_90px] gap-x-4">
          {/* Left Column */}
          <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-[4px]">
            <div className="font-normal text-black">Patient Name:</div>
            <div className="font-semibold text-black">
              {patientDetails.name || "—"}
            </div>

            <div className="font-normal text-black">S/O D/O W/O:</div>
            <div className="font-normal text-black">
              {patientDetails.fatherHusbandName || "—"}
            </div>

            <div className="font-normal text-black">Age/Gender:</div>
            <div className="font-bold text-black">
              {patientDetails.age ? `${patientDetails.age}(Y)` : "—"} / {gender}
            </div>

            <div className="font-normal text-black">Contact No:</div>
            <div className="font-bold text-black">
              {patientDetails.contactNo || "—"}
            </div>

            <div className="font-normal text-black">Address:</div>
            <div className="font-normal text-black">
              {patientDetails.address || "—"}
            </div>
            
            {/* BUG 3 FIX: Add Consultant/Doctor */}
            <div className="font-normal text-black">Consultant:</div>
            <div className="font-bold text-red-600">
              {patientDetails.consultant || "—"}
            </div>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-[4px]">
            <div className="font-normal text-black">Registration Location:</div>
            <div className="font-bold text-black">{patientDetails.registrationLocation || "Lab data_Main"}</div>

            <div className="font-normal text-black">Registered Date:</div>
            <div className="font-bold text-black">{regDateStr}</div>

            <div className="font-normal text-black">Reporting Date:</div>
            <div className="font-bold text-black">{regDateStr}</div>

            <div className="font-normal text-black">Specimen Source:</div>
            <div className="font-bold text-black">
              {patientDetails.sampleLocation || "Self"}
            </div>

            <div className="font-normal text-black">Specimen:</div>
            <div className="font-bold text-black">{patientDetails.specimen || "Taken in lab"}</div>
          </div>

          {/* Far Right: QR Code Placeholder */}
          <div className="flex justify-end pr-1">
            <div className="w-[80px] h-[80px] border border-black bg-white flex items-center justify-center text-center p-1 relative">
              <div className="absolute inset-1 border-2 border-black border-dashed opacity-20"></div>
              <span className="text-[10px] text-gray-500 font-bold z-10 leading-tight">
                QR Code
              </span>
            </div>
          </div>
        </div>
      </div>{/* /patient-details-zone */}
      </div>{/* /report-stamp-zone */}

      {/* PRINT ALIGNMENT WRAPPER */}
      {/* Natively reserves space for fixed header/footer on EVERY printed page using DOM Injection (ReportPreview.jsx) */}
      <div id="report-header-spacer" className="hidden print:block" style={{ height: "var(--print-header-h, 170px)" }} />

      {/* ── Test Panels ── */}
      <div id="report-panels">
          {/* ── Stacked Reports ── */}
          {(() => {
        const activePanels = [selectedTest, ...(additionalPanels || [])];

        return activePanels.map((panelId, idx) => {
          const panel = testTemplates.find((t) => t.panel_id === panelId);
          const rawFields =
            panel?.parameters.filter(
              (p) =>
                p.gender_applicable === "all" ||
                p.gender_applicable === gender.toLowerCase(),
            ) || [];
          const savedOrder = paramOrders?.[panelId];
          const fields = applyOrder(rawFields, savedOrder);
          if (fields.length === 0) return null;

          const isBloodBank = panel?.category?.toLowerCase()?.includes("blood");

          return (
            <div
              key={panelId + idx}
              className={`panel-container ${dc.sectionGapClass} print:break-inside-avoid`}
            >
              {/* ── Report Title ── */}
              <div className={`panel-title bg-gray-200 ${dc.titlePaddingClass} print:py-px flex items-center justify-center font-bold ${dc.titleTextClass} print:text-sm tracking-widest uppercase mb-2 border-t border-b border-gray-400`}>
                {panel?.panel_name
                  ?.replace(" Test", "")
                  .replace(" Profile", "") || panelId}{" "}
                REPORT
              </div>

              {isBloodBank ? (
                <BloodBankReportSection
                  panel={panel}
                  testData={testData}
                  gender={gender}
                  editedParams={editedParams}
                  paramOrders={paramOrders}
                />
              ) : (
                <div className={`w-full ${dc.tableTextClass} print:text-[9pt] mt-1 mb-2`}>
                  {/* Table Header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_2fr] border-b-2 border-gray-400">
                    <div className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase`}>
                      TEST
                    </div>
                    <div className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase`}>
                      RESULT
                    </div>
                    <div className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase`}>
                      UNITS
                    </div>
                    <div className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase`}>
                      REF. RANGE
                    </div>
                  </div>
                  {/* Table Body */}
                  <div className="print:break-inside-avoid">
                    {fields.map((field) => {
                      const rr = effectiveRange(field, editedRanges, panelId);
                      const qual = isQual(field);
                      const val = testData[field.id];
                      const abn = isAbnormal(val, rr, gender, qual);
                      const overriddenParam = effectiveParam(
                        field,
                        editedParams,
                        panelId,
                      );

                      return (
                        <div
                          key={field.id}
                          className="grid grid-cols-[2fr_1fr_1fr_2fr] border-b border-gray-100/50"
                        >
                          <div className={`${dc.rowPaddingClass} print:py-[3px] font-semibold`}>
                            {overriddenParam.name}
                            {overriddenParam.abbreviation && (
                              <span className="text-gray-500 font-normal ml-1 text-[8pt]">
                                ({overriddenParam.abbreviation})
                              </span>
                            )}
                          </div>
                          <div
                            className={`${dc.rowPaddingClass} print:py-[3px] font-mono ${abn ? "font-bold text-red-700" : ""}`}
                          >
                            {val || "—"}
                            {abn && (
                              <span className="text-red-600 ml-0.5">*</span>
                            )}
                          </div>
                          <div className={`${dc.rowPaddingClass} print:py-[3px]`}>
                            {qual ? "Qualitative" : overriddenParam.unit}
                          </div>
                          <div className={`${dc.rowPaddingClass} print:py-[3px] font-mono`}>
                            {qual
                              ? rr?.general || "See report"
                              : `${formatRange(rr, gender)}${overriddenParam.unit ? ` ${overriddenParam.unit}` : ""}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        });
      })()}
      </div>

      <div className="flex-1 print:hidden" />

      {/* ── Footer ── */}
      {/*
        The footer renders in NORMAL DOCUMENT FLOW at the end of the content.
        On screen: the flex-col parent with min-h-[297mm] pushes it down via mt-auto.
        On print: it flows naturally after all panels, and the fixed header
        at the top of each page provides its own clearance via the spacer div.
        This avoids the old position:fixed approach which caused panel overlap.
      */}
      <div
        className="report-footer mt-auto pt-4 pb-2"
        style={{ visibility: showFooter ? "visible" : "hidden" }}
      >
        {/* ZONE 1 — The Signature Row */}
        <div className="flex justify-between items-end mb-2">
          {/* Left: Technician */}
          <div className="flex flex-col items-center w-1/3 text-center">
            <div className="w-40 border-b border-black mb-1 h-12"></div>
            <div className="font-bold text-[10pt] tracking-wider uppercase">LAB TECHNICIAN</div>
          </div>

          {/* Center: Disclaimer */}
          <div className="flex flex-col items-center w-1/3 text-center">
            <div className="font-bold text-[10pt] uppercase mb-1">
              NOT VALID FOR THE COURT
            </div>
          </div>

          {/* Right: Pathologist */}
          <div className="flex flex-col items-center w-1/3 text-center">
            <div className="w-40 border-b border-black mb-1 h-12"></div>
            <div className="font-bold text-[10pt] tracking-wider uppercase">PATHOLOGIST</div>
          </div>
        </div>

        <hr className="border-t border-gray-300 mt-2 mb-2" />

        {/* ZONE 2 — The Developer Branding Strip */}
        <div className="flex justify-center items-center text-[7pt] text-gray-500 font-medium tracking-wide">
          <span>Developed by KS Tech</span>
          <span className="mx-2">·</span>
          <a
            href="https://wa.me/923708911924"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-green-600 transition-colors"
          >
            <svg
              className="w-3 h-3 mr-1 text-green-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.99 2C6.47 2 2 6.48 2 12c0 1.76.46 3.41 1.25 4.89L2 22l5.24-1.22A9.94 9.94 0 0 0 11.99 22c5.52 0 10-4.48 10-10S17.51 2 11.99 2zm5.71 14.53c-.24.7-1.35 1.34-1.89 1.41-.5.06-1.14.15-3.32-.75-2.61-1.09-4.31-3.76-4.44-3.93-.13-.18-1.06-1.42-1.06-2.71s.68-1.92.91-2.17c.18-.19.49-.29.74-.29.2 0 .4.01.58.01.21.01.49-.08.73.51.3.73 1.05 2.57 1.15 2.76.09.19.15.42.02.66-.13.24-.19.39-.38.61-.19.22-.4.48-.56.66-.19.19-.38.4-.17.76.22.37.97 1.58 2.08 2.56 1.44 1.28 2.62 1.68 2.98 1.84.36.16.57.14.78-.1.22-.24.93-1.08 1.18-1.45.24-.37.48-.31.81-.19.34.13 2.14 1.01 2.51 1.2.36.19.61.28.7.44.09.16.09.92-.15 1.62z" />
            </svg>
            +92-370-891-1924
          </a>
        </div>
      </div>
    </div>
  );
}
