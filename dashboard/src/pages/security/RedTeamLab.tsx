export default function RedTeamLab() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Red Team Lab</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Campaign</th><th className="p-3 text-left">Target Model</th><th className="p-3 text-left">Technique</th><th className="p-3 text-left">Success Rate</th><th className="p-3 text-left">Findings</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Jailbreak Campaign v3</td><td className="p-3">GPT-4o</td><td className="p-3">Multi-turn manipulation</td><td className="p-3">23%</td><td className="p-3">7</td><td className="p-3">Complete</td></tr>
<tr className="border-t"><td className="p-3">Data Extraction Test</td><td className="p-3">Claude 3.5</td><td className="p-3">System prompt leak</td><td className="p-3">12%</td><td className="p-3">3</td><td className="p-3">Complete</td></tr>
<tr className="border-t"><td className="p-3">Adversarial Inputs</td><td className="p-3">Llama 3</td><td className="p-3">Token manipulation</td><td className="p-3">8%</td><td className="p-3">2</td><td className="p-3">Running</td></tr>
<tr className="border-t"><td className="p-3">Social Engineering</td><td className="p-3">All Models</td><td className="p-3">Role-play bypass</td><td className="p-3">31%</td><td className="p-3">9</td><td className="p-3">Scheduled</td></tr>
</tbody>
      </table></div>
    </div>);
}