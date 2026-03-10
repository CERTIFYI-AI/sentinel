import { deterministicScore, scoreLabel } from '../../lib/compliance/heatmapUtils';

interface Metric {
  name: string;
  description: string;
  threshold: number;
}

const METRICS: Metric[] = [
  { name: 'G-Eval', description: 'General evaluation using LLM-as-judge with chain-of-thought scoring', threshold: 0.75 },
  { name: 'Pi Scorer', description: 'Measures response precision and informativeness against ground truth', threshold: 0.70 },
  { name: 'Conversation Relevance', description: 'Evaluates topical coherence across multi-turn dialogues', threshold: 0.80 },
  { name: 'Context Faithfulness', description: 'Checks whether responses stay grounded in provided context', threshold: 0.85 },
  { name: 'Context Recall', description: 'Measures coverage of relevant context in the generated response', threshold: 0.75 },
  { name: 'Context Relevance', description: 'Assesses if retrieved context is pertinent to the query', threshold: 0.78 },
  { name: 'Answer Relevance', description: 'Scores how directly the answer addresses the original question', threshold: 0.80 },
  { name: 'Factuality', description: 'Verifies factual accuracy against known reference data', threshold: 0.85 },
  { name: 'LLM Rubric', description: 'Custom rubric-based evaluation with configurable criteria', threshold: 0.72 },
  { name: 'Max Score', description: 'Highest confidence score across multiple evaluation passes', threshold: 0.90 },
  { name: 'Closed QA', description: 'Exact-match evaluation for closed-domain question answering', threshold: 0.82 },
  { name: 'Search Rubric', description: 'Evaluates search result quality and ranking relevance', threshold: 0.76 },
  { name: 'Select Best', description: 'Picks the best response from multiple candidates via pairwise comparison', threshold: 0.70 },
  { name: 'Factual Consistency', description: 'Cross-references claims across multiple sources for consistency', threshold: 0.88 },
];

export default function QualityMetrics() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Outfit' }}>Quality Metrics</h1>
        <button className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-md hover:bg-[var(--brand-subtle)] transition-colors" style={{ fontFamily: 'Outfit' }}>
          Configure Thresholds
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((m) => {
          const rawScore = deterministicScore(m.name, 55, 99);
          const normalized = rawScore / 100;
          const level = scoreLabel(rawScore);
          return (
            <div key={m.name} className="border border-[var(--border)] rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold" style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '14px' }}>{m.name}</p>
              <p className="text-xs" style={{ fontFamily: 'Outfit', fontWeight: 400, fontSize: '12px', color: 'var(--muted-foreground)' }}>{m.description}</p>
              <p className="text-3xl font-bold" style={{
                fontFamily: 'Outfit',
                fontWeight: 700,
                fontSize: '28px',
                color: level === 'pass' ? 'var(--pass)' : level === 'warn' ? 'var(--warn)' : 'var(--fail)'
              }}>{normalized.toFixed(2)}</p>
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded" style={{
                fontFamily: 'Outfit',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-foreground)'
              }}>Pass &gt;= {m.threshold.toFixed(2)}</span>
              <div className="pt-1">
                <button className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-[var(--brand-subtle)] transition-colors" style={{ fontFamily: 'Outfit' }}>
                  Run
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}