import { Ruler, ArrowRight, Code, TestTube, FlowArrow } from '@phosphor-icons/react';

const FEATURES = [
  {
    icon: Code,
    title: 'Custom Metric Authoring',
    desc: 'Write Python-based judge functions or LLM-as-judge prompts with a live sandbox — test against sample rows before saving.',
  },
  {
    icon: TestTube,
    title: 'Metric Validation',
    desc: 'Validate your metric against a labelled golden set to measure its correlation with human judgements before deploying.',
  },
  {
    icon: FlowArrow,
    title: 'Metric Library & Versioning',
    desc: 'Publish metrics to a shared library, version them, and attach a specific version to every eval run for full reproducibility.',
  },
];

export default function MetricStudio() {
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
            <Ruler size={22} style={{ color: 'hsl(var(--brand))' }} weight="duotone" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>
            Metric Studio
          </h1>
        </div>
        <p style={{ color: 'hsl(var(--text-3))', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
          Author, validate, and version custom evaluation metrics — from deterministic scorers to
          LLM-as-judge prompts — and share them across your organisation's eval library.
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
            <Ruler size={36} style={{ color: 'hsl(var(--brand))' }} weight="duotone" />
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
            Metric Studio is in development
          </h2>
          <p style={{ color: 'hsl(var(--text-3))', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            We're building a full metric authoring environment — write custom scorers, validate them
            against golden sets, and version them alongside your datasets and eval configurations.
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
            Use the built-in metrics in <strong style={{ color: 'hsl(var(--text-2))' }}>Eval Run Wizard</strong> today and review results in <strong style={{ color: 'hsl(var(--text-2))' }}>Eval Results Viewer</strong>.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'hsl(var(--brand))', fontSize: '0.85rem', fontWeight: 600, cursor: 'default', whiteSpace: 'nowrap' }}>
            Learn more <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
