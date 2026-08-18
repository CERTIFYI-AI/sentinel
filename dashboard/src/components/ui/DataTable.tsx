import React, { useState, useMemo } from "react"
import { Eye, PencilSimple, Trash, MagnifyingGlass, CaretUp, CaretDown, CaretLeft, CaretRight, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  onView?: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onRowClick?: (row: T) => void
  searchPlaceholder?: string
  searchKey?: string
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  getRowClassName?: (row: T) => string
  defaultPageSize?: number
  showPagination?: boolean
  /**
   * Opt-in row selection. Off unless `selectable` is set, so the 36 existing
   * DataTables are untouched. Selection is keyed by `getRowId` — required when
   * selectable, because row index is not a stable identity across sort/filter,
   * and selecting "row 3" then re-sorting would silently move the selection.
   */
  selectable?: boolean
  getRowId?: (row: T) => string
  /**
   * Floating action bar contents, rendered only while ≥1 row is selected.
   * Receives the selected rows and a `clear` to dismiss the selection after a
   * bulk action resolves. The page owns the actions, so a mutating one is its
   * own real, throwing service call — this component never fakes success.
   */
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// An accessible tri-state checkbox. Native <input> so keyboard, focus ring and
// form semantics come for free; the indeterminate state (page partially
// selected) is a DOM property, not an attribute, so it is set via ref.
function CheckboxCell({
  checked, indeterminate = false, onChange, ariaLabel,
}: { checked: boolean; indeterminate?: boolean; onChange: () => void; ariaLabel: string }) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-3.5 w-3.5 cursor-pointer accent-[hsl(var(--brand))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[hsl(var(--brand))]"
    />
  )
}

