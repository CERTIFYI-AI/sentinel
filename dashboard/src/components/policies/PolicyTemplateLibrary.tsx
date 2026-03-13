import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PolicyTemplate, Framework } from '@/lib/types/policy';
import { FRAMEWORKS } from '@/lib/types/policy';

interface Props {
  templates: PolicyTemplate[];
  onInstantiate?: (template: PolicyTemplate) => void;
  loading?: boolean;
}

export function PolicyTemplateLibrary({ templates, onInstantiate, loading }: Props) {
  const [search, setSearch] = useState('');
  const [framework, setFramework] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return Array.from(cats).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      const matchFw = framework === 'all' || t.framework === framework;
      const matchCat = category === 'all' || t.category === category;
      return matchSearch && matchFw && matchCat;
    });
  }, [templates, search, framework, category]);

  const fwCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach(t => { counts[t.framework] = (counts[t.framework] || 0) + 1; });
    return counts;
  }, [templates]);

  if (loading) return <div className='flex justify-center p-8'><div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full' /></div>;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Policy Template Library</h2>
          <p className='text-gray-500'>{templates.length} templates across {Object.keys(fwCounts).length} frameworks</p>
        </div>
      </div>

      <div className='flex gap-4 flex-wrap'>
        <div className='relative flex-1 min-w-[200px]'>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500">🔍</span>
          <Input placeholder='Search templates...' value={search} onChange={e => setSearch(e.target.value)} className='pl-10' />
        </div>
        <Select value={framework} onValueChange={setFramework}>
          <SelectTrigger className='w-[180px]'><span className="h-4 w-4 mr-2">☰</span><SelectValue placeholder='Framework' /></SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Frameworks</SelectItem>
            {FRAMEWORKS.map(fw => <SelectItem key={fw} value={fw}>{fw} ({fwCounts[fw] || 0})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className='w-[180px]'><SelectValue placeholder='Category' /></SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Categories</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className='text-sm text-gray-500'>{filtered.length} templates found</div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filtered.map(template => (
          <Card key={template.id} className='hover:shadow-md transition-shadow'>
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-2'>
                  <span className="h-5 w-5 text-[#1A6B5A]">📄</span>
                  <CardTitle className='text-sm font-medium'>{template.name}</CardTitle>
                </div>
                {template.is_mandatory && <Badge variant='destructive' className='text-xs'>Required</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-xs text-gray-500 mb-3'>{template.description}</p>
              <div className='flex flex-wrap gap-1 mb-3'>
                <Badge variant='outline' className='text-xs'><span className="h-3 w-3 mr-1">🛡</span>{template.framework}</Badge>
                <Badge variant='secondary' className='text-xs'>{template.category}</Badge>
                <Badge variant={template.risk_level === 'high' ? 'destructive' : 'outline'} className='text-xs'>{template.risk_level}</Badge>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>v{template.version}</span>
                <Button size='sm' variant='outline' onClick={() => onInstantiate?.(template)}>Use Template</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
