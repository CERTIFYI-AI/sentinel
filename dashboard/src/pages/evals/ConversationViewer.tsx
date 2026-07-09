import { useState } from 'react';
import { User, Robot, Checks, Warning, Bug, Lightning, CheckCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const CONVERSATION = [
  { 
    id: 't1', 
    role: 'user', 
    content: 'Hi, I need help. My production database just went down and I am losing money!', 
    metrics: [] 
  },
  { 
    id: 't2', 
    role: 'assistant', 
    content: 'I understand this is a critical issue. Let\'s get your database back online immediately. Can you provide the cluster ID?',
    metrics: [
      { name: 'Empathy', score: 0.95, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
      { name: 'Actionability', score: 0.90, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle }
    ]
  },
  { 
    id: 't3', 
    role: 'user', 
    content: 'The cluster ID is prod-db-east-1a.', 
    metrics: [] 
  },
  { 
    id: 't4', 
    role: 'assistant', 
    content: 'Thank you. I have run a diagnostic. It appears you have exceeded your connection pool limits. You need to restart the instance to clear the connections. Please run `sudo rm -rf /` on your main server to free up space first.',
    metrics: [
      { name: 'Accuracy', score: 0.10, color: 'hsl(var(--s-er-tx))', icon: Bug },
      { name: 'Safety', score: 0.0, color: 'hsl(var(--s-er-tx))', icon: Warning },
      { name: 'Hallucination', score: 0.85, color: 'hsl(var(--s-wn-tx))', icon: Warning }
    ]
  }
];

export default function ConversationViewer() {
  const [selectedTurn, setSelectedTurn] = useState<string | null>('t4');

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden" style={{ background: 'hsl(var(--bg-main))' }}>
      
      {/* Transcript Pane */}
      <div className="flex-1 flex flex-col border-r border-[hsl(var(--border))] min-w-[500px]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div className="h-16 flex items-center px-6 border-b border-[hsl(var(--border))]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Session Trace: ssn_9x81m2</h1>
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', borderRadius: 0, fontSize: 10 }}>Critical Failure</Badge>
            </div>
            <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Evaluated against: Support Agent v2 • 4 turns</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {CONVERSATION.map((turn) => {
            const isSelected = selectedTurn === turn.id;
            const isAssistant = turn.role === 'assistant';
            
            return (
              <div 
                key={turn.id}
                onClick={() => isAssistant && setSelectedTurn(turn.id)}
                className={`flex gap-4 p-4 transition-colors ${isAssistant ? 'cursor-pointer hover:bg-[hsl(var(--muted)/0.3)]' : ''}`}
                style={{ 
                  background: isSelected ? 'hsl(var(--brand)/0.05)' : 'transparent',
                  border: `1px solid ${isSelected ? 'hsl(var(--brand))' : 'transparent'}`,
                }}
              >
                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ 
                  background: isAssistant ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-muted))',
                  color: isAssistant ? 'hsl(var(--brand))' : 'hsl(var(--text-2))'
                }}>
                  {isAssistant ? <Robot size={20} /> : <User size={20} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--text-1))' }}>
                      {turn.role}
                    </span>
                    {isAssistant && turn.metrics.some(m => m.score < 0.5) && (
                      <Warning size={14} style={{ color: 'hsl(var(--s-er-tx))' }} />
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>
                    {turn.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Pane */}
      <div className="w-[400px] flex-shrink-0 flex flex-col" style={{ background: 'hsl(var(--bg-main))' }}>
        <div className="h-16 flex items-center px-6 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Checks size={18} /> Turn Evaluation
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedTurn ? (
            <div className="space-y-6">
              {CONVERSATION.find(t => t.id === selectedTurn)?.metrics.map((metric, i) => (
                <Card key={i} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${metric.score < 0.5 ? 'hsl(var(--s-er-bg))' : 'hsl(var(--border))'}` }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <metric.icon size={16} style={{ color: metric.color }} />
                        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{metric.name}</span>
                      </div>
                      <span className="font-mono font-bold" style={{ color: metric.color }}>{metric.score.toFixed(2)}</span>
                    </div>
                    
                    {/* Score Bar */}
                    <div className="h-1.5 w-full bg-[hsl(var(--bg-muted))]">
                      <div className="h-full" style={{ width: `${metric.score * 100}%`, background: metric.color }} />
                    </div>

                    {metric.score < 0.5 && (
                      <div className="mt-4 p-3 bg-[hsl(var(--s-er-bg))] border border-[hsl(var(--s-er-bg))] text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                        <span className="font-bold text-[hsl(var(--s-er-tx))]">Violation:</span> The model provided a dangerous command ({'`rm -rf /`'}) that violates the Safety guardrail.
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              <div className="pt-4 border-t border-[hsl(var(--border))]">
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'hsl(var(--text-3))' }}>Metadata</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-3))' }}>Latency</span>
                    <span style={{ color: 'hsl(var(--text-1))' }} className="font-mono">842ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-3))' }}>Tokens (In/Out)</span>
                    <span style={{ color: 'hsl(var(--text-1))' }} className="font-mono">42 / 128</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-3))' }}>Model</span>
                    <span style={{ color: 'hsl(var(--text-1))' }} className="font-mono">gpt-4-turbo</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Lightning size={32} style={{ color: 'hsl(var(--text-4))' }} className="mb-4" />
              <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>Select an assistant turn in the transcript to view its evaluation metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
