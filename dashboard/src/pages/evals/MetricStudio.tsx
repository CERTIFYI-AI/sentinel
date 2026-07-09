import { useState } from 'react';
import { Ruler, Play, FloppyDisk, Plus, FileText, DotsThreeVertical, CheckCircle, Warning, MagnifyingGlass, Funnel, Trash, Code, SlidersHorizontal, TestTube } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MOCK_METRICS = [
  { id: '1', name: 'Tone Checker', type: 'LLM-as-Judge', status: 'Published', version: 'v1.2', updated: '2026-03-15' },
  { id: '2', name: 'PII Detector', type: 'Regex/Python', status: 'Draft', version: 'v0.1', updated: '2026-04-02' },
  { id: '3', name: 'Hallucination Score', type: 'LLM-as-Judge', status: 'Published', version: 'v2.0', updated: '2026-04-10' },
  { id: '4', name: 'JSON Schema Validator', type: 'Python', status: 'Archived', version: 'v1.0', updated: '2025-11-20' },
];

export default function MetricStudio() {
  const [selectedMetric, setSelectedMetric] = useState(MOCK_METRICS[0]);
  const [code, setCode] = useState(`import json\nimport re\n\ndef evaluate(input_text, output_text, expected_output):\n    """\n    Evaluates the tone of the response.\n    Returns a score between 0.0 and 1.0.\n    """\n    # Implement custom logic here\n    if "apologize" in output_text.lower():\n        return 0.8\n    return 1.0\n`);
  const [testInput, setTestInput] = useState('Can you help me reset my password?');
  const [testOutput, setTestOutput] = useState('I apologize for the inconvenience. Please click the link below to reset your password.');
  const [testResult, setTestResult] = useState<number | null>(null);

  const handleRunTest = () => {
    // Mock run test
    setTestResult(0.8);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden" style={{ background: 'hsl(var(--bg-main))' }}>
      
      {/* Left Sidebar: Metric Library */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Metric Library</h2>
            <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }}>
              <Plus size={16} />
            </Button>
          </div>
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input 
              placeholder="Search metrics..." 
              className="pl-9 h-8 text-xs bg-[hsl(var(--bg-muted))] border-transparent focus:bg-transparent" 
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {MOCK_METRICS.map(metric => (
            <div 
              key={metric.id}
              onClick={() => setSelectedMetric(metric)}
              className="p-3 border-b border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--muted)/0.3)] transition-colors"
              style={{ 
                background: selectedMetric.id === metric.id ? 'hsl(var(--brand)/0.05)' : 'transparent',
                borderLeft: `3px solid ${selectedMetric.id === metric.id ? 'hsl(var(--brand))' : 'transparent'}`
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{metric.name}</span>
                <Badge style={{ 
                  background: metric.status === 'Published' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))', 
                  color: metric.status === 'Published' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))',
                  borderRadius: 0, fontSize: 10 
                }}>
                  {metric.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                <span>{metric.type} • {metric.version}</span>
                <span>{metric.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-[hsl(var(--brand-subtle))]" style={{ color: 'hsl(var(--brand))' }}>
              <Ruler size={18} weight="duotone" />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selectedMetric.name}</h1>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                <span>{selectedMetric.type}</span>
                <span>•</span>
                <span>{selectedMetric.version}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" style={{ borderRadius: 0, fontSize: 12 }}>
              <TestTube size={14} /> Validate
            </Button>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', fontSize: 12 }}>
              <FloppyDisk size={14} /> Save Metric
            </Button>
            <Button variant="ghost" size="icon" style={{ borderRadius: 0 }}>
              <DotsThreeVertical size={18} />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor Pane */}
          <div className="flex-1 flex flex-col border-r border-[hsl(var(--border))]">
            <div className="h-10 flex items-center px-4 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-muted))' }}>
              <Code size={16} className="mr-2" style={{ color: 'hsl(var(--text-3))' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-2))' }}>Evaluation Logic</span>
            </div>
            <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-sm overflow-y-auto" style={{ color: '#d4d4d4' }}>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-transparent outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Sandbox Pane */}
          <div className="w-[400px] flex-shrink-0 flex flex-col bg-surface">
            <div className="h-10 flex items-center px-4 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-muted))' }}>
              <SlidersHorizontal size={16} className="mr-2" style={{ color: 'hsl(var(--text-3))' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-2))' }}>Live Sandbox</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--text-2))' }}>Test Input</label>
                <textarea 
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full p-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] resize-none focus:outline-none focus:border-[hsl(var(--brand))]"
                  rows={3}
                  style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--text-2))' }}>Model Output</label>
                <textarea 
                  value={testOutput}
                  onChange={(e) => setTestOutput(e.target.value)}
                  className="w-full p-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] resize-none focus:outline-none focus:border-[hsl(var(--brand))]"
                  rows={4}
                  style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }}
                />
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleRunTest}
                  className="w-full" 
                  variant="outline"
                  style={{ borderRadius: 0, borderColor: 'hsl(var(--brand))', color: 'hsl(var(--brand))' }}
                >
                  <Play size={16} weight="fill" /> Run Evaluation
                </Button>
              </div>

              {testResult !== null && (
                <div className="mt-6 p-4 border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase" style={{ color: 'hsl(var(--text-3))' }}>Result Score</span>
                    {testResult >= 0.8 ? (
                      <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    ) : (
                      <Warning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />
                    )}
                  </div>
                  <div className="text-3xl font-mono font-bold" style={{ color: 'hsl(var(--text-1))' }}>
                    {testResult.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
