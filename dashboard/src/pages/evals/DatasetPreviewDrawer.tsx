import { useState } from 'react';
import { MagnifyingGlass, Funnel, Columns, DownloadSimple, X, DotsThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const MOCK_DATA = [
  { id: '1', input: 'How do I reset my password?', expected: 'Navigate to Settings > Security > Reset Password.', tags: ['auth', 'support'], status: 'Active' },
  { id: '2', input: 'Why is my billing suspended?', expected: 'Your credit card on file expired. Please update it.', tags: ['billing'], status: 'Active' },
  { id: '3', input: 'I want to speak to a human', expected: 'I am transferring you to a support agent now.', tags: ['escalation'], status: 'Archived' },
  { id: '4', input: 'What are the enterprise features?', expected: 'Enterprise includes SSO, SLAs, and custom limits.', tags: ['sales', 'enterprise'], status: 'Active' },
  { id: '5', input: 'Cancel my account', expected: 'I can help you cancel. Could you tell me why you are leaving?', tags: ['churn', 'support'], status: 'Active' },
];

export default function DatasetPreviewDrawer() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden" style={{ background: 'hsl(var(--bg-main))' }}>
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Customer Support QA v2</h1>
            <Badge style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)', borderRadius: 0, fontSize: 10 }}>Production</Badge>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>1,204 rows • Last updated 2 days ago</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <DownloadSimple size={16} /> Export
          </Button>
          <Button size="icon" variant="ghost" style={{ borderRadius: 0 }}>
            <DotsThree size={20} />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
            <Input 
              placeholder="Search rows..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs bg-[hsl(var(--bg-muted))] border-transparent focus:bg-transparent" 
              style={{ borderRadius: 0 }}
            />
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" style={{ borderRadius: 0 }}>
            <Funnel size={14} /> Filter
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" style={{ borderRadius: 0 }}>
          <Columns size={14} /> Columns
        </Button>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto bg-surface">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-10 shadow-sm" style={{ background: 'hsl(var(--bg-muted))' }}>
            <tr>
              <th className="p-3 text-xs font-semibold border-b border-[hsl(var(--border))]" style={{ color: 'hsl(var(--text-2))', width: 60 }}>ID</th>
              <th className="p-3 text-xs font-semibold border-b border-[hsl(var(--border))]" style={{ color: 'hsl(var(--text-2))', width: '35%' }}>Input</th>
              <th className="p-3 text-xs font-semibold border-b border-[hsl(var(--border))]" style={{ color: 'hsl(var(--text-2))', width: '35%' }}>Expected Output</th>
              <th className="p-3 text-xs font-semibold border-b border-[hsl(var(--border))]" style={{ color: 'hsl(var(--text-2))' }}>Tags</th>
              <th className="p-3 text-xs font-semibold border-b border-[hsl(var(--border))] text-right" style={{ color: 'hsl(var(--text-2))' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {MOCK_DATA.map((row) => (
              <tr key={row.id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors group">
                <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.id}</td>
                <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{row.input}</td>
                <td className="p-3 text-xs font-mono line-clamp-2" style={{ color: 'hsl(var(--text-3))' }}>{row.expected}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {row.tags.map(tag => (
                      <Badge key={tag} style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-2))', borderRadius: 0, fontSize: 10 }}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 10, padding: '2px 8px', height: 24 }}>
                    Inspect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