// The floating bar. Fixed to the bottom of the viewport so it stays reachable
// however far the operator has scrolled a long table. Announced politely so a
// screen-reader hears the count change without stealing focus.
function BulkActionBar({
  count, onClear, children,
}: { count: number; onClear: () => void; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 border border-[hsl(var(--border))] bg-surface px-3 py-2 shadow-[var(--shadow-lg)] animate-in-up"
    >
      <span className="text-xs font-medium text-[hsl(var(--text-2))] tabular-nums" aria-live="polite">
        {count} selected
      </span>
      <div className="h-4 w-px bg-[hsl(var(--border))]" />
      <div className="flex items-center gap-1.5">{children}</div>
      <button
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-1 p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function DataTable<T extends Record<string, any>>({
  data, columns, onView, onEdit, onDelete, onRowClick,
  searchPlaceholder = "Search...", searchKey = "name",
  actions, emptyMessage = "No records found.", getRowClassName,
  defaultPageSize = 25, showPagination = true,
  selectable = false, getRowId, bulkActions,
}: Props<T>) {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const filtered = useMemo(() => {
    let d = data
    if (search) d = d.filter(r => String(r[searchKey] ?? "").toLowerCase().includes(search.toLowerCase()))
    if (sortKey) d = [...d].sort((a, b) => {
      const cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
    return d
  }, [data, search, sortKey, sortDir, searchKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, filtered.length)
  const paginated = filtered.slice(pageStart, pageEnd)

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  const hasActions = onView || onEdit || onDelete || actions

  // Selection is a no-op without a stable id — refuse silently rather than
  // keying on row index, which reshuffles under sort/filter.
  const canSelect = selectable && typeof getRowId === 'function'
  const rowId = (row: T): string => (getRowId as (r: T) => string)(row)

  const pageIds = canSelect ? paginated.map(rowId) : []
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const somePageSelected = pageIds.some(id => selectedIds.has(id))

  const toggleRow = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  // Header checkbox acts on the CURRENT PAGE only — selecting across pages the
  // operator cannot see is a footgun (a bulk delete of rows off-screen).
  const togglePage = () => setSelectedIds(prev => {
    const next = new Set(prev)
    if (allPageSelected) pageIds.forEach(id => next.delete(id))
    else pageIds.forEach(id => next.add(id))
    return next
  })
  const clearSelection = () => setSelectedIds(new Set())

  // The selected ROWS, resolved from the full data set so a selection survives
  // paging away from the row and back.
  const selectedRows = canSelect
    ? data.filter(r => selectedIds.has(rowId(r)))
    : []

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder={searchPlaceholder}
            className="w-full h-8 pl-8 pr-3 text-xs bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))]" />
        </div>
        {showPagination && (
          <div className="flex items-center gap-1 ml-auto text-xs text-[hsl(var(--text-4))]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="h-8 px-2 text-xs bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-2))] focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="border border-[hsl(var(--border))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-raised border-b border-[hsl(var(--border))]">
              {canSelect && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <CheckboxCell
                    checked={allPageSelected}
                    indeterminate={!allPageSelected && somePageSelected}
                    onChange={togglePage}
                    ariaLabel={allPageSelected ? 'Deselect all rows on this page' : 'Select all rows on this page'}
                  />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key}
                  aria-sort={col.sortable ? (sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none") : undefined}
                  className={cn("px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider", col.className)}>
                  {col.sortable ? (
                    <button type="button" onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 uppercase tracking-wider select-none hover:text-[hsl(var(--text-2))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--brand))]">
                      {col.header}
                      {sortKey === col.key && (sortDir === "asc" ? <CaretUp size={12}/> : <CaretDown size={12}/>)}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1">{col.header}</span>
                  )}
                </th>
              ))}
              {hasActions && <th className="px-4 py-2.5 text-right text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length + (hasActions ? 1 : 0) + (canSelect ? 1 : 0)} className="px-4 py-8 text-center text-sm text-[hsl(var(--text-4))]">{emptyMessage}</td></tr>
            ) : paginated.map((row, i) => {
              const id = canSelect ? rowId(row) : String(i)
              const isSelected = canSelect && selectedIds.has(id)
              return (
              <tr key={id} onClick={() => onRowClick?.(row)}
                data-selected={isSelected || undefined}
                className={cn("group border-b border-[hsl(var(--border))] hover:bg-raised transition-colors", onRowClick && "cursor-pointer", isSelected && "bg-[hsl(var(--brand-subtle))]", getRowClassName?.(row))}>
                {canSelect && (
                  <td className="w-10 px-3 py-2" onClick={e => e.stopPropagation()}>
                    <CheckboxCell
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      ariaLabel={isSelected ? 'Deselect row' : 'Select row'}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className={cn("px-3 py-2 text-[hsl(var(--text-2))]", col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                      {actions ? actions(row) : (<>
                        {onView && <button onClick={e => { e.stopPropagation(); onView(row) }} className="p-1.5 hover:bg-surface text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] transition-colors" title="View"><Eye size={16} weight="duotone"/></button>}
                        {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(row) }} className="p-1.5 hover:bg-surface text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors" title="Edit"><PencilSimple size={16} weight="duotone"/></button>}
                        {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(row) }} className="p-1.5 hover:bg-[hsl(var(--s-er-bg))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-text))] transition-colors" title="Delete"><Trash size={16} weight="duotone"/></button>}
                      </>)}
                    </div>
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {canSelect && bulkActions && selectedRows.length > 0 && (
        <BulkActionBar count={selectedRows.length} onClear={clearSelection}>
          {bulkActions(selectedRows, clearSelection)}
        </BulkActionBar>
      )}

      {showPagination ? (
        <div className="flex items-center justify-between text-xs text-[hsl(var(--text-4))]">
          <span>
            Showing {filtered.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {filtered.length} records
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-7 px-2 border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-raised flex items-center gap-1 disabled:cursor-not-allowed"
            >
              <CaretLeft size={12} /> Prev
            </button>
            <span className="px-3 py-1 border border-[hsl(var(--brand))] text-[hsl(var(--brand))]">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-7 px-2 border border-[hsl(var(--border))] disabled:opacity-40 hover:bg-raised flex items-center gap-1 disabled:cursor-not-allowed"
            >
              Next <CaretRight size={12} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[hsl(var(--text-4))]">{filtered.length} of {data.length} records</p>
      )}
    </div>
  )
}
export default DataTable
