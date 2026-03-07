// src/components/auth/LoginForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "../../api/client";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<"apikey" | "email">("apikey");
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const body = tab === "apikey" ? { api_key: apiKey } : { email, password };
      const res = await login(body);
      localStorage.setItem("sentinel_token", res.access_token);
      onSuccess();
    } catch (err: unknown) {
      setError("Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in to Sentinel</h1>
        <p className="text-sm text-muted-foreground mt-1">AI governance platform</p>
      </div>

      <div className="flex border-b border-border">
        {(["apikey", "email"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "apikey" ? "API Key" : "Email & Password"}
          </button>
        ))}
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3">{error}</div>}

      {tab === "apikey" ? (
        <div className="relative">
          <input type={show ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-sentinel-..." className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <div className="flex justify-between"><label className="text-sm font-medium">Password</label>
              <button type="button" className="text-xs text-muted-foreground hover:text-[hsl(var(--brand-foreground))]">Forgot password?</button></div>
            <div className="relative mt-1">
              <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : tab === "apikey" ? "Continue" : "Sign in"}
      </button>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="text-[hsl(var(--brand-foreground))] hover:underline">Create one &rarr;</Link>
      </div>
    </form>
  );
}
