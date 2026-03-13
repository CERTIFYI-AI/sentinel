export default function PolicyFirewall() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policy Firewall</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Rule</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Matches (24h)</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Priority</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Block prompt injection patterns</td><td className="p-3">Input Filter</td><td className="p-3">Block</td><td className="p-3">234</td><td className="p-3">Active</td><td className="p-3">Critical</td></tr>
<tr className="border-t"><td className="p-3">PII detection and masking</td><td className="p-3">Output Filter</td><td className="p-3">Mask</td><td className="p-3">89</td><td className="p-3">Active</td><td className="p-3">High</td></tr>
<tr className="border-t"><td className="p-3">Rate limit per user</td><td className="p-3">Rate Limit</td><td className="p-3">Throttle</td><td className="p-3">1,203</td><td className="p-3">Active</td><td className="p-3">Medium</td></tr>
<tr className="border-t"><td className="p-3">Block known adversarial suffixes</td><td className="p-3">Input Filter</td><td className="p-3">Block</td><td className="p-3">12</td><td className="p-3">Active</td><td className="p-3">High</td></tr>
</tbody>
      </table></div>
    </div>);
}