import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, Eye, EyeSlash } from '@phosphor-icons/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
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

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2.5 bg-[hsl(var(--bg-raised))] border text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))/50%] focus:border-[hsl(var(--brand))] transition-colors text-sm ${hasError ? 'border-[hsl(var(--s-er-br))]' : 'border-[hsl(var(--border))]'}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-page))] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[hsl(var(--brand))] flex items-center justify-center mb-3">
            <ShieldCheck size={24} weight="fill" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Certifyi Sentinel</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-1">AI Governance & Compliance Platform</p>
        </div>

        <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] p-6 shadow-[var(--shadow-md)]">
          <h2 className="text-lg font-semibold text-[hsl(var(--text-1))] mb-1">Sign in</h2>
          <p className="text-sm text-[hsl(var(--text-3))] mb-6">Enter your credentials to access the dashboard</p>

          {errors.form && (
            <div className="mb-4 p-3 bg-[hsl(var(--s-er-bg))] border border-[hsl(var(--s-er-br))] text-[hsl(var(--s-er-tx))] text-sm">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass(!!errors.email)}
                placeholder="admin@certifyi.ai"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--text-2))] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass(!!errors.password) + ' pr-10'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[hsl(var(--s-er-tx))]">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--text-3))] cursor-pointer">
                <input type="checkbox" className="border-[hsl(var(--border))]" />
                Remember me
              </label>
              <a href="#" className="text-sm text-[hsl(var(--brand))] hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] disabled:opacity-50 text-white font-medium transition-colors text-sm"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[hsl(var(--text-3))]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[hsl(var(--brand))] hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[hsl(var(--text-4))] mt-6">
          Protected by enterprise-grade security · SOC 2 Type II certified
        </p>
      </div>
    </div>
  );
}
