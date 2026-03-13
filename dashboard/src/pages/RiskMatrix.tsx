export default function RiskMatrix() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Risk Matrix</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Risk ID</th><th className="p-3 text-left">Risk</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Likelihood</th><th className="p-3 text-left">Impact</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">RSK-001</td><td className="p-3">Training data poisoning</td><td className="p-3">Data</td><td className="p-3">Medium</td><td className="p-3">High</td><td className="p-3">12</td><td className="p-3">Open</td></tr>
<tr className="border-t"><td className="p-3">RSK-002</td><td className="p-3">Model hallucination in production</td><td className="p-3">Accuracy</td><td className="p-3">High</td><td className="p-3">High</td><td className="p-3">16</td><td className="p-3">Mitigating</td></tr>
<tr className="border-t"><td className="p-3">RSK-003</td><td className="p-3">Vendor data retention</td><td className="p-3">Privacy</td><td className="p-3">Low</td><td className="p-3">High</td><td className="p-3">8</td><td className="p-3">Resolved</td></tr>
<tr className="border-t"><td className="p-3">RSK-004</td><td className="p-3">Adversarial attacks on API</td><td className="p-3">Security</td><td className="p-3">Medium</td><td className="p-3">Medium</td><td className="p-3">9</td><td className="p-3">Open</td></tr>
<tr className="border-t"><td className="p-3">RSK-005</td><td className="p-3">Regulatory non-compliance</td><td className="p-3">Legal</td><td className="p-3">Low</td><td className="p-3">Critical</td><td className="p-3">10</td><td className="p-3">Monitoring</td></tr>
</tbody>
      </table></div>
    </div>);
}