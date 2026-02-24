import logo from "../assets/images/Logo.png";

export default function ReportTemplate({
  patientDetails,
  selectedTest,
  testData,
  testTemplates,
}) {
  const panel = testTemplates.find((t) => t.panel_id === selectedTest);

  const fields =
    panel?.parameters.filter(
      (p) =>
        p.gender === "all" || p.gender === patientDetails.gender.toLowerCase(),
    ) || [];

  const formatRange = (range) => {
    if (!range) return "-";
    if (range.max === null) return `> ${range.min}`;
    return `${range.min} - ${range.max}`;
  };

  const isValueAbnormal = (val, range) => {
    if (!val || !range) return false;
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return false;
    if (range.max === null) {
      return numVal < range.min;
    }
    return numVal < range.min || numVal > range.max;
  };

  // Get current date/time for the report
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
      {/* 1. Header (Redesigned to match image) */}
      <div className="flex justify-between items-center mb-2 px-2">
        {/* Left Section */}
        <div
          className="flex flex-col text-red-600 font-serif font-bold italic leading-none shrink-0"
          style={{ transform: "scaleY(1.1)", transformOrigin: "left center" }}
        >
          <h1 className="text-[38px] tracking-tighter mb-1">BUKHARI LAB</h1>
          <h2 className="text-[24px] tracking-tight mb-1">AL BASIT MEDICAL</h2>
          <h2 className="text-[24px] tracking-tight">CENTER</h2>
        </div>

        {/* Center Section */}
        <div className="flex flex-col items-center justify-center shrink-0 -mt-2">
          <img
            src={logo}
            alt="Bukhari Lab Logo"
            className="w-[120px] h-[120px] object-contain"
          />
          <div
            className="text-red-600 font-bold text-xl mt-1"
            style={{
              fontFamily:
                "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
            }}

            >الباسط میڈیکل سینٹر شاہرگ

          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col items-center text-red-600 font-serif font-bold italic leading-tight shrink-0">
          <div
            className="text-[48px] font-normal not-italic mb-1 leading-none"
            style={{
              fontFamily:
                "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
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

      <hr className="border-t-[4px] border-red-600 mb-6" />

      {/* 2. Patient Information Grid */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-6 text-sm font-semibold">
        {/* Left Col */}
        <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1">
          <div className="text-black">M.R. No :</div>
          <div className="font-normal uppercase">
            {patientDetails.mrNo || "-"}
          </div>

          <div className="text-black">Patient Name :</div>
          <div className="font-normal uppercase">
            {patientDetails.name || "-"}
          </div>

          <div className="text-black">Father/Husband Name:</div>
          <div className="font-normal">-</div>

          <div className="text-black">Age / Sex :</div>
          <div className="font-normal">
            {patientDetails.age ? `${patientDetails.age} Year (s)` : "-"} /{" "}
            {patientDetails.gender}
          </div>

          <div className="text-black">Contact No :</div>
          <div className="font-normal">-</div>

          <div className="text-black">Sample Location :</div>
          <div className="font-normal">Collected In Lab</div>

          <div className="text-black">Consultant :</div>
          <div className="font-normal uppercase">
            {patientDetails.consultant || "Self"}
          </div>
        </div>

        {/* Right Col */}
        <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1">
          <div className="text-black">Registration Date :</div>
          <div className="font-normal">{dateTimeStr}</div>

          <div className="text-black">Received Date :</div>
          <div className="font-normal">{dateTimeStr}</div>

          <div className="text-black">Reported Date :</div>
          <div className="font-normal">{dateTimeStr}</div>

          <div className="text-black">Printing Date :</div>
          <div className="font-normal">{dateTimeStr}</div>

          <div className="text-black">Address :</div>
          <div className="font-normal">-</div>

          <div className="text-black">Registration At :</div>
          <div className="font-normal uppercase">MAIN LAB</div>

          <div className="text-black">Reference :</div>
          <div className="font-normal">N/A</div>
        </div>
      </div>

      {/* 3. Report Title */}
      <div className="bg-gray-300 py-1 flex items-center justify-center font-bold text-lg tracking-widest uppercase mb-4 shadow-sm border-t border-b border-gray-400">
        {panel?.panel_name?.replace("Test", "").replace("Profile", "") ||
          selectedTest}{" "}
        REPORT
      </div>

      {/* 4. Test Results Table */}
      <table className="w-full text-sm mb-8 mt-2">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-2 text-left font-bold uppercase w-1/3">TEST</th>
            <th className="py-2 text-left font-bold uppercase w-1/4">RESULT</th>
            <th className="py-2 text-left font-bold uppercase">UNITS</th>
            <th className="py-2 text-left font-bold uppercase">REF. RANGE</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const val = testData[field.id];
            const isAbnormal = isValueAbnormal(val, field.reference_range);
            return (
              <tr key={field.id} className="border-b border-gray-100">
                <td className="py-2 font-semibold text-sm">{field.name}</td>
                <td className={`py-2 text-sm ${isAbnormal ? "font-bold" : ""}`}>
                  {val || "-"}
                </td>
                <td className="py-2 text-sm">{field.unit}</td>
                <td className="py-2 text-sm">
                  {formatRange(field.reference_range)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 5. Footer Layout (Absolutely positioned to botttom of page) */}
      <div className="absolute bottom-10 left-[10mm] right-[10mm]">
        <div className="text-right font-bold text-sm mb-2">
          Approved By : Admin Admin
        </div>
        <div className="text-center font-bold text-xs uppercase mb-1">
          Electronically verified report. No signatures necessary. Not Valid for
          Legal Proceeding.
        </div>
        <hr />
        {/* <div className="border-t-2 border-black flex justify-between pt-2 pb-6 text-[10px] font-bold text-center">
          <div>
            Dr Naeem Afghan
            <br />
            <span className="font-normal text-[9px]">Specialist</span>
          </div>
          <div className="uppercase">
            Dr Zahida Nasir
            <br />
            <span className="font-normal text-[9px]">MBBS</span>
          </div>
          <div className="uppercase">
            Dr Sadia Khalid
            <br />
            <span className="font-normal text-[9px] uppercase">MBBS FCPS</span>
          </div>
          <div>
            Dr.Mojibrahman "Behroz"
            <br />
            <span className="font-normal text-[9px]">
              skin, hair, and nails
              <br />
              cosmetic skin concerns
            </span>
          </div>
          <div>
            Dr Sahil Waquie
            <br />
            <span className="font-normal text-[9px]">General surgeon</span>
          </div>
        </div> */}

        <div className="flex justify-between text-xs font-semibold mb-2">
          <div>Offline: Print</div>
          <div>Page 1 of 1</div>
          <div>Print At : {dateTimeStr}</div>
        </div>

        <div className="flex justify-center space-x-6 text-xs text-black mb-1">
          <div className="flex items-center space-x-1">
            <span className="text-red-500">📍</span>
            {/* <span>91-A, Collage Block, Allama Iqbal Town, Lahore.</span> */}
          </div>
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
