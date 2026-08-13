// @ts-nocheck
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlass, Bell, ArrowsClockwise, Sun, Moon, Monitor, User, Gear, SignOut, PaintBrush, Question } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { CommandPalette } from './ui/CommandPalette'
import { NotificationDrawer } from './ui/NotificationDrawer'
import { useTheme } from '../providers/theme'
import { getStoredAccent, setAccent, type Accent } from '../store/accentStore'
import { useAuthStore } from '../store/authStore'
import { OrgSwitcher } from './tenancy/OrgSwitcher'

const UNREAD_COUNT = 5

const ACCENT_SWATCHES: { key: Accent; label: string; color: string; darkColor: string }[] = [
  { key: 'emerald', label: 'Emerald',  color: 'hsl(142 47% 38%)', darkColor: 'hsl(142 47% 50%)' },
  { key: 'blue',    label: 'Blue',     color: 'hsl(217 91% 50%)', darkColor: 'hsl(217 91% 62%)' },
  { key: 'purple',  label: 'Purple',   color: 'hsl(263 70% 50%)', darkColor: 'hsl(263 70% 65%)' },
  { key: 'teal',    label: 'Teal',     color: 'hsl(174 72% 36%)', darkColor: 'hsl(174 72% 48%)' },
  { key: 'orange',  label: 'Orange',   color: 'hsl(25 95% 45%)',  darkColor: 'hsl(25 95% 58%)' },
  { key: 'rose',    label: 'Rose',     color: 'hsl(346 77% 45%)', darkColor: 'hsl(346 77% 58%)' },
]


