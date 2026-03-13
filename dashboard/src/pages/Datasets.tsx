export default function Datasets() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Records</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Created</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Safety Eval v3</td><td className="p-3">Evaluation</td><td className="p-3">12,450</td><td className="p-3">2.3 GB</td><td className="p-3">Jan 2025</td><td className="p-3">Active</td></tr>
<tr className="border-t"><td className="p-3">Bias Test Suite</td><td className="p-3">Fairness</td><td className="p-3">8,200</td><td className="p-3">1.1 GB</td><td className="p-3">Feb 2025</td><td className="p-3">Active</td></tr>
<tr className="border-t"><td className="p-3">Adversarial Prompts</td><td className="p-3">Red Team</td><td className="p-3">3,500</td><td className="p-3">450 MB</td><td className="p-3">Mar 2025</td><td className="p-3">Active</td></tr>
<tr className="border-t"><td className="p-3">Production Logs Q1</td><td className="p-3">Monitoring</td><td className="p-3">156,000</td><td className="p-3">8.7 GB</td><td className="p-3">Mar 2025</td><td className="p-3">Processing</td></tr>
</tbody>
      </table></div>
    </div>);
}