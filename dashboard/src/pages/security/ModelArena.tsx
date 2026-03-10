import { useState } from 'react';
import { deterministicScore, scoreLabel } from '../../lib/compliance/heatmapUtils';

const MODELS = [
  'GPT-4o', 'GPT-4o-mini', 'GPT-3.5-turbo', 'Claude 3.5 Sonnet', 'Claude 3 Haiku',
  'Gemini 1.5 Pro', 'Gemini Flash', 'Llama 3.1 70B', 'Mistral Large',
  'DeepSeek-V3', 'Qwen 2.5 72B', 'Mixtral 8x7B',
] as const;

const DIMENSIONS = [
  { name: 'Security Resistance', inverted: false },
  { name: 'Hallucination Rate', inverted: true },
  { name: 'Instruction Following', inverted: false },
  { name: 'Context Window Utilisation', inverted: false },
  { name: 'Latency Score', inverted: false },
  { name: 'Cost Efficiency', inverted: false },
  { name: 'Factual Accuracy', inverted: false },
] as const;

function pillClass(level: 'pass' | 'warn' | 'fail'): string {
  switch (level) {
    case 'pass': return 'bg-[var(--pass-bg)] text-[var(--pass-text)] border border-[var(--pass-border)]';
    case 'warn': return 'bg-[var(--warn-bg)] text-[var(--warn-text)] border border-[var(--warn-border)]';
    case 'fail': return 'bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]';
  }
}

export default function ModelArena() {
  const [modelA, setModelA] = useState<string>('GPT-4o');
  const [modelB, setModelB] = useState<string>('Claude 3.5 Sonnet');

  let sumA = 0;
  let sumB = 0;
  const rows = DIMENSIONS.map((dim) => {
    const scoreA = deterministicScore(modelA + dim.name);
    const scoreB = deterministicScore(modelB + dim.name);
    const effectiveA = dim.inverted ? (100 - scoreA) : scoreA;
    const effectiveB = dim.inverted ? (100 - scoreB) : scoreB;
    sumA += effectiveA;
    sumB += effectiveB;
    return { dim, scoreA: effectiveA, scoreB: effectiveB };
  });

  const winner = sumA > sumB ? 'A' : sumB > sumA ? 'B' : 'Tie';
  const winnerClass = winner === 'A' || winner === 'B' ? (winner === 'A' ? 'bg-[var(--pass-bg)] text-[var(--pass-text)] border border-[var(--pass-border)]' : 'bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]') : 'bg-[var(--warn-bg)] text-[var(--warn-text)] border border-[var(--warn-border)]';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Outfit' }}>Model Intelligence Arena</h1>
        <div className="flex items-center gap-3 ml-auto">
          <select
            value={modelA}
            onChange={(e) => setModelA(e.target.value)}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-white" style={{ fontFamily: 'Outfit' }}
          >
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="text-sm font-medium" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>vs</span>
          <select
            value={modelB}
            onChange={(e) => setModelB(e.target.value)}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-white" style={{ fontFamily: 'Outfit' }}
          >
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="border border-[var(--border)] rounded-lg">
        <table className="w-full text-sm" style={{ fontFamily: 'Outfit' }}>
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Dimension</th>
              <th className="text-center p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>{modelA}</th>
              <th className="text-center p-3 font-medium w-12" style={{ color: 'var(--muted-foreground)' }}></th>
              <th className="text-center p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>{modelB}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ dim, scoreA, scoreB }) => (
              <tr key={dim.name} className="border-b border-[var(--border)]">
                <td className="p-3 font-medium">
                  {dim.name}
                  {dim.inverted && <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>(lower=better)</span>}
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${pillClass(scoreLabel(dim.inverted ? (100 - scoreA) : scoreA))}`}>
                    {scoreA}
                  </span>
                </td>
                <td className="p-3 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>vs</td>
                <td className="p-3 text-center">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${pillClass(scoreLabel(dim.inverted ? (100 - scoreB) : scoreB))}`}>
                    {scoreB}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <span className={`px-4 py-2 text-sm font-semibold rounded-md ${winnerClass}`} style={{ fontFamily: 'Outfit' }}>
          {winner === 'Tie' ? 'Tie' : winner === 'A' ? `${modelA} Wins` : `${modelB} Wins`}
        </span>
      </div>
    </div>
  );
}