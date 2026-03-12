export default function EvidenceHub() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evidence Hub</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Evidence</th><th className="p-3 text-left">Control</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Uploaded</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">AI Ethics Policy v2.3</td><td className="p-3">CC-001</td><td className="p-3">Policy Document</td><td className="p-3">2h ago</td><td className="p-3">1.2 MB</td><td className="p-3">Approved</td></tr>
<tr className="border-t"><td className="p-3">Bias Test Results Q1</td><td className="p-3">CC-003</td><td className="p-3">Test Report</td><td className="p-3">1d ago</td><td className="p-3">890 KB</td><td className="p-3">Under Review</td></tr>
<tr className="border-t"><td className="p-3">DPIA for Chat Model</td><td className="p-3">CC-002</td><td className="p-3">Assessment</td><td className="p-3">3d ago</td><td className="p-3">2.1 MB</td><td className="p-3">Approved</td></tr>
<tr className="border-t"><td className="p-3">Incident Playbook v1</td><td className="p-3">CC-004</td><td className="p-3">Procedure</td><td className="p-3">1w ago</td><td className="p-3">456 KB</td><td className="p-3">Draft</td></tr>
</tbody>
      </table></div>
    </div>);
}