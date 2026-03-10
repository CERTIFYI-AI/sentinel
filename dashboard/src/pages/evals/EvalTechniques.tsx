interface Technique {
  name: string;
  description: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
}

const TECHNIQUES: Technique[] = [
  { name: 'RAG Pipeline Evaluator', description: 'End-to-end evaluation of retrieval-augmented generation pipelines. Tests retrieval quality, context injection, and answer synthesis.', complexity: 'Intermediate' },
  { name: 'Hallucination Prevention Suite', description: 'Comprehensive test battery for detecting and preventing model hallucinations. Includes factual grounding and source verification.', complexity: 'Advanced' },
  { name: 'JSON Output Validator', description: 'Validates structured JSON outputs against schemas. Ensures type safety and format compliance in LLM responses.', complexity: 'Beginner' },
  { name: 'Coding Agent Evaluator', description: 'Tests code generation quality, correctness, and security. Includes sandboxed execution and vulnerability scanning.', complexity: 'Advanced' },
  { name: 'Factuality Tester', description: 'Verifies claims against knowledge bases and trusted sources. Detects unsupported assertions and fabricated references.', complexity: 'Intermediate' },
  { name: 'LLM Chain Tester', description: 'Evaluates multi-step LLM chains for error propagation and output consistency. Tests intermediate step quality.', complexity: 'Intermediate' },
  { name: 'Temperature Optimiser', description: 'Finds optimal temperature settings for specific tasks. Balances creativity and determinism across use cases.', complexity: 'Beginner' },
  { name: 'Text-to-SQL Evaluator', description: 'Tests natural language to SQL query generation accuracy. Validates query correctness against reference databases.', complexity: 'Advanced' },
  { name: 'Sandboxed Code Evaluator', description: 'Executes generated code in isolated environments. Measures functional correctness and resource utilisation.', complexity: 'Advanced' },
  { name: 'HLE Benchmark', description: 'Human-Level Evaluation benchmark suite. Compares model outputs against expert human annotations.', complexity: 'Intermediate' },
];

function complexityStyle(c: Technique['complexity']): { bg: string; text: string } {
  switch (c) {
    case 'Beginner': return { bg: '#EEF9F2', text: '#276837' };
    case 'Intermediate': return { bg: '#FFF8EC', text: '#92400E' };
    case 'Advanced': return { bg: '#FEF2F2', text: '#991B1B' };
  }
}

export default function EvalTechniques() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Outfit' }}>Evaluation Techniques</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TECHNIQUES.map((t) => {
          const style = complexityStyle(t.complexity);
          return (
            <div key={t.name} className="border border-[var(--border)] rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold" style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{t.name}</p>
                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded" style={{
                  fontFamily: 'Outfit',
                  backgroundColor: style.bg,
                  color: style.text
                }}>{t.complexity}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ fontFamily: 'Outfit', fontWeight: 400, color: 'var(--muted-foreground)' }}>{t.description}</p>
              <div className="flex items-center gap-3 pt-1">
                <button className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-[var(--brand-subtle)] transition-colors" style={{ fontFamily: 'Outfit' }}>
                  Open Template
                </button>
                <a href="#" className="text-xs font-medium underline-offset-2 hover:underline" style={{ fontFamily: 'Outfit', color: 'var(--brand)' }}>
                  View Docs
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}