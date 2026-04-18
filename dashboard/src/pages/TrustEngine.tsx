// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export default function TrustEngine() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('trust_scores').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trust Engine</h1>
        <Button onClick={fetchItems}>Refresh</Button>
      </div>
      <p className="text-muted-foreground">AI Trust and Safety scoring engine for model evaluation.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Total</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Active</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold text-emerald-500">{items.filter((i: any) => i.status === 'active' || !i.status).length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Pending</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold text-yellow-500">{items.filter((i: any) => i.status === 'pending').length}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Trust Engine Records</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : items.length === 0 ? (
            <p className="text-muted-foreground">No records found. Create your first entry to get started.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <span>{item.name || item.title || item.id}</span>
                  <Badge>{item.status || 'Active'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
