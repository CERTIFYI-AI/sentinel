export default function IncidentLog() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incident Log</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">Incident</th><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Model</th><th className="p-3 text-left">Reported</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Assignee</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">INC-001</td><td className="p-3">Hallucination in customer-facing bot</td><td className="p-3">High</td><td className="p-3">GPT-4o</td><td className="p-3">2d ago</td><td className="p-3">Investigating</td><td className="p-3">Alice</td></tr>
<tr className="border-t"><td className="p-3">INC-002</td><td className="p-3">PII leak in model output</td><td className="p-3">Critical</td><td className="p-3">Claude 3.5</td><td className="p-3">5d ago</td><td className="p-3">Resolved</td><td className="p-3">Bob</td></tr>
<tr className="border-t"><td className="p-3">INC-003</td><td className="p-3">Bias detected in hiring assistant</td><td className="p-3">High</td><td className="p-3">Llama 3</td><td className="p-3">1w ago</td><td className="p-3">Mitigated</td><td className="p-3">Carol</td></tr>
<tr className="border-t"><td className="p-3">INC-004</td><td className="p-3">Prompt injection successful</td><td className="p-3">Medium</td><td className="p-3">GPT-4o</td><td className="p-3">2w ago</td><td className="p-3">Resolved</td><td className="p-3">Dave</td></tr>
</tbody>
      </table></div>
    </div>);
}