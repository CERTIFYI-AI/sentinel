export default function ComplianceDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Framework</th><th className="p-3 text-left">Total Controls</th><th className="p-3 text-left">Implemented</th><th className="p-3 text-left">In Progress</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">NIST AI RMF</td><td className="p-3">93</td><td className="p-3">72</td><td className="p-3">15</td><td className="p-3">77%</td><td className="p-3">In Progress</td></tr>
<tr className="border-t"><td className="p-3">ISO 42001</td><td className="p-3">24</td><td className="p-3">18</td><td className="p-3">4</td><td className="p-3">75%</td><td className="p-3">In Progress</td></tr>
<tr className="border-t"><td className="p-3">EU AI Act</td><td className="p-3">85</td><td className="p-3">45</td><td className="p-3">25</td><td className="p-3">53%</td><td className="p-3">In Progress</td></tr>
<tr className="border-t"><td className="p-3">OWASP LLM Top 10</td><td className="p-3">10</td><td className="p-3">8</td><td className="p-3">2</td><td className="p-3">80%</td><td className="p-3">Complete</td></tr>
<tr className="border-t"><td className="p-3">SOC 2 Type II</td><td className="p-3">120</td><td className="p-3">64</td><td className="p-3">32</td><td className="p-3">53%</td><td className="p-3">In Progress</td></tr>
</tbody>
      </table></div>
    </div>);
}