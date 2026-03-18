import { useState, useRef, useEffect } from "react";

export default function PatientForm({ patientDetails, setPatientDetails, templateGenders = [] }) {
  const [customGenders, setCustomGenders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("customGenders") || "[]");
    } catch {
      return [];
    }
  });

  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [genderInput, setGenderInput] = useState("");
  const genderRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (genderRef.current && !genderRef.current.contains(e.target)) {
        setIsGenderOpen(false);
        setGenderInput("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomGender = (e) => {
    if (e.key === "Enter" && genderInput.trim()) {
      e.preventDefault();
      const newG = genderInput.trim();
      const defaultG = ["Male", "Female", "Other"];
      if (!defaultG.includes(newG) && !customGenders.includes(newG)) {
        const updated = [...customGenders, newG];
        setCustomGenders(updated);
        localStorage.setItem("customGenders", JSON.stringify(updated));
      }
      setPatientDetails((prev) => ({ ...prev, gender: newG }));
      setGenderInput("");
      setIsGenderOpen(false);
    }
  };

  const handleDeleteCustomGender = (e, g) => {
    e.stopPropagation();
    const updated = customGenders.filter((cg) => cg !== g);
    setCustomGenders(updated);
    localStorage.setItem("customGenders", JSON.stringify(updated));
    if (patientDetails.gender === g) {
      setPatientDetails((prev) => ({ ...prev, gender: "Other" }));
    }
  };

  const inp =
    "w-full px-4 py-1.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-gray-800 placeholder-gray-400 text-sm shadow-xs hover:border-gray-300";

  const labelStyle = "text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-100 mb-6 sm:mb-8 max-w-4xl transition-all duration-300 hover:shadow-md">
      {/* Title */}
      <div className="flex items-center space-x-3 mb-3 sm:mb-4">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">
            Patient Information
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
            Patient Name is required; other fields improve report quality
          </p>
        </div>
      </div>
      <hr />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3">
        {/* Patient Name */}
        <div className="space-y-1">
          <label className={labelStyle}>Patient Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="name"
            value={patientDetails.name}
            onChange={handleChange}
            placeholder="Full Name"
            autoComplete="off"
            className={inp}
          />
        </div>

        {/* Father/Husband Name */}
        <div className="space-y-1">
          <label className={labelStyle}>S/O D/O W/O</label>
          <input
            type="text"
            name="fatherHusbandName"
            value={patientDetails.fatherHusbandName}
            onChange={handleChange}
            placeholder="Guardian Name"
            autoComplete="off"
            className={inp}
          />
        </div>

        {/* Age & Gender */}
        <div className="space-y-1">
          <label className={labelStyle}>Age & Gender</label>
          <div className="flex space-x-2 relative" ref={genderRef}>
            <input
              type="number"
              name="age"
              value={patientDetails.age}
              onChange={handleChange}
              placeholder="Age"
              className={`w-16 text-center ${inp} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            
            <div className={`flex-1 relative ${inp} cursor-pointer flex items-center justify-between p-0`}
                 onClick={() => setIsGenderOpen(!isGenderOpen)}>
              <div className="px-3 w-full h-full flex items-center select-none text-gray-700">
                {patientDetails.gender || "Gender"}
              </div>
              <div className="pr-2 text-gray-400">
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isGenderOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {isGenderOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-[250px] animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-gray-100 shrink-0">
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                      placeholder="Type custom & press Enter..."
                      value={genderInput}
                      onChange={(e) => setGenderInput(e.target.value)}
                      onKeyDown={handleAddCustomGender}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 p-1">
                    {/* Merge standard, local, and template genders */}
                    {(() => {
                      const standard = ["Male", "Female", "Other"];
                      // All unique custom labels (from props + local storage)
                      const combinedExtra = Array.from(new Set([...customGenders, ...templateGenders]))
                        .filter(g => !standard.includes(g));

                      return (
                        <>
                          {standard.map((g) => (
                            <div
                              key={g}
                              onClick={() => {
                                setPatientDetails((prev) => ({ ...prev, gender: g }));
                                setIsGenderOpen(false);
                              }}
                              className={`px-3 py-2 text-sm rounded-lg hover:bg-gray-50 cursor-pointer ${patientDetails.gender === g ? "bg-red-50 text-red-700 font-medium" : "text-gray-700"}`}
                            >
                              {g}
                            </div>
                          ))}
                          
                          {combinedExtra.length > 0 && (
                            <div className="my-1 border-t border-gray-100"></div>
                          )}

                          {combinedExtra.map((g) => {
                            const isPersistent = customGenders.includes(g);
                            return (
                              <div
                                key={g}
                                onClick={() => {
                                  setPatientDetails((prev) => ({ ...prev, gender: g }));
                                  setIsGenderOpen(false);
                                }}
                                className={`group px-3 py-2 text-sm rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between ${patientDetails.gender === g ? "bg-red-50 text-red-700 font-medium" : "text-gray-700"}`}
                              >
                                <span className="truncate pr-2">{g}</span>
                                {isPersistent && (
                                  <button
                                    onClick={(e) => handleDeleteCustomGender(e, g)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-all focus:outline-none"
                                    title="Remove custom gender"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Gender indicator */}
          <div
            className={`flex items-center space-x-1.5 px-1 pt-1 text-[10px] font-bold uppercase tracking-tight ${
              patientDetails.gender === "Male"
                ? "text-blue-500"
                : patientDetails.gender === "Female"
                  ? "text-pink-500"
                  : "text-gray-400"
            }`}
          >
            <span className="text-sm">
              {patientDetails.gender === "Male"
                ? "♂"
                : patientDetails.gender === "Female"
                  ? "♀"
                  : "⊕"}
            </span>
            <span className="leading-none opacity-80">
              Reference ranges: {patientDetails.gender || "Default"}
            </span>
          </div>
        </div>

        {/* MR Number */}
        <div className="space-y-1">
          <label className={labelStyle}>Patient / MR No</label>
          <input
            type="text"
            name="mrNo"
            value={patientDetails.mrNo}
            onChange={handleChange}
            placeholder="MRN-12345"
            className={`${inp} font-mono uppercase text-[11px] tracking-wider`}
          />
        </div>

        {/* T/R ID */}
        <div className="space-y-1">
          <label className={labelStyle}>T/R ID</label>
          <input
            type="text"
            name="trId"
            value={patientDetails.trId || ""}
            onChange={handleChange}
            placeholder="TR-ID"
            className={`${inp} font-mono uppercase text-[11px] tracking-wider`}
          />
        </div>

        {/* T/R No */}
        <div className="space-y-1">
          <label className={labelStyle}>T/R Number</label>
          <input
            type="text"
            name="trNo"
            value={patientDetails.trNo || ""}
            onChange={handleChange}
            placeholder="TR-TRACKING-NUMBER"
            className={`${inp} font-mono uppercase text-[11px] tracking-wider`}
          />
        </div>

        {/* Consulting Doctor */}
        <div className="space-y-1">
          <label className={labelStyle}>Consulting Doctor</label>
          <input
            type="text"
            name="consultant"
            value={patientDetails.consultant}
            onChange={handleChange}
            placeholder="Dr. Name"
            className={inp}
          />
        </div>

        {/* Contact No */}
        <div className="space-y-1">
          <label className={labelStyle}>Contact Number</label>
          <input
            type="tel"
            name="contactNo"
            value={patientDetails.contactNo}
            onChange={handleChange}
            placeholder="+92 XXX XXXXXXX"
            className={inp}
          />
        </div>

        {/* Registration Location */}
        <div className="space-y-1">
          <label className={labelStyle}>Reg. Location</label>
          <input
            type="text"
            name="registrationLocation"
            value={patientDetails.registrationLocation || ""}
            onChange={handleChange}
            placeholder="Lab Branch"
            className={inp}
          />
        </div>

        {/* Address */}
        <div className="lg:col-span-2 space-y-1">
          <label className={labelStyle}>Address</label>
          <input
            type="text"
            name="address"
            value={patientDetails.address}
            onChange={handleChange}
            placeholder="Street Address, City"
            className={inp}
          />
        </div>

        {/* Reference */}
        <div className="space-y-1">
          <label className={labelStyle}>Reference</label>
          <input
            type="text"
            name="reference"
            value={patientDetails.reference}
            onChange={handleChange}
            placeholder="Reference/Walk-in"
            className={inp}
          />
        </div>

        {/* Sample Location */}
        <div className="space-y-1">
          <label className={labelStyle}>Sample Location</label>
          <input
            type="text"
            name="sampleLocation"
            value={patientDetails.sampleLocation}
            onChange={handleChange}
            placeholder="Location"
            className={inp}
          />
        </div>

        {/* Specimen */}
        <div className="space-y-1">
          <label className={labelStyle}>Specimen</label>
          <input
            type="text"
            name="specimen"
            value={patientDetails.specimen || ""}
            onChange={handleChange}
            placeholder="Blood, Urine, etc."
            className={inp}
          />
        </div>
      </div>{/* /grid */}

      {/* Completeness bar */}
      {(() => {
        const filled = [
          patientDetails.name,
          patientDetails.age,
          patientDetails.mrNo,
          patientDetails.trId,
          patientDetails.trNo,
          patientDetails.consultant,
        ].filter(Boolean).length;
        const pct = Math.round((filled / 6) * 100);
        return pct < 100 ? (
          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">
                Form completeness
              </span>
              <span className="text-xs font-bold text-gray-500">{pct}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-linear-to-r from-red-500 to-rose-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
