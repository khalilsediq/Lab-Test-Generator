export default function PatientForm({ patientDetails, setPatientDetails }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-4xl transition-all duration-300 hover:shadow-md">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
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
            ></path>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">Patient Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">
            Patient Name
          </label>
          <input
            type="text"
            name="name"
            value={patientDetails.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">
            Age & Gender
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              name="age"
              value={patientDetails.age}
              onChange={handleChange}
              placeholder="e.g. 45"
              className="w-24 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
            />
            <select
              name="gender"
              value={patientDetails.gender}
              onChange={handleChange}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-gray-700"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">
            MR Number
          </label>
          <input
            type="text"
            name="mrNo"
            value={patientDetails.mrNo}
            onChange={handleChange}
            placeholder="e.g. MR-100234"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-gray-700 font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">
            Consulting Doctor
          </label>
          <input
            type="text"
            name="consultant"
            value={patientDetails.consultant}
            onChange={handleChange}
            placeholder="e.g. Dr. Jane Smith"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
          />
        </div>
      </div>
    </div>
  );
}
