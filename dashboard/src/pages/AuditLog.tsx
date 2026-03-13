export default function AuditLog() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Timestamp</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Resource</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">IP</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">2 min ago</td><td className="p-3">admin@certifyi.ai</td><td className="p-3">Updated</td><td className="p-3">Policy: AI Ethics v2.3</td><td className="p-3">Version bump</td><td className="p-3">192.168.1.1</td></tr>
<tr className="border-t"><td className="p-3">15 min ago</td><td className="p-3">alice@certifyi.ai</td><td className="p-3">Created</td><td className="p-3">Scan: GPT-4o Injection</td><td className="p-3">New scan initiated</td><td className="p-3">192.168.1.2</td></tr>
<tr className="border-t"><td className="p-3">1h ago</td><td className="p-3">bob@certifyi.ai</td><td className="p-3">Deleted</td><td className="p-3">Risk: RSK-006</td><td className="p-3">Duplicate removed</td><td className="p-3">192.168.1.3</td></tr>
<tr className="border-t"><td className="p-3">3h ago</td><td className="p-3">carol@certifyi.ai</td><td className="p-3">Approved</td><td className="p-3">Evidence: Bias Test Q1</td><td className="p-3">Review complete</td><td className="p-3">192.168.1.4</td></tr>
<tr className="border-t"><td className="p-3">6h ago</td><td className="p-3">admin@certifyi.ai</td><td className="p-3">Modified</td><td className="p-3">Control: CC-003</td><td className="p-3">Status changed</td><td className="p-3">192.168.1.1</td></tr>
</tbody>
      </table></div>
    </div>);
}