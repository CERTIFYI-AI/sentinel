export default function ThreatFeed() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Threat Intelligence Feed</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#155A4B]">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm">
        <table className="w-full text-sm text-gray-900">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Threat</th><th className="p-3 text-left">Source</th><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Detected</th><th className="p-3 text-left">Status</th></tr></thead>
          <tbody>
          <tr className="border-t"><td className="p-3">Prompt injection via markdown</td><td className="p-3">OWASP</td><td className="p-3"><span className="text-red-600 font-medium">Critical</span></td><td className="p-3">2h ago</td><td className="p-3">Active</td></tr>
          <tr className="border-t"><td className="p-3">Training data poisoning</td><td className="p-3">MITRE ATLAS</td><td className="p-3"><span className="text-amber-600 font-medium">High</span></td><td className="p-3">6h ago</td><td className="p-3">Monitoring</td></tr>
          <tr className="border-t"><td className="p-3">Model weight exfiltration</td><td className="p-3">Internal</td><td className="p-3"><span className="text-amber-600 font-medium">High</span></td><td className="p-3">1d ago</td><td className="p-3">Mitigated</td></tr>
          <tr className="border-t"><td className="p-3">Adversarial suffix attack</td><td className="p-3">Research</td><td className="p-3"><span className="text-blue-600 font-medium">Medium</span></td><td className="p-3">2d ago</td><td className="p-3">Active</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}