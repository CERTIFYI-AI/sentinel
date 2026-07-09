import { useState } from 'react';
import { ChatCircleText, User, Robot, Gear, Plus, Trash, FloppyDisk, Play } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const INITIAL_TURNS = [
  { id: '1', role: 'system', content: 'You are a helpful customer support agent for Sentinel. Be concise.' },
  { id: '2', role: 'user', content: 'I need help resetting my API key.' },
  { id: '3', role: 'assistant', content: 'I can help with that. Are you currently logged into the dashboard?' },
];

export default function MultiTurnEditor() {
  const [turns, setTurns] = useState(INITIAL_TURNS);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'system': return <Gear size={16} />;
      case 'user': return <User size={16} />;
      case 'assistant': return <Robot size={16} />;
      default: return <ChatCircleText size={16} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system': return 'hsl(var(--text-4))';
      case 'user': return 'hsl(var(--brand))';
      case 'assistant': return 'hsl(var(--s-ok-tx))';
      default: return 'hsl(var(--text-3))';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden" style={{ background: 'hsl(var(--bg-main))' }}>
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Multi-Turn Scenario Editor</h1>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Define conversational paths for agent evaluation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <Play size={16} /> Test Scenario
          </Button>
          <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <FloppyDisk size={16} /> Save Scenario
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-4">
          
          {turns.map((turn, index) => (
            <Card key={turn.id} className="relative group border border-[hsl(var(--border))]" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))' }}>
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border))]" style={{ color: 'hsl(var(--text-3))' }}>
                {index + 1}
              </div>
              
              <CardContent className="p-4 pl-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[hsl(var(--bg-muted))]" style={{ color: getRoleColor(turn.role) }}>
                      {getRoleIcon(turn.role)}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--text-1))' }}>
                      {turn.role}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6" style={{ color: 'hsl(var(--s-er-tx))' }}>
                    <Trash size={14} />
                  </Button>
                </div>
                
                <textarea 
                  className="w-full p-3 text-sm bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none"
                  rows={3}
                  defaultValue={turn.content}
                  style={{ borderRadius: 0, color: 'hsl(var(--text-1))' }}
                />
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-center pt-4 gap-3">
            <Button variant="outline" size="sm" style={{ borderRadius: 0, borderStyle: 'dashed' }}>
              <Plus size={14} /> Add User Turn
            </Button>
            <Button variant="outline" size="sm" style={{ borderRadius: 0, borderStyle: 'dashed' }}>
              <Plus size={14} /> Add Assistant Turn
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
