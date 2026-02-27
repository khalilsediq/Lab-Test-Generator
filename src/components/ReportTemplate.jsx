import logo from "../assets/images/Logo.png";

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

const formatRange = (rr, gender) => {
  if (!rr) return "—";
  const [mn, mx] =
    gender === "Male"
      ? [rr.male_min, rr.male_max]
      : [rr.female_min, rr.female_max];
  if (mn === null && mx === null) return rr.general || "—";
  if (mn !== null && mx === null) return `≥ ${mn}`;
  if (mn === null && mx !== null) return `< ${mx}`;
  return `${mn} – ${mx}`;
};

const isAbnormal = (val, rr, gender, qual) => {
  if (qual || !val || !rr) return false;
  const n = parseFloat(val);
  if (isNaN(n)) return false;
  const [mn, mx] =
    gender === "Male"
      ? [rr.male_min, rr.male_max]
      : [rr.female_min, rr.female_max];
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

// ── component ─────────────────────────────────────────────────────────────

export default function ReportTemplate({
  patientDetails,
  selectedTest,
  testData,
  testTemplates,
  editedRanges,
  paramOrders,
}) {
  const gender = patientDetails.gender;
  const panel = testTemplates.find((t) => t.panel_id === selectedTest);

  const rawFields =
    panel?.parameters.filter(
      (p) =>
        p.gender_applicable === "all" ||
        p.gender_applicable === gender.toLowerCase(),
    ) || [];

  const fields = applyOrder(rawFields, paramOrders?.[selectedTest]);

  const now = new Date();
  const formattedDate = now
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateTimeStr = `${formattedDate} ${formattedTime}`;

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] mx-auto p-[10mm] pb-[250px] text-black font-sans box-border relative print:m-0 print:p-[10mm] print:pb-[250px] print:shadow-none shadow-[0_0_10px_rgba(0,0,0,0.1)]">
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-2 px-2">
        <div
          className="flex flex-col text-red-600 font-serif font-bold italic leading-none shrink-0"
          style={{ transform: "scaleY(1.1)", transformOrigin: "left center" }}
        >
          <h1 className="text-[38px] tracking-tighter mb-1">BUKHARI LAB</h1>
          <h2 className="text-[24px] tracking-tight mb-1">AL BASIT MEDICAL</h2>
          <h2 className="text-[24px] tracking-tight">CENTER</h2>
        </div>

        <div className="flex flex-col items-center justify-center shrink-0 -mt-2">
          <img
            src={logo}
            alt="Bukhari Lab Logo"
            className="w-[120px] h-[120px] object-contain"
          />
          <div
            className="text-red-600 font-bold text-xl mt-1"
            style={{
              fontFamily: "'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif",
            }}
          >
            الباسط میڈیکل سینٹر شاہرگ
          </div>
        </div>

        <div className="flex flex-col items-center text-red-600 font-serif font-bold italic leading-tight shrink-0">
          <div
            className="text-[48px] font-normal not-italic mb-1 leading-none"
            style={{
              fontFamily: "'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif",
              transform: "scaleY(1.2)",
              transformOrigin: "bottom center",
            }}
          >
            بخاری لیب
          </div>
          <div className="text-[22px] tracking-wide mt-2">LAB TECHNICIAN</div>
          <div className="text-[16px] tracking-wide">SYED MOHEEB ULLAH</div>
          <div className="text-[16px] tracking-widest">0332-3333800</div>
        </div>
      </div>

      <hr className="border-t-4 border-red-600 mb-6" />

      {/* ── Patient Info ── */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-6 text-sm font-semibold">
        <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1">
          <div>M.R. No :</div>
          <div className="font-normal uppercase">
            {patientDetails.mrNo || "—"}
          </div>
          <div>Patient Name :</div>
          <div className="font-normal uppercase">
            {patientDetails.name || "—"}
          </div>
          <div>Father/Husband Name:</div>
          <div className="font-normal">—</div>
          <div>Age / Sex :</div>
          <div className="font-normal">
            {patientDetails.age ? `${patientDetails.age} Year(s)` : "—"} /{" "}
            {gender}
          </div>
          <div>Contact No :</div>
          <div className="font-normal">—</div>
          <div>Sample Location :</div>
          <div className="font-normal">Collected In Lab</div>
          <div>Consultant :</div>
          <div className="font-normal uppercase">
            {patientDetails.consultant || "Self"}
          </div>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1">
          <div>Registration Date :</div>
          <div className="font-normal">{dateTimeStr}</div>
          <div>Received Date :</div>
          <div className="font-normal">{dateTimeStr}</div>
          <div>Reported Date :</div>
          <div className="font-normal">{dateTimeStr}</div>
          <div>Printing Date :</div>
          <div className="font-normal">{dateTimeStr}</div>
          <div>Address :</div>
          <div className="font-normal">—</div>
          <div>Registration At :</div>
          <div className="font-normal uppercase">MAIN LAB</div>
          <div>Reference :</div>
          <div className="font-normal">N/A</div>
        </div>
      </div>

      {/* ── Report Title ── */}
      <div className="bg-gray-300 py-1 flex items-center justify-center font-bold text-lg tracking-widest uppercase mb-4 shadow-sm border-t border-b border-gray-400">
        {panel?.panel_name?.replace(" Test", "").replace(" Profile", "") ||
          selectedTest}{" "}
        REPORT
      </div>

      {/* ── Results Table ── */}
      <table className="w-full text-sm mb-8 mt-2">
        <thead>
          <tr className="border-b-2 border-gray-400">
            <th className="py-2 text-left font-bold uppercase w-2/5">TEST</th>
            <th className="py-2 text-left font-bold uppercase w-1/6">RESULT</th>
            <th className="py-2 text-left font-bold uppercase w-1/6">UNITS</th>
            <th className="py-2 text-left font-bold uppercase">REF. RANGE</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const rr = effectiveRange(field, editedRanges, selectedTest);
            const qual = isQual(field);
            const val = testData[field.id];
            const abn = isAbnormal(val, rr, gender, qual);

            return (
              <tr key={field.id} className="border-b border-gray-100">
                <td className="py-2 font-semibold text-sm">
                  {field.name}
                  {field.abbreviation && (
                    <span className="text-gray-400 font-normal ml-1 text-xs">
                      ({field.abbreviation})
                    </span>
                  )}
                </td>
                <td
                  className={`py-2 text-sm font-mono ${abn ? "font-bold text-red-700" : ""}`}
                >
                  {val || "—"}
                  {abn && <span className="text-red-600 ml-0.5">*</span>}
                </td>
                <td className="py-2 text-sm">
                  {qual ? "Qualitative" : field.unit}
                </td>
                <td className="py-2 text-sm font-mono">
                  {qual
                    ? rr.general || "See report"
                    : `${formatRange(rr, gender)}${field.unit ? ` ${field.unit}` : ""}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Footer ── */}
      <div className="absolute bottom-10 left-[10mm] right-[10mm]">
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
          <div>Page 1 of 1</div>
          <div>Print At : {dateTimeStr}</div>
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
