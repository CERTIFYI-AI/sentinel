import { ArrowsLeftRight, ArrowRight, PencilLine, Play, GitDiff } from '@phosphor-icons/react';

const FEATURES = [
  {
    icon: PencilLine,
    title: 'Turn-by-Turn Authoring',
    desc: 'Compose multi-turn conversation test cases with a message editor — add system prompts, user turns, and expected assistant responses.',
  },
  {
    icon: Play,
    title: 'Live Execution',
    desc: 'Run your authored conversation against any registered model in real time and capture the full response chain for comparison.',
  },
  {
    icon: GitDiff,
    title: 'Diff & Annotate',
    desc: 'Diff model output against expected responses turn by turn and annotate failures directly inside the editor before saving to a dataset.',
  },
];

export default function MultiTurnEditor() {
  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 0,
            background: 'hsl(var(--brand) / 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ArrowsLeftRight size={22} style={{ color: 'hsl(var(--brand))' }} weight="duotone" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>
            Multi-Turn Editor
          </h1>
        </div>
        <p style={{ color: 'hsl(var(--text-3))', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
          Author, execute, and annotate multi-turn conversation test cases — build rich dialogue datasets
          and validate model behaviour across complex stateful interactions.
        </p>
      </div>

      {/* Coming Soon card */}
      <div style={{
        border: '1px solid hsl(var(--border))',
        borderRadius: 0,
        background: 'hsl(var(--bg-surface))',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}>
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg, hsl(var(--brand) / 0.08) 0%, hsl(var(--brand) / 0.02) 100%)',
          borderBottom: '1px solid hsl(var(--border))',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 0,
            background: 'hsl(var(--brand) / 0.12)',
            border: '1px solid hsl(var(--brand) / 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <ArrowsLeftRight size={36} style={{ color: 'hsl(var(--brand))' }} weight="duotone" />
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'hsl(var(--s-in-bg))',
            border: '1px solid hsl(var(--s-in-br))',
            color: 'hsl(var(--s-in-tx))',
            fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em',
            padding: '0.25rem 0.75rem',
            borderRadius: 0,
            marginBottom: '1rem',
          }}>
            COMING SOON
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--text-1))', margin: '0 0 0.5rem' }}>
            Multi-Turn Editor is in development
          </h2>
          <p style={{ color: 'hsl(var(--text-3))', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            We're building an interactive editor for authoring, running, and annotating multi-turn dialogue
            test cases — closing the loop between eval authoring and dataset creation in a single workflow.
          </p>
        </div>

        {/* Feature previews */}
        <div style={{ padding: '1.5rem 2rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.07em', color: 'hsl(var(--text-3))', marginBottom: '1rem', textTransform: 'uppercase' }}>
            What's coming
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                padding: '1rem',
                border: '1px solid hsl(var(--border))',
                borderRadius: 0,
                background: 'hsl(var(--bg-raised))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Icon size={16} style={{ color: 'hsl(var(--brand))' }} weight="duotone" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--text-1))' }}>{title}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-3))', margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA row */}
        <div style={{
          borderTop: '1px solid hsl(var(--border))',
          padding: '1rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'hsl(var(--bg-muted))',
        }}>
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-3))' }}>
            View conversations from completed runs in <strong style={{ color: 'hsl(var(--text-2))' }}>Conversation Viewer</strong> or launch a new run via <strong style={{ color: 'hsl(var(--text-2))' }}>Eval Run Wizard</strong>.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'hsl(var(--brand))', fontSize: '0.85rem', fontWeight: 600, cursor: 'default', whiteSpace: 'nowrap' }}>
            Learn more <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
