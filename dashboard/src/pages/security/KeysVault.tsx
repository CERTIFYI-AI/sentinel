export default function KeysVault() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Keys Vault</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Key Name</th><th className="p-3 text-left">Service</th><th className="p-3 text-left">Created</th><th className="p-3 text-left">Last Used</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Permissions</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">prod-openai-key</td><td className="p-3">OpenAI API</td><td className="p-3">Jan 15, 2025</td><td className="p-3">2 hours ago</td><td className="p-3">Active</td><td className="p-3">Read/Write</td></tr>
<tr className="border-t"><td className="p-3">staging-anthropic</td><td className="p-3">Anthropic API</td><td className="p-3">Feb 1, 2025</td><td className="p-3">1 day ago</td><td className="p-3">Active</td><td className="p-3">Read Only</td></tr>
<tr className="border-t"><td className="p-3">dev-huggingface</td><td className="p-3">HuggingFace</td><td className="p-3">Dec 10, 2024</td><td className="p-3">1 week ago</td><td className="p-3">Active</td><td className="p-3">Read Only</td></tr>
<tr className="border-t"><td className="p-3">old-cohere-key</td><td className="p-3">Cohere API</td><td className="p-3">Jun 5, 2024</td><td className="p-3">3 months ago</td><td className="p-3">Expired</td><td className="p-3">N/A</td></tr>
</tbody>
      </table></div>
    </div>);
}