export default function TopHeader() {
  const navigate = useNavigate()
  const { theme, resolved, setTheme } = useTheme()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AI'

  const [avatarOpen, setAvatarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [accent, setAccentState] = useState<Accent>(getStoredAccent)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)

  const closeDropdown = useCallback(() => setAvatarOpen(false), [])
  const closeColor = useCallback(() => setColorOpen(false), [])
  const closeTheme = useCallback(() => setThemeOpen(false), [])

  const handleAccentChange = (a: Accent) => {
    setAccent(a)
    setAccentState(a)
    setColorOpen(false)
  }

  const handleThemeChange = (t: 'light' | 'dark' | 'system') => {
    setTheme(t)
    setThemeOpen(false)
  }

  const handleSignOut = () => {
    closeDropdown()
    logout()
    navigate('/login', { replace: true })
  }

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    if (!avatarOpen && !colorOpen && !themeOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) closeDropdown()
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) closeColor()
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) closeTheme()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeDropdown(); closeColor(); closeTheme() }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [avatarOpen, colorOpen, themeOpen, closeDropdown, closeColor, closeTheme])

  // Open search on "/" key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !searchOpen && !notifOpen) {
        const tag = (e.target as HTMLElement).tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [searchOpen, notifOpen])

  const currentSwatch = ACCENT_SWATCHES.find(s => s.key === accent) ?? ACCENT_SWATCHES[0]
  const swatchColor = resolved === 'dark' ? currentSwatch.darkColor : currentSwatch.color

  return (
    <>
      <header className='flex items-center gap-4 px-6 h-14 border-b border-[hsl(var(--border))] bg-surface flex-shrink-0'>
        {/* Left spacer — breadcrumbs live once, in the page header below. */}
        <div className='flex-1 min-w-0' />

        {/* Right side controls */}
        <div className='flex items-center gap-1'>

          {/* Org switcher — active tenant context */}
          <div className='mr-1'>
            <OrgSwitcher />
          </div>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className='flex items-center gap-2 h-8 px-3 border border-[hsl(var(--border))] bg-raised hover:bg-surface hover:border-[hsl(var(--brand))] transition-colors text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] text-xs w-48'
            aria-label='Open search (press /)'
          >
            <MagnifyingGlass size={13} className='flex-shrink-0' />
            <span className='flex-1 text-left text-xs'>Quick search…</span>
            <kbd className='hidden sm:inline text-[9px] px-1 py-0.5 border border-[hsl(var(--border))] leading-none opacity-70'>/</kbd>
          </button>

          {/* Accent Color Picker */}
          <div className='relative' ref={colorRef}>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 relative'
              onClick={() => setColorOpen(v => !v)}
              title='Change accent color'
              aria-label='Change accent color'
              aria-expanded={colorOpen}
            >
              <PaintBrush size={16} className='text-[hsl(var(--text-3))]' />
              <span
                className='absolute bottom-1.5 right-1.5 w-2 h-2 border border-[hsl(var(--bg-surface))]'
                style={{ background: swatchColor }}
              />
            </Button>

            {colorOpen && (
              <div
                role='menu'
                className='absolute right-0 top-full mt-2 w-52 bg-surface border border-[hsl(var(--border))] shadow-[var(--shadow-md)] z-50 p-3'
              >
                <p className='text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider mb-2.5'>
                  Accent Color
                </p>
                <div className='grid grid-cols-3 gap-2'>
                  {ACCENT_SWATCHES.map(s => {
                    const color = resolved === 'dark' ? s.darkColor : s.color
                    const isActive = accent === s.key
                    return (
                      <button
                        key={s.key}
                        role='menuitem'
                        onClick={() => handleAccentChange(s.key)}
                        title={s.label}
                        className='flex flex-col items-center gap-1.5 p-2 hover:bg-raised transition-colors group'
                        style={{ outline: isActive ? `2px solid ${color}` : 'none', outlineOffset: 2 }}
                      >
                        <span
                          className='w-6 h-6 flex-shrink-0'
                          style={{ background: color }}
                        />
                        <span className='text-[10px] text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]'>
                          {s.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme picker — Light / Dark / System */}
          <div className='relative' ref={themeRef}>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => setThemeOpen(v => !v)}
              title='Switch theme'
              aria-label='Switch theme'
              aria-expanded={themeOpen}
            >
              {theme === 'dark'
                ? <Moon size={16} className='text-[hsl(var(--text-3))]' />
                : theme === 'light'
                ? <Sun size={16} className='text-[hsl(var(--text-3))]' />
                : <Monitor size={16} className='text-[hsl(var(--text-3))]' />
              }
            </Button>

            {themeOpen && (
              <div
                role='menu'
                className='absolute right-0 top-full mt-2 w-44 bg-surface border border-[hsl(var(--border))] shadow-[var(--shadow-md)] z-50 p-1.5'
              >
                <p className='text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider px-2 py-1.5'>
                  Appearance
                </p>
                {([
                  { key: 'light' as const, label: 'Light', icon: <Sun size={14} /> },
                  { key: 'dark'  as const, label: 'Dark',  icon: <Moon size={14} /> },
                  { key: 'system' as const, label: 'System', icon: <Monitor size={14} /> },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    role='menuitem'
                    onClick={() => handleThemeChange(opt.key)}
                    className='w-full flex items-center gap-2.5 px-2 py-1.5 text-sm hover:bg-raised transition-colors'
                    style={{
                      color: theme === opt.key ? 'hsl(var(--brand))' : 'hsl(var(--text-2))',
                      fontWeight: theme === opt.key ? 600 : 400,
                    }}
                  >
                    <span style={{ color: theme === opt.key ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {opt.icon}
                    </span>
                    {opt.label}
                    {theme === opt.key && (
                      <span className='ml-auto w-1.5 h-1.5 bg-[hsl(var(--brand))] flex-shrink-0' />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => window.location.reload()}
            title='Refresh data'
            aria-label='Refresh data'
          >
            <ArrowsClockwise size={16} className='text-[hsl(var(--text-3))]' />
          </Button>

          {/* Notification bell */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 relative'
            onClick={() => setNotifOpen(v => !v)}
            title='Notifications'
            aria-label={`Notifications — ${UNREAD_COUNT} unread`}
          >
            <Bell size={16} className='text-[hsl(var(--text-3))]' />
            {UNREAD_COUNT > 0 && (
              <span
                className='absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-[hsl(var(--brand))] text-white text-[9px] font-bold leading-none'
                aria-hidden='true'
              >
                {UNREAD_COUNT > 9 ? '9+' : UNREAD_COUNT}
              </span>
            )}
          </Button>

          {/* Avatar + dropdown */}
          <div className='relative' ref={dropdownRef}>
            <button
              onClick={() => setAvatarOpen(v => !v)}
              aria-expanded={avatarOpen}
              aria-haspopup='menu'
              aria-label='User menu'
              className='ml-1 flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]'
            >
              <div
                data-avatar='true'
                className='h-8 w-8 bg-[hsl(var(--brand))] flex items-center justify-center text-white text-xs font-bold'
              >
                {initials}
              </div>
            </button>

            {avatarOpen && (
              <div
                role='menu'
                className='absolute right-0 top-full mt-2 w-56 bg-surface border border-[hsl(var(--border))] shadow-[var(--shadow-md)] z-50'
              >
                <div className='px-3 py-3 border-b border-[hsl(var(--border))]'>
                  <div className='flex items-center gap-2.5 mb-2'>
                    <div className='w-8 h-8 bg-[hsl(var(--brand))] flex items-center justify-center text-white text-xs font-bold flex-shrink-0'>
                      {initials}
                    </div>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate'>{user?.name ?? 'User'}</p>
                      <p className='text-xs text-[hsl(var(--text-4))] truncate'>{user?.email ?? ''}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[10px] font-medium px-1.5 py-0.5 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]'>
                      {user?.jobTitle ?? user?.role?.toUpperCase() ?? 'ADMIN'}
                    </span>
                    <span className='text-[10px] text-[hsl(var(--text-4))]'>{user?.organization}</span>
                  </div>
                </div>
                <div className='py-1'>
                  <button
                    role='menuitem'
                    onClick={() => { closeDropdown(); navigate('/settings'); }}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-raised hover:text-[hsl(var(--text-1))] transition-colors'
                  >
                    <User size={14} className='flex-shrink-0' /> My Profile
                  </button>
                  <button
                    role='menuitem'
                    onClick={() => { closeDropdown(); navigate('/settings'); }}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-raised hover:text-[hsl(var(--text-1))] transition-colors'
                  >
                    <Gear size={14} className='flex-shrink-0' /> Settings
                  </button>
                  <div className='border-t border-[hsl(var(--border))] my-1' />
                  <button
                    role='menuitem'
                    onClick={handleSignOut}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(var(--s-er-tx))] hover:bg-[hsl(var(--s-er-bg))] transition-colors'
                  >
                    <SignOut size={14} className='flex-shrink-0' /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global overlays */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  )
}
