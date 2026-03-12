export default function ExportCenter() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export Center</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Report</th><th className="p-3 text-left">Format</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Generated</th><th className="p-3 text-left">Requested By</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Full Compliance Report Q1</td><td className="p-3">PDF</td><td className="p-3">4.2 MB</td><td className="p-3">2h ago</td><td className="p-3">Admin</td><td className="p-3">Ready</td></tr>
<tr className="border-t"><td className="p-3">Risk Assessment Summary</td><td className="p-3">Excel</td><td className="p-3">1.8 MB</td><td className="p-3">1d ago</td><td className="p-3">Alice</td><td className="p-3">Ready</td></tr>
<tr className="border-t"><td className="p-3">Security Scan Results</td><td className="p-3">CSV</td><td className="p-3">890 KB</td><td className="p-3">2d ago</td><td className="p-3">Bob</td><td className="p-3">Ready</td></tr>
<tr className="border-t"><td className="p-3">Model Inventory Export</td><td className="p-3">JSON</td><td className="p-3">2.1 MB</td><td className="p-3">3d ago</td><td className="p-3">Carol</td><td className="p-3">Ready</td></tr>
</tbody>
      </table></div>
    </div>);
}