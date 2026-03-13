export default function Benchmark() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Benchmarks</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Benchmark</th><th className="p-3 text-left">Models</th><th className="p-3 text-left">Avg Score</th><th className="p-3 text-left">Best Model</th><th className="p-3 text-left">Last Run</th><th className="p-3 text-left">Status</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">MMLU</td><td className="p-3">4</td><td className="p-3">87.3%</td><td className="p-3">GPT-4o (92.1%)</td><td className="p-3">2h ago</td><td className="p-3">Complete</td></tr>
<tr className="border-t"><td className="p-3">HellaSwag</td><td className="p-3">4</td><td className="p-3">91.2%</td><td className="p-3">Claude 3.5 (94.8%)</td><td className="p-3">6h ago</td><td className="p-3">Complete</td></tr>
<tr className="border-t"><td className="p-3">TruthfulQA</td><td className="p-3">4</td><td className="p-3">78.5%</td><td className="p-3">GPT-4o (83.2%)</td><td className="p-3">1d ago</td><td className="p-3">Complete</td></tr>
<tr className="border-t"><td className="p-3">HumanEval</td><td className="p-3">4</td><td className="p-3">82.1%</td><td className="p-3">Claude 3.5 (86.4%)</td><td className="p-3">1d ago</td><td className="p-3">Complete</td></tr>
</tbody>
      </table></div>
    </div>);
}