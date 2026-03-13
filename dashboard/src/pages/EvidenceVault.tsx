export default function EvidenceVault() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evidence Vault</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Document</th><th className="p-3 text-left">Framework</th><th className="p-3 text-left">Control</th><th className="p-3 text-left">Uploaded By</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">AI Ethics Policy v2.3</td><td className="p-3">NIST AI RMF</td><td className="p-3">CC-001</td><td className="p-3">Alice</td><td className="p-3">2h ago</td><td className="p-3">Verified</td></tr>
<tr className="border-t"><td className="p-3">DPIA Report 2025</td><td className="p-3">EU AI Act</td><td className="p-3">CC-002</td><td className="p-3">Bob</td><td className="p-3">1d ago</td><td className="p-3">Under Review</td></tr>
<tr className="border-t"><td className="p-3">Bias Audit Results</td><td className="p-3">ISO 42001</td><td className="p-3">CC-003</td><td className="p-3">Carol</td><td className="p-3">3d ago</td><td className="p-3">Verified</td></tr>
<tr className="border-t"><td className="p-3">Penetration Test Report</td><td className="p-3">SOC 2</td><td className="p-3">CC-007</td><td className="p-3">Dave</td><td className="p-3">1w ago</td><td className="p-3">Verified</td></tr>
</tbody>
      </table></div>
    </div>);
}