import React, { useState } from "react";
import { Trash, Export, ArrowUp, ArrowDown, X, CheckSquare } from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// ── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  active:      { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  enabled:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  approved:    { bg: "hsl(152 60% 40% / 0.12)", color: "hsl(152 60% 30%)", border: "hsl(152 60% 40% / 0.3)" },
  conformant:  { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  complete:    { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  completed:   { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  acknowledged:{ bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  current:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  pass:        { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  low:         { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  filed:       { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  draft:       { bg: "hsl(45 93% 47% / 0.12)", color: "hsl(35 80% 35%)", border: "hsl(45 93% 47% / 0.3)" },
  pending:     { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  in_review:   { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  "in progress": { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  "under review": { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  "ready to file": { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  "not started": { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  scheduled:   { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  investigating: { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  monitoring:  { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  piloting:    { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  planned:     { bg: "hsl(220 90% 56% / 0.12)", color: "hsl(220 80% 45%)", border: "hsl(220 90% 56% / 0.3)" },
  due:         { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  overdue:     { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  critical:    { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  failed:      { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  fail:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  high:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  error:       { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  "non-conformant": { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  "requires supplementary measures": { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  inactive:    { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  disabled:    { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  archived:    { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  deprecated:  { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  suspended:   { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  revoked:     { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  cancelled:   { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  closed:      { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  decommissioning: { bg: "hsl(var(--bg-raised))", color: "hsl(var(--text-4))", border: "hsl(var(--border))" },
  medium:      { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  warning:     { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  running:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  healthy:     { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  degraded:    { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
  down:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  open:        { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" },
  resolved:    { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 35%)", border: "hsl(142 71% 45% / 0.3)" },
  maintenance: { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(28 80% 35%)", border: "hsl(38 92% 50% / 0.3)" },
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
// Accepts either individual callbacks (onDelete, onExport) OR an `actions` array

export function BulkActionToolbar({
  count,
  onClear,
  onDelete,
  onExport,
  onStatusChange,
  actions,
}: {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onStatusChange?: () => void;
  actions?: { label: string; onClick: () => void; variant?: string }[];
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[hsl(var(--brand)/0.08)] border border-[hsl(var(--brand)/0.3)] mb-3">
      <CheckSquare size={16} className="text-[hsl(var(--brand))]" />
      <span className="text-sm font-medium text-[hsl(var(--text-1))]">{count} selected</span>
      <div className="ml-auto flex items-center gap-2">
        {/* actions array API */}
        {actions?.map(a => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border ${
              a.variant === "destructive"
                ? "border-[hsl(0_72%_51%/0.4)] text-[hsl(0_72%_51%)] hover:bg-[hsl(0_72%_51%/0.08)]"
                : "border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"
            }`}
          >
            {a.label}
          </button>
        ))}
        {/* individual callbacks API */}
        {!actions && onExport && (
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={12} /> Export
          </button>
        )}
        {!actions && onStatusChange && (
          <button onClick={onStatusChange} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            Bulk Status
          </button>
        )}
        {!actions && onDelete && (
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
// Accepts either individual props OR a `sp` object from useSortAndPage

export function PaginationBar({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
  sp,
}: {
  total?: number;
  page?: number;
  perPage?: number;
  onPage?: (p: number) => void;
  onPerPage?: (n: number) => void;
  sp?: any;
}) {
  // Resolve props — prefer sp if provided
  const _total   = sp ? sp.total    : (total ?? 0);
  const _page    = sp ? sp.currentPage : (page ?? 1);
  const _perPage = sp ? sp.perPage  : (perPage ?? 10);
  const _onPage  = sp ? sp.setPage  : onPage;
  const _onPerPage = sp ? sp.setPerPage : onPerPage;

  const totalPages = Math.max(1, Math.ceil(_total / _perPage));
  const start = (_page - 1) * _perPage + 1;
  const end = Math.min(_page * _perPage, _total);
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-3))]">
        <span>Show</span>
        <select
          value={_perPage}
          onChange={e => { _onPerPage?.(Number(e.target.value)); _onPage?.(1); }}
          className="border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-2))] px-1 py-0.5 text-xs"
        >
          {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>· {_total === 0 ? "0" : `${start}–${end} of ${_total}`}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={_page === 1}
          onClick={() => _onPage?.(_page - 1)}
          className="px-2 py-1 text-xs border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-[hsl(var(--bg-raised))]"
        >
          ‹ Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => _onPage?.(p)}
              className={`px-2 py-1 text-xs border ${_page === p ? "bg-[hsl(var(--brand))] text-white border-[hsl(var(--brand))]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]"}`}
            >
              {p}
            </button>
          );
        })}
        <button
          disabled={_page === totalPages}
          onClick={() => _onPage?.(_page + 1)}
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
// Accepts either individual (sortCol, sortDir, onSort) OR sp object from useSortAndPage

export function Th({
  col, label, sortCol, sortDir, onSort, width, sp,
}: {
  col: string;
  label: string;
  sortCol?: string;
  sortDir?: "asc" | "desc";
  onSort?: (c: string) => void;
  width?: string;
  sp?: any;
}) {
  // Resolve props — prefer sp if provided
  const _sortCol = sp ? sp.sortCol : (sortCol ?? "");
  const _sortDir = sp ? sp.sortDir : (sortDir ?? "asc");
  const _onSort  = sp ? sp.handleSort : (onSort ?? (() => {}));

  return (
    <th
      className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] cursor-pointer select-none hover:text-[hsl(var(--text-2))] whitespace-nowrap"
      style={width ? { width } : {}}
      onClick={() => _onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={_sortCol} sortDir={_sortDir} />
    </th>
  );
}

// ── MetaBar ───────────────────────────────────────────────────────────────────
// Accepts either a `record` object (old API) or an `items` array of {label, value} pairs

export function MetaBar({ record, items }: { record?: any; items?: { label: string; value: any }[] }) {
  // If items array provided, use that
  if (items) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))] text-xs mb-4">
        {items.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[hsl(var(--text-4))] uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-[hsl(var(--text-2))] font-mono">{value ?? "—"}</p>
          </div>
        ))}
      </div>
    );
  }
  // Fallback: record object (old API)
  if (!record) return null;
  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))] text-xs mb-4">
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
// Accepts both:
//   items={[{ date, actor, action }]}  — new API
//   events={[{ date, label, user }]}   — legacy API used by 7 V1 modules

type TimelineEntry = { date?: string; actor?: string; action?: string; label?: string; user?: string };

export function ActivityTimeline({
  items,
  events,
}: {
  items?: TimelineEntry[];
  events?: TimelineEntry[];
}) {
  const entries = items ?? events ?? [];
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-3">Audit Trail</p>
      <div className="space-y-3">
        {entries.filter(e => e.date).map((entry, i) => {
          const who = entry.actor ?? entry.user ?? "";
          const what = entry.action ?? entry.label ?? "";
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))] mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-[hsl(var(--text-2))]">
                  {who && <span className="font-medium">{who} — </span>}
                  {what}
                </p>
                <p className="text-xs text-[hsl(var(--text-4))]">{entry.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── useSortAndPage ──────────────────────────────────────────────────────────
// Returns `page` as the ARRAY of paged items (what the 7 V1 pages expect)
// Also returns `currentPage` as the number, `paged` as alias for `page`

export function useSortAndPage<T>(items: T[], defaultSortCol: keyof T) {
  const [sortCol, setSortCol] = useState<keyof T>(defaultSortCol);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col as keyof T); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const sorted = [...items].sort((a, b) => {
    const aVal = String(a[sortCol] ?? "");
    const bVal = String(b[sortCol] ?? "");
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  // `page` = the current page's items array (what the V1 pages use via sp.page)
  const page = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === page.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(page.map((i: any) => i.id)));
  };

  const clearSelected = () => setSelectedIds(new Set());
  const setPage = (p: number) => setCurrentPage(p);

  return {
    sortCol: sortCol as string,
    sortDir,
    handleSort,
    currentPage,
    page,          // <— array of items for current page (V1 pages use sp.page)
    paged: page,   // alias
    perPage,
    setPage,
    setCurrentPage,
    setPerPage,
    sorted,
    total: items.length,
    selectedIds,
    toggleSelect,
    toggleAll,
    clearSelected,
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
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── CrudSlideOver ─────────────────────────────────────────────────────────────
// Right-side slide-over panel for row-click detail views.
// Drop-in replacement for the "view" CrudModal in the 7 V1 module pages.

export function CrudSlideOver({
  open, onClose, title, subtitle, children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[540px] sm:max-w-[540px] overflow-y-auto p-0 flex flex-col"
        style={{ borderRadius: 0, borderLeft: "1px solid hsl(var(--border))" }}
      >
        <SheetHeader className="px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <SheetTitle className="text-base font-semibold text-[hsl(var(--text-1))]">{title}</SheetTitle>
          {subtitle && <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{subtitle}</p>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

// ── FormFooter ────────────────────────────────────────────────────────────────
// Accepts both old API (onCancel, onSaveDraft, onSubmit, loading, submitLabel)
// and V1 pages API (saving, onDraft, onSubmit, onCancel, submitLabel)

export function FormFooter({
  onCancel,
  onSaveDraft,
  onDraft,       // alias for onSaveDraft used by V1 pages
  onSubmit,
  loading,
  saving,        // alias for loading used by V1 pages
  submitLabel = "Save & Submit",
}: {
  onCancel: () => void;
  onSaveDraft?: () => void;
  onDraft?: () => void;
  onSubmit: () => void;
  loading?: boolean;
  saving?: boolean;
  submitLabel?: string;
}) {
  const _loading = loading || saving || false;
  const _onDraft = onSaveDraft || onDraft;

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[hsl(var(--border))] flex-shrink-0 bg-[hsl(var(--card))]">
      <button onClick={onCancel} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
        Cancel
      </button>
      <div className="flex items-center gap-2">
        {_onDraft && (
          <button onClick={_onDraft} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            Save as Draft
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={_loading}
          className="px-5 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {_loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
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
