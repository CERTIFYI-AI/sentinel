import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Eye, EyeSlash, ShieldCheck, CheckCircle, Lock, ArrowRight,
} from '@phosphor-icons/react';
import { TERMS_URL, PRIVACY_URL, EXTERNAL_LINK_PROPS } from '@/lib/legal';

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
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(hsl(var(--brand)/4%) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--brand)/4%) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      {/* Radial glow */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, hsl(var(--brand)/12%) 0%, transparent 70%)',
      }} />

      <div className="relative z-10">
        {/* Logo */}
        <img
          src="https://dignep.com.np/wp-content/uploads/2026/08/sentinel_logo.svg"
          alt="Sentinel AI"
          className="h-9 w-auto mb-12"
          onError={e => { (e.target as HTMLImageElement).src = '/sentinel-icon.svg'; (e.target as HTMLImageElement).className = 'h-9 w-9 mb-12'; }}
        />

        {/* Hero copy */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold leading-tight mb-4" style={{ color: 'hsl(var(--text-1))' }}>
            The trust layer for<br />
            <span style={{ color: 'hsl(var(--brand))' }}>production AI.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
            Enterprise AI governance, risk and compliance — built for the teams responsible for safe, compliant AI deployment at scale.
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-3">
          {FEATURES.map(f => (
            <li key={f} className="flex items-start gap-3">
              <CheckCircle size={16} weight="fill" className="flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--brand))' }} />
              <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* Framework badges */}
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

      {/* Bottom testimonial */}
      <div className="relative z-10">
        {/* A fabricated testimonial ("CISO, Fortune 500 Financial Services
            Firm") and three unearned trust badges (SOC 2 Type II, ISO 27001,
            GDPR Compliant) stood here. No such customer statement exists and
            no such certification is held, so all four were invented assurance
            on the front door of a compliance product. Replaced with what is
            actually true and verifiable. See docs/legal/README.md. */}
        <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
          Govern every AI system you ship — inventory, risk classification,
          controls, evidence and incidents — against the frameworks your
          auditors actually ask about.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          {FRAMEWORKS.map((fw, i) => (
            <div key={fw} className="flex items-center gap-2">
              {i > 0 && <span style={{ color: 'hsl(var(--border))' }}>·</span>}
              <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>{fw}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>
          Frameworks the platform helps you prepare for. Preparing for an audit
          is not the same as holding a certification, and we do not claim one.
        </p>

      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate('/overview');
    } catch {
      setErrors({ form: 'Invalid credentials. Please check your email and password.' });
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full px-3.5 py-2.5 text-sm border bg-[hsl(var(--bg-page))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] focus:border-[hsl(var(--brand))] transition-all`;
  const inputClass = (err: boolean) => `${inputBase} ${err ? 'border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))]' : 'border-[hsl(var(--border))]'}`;

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--bg-page))' }}>
      {/* Left — brand panel */}
      <div className="lg:w-[480px] xl:w-[520px] flex-shrink-0">
        <BrandPanel />
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center">
          <img src="/sentinel-icon.svg" alt="Sentinel" className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-3))' }}>The trust layer for production AI</p>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Sign in to your workspace</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Enter your credentials to continue to Sentinel AI</p>
          </div>

          {/* Demo credentials banner — dev builds only; never render credentials in production */}
          {import.meta.env.DEV && (
          <div className="mb-6 p-3.5 border" style={{ borderColor: 'hsl(var(--brand)/30%)', background: 'hsl(var(--brand)/5%)', borderRadius: 0 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--brand))' }}>Demo Access</p>
                <div className="space-y-0.5">
                  {[
                    { label: 'CISO', email: 'admin@certifyi.ai' },
                    { label: 'Auditor', email: 'auditor@certifyi.ai' },
                  ].map(u => (
                    <button key={u.email} onClick={() => { setEmail(u.email); setPassword('Demo@12345'); setErrors({}); }}
                      className="flex items-center gap-2 text-xs w-full text-left hover:opacity-80 transition-opacity">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold" style={{ background: 'hsl(var(--brand)/15%)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{u.label}</span>
                      <span style={{ color: 'hsl(var(--text-3))' }}>{u.email}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Password</p>
                <p className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Demo@12345</p>
              </div>
            </div>
          </div>
          )}

          {/* Error alert */}
          {errors.form && (
            <div className="mb-5 px-4 py-3 border text-sm flex items-start gap-2.5" style={{
              background: 'hsl(var(--s-er-bg))',
              borderColor: 'hsl(var(--s-er-br))',
              color: 'hsl(var(--s-er-tx))',
              borderRadius: 0,
            }}>
              <span className="text-base leading-none mt-0.5">⚠</span>
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass(!!errors.email)}
                style={{ borderRadius: 0 }}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass(!!errors.password) + ' pr-11'}
                  style={{ borderRadius: 0 }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ color: 'hsl(var(--text-4))' }}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{errors.password}</p>}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 accent-[hsl(var(--brand))]"
              />
              <label htmlFor="remember" className="text-sm cursor-pointer" style={{ color: 'hsl(var(--text-3))' }}>
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-[hsl(var(--bg-surface))] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-2"
              style={{ background: 'hsl(var(--brand))', borderRadius: 0 }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRight size={15} weight="bold" /></>
              )}
            </button>
          </form>

          {/* SSO divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>OR CONTINUE WITH SSO</span>
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
          </div>

          {/* SSO buttons */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Microsoft Entra', abbr: 'MS' },
              { label: 'Okta / SAML', abbr: 'OK' },
            ].map(sso => (
              <button
                key={sso.label}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border transition-colors hover:border-[hsl(var(--brand)/50%)] hover:bg-[hsl(var(--brand)/4%)]"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))', borderRadius: 0, background: 'hsl(var(--bg-raised))' }}
              >
                <span className="w-5 h-5 flex items-center justify-center text-[9px] font-black" style={{ background: 'hsl(var(--brand)/15%)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{sso.abbr}</span>
                {sso.label}
              </button>
            ))}
          </div>

          {/* Sign up link */}
          <p className="mt-8 text-center text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: 'hsl(var(--brand))' }}>
              Request access
            </Link>
          </p>

          {/* Legal footer. The links must resolve: agreeing to a document you
              cannot open is not agreement. Security posture is stated as what
              we actually do — no certification is claimed, because none is
              held (see docs/legal/README.md). */}
          <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
            By signing in you agree to our{' '}
            <a href={TERMS_URL} {...EXTERNAL_LINK_PROPS} className="underline hover:text-[hsl(var(--brand-hover))]" style={{ color: 'hsl(var(--brand))' }}>Terms of Service</a>
            {' '}and{' '}
            <a href={PRIVACY_URL} {...EXTERNAL_LINK_PROPS} className="underline hover:text-[hsl(var(--brand-hover))]" style={{ color: 'hsl(var(--brand))' }}>Privacy Policy</a>.
            <br />Encrypted in transit with TLS · tenant isolation enforced in the database
          </p>
        </div>
      </div>
    </div>
  );
}
