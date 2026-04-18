// @ts-nocheck
import React, { useState } from "react";
import { Trash, Export, ArrowUp, ArrowDown, X, CheckSquare } from "@phosphor-icons/react";

// ── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  active:      { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  enabled:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  approved:    { bg: "hsl(152 60% 40% / 0.12)", color: "hsl(152 60% 30%)", border: "hsl(152 60% 40% / 0.3)" },
  conformant:  { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  complete:    { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  completed:   { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  pass:        { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  low:         { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  draft:       { bg: "hsl(45 93% 47% / 0.12)", color: "hsl(35 80% 35%)", border: "hsl(45 93% 47% / 0.3)" },
  pending:     { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  in_review:   { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  "in progress": { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  scheduled:   { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  investigating: { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  monitoring:  { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  piloting:    { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  planned:     { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  critical:    { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  failed:      { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  fail:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  high:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  error:       { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  "non-conformant": { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  inactive:    { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  disabled:    { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  archived:    { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  deprecated:  { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  medium:      { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  warning:     { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  running:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  healthy:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  degraded:    { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  down:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  open:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  resolved:    { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  closed:      { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const key = (status ?? "").toLowerCase().replace(/_/g, " ");
  const s = STATUS_STYLES[key] ?? { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-3))", border: "hsl(var(--border))" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${className}`}
      style={{ background: s.bg, color: s.color, borderColor: s.border, borderRadius: 0 }}
    >
      {status}
    </span>
  );
}

// ── BulkActionToolbar ────────────────────────────────────────────────────────

export function BulkActionToolbar({
  count,
  onClear,
  onDelete,
  onExport,
  onStatusChange,
}: {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onStatusChange?: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(var(--brand)/0.08)] border border-[hsl(var(--brand)/0.3)] mb-3">
      <CheckSquare size={16} className="text-[hsl(var(--brand))]" />
      <span className="text-sm font-medium text-[hsl(var(--text-1))]">{count} selected</span>
      <div className="ml-auto flex items-center gap-2">
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={12} /> Export
          </button>
        )}
        {onStatusChange && (
          <button onClick={onStatusChange} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            Bulk Status
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(0_72%_51%/0.4)] text-[hsl(0_72%_51%)] hover:bg-[hsl(0_72%_51%/0.08)]">
            <Trash size={12} /> Delete
          </button>
        )}
        <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]">
          <X size={12} /> Clear
        </button>
      </div>
    </div>
  );
}

// ── PaginationBar ────────────────────────────────────────────────────────────

export function PaginationBar({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
}: {
  total: number;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-3))]">
        <span>Show</span>
        <select
          value={perPage}
          onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
          className="border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] px-1 py-0.5 text-xs"
        >
          {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>· {total === 0 ? "0" : `${start}–${end} of ${total}`}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="px-2 py-1 text-xs border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--bg-raised))]"
        >
          ‹ Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`px-2 py-1 text-xs border ${page === p ? "bg-[hsl(var(--brand))] text-white border-[hsl(var(--brand))]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]"}`}
            >
              {p}
            </button>
          );
        })}
        <button
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          className="px-2 py-1 text-xs border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--bg-raised))]"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

// ── FormSection ──────────────────────────────────────────────────────────────

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-3 pb-1.5 border-b border-[hsl(var(--border))]">{title}</h4>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Field({
  label, required, error, hint, children, charCount,
}: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; charCount?: { current: number; max: number };
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--text-2))]">
        {label}
        {required && <span className="text-[hsl(0_72%_51%)]">*</span>}
      </label>
      {hint && <p className="text-xs text-[hsl(var(--text-4))]">{hint}</p>}
      {children}
      <div className="flex items-center justify-between">
        {error && <p className="text-xs text-[hsl(0_72%_51%)]">{error}</p>}
        {charCount && <p className="text-xs text-[hsl(var(--text-4))] ml-auto">{charCount.current}/{charCount.max}</p>}
      </div>
    </div>
  );
}

// ── SortIcon ─────────────────────────────────────────────────────────────────

export function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <span className="ml-1 opacity-30 text-xs">↕</span>;
  return sortDir === "asc" ? <ArrowUp size={11} className="ml-1 inline" /> : <ArrowDown size={11} className="ml-1 inline" />;
}

// ── Th (sortable header) ──────────────────────────────────────────────────────

export function Th({
  col, label, sortCol, sortDir, onSort, width,
}: {
  col: string; label: string; sortCol: string; sortDir: "asc" | "desc"; onSort: (c: string) => void; width?: string;
}) {
  return (
    <th
      className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] cursor-pointer select-none hover:text-[hsl(var(--text-2))] whitespace-nowrap"
      style={width ? { width } : {}}
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );
}

// ── MetaBar ───────────────────────────────────────────────────────────────────

export function MetaBar({ record }: { record: any }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))] text-xs">
      {[
        ["Record ID", record.id],
        ["Created At", record.createdAt ?? record.created_at ?? "—"],
        ["Created By", record.createdBy ?? record.created_by ?? "System"],
        ["Last Modified", record.updatedAt ?? record.updated_at ?? "—"],
      ].map(([k, v]) => (
        <div key={k}>
          <p className="text-[hsl(var(--text-4))] uppercase tracking-wider mb-0.5">{k}</p>
          <p className="text-[hsl(var(--text-2))] font-mono">{v}</p>
        </div>
      ))}
    </div>
  );
}

// ── ActivityTimeline ──────────────────────────────────────────────────────────

export function ActivityTimeline({ items }: { items: { date: string; actor: string; action: string }[] }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-3">Audit Trail</p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))] mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[hsl(var(--text-2))]"><span className="font-medium">{item.actor}</span> {item.action}</p>
              <p className="text-xs text-[hsl(var(--text-4))]">{item.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── useSort hook ──────────────────────────────────────────────────────────────

export function useSortAndPage<T>(items: T[], defaultSortCol: keyof T) {
  const [sortCol, setSortCol] = useState<keyof T>(defaultSortCol);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col as keyof T); setSortDir("asc"); }
    setPage(1);
  };

  const sorted = [...items].sort((a, b) => {
    const aVal = String(a[sortCol] ?? "");
    const bVal = String(b[sortCol] ?? "");
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === paged.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map((i: any) => i.id)));
  };

  const clearSelected = () => setSelectedIds(new Set());

  return {
    sortCol: sortCol as string, sortDir, handleSort,
    page, perPage, setPage, setPerPage,
    sorted, paged, total: items.length,
    selectedIds, toggleSelect, toggleAll, clearSelected,
  };
}

