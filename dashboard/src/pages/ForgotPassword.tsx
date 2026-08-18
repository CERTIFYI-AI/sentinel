import { useState } from 'react';
import { Link } from 'react-router-dom';
import {

  ArrowLeft, EnvelopeSimple, ArrowRight, CheckCircle, ShieldCheck, Lock,
} from '@phosphor-icons/react';

type Step = 'request' | 'sent';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email) { setError('Email address is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return false; }
    return true;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep('sent');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'hsl(var(--bg-page))' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(hsl(var(--brand)/3%) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--brand)/3%) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse, hsl(var(--brand)/8%) 0%, transparent 70%)',
      }} />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="https://dignep.com.np/wp-content/uploads/2026/03/sentinel_logo.svg"
            alt="Sentinel AI"
            className="h-10 w-auto mb-4"
            onError={e => { (e.target as HTMLImageElement).src = '/sentinel-icon.svg'; (e.target as HTMLImageElement).className = 'h-10 w-10 mb-4'; }}
          />
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'hsl(var(--text-4))' }}>
            The trust layer for production AI
          </p>
        </div>

        {step === 'request' ? (
          <div className="border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', borderRadius: 0 }}>
            {/* Header */}
            <div className="px-8 py-6 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="w-10 h-10 flex items-center justify-center mb-4" style={{ background: 'hsl(var(--brand)/10%)', borderRadius: 0 }}>
                <Lock size={18} style={{ color: 'hsl(var(--brand))' }} />
              </div>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Reset your password</h1>
              <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
                Enter the work email associated with your Sentinel account. We'll send a secure reset link.
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-6 space-y-5">
              {error && (
                <div className="px-4 py-3 border text-sm" style={{ background: 'hsl(var(--s-er-bg))', borderColor: 'hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>
                    Work Email
                  </label>
                  <div className="relative">
                    <EnvelopeSimple size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'hsl(var(--text-4))' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border bg-[hsl(var(--bg-page))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] focus:border-[hsl(var(--brand))] transition-all"
                      style={{ borderRadius: 0, borderColor: error ? 'hsl(var(--s-er-br))' : 'hsl(var(--border))' }}
                      placeholder="you@company.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold text-[hsl(var(--bg-surface))] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: 'hsl(var(--brand))', borderRadius: 0 }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending reset link…
                    </>
                  ) : (
                    <>Send Reset Link <ArrowRight size={15} weight="bold" /></>
                  )}
                </button>
              </form>

              {/* Security note */}
              <div className="flex items-start gap-2.5 pt-1">
                <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--brand))' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>
                  Reset links expire after 15 minutes and can only be used once. All reset events are logged in your organization's audit trail.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
              <Link to="/login" className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: 'hsl(var(--text-3))' }}>
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          /* Success state */
          <div className="border text-center" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', borderRadius: 0 }}>
            <div className="px-8 py-10">
              <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5" style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0 }}>
                <CheckCircle size={28} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
              </div>

              <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Check your inbox</h2>
              <p className="text-sm mb-1" style={{ color: 'hsl(var(--text-3))' }}>
                We sent a secure reset link to
              </p>
              <p className="text-sm font-semibold mb-6" style={{ color: 'hsl(var(--brand))' }}>{email}</p>

              <div className="space-y-2 text-left mb-6">
                {[
                  'Click the link in the email to reset your password',
                  'The link expires in 15 minutes',
                  'Check your spam folder if you don\'t see it',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-bold" style={{ background: 'hsl(var(--brand)/10%)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{i + 1}</span>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{tip}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('request')}
                className="w-full py-2.5 text-sm font-medium border transition-colors mb-3"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))', borderRadius: 0, background: 'hsl(var(--bg-raised))' }}
              >
                Resend email
              </button>

              <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs font-medium hover:underline" style={{ color: 'hsl(var(--text-4))' }}>
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          </div>
        )}

        {/* "SOC 2 Type II" and "GDPR Compliant" badges stood here. Neither
            certification is held, and "GDPR Compliant" is not a certification
            anyone issues. Reduced to the one claim that is true. */}
        <p className="mt-6 text-center text-[10px] font-medium" style={{ color: 'hsl(var(--text-4))' }}>
          Reset links are single-use and time-limited · encrypted in transit
        </p>
      </div>
    </div>
  );
}
