import { useState, useRef, useEffect } from "react";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
}

interface AvatarPickerProps {
  value: TeamMember | null;
  onChange: (member: TeamMember | null) => void;
  label?: string;
}

const TEAM: TeamMember[] = [
  { id: "1", name: "Alex Kim", email: "alex@certifyi.ai", initials: "AK" },
  { id: "2", name: "Sam Rivera", email: "sam@certifyi.ai", initials: "SR" },
  { id: "3", name: "Jordan Lee", email: "jordan@certifyi.ai", initials: "JL" },
  { id: "4", name: "Morgan Chen", email: "morgan@certifyi.ai", initials: "MC" },
  { id: "5", name: "Casey Park", email: "casey@certifyi.ai", initials: "CP" },
];

export function AvatarPicker({ value, onChange, label }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = TEAM.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      {label && <span className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1 block">{label}</span>}
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 px-2 py-1 rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] text-sm">
        {value ? (<><span className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] text-foreground flex items-center justify-center text-[11px] font-medium">{value.initials}</span><span className="text-xs">{value.name}</span></>) : (<><span className="w-7 h-7 rounded-full border-2 border-dashed border-[hsl(var(--muted-foreground))]" /><span className="text-xs text-[hsl(var(--muted-foreground))]">Assign...</span></>)}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-[200px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-1">
          <input className="w-full px-2 py-1.5 text-xs bg-transparent border-b border-[hsl(var(--border))] outline-none mb-1" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <div className="max-h-[180px] overflow-y-auto">
            {filtered.map(m => (
              <button key={m.id} type="button" onClick={() => { onChange(m); setOpen(false); setSearch(""); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[hsl(var(--surface-2))]">
                <span className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-foreground flex items-center justify-center text-[10px] font-medium shrink-0">{m.initials}</span>
                <div className="text-left min-w-0"><div className="text-xs font-medium truncate">{m.name}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{m.email}</div></div>
                {value?.id === m.id && <svg className="w-4 h-4 ml-auto text-[hsl(var(--primary))]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
            ))}
          </div>
          {value && <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="w-full text-left px-2 py-1.5 text-[11px] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--surface-2))] rounded mt-1 border-t border-[hsl(var(--border))] pt-2">Unassign</button>}
        </div>
      )}
    </div>
  );
}
