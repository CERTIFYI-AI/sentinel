export default function VulnTracker() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vulnerability Tracker</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">Vulnerability</th><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Component</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Assignee</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">VLN-001</td><td className="p-3">Prompt injection in chat endpoint</td><td className="p-3">Critical</td><td className="p-3">Chat API</td><td className="p-3">Open</td><td className="p-3">Alice</td></tr>
<tr className="border-t"><td className="p-3">VLN-002</td><td className="p-3">Model output data leak</td><td className="p-3">High</td><td className="p-3">Model Server</td><td className="p-3">In Progress</td><td className="p-3">Bob</td></tr>
<tr className="border-t"><td className="p-3">VLN-003</td><td className="p-3">Weak input sanitization</td><td className="p-3">Medium</td><td className="p-3">Input Layer</td><td className="p-3">Resolved</td><td className="p-3">Carol</td></tr>
<tr className="border-t"><td className="p-3">VLN-004</td><td className="p-3">Rate limiting bypass</td><td className="p-3">High</td><td className="p-3">API Gateway</td><td className="p-3">Open</td><td className="p-3">Dave</td></tr>
</tbody>
      </table></div>
    </div>);
}