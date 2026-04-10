import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass, ArrowRight, Brain, ShieldCheck, Warning, Briefcase,
  ChartBar, Robot, Users, FileText, Scales, Siren, Eye, Clock,
  ChartLine, Database, StackSimple, Lightning, Gavel, Power,
} from '@phosphor-icons/react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: React.ReactNode;
  category: string;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: 'overview', label: 'Dashboard Overview', description: 'Governance metrics and risk summary', path: '/overview', icon: <ChartLine size={16} />, category: 'Navigation', keywords: ['home', 'dashboard', 'summary'] },
  { id: 'models', label: 'Model Inventory', description: 'All registered AI models', path: '/models/inventory', icon: <Brain size={16} />, category: 'Navigation', keywords: ['model', 'ai', 'inventory', 'ml'] },
  { id: 'use-cases', label: 'Use Case Management', description: 'AI use cases with RACI and risk matrix', path: '/use-cases', icon: <Briefcase size={16} />, category: 'Navigation', keywords: ['use case', 'raci', 'business'] },
  { id: 'bias', label: 'Bias Audits', description: 'Bias audit wizard and intersectional analysis', path: '/bias-audits', icon: <Scales size={16} />, category: 'Navigation', keywords: ['bias', 'fairness', 'audit', 'intersectional'] },
  { id: 'explainability', label: 'Explainability Center', description: 'LIME, Anchors, counterfactual explanations', path: '/explainability', icon: <Eye size={16} />, category: 'Navigation', keywords: ['explain', 'lime', 'shap', 'xai', 'transparency'] },
  { id: 'risk', label: 'Risk Register', description: 'Enterprise risk tracking and heat map', path: '/risk', icon: <Warning size={16} />, category: 'Navigation', keywords: ['risk', 'register', 'heatmap'] },
  { id: 'financial-risk', label: 'Financial Risk', description: 'Monte Carlo, FAIR model, insurance mapping', path: '/financial-risk', icon: <ChartBar size={16} />, category: 'Navigation', keywords: ['financial', 'monte carlo', 'fair', 'insurance', 'roi'] },
  { id: 'compliance', label: 'Compliance Dashboard', description: 'Framework compliance status', path: '/compliance', icon: <ShieldCheck size={16} />, category: 'Navigation', keywords: ['compliance', 'gdpr', 'eu ai act', 'iso'] },
  { id: 'policies', label: 'Policy Management', description: 'AI governance policies', path: '/policies', icon: <FileText size={16} />, category: 'Navigation', keywords: ['policy', 'governance', 'document'] },
  { id: 'agent-iam', label: 'Agent IAM', description: 'Least-privilege and access reviews for AI agents', path: '/agent-iam', icon: <Robot size={16} />, category: 'Navigation', keywords: ['agent', 'iam', 'privilege', 'access'] },
  { id: 'kill-switch', label: 'Kill Switch Events', description: 'Emergency agent suspension log', path: '/kill-switch', icon: <Power size={16} />, category: 'Navigation', keywords: ['kill', 'switch', 'suspend', 'emergency'] },
  { id: 'incidents', label: 'Incident Log', description: 'AI incident tracking and management', path: '/incidents', icon: <Siren size={16} />, category: 'Navigation', keywords: ['incident', 'log', 'event'] },
  { id: 'reporting', label: 'Reporting', description: 'Scheduled reports and custom report builder', path: '/reporting', icon: <ChartLine size={16} />, category: 'Navigation', keywords: ['report', 'schedule', 'export', 'pdf'] },
  { id: 'audit-log', label: 'Audit Log', description: 'Full audit trail for all GRC activities', path: '/audit-trail', icon: <Clock size={16} />, category: 'Navigation', keywords: ['audit', 'log', 'trail', 'history'] },
  { id: 'datasets', label: 'Dataset Registry', description: 'Training and evaluation datasets', path: '/datasets', icon: <Database size={16} />, category: 'Navigation', keywords: ['dataset', 'data', 'registry'] },
  { id: 'vendors', label: 'Vendor Registry', description: 'Third-party AI vendor risk management', path: '/vendors/registry', icon: <StackSimple size={16} />, category: 'Navigation', keywords: ['vendor', 'third party', 'supply chain'] },
  { id: 'reg-radar', label: 'Regulatory Radar', description: 'Upcoming regulatory changes tracker', path: '/reg-radar', icon: <Gavel size={16} />, category: 'Navigation', keywords: ['regulation', 'radar', 'law', 'eu ai act'] },
  { id: 'hitl', label: 'Human-in-the-Loop Queue', description: 'Pending human review decisions', path: '/hitl', icon: <Users size={16} />, category: 'Navigation', keywords: ['hitl', 'human', 'review', 'queue'] },
  { id: 'trust-engine', label: 'Trust Engine', description: 'Real-time trust scoring and guardrails', path: '/trust-engine', icon: <Lightning size={16} />, category: 'Navigation', keywords: ['trust', 'guardrail', 'score', 'engine'] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(query.toLowerCase()) ||
        c.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
      )
    : COMMANDS;

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    handleClose();
  }, [navigate, handleClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) handleClose();
        else handleOpen();
      }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleOpen, handleClose]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIndex]) handleNavigate(filtered[activeIndex].path);
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs border"
        style={{
          background: 'hsl(var(--bg-raised))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--text-4))',
          borderRadius: 0,
          minWidth: 200,
        }}
        title="Open command palette (Ctrl+K)"
      >
        <MagnifyingGlass size={12} />
        <span>Quick navigate…</span>
        <span className="ml-auto font-mono text-[10px] px-1 py-0.5" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>⌘K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={handleClose}>
      <div
        className="w-full max-w-xl mx-4"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'hsl(var(--bg-surface))', borderBottom: '1px solid hsl(var(--border))' }}>
          <MagnifyingGlass size={16} style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, modules, actions…"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'hsl(var(--text-1))' }}
          />
          <span className="text-[10px] font-mono px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-4))' }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ background: 'hsl(var(--bg-surface))', maxHeight: 400, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              No results for "{query}"
            </div>
          ) : (
            <>
              {query.trim() === '' && (
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))', borderBottom: '1px solid hsl(var(--border))' }}>
                  All Modules — {filtered.length} pages
                </div>
              )}
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    background: i === activeIndex ? 'hsl(var(--bg-raised))' : 'transparent',
                    borderBottom: '1px solid hsl(var(--border) / 0.5)',
                    outline: 'none',
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleNavigate(cmd.path)}
                >
                  <span style={{ color: i === activeIndex ? 'hsl(var(--brand))' : 'hsl(var(--text-4))' }}>{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-xs ml-2" style={{ color: 'hsl(var(--text-4))' }}>{cmd.description}</span>
                    )}
                  </div>
                  <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))', opacity: i === activeIndex ? 1 : 0 }} />
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px]" style={{ background: 'hsl(var(--bg-muted))', borderTop: '1px solid hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
          <span className="ml-auto">Sentinel AI GRC — {COMMANDS.length} modules</span>
        </div>
      </div>
    </div>
  );
}
