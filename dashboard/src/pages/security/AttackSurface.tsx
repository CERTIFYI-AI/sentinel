export default function AttackSurface() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attack Surface Analysis</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Asset</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Risk Level</th><th className="p-3 text-left">Exposure</th><th className="p-3 text-left">Last Scanned</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Production API Gateway</td><td className="p-3">API Endpoint</td><td className="p-3">High</td><td className="p-3">Public</td><td className="p-3">2h ago</td></tr>
<tr className="border-t"><td className="p-3">Model Serving Cluster</td><td className="p-3">Infrastructure</td><td className="p-3">Medium</td><td className="p-3">Internal</td><td className="p-3">1d ago</td></tr>
<tr className="border-t"><td className="p-3">Training Data Pipeline</td><td className="p-3">Data</td><td className="p-3">High</td><td className="p-3">Internal</td><td className="p-3">3d ago</td></tr>
<tr className="border-t"><td className="p-3">User Auth Service</td><td className="p-3">API Endpoint</td><td className="p-3">Low</td><td className="p-3">Public</td><td className="p-3">6h ago</td></tr>
</tbody>
      </table></div>
    </div>);
}