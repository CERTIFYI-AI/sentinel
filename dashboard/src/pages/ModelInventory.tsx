export default function ModelInventory() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Model Inventory</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Model</th><th className="p-3 text-left">Provider</th><th className="p-3 text-left">Version</th><th className="p-3 text-left">Environment</th><th className="p-3 text-left">Risk Level</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Last Assessed</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">GPT-4o</td><td className="p-3">OpenAI</td><td className="p-3">2024-05-13</td><td className="p-3">Production</td><td className="p-3">Medium</td><td className="p-3">Active</td><td className="p-3">2h ago</td></tr>
<tr className="border-t"><td className="p-3">Claude 3.5 Sonnet</td><td className="p-3">Anthropic</td><td className="p-3">2024-06-20</td><td className="p-3">Production</td><td className="p-3">Low</td><td className="p-3">Active</td><td className="p-3">4h ago</td></tr>
<tr className="border-t"><td className="p-3">Llama 3 70B</td><td className="p-3">Meta</td><td className="p-3">v3.0</td><td className="p-3">Staging</td><td className="p-3">Medium</td><td className="p-3">Testing</td><td className="p-3">1d ago</td></tr>
<tr className="border-t"><td className="p-3">Gemini Pro</td><td className="p-3">Google</td><td className="p-3">1.5</td><td className="p-3">Development</td><td className="p-3">Low</td><td className="p-3">Active</td><td className="p-3">2d ago</td></tr>
<tr className="border-t"><td className="p-3">Mistral Large</td><td className="p-3">Mistral AI</td><td className="p-3">v2</td><td className="p-3">Retired</td><td className="p-3">N/A</td><td className="p-3">Inactive</td><td className="p-3">1m ago</td></tr>
</tbody>
      </table></div>
    </div>);
}