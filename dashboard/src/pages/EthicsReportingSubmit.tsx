import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ShieldCheck, CheckCircle } from '@phosphor-icons/react';


const CATEGORIES = [
  'AI Bias/Discrimination',
  'Safety Concern',
  'Privacy Violation',
  'Misuse of AI',
  'Regulatory Non-Compliance',
  'Ethical Concern',
  'Other',
];

function generateRef(): string {
  const arr = new Uint16Array(1);
  crypto.getRandomValues(arr);
  const num = (arr[0] % 900) + 100;
  return `ER-${num}`;
}

export default function EthicsReportingSubmit() {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('');
  const [dateObserved, setDateObserved] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ref] = useState(generateRef());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!category) errs.category = 'Please select a category';
    if (!severity) errs.severity = 'Please select severity';
    if (!description || description.length < 50) errs.description = 'Description must be at least 50 characters';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(var(--bg-page))' }}>
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 flex items-center justify-center" style={{ background: 'hsl(var(--s-ok-bg))' }}>
              <CheckCircle size={32} style={{ color: 'hsl(var(--s-ok-tx))' }} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Report Submitted</h1>
            <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>Your concern has been received and will be reviewed confidentially.</p>
          </div>
          <div className="p-4 border" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Your reference number</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--brand))' }}>{ref}</p>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-4))' }}>Keep this reference for follow-up inquiries.</p>
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Reports are reviewed within 5 business days.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'hsl(var(--bg-page))' }}>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'hsl(var(--brand-subtle))' }}>
              <ShieldCheck size={24} style={{ color: 'hsl(var(--brand))' }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Report an AI Ethics Concern</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Anonymous & Confidential — EU AI Act Art.83 + EU Whistleblower Directive (2019/1937)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>Category *</label>
            <Select value={category || undefined} onValueChange={v => { setCategory(v); setErrors(prev => ({ ...prev, category: '' })); }}>
              <SelectTrigger className="w-full" style={{ borderRadius: 0, borderColor: errors.category ? 'hsl(var(--s-er-tx))' : 'hsl(var(--border))' }}><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.category}</p>}
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>Severity *</label>
            <div className="flex gap-3">
              {(['Low', 'Medium', 'High', 'Critical'] as const).map(s => (
                <button key={s} type="button" onClick={() => { setSeverity(s); setErrors(prev => ({ ...prev, severity: '' })); }}
                  className="flex-1 py-2 text-sm border font-medium transition-colors"
                  style={{ borderRadius: 0, borderColor: severity === s ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: severity === s ? 'hsl(var(--brand-subtle))' : 'transparent', color: severity === s ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                  {s}
                </button>
              ))}
            </div>
            {errors.severity && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.severity}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>Description *</label>
              <span className="text-xs" style={{ color: description.length < 50 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-4))' }}>{description.length}/50 min</span>
            </div>
            <textarea
              className="w-full text-sm border p-3 min-h-[120px]"
              style={{ borderRadius: 0, borderColor: errors.description ? 'hsl(var(--s-er-tx))' : 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
              placeholder="Describe the AI ethics concern in detail. Be as specific as possible..."
              value={description} onChange={e => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })); }} />
            {errors.description && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.description}</p>}
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>AI System Affected <span style={{ color: 'hsl(var(--text-4))' }}>(optional)</span></label>
              <input type="text" className="w-full text-sm border p-2.5"
                style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                placeholder="e.g. Credit Risk Scorer" value={system} onChange={e => setSystem(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>Date Observed <span style={{ color: 'hsl(var(--text-4))' }}>(optional)</span></label>
              <input type="date" className="w-full text-sm border p-2.5"
                style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={dateObserved} onChange={e => setDateObserved(e.target.value)} />
            </div>
          </div>

          {/* Anonymous toggle */}
          <div className="p-4 border" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Report anonymously</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Your identity will not be recorded or shared</p>
              </div>
              <button type="button" onClick={() => setAnonymous(!anonymous)}
                className="w-11 h-6 relative transition-colors flex-shrink-0"
                style={{ background: anonymous ? 'hsl(var(--brand))' : 'hsl(var(--bg-raised))', borderRadius: 9999 }}>
                <span className="absolute top-0.5 h-5 w-5 bg-[hsl(var(--bg-surface))] transition-all" style={{ borderRadius: 9999, left: anonymous ? '24px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {!anonymous && (
              <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Name</label>
                  <input type="text" className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-page))', color: 'hsl(var(--text-1))' }}
                    value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Email</label>
                  <input type="email" className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-page))', color: 'hsl(var(--text-1))' }}
                    value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Organization</label>
                  <input type="text" className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-page))', color: 'hsl(var(--text-1))' }}
                    value={org} onChange={e => setOrg(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit"
            className="w-full py-3 text-sm font-semibold transition-colors"
            style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'white' }}>
            Submit Report
          </button>
        </form>

        {/* Whistleblower notice */}
        <div className="p-4 border" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-2))' }}>Whistleblower Protection</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            Reports are handled confidentially. EU Whistleblower Directive (2019/1937) and EU AI Act Art.83 protect reporters from retaliation.
            All reports are reviewed within 5 business days and handled by trained investigators.
          </p>
        </div>
      </div>
    </div>
  );
}
