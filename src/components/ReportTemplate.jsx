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
    <div className="bg-white w-[210mm] min-h-[297mm] mx-auto p-[3mm] text-black font-sans box-border flex flex-col print:m-0 print:p-[10mm] print:shadow-none shadow-[0_0_10px_rgba(0,0,0,0.1)]">
      
      {/* ── Print Table Wrapping: Creates semantic headers/footers for native browser printing ── */}
      <table className="w-full border-collapse">
        <thead className="print-table-header">
          <tr>
            <td>
              {/* Header space */}
              {/*
                ── Header ──
                BUG 2 FIX: We keep the header in the DOM at ALL TIMES (even when hidden)
                so the space it occupies is always reserved and content below never shifts.
                visibility:hidden makes it invisible without removing it from flow.
                (If showHeader is false, the hr separator is also hidden.)
              */}
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
            </td>
          </tr>
        </thead>
        <tbody className="relative">
          {/* Watermark Logo Feature */}
          <tr>
            <td colSpan="100%" className="p-0">
              <div className="absolute inset-x-0 inset-y-12 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 overflow-hidden print:opacity-[0.05]">
                <img src={logo} alt="Watermark" className="w-[80%] h-auto object-contain" />
              </div>
            </td>
          </tr>

          <tr>
            <td className="relative z-10">
      {/* ── Patient Info Box ── */}
      <div className={`${dc.sectionGapClass} print:mb-2 ${dc.patientTextClass} print:text-[9pt] leading-tight shrink-0`}>
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
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-[4px]">
            <div className="font-normal text-black">Registration Location:</div>
            <div className="font-bold text-black">Lab data_Main</div>

            <div className="font-normal text-black">Registered Date:</div>
            <div className="font-bold text-black">{regDateStr}</div>

            <div className="font-normal text-black">Reporting Date:</div>
            <div className="font-bold text-black">{regDateStr}</div>

            <div className="font-normal text-black">Specimen Source:</div>
            <div className="font-bold text-black">
              {patientDetails.sampleLocation || "Self"}
            </div>

            <div className="font-normal text-black">Specimen:</div>
            <div className="font-bold text-black">Taken in lab</div>
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
        <hr />
      </div>

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
            <div key={panelId + idx} className={dc.sectionGapClass}>
              {/* ── Report Title ── */}
              <div className={`bg-gray-200 ${dc.titlePaddingClass} print:py-px flex items-center justify-center font-bold ${dc.titleTextClass} print:text-sm tracking-widest uppercase mb-2 border-t border-b border-gray-400 print:break-after-avoid`}>
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
                <table className={`w-full ${dc.tableTextClass} print:text-[9pt] mt-1 mb-2`}>
                  <thead>
                    <tr className="border-b-2 border-gray-400">
                      <th className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase w-2/5`}>
                        TEST
                      </th>
                      <th className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase w-1/6`}>
                        RESULT
                      </th>
                      <th className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase w-1/6`}>
                        UNITS
                      </th>
                      <th className={`${dc.rowPaddingClass} print:py-[2px] text-left font-bold uppercase`}>
                        REF. RANGE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="print:break-inside-avoid">
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
                        <tr
                          key={field.id}
                          className="border-b border-gray-100/50"
                        >
                          <td className={`${dc.rowPaddingClass} print:py-[3px] font-semibold`}>
                            {overriddenParam.name}
                            {overriddenParam.abbreviation && (
                              <span className="text-gray-500 font-normal ml-1 text-[8pt]">
                                ({overriddenParam.abbreviation})
                              </span>
                            )}
                          </td>
                          <td
                            className={`${dc.rowPaddingClass} print:py-[3px] font-mono ${abn ? "font-bold text-red-700" : ""}`}
                          >
                            {val || "—"}
                            {abn && (
                              <span className="text-red-600 ml-0.5">*</span>
                            )}
                          </td>
                          <td className={`${dc.rowPaddingClass} print:py-[3px]`}>
                            {qual ? "Qualitative" : overriddenParam.unit}
                          </td>
                          <td className={`${dc.rowPaddingClass} print:py-[3px] font-mono`}>
                            {qual
                              ? rr?.general || "See report"
                              : `${formatRange(rr, gender)}${overriddenParam.unit ? ` ${overriddenParam.unit}` : ""}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        });
      })()}
            </td>
          </tr>
        </tbody>

        <tfoot className="print-table-footer">
          <tr>
            <td>
              {/* Footer space */}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── Spacer: pushes footer to visual bottom of the A4 page ── */}
      <div className="flex-1" />

      {/* ── Footer ── */}
      <div
        className="report-footer mt-4 pt-2"
        style={{ visibility: showFooter ? "visible" : "hidden" }}
      >
        <div className="text-right font-bold text-sm mb-2">
          Approved By : Admin Admin
        </div>
        <div className="text-center font-bold text-xs uppercase mb-1">
          Electronically verified report. No signatures necessary. Not Valid for
          Legal Proceeding.
        </div>
        <hr />
        <div className="flex justify-between text-xs font-semibold mb-2 mt-1">
          <div>Offline: Print</div>
          <div>Print At : {printDateStr}</div>
        </div>
        <div className="flex justify-center space-x-6 text-xs text-black mb-1">
          <div className="flex items-center space-x-1">
            <span className="text-green-500">📱</span>
            <span>0321 944 7113</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-blue-500">📞</span>
            <span>0321 944 4002</span>
          </div>
        </div>
        <div className="text-center text-xs text-black">
          <span className="text-blue-700 font-bold">KS-Lab System</span> -
          Powered by{" "}
          <span className="text-green-600 font-bold">
            Advanced Software Solutions
          </span>{" "}
          | Contact: +923708911924
        </div>
      </div>
    </div>
  );
}
