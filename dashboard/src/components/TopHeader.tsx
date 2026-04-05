import { useLocation } from "react-router-dom"
import { MagnifyingGlass, Bell, ArrowsClockwise, Sun, Moon } from "@phosphor-icons/react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useTheme } from "../providers/theme"

export default function TopHeader() {
  const location = useLocation()
  const { resolved, setTheme } = useTheme()
  const segments = location.pathname.split("/").filter(Boolean)

  // Build breadcrumb from path segments
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    isLast: i === segments.length - 1,
  }))

  return (
    <header className="flex items-center gap-4 px-6 h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] flex-shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className={bc.isLast ? "font-medium text-[hsl(var(--text-1))] truncate" : "text-[hsl(var(--text-4))]"}>
              {bc.label}{!bc.isLast && <span className="ml-1.5 text-[hsl(var(--text-4))]">/</span>}
            </span>
          ))}
          {breadcrumbs.length === 0 && <span className="font-medium text-[hsl(var(--text-1))]">Dashboard</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]"/>
          <Input placeholder="Quick search… (/)"
            className="w-48 h-8 pl-8 text-xs border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))]"/>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {resolved === 'dark' ? <Sun size={16} className="text-[hsl(var(--text-3))]"/> : <Moon size={16} className="text-[hsl(var(--text-3))]"/>}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ArrowsClockwise size={16} className="text-[hsl(var(--text-3))]"/>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell size={16} className="text-[hsl(var(--text-3))]"/>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[hsl(var(--brand))] rounded-full"></span>
        </Button>
      </div>
    </header>
  )
}
