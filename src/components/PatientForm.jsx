export default function PatientForm({ patientDetails, setPatientDetails }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientDetails((prev) => ({ ...prev, [name]: value }));
  };

  const inp =
    "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-gray-800 placeholder-gray-400";

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-6 sm:mb-8 max-w-4xl transition-all duration-300 hover:shadow-md">
      {/* Title */}
      <div className="flex items-center space-x-3 mb-5 sm:mb-6">
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
            All fields are optional but improve report quality
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Patient Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-600">
            Patient Name
          </label>
          <input
            type="text"
            name="name"
            value={patientDetails.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            autoComplete="off"
            className={inp}
          />
        </div>

        {/* Age & Gender */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-600">
            Age & Gender
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              name="age"
              value={patientDetails.age}
              onChange={handleChange}
              placeholder="Age"
              min="0"
              max="150"
              className={`w-24 text-center ${inp}`}
            />
            <select
              name="gender"
              value={patientDetails.gender}
              onChange={handleChange}
              className={`flex-1 ${inp} cursor-pointer`}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {/* Gender indicator */}
          <div
            className={`flex items-center space-x-1 text-xs font-semibold ${
              patientDetails.gender === "Male"
                ? "text-blue-500"
                : patientDetails.gender === "Female"
                  ? "text-pink-500"
                  : "text-gray-400"
            }`}
          >
            <span>
              {patientDetails.gender === "Male"
                ? "♂"
                : patientDetails.gender === "Female"
                  ? "♀"
                  : "⊕"}
            </span>
            <span>
              Reference ranges will adjust to {patientDetails.gender} values
            </span>
          </div>
        </div>

        {/* MR Number */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-600">
            MR Number
          </label>
          <input
            type="text"
            name="mrNo"
            value={patientDetails.mrNo}
            onChange={handleChange}
            placeholder="e.g. MR-100234"
            autoComplete="off"
            className={`${inp} font-mono tracking-wider`}
          />
        </div>

        {/* Consulting Doctor */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-600">
            Consulting Doctor
          </label>
          <input
            type="text"
            name="consultant"
            value={patientDetails.consultant}
            onChange={handleChange}
            placeholder="e.g. Dr. Jane Smith"
            autoComplete="off"
            className={inp}
          />
        </div>
      </div>

      {/* Completeness bar */}
      {(() => {
        const filled = [
          patientDetails.name,
          patientDetails.age,
          patientDetails.mrNo,
          patientDetails.consultant,
        ].filter(Boolean).length;
        const pct = Math.round((filled / 4) * 100);
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
