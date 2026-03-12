export default function ReportGenerator() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Report</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Generated</th><th className="p-3 text-left">Format</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">Actions</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Q1 2025 Security Audit</td><td className="p-3">Comprehensive</td><td className="p-3">Mar 31, 2025</td><td className="p-3">PDF</td><td className="p-3">2.4 MB</td><td className="p-3">Download</td></tr>
<tr className="border-t"><td className="p-3">Monthly Vulnerability Summary</td><td className="p-3">Summary</td><td className="p-3">Mar 15, 2025</td><td className="p-3">PDF</td><td className="p-3">890 KB</td><td className="p-3">Download</td></tr>
<tr className="border-t"><td className="p-3">OWASP LLM Top 10 Compliance</td><td className="p-3">Compliance</td><td className="p-3">Mar 10, 2025</td><td className="p-3">PDF</td><td className="p-3">1.2 MB</td><td className="p-3">Download</td></tr>
<tr className="border-t"><td className="p-3">Incident Response Report #IR-23</td><td className="p-3">Incident</td><td className="p-3">Mar 5, 2025</td><td className="p-3">PDF</td><td className="p-3">456 KB</td><td className="p-3">Download</td></tr>
</tbody>
      </table></div>
    </div>);
}