// src/components/auth/SignupForm.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { register, login } from "../../api/client";

function strengthLevel(pw: string): number {
  if (pw.length < 8) return 0;
  let s = 1;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) s = 2;
  if (pw.length >= 12 && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s = 3;
  return s;
}
const strengthColors = ["bg-destructive", "bg-[hsl(var(--trust-medium))]", "bg-[hsl(var(--trust-high))]", "bg-primary"];
const plans = [
  { id: "free", label: "FREE", price: "$0/month", features: "1,000 requests/mo · 1 tenant · Community support" },
  { id: "pro", label: "MOST POPULAR", price: "$49/month", features: "50,000 requests/mo · 5 tenants · Email support · All frameworks" },
  { id: "enterprise", label: "ENTERPRISE", price: "Contact sales", features: "Unlimited · Custom tenants · SLA · Dedicated support" },
] as const;

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = strengthLevel(password);
  const canStep1 = orgName.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password === confirm && strength >= 1;

  async function handleSubmit() {
    setLoading(true); setErrors({});
    try {
      await register({ org_name: orgName, email, password, plan });
      const tok = await login({ email, password });
      localStorage.setItem("sentinel_token", tok.access_token);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e.status === 409) setErrors({ email: "An account with this email already exists" });
      else setErrors({ form: "Registration failed. Please try again." });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{step === 1 ? "Create your account" : "Choose your plan"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{step === 1 ? "Get started in under 2 minutes" : "All plans include a 14-day free trial"}</p>
      </div>
      {errors.form && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3">{errors.form}</div>}
      {step === 1 ? (
        <div className="space-y-4">
          <div><label className="text-sm font-medium">Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div><label className="text-sm font-medium">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div><label className="text-sm font-medium">Create password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-1 mt-2">{[0,1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : "bg-muted"}`} />)}</div>
          </div>
          <div><label className="text-sm font-medium">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {confirm && confirm !== password && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
          </div>
          <button onClick={() => setStep(2)} disabled={!canStep1}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            Continue <ArrowRight className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(p => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${plan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-widest font-medium ${p.id === "pro" ? "text-primary" : "text-muted-foreground"}`}>{p.label}</span>
                {plan === p.id && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.features}</p>
              <p className="font-mono text-sm font-semibold mt-2">{p.price}</p>
            </button>
          ))}
          <p className="text-[11px] text-muted-foreground">By creating an account you agree to our <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.</p>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="h-10 px-4 rounded-md border border-border text-sm hover:bg-accent flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : "Create account"}</button>
          </div>
        </div>
      )}
      <div className="text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="text-[hsl(var(--brand-foreground))] hover:underline">Sign in</Link>
      </div>
    </div>
  );
}
