export default function Sidebar({
  selectedTest,
  setSelectedTest,
  testTemplates,
}) {
  return (
    <div className="w-72 bg-gray-900 text-white min-h-screen p-6 shadow-2xl flex flex-col">
      <div className="flex items-center space-x-3 mb-10">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ring ring-blue-500/30">
          L
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          LabGen
        </h1>
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
                ? "bg-blue-600/20 text-blue-400 bg-gradient-to-r from-blue-600/20 to-transparent border-l-4 border-blue-500 shadow-inner"
                : "text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
            }`}
          >
            {test.panel_name} ({test.panel_id})
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-800 text-sm text-gray-500">
        <p>LabGen System © 2026</p>
        <p className="text-xs mt-1">Version 1.0.0</p>
      </div>
    </div>
  );
}
