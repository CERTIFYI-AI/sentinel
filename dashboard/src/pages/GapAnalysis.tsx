export default function GapAnalysis() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gap Analysis</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Framework</th><th className="p-3 text-left">Requirement</th><th className="p-3 text-left">Current State</th><th className="p-3 text-left">Target State</th><th className="p-3 text-left">Gap</th><th className="p-3 text-left">Priority</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">EU AI Act</td><td className="p-3">Risk Management System</td><td className="p-3">Partial</td><td className="p-3">Full</td><td className="p-3">40%</td><td className="p-3">High</td></tr>
<tr className="border-t"><td className="p-3">NIST AI RMF</td><td className="p-3">Continuous Monitoring</td><td className="p-3">Basic</td><td className="p-3">Advanced</td><td className="p-3">35%</td><td className="p-3">High</td></tr>
<tr className="border-t"><td className="p-3">ISO 42001</td><td className="p-3">Documentation</td><td className="p-3">Partial</td><td className="p-3">Complete</td><td className="p-3">25%</td><td className="p-3">Medium</td></tr>
<tr className="border-t"><td className="p-3">SOC 2 Type II</td><td className="p-3">Access Controls</td><td className="p-3">Good</td><td className="p-3">Excellent</td><td className="p-3">15%</td><td className="p-3">Low</td></tr>
</tbody>
      </table></div>
    </div>);
}