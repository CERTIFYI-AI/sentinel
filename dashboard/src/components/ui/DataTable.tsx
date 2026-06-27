import React, { useState, useMemo } from "react"
import { Eye, PencilSimple, Trash, MagnifyingGlass, CaretUp, CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react"
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
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function DataTable<T extends Record<string, any>>({
  data, columns, onView, onEdit, onDelete, onRowClick,
  searchPlaceholder = "Search...", searchKey = "name",
  actions, emptyMessage = "No records found.", getRowClassName,
  defaultPageSize = 25, showPagination = true,
}: Props<T>) {
  const [search, setSearch] = useState("")
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
              {columns.map(col => (
                <th key={col.key} className={cn("px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider", col.sortable && "cursor-pointer select-none hover:text-[hsl(var(--text-2))]", col.className)}
                  onClick={() => col.sortable && toggleSort(col.key)}>
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === "asc" ? <CaretUp size={12}/> : <CaretDown size={12}/>)}
                  </span>
                </th>
              ))}
              {hasActions && <th className="px-4 py-2.5 text-right text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-8 text-center text-sm text-[hsl(var(--text-4))]">{emptyMessage}</td></tr>
            ) : paginated.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)}
                className={cn("group border-b border-[hsl(var(--border))] hover:bg-raised transition-colors", onRowClick && "cursor-pointer", getRowClassName?.(row))}>
                {columns.map(col => (
                  <td key={col.key} className={cn("px-4 py-3 text-[hsl(var(--text-2))]", col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {actions ? actions(row) : (<>
                        {onView && <button onClick={e => { e.stopPropagation(); onView(row) }} className="p-1.5 hover:bg-surface text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] transition-colors" title="View"><Eye size={16} weight="duotone"/></button>}
                        {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(row) }} className="p-1.5 hover:bg-surface text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors" title="Edit"><PencilSimple size={16} weight="duotone"/></button>}
                        {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(row) }} className="p-1.5 hover:bg-[hsl(var(--s-er-bg))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-text))] transition-colors" title="Delete"><Trash size={16} weight="duotone"/></button>}
                      </>)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
