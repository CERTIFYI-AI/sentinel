export default function HitlQueue() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Human-in-the-Loop Queue</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">Model Output</th><th className="p-3 text-left">Model</th><th className="p-3 text-left">Confidence</th><th className="p-3 text-left">Flagged Reason</th><th className="p-3 text-left">Assigned To</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">HITL-001</td><td className="p-3">Response about medical advice</td><td className="p-3">GPT-4o</td><td className="p-3">62%</td><td className="p-3">Low confidence + sensitive topic</td><td className="p-3">Alice</td></tr>
<tr className="border-t"><td className="p-3">HITL-002</td><td className="p-3">Financial prediction output</td><td className="p-3">Claude 3.5</td><td className="p-3">45%</td><td className="p-3">Below threshold</td><td className="p-3">Bob</td></tr>
<tr className="border-t"><td className="p-3">HITL-003</td><td className="p-3">Legal document summary</td><td className="p-3">Llama 3</td><td className="p-3">71%</td><td className="p-3">Sensitive domain</td><td className="p-3">Carol</td></tr>
<tr className="border-t"><td className="p-3">HITL-004</td><td className="p-3">Code with security implications</td><td className="p-3">GPT-4o</td><td className="p-3">58%</td><td className="p-3">Security flag</td><td className="p-3">Dave</td></tr>
</tbody>
      </table></div>
    </div>);
}