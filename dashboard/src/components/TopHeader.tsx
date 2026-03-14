import { useLocation } from "react-router-dom"
import { MagnifyingGlass, Bell, ArrowsClockwise } from "@phosphor-icons/react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export default function TopHeader() {
  const location = useLocation()
  const segments = location.pathname.split("/").filter(Boolean)
  const pageTitle = segments.length > 0
    ? segments[segments.length - 1].replace(/-/g, " ").replace(/\w/g, l => l.toUpperCase())
    : "Dashboard"

  return (
    <header className="flex items-center gap-4 px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-background flex-shrink-0">
      <div className="flex-1">
        <h2 className="text-sm font-medium text-muted-foreground">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <Input placeholder="Quick search..."
            className="w-48 h-8 pl-8 text-xs rounded-none border-zinc-200 dark:border-zinc-700"/>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ArrowsClockwise size={16} className="text-muted-foreground"/>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell size={16} className="text-muted-foreground"/>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
        </Button>
      </div>
    </header>
  )
}
