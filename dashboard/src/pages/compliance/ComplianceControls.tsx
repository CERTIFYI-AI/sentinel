export default function ComplianceControls() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Controls</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Control ID</th><th className="p-3 text-left">Control</th><th className="p-3 text-left">Framework</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Evidence</th><th className="p-3 text-left">Owner</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">CC-001</td><td className="p-3">AI Model Risk Assessment</td><td className="p-3">NIST AI RMF</td><td className="p-3">Implemented</td><td className="p-3">3 docs</td><td className="p-3">Alice</td></tr>
<tr className="border-t"><td className="p-3">CC-002</td><td className="p-3">Data Privacy Impact Assessment</td><td className="p-3">EU AI Act</td><td className="p-3">In Progress</td><td className="p-3">1 doc</td><td className="p-3">Bob</td></tr>
<tr className="border-t"><td className="p-3">CC-003</td><td className="p-3">Algorithmic Bias Testing</td><td className="p-3">ISO 42001</td><td className="p-3">Implemented</td><td className="p-3">5 docs</td><td className="p-3">Carol</td></tr>
<tr className="border-t"><td className="p-3">CC-004</td><td className="p-3">Incident Response Plan</td><td className="p-3">SOC 2 Type II</td><td className="p-3">Draft</td><td className="p-3">0 docs</td><td className="p-3">Dave</td></tr>
<tr className="border-t"><td className="p-3">CC-005</td><td className="p-3">Model Monitoring Procedures</td><td className="p-3">OWASP LLM</td><td className="p-3">Implemented</td><td className="p-3">2 docs</td><td className="p-3">Eve</td></tr>
</tbody>
      </table></div>
    </div>);
}