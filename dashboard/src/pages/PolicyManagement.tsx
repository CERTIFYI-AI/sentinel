export default function PolicyManagement() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policy Management</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Policy</th><th className="p-3 text-left">Version</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Last Updated</th><th className="p-3 text-left">Owner</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">AI Ethics Policy</td><td className="p-3">v2.3</td><td className="p-3">Ethics</td><td className="p-3">Active</td><td className="p-3">2h ago</td><td className="p-3">Alice</td></tr>
<tr className="border-t"><td className="p-3">Data Retention Policy</td><td className="p-3">v1.5</td><td className="p-3">Data</td><td className="p-3">Active</td><td className="p-3">1d ago</td><td className="p-3">Bob</td></tr>
<tr className="border-t"><td className="p-3">Model Deployment Policy</td><td className="p-3">v3.0</td><td className="p-3">Operations</td><td className="p-3">Under Review</td><td className="p-3">3d ago</td><td className="p-3">Carol</td></tr>
<tr className="border-t"><td className="p-3">Incident Response Policy</td><td className="p-3">v1.2</td><td className="p-3">Security</td><td className="p-3">Active</td><td className="p-3">1w ago</td><td className="p-3">Dave</td></tr>
<tr className="border-t"><td className="p-3">Third-Party AI Vendor Policy</td><td className="p-3">v1.0</td><td className="p-3">Vendor</td><td className="p-3">Draft</td><td className="p-3">2w ago</td><td className="p-3">Eve</td></tr>
</tbody>
      </table></div>
    </div>);
}