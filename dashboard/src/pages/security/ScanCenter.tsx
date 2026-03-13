export default function ScanCenter() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scan Center</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#155A4B]">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm">
        <table className="w-full text-sm text-gray-900">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Scan Name</th><th className="p-3 text-left">Target</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Findings</th><th className="p-3 text-left">Last Run</th></tr></thead>
          <tbody>
          <tr className="border-t"><td className="p-3">GPT-4o Injection Test</td><td className="p-3">Production API</td><td className="p-3">Red Team</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Complete</span></td><td className="p-3">3</td><td className="p-3">2h ago</td></tr>
          <tr className="border-t"><td className="p-3">Claude Prompt Leak</td><td className="p-3">Staging</td><td className="p-3">Automated</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Complete</span></td><td className="p-3">1</td><td className="p-3">1d ago</td></tr>
          <tr className="border-t"><td className="p-3">Full Model Audit</td><td className="p-3">All Models</td><td className="p-3">Comprehensive</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Running</span></td><td className="p-3">0</td><td className="p-3">In progress</td></tr>
          <tr className="border-t"><td className="p-3">OWASP LLM Top 10</td><td className="p-3">Production</td><td className="p-3">Compliance</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">Scheduled</span></td><td className="p-3">-</td><td className="p-3">Tomorrow</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}