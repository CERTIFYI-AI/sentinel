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
                  className={`text-xs p-1.5 rounded text-center transition-colors ${isSelected ? "bg-[hsl(var(--primary))] text-foreground" : isToday ? "text-[hsl(var(--primary))] font-bold" : "hover:bg-[hsl(var(--surface-2))]"} ${isPast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
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
