import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield } from 'lucide-react';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', organization: '', agreeTerms: false });
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
    else if (form.password.length < 8) e.password = 'Min 8 characters';
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

  const inp = 'w-full px-3 py-2.5 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-gray-400 mt-1">Get started with Certifyi Sentinel</p>
        </div>
        <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6 shadow-2xl">
          {errors.form && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{errors.form}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} placeholder="John Doe" />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inp} placeholder="john@company.com" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={inp} placeholder="Min 8 chars" />
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} className={inp} placeholder="Re-enter" />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Organization</label>
              <input value={form.organization} onChange={(e) => set('organization', e.target.value)} className={inp} placeholder="Acme Corp" />
              {errors.organization && <p className="mt-1 text-xs text-red-400">{errors.organization}</p>}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={form.agreeTerms} onChange={(e) => set('agreeTerms', e.target.checked)} className="rounded border-gray-600" />
                I agree to the <a href="#" className="text-emerald-400">Terms of Service</a> and <a href="#" className="text-emerald-400">Privacy Policy</a>
              </label>
              {errors.agreeTerms && <p className="mt-1 text-xs text-red-400">{errors.agreeTerms}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account? <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
