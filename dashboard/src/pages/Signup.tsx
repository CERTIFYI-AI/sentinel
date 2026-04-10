import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck } from '@phosphor-icons/react';

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', organization: '', agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore((s) => s.signup);
  const navigate = useNavigate();

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.organization.trim()) e.organization = 'Organization is required';
    if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms';
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
      setErrors({ form: 'Signup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2.5 bg-[hsl(var(--bg-raised))] border text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))/50%] focus:border-[hsl(var(--brand))] transition-colors text-sm ${hasError ? 'border-[hsl(var(--s-er-br))]' : 'border-[hsl(var(--border))]'}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-page))] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[hsl(var(--brand))] flex items-center justify-center mb-3">
            <ShieldCheck size={24} weight="fill" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Create Account</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-1">Get started with Certifyi Sentinel</p>
        </div>

        <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] p-6 shadow-[var(--shadow-md)]">
          {errors.form && (
            <div className="mb-4 p-3 bg-[hsl(var(--s-er-bg))] border border-[hsl(var(--s-er-br))] text-[hsl(var(--s-er-tx))] text-sm">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputClass(!!errors.name)}
                placeholder="Jane Smith"
                autoComplete="name"
              />
              {errors.name && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">Work Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass(!!errors.email)}
                placeholder="jane@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={inputClass(!!errors.password)}
                  placeholder="Min 8 chars"
                  autoComplete="new-password"
                />
                {errors.password && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">Confirm</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  className={inputClass(!!errors.confirmPassword)}
                  placeholder="Re-enter"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">Organization</label>
              <input
                value={form.organization}
                onChange={(e) => set('organization', e.target.value)}
                className={inputClass(!!errors.organization)}
                placeholder="Acme Corp"
                autoComplete="organization"
              />
              {errors.organization && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.organization}</p>}
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-sm text-[hsl(var(--text-3))] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(e) => set('agreeTerms', e.target.checked)}
                  className="mt-0.5 border-[hsl(var(--border))]"
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="text-[hsl(var(--brand))] hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-[hsl(var(--brand))] hover:underline">Privacy Policy</a>
                </span>
              </label>
              {errors.agreeTerms && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.agreeTerms}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] disabled:opacity-50 text-white font-medium transition-colors text-sm"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[hsl(var(--text-3))]">
            Already have an account?{' '}
            <Link to="/login" className="text-[hsl(var(--brand))] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