// ── Modal shell ───────────────────────────────────────────────────────────────

export function CrudModal({
  open, onClose, title, size = "lg", children,
}: {
  open: boolean; onClose: () => void; title: string; size?: "sm" | "md" | "lg" | "xl"; children: React.ReactNode;
}) {
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 pb-8 px-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl w-full ${widths[size]} max-h-[88vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <h3 className="text-base font-semibold text-[hsl(var(--text-1))]">{title}</h3>
          <button onClick={onClose} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── FormFooter ────────────────────────────────────────────────────────────────

export function FormFooter({
  onCancel, onSaveDraft, onSubmit, loading, submitLabel = "Save & Submit",
}: {
  onCancel: () => void; onSaveDraft?: () => void; onSubmit: () => void; loading?: boolean; submitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[hsl(var(--border))] flex-shrink-0 bg-[hsl(var(--card))]">
      <button onClick={onCancel} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
        Cancel
      </button>
      <div className="flex items-center gap-2">
        {onSaveDraft && (
          <button onClick={onSaveDraft} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            Save as Draft
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-5 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

// ── TableInput (inline form field) ─────────────────────────────────────────────

export function TInput({
  label, value, onChange, placeholder, type = "text", required,
}: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-[hsl(var(--text-2))]">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] outline-none focus:border-[hsl(var(--brand))] placeholder:text-[hsl(var(--text-4))]"
      />
    </div>
  );
}

export function TSelect({
  label, value, onChange, options, required,
}: {
  label?: string; value: string; onChange: (v: string) => void; options: string[] | { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-[hsl(var(--text-2))]">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--text-1))] outline-none focus:border-[hsl(var(--brand))]"
      >
        <option value="">— Select —</option>
        {options.map((o: any) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

export function TTextarea({
  label, value, onChange, placeholder, rows = 3, maxLength, required,
}: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-[hsl(var(--text-2))]">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] outline-none focus:border-[hsl(var(--brand))] placeholder:text-[hsl(var(--text-4))] resize-y"
      />
      {maxLength && <p className="text-xs text-[hsl(var(--text-4))] text-right">{value.length}/{maxLength}</p>}
    </div>
  );
}

export function TToggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--text-2))]">{label}</p>
        {hint && <p className="text-xs text-[hsl(var(--text-4))]">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-[hsl(var(--brand))]" : "bg-[hsl(var(--border))]"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export function TCheckGroup({
  label, options, value, onChange,
}: {
  label?: string; options: string[]; value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-[hsl(var(--text-2))]">{label}</label>}
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer text-[hsl(var(--text-2))]">
            <input
              type="checkbox"
              checked={value.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded border-[hsl(var(--border))]"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
