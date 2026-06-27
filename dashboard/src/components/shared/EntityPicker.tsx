import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check, Search } from 'lucide-react';

interface Props {
  table: string;
  labelColumn?: string;
  valueColumn?: string;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  filter?: Record<string, any>;
}

export function EntityPicker({
  table,
  labelColumn = 'name',
  valueColumn = 'id',
  value,
  onChange,
  placeholder = 'Select...',
  className,
  filter,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      let q = supabase.from(table).select(`${valueColumn},${labelColumn}`).order(labelColumn).limit(200);
      if (filter) { Object.entries(filter).forEach(([k,v]) => { q = q.eq(k,v); }); }
      const { data } = await q;
      setItems(data || []);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, labelColumn, valueColumn, JSON.stringify(filter)]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i => String(i[labelColumn]).toLowerCase().includes(s));
  }, [items, search, labelColumn]);

  const selected = items.find(i => i[valueColumn] === value);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        onClick={() => setOpen(!open)}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? selected[labelColumn] : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
            <input
              className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder={`Search ${table}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results.</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item[valueColumn]}
                  type="button"
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === item[valueColumn] && 'bg-accent'
                  )}
                  onClick={() => { onChange(item[valueColumn]); setOpen(false); setSearch(''); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === item[valueColumn] ? 'opacity-100' : 'opacity-0')} />
                  {item[labelColumn]}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EntityPicker;
