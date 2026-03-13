export default function QualityMetrics() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quality Metrics</h1>
        <button className="bg-[#1A6B5A] text-white px-4 py-2 rounded-lg text-sm">+ Add New</button>
      </div>
      <div className="bg-white rounded-xl border shadow-sm"><table className="w-full text-sm text-gray-900">
        <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3 text-left">Model</th><th className="p-3 text-left">Accuracy</th><th className="p-3 text-left">Latency</th><th className="p-3 text-left">Throughput</th><th className="p-3 text-left">Bias Score</th><th className="p-3 text-left">Last Eval</th></tr></thead>
        <tbody><tr className="border-t"><td className="p-3">GPT-4o</td><td className="p-3">94.2%</td><td className="p-3">120ms</td><td className="p-3">850 req/s</td><td className="p-3">96/100</td><td className="p-3">2h ago</td></tr>
<tr className="border-t"><td className="p-3">Claude 3.5 Sonnet</td><td className="p-3">93.8%</td><td className="p-3">95ms</td><td className="p-3">920 req/s</td><td className="p-3">97/100</td><td className="p-3">4h ago</td></tr>
<tr className="border-t"><td className="p-3">Llama 3 70B</td><td className="p-3">89.1%</td><td className="p-3">180ms</td><td className="p-3">450 req/s</td><td className="p-3">91/100</td><td className="p-3">1d ago</td></tr>
<tr className="border-t"><td className="p-3">Gemini Pro</td><td className="p-3">91.5%</td><td className="p-3">110ms</td><td className="p-3">780 req/s</td><td className="p-3">94/100</td><td className="p-3">1d ago</td></tr>
</tbody>
      </table></div>
    </div>);
}