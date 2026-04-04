import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setErrors({ form: 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="https://dignep.com.np/wp-content/uploads/2026/03/sentinel_logo.svg" alt="Certifyi Sentinel" className="h-14 w-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">Certifyi Sentinel</h1>
          <p className="text-sm text-gray-400 mt-1">AI Governance & Compliance Platform</p>
        </div>
        <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-6">Enter your credentials to access the dashboard</p>
          {errors.form && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{errors.form}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                placeholder="admin@certifyi.ai" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                placeholder="Enter your password" />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-400"><input type="checkbox" className="rounded border-gray-600" /> Remember me</label>
              <a href="#" className="text-sm text-emerald-400 hover:text-emerald-300">Forgot password?</a>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account? <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
