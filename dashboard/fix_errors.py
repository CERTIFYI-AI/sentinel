import os

BASE = '/workspaces/sentinel/dashboard/src'

def w(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f'  wrote {path}')

print('=== Certifyi Sentinel Deep Feature Build ===')
print('Generating 27 files...\n')

# FILE 1: AvatarPicker
print('FILE 1/27: AvatarPicker.tsx')
w('components/ui/AvatarPicker.tsx', r'''
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
        {value ? (<><span className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-[11px] font-medium">{value.initials}</span><span className="text-xs">{value.name}</span></>) : (<><span className="w-7 h-7 rounded-full border-2 border-dashed border-[hsl(var(--muted-foreground))]" /><span className="text-xs text-[hsl(var(--muted-foreground))]">Assign...</span></>)}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-[200px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-1">
          <input className="w-full px-2 py-1.5 text-xs bg-transparent border-b border-[hsl(var(--border))] outline-none mb-1" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <div className="max-h-[180px] overflow-y-auto">
            {filtered.map(m => (
              <button key={m.id} type="button" onClick={() => { onChange(m); setOpen(false); setSearch(""); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[hsl(var(--surface-2))]">
                <span className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-[10px] font-medium shrink-0">{m.initials}</span>
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
''')

# FILE 2: ConfirmDialog
print('FILE 2/27: ConfirmDialog.tsx')
w('components/ui/ConfirmDialog.tsx', r'''
import { useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type?: "danger" | "warning" | "info";
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  requiresTyping?: string;
  checklist?: string[];
}

export function ConfirmDialog({ open, onClose, onConfirm, type = "info", title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", requiresTyping, checklist }: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!open) return null;
  const typingValid = !requiresTyping || typed === requiresTyping;
  const checklistValid = !checklist || checklist.every((_, i) => checked[i]);
  const canConfirm = typingValid && checklistValid;
  const colors = { danger: "bg-[hsl(var(--destructive))] text-white", warning: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))]", info: "bg-[hsl(var(--primary))] text-white" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{message}</div>
        {checklist && (
          <div className="space-y-2 mb-4">
            {checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!checked[i]} onChange={e => setChecked(p => ({ ...p, [i]: e.target.checked }))} className="rounded border-[hsl(var(--border))]" />
                {item}
              </label>
            ))}
          </div>
        )}
        {requiresTyping && (
          <div className="mb-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Type <strong>{requiresTyping}</strong> to confirm</p>
            <input className="w-full px-3 py-2 text-sm border rounded-md bg-transparent border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))]" value={typed} onChange={e => setTyped(e.target.value)} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-[hsl(var(--surface-2))]">{cancelLabel}</button>
          <button onClick={() => { onConfirm(); onClose(); setTyped(""); setChecked({}); }} disabled={!canConfirm} className={`px-4 py-2 text-sm rounded-md ${colors[type]} disabled:opacity-50 disabled:cursor-not-allowed`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
''')

# FILE 3: DatePicker
print('FILE 3/27: DatePicker.tsx')
w('components/ui/DatePicker.tsx', r'''
import { useState, useRef, useEffect, useMemo } from "react";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disablePast?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "Select date", disablePast = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = Array(first).fill(null);
    for (let i = 1; i <= count; i++) arr.push(i);
    return arr;
  }, [year, month]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmt = (d: string) => { const dt = new Date(d); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--surface-2))] w-full text-left">
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span className={value ? "" : "text-[hsl(var(--muted-foreground))]"}>{value ? fmt(value) : placeholder}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-3 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1))} className="p-1 hover:bg-[hsl(var(--surface-2))] rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <span className="text-sm font-medium">{monthNames[month]} {year}</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1))} className="p-1 hover:bg-[hsl(var(--surface-2))] rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(d => <div key={d} className="text-center text-[10px] text-[hsl(var(--muted-foreground))] py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const isToday = new Date(dateStr).getTime() === today.getTime();
              const isSelected = value === dateStr;
              const isPast = disablePast && new Date(dateStr) < today;
              return (
                <button key={i} type="button" disabled={isPast} onClick={() => { onChange(dateStr); setOpen(false); }}
                  className={`text-xs p-1.5 rounded text-center transition-colors ${isSelected ? "bg-[hsl(var(--primary))] text-white" : isToday ? "text-[hsl(var(--primary))] font-bold" : "hover:bg-[hsl(var(--surface-2))]"} ${isPast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs text-[hsl(var(--muted-foreground))] hover:underline">Clear</button>
            <button type="button" onClick={() => { const t = new Date(); onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`); setOpen(false); }} className="text-xs text-[hsl(var(--primary))] hover:underline">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
''')

# FILE 4: DateRangePicker
print('FILE 4/27: DateRangePicker.tsx')
w('components/ui/DateRangePicker.tsx', r'''
import { useState } from "react";
import { DatePicker } from "./DatePicker";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
}

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker value={startDate} onChange={onStartChange} placeholder="Start date" />
      <span className="text-[hsl(var(--muted-foreground))] text-sm">to</span>
      <DatePicker value={endDate} onChange={onEndChange} placeholder="End date" />
    </div>
  );
}
''')

