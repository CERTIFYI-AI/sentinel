export default function EvalTechniques() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluation Techniques</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Technique</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Models Tested</th><th className="p-3 text-left">Pass Rate</th><th className="p-3 text-left">Last Run</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">Adversarial Prompting</td><td className="p-3">Safety</td><td className="p-3">4</td><td className="p-3">87%</td><td className="p-3">2h ago</td><td className="p-3">Active</td></tr>
<tr className="border-t"><td className="p-3">Hallucination Detection</td><td className="p-3">Accuracy</td><td className="p-3">4</td><td className="p-3">91%</td><td className="p-3">6h ago</td><td className="p-3">Active</td></tr>
<tr className="border-t"><td className="p-3">Bias Benchmark Suite</td><td className="p-3">Fairness</td><td className="p-3">4</td><td className="p-3">94%</td><td className="p-3">1d ago</td><td className="p-3">Active</td></tr>
<tr className="border-t"><td className="p-3">Toxicity Screening</td><td className="p-3">Safety</td><td className="p-3">4</td><td className="p-3">98%</td><td className="p-3">1d ago</td><td className="p-3">Active</td></tr>
</tbody>
      </table></div>
    </div>);
}