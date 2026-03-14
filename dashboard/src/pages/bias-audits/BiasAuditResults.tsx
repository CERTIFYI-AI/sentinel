import { Scales, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';

export default function BiasAuditResults() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    fetch('/api/bias-audits', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setData(Array.isArray(d) ? d : d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Bias Audit Results</h1>
          <p className="text-sm text-muted-foreground mt-1">Audit results with demographic breakdown, scores, and remediation</p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 text-foreground rounded-none hover:bg-emerald-700 text-sm">
          + Add New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-card rounded-none border border-border dark:border-border">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-foreground dark:text-gray-300">No items yet</h3>
          <p className="text-sm text-muted-foreground mt-2">Create your first bias audit results to get started</p>
        </div>
      ) : (
        <div className="bg-card dark:bg-card rounded-none border border-border dark:border-border overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-muted dark:bg-background">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Score</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Updated</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border dark:divide-border">
              {data.map((item: any, i: number) => (
                <TableRow key={item.id || i} className="hover:bg-muted dark:hover:bg-muted/50">
                  <TableCell className="px-4 py-3 text-sm font-medium text-foreground dark:text-foreground">{item.name || item.title || `Item ${i+1}`}</TableCell>
                  <TableCell className="px-4 py-3"><span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">{item.status || 'Active'}</span></TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground dark:text-muted-foreground">{item.score || item.compliance_score || '--'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '--'}</TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <button className="text-sm text-emerald-600 hover:text-emerald-800">View</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
