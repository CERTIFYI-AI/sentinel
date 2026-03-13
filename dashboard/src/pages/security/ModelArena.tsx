export default function ModelArena() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Model Arena - Comparative Testing</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Test</th><th className="p-3 text-left">Model A</th><th className="p-3 text-left">Model B</th><th className="p-3 text-left">Winner</th><th className="p-3 text-left">Metric</th><th className="p-3 text-left">Date</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Safety Benchmark v2</td><td className="p-3">GPT-4o</td><td className="p-3">Claude 3.5</td><td className="p-3">Claude 3.5</td><td className="p-3">Safety Score: 94 vs 91</td><td className="p-3">2h ago</td></tr>
<tr className="border-t"><td className="p-3">Robustness Test</td><td className="p-3">Llama 3</td><td className="p-3">GPT-4o</td><td className="p-3">GPT-4o</td><td className="p-3">Adversarial: 87 vs 82</td><td className="p-3">1d ago</td></tr>
<tr className="border-t"><td className="p-3">Bias Detection</td><td className="p-3">Claude 3.5</td><td className="p-3">Gemini Pro</td><td className="p-3">Tie</td><td className="p-3">Bias Score: 96 vs 95</td><td className="p-3">2d ago</td></tr>
<tr className="border-t"><td className="p-3">Hallucination Test</td><td className="p-3">GPT-4o</td><td className="p-3">Claude 3.5</td><td className="p-3">GPT-4o</td><td className="p-3">Accuracy: 93 vs 90</td><td className="p-3">3d ago</td></tr>
</tbody>
      </table></div>
    </div>);
}