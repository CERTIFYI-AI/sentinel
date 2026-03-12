export default function SecurityOverview() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security Overview</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Category</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Last Updated</th></tr></thead>
          <tbody>
          <tr className="border-t"><td className="p-3">Prompt Injection Defense</td><td className="p-3">87/100</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Good</span></td><td className="p-3">2 hours ago</td></tr>
          <tr className="border-t"><td className="p-3">Data Leakage Prevention</td><td className="p-3">72/100</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">Fair</span></td><td className="p-3">1 day ago</td></tr>
          <tr className="border-t"><td className="p-3">Model Access Control</td><td className="p-3">95/100</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Excellent</span></td><td className="p-3">3 hours ago</td></tr>
          <tr className="border-t"><td className="p-3">Adversarial Robustness</td><td className="p-3">68/100</td><td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Needs Work</span></td><td className="p-3">2 days ago</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}