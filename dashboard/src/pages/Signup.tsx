import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {

  Eye, EyeSlash, ShieldCheck, CheckCircle, Lock, ArrowRight, Check,
} from '@phosphor-icons/react';

const FEATURES = [
  'Real-time AI governance across all deployed models',
  'EU AI Act, NIST AI RMF & ISO 42001 compliance automation',
  'Continuous bias monitoring and drift detection',
  'Full audit trail with cryptographic evidence chain',
];

const FRAMEWORKS = ['EU AI Act', 'ISO 42001', 'NIST AI RMF', 'GDPR', 'SOC 2'];

function BrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full p-12 relative overflow-hidden"
      style={{ background: 'hsl(var(--bg-surface))', borderRight: '1px solid hsl(var(--border))' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(hsl(var(--brand)/4%) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--brand)/4%) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, hsl(var(--brand)/12%) 0%, transparent 70%)',
      }} />

      <div className="relative z-10">
        <img
          src="https://dignep.com.np/wp-content/uploads/2026/03/sentinel_logo.svg"
          alt="Sentinel AI"
          className="h-9 w-auto mb-12"
          onError={e => { (e.target as HTMLImageElement).src = '/sentinel-icon.svg'; (e.target as HTMLImageElement).className = 'h-9 w-9 mb-12'; }}
        />

        <div className="mb-10">
          <h2 className="text-3xl font-bold leading-tight mb-4" style={{ color: 'hsl(var(--text-1))' }}>
            The trust layer for<br />
            <span style={{ color: 'hsl(var(--brand))' }}>production AI.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
            Join the enterprises using Sentinel to govern, audit and comply with every major AI regulatory framework — from day one.
          </p>
        </div>

        <ul className="space-y-3">
          {FEATURES.map(f => (
            <li key={f} className="flex items-start gap-3">
              <CheckCircle size={16} weight="fill" className="flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--brand))' }} />
              <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'hsl(var(--text-4))' }}>Regulatory Coverage</p>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map(fw => (
              <span key={fw} className="text-[10px] font-semibold px-2.5 py-1 border" style={{
                borderColor: 'hsl(var(--brand)/30%)',
                color: 'hsl(var(--brand))',
                background: 'hsl(var(--brand)/6%)',
                borderRadius: 0,
              }}>{fw}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <blockquote className="border-l-2 pl-4" style={{ borderColor: 'hsl(var(--brand))' }}>
          <p className="text-sm italic leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
            "From risk tiering to DPIA workflows — Sentinel replaced five separate tools and gave us a single source of truth for AI compliance."
          </p>
          <footer className="mt-2 text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>
            — Head of AI Risk, Tier-1 European Bank
          </footer>
        </blockquote>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>
            <Lock size={10} style={{ color: 'hsl(var(--brand))' }} />
            SOC 2 Type II
          </div>
          <span style={{ color: 'hsl(var(--border))' }}>·</span>
          <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>
            <ShieldCheck size={10} style={{ color: 'hsl(var(--brand))' }} />
            ISO 27001
          </div>
          <span style={{ color: 'hsl(var(--border))' }}>·</span>
          <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>
            <ShieldCheck size={10} style={{ color: 'hsl(var(--brand))' }} />
            GDPR Compliant
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number or symbol', pass: /[0-9!@#$%^&*]/.test(password) },
  ];
  if (!password) return null;
  const score = checks.filter(c => c.pass).length;
  const barColor = score === 1 ? 'hsl(var(--s-er-tx))' : score === 2 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))';

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-1 flex-1 transition-all" style={{ background: i < score ? barColor : 'hsl(var(--border))', borderRadius: 0 }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(c => (
          <span key={c.label} className="flex items-center gap-1 text-[10px]" style={{ color: c.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
            <Check size={10} weight={c.pass ? 'bold' : 'regular'} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const ROLES = ['CISO / Chief AI Officer', 'AI/ML Engineer', 'Risk & Compliance Officer', 'DPO / Privacy Officer', 'Legal / Regulatory Affairs', 'Product Manager', 'Other'];

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    organization: '', role: '', agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore((s) => s.signup);
  const navigate = useNavigate();

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Work email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters required';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.organization.trim()) e.organization = 'Organization name is required';
    if (!form.agreeTerms) e.agreeTerms = 'You must accept the terms to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signup({ name: form.name, email: form.email, password: form.password, organization: form.organization });
      navigate('/login');
    } catch {
      setErrors({ form: 'Could not create account. Please try again or contact support.' });
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full px-3.5 py-2.5 text-sm border bg-[hsl(var(--bg-page))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] focus:border-[hsl(var(--brand))] transition-all`;
  const ic = (err: boolean) => `${inputBase} ${err ? 'border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))]' : 'border-[hsl(var(--border))]'}`;
  const s0 = { borderRadius: 0 };

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--bg-page))' }}>
      <div className="lg:w-[480px] xl:w-[520px] flex-shrink-0">
        <BrandPanel />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="lg:hidden mb-8 flex flex-col items-center">
          <img src="/sentinel-icon.svg" alt="Sentinel" className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-3))' }}>The trust layer for production AI</p>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Create your workspace</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Get started with Sentinel AI in minutes</p>
          </div>

          {errors.form && (
            <div className="mb-5 px-4 py-3 border text-sm flex items-start gap-2.5" style={{ background: 'hsl(var(--s-er-bg))', borderColor: 'hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>
              <span className="text-base leading-none mt-0.5">⚠</span>
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name + Organization */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Full Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={ic(!!errors.name)} style={s0} placeholder="Jane Smith" autoComplete="name" autoFocus />
                {errors.name && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Organization *</label>
                <input value={form.organization} onChange={e => set('organization', e.target.value)} className={ic(!!errors.organization)} style={s0} placeholder="Acme Corp" autoComplete="organization" />
                {errors.organization && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.organization}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Work Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={ic(!!errors.email)} style={s0} placeholder="jane@company.com" autoComplete="email" />
              {errors.email && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.email}</p>}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Your Role</label>
              <Select value={form.role || undefined} onValueChange={v => set('role', v)}>
                <SelectTrigger className={ic(false)} style={{ ...s0 }}><SelectValue placeholder="Select your role…" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} className={ic(!!errors.password) + ' pr-11'} style={s0} placeholder="Create a strong password" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" tabIndex={-1} style={{ color: 'hsl(var(--text-4))' }}>
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.password}</p>}
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Confirm Password *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} className={ic(!!errors.confirmPassword) + ' pr-11'} style={s0} placeholder="Re-enter password" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" tabIndex={-1} style={{ color: 'hsl(var(--text-4))' }}>
                  {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <div className="space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.agreeTerms} onChange={e => set('agreeTerms', e.target.checked)} className="mt-0.5 w-3.5 h-3.5 accent-[hsl(var(--brand))]" />
                <span className="text-sm leading-snug" style={{ color: 'hsl(var(--text-3))' }}>
                  I agree to the{' '}
                  <a href="#" className="underline font-medium" style={{ color: 'hsl(var(--brand))' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="underline font-medium" style={{ color: 'hsl(var(--brand))' }}>Privacy Policy</a>
                </span>
              </label>
              {errors.agreeTerms && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.agreeTerms}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-[hsl(var(--bg-surface))] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-1"
              style={{ background: 'hsl(var(--brand))', borderRadius: 0 }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>Create Account <ArrowRight size={15} weight="bold" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: 'hsl(var(--brand))' }}>
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>
            Your data is encrypted at rest and in transit.<br />
            AES-256 · TLS 1.3 · SOC 2 Type II certified
          </p>
        </div>
      </div>
    </div>
  );
}
