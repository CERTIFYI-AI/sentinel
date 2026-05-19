// src/components/auth/AuthLayout.tsx
import { type ReactNode, useEffect, useState } from "react";

function AnimatedCounter() {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1800;
    const target = 0.9247;
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, []);
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Live Trust Score</p>
      <p className="font-mono text-[88px] font-bold leading-none" style={{ color: "hsl(var(--brand))", textShadow: "0 0 40px hsl(136 45% 38% / 0.4)" }}>
        {val.toFixed(4)}
      </p>
    </div>
  );
}

const proofs = [
  "TAMPER-PROOF SHA-256 AUDIT CHAIN",
  "7 PREBUILT COMPLIANCE FRAMEWORKS",
  "REAL-TIME PIPELINE TRUST SCORING",
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10" style={{ background: "hsl(var(--brand-subtle))" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-none flex items-center justify-center font-mono font-bold text-foreground" style={{ background: "hsl(var(--brand))" }}>S</div>
          <div><span className="font-semibold text-foreground">Sentinel</span> <span className="text-muted-foreground">by Certifyi</span></div>
        </div>
        <div className="flex flex-col items-center gap-10">
          <AnimatedCounter />
          <div className="space-y-3">
            {proofs.map(p => (
              <div key={p} className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--brand))" }} />{p}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">certifyi.ai</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