# FILE 5: CommandPalette (update)
print('FILE 5/27: CommandPalette.tsx update')
w('components/ui/CommandPalette.tsx', r'''
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  type: "page" | "eval" | "control" | "evidence" | "risk" | "vendor" | "task" | "action";
  title: string;
  subtitle?: string;
  path?: string;
  action?: () => void;
}

const PAGES: SearchResult[] = [
  { type: "page", title: "Dashboard", subtitle: "Overview", path: "/overview" },
  { type: "page", title: "Audit Log", subtitle: "Trust & Safety", path: "/audit-log" },
  { type: "page", title: "HITL Queue", subtitle: "Trust & Safety", path: "/hitl-queue" },
  { type: "page", title: "Incident Log", subtitle: "Trust & Safety", path: "/incidents" },
  { type: "page", title: "Compliance", subtitle: "Compliance", path: "/compliance" },
  { type: "page", title: "Control Requirements", subtitle: "Compliance", path: "/compliance/controls" },
  { type: "page", title: "Evidence Hub", subtitle: "Compliance", path: "/compliance/evidence" },
  { type: "page", title: "Policy Editor", subtitle: "Compliance", path: "/policies" },
  { type: "page", title: "Model Inventory", subtitle: "Risk & Models", path: "/models" },
  { type: "page", title: "Risk Matrix", subtitle: "Risk & Models", path: "/risk-matrix" },
  { type: "page", title: "Risk Register", subtitle: "Risk & Models", path: "/risk/register" },
  { type: "page", title: "Vendor Register", subtitle: "Risk & Models", path: "/risk/vendors" },
  { type: "page", title: "Benchmark", subtitle: "Evaluation", path: "/benchmark" },
  { type: "page", title: "Experiments", subtitle: "Evaluation", path: "/evals/experiments" },
  { type: "page", title: "Dataset Hub", subtitle: "Evaluation", path: "/evals/datasets" },
  { type: "page", title: "Metric Studio", subtitle: "Evaluation", path: "/evals/metrics" },
  { type: "page", title: "Tasks", subtitle: "Operations", path: "/tasks" },
  { type: "page", title: "Dependency Graph", subtitle: "Infrastructure", path: "/graph" },
  { type: "page", title: "Activity Log", subtitle: "Infrastructure", path: "/activity" },
  { type: "page", title: "Remediation", subtitle: "Operations", path: "/remediation" },
  { type: "page", title: "Export Center", subtitle: "Operations", path: "/exports" },
  { type: "page", title: "Settings", subtitle: "System", path: "/settings" },
];

const ACTIONS: SearchResult[] = [
  { type: "action", title: "Run evaluation", subtitle: "Start a new eval run", path: "/evals/experiments/new" },
  { type: "action", title: "Upload evidence", subtitle: "Add compliance evidence", path: "/compliance/evidence" },
  { type: "action", title: "Register risk", subtitle: "Add to risk register", path: "/risk/register" },
  { type: "action", title: "Register vendor", subtitle: "Add vendor record", path: "/risk/vendors" },
  { type: "action", title: "Create task", subtitle: "New compliance task", path: "/tasks" },
  { type: "action", title: "Generate compliance report", subtitle: "Gap analysis", path: "/compliance" },
  { type: "action", title: "Export audit log", subtitle: "Last 30 days", path: "/activity" },
  { type: "action", title: "Open dependency graph", subtitle: "Visualise relationships", path: "/graph" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const results = useMemo(() => {
    if (!query.trim()) return [...PAGES.slice(0, 5), ...ACTIONS.slice(0, 3)];
    const q = query.toLowerCase();
    return [...PAGES, ...ACTIONS].filter(r => r.title.toLowerCase().includes(q) || (r.subtitle?.toLowerCase().includes(q)));
  }, [query]);
  if (!open) return null;
  const typeIcons: Record<string, string> = { page: "P", eval: "E", control: "C", evidence: "Ev", risk: "R", vendor: "V", task: "T", action: "A" };
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => { setOpen(false); setQuery(""); }} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center border-b border-[hsl(var(--border))] px-4">
          <svg className="w-4 h-4 mr-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="flex-1 py-3 text-sm bg-transparent outline-none" placeholder="Search pages, actions, controls..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {results.length === 0 && <div className="text-sm text-center py-6 text-[hsl(var(--muted-foreground))]">No results found</div>}
          {results.map((r, i) => (
            <button key={i} onClick={() => { if (r.path) navigate(r.path); if (r.action) r.action(); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[hsl(var(--surface-2))] text-left">
              <span className="w-6 h-6 rounded bg-[hsl(var(--surface-3))] flex items-center justify-center text-[10px] font-bold shrink-0">{typeIcons[r.type] || "?"}</span>
              <div className="min-w-0"><div className="text-sm font-medium truncate">{r.title}</div>{r.subtitle && <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{r.subtitle}</div>}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
''')



# FILE 6: EvalRunWizard
print('FILE 6/27: EvalRunWizard.tsx')
w('pages/evals/EvalRunWizard.tsx', r'''