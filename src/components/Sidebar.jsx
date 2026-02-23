import logo from "../assets/images/Logo.png";

export default function Sidebar({
  selectedTest,
  setSelectedTest,
  testTemplates,
}) {
  return (
    <div className="w-72 bg-gray-900 text-white min-h-screen p-6 shadow-2xl flex flex-col">
      <div className="flex justify-center mb-8 bg-white p-3 rounded-2xl shadow-lg ring ring-red-500/20">
        <img
          src={logo}
          alt="Bukhari Lab Logo"
          className="w-full h-auto object-contain rounded"
        />
      </div>

      <div className="uppercase text-xs font-semibold text-gray-500 tracking-wider mb-4">
        Available Tests
      </div>

      <nav className="flex-1 space-y-2">
        {testTemplates.map((test) => (
          <button
            key={test.panel_id}
            onClick={() => setSelectedTest(test.panel_id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
              selectedTest === test.panel_id
                ? "bg-red-600/20 text-red-400 bg-linear-to-r from-red-600/20 to-transparent border-l-4 border-red-500 shadow-inner"
                : "text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
            }`}
          >
            {test.panel_name} ({test.panel_id})
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-800 text-sm text-gray-500">
        <p>Bukhari Lab System © 2026</p>
        <p className="text-xs mt-1">Version 1.0.0</p>
      </div>
    </div>
  );
}
